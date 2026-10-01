import type { Site, SiteLocation, SiteSourceType } from "@/domain/sites/site";

export const CANDIDATE_VALIDATION_STATUSES = [
  "ACCEPTED",
  "QUARANTINED",
  "INVALID",
] as const;

export type CandidateValidationStatus =
  (typeof CANDIDATE_VALIDATION_STATUSES)[number];

export const CANDIDATE_VALIDATION_CONDITIONS = [
  "KNOWN_SOURCE_ANOMALY",
  "DUPLICATE_COORDINATE",
  "MALFORMED_COORDINATE",
  "MISSING_REQUIRED_SOURCE_FIELD",
] as const;

export type CandidateValidationCondition =
  (typeof CANDIDATE_VALIDATION_CONDITIONS)[number];

export type CandidateDataClassification = "IMPORTED_SOURCE_SNAPSHOT";

export interface CandidateSourceMetadata {
  readonly providerId: string;
  readonly providerLabel: string;
  readonly sourceType: SiteSourceType;
  readonly dataClassification: CandidateDataClassification;
  readonly isLive: false;
  readonly datasetName: string;
  readonly resourceName: string;
  readonly resourceId: string;
  readonly sourceReference: string;
  readonly upstreamAttribution: string;
  readonly sourceVersion: string;
  readonly retrievedAt: Date;
  readonly contentHash: string;
  readonly licenseDesignation: string;
}

export interface CandidateSourceRecord {
  readonly constructionId?: string;
  readonly kGISCode?: string;
  readonly rawConstructionName?: string;
  readonly villageId?: string;
  readonly departmentCode?: string;
  readonly rawCoordinates?: string;
}

export interface CandidateValidation {
  readonly status: CandidateValidationStatus;
  readonly conditions: readonly CandidateValidationCondition[];
  readonly reason?: string;
  readonly duplicateCoordinateGroupSize?: number;
}

export interface ConstructionCandidate {
  readonly id: string;
  readonly source: CandidateSourceMetadata;
  readonly sourceRecord: CandidateSourceRecord;
  readonly location?: SiteLocation;
  readonly site?: Site;
  readonly locationSemantics: "APPROXIMATE_PROJECT_SITE_LOCATION";
  readonly validation: CandidateValidation;
}

export interface CandidateImportStatistics {
  readonly imported: number;
  readonly accepted: number;
  readonly quarantined: number;
  readonly invalid: number;
  readonly investigationReady: number;
  readonly duplicateCoordinateRecords: number;
  readonly duplicateCoordinateGroups: number;
}
