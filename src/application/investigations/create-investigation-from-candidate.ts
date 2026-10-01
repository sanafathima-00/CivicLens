import { candidateIdSchema } from "@/contracts/candidates/candidate-id";
import type { CandidateSource } from "@/domain/candidates/candidate-source";
import type { ConstructionCandidate } from "@/domain/candidates/construction-candidate";
import type {
  CreateInvestigationResult,
  InvestigationStore,
} from "@/domain/investigations/investigation-store";
import type { Site } from "@/domain/sites/site";

export type CreateInvestigationFromCandidateResult =
  | CreateInvestigationResult
  | {
      readonly kind: "invalid";
      readonly message: string;
    }
  | {
      readonly kind: "candidate_not_found";
      readonly candidateId: string;
    }
  | {
      readonly kind: "candidate_not_investigation_ready";
      readonly candidateId: string;
      readonly reason: string;
    }
  | {
      readonly kind: "candidate_source_unavailable";
      readonly reason: string;
    };

function investigationReadySite(
  candidate: ConstructionCandidate,
): Site | undefined {
  const location = candidate.site?.location;

  if (
    candidate.validation.status !== "ACCEPTED" ||
    location?.locationState !== "MAPPABLE" ||
    location.latitude === undefined ||
    location.longitude === undefined ||
    (location.coordinateQuality !== "APPROXIMATE" &&
      location.coordinateQuality !== "EXACT")
  ) {
    return undefined;
  }

  return candidate.site;
}

export class CreateInvestigationFromCandidate {
  constructor(
    private readonly candidateSource: CandidateSource,
    private readonly investigationStore: InvestigationStore,
  ) {}

  async execute(
    candidateId: string,
  ): Promise<CreateInvestigationFromCandidateResult> {
    const parsed = candidateIdSchema.safeParse(candidateId);

    if (!parsed.success) {
      return {
        kind: "invalid",
        message: parsed.error.issues[0]?.message ?? "Invalid candidate ID.",
      };
    }

    const candidateResult = await this.candidateSource.getById(parsed.data);

    if (candidateResult.kind === "unavailable") {
      return {
        kind: "candidate_source_unavailable",
        reason: candidateResult.reason,
      };
    }

    if (candidateResult.kind === "not_found") {
      return {
        kind: "candidate_not_found",
        candidateId: candidateResult.candidateId,
      };
    }

    const site = investigationReadySite(candidateResult.candidate);

    if (site === undefined) {
      return {
        kind: "candidate_not_investigation_ready",
        candidateId: candidateResult.candidate.id,
        reason:
          candidateResult.candidate.validation.reason ??
          "This source record is not available for investigation.",
      };
    }

    return this.investigationStore.createForSite(site);
  }
}
