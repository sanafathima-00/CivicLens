/* eslint-disable @typescript-eslint/no-explicit-any */
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";

import { GetInvestigationEvidenceAsset } from "./get-investigation-evidence-asset";

const investigationId = "ck1234567890123456789012345";
const evidenceId = "ck1234567890123456789012346";
const bytes = Uint8Array.from([137, 80, 78, 71]);
const sha256 = createHash("sha256").update(bytes).digest("hex");

function store(items: readonly unknown[]) {
  return {
    async getPackage() {
      return {
        kind: "found" as const,
        value: { investigationId, retrievals: [], items },
      };
    },
  };
}

test("returns only a verified asset owned by the requested investigation evidence package", async () => {
  const result = await new GetInvestigationEvidenceAsset(
    store([
      {
        id: evidenceId,
        asset: {
          storageKey: "sha256/test",
          contentType: "image/png",
          sha256,
        },
      },
    ]) as any,
    {
      async put() {
        throw new Error("Not used");
      },
      async read() {
        return { bytes, contentType: "image/png", sha256 };
      },
    },
  ).execute(investigationId, evidenceId);

  assert.equal(result.kind, "found");
  if (result.kind === "found") assert.equal(result.bytes, bytes);
});

test("does not expose an asset outside the requested investigation evidence package", async () => {
  const result = await new GetInvestigationEvidenceAsset(store([]) as any, {
    async put() {
      throw new Error("Not used");
    },
    async read() {
      throw new Error("must not read");
    },
  }).execute(investigationId, evidenceId);

  assert.equal(result.kind, "not_found");
});
