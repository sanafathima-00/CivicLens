import { investigationEvidencePackageViewModel } from "@/application/evidence/evidence-view-model";
import type { GetInvestigationEvidence } from "@/application/evidence/get-investigation-evidence";
import type { RetrieveEvidenceForInvestigation } from "@/application/evidence/retrieve-evidence-for-investigation";

type RouteContext = { params: Promise<{ id: string }> };

/**
 * Keeps production composition in the route modules while allowing isolated
 * route tests to substitute only the provider-facing use case dependency.
 */
export function createEvidenceGetHandler(
  getInvestigationEvidence: GetInvestigationEvidence,
) {
  return async function get(_request: Request, context: RouteContext) {
    const { id } = await context.params;
    const result = await getInvestigationEvidence.execute(id);

    switch (result.kind) {
      case "found":
        return Response.json(
          investigationEvidencePackageViewModel(result.value),
        );
      case "invalid":
        return Response.json({ error: result.message }, { status: 400 });
      case "not_found":
        return Response.json(
          { error: "Investigation was not found." },
          { status: 404 },
        );
      case "unavailable":
        return Response.json(
          { error: "Evidence services are currently unavailable." },
          { status: 503 },
        );
      case "failed":
        return Response.json(
          { error: "Unable to retrieve the evidence package." },
          { status: 500 },
        );
    }
  };
}

export function createEvidenceRetrieveHandler(
  retrieveEvidenceForInvestigation: RetrieveEvidenceForInvestigation,
) {
  return async function retrieve(_request: Request, context: RouteContext) {
    const { id } = await context.params;
    const result = await retrieveEvidenceForInvestigation.execute(id);

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
      case "unavailable":
        return Response.json(
          { error: "Evidence services are currently unavailable." },
          { status: 503 },
        );
      case "failed":
        return Response.json(
          { error: "Unable to retrieve evidence for this investigation." },
          { status: 500 },
        );
    }
  };
}
