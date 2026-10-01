import type { Site, SiteProviderIdentity } from "@/domain/sites/site";

export const SEEDED_SITE_PROVIDER: SiteProviderIdentity = {
  providerId: "civiclens-seeded-site-demo",
  providerLabel: "CivicLens Seeded Site Demo Provider",
  sourceType: "SEEDED_DEMO",
  isLive: false,
};

export const SEEDED_SITES: readonly Site[] = [
  {
    id: "site-demo-approximate-001",
    label: "Seeded demonstration construction site",
    origin: {
      ...SEEDED_SITE_PROVIDER,
      externalRecordId: "seeded-site-record-001",
      retrievedAt: new Date("2026-09-01T09:00:00.000Z"),
      sourceVersion: "seeded-site-dataset-v1",
    },
    location: {
      locationState: "MAPPABLE",
      latitude: 12.9716,
      longitude: 77.5946,
      coordinatePrecisionMeters: 75,
      coordinateQuality: "APPROXIMATE",
      locality: "Prototype central Bengaluru locality",
      city: "Bengaluru",
      descriptiveLocation:
        "Fictional demo location for Site foundation testing.",
    },
  },
  {
    id: "site-demo-prepared-002",
    label: "Analyst-prepared demonstration site",
    origin: {
      providerId: "civiclens-analyst-prepared",
      providerLabel: "CivicLens Analyst-Prepared Demo Source",
      sourceType: "ANALYST_PREPARED",
      isLive: false,
      retrievedAt: new Date("2026-09-01T10:00:00.000Z"),
    },
    location: {
      locationState: "MAPPABLE",
      latitude: 12.9352,
      longitude: 77.6245,
      coordinatePrecisionMeters: 100,
      coordinateQuality: "PREPARED",
      neighborhood: "Prototype southeast Bengaluru neighborhood",
      city: "Bengaluru",
      descriptiveLocation:
        "Fictional analyst-prepared location for Site foundation testing.",
    },
  },
  {
    id: "site-demo-address-only-003",
    label: "Address-only demonstration site",
    origin: {
      ...SEEDED_SITE_PROVIDER,
      externalRecordId: "seeded-site-record-003",
      retrievedAt: new Date("2026-09-01T11:00:00.000Z"),
      sourceVersion: "seeded-site-dataset-v1",
    },
    location: {
      locationState: "NOT_MAPPABLE",
      displayAddress: "Prototype address-only construction location",
      locality: "Prototype Bengaluru locality",
      city: "Bengaluru",
      postalCode: "560000",
    },
  },
  {
    id: "site-demo-unresolved-004",
    label: "Unresolved-location demonstration site",
    origin: {
      ...SEEDED_SITE_PROVIDER,
      externalRecordId: "seeded-site-record-004",
      retrievedAt: new Date("2026-09-01T12:00:00.000Z"),
      sourceVersion: "seeded-site-dataset-v1",
    },
    location: {
      locationState: "UNRESOLVED",
    },
  },
] as const;
