import { investigationIdSchema } from "@/contracts/investigations/get-investigation";
import type {
  EvidencePackageLookupResult,
  EvidenceStore,
} from "@/domain/evidence/evidence-store";

export type GetInvestigationEvidenceResult =
  | EvidencePackageLookupResult
  | { readonly kind: "invalid"; readonly message: string };

export class GetInvestigationEvidence {
  constructor(private readonly evidenceStore: EvidenceStore) {}

  async execute(
    investigationId: string,
  ): Promise<GetInvestigationEvidenceResult> {
    const parsed = investigationIdSchema.safeParse(investigationId);
    if (!parsed.success) {
      return {
        kind: "invalid",
        message: parsed.error.issues[0]?.message ?? "Invalid investigation ID.",
      };
    }

    return this.evidenceStore.getPackage(parsed.data);
  }
}
