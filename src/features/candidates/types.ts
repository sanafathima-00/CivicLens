export interface CandidateSiteViewModel {
  readonly id: string;
  readonly label?: string;
  readonly origin: {
    readonly providerId: string;
    readonly providerLabel: string;
    readonly sourceType: string;
    readonly isLive: boolean;
    readonly externalRecordId?: string;
    readonly retrievedAt: string;
    readonly sourceReference?: string;
    readonly sourceVersion?: string;
  };
  readonly location: {
    readonly locationState: string;
    readonly latitude?: number;
    readonly longitude?: number;
    readonly coordinateQuality?: string;
  };
}

export interface CandidateViewModel {
  readonly candidateId: string;
  readonly site: CandidateSiteViewModel;
  readonly sourceRecord: {
    readonly constructionId?: string;
    readonly kGISCode?: string;
    readonly rawConstructionName?: string;
    readonly villageId?: string;
    readonly departmentCode?: string;
    readonly rawCoordinates?: string;
  };
  readonly validation: {
    readonly conditions: readonly string[];
    readonly duplicateCoordinateGroupSize?: number;
  };
  readonly locationSemantics: "APPROXIMATE_PROJECT_SITE_LOCATION";
}

export interface CandidateApiResponse {
  readonly source: {
    readonly providerLabel: string;
    readonly dataClassification: string;
    readonly isLive: boolean;
    readonly retrievedAt: string;
    readonly sourceReference: string;
    readonly sourceVersion: string;
  };
  readonly statistics: {
    readonly imported: number;
    readonly accepted: number;
    readonly quarantined: number;
    readonly invalid: number;
    readonly investigationReady: number;
    readonly duplicateCoordinateRecords: number;
  };
  readonly candidates: readonly CandidateViewModel[];
}

export interface InvestigationApiResponse {
  readonly investigation: {
    readonly id: string;
    readonly siteId: string;
    readonly status: "CREATED" | "IN_PROGRESS" | "COMPLETED" | "FAILED";
    readonly createdAt: string;
    readonly updatedAt: string;
  };
  readonly site: CandidateSiteViewModel;
}
