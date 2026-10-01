import { z } from "zod";

const latitudeSchema = z.number().finite().min(-90).max(90);
const longitudeSchema = z.number().finite().min(-180).max(180);

export const complaintLocationSchema = z
  .object({
    latitude: latitudeSchema.optional(),
    longitude: longitudeSchema.optional(),
    coordinatePrecisionMeters: z.number().int().positive().optional(),
    coordinateSource: z.string().min(1).optional(),
    displayAddress: z.string().min(1).optional(),
    landmark: z.string().min(1).optional(),
    jurisdiction: z.string().min(1).optional(),
    zone: z.string().min(1).optional(),
    ward: z.string().min(1).optional(),
    boundaryReference: z.string().min(1).optional(),
    boundaryVersion: z.string().min(1).optional(),
    matchQuality: z.string().min(1).optional(),
    limitationNotes: z.string().min(1).optional(),
  })
  .superRefine((location, context) => {
    const hasLatitude = location.latitude !== undefined;
    const hasLongitude = location.longitude !== undefined;

    if (hasLatitude !== hasLongitude) {
      context.addIssue({
        code: "custom",
        message: "Latitude and longitude must be provided together.",
        path: hasLatitude ? ["longitude"] : ["latitude"],
      });
    }
  });
