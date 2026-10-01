import type {
  CandidateSource,
  CandidateSourceResult,
} from "@/domain/candidates/candidate-source";

export class ListConstructionCandidates {
  constructor(private readonly candidateSource: CandidateSource) {}

  async execute(): Promise<CandidateSourceResult> {
    return this.candidateSource.listCandidates();
  }
}
