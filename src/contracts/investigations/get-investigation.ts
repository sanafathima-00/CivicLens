import { z } from "zod";

export const investigationIdSchema = z
  .string()
  .trim()
  .min(1, "Investigation ID is required.")
  .max(128, "Investigation ID is too long.")
  .cuid("Investigation ID must be a valid CUID.");
