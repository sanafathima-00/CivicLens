import type { VisionAnalysis } from "./vision-analysis";
import type { EvidenceItem } from "@/domain/evidence/evidence";

export type VisionAnalysisParentLookup =
  | {
      readonly kind: "found";
      readonly investigationId: string;
      readonly value: import("./construction-change-analysis").ConstructionChangeAnalysis;
    }
  | { readonly kind: "not_found"; readonly investigationId: string }
  | { readonly kind: "unprocessable"; readonly message: string }
  | { readonly kind: "unavailable"; readonly reason: string }
  | { readonly kind: "failed"; readonly reason: string };

export type PersistVisionAnalysisResult =
  | { readonly kind: "persisted"; readonly value: VisionAnalysis }
  | { readonly kind: "unprocessable"; readonly message: string }
  | { readonly kind: "unavailable"; readonly reason: string }
  | { readonly kind: "failed"; readonly reason: string };

export type VisionAnalysesLookupResult =
  | {
      readonly kind: "found";
      readonly investigationId: string;
      readonly value: readonly VisionAnalysis[];
    }
  | { readonly kind: "not_found"; readonly investigationId: string }
  | { readonly kind: "unavailable"; readonly reason: string }
  | { readonly kind: "failed"; readonly reason: string };

export interface VisionAnalysisStore {
  getParent(
    investigationId: string,
    analysisId: string,
  ): Promise<VisionAnalysisParentLookup>;
  getInput(
    investigationId: string,
    analysisId: string,
  ): Promise<
    | {
        readonly kind: "found";
        readonly investigationId: string;
        readonly analysis: import("./construction-change-analysis").ConstructionChangeAnalysis;
        readonly before: EvidenceItem;
        readonly after: EvidenceItem;
      }
    | { readonly kind: "not_found"; readonly investigationId: string }
    | { readonly kind: "unprocessable"; readonly message: string }
    | { readonly kind: "unavailable"; readonly reason: string }
    | { readonly kind: "failed"; readonly reason: string }
  >;
  persist(
    value: Omit<VisionAnalysis, "id" | "createdAt">,
  ): Promise<PersistVisionAnalysisResult>;
  list(
    investigationId: string,
    analysisId: string,
  ): Promise<VisionAnalysesLookupResult>;
}
