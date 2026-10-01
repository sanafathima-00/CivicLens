import assert from "node:assert/strict";
import test from "node:test";

import {
  createConstructionChangeAnalysisGetHandler,
  createConstructionChangeAnalysisPostHandler,
} from "./change-analysis-route-handlers";

const analysis = {
  id: "cchangeanalysis000000000001",
  investigationId: "cinvestigation00000000001",
  beforeEvidenceItemId: "cevidenceitem000000000001",
  afterEvidenceItemId: "cevidenceitem000000000002",
  aoiIdentity: {
    policyId: "sentinel-2-context-square-320m-v1",
    geometryHash: "a".repeat(64),
    purpose: "IMAGERY_CONTEXT_RETRIEVAL" as const,
    sourcePointIsApproximate: true,
  },
  comparisonPolicyId: "sentinel2-context-comparison-v1",
  deterministicFacts: {
    beforeEvidenceItemId: "cevidenceitem000000000001",
    afterEvidenceItemId: "cevidenceitem000000000002",
    beforeObservedAt: "2022-01-01T00:00:00.000Z",
    afterObservedAt: "2023-01-01T00:00:00.000Z",
    temporalGapDays: 365,
    seasonalDifferenceDays: 0,
    aoiIdentity: {
      policyId: "sentinel-2-context-square-320m-v1",
      geometryHash: "a".repeat(64),
      purpose: "IMAGERY_CONTEXT_RETRIEVAL" as const,
      sourcePointIsApproximate: true,
    },
    sameAoi: true,
    sameAoiPolicy: true,
    sameProvider: true,
    sameCollection: true,
    compatibleNativeGsd: true,
    sameCrs: true,
    renderedDimensionsComparable: true,
    assetsIntegrityVerified: true,
    beforeUsability: "USABLE",
    afterUsability: "USABLE",
    beforeQualityFlags: [],
    afterQualityFlags: [],
    selectionRationale: [],
  },
  comparability: "COMPARABLE" as const,
  evidenceSufficiency: "SUFFICIENT_FOR_CONSERVATIVE_VISUAL_STATEMENT" as const,
  outcome: "INSUFFICIENT_EVIDENCE" as const,
  epistemicState: "UNRESOLVED" as const,
  observedIndicators: [],
  limitations: [],
  createdAt: new Date("2026-09-05T00:00:00.000Z"),
};

const context = { params: Promise.resolve({ id: analysis.investigationId }) };

test("change-analysis route validates requests and exposes only deterministic analysis state", async () => {
  const post = createConstructionChangeAnalysisPostHandler({
    execute: async () => ({ kind: "persisted", value: analysis }),
  } as never);
  const get = createConstructionChangeAnalysisGetHandler({
    execute: async () => ({
      kind: "found",
      investigationId: analysis.investigationId,
      value: [analysis],
    }),
  } as never);

  const malformed = await post(
    new Request("http://localhost", { method: "POST", body: "{" }),
    context,
  );
  assert.equal(malformed.status, 400);

  const created = await post(
    new Request("http://localhost", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "{}",
    }),
    context,
  );
  assert.equal(created.status, 201);
  assert.equal((await created.json()).outcome, "INSUFFICIENT_EVIDENCE");
  assert.equal(
    (await get(new Request("http://localhost"), context)).status,
    200,
  );
});

test("change-analysis route keeps unavailable and unexpected failures distinct", async () => {
  const unavailable = createConstructionChangeAnalysisPostHandler({
    execute: async () => ({
      kind: "unavailable",
      reason: "asset store unavailable",
    }),
  } as never);
  const failed = createConstructionChangeAnalysisPostHandler({
    execute: async () => ({ kind: "failed", reason: "programming error" }),
  } as never);
  const request = () =>
    new Request("http://localhost", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "{}",
    });

  assert.equal((await unavailable(request(), context)).status, 503);
  assert.equal((await failed(request(), context)).status, 500);
});
