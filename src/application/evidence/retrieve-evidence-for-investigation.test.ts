import assert from "node:assert/strict";
import test from "node:test";

import type { EvidenceStore } from "@/domain/evidence/evidence-store";
import type { ProviderEvidenceResult } from "@/domain/evidence/evidence";
import type { SiteEvidenceProvider } from "@/domain/evidence/site-evidence-provider";
import type { InvestigationWithSite } from "@/domain/investigations/investigation-store";

import { RetrieveEvidenceForInvestigation } from "./retrieve-evidence-for-investigation";

const context: InvestigationWithSite = {
  investigation: {
    id: "caaaaaaaaaaaaaaaaaaaaaaaa",
    siteId: "site-test",
    status: "CREATED",
    createdAt: new Date("2026-09-05T00:00:00.000Z"),
    updatedAt: new Date("2026-09-05T00:00:00.000Z"),
  },
  site: {
    id: "site-test",
    origin: {
      providerId: "test-source",
      providerLabel: "Test source",
      sourceType: "OPENCITY",
      isLive: false,
      retrievedAt: new Date("2026-09-04T00:00:00.000Z"),
    },
    location: { locationState: "MAPPABLE" },
  },
};

function providerResult(
  status: ProviderEvidenceResult["status"],
): ProviderEvidenceResult {
  const retrievedAt = new Date("2026-09-05T01:00:00.000Z");
  return {
    provenance: {
      providerId: "test-evidence-provider",
      providerLabel: "Test evidence provider",
      sourceClassification: "IMPORTED_SNAPSHOT",
      isLive: false,
      retrievedAt,
    },
    status,
    retrievedAt,
    limitations: status === "UNAVAILABLE" ? ["Source is unavailable."] : [],
    items:
      status === "UNAVAILABLE" || status === "UNRESOLVED"
        ? []
        : [
            {
              kind: "SITE_SOURCE_RECORD",
              sourceItemKey: "test-source-record",
              provenance: {
                providerId: "test-evidence-provider",
                providerLabel: "Test evidence provider",
                sourceClassification: "IMPORTED_SNAPSHOT",
                isLive: false,
                retrievedAt,
              },
              completeness: "COMPLETE",
              integrity: "NOT_VERIFIED",
              limitations: [],
              metadata: {},
            },
          ],
  };
}

function store(): EvidenceStore & {
  readonly calls: ProviderEvidenceResult[][];
} {
  const calls: ProviderEvidenceResult[][] = [];
  return {
    calls,
    async getInvestigationWithSite() {
      return { kind: "found", value: context };
    },
    async persistRetrievals(_investigationId, results) {
      calls.push([...results]);
      return {
        kind: "persisted",
        value: {
          investigationId: context.investigation.id,
          retrievals: [],
          items: [],
        },
      };
    },
    async getPackage() {
      return {
        kind: "found",
        value: {
          investigationId: context.investigation.id,
          retrievals: [],
          items: [],
        },
      };
    },
  };
}

function provider(result: ProviderEvidenceResult): SiteEvidenceProvider {
  return {
    providerId: result.provenance.providerId,
    async retrieve() {
      return result;
    },
  };
}

test("retrieval persists available, partial, unavailable, and unresolved provider states", async () => {
  for (const status of [
    "AVAILABLE",
    "PARTIAL",
    "UNAVAILABLE",
    "UNRESOLVED",
  ] as const) {
    const evidenceStore = store();
    const result = await new RetrieveEvidenceForInvestigation(evidenceStore, [
      provider(providerResult(status)),
    ]).execute(context.investigation.id);

    assert.equal(result.kind, "persisted");
    assert.equal(evidenceStore.calls[0]?.[0]?.status, status);
    assert.equal(
      evidenceStore.calls[0]?.[0]?.items.length,
      status === "UNAVAILABLE" || status === "UNRESOLVED" ? 0 : 1,
    );
  }
});

test("retrieval rejects malformed provider output before persistence", async () => {
  const evidenceStore = store();
  const malformed = provider(providerResult("AVAILABLE"));
  malformed.retrieve = async () => ({
    ...providerResult("AVAILABLE"),
    items: [
      {
        ...providerResult("AVAILABLE").items[0]!,
        sourceItemKey: "",
      },
    ],
  });

  const result = await new RetrieveEvidenceForInvestigation(evidenceStore, [
    malformed,
  ]).execute(context.investigation.id);
  assert.equal(result.kind, "failed");
  assert.equal(evidenceStore.calls.length, 0);
});

test("unexpected provider exceptions remain failures without a fabricated unresolved retrieval", async () => {
  const evidenceStore = store();
  const brokenProvider: SiteEvidenceProvider = {
    providerId: "broken-provider",
    async retrieve() {
      throw new Error("Unexpected provider defect.");
    },
  };

  const result = await new RetrieveEvidenceForInvestigation(evidenceStore, [
    brokenProvider,
  ]).execute(context.investigation.id);

  assert.equal(result.kind, "failed");
  assert.equal(evidenceStore.calls.length, 0);
});

test("retrieval rejects malformed investigation identifiers", async () => {
  const result = await new RetrieveEvidenceForInvestigation(
    store(),
    [],
  ).execute("not-a-cuid");
  assert.equal(result.kind, "invalid");
});
