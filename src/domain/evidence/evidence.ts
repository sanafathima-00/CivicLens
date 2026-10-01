export const EVIDENCE_KINDS = [
  "SITE_SOURCE_RECORD",
  "IMAGERY",
  "DOCUMENT",
  "GOVERNMENT_RECORD",
  "CIVIC_SIGNAL",
  "SPATIAL_DATA",
  "ADMINISTRATIVE_RECORD",
  "OTHER",
] as const;

export type EvidenceKind = (typeof EVIDENCE_KINDS)[number];

export const EVIDENCE_SOURCE_CLASSIFICATIONS = [
  "LIVE_SOURCE",
  "IMPORTED_SNAPSHOT",
  "PREPARED",
  "SEEDED_TEST",
] as const;

export type EvidenceSourceClassification =
  (typeof EVIDENCE_SOURCE_CLASSIFICATIONS)[number];

export const EVIDENCE_RETRIEVAL_STATUSES = [
  "AVAILABLE",
  "PARTIAL",
  "UNAVAILABLE",
  "UNRESOLVED",
] as const;

export type EvidenceRetrievalStatus =
  (typeof EVIDENCE_RETRIEVAL_STATUSES)[number];

export const EVIDENCE_TIME_PRECISIONS = [
  "EXACT",
  "DATE",
  "MONTH",
  "YEAR",
  "APPROXIMATE",
] as const;

export type EvidenceTimePrecision = (typeof EVIDENCE_TIME_PRECISIONS)[number];

export const EVIDENCE_COMPLETENESS_VALUES = [
  "COMPLETE",
  "PARTIAL",
  "UNKNOWN",
] as const;

export type EvidenceCompleteness =
  (typeof EVIDENCE_COMPLETENESS_VALUES)[number];

export const EVIDENCE_INTEGRITY_VALUES = [
  "VERIFIED_BY_HASH",
  "SOURCE_DECLARED",
  "NOT_VERIFIED",
] as const;

export type EvidenceIntegrity = (typeof EVIDENCE_INTEGRITY_VALUES)[number];

export interface EvidenceTimeValue {
  readonly value: Date;
  readonly precision: EvidenceTimePrecision;
}

export interface EvidenceProvenance {
  readonly providerId: string;
  readonly providerLabel: string;
  readonly sourceClassification: EvidenceSourceClassification;
  readonly isLive: boolean;
  readonly externalRecordId?: string;
  readonly sourceReference?: string;
  readonly sourceVersion?: string;
  readonly sourceContentHash?: string;
  readonly licenseDesignation?: string;
  readonly retrievedAt: Date;
}

export interface EvidenceAssetReference {
  readonly storageKey: string;
  readonly contentType: string;
  readonly byteSize: number;
  readonly sha256: string;
}

export interface EvidenceItem {
  readonly id: string;
  readonly retrievalId: string;
  readonly kind: EvidenceKind;
  readonly sourceItemKey: string;
  readonly label?: string;
  readonly provenance: EvidenceProvenance;
  readonly capturedAt?: EvidenceTimeValue;
  readonly observedAt?: EvidenceTimeValue;
  readonly publishedAt?: EvidenceTimeValue;
  readonly sourceUpdatedAt?: EvidenceTimeValue;
  readonly completeness: EvidenceCompleteness;
  readonly integrity: EvidenceIntegrity;
  readonly qualityNotes?: string;
  readonly limitations: readonly string[];
  readonly metadata: Readonly<Record<string, unknown>>;
  readonly asset?: EvidenceAssetReference;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export interface CollectedEvidenceItem {
  readonly kind: EvidenceKind;
  readonly sourceItemKey: string;
  readonly label?: string;
  readonly provenance: EvidenceProvenance;
  readonly capturedAt?: EvidenceTimeValue;
  readonly observedAt?: EvidenceTimeValue;
  readonly publishedAt?: EvidenceTimeValue;
  readonly sourceUpdatedAt?: EvidenceTimeValue;
  readonly completeness: EvidenceCompleteness;
  readonly integrity: EvidenceIntegrity;
  readonly qualityNotes?: string;
  readonly limitations: readonly string[];
  readonly metadata: Readonly<Record<string, unknown>>;
  readonly asset?: EvidenceAssetReference;
}

export interface EvidenceRetrieval {
  readonly id: string;
  readonly investigationId: string;
  readonly provenance: EvidenceProvenance;
  readonly status: EvidenceRetrievalStatus;
  readonly retrievedAt: Date;
  readonly limitations: readonly string[];
  readonly items: readonly EvidenceItem[];
  readonly createdAt: Date;
}

export interface ProviderEvidenceResult {
  readonly provenance: EvidenceProvenance;
  readonly status: EvidenceRetrievalStatus;
  readonly retrievedAt: Date;
  readonly limitations: readonly string[];
  readonly items: readonly CollectedEvidenceItem[];
}

export interface InvestigationEvidencePackage {
  readonly investigationId: string;
  readonly retrievals: readonly EvidenceRetrieval[];
  readonly items: readonly EvidenceItem[];
}
