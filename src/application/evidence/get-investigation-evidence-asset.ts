import { createHash } from "node:crypto";

import { investigationIdSchema } from "@/contracts/investigations/get-investigation";
import type { EvidenceAssetStore } from "@/domain/evidence/evidence-asset-store";
import type { EvidenceStore } from "@/domain/evidence/evidence-store";

export type GetInvestigationEvidenceAssetResult =
  | {
      readonly kind: "found";
      readonly bytes: Uint8Array;
      readonly contentType: string;
    }
  | { readonly kind: "invalid"; readonly message: string }
  | { readonly kind: "not_found" }
  | { readonly kind: "unavailable"; readonly reason: string }
  | { readonly kind: "failed"; readonly reason: string };

/**
 * Returns an investigation-owned persisted asset for display. The storage key
 * is deliberately never accepted from the browser.
 */
export class GetInvestigationEvidenceAsset {
  constructor(
    private readonly evidenceStore: EvidenceStore,
    private readonly assetStore: EvidenceAssetStore,
  ) {}

  async execute(
    investigationId: string,
    evidenceItemId: string,
  ): Promise<GetInvestigationEvidenceAssetResult> {
    const investigation = investigationIdSchema.safeParse(investigationId);
    const evidenceItem = investigationIdSchema.safeParse(evidenceItemId);
    if (!investigation.success || !evidenceItem.success) {
      return {
        kind: "invalid",
        message: "Invalid Investigation or evidence ID.",
      };
    }

    const packageResult = await this.evidenceStore.getPackage(
      investigation.data,
    );
    if (packageResult.kind !== "found") return packageResult;

    const item = packageResult.value.items.find(
      (candidate) => candidate.id === evidenceItem.data,
    );
    if (item?.asset === undefined) return { kind: "not_found" };

    try {
      const asset = await this.assetStore.read(item.asset.storageKey);
      if (
        asset === undefined ||
        asset.contentType !== item.asset.contentType ||
        asset.sha256 !== item.asset.sha256 ||
        createHash("sha256").update(asset.bytes).digest("hex") !==
          item.asset.sha256
      ) {
        return { kind: "not_found" };
      }
      return {
        kind: "found",
        bytes: asset.bytes,
        contentType: asset.contentType,
      };
    } catch {
      return {
        kind: "unavailable",
        reason: "Evidence asset storage is currently unavailable.",
      };
    }
  }
}
