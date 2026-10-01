import {
  candidateSourceViewModel,
  constructionCandidateViewModel,
} from "@/application/candidates/candidate-view-model";
import { listInvestigationReadyCandidates } from "@/infrastructure/composition/candidate-services";

export const runtime = "nodejs";

export async function GET() {
  const result = await listInvestigationReadyCandidates.execute();

  if (result.kind === "unavailable") {
    return Response.json(
      { error: "Construction candidates are currently unavailable." },
      { status: 503 },
    );
  }

  return Response.json({
    source: candidateSourceViewModel(result.source),
    statistics: result.statistics,
    candidates: result.candidates.map(constructionCandidateViewModel),
  });
}
