import { z } from "zod";

import { candidateIdSchema } from "@/contracts/candidates/candidate-id";

export const createInvestigationInputSchema = z.object({
  candidateId: candidateIdSchema,
});
