import type {
  ComplaintCategory,
  ComplaintLocation,
} from "@/domain/complaints/complaint";

import type { AdministrativeMappingProvider } from "./administrative-mapping-provider";
import type {
  CivicServiceResponsibility,
  CivicServiceResponsibilityRegistry,
} from "./responsibility-registry";

export const AUTHORITY_MAPPING_STATES = [
  "MAPPED",
  "PARTIAL",
  "NOT_MAPPABLE",
  "UNRESOLVED",
  "UNAVAILABLE",
] as const;

export type AuthorityMappingState = (typeof AUTHORITY_MAPPING_STATES)[number];

export interface AdministrativeUnit {
  readonly id: string;
  readonly name: string;
}

export interface AdministrativeContext {
  readonly cityCorporation: AdministrativeUnit;
  readonly ward?: AdministrativeUnit;
  readonly zone?: AdministrativeUnit;
}

export type AdministrativeMappingMethod = "SEEDED_REFERENCE_LOOKUP";
export type AdministrativeMatchQuality = "PROTOTYPE_APPROXIMATE";

export interface AdministrativeMappingProvenance {
  readonly providerId: string;
  readonly providerLabel: string;
  readonly datasetName: string;
  readonly sourceName: string;
  readonly sourceReference: string;
  readonly sourceVersion: string;
  readonly retrievedAt: Date;
  readonly effectiveAt?: Date;
  readonly mappingMethod: AdministrativeMappingMethod;
  readonly matchQuality: AdministrativeMatchQuality;
  readonly limitations: readonly string[];
}

export type AdministrativeMappingResult =
  | {
      readonly state: "MAPPED";
      readonly administrativeContext: AdministrativeContext;
      readonly provenance: AdministrativeMappingProvenance;
    }
  | {
      readonly state: "NOT_MAPPABLE";
      readonly limitations: readonly string[];
    }
  | {
      readonly state: "UNRESOLVED";
      readonly limitations: readonly string[];
    }
  | {
      readonly state: "UNAVAILABLE";
      readonly reason: string;
      readonly limitations: readonly string[];
    };

export type AuthorityMappingResult =
  | {
      readonly state: "MAPPED";
      readonly administrativeContext: AdministrativeContext;
      readonly responsibility: CivicServiceResponsibility;
      readonly provenance: AdministrativeMappingProvenance;
    }
  | {
      readonly state: "PARTIAL";
      readonly administrativeContext: AdministrativeContext;
      readonly provenance: AdministrativeMappingProvenance;
      readonly limitations: readonly string[];
    }
  | Exclude<AdministrativeMappingResult, { readonly state: "MAPPED" }>;

export class AuthorityMappingService {
  constructor(
    private readonly administrativeMappingProvider: AdministrativeMappingProvider,
    private readonly responsibilityRegistry: CivicServiceResponsibilityRegistry,
  ) {}

  async map(
    location: ComplaintLocation | undefined,
    category: ComplaintCategory,
  ): Promise<AuthorityMappingResult> {
    const geographicResult =
      await this.administrativeMappingProvider.mapCoordinates(location);

    if (geographicResult.state !== "MAPPED") {
      return geographicResult;
    }

    const responsibility = this.responsibilityRegistry.getByCategory(category);

    if (!responsibility) {
      return {
        state: "PARTIAL",
        administrativeContext: geographicResult.administrativeContext,
        provenance: geographicResult.provenance,
        limitations: [
          ...geographicResult.provenance.limitations,
          "No automatic CivicLens responsibility suggestion is defined for this complaint category.",
        ],
      };
    }

    return {
      state: "MAPPED",
      administrativeContext: geographicResult.administrativeContext,
      responsibility,
      provenance: geographicResult.provenance,
    };
  }
}
