import { investigationIdSchema } from "@/contracts/investigations/get-investigation";
import type {
  InvestigationLookupResult,
  InvestigationStore,
} from "@/domain/investigations/investigation-store";

export type GetInvestigationResult =
  | InvestigationLookupResult
  | {
      readonly kind: "invalid";
      readonly message: string;
    };

export class GetInvestigation {
  constructor(private readonly investigationStore: InvestigationStore) {}

  async execute(investigationId: string): Promise<GetInvestigationResult> {
    const parsed = investigationIdSchema.safeParse(investigationId);

    if (!parsed.success) {
      return {
        kind: "invalid",
        message: parsed.error.issues[0]?.message ?? "Invalid investigation ID.",
      };
    }

    return this.investigationStore.getById(parsed.data);
  }
}
