import { z } from "zod";

export const candidateIdSchema = z
  .string()
  .trim()
  .min(1, "Candidate ID is required.")
  .max(128, "Candidate ID is too long.");
