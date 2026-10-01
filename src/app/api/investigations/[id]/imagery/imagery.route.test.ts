import assert from "node:assert/strict";
import test from "node:test";

import { RetrieveHistoricalImageryForInvestigation } from "@/application/imagery/retrieve-historical-imagery-for-investigation";
import type { EvidenceAssetStore } from "@/domain/evidence/evidence-asset-store";
import type { EvidenceStore } from "@/domain/evidence/evidence-store";
import type { HistoricalImageryProvider } from "@/domain/imagery/historical-imagery-provider";

import { createHistoricalImageryRetrieveHandler } from "./imagery-route-handlers";

const investigationId = "caaaaaaaaaaaaaaaaaaaaaaaa";

function useCase() {
  const evidenceStore: EvidenceStore = {
    async getInvestigationWithSite() {
      return {
        kind: "found" as const,
        value: {
          investigation: {
            id: investigationId,
            siteId: "site-test",
            status: "CREATED" as const,
            createdAt: new Date("2026-09-05T00:00:00Z"),
            updatedAt: new Date("2026-09-05T00:00:00Z"),
          },
          site: {
            id: "site-test",
            origin: {
              providerId: "test-site",
              providerLabel: "Test site",
              sourceType: "OPENCITY" as const,
              isLive: false,
              retrievedAt: new Date("2026-09-04T00:00:00Z"),
            },
            location: {
              locationState: "MAPPABLE" as const,
              latitude: 12.7,
              longitude: 77.7,
              coordinateQuality: "APPROXIMATE" as const,
            },
          },
        },
      };
    },
    async persistRetrievals(investigation, results) {
      return {
        kind: "persisted" as const,
        value: {
          investigationId: investigation,
          retrievals: [
            {
              id: "cretrieval",
              investigationId: investigation,
              provenance: results[0]!.provenance,
              status: results[0]!.status,
              retrievedAt: results[0]!.retrievedAt,
              limitations: results[0]!.limitations,
              items: [],
              createdAt: results[0]!.retrievedAt,
            },
          ],
          items: [],
        },
      };
    },
    async getPackage() {
      throw new Error("Not reached");
    },
  };
  const provider: HistoricalImageryProvider = {
    providerId: "test-imagery",
    async retrieve() {
      const retrievedAt = new Date("2026-09-05T01:00:00Z");
      return {
        provenance: {
          providerId: "test-imagery",
          providerLabel: "Test imagery",
          sourceClassification: "LIVE_SOURCE" as const,
          isLive: true,
          retrievedAt,
        },
        status: "AVAILABLE" as const,
        retrievedAt,
        limitations: ["No applicable imagery in controlled route test."],
        observations: [],
      };
    },
  };
  const assets: EvidenceAssetStore = {
    async put() {
      throw new Error("No asset expected");
    },
    async read() {
      return undefined;
    },
  };
  return new RetrieveHistoricalImageryForInvestigation(
    evidenceStore,
    provider,
    assets,
  );
}

test("imagery route validates requests and returns a persisted availability outcome", async () => {
  const handler = createHistoricalImageryRetrieveHandler(useCase());
  const context = { params: Promise.resolve({ id: investigationId }) };
  const malformed = await handler(
    new Request("http://test/imagery", { method: "POST" }),
    context,
  );
  assert.equal(malformed.status, 400);

  const response = await handler(
    new Request("http://test/imagery", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        start: "2022-01-01T00:00:00.000Z",
        end: "2022-02-01T00:00:00.000Z",
      }),
    }),
    context,
  );
  assert.equal(response.status, 201);
  const body = await response.json();
  assert.equal(body.investigationId, investigationId);
  assert.equal(body.retrievals[0].status, "AVAILABLE");
  assert.equal(body.retrievals[0].items.length, 0);
});
