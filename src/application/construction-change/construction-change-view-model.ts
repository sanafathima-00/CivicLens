import type { ConstructionChangeAnalysis } from "@/domain/construction-change/construction-change-analysis";

export function constructionChangeAnalysisViewModel(
  analysis: ConstructionChangeAnalysis,
) {
  return {
    ...analysis,
    createdAt: analysis.createdAt.toISOString(),
  };
}
