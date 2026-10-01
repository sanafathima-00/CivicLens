/* eslint-disable @typescript-eslint/no-explicit-any */
import assert from "node:assert/strict";
import test from "node:test";

import {
  createVisionAnalysisGetHandler,
  createVisionAnalysisPostHandler,
} from "./vision-route-handlers";

const context = {
  params: Promise.resolve({
    id: "ck1234567890123456789012345",
    analysisId: "ck1234567890123456789012346",
  }),
};

test("vision routes preserve safe success and failure semantics", async () => {
  const createdAt = new Date();
  const post = createVisionAnalysisPostHandler({
    async execute() {
      return {
        kind: "persisted" as const,
        value: {
          id: "vision",
          constructionChangeAnalysisId: "analysis",
          beforeEvidenceItemId: "before",
          afterEvidenceItemId: "after",
          metadata: {
            providerId: "mock",
            providerLabel: "Mock",
            model: "model",
            promptVersion: "prompt",
            schemaVersion: "schema",
          },
          inputFingerprint: "hash",
          interpretation: {
            outcome: "INSUFFICIENT_EVIDENCE" as const,
            epistemicState: "UNRESOLVED" as const,
            observedIndicators: [],
            limitations: [],
            supportingEvidenceItemIds: ["before", "after"] as [string, string],
          },
          createdAt,
        },
      };
    },
  } as any);
  assert.equal(
    (await post(
      new Request("http://test", { method: "POST", body: "{}" }),
      context,
    ))!.status,
    201,
  );
  const unavailable = createVisionAnalysisPostHandler({
    async execute() {
      return { kind: "unavailable" as const, reason: "no" };
    },
  } as any);
  assert.equal(
    (await unavailable(
      new Request("http://test", { method: "POST", body: "{}" }),
      context,
    ))!.status,
    503,
  );
  const failed = createVisionAnalysisPostHandler({
    async execute() {
      return { kind: "failed" as const, reason: "no" };
    },
  } as any);
  assert.equal(
    (await failed(
      new Request("http://test", { method: "POST", body: "{}" }),
      context,
    ))!.status,
    500,
  );
  assert.equal(
    (await post(
      new Request("http://test", { method: "POST", body: "not-json" }),
      context,
    ))!.status,
    400,
  );
});

test("GET returns only persisted results", async () => {
  const get = createVisionAnalysisGetHandler({
    async execute() {
      return {
        kind: "found" as const,
        investigationId: "investigation",
        value: [],
      };
    },
  } as any);
  assert.equal((await get(new Request("http://test"), context))!.status, 200);
});
