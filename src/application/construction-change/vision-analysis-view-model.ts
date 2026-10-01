import type { VisionAnalysis } from "@/domain/construction-change/vision-analysis";

export function visionAnalysisViewModel(value: VisionAnalysis) {
  return { ...value, createdAt: value.createdAt.toISOString() };
}
