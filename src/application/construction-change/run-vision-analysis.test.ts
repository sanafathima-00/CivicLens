/* eslint-disable @typescript-eslint/no-explicit-any */
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";

import { RunVisionAnalysisForConstructionChange } from "./run-vision-analysis";

const investigationId = "ck1234567890123456789012345";
const analysisId = "ck1234567890123456789012346";
const beforeId = "ck1234567890123456789012347";
const afterId = "ck1234567890123456789012348";
const bytes = Uint8Array.from([137, 80, 78, 71]);
const hash = createHash("sha256").update(bytes).digest("hex");
const asset = {
  storageKey: "sha256/test",
  contentType: "image/png" as const,
  byteSize: bytes.byteLength,
  sha256: hash,
};

function item(id: string, date: string) {
  return {
    id,
    retrievalId: "r",
    kind: "IMAGERY" as const,
    sourceItemKey: id,
    provenance: {
      providerId: "planetary-computer-sentinel2",
      providerLabel: "Planetary Computer",
      sourceClassification: "LIVE_SOURCE" as const,
      isLive: true,
      retrievedAt: new Date(),
    },
    observedAt: { value: new Date(date), precision: "EXACT" as const },
    completeness: "COMPLETE" as const,
    integrity: "VERIFIED_BY_HASH" as const,
    limitations: [],
    metadata: {
      imagery: {
        collectionId: "sentinel-2-l2a",
        groundSampleDistanceMeters: 10,
        crs: "EPSG:32643",
        usability: "USABLE",
        qualityFlags: [],
      },
    },
    asset,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

function parent(
  sufficiency = "SUFFICIENT_FOR_CONSERVATIVE_VISUAL_STATEMENT",
  limitations: readonly string[] = [],
  comparability = "COMPARABLE",
) {
  return {
    id: analysisId,
    investigationId,
    beforeEvidenceItemId: beforeId,
    afterEvidenceItemId: afterId,
    aoiIdentity: {
      policyId: "sentinel-2-context-square-320m-v1",
      geometryHash: "hash",
      purpose: "IMAGERY_CONTEXT_RETRIEVAL" as const,
      sourcePointIsApproximate: true,
    },
    comparisonPolicyId: "sentinel2-context-comparison-v1",
    deterministicFacts: { temporalGapDays: 365, seasonalDifferenceDays: 0 },
    comparability: comparability as any,
    evidenceSufficiency: sufficiency as any,
    outcome: "INSUFFICIENT_EVIDENCE" as const,
    epistemicState: "UNRESOLVED" as const,
    observedIndicators: [],
    limitations,
    createdAt: new Date(),
  };
}

test("passes only verified trusted imagery context to the analyzer and persists a valid result", async () => {
  let received: any;
  let persisted: any;
  const store: any = {
    async getInput() {
      return {
        kind: "found",
        investigationId,
        analysis: parent(),
        before: item(beforeId, "2023-01-01T00:00:00Z"),
        after: item(afterId, "2024-01-01T00:00:00Z"),
      };
    },
    async persist(value: any) {
      persisted = value;
      return {
        kind: "persisted",
        value: {
          ...value,
          id: "ck1234567890123456789012349",
          createdAt: new Date(),
        },
      };
    },
  };
  const analyzer: any = {
    providerId: "mock",
    async analyze(value: any) {
      received = value;
      return {
        kind: "completed",
        value: {
          outcome: "VISIBLE_CONTEXT_CHANGE_UNCLASSIFIED",
          epistemicState: "OBSERVED",
          observedIndicators: ["A broad visible context difference."],
          limitations: ["10m context imagery."],
          supportingEvidenceItemIds: [beforeId, afterId],
        },
        metadata: {
          providerId: "mock",
          providerLabel: "Mock",
          model: "mock-v1",
          promptVersion: "test",
          schemaVersion: "test",
        },
      };
    },
  };
  const result = await new RunVisionAnalysisForConstructionChange(
    store,
    {
      async read() {
        return { bytes, contentType: "image/png", sha256: hash };
      },
    } as any,
    analyzer,
  ).execute(investigationId, analysisId);
  assert.equal(result.kind, "persisted");
  assert.equal(received.before.bytes, bytes);
  assert.equal(persisted.beforeEvidenceItemId, beforeId);
  assert.match(persisted.inputFingerprint, /^[a-f0-9]{64}$/);
});

test("does not invoke the analyzer for insufficient or invalid evidence", async () => {
  let calls = 0;
  const store: any = {
    async getInput() {
      return {
        kind: "found",
        investigationId,
        analysis: parent("INSUFFICIENT"),
        before: item(beforeId, "2023-01-01T00:00:00Z"),
        after: item(afterId, "2024-01-01T00:00:00Z"),
      };
    },
  };
  const result = await new RunVisionAnalysisForConstructionChange(
    store,
    {} as any,
    {
      providerId: "mock",
      async analyze() {
        calls++;
        return { kind: "failed", reason: "unexpected" };
      },
    },
  ).execute(investigationId, analysisId);
  assert.equal(result.kind, "unprocessable");
  assert.equal(calls, 0);
});

test("represents positive, no-change, and environmental visual cases without live model variability", async () => {
  const cases = [
    {
      name: "positive context-scale change",
      value: {
        outcome: "APPARENT_LARGE_SCALE_BUILT_CONTEXT_CHANGE",
        epistemicState: "INFERRED",
        observedIndicators: [
          "A larger contiguous light-toned surface is visible in the later image.",
        ],
        interpretation:
          "The later image appears to contain more built-looking context.",
        limitations: [],
      },
    },
    {
      name: "no meaningful visible change",
      value: {
        outcome: "NO_SIGNIFICANT_VISIBLE_CONTEXT_CHANGE",
        epistemicState: "OBSERVED",
        observedIndicators: [
          "No significant visible context difference is identified in the supplied images.",
        ],
        limitations: [],
      },
    },
    {
      name: "vegetation and seasonal variation",
      value: {
        outcome: "VISIBLE_CONTEXT_CHANGE_UNCLASSIFIED",
        epistemicState: "OBSERVED",
        observedIndicators: ["Vegetation appears reduced in the later image."],
        limitations: [
          "Seasonal variation may affect the visible surface appearance.",
          "Vegetation partially obscures the context area.",
        ],
      },
    },
    {
      name: "shadow and haze ambiguity",
      value: {
        outcome: "INSUFFICIENT_EVIDENCE",
        epistemicState: "UNRESOLVED",
        observedIndicators: [],
        limitations: ["Strong shadows and haze limit visual interpretation."],
      },
    },
  ] as const;

  for (const scenario of cases) {
    let persisted: any;
    const store: any = {
      async getInput() {
        return {
          kind: "found",
          investigationId,
          analysis: parent("SUFFICIENT_FOR_CONSERVATIVE_VISUAL_STATEMENT", [
            "Sentinel-2 imagery is context-scale.",
          ]),
          before: item(beforeId, "2023-01-01T00:00:00Z"),
          after: item(afterId, "2024-01-01T00:00:00Z"),
        };
      },
      async persist(value: any) {
        persisted = value;
        return {
          kind: "persisted",
          value: {
            ...value,
            id: "ck1234567890123456789012349",
            createdAt: new Date(),
          },
        };
      },
    };

    const result = await new RunVisionAnalysisForConstructionChange(
      store,
      {
        async read() {
          return { bytes, contentType: "image/png", sha256: hash };
        },
      } as any,
      {
        providerId: "recorded-mock",
        async analyze() {
          return {
            kind: "completed",
            value: {
              ...scenario.value,
              supportingEvidenceItemIds: [beforeId, afterId],
            },
            metadata: {
              providerId: "recorded-mock",
              providerLabel: "Recorded mock",
              model: "fixture-v1",
              promptVersion: "fixture",
              schemaVersion: "fixture",
            },
          };
        },
      } as any,
    ).execute(investigationId, analysisId);

    assert.equal(result.kind, "persisted", scenario.name);
    assert.equal(persisted.interpretation.outcome, scenario.value.outcome);
    assert.equal(
      persisted.interpretation.epistemicState,
      scenario.value.epistemicState,
    );
    assert.ok(
      persisted.interpretation.limitations.includes(
        "Sentinel-2 imagery is context-scale.",
      ),
    );
  }
});

test("keeps poor or non-comparable imagery out of the vision analyzer", async () => {
  for (const analysis of [
    parent("INSUFFICIENT"),
    parent("LIMITED", [], "NOT_COMPARABLE"),
  ]) {
    let calls = 0;
    const result = await new RunVisionAnalysisForConstructionChange(
      {
        async getInput() {
          return {
            kind: "found" as const,
            investigationId,
            analysis,
            before: item(beforeId, "2023-01-01T00:00:00Z"),
            after: item(afterId, "2024-01-01T00:00:00Z"),
          };
        },
      } as any,
      {} as any,
      {
        providerId: "mock",
        async analyze() {
          calls++;
          return { kind: "failed" as const, reason: "must not run" };
        },
      },
    ).execute(investigationId, analysisId);
    assert.equal(result.kind, "unprocessable");
    assert.equal(calls, 0);
  }
});

test("rejects unsafe analyzer output before persistence", async () => {
  let persistCalls = 0;
  const store: any = {
    async getInput() {
      return {
        kind: "found",
        investigationId,
        analysis: parent(),
        before: item(beforeId, "2023-01-01T00:00:00Z"),
        after: item(afterId, "2024-01-01T00:00:00Z"),
      };
    },
    async persist() {
      persistCalls++;
      throw new Error("must not persist unsafe output");
    },
  };
  const result = await new RunVisionAnalysisForConstructionChange(
    store,
    {
      async read() {
        return { bytes, contentType: "image/png", sha256: hash };
      },
    } as any,
    {
      providerId: "mock",
      async analyze() {
        return {
          kind: "completed",
          value: {
            outcome: "VISIBLE_CONTEXT_CHANGE_UNCLASSIFIED",
            epistemicState: "OBSERVED",
            observedIndicators: ["An unlawful development is visible."],
            limitations: [],
            supportingEvidenceItemIds: [beforeId, afterId],
          },
          metadata: {
            providerId: "mock",
            providerLabel: "Mock",
            model: "mock-v1",
            promptVersion: "test",
            schemaVersion: "test",
          },
        };
      },
    } as any,
  ).execute(investigationId, analysisId);
  assert.equal(result.kind, "invalid_output");
  assert.equal(persistCalls, 0);
});

test("persists an ordered, deduplicated union of deterministic and visual limitations", async () => {
  const cases = [
    {
      parentLimitations: ["deterministic limitation A"],
      modelLimitations: ["visual caveat B"],
      expected: ["deterministic limitation A", "visual caveat B"],
    },
    {
      parentLimitations: ["deterministic limitation A"],
      modelLimitations: [],
      expected: ["deterministic limitation A"],
    },
    {
      parentLimitations: ["deterministic limitation A"],
      modelLimitations: ["deterministic limitation A", "visual caveat B"],
      expected: ["deterministic limitation A", "visual caveat B"],
    },
    {
      parentLimitations: [
        "deterministic limitation A",
        "deterministic limitation B",
      ],
      modelLimitations: ["visual caveat C"],
      expected: [
        "deterministic limitation A",
        "deterministic limitation B",
        "visual caveat C",
      ],
    },
  ] as const;

  for (const scenario of cases) {
    let persisted: any;
    const store: any = {
      async getInput() {
        return {
          kind: "found",
          investigationId,
          analysis: parent(
            "SUFFICIENT_FOR_CONSERVATIVE_VISUAL_STATEMENT",
            scenario.parentLimitations,
          ),
          before: item(beforeId, "2023-01-01T00:00:00Z"),
          after: item(afterId, "2024-01-01T00:00:00Z"),
        };
      },
      async persist(value: any) {
        persisted = value;
        return {
          kind: "persisted",
          value: {
            ...value,
            id: "ck1234567890123456789012349",
            createdAt: new Date(),
          },
        };
      },
    };
    const result = await new RunVisionAnalysisForConstructionChange(
      store,
      {
        async read() {
          return { bytes, contentType: "image/png", sha256: hash };
        },
      } as any,
      {
        providerId: "mock",
        async analyze() {
          return {
            kind: "completed",
            value: {
              outcome: "VISIBLE_CONTEXT_CHANGE_UNCLASSIFIED",
              epistemicState: "OBSERVED",
              observedIndicators: ["A visible context pattern was reviewed."],
              limitations: scenario.modelLimitations,
              supportingEvidenceItemIds: [beforeId, afterId],
            },
            metadata: {
              providerId: "mock",
              providerLabel: "Mock",
              model: "mock-v1",
              promptVersion: "test",
              schemaVersion: "test",
            },
          };
        },
      } as any,
    ).execute(investigationId, analysisId);
    assert.equal(result.kind, "persisted");
    assert.deepEqual(persisted.interpretation.limitations, scenario.expected);
  }
});
