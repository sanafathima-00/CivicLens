import { ListConstructionCandidates } from "@/application/candidates/list-construction-candidates";
import { ListInvestigationReadyCandidates } from "@/application/candidates/list-investigation-ready-candidates";
import { OpenCitySeiaaCandidateSource } from "@/infrastructure/providers/opencity/seiaa-candidate-source";

const candidateSource = new OpenCitySeiaaCandidateSource();

export const listConstructionCandidates = new ListConstructionCandidates(
  candidateSource,
);
export const listInvestigationReadyCandidates =
  new ListInvestigationReadyCandidates(candidateSource);

export { candidateSource };
