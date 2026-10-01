import assert from "node:assert/strict";
import test from "node:test";

import type { HistoricalImageryRequest } from "@/contracts/imagery/retrieve-historical-imagery";
import type { EvidenceAssetStore } from "@/domain/evidence/evidence-asset-store";
import type { ProviderEvidenceResult } from "@/domain/evidence/evidence";
import type { EvidenceStore } from "@/domain/evidence/evidence-store";
import { deriveSentinel2ContextAoi } from "@/domain/imagery/derived-context-aoi";
import type { HistoricalImageryProvider } from "@/domain/imagery/historical-imagery-provider";
import type { InvestigationWithSite } from "@/domain/investigations/investigation-store";

import { RetrieveHistoricalImageryForInvestigation } from "./retrieve-historical-imagery-for-investigation";

const investigationId = "caaaaaaaaaaaaaaaaaaaaaaaa";
const context: InvestigationWithSite = {
  investigation: {
    id: investigationId,
    siteId: "site-opencity-seiaa-9",
    status: "CREATED",
    createdAt: new Date("2026-09-05T00:00:00.000Z"),
    updatedAt: new Date("2026-09-05T00:00:00.000Z"),
  },
  site: {
    id: "site-opencity-seiaa-9",
    label: "Source-backed construction candidate",
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
  },
};

const request: HistoricalImageryRequest = {
  start: new Date("2022-01-01T00:00:00.000Z"),
  end: new Date("2022-02-01T00:00:00.000Z"),
  maximumObservations: 1,
};

function imageProvider(): HistoricalImageryProvider {
  return {
    providerId: "test-imagery-provider",
    async retrieve(input) {
      return {
        provenance: {
          providerId: "test-imagery-provider",
          providerLabel: "Test imagery provider",
          sourceClassification: "LIVE_SOURCE",
          isLive: true,
          sourceReference: "https://example.test/stac/collection",
          retrievedAt: new Date("2026-09-05T01:00:00.000Z"),
        },
        status: "AVAILABLE",
        retrievedAt: new Date("2026-09-05T01:00:00.000Z"),
        limitations: [],
        observations: [
          {
            sourceItemKey: "sentinel-2-l2a:test-item:visual-context",
            label: "Test imagery",
            provenance: {
              providerId: "test-imagery-provider",
              providerLabel: "Test imagery provider",
              sourceClassification: "LIVE_SOURCE",
              isLive: true,
              externalRecordId: "test-item",
              sourceReference: "https://example.test/stac/test-item",
              retrievedAt: new Date("2026-09-05T01:00:00.000Z"),
            },
            capturedAt: {
              value: new Date("2022-01-03T05:12:09.000Z"),
              precision: "EXACT",
            },
            observedAt: {
              value: new Date("2022-01-03T05:12:09.000Z"),
              precision: "EXACT",
            },
            collectionId: "sentinel-2-l2a",
            productId: "test-item",
            assetRole: "RGB_CONTEXT_RENDER",
            groundSampleDistanceMeters: 10,
            crs: "EPSG:32643",
            providerCloudCoverPercent: 1,
            aoi: input.aoi,
            usability: "UNASSESSED",
            qualityFlags: ["LOW_RESOLUTION"],
            limitations: input.aoi.limitations,
            processing: [{ operation: "controlled-test-render" }],
            selection: {
              rank: 1,
              discoveredObservationCount: 1,
              eligibleObservationCount: 1,
              selectedObservationCount: 1,
              notSelectedSourceItemKeys: [],
            },
            pixels: {
              bytes: new Uint8Array([137, 80, 78, 71]),
              contentType: "image/png",
              stableAssetKey: "visual",
            },
          },
        ],
      };
    },
  };
}

function evidenceStore() {
  const persisted: ProviderEvidenceResult[][] = [];
  const store: EvidenceStore = {
    async getInvestigationWithSite() {
      return { kind: "found", value: context };
    },
    async persistRetrievals(_id, results) {
      persisted.push([...results]);
      return {
        kind: "persisted" as const,
        value: {
          investigationId,
          retrievals: [],
          items: [],
        },
      };
    },
    async getPackage() {
      return {
        kind: "found" as const,
        value: { investigationId, retrievals: [], items: [] },
      };
    },
  };
  return { store, persisted };
}

const assetStore: EvidenceAssetStore = {
  async put(input) {
    return {
      storageKey: "sha256/test/image_png",
      contentType: input.contentType,
      byteSize: input.bytes.byteLength,
      sha256: "a".repeat(64),
    };
  },
  async read() {
    return undefined;
  },
};

test("stores an imagery asset then persists one traceable IMAGERY EvidenceItem", async () => {
  const { store, persisted } = evidenceStore();
  const result = await new RetrieveHistoricalImageryForInvestigation(
    store,
    imageProvider(),
    assetStore,
  ).execute(investigationId, request);

  assert.equal(result.kind, "persisted");
  const item = persisted[0]?.[0]?.items[0];
  assert.equal(item?.kind, "IMAGERY");
  assert.equal(item?.asset?.contentType, "image/png");
  assert.equal(item?.asset?.sha256, "a".repeat(64));
  assert.equal(
    item?.observedAt?.value.toISOString(),
    "2022-01-03T05:12:09.000Z",
  );
  assert.equal(item?.provenance.externalRecordId, "test-item");
  assert.equal(
    (item?.metadata.imagery as { usability?: string }).usability,
    "UNASSESSED",
  );
});

test("rejects unmappable Sites before provider invocation", async () => {
  const { store } = evidenceStore();
  const unmappableStore: EvidenceStore = {
    ...store,
    async getInvestigationWithSite() {
      return {
        kind: "found" as const,
        value: {
          ...context,
          site: {
            ...context.site,
            location: { locationState: "NOT_MAPPABLE" as const },
          },
        },
      };
    },
  };
  const result = await new RetrieveHistoricalImageryForInvestigation(
    unmappableStore,
    imageProvider(),
    assetStore,
  ).execute(investigationId, request);
  assert.equal(result.kind, "unprocessable");
});

test("asset storage failure maps to unavailable without persisting evidence", async () => {
  const { store, persisted } = evidenceStore();
  const brokenStore: EvidenceAssetStore = {
    ...assetStore,
    async put() {
      throw new Error("Storage unavailable");
    },
  };
  const result = await new RetrieveHistoricalImageryForInvestigation(
    store,
    imageProvider(),
    brokenStore,
  ).execute(investigationId, request);
  assert.equal(result.kind, "unavailable");
  assert.equal(persisted.length, 0);
});

test("the AOI remains a derived context, not a footprint", () => {
  const result = deriveSentinel2ContextAoi(context.site);
  assert.equal(result.kind, "derived");
  if (result.kind === "derived") {
    assert.match(
      result.value.limitations.join(" "),
      /not a construction footprint/i,
    );
  }
});
