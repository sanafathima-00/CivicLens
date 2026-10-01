import assert from "node:assert/strict";
import test from "node:test";

import type { Investigation } from "@/domain/investigations/investigation";
import type { Site } from "@/domain/sites/site";

import { PersistedSiteOriginEvidenceProvider } from "./persisted-site-origin-evidence-provider";

const site: Site = {
  id: "site-opencity-seiaa-9",
  label: "Source construction label",
  origin: {
    providerId: "opencity-seiaa-bengaluru-urban",
    providerLabel: "OpenCity / KSRSAC SEIAA Bengaluru Urban Maps",
    sourceType: "OPENCITY",
    isLive: false,
    externalRecordId: "KGIS-9",
    retrievedAt: new Date("2026-09-04T14:44:13.593Z"),
    sourceReference: "https://example.invalid/seiaa.kml",
    sourceVersion: "snapshot-v1",
    sourceContentHash: "a".repeat(64),
    licenseDesignation: "Other (Public Domain), as labelled by OpenCity",
  },
  location: {
    locationState: "MAPPABLE",
    latitude: 12.9716,
    longitude: 77.5946,
    coordinateQuality: "APPROXIMATE",
  },
};

const investigation: Investigation = {
  id: "caaaaaaaaaaaaaaaaaaaaaaaa",
  siteId: site.id,
  status: "CREATED",
  createdAt: new Date("2026-09-05T00:00:00.000Z"),
  updatedAt: new Date("2026-09-05T00:00:00.000Z"),
};

test("persisted Site-origin provider preserves source-backed approximate semantics", async () => {
  const provider = new PersistedSiteOriginEvidenceProvider();
  const result = await provider.retrieve({ investigation, site });
  const item = result.items[0];

  assert.equal(result.status, "AVAILABLE");
  assert.equal(result.provenance.providerId, site.origin.providerId);
  assert.equal(result.provenance.sourceClassification, "IMPORTED_SNAPSHOT");
  assert.equal(result.provenance.isLive, false);
  assert.equal(result.provenance.sourceContentHash, "a".repeat(64));
  assert.equal(
    result.provenance.licenseDesignation,
    "Other (Public Domain), as labelled by OpenCity",
  );
  assert.equal(item?.kind, "SITE_SOURCE_RECORD");
  assert.equal(item?.provenance.externalRecordId, "KGIS-9");
  assert.equal(item?.metadata.coordinateQuality, "APPROXIMATE");
  assert.equal(
    item?.metadata.locationSemantics,
    "APPROXIMATE_SOURCE_PROJECT_SITE_LOCATION",
  );
  assert.equal(
    item?.metadata.sourceOriginRetrievedAt,
    site.origin.retrievedAt.toISOString(),
  );
  assert.equal("address" in (item?.metadata ?? {}), false);
  assert.equal("approvalStatus" in (item?.metadata ?? {}), false);
  assert.equal("footprint" in (item?.metadata ?? {}), false);
});

test("persisted Site-origin provider creates a deterministic source item key", async () => {
  const provider = new PersistedSiteOriginEvidenceProvider();
  const [first, second] = await Promise.all([
    provider.retrieve({ investigation, site }),
    provider.retrieve({ investigation, site }),
  ]);

  assert.equal(first.items[0]?.sourceItemKey, second.items[0]?.sourceItemKey);
});
