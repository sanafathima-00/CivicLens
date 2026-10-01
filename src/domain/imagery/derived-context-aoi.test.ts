import assert from "node:assert/strict";
import test from "node:test";

import { deriveSentinel2ContextAoi } from "./derived-context-aoi";
import type { Site } from "@/domain/sites/site";

function site(overrides: Partial<Site["location"]> = {}): Site {
  return {
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
      ...overrides,
    },
  };
}

test("derives a deterministic geodesic Sentinel-2 context AOI", () => {
  const first = deriveSentinel2ContextAoi(site());
  const second = deriveSentinel2ContextAoi(site());
  assert.equal(first.kind, "derived");
  assert.equal(second.kind, "derived");
  if (first.kind !== "derived" || second.kind !== "derived") return;
  assert.deepEqual(first.value.geometry, second.value.geometry);
  assert.equal(first.value.policyId, "sentinel-2-context-square-320m-v1");
  assert.equal(first.value.sourcePointIsApproximate, true);
  assert.equal(first.value.purpose, "IMAGERY_CONTEXT_RETRIEVAL");
  assert.match(
    first.value.limitations.join(" "),
    /not a construction footprint/i,
  );
  assert.match(first.value.limitations.join(" "), /approximate/i);
  const [[west, south], [east], , [westAgain, north]] =
    first.value.geometry.coordinates[0];
  assert.ok(west < east);
  assert.ok(south < north);
  assert.equal(west, westAgain);
});

test("retains exact and prepared coordinate semantics without calling them approximate", () => {
  for (const quality of ["EXACT", "PREPARED"] as const) {
    const result = deriveSentinel2ContextAoi(
      site({ coordinateQuality: quality }),
    );
    assert.equal(result.kind, "derived");
    if (result.kind !== "derived") continue;
    assert.equal(result.value.coordinateQuality, quality);
    assert.equal(result.value.sourcePointIsApproximate, false);
  }
});

test("rejects unmappable or invalid Sites", () => {
  assert.equal(
    deriveSentinel2ContextAoi(site({ locationState: "NOT_MAPPABLE" })).kind,
    "unmappable",
  );
  assert.equal(
    deriveSentinel2ContextAoi(site({ latitude: undefined })).kind,
    "unmappable",
  );
  assert.equal(
    deriveSentinel2ContextAoi(site({ longitude: 181 })).kind,
    "unmappable",
  );
});
