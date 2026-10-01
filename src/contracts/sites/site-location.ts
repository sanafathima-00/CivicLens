import { z } from "zod";

export const coordinateQualitySchema = z.enum([
  "EXACT",
  "APPROXIMATE",
  "PREPARED",
]);

export const siteLocationStateSchema = z.enum([
  "MAPPABLE",
  "NOT_MAPPABLE",
  "UNRESOLVED",
]);

const latitudeSchema = z.number().finite().min(-90).max(90);
const longitudeSchema = z.number().finite().min(-180).max(180);
const nonBlankStringSchema = z.string().trim().min(1);

function hasUsefulLocationMetadata(location: {
  displayAddress?: string;
  locality?: string;
  neighborhood?: string;
  city?: string;
  postalCode?: string;
  descriptiveLocation?: string;
}): boolean {
  return [
    location.displayAddress,
    location.locality,
    location.neighborhood,
    location.city,
    location.postalCode,
    location.descriptiveLocation,
  ].some((value) => value !== undefined);
}

export const siteLocationSchema = z
  .object({
    locationState: siteLocationStateSchema,
    latitude: latitudeSchema.optional(),
    longitude: longitudeSchema.optional(),
    coordinatePrecisionMeters: z.number().finite().positive().optional(),
    coordinateQuality: coordinateQualitySchema.optional(),
    displayAddress: nonBlankStringSchema.optional(),
    locality: nonBlankStringSchema.optional(),
    neighborhood: nonBlankStringSchema.optional(),
    city: nonBlankStringSchema.optional(),
    postalCode: nonBlankStringSchema.optional(),
    descriptiveLocation: nonBlankStringSchema.optional(),
  })
  .superRefine((location, context) => {
    const hasLatitude = location.latitude !== undefined;
    const hasLongitude = location.longitude !== undefined;
    const hasCoordinates = hasLatitude && hasLongitude;

    if (hasLatitude !== hasLongitude) {
      context.addIssue({
        code: "custom",
        message: "Latitude and longitude must be provided together.",
        path: hasLatitude ? ["longitude"] : ["latitude"],
      });
      return;
    }

    if (hasCoordinates) {
      if (location.locationState !== "MAPPABLE") {
        context.addIssue({
          code: "custom",
          message:
            "A valid coordinate pair requires a MAPPABLE location state.",
          path: ["locationState"],
        });
      }

      if (location.coordinateQuality === undefined) {
        context.addIssue({
          code: "custom",
          message:
            "Coordinate quality is required when coordinates are present.",
          path: ["coordinateQuality"],
        });
      }

      return;
    }

    if (location.coordinatePrecisionMeters !== undefined) {
      context.addIssue({
        code: "custom",
        message: "Coordinate precision requires a coordinate pair.",
        path: ["coordinatePrecisionMeters"],
      });
    }

    if (location.coordinateQuality !== undefined) {
      context.addIssue({
        code: "custom",
        message: "Coordinate quality requires a coordinate pair.",
        path: ["coordinateQuality"],
      });
    }

    if (location.locationState === "MAPPABLE") {
      context.addIssue({
        code: "custom",
        message: "A MAPPABLE location requires a valid coordinate pair.",
        path: ["locationState"],
      });
    }

    if (
      location.locationState === "NOT_MAPPABLE" &&
      !hasUsefulLocationMetadata(location)
    ) {
      context.addIssue({
        code: "custom",
        message:
          "A NOT_MAPPABLE location requires useful address or location metadata.",
        path: ["locationState"],
      });
    }
  });
