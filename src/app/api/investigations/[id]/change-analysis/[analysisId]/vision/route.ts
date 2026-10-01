import {
  getVisionAnalyses,
  runVisionAnalysisForConstructionChange,
} from "@/infrastructure/composition/construction-change-services";
import {
  createVisionAnalysisGetHandler,
  createVisionAnalysisPostHandler,
} from "./vision-route-handlers";

export const runtime = "nodejs";
export const POST = createVisionAnalysisPostHandler(
  runVisionAnalysisForConstructionChange,
);
export const GET = createVisionAnalysisGetHandler(getVisionAnalyses);
