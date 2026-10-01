import type { EvidenceItem } from "@/domain/evidence/evidence";

import type { ConstructionChangeAnalysis } from "./construction-change-analysis";

export type InvestigationImageryLookupResult =
  | {
      readonly kind: "found";
      readonly investigationId: string;
      readonly items: readonly EvidenceItem[];
    }
  | { readonly kind: "not_found"; readonly investigationId: string }
  | { readonly kind: "unavailable"; readonly reason: string }
  | { readonly kind: "failed"; readonly reason: string };

export type PersistConstructionChangeAnalysisResult =
  | { readonly kind: "persisted"; readonly value: ConstructionChangeAnalysis }
  | { readonly kind: "unprocessable"; readonly message: string }
  | { readonly kind: "unavailable"; readonly reason: string }
  | { readonly kind: "failed"; readonly reason: string };

export type ConstructionChangeAnalysesLookupResult =
  | {
      readonly kind: "found";
      readonly investigationId: string;
      readonly value: readonly ConstructionChangeAnalysis[];
    }
  | { readonly kind: "not_found"; readonly investigationId: string }
  | { readonly kind: "unavailable"; readonly reason: string }
  | { readonly kind: "failed"; readonly reason: string };

export interface ConstructionChangeStore {
  getInvestigationImagery(
    investigationId: string,
  ): Promise<InvestigationImageryLookupResult>;

  persist(
    analysis: Omit<ConstructionChangeAnalysis, "id" | "createdAt">,
  ): Promise<PersistConstructionChangeAnalysisResult>;

  list(
    investigationId: string,
  ): Promise<ConstructionChangeAnalysesLookupResult>;
}
