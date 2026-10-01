import assert from "node:assert/strict";
import test from "node:test";

import { GetSiteById } from "@/application/sites/get-site-by-id";
import { siteLocationSchema } from "@/contracts/sites/site-location";
import { siteOriginSchema } from "@/contracts/sites/site-origin";
import type { SiteProvider } from "@/domain/sites/site-provider";

import { SEEDED_SITES } from "./seeded-sites";
import { SeededSiteProvider } from "./seeded-site-provider";

const provider = new SeededSiteProvider();

test("validates a mappable coordinate pair with approximate and prepared quality", () => {
  assert.equal(
    siteLocationSchema.safeParse({
      locationState: "MAPPABLE",
      latitude: 12.9716,
      longitude: 77.5946,
      coordinatePrecisionMeters: 50,
      coordinateQuality: "APPROXIMATE",
    }).success,
    true,
  );
  assert.equal(
    siteLocationSchema.safeParse({
      locationState: "MAPPABLE",
      latitude: 12.9352,
      longitude: 77.6245,
      coordinateQuality: "PREPARED",
    }).success,
    true,
  );
});

test("rejects invalid, non-finite, partial, and silently swapped coordinates", () => {
  const invalidLocations = [
    {
      locationState: "MAPPABLE",
      latitude: 90.1,
      longitude: 77.5946,
      coordinateQuality: "EXACT",
    },
    {
      locationState: "MAPPABLE",
      latitude: 12.9716,
      longitude: 180.1,
      coordinateQuality: "EXACT",
    },
    {
      locationState: "MAPPABLE",
      latitude: Number.NaN,
      longitude: 77.5946,
      coordinateQuality: "EXACT",
    },
    {
      locationState: "MAPPABLE",
      latitude: 12.9716,
      coordinateQuality: "EXACT",
    },
    {
      locationState: "MAPPABLE",
      longitude: 77.5946,
      coordinateQuality: "EXACT",
    },
    {
      locationState: "MAPPABLE",
      latitude: 120,
      longitude: 12,
      coordinateQuality: "EXACT",
    },
  ];

  for (const location of invalidLocations) {
    assert.equal(siteLocationSchema.safeParse(location).success, false);
  }
});

test("requires positive coordinate precision only when coordinates exist", () => {
  assert.equal(
    siteLocationSchema.safeParse({
      locationState: "MAPPABLE",
      latitude: 12.9716,
      longitude: 77.5946,
      coordinateQuality: "EXACT",
      coordinatePrecisionMeters: 0,
    }).success,
    false,
  );
  assert.equal(
    siteLocationSchema.safeParse({
      locationState: "NOT_MAPPABLE",
      displayAddress: "Prototype address-only site",
      coordinatePrecisionMeters: 10,
    }).success,
    false,
  );
});

test("requires coordinate quality for a coordinate pair", () => {
  assert.equal(
    siteLocationSchema.safeParse({
      locationState: "MAPPABLE",
      latitude: 12.9716,
      longitude: 77.5946,
    }).success,
    false,
  );
});

test("allows address-only and unresolved locations without coordinate quality", () => {
  assert.equal(
    siteLocationSchema.safeParse({
      locationState: "NOT_MAPPABLE",
      displayAddress: "Prototype address-only site",
      city: "Bengaluru",
    }).success,
    true,
  );
  assert.equal(
    siteLocationSchema.safeParse({ locationState: "UNRESOLVED" }).success,
    true,
  );
  assert.equal(
    siteLocationSchema.safeParse({ locationState: "NOT_MAPPABLE" }).success,
    false,
  );
  assert.equal(
    siteLocationSchema.safeParse({
      locationState: "UNRESOLVED",
      coordinateQuality: "APPROXIMATE",
    }).success,
    false,
  );
});

test("fixtures have stable identities and explicit non-live provenance", () => {
  assert.equal(SEEDED_SITES.length, 4);
  assert.equal(new Set(SEEDED_SITES.map((site) => site.id)).size, 4);

  for (const site of SEEDED_SITES) {
    assert.equal(site.origin.isLive, false);
    assert.ok(site.origin.providerId);
    assert.ok(site.origin.providerLabel);
    assert.ok(site.origin.retrievedAt instanceof Date);
  }

  const prepared = SEEDED_SITES.find(
    (site) => site.id === "site-demo-prepared-002",
  );
  assert.ok(prepared);
  assert.equal(prepared.origin.sourceType, "ANALYST_PREPARED");
  assert.equal(prepared.origin.externalRecordId, undefined);
});

test("validates optional external source identity and source metadata", () => {
  const minimalOrigin = siteOriginSchema.safeParse({
    providerId: "prepared-source",
    providerLabel: "Prepared source",
    sourceType: "ANALYST_PREPARED",
    isLive: false,
    retrievedAt: new Date("2026-09-01T10:00:00.000Z"),
  });
  const sourcedOrigin = siteOriginSchema.safeParse({
    providerId: "seeded-source",
    providerLabel: "Seeded source",
    sourceType: "SEEDED_DEMO",
    isLive: false,
    externalRecordId: "record-001",
    retrievedAt: new Date("2026-09-01T09:00:00.000Z"),
    sourceReference: "prototype-reference-001",
    sourceVersion: "v1",
  });

  assert.equal(minimalOrigin.success, true);
  assert.equal(sourcedOrigin.success, true);
});

test("fixtures keep populated provider and external-record pairs unique", () => {
  const populatedPairs = SEEDED_SITES.flatMap((site) =>
    site.origin.externalRecordId === undefined
      ? []
      : [`${site.origin.providerId}:${site.origin.externalRecordId}`],
  );

  assert.equal(new Set(populatedPairs).size, populatedPairs.length);
});

test("fixtures model the four approved location cases without conclusions", () => {
  const approximate = SEEDED_SITES.find(
    (site) => site.id === "site-demo-approximate-001",
  );
  const prepared = SEEDED_SITES.find(
    (site) => site.id === "site-demo-prepared-002",
  );
  const addressOnly = SEEDED_SITES.find(
    (site) => site.id === "site-demo-address-only-003",
  );
  const unresolved = SEEDED_SITES.find(
    (site) => site.id === "site-demo-unresolved-004",
  );

  assert.equal(approximate?.location.locationState, "MAPPABLE");
  assert.equal(approximate?.location.coordinateQuality, "APPROXIMATE");
  assert.equal(prepared?.location.locationState, "MAPPABLE");
  assert.equal(prepared?.location.coordinateQuality, "PREPARED");
  assert.equal(addressOnly?.location.locationState, "NOT_MAPPABLE");
  assert.equal(addressOnly?.location.coordinateQuality, undefined);
  assert.equal(unresolved?.location.locationState, "UNRESOLVED");
  assert.equal(unresolved?.location.coordinateQuality, undefined);

  assert.doesNotMatch(
    JSON.stringify(SEEDED_SITES).toLowerCase(),
    /illegal|encroach|violation|compliant|suspicious/,
  );
});

test("seeded provider returns found and not_found results deterministically", async () => {
  const first = await provider.getById("site-demo-approximate-001");
  const second = await provider.getById("site-demo-approximate-001");
  const missing = await provider.getById("site-demo-unknown");

  assert.equal(first.kind, "found");
  assert.equal(second.kind, "found");
  assert.deepEqual(first, second);
  assert.equal(missing.kind, "not_found");

  if (missing.kind === "not_found") {
    assert.equal(missing.provider.isLive, false);
    assert.equal(missing.siteId, "site-demo-unknown");
  }
});

test("seeded provider protects canonical nested site data from mutation", async () => {
  const first = await provider.getById("site-demo-approximate-001");
  assert.equal(first.kind, "found");

  if (first.kind !== "found") {
    return;
  }

  (first.site.origin as { providerLabel: string }).providerLabel = "Mutated";
  (first.site.location as { city: string }).city = "Mutated city";
  first.site.origin.retrievedAt.setUTCFullYear(2030);

  const second = await provider.getById("site-demo-approximate-001");
  assert.equal(second.kind, "found");

  if (second.kind === "found") {
    assert.equal(
      second.site.origin.providerLabel,
      "CivicLens Seeded Site Demo Provider",
    );
    assert.equal(second.site.location.city, "Bengaluru");
    assert.notEqual(second.site.origin.retrievedAt.getUTCFullYear(), 2030);
  }
});

test("use case validates IDs, trims input, and remains provider-independent", async () => {
  const useCase = new GetSiteById(provider);
  const found = await useCase.execute(" site-demo-approximate-001 ");
  const invalid = await useCase.execute("   ");

  assert.equal(found.kind, "found");
  assert.equal(invalid.kind, "invalid");
});

test("use case preserves unavailable and unresolved provider results", async () => {
  const unavailableProvider: SiteProvider = {
    async getById() {
      return {
        kind: "unavailable",
        provider: {
          providerId: "test-provider",
          providerLabel: "Test provider",
          sourceType: "OTHER",
          isLive: false,
        },
        reason: "Provider is unavailable.",
      };
    },
  };
  const unresolvedProvider: SiteProvider = {
    async getById(siteId) {
      return {
        kind: "unresolved",
        provider: {
          providerId: "test-provider",
          providerLabel: "Test provider",
          sourceType: "OTHER",
          isLive: false,
        },
        siteId,
        reason: "Identity cannot be confidently resolved.",
      };
    },
  };

  assert.equal(
    (await new GetSiteById(unavailableProvider).execute("site-1")).kind,
    "unavailable",
  );
  assert.equal(
    (await new GetSiteById(unresolvedProvider).execute("site-1")).kind,
    "unresolved",
  );
});
