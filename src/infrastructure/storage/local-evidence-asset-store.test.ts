import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { LocalEvidenceAssetStore } from "./local-evidence-asset-store";

async function withStore(
  callback: (store: LocalEvidenceAssetStore) => Promise<void>,
) {
  const directory = await mkdtemp(join(tmpdir(), "civiclens-evidence-"));
  try {
    await callback(new LocalEvidenceAssetStore(directory, 128));
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}

test("local evidence asset store writes immutable content-addressed assets", async () => {
  await withStore(async (store) => {
    const bytes = new TextEncoder().encode("controlled fixture");
    const first = await store.put({ bytes, contentType: "image/png" });
    const second = await store.put({ bytes, contentType: "image/png" });
    const loaded = await store.read(first.storageKey);

    assert.equal(first.sha256, second.sha256);
    assert.equal(first.storageKey, second.storageKey);
    assert.equal(loaded?.contentType, "image/png");
    assert.deepEqual(loaded?.bytes, bytes);
  });
});

test("local evidence asset store rejects unsafe, oversized, and mismatched content", async () => {
  await withStore(async (store) => {
    await assert.rejects(() =>
      store.put({
        bytes: new TextEncoder().encode("x"),
        contentType: "text/html",
      }),
    );
    await assert.rejects(() =>
      store.put({
        bytes: new Uint8Array(129),
        contentType: "image/png",
      }),
    );
    await assert.rejects(() =>
      store.put({
        bytes: new TextEncoder().encode("fixture"),
        contentType: "image/png",
        expectedSha256: "a".repeat(64),
      }),
    );
    assert.equal(await store.read("../outside"), undefined);
  });
});
