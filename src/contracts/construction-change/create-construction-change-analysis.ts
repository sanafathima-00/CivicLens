import { z } from "zod";

import { investigationIdSchema } from "@/contracts/investigations/get-investigation";

export const constructionChangeAnalysisRequestSchema = z
  .object({
    beforeEvidenceItemId: investigationIdSchema.optional(),
    afterEvidenceItemId: investigationIdSchema.optional(),
  })
  .strict()
  .superRefine((value, context) => {
    if (
      (value.beforeEvidenceItemId === undefined) !==
      (value.afterEvidenceItemId === undefined)
    ) {
      context.addIssue({
        code: "custom",
        message:
          "Both imagery evidence IDs must be supplied together, or neither supplied for deterministic selection.",
      });
    }
  });

export type ConstructionChangeAnalysisRequest = z.infer<
  typeof constructionChangeAnalysisRequestSchema
>;
