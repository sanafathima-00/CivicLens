import { createInvestigationInputSchema } from "@/contracts/investigations/create-investigation";
import { investigationViewModel } from "@/application/investigations/investigation-view-model";
import { createInvestigationFromCandidate } from "@/infrastructure/composition/investigation-services";

export const runtime = "nodejs";

export async function POST(request: Request) {
  let payload: unknown;

  try {
    payload = await request.json();
  } catch {
    return Response.json(
      { error: "Request body must be valid JSON." },
      { status: 400 },
    );
  }

  const parsed = createInvestigationInputSchema.safeParse(payload);

  if (!parsed.success) {
    return Response.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid request." },
      { status: 400 },
    );
  }

  const result = await createInvestigationFromCandidate.execute(
    parsed.data.candidateId,
  );

  switch (result.kind) {
    case "created":
      return Response.json(
        investigationViewModel({
          investigation: result.investigation,
          site: result.site,
        }),
        { status: 201 },
      );
    case "invalid":
      return Response.json({ error: result.message }, { status: 400 });
    case "candidate_not_found":
      return Response.json(
        { error: "The selected construction candidate was not found." },
        { status: 404 },
      );
    case "candidate_not_investigation_ready":
      return Response.json(
        { error: "This source record is not available for investigation." },
        { status: 422 },
      );
    case "candidate_source_unavailable":
    case "unavailable":
      return Response.json(
        { error: "Investigation services are currently unavailable." },
        { status: 503 },
      );
    case "failed":
      return Response.json(
        { error: "Unable to create the investigation." },
        { status: 500 },
      );
  }
}
