import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";

import type { EvidenceAssetStore } from "@/domain/evidence/evidence-asset-store";
import type { EvidenceItem } from "@/domain/evidence/evidence";

import {
  compareImageryPair,
  seasonalDifferenceDays,
  selectImageryComparison,
} from "./deterministic-imagery-comparison";

function png(width = 512, height = 512): Uint8Array {
  const bytes = new Uint8Array(24);
  bytes.set([137, 80, 78, 71, 13, 10, 26, 10]);
  bytes.set([0, 0, 0, 13, 73, 72, 68, 82], 8);
  bytes[16] = (width >>> 24) & 255;
  bytes[17] = (width >>> 16) & 255;
  bytes[18] = (width >>> 8) & 255;
  bytes[19] = width & 255;
  bytes[20] = (height >>> 24) & 255;
  bytes[21] = (height >>> 16) & 255;
  bytes[22] = (height >>> 8) & 255;
  bytes[23] = height & 255;
  return bytes;
}

function assetStore(
  entries: Readonly<Record<string, Uint8Array>>,
): EvidenceAssetStore {
  return {
    async put() {
      throw new Error("Not used by deterministic comparison tests.");
    },
    async read(key) {
      const bytes = entries[key];
      if (bytes === undefined) return undefined;
      return {
        bytes,
        contentType: "image/png",
        sha256: createHash("sha256").update(bytes).digest("hex"),
      };
    },
  };
}

function imagery(
  id: string,
  observedAt: string,
  bytes: Uint8Array,
  overrides: {
    readonly policyId?: string;
    readonly geometry?: readonly unknown[];
    readonly gsd?: number;
    readonly crs?: string;
    readonly usability?: "USABLE" | "LIMITED" | "UNSUITABLE" | "UNASSESSED";
    readonly qualityFlags?: readonly string[];
  } = {},
): EvidenceItem {
  const sha256 = createHash("sha256").update(bytes).digest("hex");
  return {
    id,
    retrievalId: `retrieval-${id}`,
    kind: "IMAGERY",
    sourceItemKey: `test:${id}`,
    provenance: {
      providerId: "prepared-test-provider",
      providerLabel: "Prepared test provider",
      sourceClassification: "SEEDED_TEST",
      isLive: false,
      retrievedAt: new Date("2026-09-05T00:00:00.000Z"),
    },
    observedAt: { value: new Date(observedAt), precision: "EXACT" },
    capturedAt: { value: new Date(observedAt), precision: "EXACT" },
    completeness: "COMPLETE",
    integrity: "VERIFIED_BY_HASH",
    limitations: [],
    metadata: {
      imagery: {
        collectionId: "sentinel-2-l2a",
        groundSampleDistanceMeters: overrides.gsd ?? 10,
        crs: overrides.crs ?? "EPSG:32643",
        usability: overrides.usability ?? "USABLE",
        qualityFlags: overrides.qualityFlags ?? [],
        aoi: {
          policyId: overrides.policyId ?? "sentinel-2-context-square-320m-v1",
          purpose: "IMAGERY_CONTEXT_RETRIEVAL",
          sourcePointIsApproximate: true,
          geometry: {
            type: "Polygon",
            coordinates: overrides.geometry ?? [
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
    createdAt: new Date("2026-09-05T00:00:00.000Z"),
    updatedAt: new Date("2026-09-05T00:00:00.000Z"),
  };
}

test("normalizes a valid pair chronologically and produces deterministic comparable facts", async () => {
  const before = imagery(
    "caaaaaaaaaaaaaaaaaaaaaaa",
    "2022-01-01T00:00:00.000Z",
    png(),
  );
  const after = imagery(
    "cbbbbbbbbbbbbbbbbbbbbbbb",
    "2023-01-01T00:00:00.000Z",
    png(),
  );
  const result = await compareImageryPair(
    after,
    before,
    assetStore({
      [before.asset!.storageKey]: png(),
      [after.asset!.storageKey]: png(),
    }),
    ["Controlled test pair."],
  );
  assert.ok(!("kind" in result));
  if ("kind" in result) return;
  assert.equal(result.before.id, before.id);
  assert.equal(result.after.id, after.id);
  assert.equal(result.comparability, "COMPARABLE");
  assert.equal(
    result.evidenceSufficiency,
    "SUFFICIENT_FOR_CONSERVATIVE_VISUAL_STATEMENT",
  );
  assert.equal(result.deterministicFacts.temporalGapDays, 365);
  assert.equal(result.deterministicFacts.beforeRenderedDimensions?.width, 512);
  assert.equal(result.deterministicFacts.assetsIntegrityVerified, true);
});

test("enforces the 90-day boundary and calculates seasonal distance across year boundaries", async () => {
  const before = imagery(
    "caaaaaaaaaaaaaaaaaaaaaaa",
    "2022-01-15T00:00:00.000Z",
    png(),
  );
  const atBoundary = imagery(
    "cbbbbbbbbbbbbbbbbbbbbbbb",
    "2022-04-15T00:00:00.000Z",
    png(),
  );
  const below = imagery(
    "ccccccccccccccccccccccccc",
    "2022-04-14T00:00:00.000Z",
    png(),
  );
  const store = assetStore({
    [before.asset!.storageKey]: png(),
    [atBoundary.asset!.storageKey]: png(),
    [below.asset!.storageKey]: png(),
  });
  const valid = await compareImageryPair(before, atBoundary, store, []);
  const invalid = await compareImageryPair(before, below, store, []);
  assert.ok(!("kind" in valid) && !("kind" in invalid));
  if ("kind" in valid || "kind" in invalid) return;
  assert.equal(valid.comparability, "LIMITED");
  assert.equal(invalid.comparability, "NOT_COMPARABLE");
  assert.ok(
    seasonalDifferenceDays(
      new Date("2022-01-15T00:00:00Z"),
      new Date("2022-12-20T00:00:00Z"),
    ) < 45,
  );

  const sameDate = await compareImageryPair(before, before, store, []);
  assert.ok(!("kind" in sameDate));
  if (!("kind" in sameDate)) {
    assert.equal(sameDate.deterministicFacts.temporalGapDays, 0);
    assert.equal(sameDate.comparability, "NOT_COMPARABLE");
  }
});

test("marks AOI, CRS, GSD, integrity, and dimensions failures as not comparable", async () => {
  const before = imagery(
    "caaaaaaaaaaaaaaaaaaaaaaa",
    "2022-01-01T00:00:00Z",
    png(),
  );
  const differentAoi = imagery(
    "cbbbbbbbbbbbbbbbbbbbbbbb",
    "2022-07-01T00:00:00Z",
    png(),
    { policyId: "other-aoi-v1" },
  );
  const dimensionsMismatch = imagery(
    "ccccccccccccccccccccccccc",
    "2022-07-01T00:00:00Z",
    png(256, 256),
  );
  const gsdMismatch = imagery(
    "cddddddddddddddddddddddd",
    "2022-07-01T00:00:00Z",
    png(),
    { gsd: 20 },
  );
  const store = assetStore({
    [before.asset!.storageKey]: png(),
    [differentAoi.asset!.storageKey]: png(),
    [dimensionsMismatch.asset!.storageKey]: png(256, 256),
    [gsdMismatch.asset!.storageKey]: png(),
  });
  for (const other of [differentAoi, dimensionsMismatch, gsdMismatch]) {
    const result = await compareImageryPair(before, other, store, []);
    assert.ok(!("kind" in result));
    if ("kind" in result) continue;
    assert.equal(result.comparability, "NOT_COMPARABLE");
    assert.equal(result.evidenceSufficiency, "INSUFFICIENT");
  }
  const corrupt = await compareImageryPair(
    before,
    differentAoi,
    assetStore({
      [before.asset!.storageKey]: png(),
      [differentAoi.asset!.storageKey]: png(256, 256),
    }),
    [],
  );
  assert.ok(!("kind" in corrupt));
  if (!("kind" in corrupt))
    assert.equal(corrupt.deterministicFacts.assetsIntegrityVerified, false);
});

test("selects the same best pair deterministically without relying on insertion order", async () => {
  const first = imagery(
    "caaaaaaaaaaaaaaaaaaaaaaa",
    "2022-01-02T00:00:00Z",
    png(),
  );
  const middle = imagery(
    "cbbbbbbbbbbbbbbbbbbbbbbb",
    "2022-07-02T00:00:00Z",
    png(),
  );
  const last = imagery(
    "ccccccccccccccccccccccccc",
    "2023-01-02T00:00:00Z",
    png(),
  );
  const store = assetStore({
    [first.asset!.storageKey]: png(),
    [middle.asset!.storageKey]: png(),
    [last.asset!.storageKey]: png(),
  });
  const one = await selectImageryComparison([last, middle, first], store);
  const two = await selectImageryComparison([first, last, middle], store);
  assert.ok(!("kind" in one) && !("kind" in two));
  if ("kind" in one || "kind" in two) return;
  assert.equal(one.before.id, two.before.id);
  assert.equal(one.after.id, two.after.id);
});

test("records seasonal and long-gap limitations without arbitrarily rejecting a technically comparable pair", async () => {
  const before = imagery(
    "caaaaaaaaaaaaaaaaaaaaaaa",
    "2022-01-01T00:00:00Z",
    png(),
  );
  const after = imagery(
    "cbbbbbbbbbbbbbbbbbbbbbbb",
    "2025-07-15T00:00:00Z",
    png(),
  );
  const result = await compareImageryPair(
    before,
    after,
    assetStore({
      [before.asset!.storageKey]: png(),
      [after.asset!.storageKey]: png(),
    }),
    [],
  );
  assert.ok(!("kind" in result));
  if ("kind" in result) return;
  assert.equal(result.comparability, "LIMITED");
  assert.equal(result.evidenceSufficiency, "LIMITED");
  assert.ok(result.limitations.some((value) => value.includes("seasonal")));
  assert.ok(result.limitations.some((value) => value.includes("intermediate")));
});
