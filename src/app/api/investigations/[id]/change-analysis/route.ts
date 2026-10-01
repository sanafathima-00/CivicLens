import {
  createConstructionChangeAnalysis,
  getConstructionChangeAnalyses,
} from "@/infrastructure/composition/construction-change-services";

import {
  createConstructionChangeAnalysisGetHandler,
  createConstructionChangeAnalysisPostHandler,
} from "./change-analysis-route-handlers";

export const runtime = "nodejs";

export const POST = createConstructionChangeAnalysisPostHandler(
  createConstructionChangeAnalysis,
);
export const GET = createConstructionChangeAnalysisGetHandler(
  getConstructionChangeAnalyses,
);
