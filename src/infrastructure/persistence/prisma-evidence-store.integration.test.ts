import assert from "node:assert/strict";
import test from "node:test";

import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "@/generated/prisma/client";
import type { ProviderEvidenceResult } from "@/domain/evidence/evidence";

import { PrismaEvidenceStore } from "./prisma-evidence-store";

const testDatabaseUrl = process.env.TEST_DATABASE_URL;
const canRun =
  testDatabaseUrl !== undefined && testDatabaseUrl.includes("civiclens_test");
const prefix = "step5-evidence-test-";

function createClient() {
  if (!canRun || testDatabaseUrl === undefined) {
    throw new Error("TEST_DATABASE_URL must reference civiclens_test.");
  }
  return new PrismaClient({
    adapter: new PrismaPg({ connectionString: testDatabaseUrl }),
  });
}

async function clean(prisma: PrismaClient, siteId: string) {
  const investigationIds = (
    await prisma.investigation.findMany({
      where: { siteId },
      select: { id: true },
    })
  ).map((value) => value.id);
  const retrievalIds = (
    await prisma.evidenceRetrieval.findMany({
      where: { investigationId: { in: investigationIds } },
      select: { id: true },
    })
  ).map((value) => value.id);
  await prisma.evidenceItem.deleteMany({
    where: { retrievalId: { in: retrievalIds } },
  });
  await prisma.evidenceRetrieval.deleteMany({
    where: { investigationId: { in: investigationIds } },
  });
  await prisma.investigation.deleteMany({ where: { siteId } });
  await prisma.site.deleteMany({ where: { id: siteId } });
}

async function investigation(prisma: PrismaClient, name: string) {
  const siteId = `${prefix}${name}`;
  await clean(prisma, siteId);
  await prisma.site.create({
    data: {
      id: siteId,
      label: "Evidence persistence test site",
      originProviderId: "test-source",
      originProviderLabel: "Test source",
      originSourceType: "OPENCITY",
      originIsLive: false,
      originRetrievedAt: new Date("2026-09-04T00:00:00.000Z"),
      locationState: "MAPPABLE",
      latitude: 12.9716,
      longitude: 77.5946,
      coordinateQuality: "APPROXIMATE",
    },
  });
  const created = await prisma.investigation.create({
    data: { siteId, status: "CREATED" },
  });
  return { siteId, investigationId: created.id };
}

function result(
  status: ProviderEvidenceResult["status"],
  retrievedAt = new Date("2026-09-05T01:00:00.000Z"),
  sourceItemKey = "source-item",
): ProviderEvidenceResult {
  return {
    provenance: {
      providerId: "test-evidence-provider",
      providerLabel: "Test evidence provider",
      sourceClassification: "IMPORTED_SNAPSHOT",
      isLive: false,
      sourceVersion: "test-v1",
      retrievedAt,
    },
    status,
    retrievedAt,
    limitations: status === "UNAVAILABLE" ? ["Source unavailable."] : [],
    items:
      status === "UNAVAILABLE"
        ? []
        : [
            {
              kind: "SITE_SOURCE_RECORD",
              sourceItemKey,
              provenance: {
                providerId: "test-evidence-provider",
                providerLabel: "Test evidence provider",
                sourceClassification: "IMPORTED_SNAPSHOT",
                isLive: false,
                externalRecordId: "external-test-record",
                retrievedAt,
              },
              completeness: status === "PARTIAL" ? "PARTIAL" : "COMPLETE",
              integrity: "VERIFIED_BY_HASH",
              limitations: [],
              metadata: { source: "controlled-test" },
              asset: {
                storageKey: "sha256/test/image_png",
                contentType: "image/png",
                byteSize: 4,
                sha256: "a".repeat(64),
              },
            },
          ],
  };
}

test(
  "evidence store persists source metadata and deterministically reads packages",
  { skip: !canRun },
  async () => {
    const prisma = createClient();
    const { siteId, investigationId } = await investigation(prisma, "package");
    try {
      const store = new PrismaEvidenceStore(prisma);
      const persisted = await store.persistRetrievals(investigationId, [
        result("AVAILABLE", new Date("2026-09-05T02:00:00.000Z"), "later"),
        result("PARTIAL", new Date("2026-09-05T01:00:00.000Z"), "earlier"),
      ]);
      assert.equal(persisted.kind, "persisted");

      const first = await store.getPackage(investigationId);
      const second = await store.getPackage(investigationId);
      assert.equal(first.kind, "found");
      assert.equal(second.kind, "found");
      if (first.kind !== "found" || second.kind !== "found") return;
      assert.deepEqual(
        first.value.retrievals.map((entry) => entry.retrievedAt.toISOString()),
        ["2026-09-05T01:00:00.000Z", "2026-09-05T02:00:00.000Z"],
      );
      assert.deepEqual(
        first.value.items.map((entry) => entry.sourceItemKey),
        second.value.items.map((entry) => entry.sourceItemKey),
      );
      assert.equal(first.value.items[0]?.asset?.sha256, "a".repeat(64));
    } finally {
      await clean(prisma, siteId);
      await prisma.$disconnect();
    }
  },
);

test(
  "evidence retrievals use their immutable IDs as the final exact-tie ordering key",
  { skip: !canRun },
  async () => {
    const prisma = createClient();
    const { siteId, investigationId } = await investigation(
      prisma,
      "tie-order",
    );
    try {
      const store = new PrismaEvidenceStore(prisma);
      const tiedTime = new Date("2026-09-05T01:00:00.000Z");
      const persisted = await store.persistRetrievals(investigationId, [
        result("AVAILABLE", tiedTime, "same-key"),
        result("AVAILABLE", tiedTime, "same-key"),
      ]);
      assert.equal(persisted.kind, "persisted");
      if (persisted.kind !== "persisted") return;

      const expected = [...persisted.value.retrievals]
        .map((entry) => entry.id)
        .sort();
      assert.deepEqual(
        persisted.value.retrievals.map((entry) => entry.id),
        expected,
      );
      assert.deepEqual(
        persisted.value.items.map((entry) => entry.retrievalId),
        expected,
      );
    } finally {
      await clean(prisma, siteId);
      await prisma.$disconnect();
    }
  },
);

test(
  "unavailable source outcome persists without fabricated EvidenceItems",
  { skip: !canRun },
  async () => {
    const prisma = createClient();
    const { siteId, investigationId } = await investigation(
      prisma,
      "unavailable",
    );
    try {
      const persisted = await new PrismaEvidenceStore(prisma).persistRetrievals(
        investigationId,
        [result("UNAVAILABLE")],
      );
      assert.equal(persisted.kind, "persisted");
      if (persisted.kind !== "persisted") return;
      assert.equal(persisted.value.retrievals[0]?.status, "UNAVAILABLE");
      assert.equal(persisted.value.items.length, 0);
    } finally {
      await clean(prisma, siteId);
      await prisma.$disconnect();
    }
  },
);

test(
  "imagery retrieval persists acquisition time separately from retrieval time and appends attempts",
  { skip: !canRun },
  async () => {
    const prisma = createClient();
    const { siteId, investigationId } = await investigation(prisma, "imagery");
    try {
      const store = new PrismaEvidenceStore(prisma);
      const retrievedAt = new Date("2026-09-05T03:00:00.000Z");
      const observedAt = new Date("2022-01-03T05:12:09.000Z");
      const imagery: ProviderEvidenceResult = {
        provenance: {
          providerId: "microsoft-planetary-computer-sentinel-2-l2a",
          providerLabel: "Microsoft Planetary Computer Sentinel-2 Level-2A",
          sourceClassification: "LIVE_SOURCE",
          isLive: true,
          sourceReference:
            "https://planetarycomputer.microsoft.com/api/stac/v1/collections/sentinel-2-l2a",
          sourceVersion: "sentinel-2-l2a",
          licenseDesignation: "proprietary",
          retrievedAt,
        },
        status: "AVAILABLE",
        retrievedAt,
        limitations: ["Controlled imagery persistence test."],
        items: [
          {
            kind: "IMAGERY",
            sourceItemKey: "sentinel-2-l2a:test-item:visual-context",
            label: "Sentinel-2 context observation",
            provenance: {
              providerId: "microsoft-planetary-computer-sentinel-2-l2a",
              providerLabel: "Microsoft Planetary Computer Sentinel-2 Level-2A",
              sourceClassification: "LIVE_SOURCE",
              isLive: true,
              externalRecordId: "test-item",
              sourceReference: "https://example.test/stac/test-item",
              sourceVersion: "test-item.SAFE",
              retrievedAt,
            },
            capturedAt: { value: observedAt, precision: "EXACT" },
            observedAt: { value: observedAt, precision: "EXACT" },
            sourceUpdatedAt: {
              value: new Date("2022-01-04T00:00:00.000Z"),
              precision: "EXACT",
            },
            completeness: "PARTIAL",
            integrity: "VERIFIED_BY_HASH",
            limitations: ["Context imagery only."],
            metadata: {
              imagery: {
                collectionId: "sentinel-2-l2a",
                productId: "test-item",
                usability: "UNASSESSED",
                qualityFlags: ["LOW_RESOLUTION"],
              },
            },
            asset: {
              storageKey: "sha256/test/image_png",
              contentType: "image/png",
              byteSize: 4,
              sha256: "b".repeat(64),
            },
          },
        ],
      };
      const first = await store.persistRetrievals(investigationId, [imagery]);
      const second = await store.persistRetrievals(investigationId, [imagery]);
      assert.equal(first.kind, "persisted");
      assert.equal(second.kind, "persisted");
      const packageResult = await store.getPackage(investigationId);
      assert.equal(packageResult.kind, "found");
      if (packageResult.kind !== "found") return;
      assert.equal(packageResult.value.retrievals.length, 2);
      assert.equal(packageResult.value.items.length, 2);
      const item = packageResult.value.items[0]!;
      assert.equal(item.kind, "IMAGERY");
      assert.equal(
        item.observedAt?.value.toISOString(),
        observedAt.toISOString(),
      );
      assert.equal(
        item.provenance.retrievedAt.toISOString(),
        retrievedAt.toISOString(),
      );
      assert.equal(item.asset?.sha256, "b".repeat(64));
    } finally {
      await clean(prisma, siteId);
      await prisma.$disconnect();
    }
  },
);

test(
  "retrieval and items roll back together on duplicate source keys",
  { skip: !canRun },
  async () => {
    const prisma = createClient();
    const { siteId, investigationId } = await investigation(prisma, "rollback");
    try {
      const duplicate = result("AVAILABLE");
      const persisted = await new PrismaEvidenceStore(prisma).persistRetrievals(
        investigationId,
        [{ ...duplicate, items: [...duplicate.items, ...duplicate.items] }],
      );
      assert.equal(persisted.kind, "failed");
      assert.equal(
        await prisma.evidenceRetrieval.count({ where: { investigationId } }),
        0,
      );
    } finally {
      await clean(prisma, siteId);
      await prisma.$disconnect();
    }
  },
);

test(
  "evidence foreign keys restrict Investigation deletion",
  { skip: !canRun },
  async () => {
    const prisma = createClient();
    const { siteId, investigationId } = await investigation(
      prisma,
      "foreign-key",
    );
    try {
      const persisted = await new PrismaEvidenceStore(prisma).persistRetrievals(
        investigationId,
        [result("AVAILABLE")],
      );
      assert.equal(persisted.kind, "persisted");
      await assert.rejects(() =>
        prisma.investigation.delete({ where: { id: investigationId } }),
      );
    } finally {
      await clean(prisma, siteId);
      await prisma.$disconnect();
    }
  },
);
