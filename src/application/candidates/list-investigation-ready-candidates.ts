import type {
  CandidateSource,
  CandidateSourceResult,
} from "@/domain/candidates/candidate-source";
import type { ConstructionCandidate } from "@/domain/candidates/construction-candidate";

export type ListInvestigationReadyCandidatesResult =
  | {
      readonly kind: "available";
      readonly source: Extract<
        CandidateSourceResult,
        { kind: "available" }
      >["source"];
      readonly candidates: readonly ConstructionCandidate[];
      readonly statistics: Extract<
        CandidateSourceResult,
        { kind: "available" }
      >["statistics"];
    }
  | Extract<CandidateSourceResult, { kind: "unavailable" }>;

function isInvestigationReady(
  candidate: ConstructionCandidate,
): candidate is ConstructionCandidate & {
  readonly site: NonNullable<ConstructionCandidate["site"]>;
} {
  const location = candidate.site?.location;

  return (
    candidate.validation.status === "ACCEPTED" &&
    location?.locationState === "MAPPABLE" &&
    location.latitude !== undefined &&
    location.longitude !== undefined &&
    (location.coordinateQuality === "APPROXIMATE" ||
      location.coordinateQuality === "EXACT")
  );
}

export class ListInvestigationReadyCandidates {
  constructor(private readonly candidateSource: CandidateSource) {}

  async execute(): Promise<ListInvestigationReadyCandidatesResult> {
    const result = await this.candidateSource.listCandidates();

    if (result.kind === "unavailable") {
      return result;
    }

    return {
      kind: "available",
      source: result.source,
      candidates: result.candidates.filter(isInvestigationReady),
      statistics: result.statistics,
    };
  }
}
