import { investigationIdSchema } from "@/contracts/investigations/get-investigation";
import type { ConstructionChangeStore } from "@/domain/construction-change/construction-change-store";

export class GetConstructionChangeAnalyses {
  constructor(private readonly store: ConstructionChangeStore) {}

  async execute(investigationId: string) {
    const parsed = investigationIdSchema.safeParse(investigationId);
    if (!parsed.success) {
      return {
        kind: "invalid" as const,
        message: parsed.error.issues[0]?.message ?? "Invalid investigation ID.",
      };
    }
    return this.store.list(parsed.data);
  }
}
