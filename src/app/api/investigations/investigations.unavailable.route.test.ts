import assert from "node:assert/strict";
import test from "node:test";

const testDatabaseUrl = process.env.TEST_DATABASE_URL;
const canRun =
  testDatabaseUrl !== undefined && testDatabaseUrl.includes("civiclens_test");

test(
  "POST maps a real refused Prisma connection to 503",
  { skip: !canRun },
  async () => {
    if (testDatabaseUrl === undefined) {
      return;
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

    const originalDatabaseUrl = process.env.DATABASE_URL;
    process.env.DATABASE_URL = unavailableUrl;

    try {
      const { POST } = await import("./route");
      const response = await POST(
        new Request("http://localhost/api/investigations", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ candidateId: "candidate-opencity-seiaa-9" }),
        }),
      );

      assert.equal(response.status, 503);
      assert.deepEqual(await response.json(), {
        error: "Investigation services are currently unavailable.",
      });
    } finally {
      process.env.DATABASE_URL = originalDatabaseUrl;
    }
  },
);
