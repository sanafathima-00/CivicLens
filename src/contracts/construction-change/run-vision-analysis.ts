import { z } from "zod";

export const runVisionAnalysisRequestSchema = z.object({}).strict();
export type RunVisionAnalysisRequest = z.infer<
  typeof runVisionAnalysisRequestSchema
>;
