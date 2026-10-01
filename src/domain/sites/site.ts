export const SITE_SOURCE_TYPES = [
  "SEEDED_DEMO",
  "ANALYST_PREPARED",
  "GOVERNMENT_BUILDING_PERMISSION",
  "K_RERA",
  "GIS",
  "OPENCITY",
  "VERIFIED_PUBLIC",
  "OTHER",
] as const;

export type SiteSourceType = (typeof SITE_SOURCE_TYPES)[number];

export const COORDINATE_QUALITIES = [
  "EXACT",
  "APPROXIMATE",
  "PREPARED",
] as const;

export type CoordinateQuality = (typeof COORDINATE_QUALITIES)[number];

export const SITE_LOCATION_STATES = [
  "MAPPABLE",
  "NOT_MAPPABLE",
  "UNRESOLVED",
] as const;

export type SiteLocationState = (typeof SITE_LOCATION_STATES)[number];

export interface SiteOrigin {
  readonly providerId: string;
  readonly providerLabel: string;
  readonly sourceType: SiteSourceType;
  readonly isLive: boolean;
  readonly externalRecordId?: string;
  readonly retrievedAt: Date;
  readonly sourceReference?: string;
  readonly sourceVersion?: string;
  readonly sourceContentHash?: string;
  readonly licenseDesignation?: string;
}

export interface SiteLocation {
  readonly locationState: SiteLocationState;
  readonly latitude?: number;
  readonly longitude?: number;
  readonly coordinatePrecisionMeters?: number;
  readonly coordinateQuality?: CoordinateQuality;
  readonly displayAddress?: string;
  readonly locality?: string;
  readonly neighborhood?: string;
  readonly city?: string;
  readonly postalCode?: string;
  readonly descriptiveLocation?: string;
}

export interface Site {
  readonly id: string;
  readonly label?: string;
  readonly origin: SiteOrigin;
  readonly location: SiteLocation;
}

export type SiteProviderIdentity = Pick<
  SiteOrigin,
  "providerId" | "providerLabel" | "sourceType" | "isLive"
>;
