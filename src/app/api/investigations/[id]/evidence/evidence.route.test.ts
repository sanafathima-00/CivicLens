import assert from "node:assert/strict";
import test from "node:test";

import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "@/generated/prisma/client";
import { GetInvestigationEvidence } from "@/application/evidence/get-investigation-evidence";
import { RetrieveEvidenceForInvestigation } from "@/application/evidence/retrieve-evidence-for-investigation";
import type { ProviderEvidenceResult } from "@/domain/evidence/evidence";
import type { SiteEvidenceProvider } from "@/domain/evidence/site-evidence-provider";
import { PrismaEvidenceStore } from "@/infrastructure/persistence/prisma-evidence-store";

import {
  createEvidenceGetHandler,
  createEvidenceRetrieveHandler,
} from "./evidence-route-handlers";

const testDatabaseUrl = process.env.TEST_DATABASE_URL;
const canRun =
  testDatabaseUrl !== undefined && testDatabaseUrl.includes("civiclens_test");
const prefix = "step5-evidence-route-test-";

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

function controlledProvider(
  status: ProviderEvidenceResult["status"],
  sourceItemKey: string,
): SiteEvidenceProvider {
  return {
    providerId: "controlled-evidence-provider",
    async retrieve() {
      const retrievedAt = new Date("2026-09-05T03:00:00.000Z");
      const noItems =
        status === "AVAILABLE" ||
        status === "UNAVAILABLE" ||
        status === "UNRESOLVED";
      return {
        provenance: {
          providerId: "controlled-evidence-provider",
          providerLabel: "Controlled evidence provider",
          sourceClassification: "SEEDED_TEST",
          isLive: false,
          retrievedAt,
        },
        status,
        retrievedAt,
        limitations:
          status === "UNAVAILABLE" ? ["Controlled source unavailable."] : [],
        items: noItems
          ? []
          : [
              {
                kind: "SITE_SOURCE_RECORD",
                sourceItemKey,
                provenance: {
                  providerId: "controlled-evidence-provider",
                  providerLabel: "Controlled evidence provider",
                  sourceClassification: "SEEDED_TEST",
                  isLive: false,
                  retrievedAt,
                },
                completeness: "PARTIAL",
                integrity: "NOT_VERIFIED",
                limitations: ["Controlled partial result."],
                metadata: { controlled: true },
              },
            ],
      };
    },
  };
}

test(
  "evidence routes retrieve and read a deterministic source-backed package",
  { skip: !canRun },
  async () => {
    if (testDatabaseUrl === undefined) return;
    process.env.DATABASE_URL = testDatabaseUrl;
    const retrieveRoute = await import("./retrieve/route");
    const evidenceRoute = await import("./route");
    const prisma = createClient();
    const siteId = `${prefix}site`;
    try {
      await clean(prisma, siteId);
      const site = await prisma.site.create({
        data: {
          id: siteId,
          label: "Evidence route source label",
          originProviderId: "opencity-seiaa-bengaluru-urban",
          originProviderLabel: "OpenCity / KSRSAC SEIAA Bengaluru Urban Maps",
          originSourceType: "OPENCITY",
          originIsLive: false,
          originExternalRecordId: "KGIS-route-test",
          originRetrievedAt: new Date("2026-09-04T00:00:00.000Z"),
          originSourceReference: "https://example.invalid/source.kml",
          originSourceVersion: "snapshot-v1",
          originSourceContentHash:
            "d6dc37210a24cdfdae156c5d9481da8801470c928453b706fd0420287ba6d54c",
          originLicenseDesignation:
            "Other (Public Domain), as labelled by OpenCity",
          locationState: "MAPPABLE",
          latitude: 12.9716,
          longitude: 77.5946,
          coordinateQuality: "APPROXIMATE",
        },
      });
      const investigation = await prisma.investigation.create({
        data: { siteId: site.id, status: "CREATED" },
      });

      const malformed = await evidenceRoute.GET(
        new Request("http://localhost/api/investigations/not-a-cuid/evidence"),
        { params: Promise.resolve({ id: "not-a-cuid" }) },
      );
      assert.equal(malformed.status, 400);

      const unknown = await evidenceRoute.GET(
        new Request(
          `http://localhost/api/investigations/c${"a".repeat(24)}/evidence`,
        ),
        { params: Promise.resolve({ id: `c${"a".repeat(24)}` }) },
      );
      assert.equal(unknown.status, 404);

      const empty = await evidenceRoute.GET(
        new Request(
          `http://localhost/api/investigations/${investigation.id}/evidence`,
        ),
        { params: Promise.resolve({ id: investigation.id }) },
      );
      assert.equal(empty.status, 200);
      assert.equal(
        ((await empty.json()) as { retrievals: unknown[] }).retrievals.length,
        0,
      );

      const created = await retrieveRoute.POST(
        new Request(
          `http://localhost/api/investigations/${investigation.id}/evidence/retrieve`,
          { method: "POST" },
        ),
        { params: Promise.resolve({ id: investigation.id }) },
      );
      assert.equal(created.status, 201);
      const createdPayload = (await created.json()) as {
        retrievals: Array<{
          status: string;
          provenance: {
            isLive: boolean;
            sourceContentHash?: string;
            licenseDesignation?: string;
          };
        }>;
        items: Array<{
          kind: string;
          metadata: { coordinateQuality?: string };
        }>;
      };
      assert.equal(createdPayload.retrievals.length, 1);
      assert.equal(createdPayload.retrievals[0]?.status, "AVAILABLE");
      assert.equal(createdPayload.retrievals[0]?.provenance.isLive, false);
      assert.equal(
        createdPayload.retrievals[0]?.provenance.sourceContentHash,
        "d6dc37210a24cdfdae156c5d9481da8801470c928453b706fd0420287ba6d54c",
      );
      assert.equal(
        createdPayload.retrievals[0]?.provenance.licenseDesignation,
        "Other (Public Domain), as labelled by OpenCity",
      );
      assert.equal(createdPayload.items[0]?.kind, "SITE_SOURCE_RECORD");
      assert.equal(
        createdPayload.items[0]?.metadata.coordinateQuality,
        "APPROXIMATE",
      );

      const read = await evidenceRoute.GET(
        new Request(
          `http://localhost/api/investigations/${investigation.id}/evidence`,
        ),
        { params: Promise.resolve({ id: investigation.id }) },
      );
      assert.equal(read.status, 200);
      const readPayload = (await read.json()) as { retrievals: unknown[] };
      assert.equal(readPayload.retrievals.length, 1);
    } finally {
      await clean(prisma, siteId);
      await prisma.$disconnect();
    }
  },
);

test(
  "isolated route composition persists available-zero, partial, unavailable, and unresolved provider outcomes",
  { skip: !canRun },
  async () => {
    const prisma = createClient();
    const siteId = `${prefix}controlled-provider`;
    try {
      await clean(prisma, siteId);
      await prisma.site.create({
        data: {
          id: siteId,
          originProviderId: "test-source",
          originProviderLabel: "Test source",
          originSourceType: "OTHER",
          originIsLive: false,
          originRetrievedAt: new Date("2026-09-04T00:00:00.000Z"),
          locationState: "MAPPABLE",
          latitude: 12.9716,
          longitude: 77.5946,
          coordinateQuality: "APPROXIMATE",
        },
      });

      for (const scenario of [
        { status: "AVAILABLE", expectedItems: 0 },
        { status: "PARTIAL", expectedItems: 1 },
        { status: "UNAVAILABLE", expectedItems: 0 },
        { status: "UNRESOLVED", expectedItems: 0 },
      ] as const) {
        const investigation = await prisma.investigation.create({
          data: { siteId, status: "CREATED" },
        });
        const store = new PrismaEvidenceStore(prisma);
        const retrieve = new RetrieveEvidenceForInvestigation(store, [
          controlledProvider(scenario.status, `controlled-${scenario.status}`),
        ]);
        const get = new GetInvestigationEvidence(store);
        const response = await createEvidenceRetrieveHandler(retrieve)(
          new Request(
            `http://localhost/api/investigations/${investigation.id}/evidence/retrieve`,
            { method: "POST" },
          ),
          { params: Promise.resolve({ id: investigation.id }) },
        );

        assert.equal(response.status, 201);
        const payload = (await response.json()) as {
          retrievals: Array<{ status: string }>;
          items: unknown[];
        };
        assert.equal(payload.retrievals[0]?.status, scenario.status);
        assert.equal(payload.items.length, scenario.expectedItems);

        const read = await createEvidenceGetHandler(get)(
          new Request(
            `http://localhost/api/investigations/${investigation.id}/evidence`,
          ),
          { params: Promise.resolve({ id: investigation.id }) },
        );
        assert.equal(read.status, 200);
      }

      const failedInvestigation = await prisma.investigation.create({
        data: { siteId, status: "CREATED" },
      });
      const failedProvider: SiteEvidenceProvider = {
        providerId: "broken-test-provider",
        async retrieve() {
          throw new Error("Unexpected controlled provider failure.");
        },
      };
      const failedResponse = await createEvidenceRetrieveHandler(
        new RetrieveEvidenceForInvestigation(new PrismaEvidenceStore(prisma), [
          failedProvider,
        ]),
      )(
        new Request(
          `http://localhost/api/investigations/${failedInvestigation.id}/evidence/retrieve`,
          { method: "POST" },
        ),
        { params: Promise.resolve({ id: failedInvestigation.id }) },
      );
      assert.equal(failedResponse.status, 500);
      assert.equal(
        await prisma.evidenceRetrieval.count({
          where: { investigationId: failedInvestigation.id },
        }),
        0,
      );
    } finally {
      await clean(prisma, siteId);
      await prisma.$disconnect();
    }
  },
);
