import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

import type { EvidenceAssetStore } from "@/domain/evidence/evidence-asset-store";
import type { EvidenceAssetReference } from "@/domain/evidence/evidence";

const SAFE_CONTENT_TYPES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/tiff",
  "image/webp",
]);

const SHA256_PATTERN = /^[a-f0-9]{64}$/;

function contentTypeKey(contentType: string): string {
  return contentType.replace("/", "_");
}

function contentTypeFromKey(key: string): string | undefined {
  const match = [...SAFE_CONTENT_TYPES].find(
    (contentType) => contentTypeKey(contentType) === key,
  );
  return match;
}

export class LocalEvidenceAssetStore implements EvidenceAssetStore {
  constructor(
    private readonly rootDirectory: string,
    private readonly maximumByteSize = 10 * 1024 * 1024,
  ) {}

  async put(input: {
    readonly bytes: Uint8Array;
    readonly contentType: string;
    readonly expectedSha256?: string;
  }): Promise<EvidenceAssetReference> {
    if (!SAFE_CONTENT_TYPES.has(input.contentType)) {
      throw new Error("Evidence asset content type is not allowed.");
    }

    if (
      input.bytes.byteLength === 0 ||
      input.bytes.byteLength > this.maximumByteSize
    ) {
      throw new Error("Evidence asset size is outside the allowed range.");
    }

    const sha256 = createHash("sha256").update(input.bytes).digest("hex");

    if (
      input.expectedSha256 !== undefined &&
      (!SHA256_PATTERN.test(input.expectedSha256) ||
        input.expectedSha256 !== sha256)
    ) {
      throw new Error("Evidence asset integrity hash does not match.");
    }

    const directory = join(this.rootDirectory, "sha256");
    const typeKey = contentTypeKey(input.contentType);
    const storageKey = `sha256/${sha256}/${typeKey}`;
    const filePath = join(directory, `${sha256}.${typeKey}`);
    await mkdir(directory, { recursive: true });

    try {
      await writeFile(filePath, input.bytes, { flag: "wx" });
    } catch (error) {
      if (
        !(error instanceof Error) ||
        !("code" in error) ||
        error.code !== "EEXIST"
      ) {
        throw error;
      }

      const existing = await readFile(filePath);
      const existingHash = createHash("sha256").update(existing).digest("hex");
      if (existingHash !== sha256) {
        throw new Error("Immutable evidence asset storage hash conflict.");
      }
    }

    return {
      storageKey,
      contentType: input.contentType,
      byteSize: input.bytes.byteLength,
      sha256,
    };
  }

  async read(storageKey: string): Promise<
    | {
        readonly bytes: Uint8Array;
        readonly contentType: string;
        readonly sha256: string;
      }
    | undefined
  > {
    const match = /^sha256\/([a-f0-9]{64})\/([a-z_]+)$/.exec(storageKey);
    if (match === null) {
      return undefined;
    }

    const contentType = contentTypeFromKey(match[2]);
    if (contentType === undefined) {
      return undefined;
    }

    try {
      const bytes = await readFile(
        join(this.rootDirectory, "sha256", `${match[1]}.${match[2]}`),
      );
      const sha256 = createHash("sha256").update(bytes).digest("hex");
      if (sha256 !== match[1]) {
        throw new Error("Evidence asset integrity verification failed.");
      }

      return {
        bytes: new Uint8Array(bytes),
        contentType,
        sha256,
      };
    } catch (error) {
      if (
        error instanceof Error &&
        "code" in error &&
        error.code === "ENOENT"
      ) {
        return undefined;
      }
      throw error;
    }
  }
}
