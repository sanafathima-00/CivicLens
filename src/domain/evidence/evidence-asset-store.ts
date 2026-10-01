import type { EvidenceAssetReference } from "./evidence";

export interface EvidenceAssetStore {
  put(input: {
    readonly bytes: Uint8Array;
    readonly contentType: string;
    readonly expectedSha256?: string;
  }): Promise<EvidenceAssetReference>;

  read(storageKey: string): Promise<
    | {
        readonly bytes: Uint8Array;
        readonly contentType: string;
        readonly sha256: string;
      }
    | undefined
  >;
}
