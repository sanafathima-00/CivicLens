import { historicalImageryRequestSchema } from "@/contracts/imagery/retrieve-historical-imagery";
import type { RetrieveHistoricalImageryForInvestigation } from "@/application/imagery/retrieve-historical-imagery-for-investigation";
import { investigationEvidencePackageViewModel } from "@/application/evidence/evidence-view-model";

type RouteContext = { params: Promise<{ id: string }> };

export function createHistoricalImageryRetrieveHandler(
  retrieveHistoricalImageryForInvestigation: RetrieveHistoricalImageryForInvestigation,
) {
  return async function retrieve(request: Request, context: RouteContext) {
    const { id } = await context.params;
    let input: unknown;
    try {
      input = await request.json();
    } catch {
      return Response.json(
        { error: "A JSON imagery retrieval request is required." },
        { status: 400 },
      );
    }
    const parsed = historicalImageryRequestSchema.safeParse(input);
    if (!parsed.success) {
      return Response.json(
        {
          error:
            parsed.error.issues[0]?.message ??
            "Invalid imagery retrieval request.",
        },
        { status: 400 },
      );
    }

    const result = await retrieveHistoricalImageryForInvestigation.execute(
      id,
      parsed.data,
    );
    switch (result.kind) {
      case "persisted":
        return Response.json(
          investigationEvidencePackageViewModel(result.value),
          { status: 201 },
        );
      case "invalid":
        return Response.json({ error: result.message }, { status: 400 });
      case "not_found":
        return Response.json(
          { error: "Investigation was not found." },
          { status: 404 },
        );
      case "unprocessable":
        return Response.json({ error: result.message }, { status: 422 });
      case "unavailable":
        return Response.json(
          { error: "Imagery services are currently unavailable." },
          { status: 503 },
        );
      case "failed":
        return Response.json(
          { error: "Unable to retrieve historical imagery." },
          { status: 500 },
        );
    }
  };
}
