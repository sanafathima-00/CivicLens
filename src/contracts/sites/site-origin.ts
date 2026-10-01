import { z } from "zod";

import { SITE_SOURCE_TYPES } from "@/domain/sites/site";

const nonBlankStringSchema = z.string().trim().min(1);

export const siteOriginSchema = z.object({
  providerId: nonBlankStringSchema,
  providerLabel: nonBlankStringSchema,
  sourceType: z.enum(SITE_SOURCE_TYPES),
  isLive: z.boolean(),
  externalRecordId: nonBlankStringSchema.optional(),
  retrievedAt: z.date(),
  sourceReference: nonBlankStringSchema.optional(),
  sourceVersion: nonBlankStringSchema.optional(),
});
