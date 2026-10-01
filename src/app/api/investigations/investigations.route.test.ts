import assert from "node:assert/strict";
import test from "node:test";

import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "@/generated/prisma/client";

const testDatabaseUrl = process.env.TEST_DATABASE_URL;
const canRun =
  testDatabaseUrl !== undefined && testDatabaseUrl.includes("civiclens_test");

function testClient() {
  if (!canRun || testDatabaseUrl === undefined) {
    throw new Error("TEST_DATABASE_URL must reference civiclens_test.");
  }

  return new PrismaClient({
    adapter: new PrismaPg({ connectionString: testDatabaseUrl }),
  });
}

async function cleanSite(prisma: PrismaClient, siteId: string) {
  const investigationIds = (
    await prisma.investigation.findMany({
      where: { siteId },
      select: { id: true },
    })
  ).map((investigation) => investigation.id);
  const retrievalIds = (
    await prisma.evidenceRetrieval.findMany({
      where: { investigationId: { in: investigationIds } },
      select: { id: true },
    })
  ).map((retrieval) => retrieval.id);
  await prisma.evidenceItem.deleteMany({
    where: { retrievalId: { in: retrievalIds } },
  });
  await prisma.evidenceRetrieval.deleteMany({
    where: { investigationId: { in: investigationIds } },
  });
  await prisma.investigation.deleteMany({ where: { siteId } });
  await prisma.site.deleteMany({ where: { id: siteId } });
}

test(
  "candidate and investigation routes return safe expected responses",
  { skip: !canRun },
  async () => {
    if (testDatabaseUrl === undefined) {
      return;
    }

    process.env.DATABASE_URL = testDatabaseUrl;
    const candidateRoute = await import("@/app/api/candidates/route");
    const investigationRoute = await import("@/app/api/investigations/route");
    const investigationByIdRoute =
      await import("@/app/api/investigations/[id]/route");
    const prisma = testClient();

    try {
      const candidatesResponse = await candidateRoute.GET();
      assert.equal(candidatesResponse.status, 200);
      const candidatesPayload = (await candidatesResponse.json()) as {
        candidates: Array<{ candidateId: string; site: { id: string } }>;
      };
      assert.equal(candidatesPayload.candidates.length, 592);
      const candidate = candidatesPayload.candidates[0];
      assert.ok(candidate);
      await cleanSite(prisma, candidate.site.id);

      const malformed = await investigationRoute.POST(
        new Request("http://localhost/api/investigations", {
          method: "POST",
          body: "not-json",
        }),
      );
      assert.equal(malformed.status, 400);

      const missing = await investigationRoute.POST(
        new Request("http://localhost/api/investigations", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            candidateId: "candidate-opencity-seiaa-missing",
          }),
        }),
      );
      assert.equal(missing.status, 404);

      const quarantined = await investigationRoute.POST(
        new Request("http://localhost/api/investigations", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ candidateId: "candidate-opencity-seiaa-639" }),
        }),
      );
      assert.equal(quarantined.status, 422);

      const created = await investigationRoute.POST(
        new Request("http://localhost/api/investigations", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ candidateId: candidate.candidateId }),
        }),
      );
      assert.equal(created.status, 201);
      const createdPayload = (await created.json()) as {
        investigation: { id: string; status: string };
        site: { id: string };
      };
      assert.equal(createdPayload.investigation.status, "CREATED");
      assert.equal(createdPayload.site.id, candidate.site.id);

      const found = await investigationByIdRoute.GET(
        new Request(
          `http://localhost/api/investigations/${createdPayload.investigation.id}`,
        ),
        { params: Promise.resolve({ id: createdPayload.investigation.id }) },
      );
      assert.equal(found.status, 200);

      const unknown = await investigationByIdRoute.GET(
        new Request("http://localhost/api/investigations/not-a-cuid"),
        { params: Promise.resolve({ id: "not-a-cuid" }) },
      );
      assert.equal(unknown.status, 400);

      const missingId = `c${"a".repeat(24)}`;
      const missingInvestigation = await investigationByIdRoute.GET(
        new Request(`http://localhost/api/investigations/${missingId}`),
        { params: Promise.resolve({ id: missingId }) },
      );
      assert.equal(missingInvestigation.status, 404);
    } finally {
      const candidatesResponse = await candidateRoute.GET();
      const candidatesPayload = (await candidatesResponse.json()) as {
        candidates: Array<{ site: { id: string } }>;
      };
      const firstSiteId = candidatesPayload.candidates[0]?.site.id;
      if (firstSiteId !== undefined) {
        await cleanSite(prisma, firstSiteId);
      }
      await prisma.$disconnect();
    }
  },
);
