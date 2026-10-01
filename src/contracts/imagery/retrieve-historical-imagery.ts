import { z } from "zod";

const dateTimeSchema = z
  .string()
  .datetime({ offset: true })
  .transform((value) => new Date(value));

export const historicalImageryRequestSchema = z
  .object({
    start: dateTimeSchema,
    end: dateTimeSchema,
    maximumObservations: z.number().int().min(1).max(5).optional(),
  })
  .strict()
  .superRefine((value, context) => {
    if (value.start.getTime() >= value.end.getTime()) {
      context.addIssue({
        code: "custom",
        message: "The imagery start time must be before the end time.",
        path: ["end"],
      });
    }
  });

export type HistoricalImageryRequest = z.infer<
  typeof historicalImageryRequestSchema
>;
