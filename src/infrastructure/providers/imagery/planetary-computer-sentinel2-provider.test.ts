import assert from "node:assert/strict";
import test from "node:test";

import { deriveSentinel2ContextAoi } from "@/domain/imagery/derived-context-aoi";
import type { Site } from "@/domain/sites/site";

import { PlanetaryComputerSentinel2Provider } from "./planetary-computer-sentinel2-provider";

const testSite: Site = {
  id: "site-opencity-seiaa-9",
  origin: {
    providerId: "opencity-seiaa-bengaluru-urban",
    providerLabel: "OpenCity / KSRSAC SEIAA Bengaluru Urban Maps",
    sourceType: "OPENCITY",
    isLive: false,
    retrievedAt: new Date("2026-09-04T00:00:00.000Z"),
  },
  location: {
    locationState: "MAPPABLE",
    latitude: 12.7182601998904,
    longitude: 77.719955299836,
    coordinateQuality: "APPROXIMATE",
  },
};

const aoi = deriveSentinel2ContextAoi(testSite);
if (aoi.kind !== "derived") throw new Error("Expected test AOI.");

function feature(id: string, datetime: string, cloudCover: number) {
  return {
    id,
    bbox: [77, 12, 78, 13],
    properties: {
      datetime,
      created: "2022-01-04T00:00:00.000Z",
      updated: "2022-01-05T00:00:00.000Z",
      "eo:cloud_cover": cloudCover,
      "proj:epsg": 32643,
      gsd: 10,
      "s2:product_uri": `${id}.SAFE`,
    },
    assets: { visual: { href: `https://example.test/source/${id}.tif` } },
    links: [{ rel: "self", href: `https://example.test/stac/${id}` }],
  };
}

function response(
  value: unknown,
  status = 200,
  contentType = "application/json",
) {
  return new Response(
    contentType === "application/json"
      ? JSON.stringify(value)
      : (value as BodyInit),
    { status, headers: { "content-type": contentType } },
  );
}

async function withMockFetch(
  callback: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>,
  run: () => Promise<void>,
) {
  const original = globalThis.fetch;
  globalThis.fetch = callback as typeof fetch;
  try {
    await run();
  } finally {
    globalThis.fetch = original;
  }
}

test("parses actual dated observations, preserves source identity, and ranks without annual assumptions", async () => {
  const calls: string[] = [];
  await withMockFetch(
    async (input) => {
      const url = String(input);
      calls.push(url);
      if (url.endsWith("/collections/sentinel-2-l2a")) {
        return response({
          id: "sentinel-2-l2a",
          license: "proprietary",
          links: [{ rel: "license", href: "https://example.test/license" }],
        });
      }
      if (url.endsWith("/search")) {
        return response({
          features: [
            feature("late-cloudy", "2025-11-11T05:00:00.000Z", 85),
            feature("early-clear", "2022-01-03T05:00:00.000Z", 1),
            feature("middle-clear", "2024-06-04T05:00:00.000Z", 2),
            feature("late-clear", "2026-08-01T05:00:00.000Z", 3),
          ],
        });
      }
      if (url.includes("/api/sas/v1/sign"))
        return response({ href: "https://example.test/signed" });
      if (url === "https://example.test/signed") return response("");
      if (url.includes("/item/bbox/")) {
        return response(new Uint8Array([137, 80, 78, 71]), 200, "image/png");
      }
      throw new Error(`Unexpected provider request: ${url}`);
    },
    async () => {
      const result = await new PlanetaryComputerSentinel2Provider().retrieve({
        site: testSite,
        aoi: aoi.value,
        timeRange: {
          start: new Date("2022-01-01T00:00:00.000Z"),
          end: new Date("2026-12-31T00:00:00.000Z"),
        },
        maximumObservations: 3,
      });
      assert.equal(result.status, "AVAILABLE");
      assert.equal(result.provenance.sourceClassification, "LIVE_SOURCE");
      assert.equal(result.provenance.isLive, true);
      assert.equal(result.provenance.licenseDesignation, "proprietary");
      assert.deepEqual(
        result.observations.map((observation) => observation.productId),
        ["early-clear", "middle-clear", "late-clear"],
      );
      const first = result.observations[0]!;
      assert.equal(
        first.observedAt.value.toISOString(),
        "2022-01-03T05:00:00.000Z",
      );
      assert.equal(first.collectionId, "sentinel-2-l2a");
      assert.equal(first.providerCloudCoverPercent, 1);
      assert.equal(first.groundSampleDistanceMeters, 10);
      assert.equal(first.crs, "EPSG:32643");
      assert.equal(first.usability, "UNASSESSED");
      assert.ok(first.qualityFlags.includes("LOW_RESOLUTION"));
      assert.ok(!first.provenance.sourceReference?.includes("signed"));
      assert.equal(first.selection.notSelectedSourceItemKeys[0], "late-cloudy");
    },
  );
  assert.ok(calls.some((url) => url.includes("/api/sas/v1/sign")));
  assert.ok(calls.some((url) => url.includes("/item/bbox/")));
});

test("returns AVAILABLE with zero items when catalog discovery legitimately returns no observations", async () => {
  await withMockFetch(
    async (input) => {
      const url = String(input);
      if (url.endsWith("/collections/sentinel-2-l2a"))
        return response({ id: "sentinel-2-l2a" });
      if (url.endsWith("/search")) return response({ features: [] });
      throw new Error(`Unexpected provider request: ${url}`);
    },
    async () => {
      const result = await new PlanetaryComputerSentinel2Provider().retrieve({
        site: testSite,
        aoi: aoi.value,
        timeRange: {
          start: new Date("2020-01-01T00:00:00Z"),
          end: new Date("2020-02-01T00:00:00Z"),
        },
        maximumObservations: 3,
      });
      assert.equal(result.status, "AVAILABLE");
      assert.equal(result.observations.length, 0);
    },
  );
});

test("returns UNRESOLVED instead of inventing observations for malformed catalog data", async () => {
  await withMockFetch(
    async (input) => {
      const url = String(input);
      if (url.endsWith("/collections/sentinel-2-l2a"))
        return response({ id: "sentinel-2-l2a" });
      if (url.endsWith("/search")) return response({ malformed: true });
      throw new Error(`Unexpected provider request: ${url}`);
    },
    async () => {
      const result = await new PlanetaryComputerSentinel2Provider().retrieve({
        site: testSite,
        aoi: aoi.value,
        timeRange: {
          start: new Date("2020-01-01T00:00:00Z"),
          end: new Date("2020-02-01T00:00:00Z"),
        },
        maximumObservations: 3,
      });
      assert.equal(result.status, "UNRESOLVED");
      assert.equal(result.observations.length, 0);
    },
  );
});

test(
  "live smoke: discovers Bengaluru Sentinel-2 observations, signs an asset, and retrieves a bounded context image",
  { skip: process.env.RUN_LIVE_IMAGERY_SMOKE !== "1" },
  async () => {
    const result = await new PlanetaryComputerSentinel2Provider().retrieve({
      site: testSite,
      aoi: aoi.value,
      timeRange: {
        start: new Date("2022-01-01T00:00:00.000Z"),
        end: new Date("2022-02-01T00:00:00.000Z"),
      },
      maximumObservations: 1,
    });
    assert.equal(result.status, "AVAILABLE");
    assert.equal(result.observations.length, 1);
    assert.ok(result.observations[0]!.pixels.bytes.byteLength > 0);
    assert.equal(result.observations[0]!.pixels.contentType, "image/png");
    assert.equal(result.observations[0]!.provenance.isLive, true);
  },
);
