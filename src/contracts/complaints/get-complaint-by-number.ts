import { z } from "zod";

export const getComplaintByNumberInputSchema = z
  .string()
  .trim()
  .min(1, "Complaint number is required.")
  .max(64, "Complaint number is too long.")
  .transform((value) => value.toUpperCase());
