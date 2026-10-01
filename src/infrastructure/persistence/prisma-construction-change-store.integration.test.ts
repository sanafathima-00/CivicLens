import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";

import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "@/generated/prisma/client";
import type { ConstructionChangeAnalysis } from "@/domain/construction-change/construction-change-analysis";
import type { VisionAnalysis } from "@/domain/construction-change/vision-analysis";

import { PrismaConstructionChangeStore } from "./prisma-construction-change-store";
import { PrismaVisionAnalysisStore } from "./prisma-vision-analysis-store";

const testDatabaseUrl = process.env.TEST_DATABASE_URL;
const canRun = testDatabaseUrl?.includes("civiclens_test") ?? false;
const prefix = "step6b-change-analysis-test-";
const testPng = Uint8Array.from([
  137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 13, 73, 72, 68, 82, 0, 0, 2, 0, 0,
  0, 2, 0,
]);
const pngHash = createHash("sha256").update(testPng).digest("hex");

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
  const constructionChangeAnalysisIds = (
    await prisma.constructionChangeAnalysis.findMany({
      where: { investigationId: { in: investigationIds } },
      select: { id: true },
    })
  ).map((value) => value.id);
  await prisma.visionAnalysis.deleteMany({
    where: {
      constructionChangeAnalysisId: { in: constructionChangeAnalysisIds },
    },
  });
  await prisma.constructionChangeAnalysis.deleteMany({
    where: { investigationId: { in: investigationIds } },
  });
  await prisma.evidenceItem.deleteMany({
    where: { retrievalId: { in: retrievalIds } },
  });
  await prisma.evidenceRetrieval.deleteMany({
    where: { investigationId: { in: investigationIds } },
  });
  await prisma.investigation.deleteMany({ where: { siteId } });
  await prisma.site.deleteMany({ where: { id: siteId } });
}

function vision(
  constructionChangeAnalysisId: string,
  beforeEvidenceItemId: string,
  afterEvidenceItemId: string,
  observedIndicator: string,
  limitations: readonly string[] = ["Prepared test imagery."],
): Omit<VisionAnalysis, "id" | "createdAt"> {
  return {
    constructionChangeAnalysisId,
    beforeEvidenceItemId,
    afterEvidenceItemId,
    metadata: {
      providerId: "mock-vision",
      providerLabel: "Mock vision",
      model: "mock-v1",
      promptVersion: "test-v1",
      schemaVersion: "test-v1",
    },
    inputFingerprint: "a".repeat(64),
    interpretation: {
      outcome: "VISIBLE_CONTEXT_CHANGE_UNCLASSIFIED",
      epistemicState: "OBSERVED",
      observedIndicators: [observedIndicator],
      limitations,
      supportingEvidenceItemIds: [beforeEvidenceItemId, afterEvidenceItemId],
    },
  };
}

async function setup(prisma: PrismaClient, suffix: string) {
  const siteId = `${prefix}${suffix}`;
  await clean(prisma, siteId);
  await prisma.site.create({
    data: {
      id: siteId,
      label: "Prepared comparison persistence test site",
      originProviderId: "prepared-test",
      originProviderLabel: "Prepared test source",
      originSourceType: "OPENCITY",
      originIsLive: false,
      originRetrievedAt: new Date("2026-09-05T00:00:00.000Z"),
      locationState: "MAPPABLE",
      latitude: 12.9716,
      longitude: 77.5946,
      coordinateQuality: "APPROXIMATE",
    },
  });
  const investigation = await prisma.investigation.create({
    data: { siteId, status: "CREATED" },
  });
  const retrieval = await prisma.evidenceRetrieval.create({
    data: {
      investigationId: investigation.id,
      providerId: "prepared-imagery",
      providerLabel: "Prepared imagery",
      sourceClassification: "PREPARED",
      isLive: false,
      status: "AVAILABLE",
      retrievedAt: new Date("2026-09-05T00:00:00.000Z"),
      limitations: [],
    },
  });
  const aoi = {
    policyId: "sentinel-2-context-square-320m-v1",
    purpose: "IMAGERY_CONTEXT_RETRIEVAL",
    sourcePointIsApproximate: true,
    geometry: {
      type: "Polygon",
      coordinates: [
        [
          [77.5, 12.9],
          [77.6, 12.9],
          [77.6, 13],
          [77.5, 12.9],
        ],
      ],
    },
  };
  const metadata = {
    imagery: {
      collectionId: "prepared-sentinel-2-l2a",
      groundSampleDistanceMeters: 10,
      crs: "EPSG:32643",
      usability: "USABLE",
      qualityFlags: [],
      aoi,
    },
  };
  const common = {
    retrievalId: retrieval.id,
    kind: "IMAGERY" as const,
    completeness: "COMPLETE" as const,
    integrity: "VERIFIED_BY_HASH" as const,
    limitations: [],
    metadata,
    assetStorageKey: `sha256/${pngHash}`,
    assetContentType: "image/png",
    assetByteSize: testPng.byteLength,
    assetSha256: pngHash,
  };
  const before = await prisma.evidenceItem.create({
    data: {
      ...common,
      sourceItemKey: "prepared-before",
      observedAt: new Date("2022-01-01T00:00:00.000Z"),
      observedAtPrecision: "EXACT",
    },
  });
  const after = await prisma.evidenceItem.create({
    data: {
      ...common,
      sourceItemKey: "prepared-after",
      observedAt: new Date("2023-01-01T00:00:00.000Z"),
      observedAtPrecision: "EXACT",
    },
  });
  return {
    siteId,
    investigationId: investigation.id,
    beforeId: before.id,
    afterId: after.id,
  };
}

function analysis(
  investigationId: string,
  beforeEvidenceItemId: string,
  afterEvidenceItemId: string,
  limitations: readonly string[] = [
    "No visual interpretation is performed in this test.",
  ],
): Omit<ConstructionChangeAnalysis, "id" | "createdAt"> {
  const aoiIdentity = {
    policyId: "sentinel-2-context-square-320m-v1",
    geometryHash: "a".repeat(64),
    purpose: "IMAGERY_CONTEXT_RETRIEVAL" as const,
    sourcePointIsApproximate: true,
  };
  return {
    investigationId,
    beforeEvidenceItemId,
    afterEvidenceItemId,
    aoiIdentity,
    comparisonPolicyId: "sentinel2-context-comparison-v1",
    deterministicFacts: {
      beforeEvidenceItemId,
      afterEvidenceItemId,
      beforeObservedAt: "2022-01-01T00:00:00.000Z",
      afterObservedAt: "2023-01-01T00:00:00.000Z",
      temporalGapDays: 365,
      seasonalDifferenceDays: 0,
      aoiIdentity,
      sameAoi: true,
      sameAoiPolicy: true,
      sameProvider: true,
      sameCollection: true,
      compatibleNativeGsd: true,
      sameCrs: true,
      renderedDimensionsComparable: true,
      assetsIntegrityVerified: true,
      beforeUsability: "USABLE",
      afterUsability: "USABLE",
      beforeQualityFlags: [],
      afterQualityFlags: [],
      selectionRationale: ["Controlled persistence test."],
    },
    comparability: "COMPARABLE",
    evidenceSufficiency: "SUFFICIENT_FOR_CONSERVATIVE_VISUAL_STATEMENT",
    outcome: "INSUFFICIENT_EVIDENCE",
    epistemicState: "UNRESOLVED",
    observedIndicators: [],
    limitations,
  };
}

test(
  "construction-change analyses persist immutably with restrictive imagery foreign keys",
  { skip: !canRun },
  async () => {
    const prisma = createClient();
    const fixture = await setup(prisma, "persistence");
    try {
      const store = new PrismaConstructionChangeStore(prisma);
      const first = await store.persist(
        analysis(fixture.investigationId, fixture.beforeId, fixture.afterId),
      );
      const second = await store.persist(
        analysis(fixture.investigationId, fixture.beforeId, fixture.afterId),
      );
      assert.equal(first.kind, "persisted");
      assert.equal(second.kind, "persisted");
      const listed = await store.list(fixture.investigationId);
      assert.equal(listed.kind, "found");
      if (listed.kind !== "found") return;
      assert.equal(listed.value.length, 2);
      assert.equal(listed.value[0]?.beforeEvidenceItemId, fixture.beforeId);
      assert.equal(listed.value[0]?.outcome, "INSUFFICIENT_EVIDENCE");
      await assert.rejects(() =>
        prisma.evidenceItem.delete({ where: { id: fixture.beforeId } }),
      );
    } finally {
      await clean(prisma, fixture.siteId);
      await prisma.$disconnect();
    }
  },
);

test(
  "construction-change persistence maps a real refused database connection to unavailable",
  { skip: !canRun },
  async () => {
    const prisma = unavailableClient();
    try {
      const result = await new PrismaConstructionChangeStore(prisma).list(
        "caaaaaaaaaaaaaaaaaaaaaaaa",
      );
      assert.equal(result.kind, "unavailable");
    } finally {
      await prisma.$disconnect();
    }
  },
);

test(
  "construction-change persistence rejects either cross-investigation evidence direction without writing an analysis",
  { skip: !canRun },
  async () => {
    const prisma = createClient();
    const fixtureA = await setup(prisma, "cross-investigation-a");
    const fixtureB = await setup(prisma, "cross-investigation-b");
    try {
      const store = new PrismaConstructionChangeStore(prisma);
      const afterFromB = await store.persist(
        analysis(fixtureA.investigationId, fixtureA.beforeId, fixtureB.afterId),
      );
      const beforeFromB = await store.persist(
        analysis(fixtureA.investigationId, fixtureB.beforeId, fixtureA.afterId),
      );
      assert.equal(afterFromB.kind, "unprocessable");
      assert.equal(beforeFromB.kind, "unprocessable");
      assert.equal(
        await prisma.constructionChangeAnalysis.count({
          where: { investigationId: fixtureA.investigationId },
        }),
        0,
      );
      assert.equal(
        await prisma.constructionChangeAnalysis.count({
          where: { investigationId: fixtureB.investigationId },
        }),
        0,
      );
    } finally {
      await clean(prisma, fixtureA.siteId);
      await clean(prisma, fixtureB.siteId);
      await prisma.$disconnect();
    }
  },
);

test(
  "construction-change persistence rejects missing before or after evidence without writing an analysis",
  { skip: !canRun },
  async () => {
    const prisma = createClient();
    const fixture = await setup(prisma, "missing-evidence");
    try {
      const store = new PrismaConstructionChangeStore(prisma);
      const missingBefore = await store.persist(
        analysis(
          fixture.investigationId,
          "cmissingbeforeevidence00000",
          fixture.afterId,
        ),
      );
      const missingAfter = await store.persist(
        analysis(
          fixture.investigationId,
          fixture.beforeId,
          "cmissingafterevidence000000",
        ),
      );
      assert.equal(missingBefore.kind, "unprocessable");
      assert.equal(missingAfter.kind, "unprocessable");
      assert.equal(
        await prisma.constructionChangeAnalysis.count({
          where: { investigationId: fixture.investigationId },
        }),
        0,
      );
    } finally {
      await clean(prisma, fixture.siteId);
      await prisma.$disconnect();
    }
  },
);

test(
  "unsafe visual interpretation is rejected before PostgreSQL persistence",
  { skip: !canRun },
  async () => {
    const prisma = createClient();
    const fixture = await setup(prisma, "unsafe-vision-output");
    try {
      const construction = await new PrismaConstructionChangeStore(
        prisma,
      ).persist(
        analysis(fixture.investigationId, fixture.beforeId, fixture.afterId),
      );
      assert.equal(construction.kind, "persisted");
      if (construction.kind !== "persisted") return;
      const store = new PrismaVisionAnalysisStore(prisma);
      for (const unsafeIndicator of [
        "An unlawful development is visible.",
        "The imagery was collected by satellite X.",
        "Satellite X collected this imagery.",
        "The imagery was collected by Sentinel-2.",
        "Satellite X captures the later image.",
        "The government should enforce this.",
      ]) {
        const result = await store.persist(
          vision(
            construction.value.id,
            fixture.beforeId,
            fixture.afterId,
            unsafeIndicator,
          ),
        );
        assert.equal(result.kind, "unprocessable");
      }
      assert.equal(
        await prisma.visionAnalysis.count({
          where: { constructionChangeAnalysisId: construction.value.id },
        }),
        0,
      );
    } finally {
      await clean(prisma, fixture.siteId);
      await prisma.$disconnect();
    }
  },
);

test(
  "vision persistence preserves trusted parent limitations in the final immutable row",
  { skip: !canRun },
  async () => {
    const prisma = createClient();
    const fixture = await setup(prisma, "vision-limitations");
    const deterministic = [
      "Sentinel-2 imagery has approximately 10m native ground sampling distance.",
      "The AOI is contextual and is not a construction footprint.",
    ];
    try {
      const construction = await new PrismaConstructionChangeStore(
        prisma,
      ).persist(
        analysis(
          fixture.investigationId,
          fixture.beforeId,
          fixture.afterId,
          deterministic,
        ),
      );
      assert.equal(construction.kind, "persisted");
      if (construction.kind !== "persisted") return;
      const finalLimitations = [
        ...deterministic,
        "Vegetation partially obscures the apparent surface.",
      ];
      const result = await new PrismaVisionAnalysisStore(prisma).persist(
        vision(
          construction.value.id,
          fixture.beforeId,
          fixture.afterId,
          "A visible context pattern was reviewed.",
          finalLimitations,
        ),
      );
      assert.equal(result.kind, "persisted");
      const persisted = await prisma.visionAnalysis.findFirstOrThrow({
        where: { constructionChangeAnalysisId: construction.value.id },
      });
      assert.deepEqual(persisted.limitations, finalLimitations);
    } finally {
      await clean(prisma, fixture.siteId);
      await prisma.$disconnect();
    }
  },
);
