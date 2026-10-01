import type { InvestigationWithSite } from "@/domain/investigations/investigation-store";

import type {
  InvestigationEvidencePackage,
  ProviderEvidenceResult,
} from "./evidence";

export type PersistEvidenceRetrievalsResult =
  | {
      readonly kind: "persisted";
      readonly value: InvestigationEvidencePackage;
    }
  | {
      readonly kind: "unavailable";
      readonly reason: string;
    }
  | {
      readonly kind: "failed";
      readonly reason: string;
    };

export type EvidencePackageLookupResult =
  | {
      readonly kind: "found";
      readonly value: InvestigationEvidencePackage;
    }
  | {
      readonly kind: "not_found";
      readonly investigationId: string;
    }
  | {
      readonly kind: "unavailable";
      readonly reason: string;
    }
  | {
      readonly kind: "failed";
      readonly reason: string;
    };

export interface EvidenceStore {
  getInvestigationWithSite(
    investigationId: string,
  ): Promise<
    | { readonly kind: "found"; readonly value: InvestigationWithSite }
    | { readonly kind: "not_found"; readonly investigationId: string }
    | { readonly kind: "unavailable"; readonly reason: string }
    | { readonly kind: "failed"; readonly reason: string }
  >;

  persistRetrievals(
    investigationId: string,
    results: readonly ProviderEvidenceResult[],
  ): Promise<PersistEvidenceRetrievalsResult>;

  getPackage(investigationId: string): Promise<EvidencePackageLookupResult>;
}
