import { createHash } from "node:crypto";

import { z } from "zod";

import type {
  EvidenceAssetReference,
  EvidenceItem,
} from "@/domain/evidence/evidence";
import type { EvidenceAssetStore } from "@/domain/evidence/evidence-asset-store";

import type {
  AoiIdentity,
  ChangeEvidenceSufficiency,
  ComparisonFacts,
  ImageryComparability,
} from "./construction-change-analysis";
import {
  COMPARISON_POLICY_LIMITATIONS,
  LONG_TEMPORAL_GAP_DAYS,
  MINIMUM_TEMPORAL_GAP_DAYS,
  SAME_SEASON_PREFERENCE_DAYS,
  SENTINEL_2_CONTEXT_COMPARISON_POLICY_ID,
} from "./imagery-comparison-policy";

const imageryMetadataSchema = z.object({
  imagery: z.object({
    collectionId: z.string().min(1),
    groundSampleDistanceMeters: z.number().positive().optional(),
    crs: z.string().min(1).optional(),
    usability: z.enum(["USABLE", "LIMITED", "UNSUITABLE", "UNASSESSED"]),
    qualityFlags: z.array(z.string()),
    aoi: z.object({
      policyId: z.string().min(1),
      purpose: z.literal("IMAGERY_CONTEXT_RETRIEVAL"),
      sourcePointIsApproximate: z.boolean(),
      geometry: z.object({
        type: z.literal("Polygon"),
        coordinates: z.array(z.array(z.tuple([z.number(), z.number()]))),
      }),
    }),
  }),
});

interface ValidatedImagery {
  readonly item: EvidenceItem;
  readonly asset: EvidenceAssetReference;
  readonly observedAt: Date;
  readonly collectionId: string;
  readonly gsd?: number;
  readonly crs?: string;
  readonly usability: string;
  readonly qualityFlags: readonly string[];
  readonly aoi: AoiIdentity;
}

interface LoadedAsset {
  readonly dimensions?: { readonly width: number; readonly height: number };
  readonly integrityVerified: boolean;
  readonly limitation?: string;
}

export interface DeterministicComparisonResult {
  readonly before: EvidenceItem;
  readonly after: EvidenceItem;
  readonly aoiIdentity: AoiIdentity;
  readonly comparisonPolicyId: string;
  readonly deterministicFacts: ComparisonFacts;
  readonly comparability: ImageryComparability;
  readonly evidenceSufficiency: ChangeEvidenceSufficiency;
  readonly limitations: readonly string[];
}

export type DeterministicComparisonFailure = {
  readonly kind: "invalid_imagery" | "asset_unavailable";
  readonly limitations: readonly string[];
};

/**
 * Raised only when the configured asset dependency cannot be read. Invalid or
 * missing persisted assets are deterministic comparison facts, not dependency
 * outages, and are represented by a NOT_COMPARABLE result instead.
 */
export class EvidenceAssetDependencyUnavailableError extends Error {
  constructor() {
    super("The evidence asset store is unavailable.");
    this.name = "EvidenceAssetDependencyUnavailableError";
  }
}

function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (value !== null && typeof value === "object") {
    const record = value as Record<string, unknown>;
    return `{${Object.keys(record)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${canonicalJson(record[key])}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

function geometryHash(geometry: unknown): string {
  return createHash("sha256").update(canonicalJson(geometry)).digest("hex");
}

function parse(item: EvidenceItem): ValidatedImagery | undefined {
  if (item.kind !== "IMAGERY" || item.asset === undefined) return undefined;
  const parsed = imageryMetadataSchema.safeParse(item.metadata);
  if (!parsed.success || item.observedAt === undefined) return undefined;
  const imagery = parsed.data.imagery;
  return {
    item,
    asset: item.asset,
    observedAt: item.observedAt.value,
    collectionId: imagery.collectionId,
    ...(imagery.groundSampleDistanceMeters === undefined
      ? {}
      : { gsd: imagery.groundSampleDistanceMeters }),
    ...(imagery.crs === undefined ? {} : { crs: imagery.crs }),
    usability: imagery.usability,
    qualityFlags: imagery.qualityFlags,
    aoi: {
      policyId: imagery.aoi.policyId,
      geometryHash: geometryHash(imagery.aoi.geometry),
      purpose: imagery.aoi.purpose,
      sourcePointIsApproximate: imagery.aoi.sourcePointIsApproximate,
    },
  };
}

function pngDimensions(
  bytes: Uint8Array,
): { readonly width: number; readonly height: number } | undefined {
  const signature = [137, 80, 78, 71, 13, 10, 26, 10];
  if (
    bytes.length < 24 ||
    !signature.every((entry, index) => bytes[index] === entry) ||
    String.fromCharCode(...bytes.slice(12, 16)) !== "IHDR"
  ) {
    return undefined;
  }
  const width =
    ((bytes[16] ?? 0) << 24) |
    ((bytes[17] ?? 0) << 16) |
    ((bytes[18] ?? 0) << 8) |
    (bytes[19] ?? 0);
  const height =
    ((bytes[20] ?? 0) << 24) |
    ((bytes[21] ?? 0) << 16) |
    ((bytes[22] ?? 0) << 8) |
    (bytes[23] ?? 0);
  return width > 0 && height > 0 ? { width, height } : undefined;
}

async function loadAsset(
  asset: EvidenceAssetReference,
  assetStore: EvidenceAssetStore,
): Promise<LoadedAsset> {
  let loaded;
  try {
    loaded = await assetStore.read(asset.storageKey);
  } catch {
    throw new EvidenceAssetDependencyUnavailableError();
  }
  if (loaded === undefined) {
    return {
      integrityVerified: false,
      limitation: "The imagery asset is unavailable.",
    };
  }
  const sha256 = createHash("sha256").update(loaded.bytes).digest("hex");
  if (
    sha256 !== asset.sha256 ||
    loaded.sha256 !== asset.sha256 ||
    loaded.contentType !== asset.contentType
  ) {
    return {
      integrityVerified: false,
      limitation: "The imagery asset failed integrity verification.",
    };
  }
  const dimensions =
    loaded.contentType === "image/png"
      ? pngDimensions(loaded.bytes)
      : undefined;
  if (loaded.contentType === "image/png" && dimensions === undefined) {
    return {
      integrityVerified: false,
      limitation: "The PNG imagery asset has invalid dimensions.",
    };
  }
  return {
    integrityVerified: true,
    ...(dimensions === undefined ? {} : { dimensions }),
  };
}

function daysBetween(earlier: Date, later: Date): number {
  return Math.floor((later.getTime() - earlier.getTime()) / 86_400_000);
}

function dayOfYear(value: Date): number {
  const start = Date.UTC(value.getUTCFullYear(), 0, 0);
  return Math.floor((value.getTime() - start) / 86_400_000);
}

function daysInYear(value: Date): number {
  const year = value.getUTCFullYear();
  return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0) ? 366 : 365;
}

export function seasonalDifferenceDays(left: Date, right: Date): number {
  const absolute = Math.abs(dayOfYear(left) - dayOfYear(right));
  const cycle = Math.max(daysInYear(left), daysInYear(right));
  return Math.min(absolute, cycle - absolute);
}

function chronological(
  left: ValidatedImagery,
  right: ValidatedImagery,
): readonly [ValidatedImagery, ValidatedImagery] {
  return left.observedAt.getTime() < right.observedAt.getTime() ||
    (left.observedAt.getTime() === right.observedAt.getTime() &&
      left.item.id.localeCompare(right.item.id) <= 0)
    ? [left, right]
    : [right, left];
}

function hasFlag(value: ValidatedImagery, flag: string): boolean {
  return value.qualityFlags.includes(flag);
}

export async function compareImageryPair(
  leftItem: EvidenceItem,
  rightItem: EvidenceItem,
  assetStore: EvidenceAssetStore,
  selectionRationale: readonly string[],
): Promise<DeterministicComparisonResult | DeterministicComparisonFailure> {
  const left = parse(leftItem);
  const right = parse(rightItem);
  if (left === undefined || right === undefined) {
    return {
      kind: "invalid_imagery",
      limitations: [
        "Selected evidence is not valid persisted imagery with required comparison metadata.",
      ],
    };
  }
  const [before, after] = chronological(left, right);
  const [beforeAsset, afterAsset] = await Promise.all([
    loadAsset(before.asset, assetStore),
    loadAsset(after.asset, assetStore),
  ]);
  const gapDays = daysBetween(before.observedAt, after.observedAt);
  const seasonalDays = seasonalDifferenceDays(
    before.observedAt,
    after.observedAt,
  );
  const sameAoiPolicy = before.aoi.policyId === after.aoi.policyId;
  const sameAoi =
    sameAoiPolicy && before.aoi.geometryHash === after.aoi.geometryHash;
  const sameProvider =
    before.item.provenance.providerId === after.item.provenance.providerId;
  const sameCollection = before.collectionId === after.collectionId;
  const compatibleNativeGsd =
    before.gsd !== undefined && before.gsd === after.gsd;
  const sameCrs = before.crs !== undefined && before.crs === after.crs;
  const renderedDimensionsComparable =
    beforeAsset.dimensions !== undefined &&
    afterAsset.dimensions !== undefined &&
    beforeAsset.dimensions.width === afterAsset.dimensions.width &&
    beforeAsset.dimensions.height === afterAsset.dimensions.height;
  const assetsIntegrityVerified =
    beforeAsset.integrityVerified && afterAsset.integrityVerified;
  const limitations = [
    ...selectionRationale,
    ...(beforeAsset.limitation === undefined ? [] : [beforeAsset.limitation]),
    ...(afterAsset.limitation === undefined ? [] : [afterAsset.limitation]),
  ];

  const hardFailure =
    !sameAoi ||
    !sameProvider ||
    !sameCollection ||
    !compatibleNativeGsd ||
    !sameCrs ||
    !renderedDimensionsComparable ||
    !assetsIntegrityVerified ||
    gapDays < MINIMUM_TEMPORAL_GAP_DAYS ||
    before.usability === "UNSUITABLE" ||
    after.usability === "UNSUITABLE" ||
    hasFlag(before, "PARTIAL_COVERAGE") ||
    hasFlag(after, "PARTIAL_COVERAGE");

  if (!sameAoi)
    limitations.push(
      "The observations do not describe the same derived imagery context AOI.",
    );
  if (!sameProvider || !sameCollection)
    limitations.push(
      "The observations are from incompatible provider or collection context.",
    );
  if (!compatibleNativeGsd || !sameCrs)
    limitations.push(
      "The observations have incompatible native resolution or CRS metadata.",
    );
  if (!renderedDimensionsComparable)
    limitations.push(
      "The stored imagery renders have incompatible dimensions; no image warping is performed.",
    );
  if (gapDays < MINIMUM_TEMPORAL_GAP_DAYS)
    limitations.push(
      `The ${gapDays}-day gap is below the ${MINIMUM_TEMPORAL_GAP_DAYS}-day comparison-policy minimum.`,
    );

  const limited =
    before.usability !== "USABLE" ||
    after.usability !== "USABLE" ||
    hasFlag(before, "CLOUD_AFFECTED") ||
    hasFlag(after, "CLOUD_AFFECTED") ||
    hasFlag(before, "LOW_RESOLUTION") ||
    hasFlag(after, "LOW_RESOLUTION") ||
    seasonalDays > SAME_SEASON_PREFERENCE_DAYS ||
    gapDays > LONG_TEMPORAL_GAP_DAYS;

  if (seasonalDays > SAME_SEASON_PREFERENCE_DAYS)
    limitations.push(COMPARISON_POLICY_LIMITATIONS.seasonal);
  if (gapDays > LONG_TEMPORAL_GAP_DAYS)
    limitations.push(COMPARISON_POLICY_LIMITATIONS.longGap);
  if (before.usability === "UNASSESSED" || after.usability === "UNASSESSED")
    limitations.push(COMPARISON_POLICY_LIMITATIONS.unassessed);
  if (hasFlag(before, "LOW_RESOLUTION") || hasFlag(after, "LOW_RESOLUTION"))
    limitations.push(COMPARISON_POLICY_LIMITATIONS.nativeResolution);
  if (before.aoi.sourcePointIsApproximate || after.aoi.sourcePointIsApproximate)
    limitations.push(COMPARISON_POLICY_LIMITATIONS.approximateAoi);
  if (hasFlag(before, "CLOUD_AFFECTED") || hasFlag(after, "CLOUD_AFFECTED"))
    limitations.push(COMPARISON_POLICY_LIMITATIONS.cloudMetadata);

  const comparability: ImageryComparability = hardFailure
    ? "NOT_COMPARABLE"
    : limited
      ? "LIMITED"
      : "COMPARABLE";
  const evidenceSufficiency: ChangeEvidenceSufficiency =
    comparability === "NOT_COMPARABLE"
      ? "INSUFFICIENT"
      : comparability === "LIMITED"
        ? "LIMITED"
        : "SUFFICIENT_FOR_CONSERVATIVE_VISUAL_STATEMENT";

  return {
    before: before.item,
    after: after.item,
    aoiIdentity: before.aoi,
    comparisonPolicyId: SENTINEL_2_CONTEXT_COMPARISON_POLICY_ID,
    deterministicFacts: {
      beforeEvidenceItemId: before.item.id,
      afterEvidenceItemId: after.item.id,
      beforeSha256: before.asset.sha256,
      afterSha256: after.asset.sha256,
      beforeObservedAt: before.observedAt.toISOString(),
      afterObservedAt: after.observedAt.toISOString(),
      temporalGapDays: gapDays,
      seasonalDifferenceDays: seasonalDays,
      aoiIdentity: before.aoi,
      sameAoi,
      sameAoiPolicy,
      sameProvider,
      sameCollection,
      compatibleNativeGsd,
      sameCrs,
      renderedDimensionsComparable,
      ...(beforeAsset.dimensions === undefined
        ? {}
        : { beforeRenderedDimensions: beforeAsset.dimensions }),
      ...(afterAsset.dimensions === undefined
        ? {}
        : { afterRenderedDimensions: afterAsset.dimensions }),
      assetsIntegrityVerified,
      beforeUsability: before.usability,
      afterUsability: after.usability,
      beforeQualityFlags: before.qualityFlags,
      afterQualityFlags: after.qualityFlags,
      selectionRationale,
    },
    comparability,
    evidenceSufficiency,
    limitations: [...new Set(limitations)],
  };
}

export async function selectImageryComparison(
  items: readonly EvidenceItem[],
  assetStore: EvidenceAssetStore,
): Promise<DeterministicComparisonResult | DeterministicComparisonFailure> {
  const imagery = items
    .filter((item) => parse(item) !== undefined)
    .sort(
      (left, right) =>
        (left.observedAt?.value.getTime() ?? 0) -
          (right.observedAt?.value.getTime() ?? 0) ||
        left.id.localeCompare(right.id),
    );
  if (imagery.length < 2) {
    return {
      kind: "invalid_imagery",
      limitations: [
        "At least two persisted imagery observations are required for deterministic comparison.",
      ],
    };
  }
  const results = await Promise.all(
    imagery.flatMap((before, index) =>
      imagery
        .slice(index + 1)
        .map((after) =>
          compareImageryPair(before, after, assetStore, [
            "The pair was selected deterministically from persisted Investigation imagery.",
          ]),
        ),
    ),
  );
  const candidates = results.filter(
    (result): result is DeterministicComparisonResult => !("kind" in result),
  );
  if (candidates.length === 0) {
    return {
      kind: "invalid_imagery",
      limitations: [
        "No persisted imagery pair has valid comparison metadata and readable assets.",
      ],
    };
  }
  const tier = (value: ImageryComparability) =>
    value === "COMPARABLE" ? 0 : value === "LIMITED" ? 1 : 2;
  return [...candidates].sort(
    (left, right) =>
      tier(left.comparability) - tier(right.comparability) ||
      left.deterministicFacts.seasonalDifferenceDays -
        right.deterministicFacts.seasonalDifferenceDays ||
      right.deterministicFacts.temporalGapDays -
        left.deterministicFacts.temporalGapDays ||
      left.deterministicFacts.beforeObservedAt.localeCompare(
        right.deterministicFacts.beforeObservedAt,
      ) ||
      left.before.id.localeCompare(right.before.id) ||
      left.after.id.localeCompare(right.after.id),
  )[0]!;
}
