import { z } from "zod";

export const getSiteByIdInputSchema = z
  .string()
  .trim()
  .min(1, "Site ID is required.")
  .max(128, "Site ID is too long.");
