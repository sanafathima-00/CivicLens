import { investigationIdSchema } from "@/contracts/investigations/get-investigation";
import type { VisionAnalysisStore } from "@/domain/construction-change/vision-analysis-store";

export class GetVisionAnalyses {
  constructor(private readonly store: VisionAnalysisStore) {}
  async execute(investigationId: string, analysisId: string) {
    const investigation = investigationIdSchema.safeParse(investigationId);
    const analysis = investigationIdSchema.safeParse(analysisId);
    if (!investigation.success || !analysis.success)
      return {
        kind: "invalid" as const,
        message: "Invalid Investigation or construction-change analysis ID.",
      };
    return this.store.list(investigation.data, analysis.data);
  }
}
