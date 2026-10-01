import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";

import { CreateConstructionChangeAnalysis } from "./create-construction-change-analysis";
import type { ConstructionChangeStore } from "@/domain/construction-change/construction-change-store";
import type { EvidenceAssetStore } from "@/domain/evidence/evidence-asset-store";
import type { EvidenceItem } from "@/domain/evidence/evidence";

const investigationId = "caaaaaaaaaaaaaaaaaaaaaaaa";

function png(): Uint8Array {
  const bytes = new Uint8Array(24);
  bytes.set([137, 80, 78, 71, 13, 10, 26, 10]);
  bytes.set([0, 0, 0, 13, 73, 72, 68, 82], 8);
  bytes[18] = 2;
  bytes[19] = 0;
  bytes[22] = 2;
  bytes[23] = 0;
  return bytes;
}

function item(id: string, date: string): EvidenceItem {
  const bytes = png();
  const sha256 = createHash("sha256").update(bytes).digest("hex");
  return {
    id,
    retrievalId: `retrieval-${id}`,
    kind: "IMAGERY",
    sourceItemKey: id,
    provenance: {
      providerId: "test",
      providerLabel: "Test",
      sourceClassification: "SEEDED_TEST",
      isLive: false,
      retrievedAt: new Date("2026-09-05T00:00:00Z"),
    },
    observedAt: { value: new Date(date), precision: "EXACT" },
    completeness: "COMPLETE",
    integrity: "VERIFIED_BY_HASH",
    limitations: [],
    metadata: {
      imagery: {
        collectionId: "sentinel-2-l2a",
        groundSampleDistanceMeters: 10,
        crs: "EPSG:32643",
        usability: "USABLE",
        qualityFlags: [],
        aoi: {
          policyId: "sentinel-2-context-square-320m-v1",
          purpose: "IMAGERY_CONTEXT_RETRIEVAL",
          sourcePointIsApproximate: true,
          geometry: {
            type: "Polygon",
            coordinates: [
              [
                [77, 12],
                [78, 12],
                [78, 13],
                [77, 13],
                [77, 12],
              ],
            ],
          },
        },
      },
    },
    asset: {
      storageKey: `sha256/${id}/image_png`,
      contentType: "image/png",
      byteSize: bytes.byteLength,
      sha256,
    },
    createdAt: new Date("2026-09-05T00:00:00Z"),
    updatedAt: new Date("2026-09-05T00:00:00Z"),
  };
}

function dependencies(items: readonly EvidenceItem[]) {
  const persisted: unknown[] = [];
  const store: ConstructionChangeStore = {
    async getInvestigationImagery() {
      return { kind: "found" as const, investigationId, items };
    },
    async persist(analysis) {
      persisted.push(analysis);
      return {
        kind: "persisted" as const,
        value: {
          ...analysis,
          id: "canalysis",
          createdAt: new Date("2026-09-05T00:00:00Z"),
        },
      };
    },
    async list() {
      return { kind: "found" as const, investigationId, value: [] };
    },
  };
  const assets: EvidenceAssetStore = {
    async put() {
      throw new Error("Not used");
    },
    async read(key) {
      const bytes = png();
      const sha256 = createHash("sha256").update(bytes).digest("hex");
      return key.includes("missing")
        ? undefined
        : { bytes, contentType: "image/png", sha256 };
    },
  };
  return { store, assets, persisted };
}

test("creates only an unresolved deterministic comparison analysis", async () => {
  const before = item("cbbbbbbbbbbbbbbbbbbbbbbb", "2022-01-01T00:00:00Z");
  const after = item("ccccccccccccccccccccccccc", "2023-01-01T00:00:00Z");
  const { store, assets, persisted } = dependencies([before, after]);
  const result = await new CreateConstructionChangeAnalysis(
    store,
    assets,
  ).execute(investigationId, {});
  assert.equal(result.kind, "persisted");
  if (result.kind !== "persisted") return;
  assert.equal(result.value.beforeEvidenceItemId, before.id);
  assert.equal(result.value.afterEvidenceItemId, after.id);
  assert.equal(result.value.outcome, "INSUFFICIENT_EVIDENCE");
  assert.equal(result.value.epistemicState, "UNRESOLVED");
  assert.deepEqual(result.value.observedIndicators, []);
  assert.equal(persisted.length, 1);
});

test("does not select imagery belonging outside the investigation", async () => {
  const only = item("cbbbbbbbbbbbbbbbbbbbbbbb", "2022-01-01T00:00:00Z");
  const { store, assets } = dependencies([only]);
  const result = await new CreateConstructionChangeAnalysis(
    store,
    assets,
  ).execute(investigationId, {
    beforeEvidenceItemId: only.id,
    afterEvidenceItemId: "cddddddddddddddddddddddd",
  });
  assert.equal(result.kind, "unprocessable");
});

test("returns an honest insufficiency response when fewer than two observations exist", async () => {
  const only = item("cbbbbbbbbbbbbbbbbbbbbbbb", "2022-01-01T00:00:00Z");
  const { store, assets } = dependencies([only]);
  const result = await new CreateConstructionChangeAnalysis(
    store,
    assets,
  ).execute(investigationId, {});
  assert.equal(result.kind, "unprocessable");
  if (result.kind === "unprocessable") {
    assert.match(result.message, /At least two persisted imagery observations/);
  }
});

test("maps an asset dependency outage to unavailable but keeps unexpected failures failed", async () => {
  const before = item("cbbbbbbbbbbbbbbbbbbbbbbb", "2022-01-01T00:00:00Z");
  const after = item("ccccccccccccccccccccccccc", "2023-01-01T00:00:00Z");
  const { store } = dependencies([before, after]);
  const unavailableAssets: EvidenceAssetStore = {
    async put() {
      throw new Error("not used");
    },
    async read() {
      throw new Error("connection refused");
    },
  };
  const unavailable = await new CreateConstructionChangeAnalysis(
    store,
    unavailableAssets,
  ).execute(investigationId, {});
  assert.equal(unavailable.kind, "unavailable");

  const brokenStore: ConstructionChangeStore = {
    ...store,
    async persist() {
      throw new Error("unexpected persistence programming failure");
    },
  };
  const { assets } = dependencies([before, after]);
  const failed = await new CreateConstructionChangeAnalysis(
    brokenStore,
    assets,
  ).execute(investigationId, {});
  assert.equal(failed.kind, "failed");
});
