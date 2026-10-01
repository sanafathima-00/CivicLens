import type {
  CandidateImportStatistics,
  CandidateSourceMetadata,
  ConstructionCandidate,
} from "./construction-candidate";

export type CandidateSourceResult =
  | {
      readonly kind: "available";
      readonly source: CandidateSourceMetadata;
      readonly candidates: readonly ConstructionCandidate[];
      readonly statistics: CandidateImportStatistics;
    }
  | {
      readonly kind: "unavailable";
      readonly source: CandidateSourceMetadata;
      readonly reason: string;
    };

export type CandidateLookupResult =
  | {
      readonly kind: "found";
      readonly candidate: ConstructionCandidate;
    }
  | {
      readonly kind: "not_found";
      readonly source: CandidateSourceMetadata;
      readonly candidateId: string;
    }
  | {
      readonly kind: "unavailable";
      readonly source: CandidateSourceMetadata;
      readonly reason: string;
    };

export interface CandidateSource {
  listCandidates(): Promise<CandidateSourceResult>;
  getById(candidateId: string): Promise<CandidateLookupResult>;
}
