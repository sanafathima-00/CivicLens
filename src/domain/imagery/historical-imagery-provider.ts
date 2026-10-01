import type {
  EvidenceProvenance,
  EvidenceRetrievalStatus,
  EvidenceTimeValue,
} from "@/domain/evidence/evidence";
import type { Site } from "@/domain/sites/site";

import type { DerivedContextAoi } from "./derived-context-aoi";

export const IMAGERY_USABILITY_VALUES = [
  "USABLE",
  "LIMITED",
  "UNSUITABLE",
  "UNASSESSED",
] as const;

export type ImageryUsability = (typeof IMAGERY_USABILITY_VALUES)[number];

export const IMAGERY_QUALITY_FLAGS = [
  "CLOUD_AFFECTED",
  "SHADOW_AFFECTED",
  "HAZE_AFFECTED",
  "LOW_RESOLUTION",
  "PARTIAL_COVERAGE",
  "VIEW_GEOMETRY_DIFFERENCE",
  "SEASONAL_VARIATION_RISK",
  "VEGETATION_OBSCURATION_RISK",
] as const;

export type ImageryQualityFlag = (typeof IMAGERY_QUALITY_FLAGS)[number];

export interface HistoricalImageryTimeRange {
  readonly start: Date;
  readonly end: Date;
}

export interface RetrievedImageryPixels {
  readonly bytes: Uint8Array;
  readonly contentType: string;
  readonly stableAssetKey: string;
}

export interface HistoricalImageryObservation {
  readonly sourceItemKey: string;
  readonly label: string;
  readonly provenance: EvidenceProvenance;
  readonly capturedAt: EvidenceTimeValue;
  readonly observedAt: EvidenceTimeValue;
  readonly publishedAt?: EvidenceTimeValue;
  readonly sourceUpdatedAt?: EvidenceTimeValue;
  readonly collectionId: string;
  readonly productId: string;
  readonly assetRole: "RGB_CONTEXT_RENDER";
  readonly groundSampleDistanceMeters?: number;
  readonly crs?: string;
  readonly providerCloudCoverPercent?: number;
  readonly aoi: DerivedContextAoi;
  readonly usability: ImageryUsability;
  readonly qualityFlags: readonly ImageryQualityFlag[];
  readonly limitations: readonly string[];
  readonly processing: readonly {
    readonly operation: string;
    readonly version?: string;
  }[];
  readonly selection: {
    readonly rank: number;
    readonly discoveredObservationCount: number;
    readonly eligibleObservationCount: number;
    readonly selectedObservationCount: number;
    readonly notSelectedSourceItemKeys: readonly string[];
  };
  readonly pixels: RetrievedImageryPixels;
}

export interface HistoricalImageryProviderResult {
  readonly provenance: EvidenceProvenance;
  readonly status: EvidenceRetrievalStatus;
  readonly retrievedAt: Date;
  readonly limitations: readonly string[];
  readonly observations: readonly HistoricalImageryObservation[];
}

export interface HistoricalImageryProvider {
  readonly providerId: string;

  retrieve(input: {
    readonly site: Site;
    readonly aoi: DerivedContextAoi;
    readonly timeRange: HistoricalImageryTimeRange;
    readonly maximumObservations: number;
  }): Promise<HistoricalImageryProviderResult>;
}
