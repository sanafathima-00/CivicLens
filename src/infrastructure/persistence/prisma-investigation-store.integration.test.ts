import assert from "node:assert/strict";
import test from "node:test";

import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "@/generated/prisma/client";
import type { Site } from "@/domain/sites/site";

import { PrismaInvestigationStore } from "./prisma-investigation-store";

const testDatabaseUrl = process.env.TEST_DATABASE_URL;
const canRun =
  testDatabaseUrl !== undefined && testDatabaseUrl.includes("civiclens_test");
const testPrefix = "site-step4-persistence-test-";

function createClient() {
  if (!canRun || testDatabaseUrl === undefined) {
    throw new Error("TEST_DATABASE_URL must reference civiclens_test.");
  }

  return new PrismaClient({
    adapter: new PrismaPg({ connectionString: testDatabaseUrl }),
  });
}

function unavailableClient() {
  if (!canRun || testDatabaseUrl === undefined) {
    throw new Error("TEST_DATABASE_URL must reference civiclens_test.");
  }

  const unavailableUrl = testDatabaseUrl.replace(
    "localhost:5432",
    "localhost:65432",
  );
  if (unavailableUrl === testDatabaseUrl) {
    throw new Error(
      "Test database URL must target local PostgreSQL port 5432.",
    );
  }

  return new PrismaClient({
    adapter: new PrismaPg({ connectionString: unavailableUrl }),
  });
}

function testSite(id: string): Site {
  return {
    id,
    label: "Persistence test source-backed site",
    origin: {
      providerId: "test-opencity-source",
      providerLabel: "Test OpenCity source",
      sourceType: "OPENCITY",
      isLive: false,
      externalRecordId: id.replace("site-", "record-"),
      retrievedAt: new Date("2026-09-05T00:00:00.000Z"),
      sourceReference: "https://example.invalid/source",
      sourceVersion: "test-snapshot",
      sourceContentHash: "c".repeat(64),
      licenseDesignation: "Other (Public Domain), as labelled by OpenCity",
    },
    location: {
      locationState: "MAPPABLE",
      latitude: 12.9716,
      longitude: 77.5946,
      coordinateQuality: "APPROXIMATE",
    },
  };
}

async function removeTestData(prisma: PrismaClient) {
  const sites = await prisma.site.findMany({
    where: { id: { startsWith: testPrefix } },
    select: { id: true },
  });
  const siteIds = sites.map((site) => site.id);

  if (siteIds.length === 0) {
    return;
  }

  await prisma.investigation.deleteMany({ where: { siteId: { in: siteIds } } });
  await prisma.site.deleteMany({ where: { id: { in: siteIds } } });
}

function failingInvestigationClient(prisma: PrismaClient): PrismaClient {
  return {
    $transaction: async (callback: (transaction: unknown) => unknown) =>
      prisma.$transaction(async (transaction) => {
        const failingTransaction = new Proxy(transaction, {
          get(target, property) {
            if (property !== "investigation") {
              return Reflect.get(target, property);
            }

            return new Proxy(target.investigation, {
              get(investigation, investigationProperty) {
                if (investigationProperty === "create") {
                  return async () => {
                    throw new Error("Forced investigation write failure.");
                  };
                }
                return Reflect.get(investigation, investigationProperty);
              },
            });
          },
        });
        return callback(failingTransaction);
      }),
  } as unknown as PrismaClient;
}

test(
  "Prisma store maps a real refused connection to unavailable",
  { skip: !canRun },
  async () => {
    const prisma = unavailableClient();
    const site = testSite(`${testPrefix}unavailable`);

    try {
      const result = await new PrismaInvestigationStore(prisma).createForSite(
        site,
      );
      assert.equal(result.kind, "unavailable");
    } finally {
      await prisma.$disconnect();
    }
  },
);

test(
  "Prisma store atomically persists a Site and two Investigations while reusing Site identity",
  { skip: !canRun },
  async () => {
    const prisma = createClient();
    const site = testSite(`${testPrefix}repeat`);

    try {
      await removeTestData(prisma);
      const store = new PrismaInvestigationStore(prisma);
      const [first, second] = await Promise.all([
        store.createForSite(site),
        store.createForSite(site),
      ]);

      assert.equal(first.kind, "created");
      assert.equal(second.kind, "created");
      const persistedSites = await prisma.site.count({
        where: { id: site.id },
      });
      const investigations = await prisma.investigation.count({
        where: { siteId: site.id },
      });
      assert.equal(persistedSites, 1);
      assert.equal(investigations, 2);
      const persistedSite = await prisma.site.findUniqueOrThrow({
        where: { id: site.id },
      });
      assert.equal(persistedSite.originSourceContentHash, "c".repeat(64));
      assert.equal(
        persistedSite.originLicenseDesignation,
        "Other (Public Domain), as labelled by OpenCity",
      );
    } finally {
      await removeTestData(prisma);
      await prisma.$disconnect();
    }
  },
);

test(
  "Prisma store rolls back a new Site when Investigation creation fails",
  { skip: !canRun },
  async () => {
    const prisma = createClient();
    const site = testSite(`${testPrefix}rollback-new`);

    try {
      await removeTestData(prisma);
      const store = new PrismaInvestigationStore(
        failingInvestigationClient(prisma),
      );
      const result = await store.createForSite(site);

      assert.equal(result.kind, "failed");
      assert.equal(await prisma.site.count({ where: { id: site.id } }), 0);
    } finally {
      await removeTestData(prisma);
      await prisma.$disconnect();
    }
  },
);

test(
  "existing Site remains unchanged after a failed subsequent Investigation creation",
  { skip: !canRun },
  async () => {
    const prisma = createClient();
    const site = testSite(`${testPrefix}rollback-existing`);

    try {
      await removeTestData(prisma);
      const created = await new PrismaInvestigationStore(prisma).createForSite(
        site,
      );
      assert.equal(created.kind, "created");

      const changedCandidateProjection = {
        ...site,
        label: "Unexpected replacement label",
      };
      const failed = await new PrismaInvestigationStore(
        failingInvestigationClient(prisma),
      ).createForSite(changedCandidateProjection);
      assert.equal(failed.kind, "failed");

      const persisted = await prisma.site.findUniqueOrThrow({
        where: { id: site.id },
      });
      assert.equal(persisted.label, site.label);
      assert.equal(
        await prisma.investigation.count({ where: { siteId: site.id } }),
        1,
      );
    } finally {
      await removeTestData(prisma);
      await prisma.$disconnect();
    }
  },
);

test(
  "database foreign key prevents orphan Investigations and restricts Site deletion",
  { skip: !canRun },
  async () => {
    const prisma = createClient();
    const site = testSite(`${testPrefix}foreign-key`);

    try {
      await removeTestData(prisma);
      await assert.rejects(() =>
        prisma.investigation.create({
          data: { siteId: `${testPrefix}missing`, status: "CREATED" },
        }),
      );

      const result = await new PrismaInvestigationStore(prisma).createForSite(
        site,
      );
      assert.equal(result.kind, "created");
      await assert.rejects(() =>
        prisma.site.delete({ where: { id: site.id } }),
      );
    } finally {
      await removeTestData(prisma);
      await prisma.$disconnect();
    }
  },
);
