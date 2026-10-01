import { createHash } from "node:crypto";

import { z } from "zod";

import { investigationIdSchema } from "@/contracts/investigations/get-investigation";
import type { EvidenceItem } from "@/domain/evidence/evidence";
import type { EvidenceAssetStore } from "@/domain/evidence/evidence-asset-store";
import type { VisionAnalyzer } from "@/domain/construction-change/vision-analyzer";
import { validateVisualInterpretation } from "@/domain/construction-change/vision-analysis";
import type { VisionAnalysisStore } from "@/domain/construction-change/vision-analysis-store";

const metadataSchema = z.object({
  imagery: z.object({
    collectionId: z.string(),
    groundSampleDistanceMeters: z.number().positive().optional(),
    crs: z.string().optional(),
    usability: z.enum(["USABLE", "LIMITED", "UNSUITABLE", "UNASSESSED"]),
    qualityFlags: z.array(
      z.enum([
        "CLOUD_AFFECTED",
        "SHADOW_AFFECTED",
        "HAZE_AFFECTED",
        "LOW_RESOLUTION",
        "PARTIAL_COVERAGE",
        "VIEW_GEOMETRY_DIFFERENCE",
        "SEASONAL_VARIATION_RISK",
        "VEGETATION_OBSCURATION_RISK",
      ]),
    ),
  }),
});

function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value !== null && typeof value === "object")
    return `{${Object.entries(value as Record<string, unknown>)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, entry]) => `${JSON.stringify(key)}:${canonical(entry)}`)
      .join(",")}}`;
  return JSON.stringify(value);
}

function mergeLimitations(
  deterministic: readonly string[],
  visual: readonly string[],
): readonly string[] {
  const seen = new Set<string>();
  return [...deterministic, ...visual].filter((limitation) => {
    if (seen.has(limitation)) return false;
    seen.add(limitation);
    return true;
  });
}

async function image(item: EvidenceItem, assetStore: EvidenceAssetStore) {
  if (
    item.asset === undefined ||
    item.asset.contentType !== "image/png" ||
    item.observedAt === undefined
  )
    return undefined;
  const metadata = metadataSchema.safeParse(item.metadata);
  if (!metadata.success) return undefined;
  let loaded;
  try {
    loaded = await assetStore.read(item.asset.storageKey);
  } catch {
    throw new Error("asset-unavailable");
  }
  if (loaded === undefined) return undefined;
  const hash = createHash("sha256").update(loaded.bytes).digest("hex");
  if (
    hash !== item.asset.sha256 ||
    loaded.sha256 !== item.asset.sha256 ||
    loaded.contentType !== "image/png"
  )
    return undefined;
  return {
    evidenceItemId: item.id,
    observedAt: item.observedAt.value.toISOString(),
    bytes: loaded.bytes,
    contentType: "image/png" as const,
    sha256: item.asset.sha256,
    source: {
      providerId: item.provenance.providerId,
      collectionId: metadata.data.imagery.collectionId,
      ...(metadata.data.imagery.groundSampleDistanceMeters === undefined
        ? {}
        : {
            nativeGsdMeters: metadata.data.imagery.groundSampleDistanceMeters,
          }),
      ...(metadata.data.imagery.crs === undefined
        ? {}
        : { crs: metadata.data.imagery.crs }),
      usability: metadata.data.imagery.usability,
      qualityFlags: metadata.data.imagery.qualityFlags,
    },
  };
}

export class RunVisionAnalysisForConstructionChange {
  constructor(
    private readonly store: VisionAnalysisStore,
    private readonly assetStore: EvidenceAssetStore,
    private readonly analyzer: VisionAnalyzer,
  ) {}

  async execute(investigationId: string, analysisId: string) {
    const investigation = investigationIdSchema.safeParse(investigationId);
    const analysis = investigationIdSchema.safeParse(analysisId);
    if (!investigation.success || !analysis.success)
      return {
        kind: "invalid" as const,
        message: "Invalid Investigation or construction-change analysis ID.",
      };
    const input = await this.store.getInput(investigation.data, analysis.data);
    if (input.kind !== "found") return input;
    if (
      input.analysis.comparability === "NOT_COMPARABLE" ||
      input.analysis.evidenceSufficiency === "INSUFFICIENT"
    )
      return {
        kind: "unprocessable" as const,
        message:
          "The deterministic imagery comparison is not sufficient for visual interpretation.",
      };
    let before;
    let after;
    try {
      [before, after] = await Promise.all([
        image(input.before, this.assetStore),
        image(input.after, this.assetStore),
      ]);
    } catch {
      return {
        kind: "unavailable" as const,
        reason:
          "Imagery assets are currently unavailable for visual interpretation.",
      };
    }
    if (before === undefined || after === undefined)
      return {
        kind: "unprocessable" as const,
        message:
          "The deterministic comparison imagery assets are missing or failed integrity verification.",
      };
    const visionInput = {
      comparisonAnalysisId: input.analysis.id,
      comparisonPolicyId: input.analysis.comparisonPolicyId,
      before,
      after,
      deterministicContext: {
        comparability: input.analysis.comparability,
        evidenceSufficiency: input.analysis.evidenceSufficiency,
        temporalGapDays: input.analysis.deterministicFacts.temporalGapDays,
        seasonalDifferenceDays:
          input.analysis.deterministicFacts.seasonalDifferenceDays,
        aoiIdentity: input.analysis.aoiIdentity,
        limitations: input.analysis.limitations,
      },
    };
    let result;
    try {
      result = await this.analyzer.analyze(visionInput);
    } catch {
      return {
        kind: "failed" as const,
        reason: "Unable to obtain a visual interpretation.",
      };
    }
    if (result.kind !== "completed") return result;
    const interpretation = validateVisualInterpretation(result.value);
    if (interpretation === undefined)
      return {
        kind: "invalid_output" as const,
        reason:
          "The vision provider returned an unsafe or invalid visual interpretation.",
      };
    const finalInterpretation = {
      ...interpretation,
      limitations: mergeLimitations(
        input.analysis.limitations,
        interpretation.limitations,
      ),
    };
    const expected = [before.evidenceItemId, after.evidenceItemId];
    if (
      finalInterpretation.supportingEvidenceItemIds[0] !== expected[0] ||
      finalInterpretation.supportingEvidenceItemIds[1] !== expected[1]
    )
      return {
        kind: "invalid_output" as const,
        reason:
          "The vision provider returned unsupported imagery evidence references.",
      };
    const fingerprint = createHash("sha256")
      .update(
        canonical({
          analysisId: input.analysis.id,
          before: {
            id: before.evidenceItemId,
            sha256: before.sha256,
            observedAt: before.observedAt,
            source: before.source,
          },
          after: {
            id: after.evidenceItemId,
            sha256: after.sha256,
            observedAt: after.observedAt,
            source: after.source,
          },
          policy: input.analysis.comparisonPolicyId,
          aoi: input.analysis.aoiIdentity,
          facts: input.analysis.deterministicFacts,
          limitations: input.analysis.limitations,
          metadata: result.metadata,
        }),
      )
      .digest("hex");
    return this.store.persist({
      constructionChangeAnalysisId: input.analysis.id,
      beforeEvidenceItemId: before.evidenceItemId,
      afterEvidenceItemId: after.evidenceItemId,
      metadata: result.metadata,
      inputFingerprint: fingerprint,
      interpretation: finalInterpretation,
    });
  }
}
