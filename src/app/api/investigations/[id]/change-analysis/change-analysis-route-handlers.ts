import { constructionChangeAnalysisRequestSchema } from "@/contracts/construction-change/create-construction-change-analysis";
import { constructionChangeAnalysisViewModel } from "@/application/construction-change/construction-change-view-model";
import type { CreateConstructionChangeAnalysis } from "@/application/construction-change/create-construction-change-analysis";
import type { GetConstructionChangeAnalyses } from "@/application/construction-change/get-construction-change-analyses";

type RouteContext = { params: Promise<{ id: string }> };

export function createConstructionChangeAnalysisPostHandler(
  useCase: CreateConstructionChangeAnalysis,
) {
  return async function post(request: Request, context: RouteContext) {
    const { id } = await context.params;
    let input: unknown;
    try {
      input = await request.json();
    } catch {
      return Response.json(
        { error: "A JSON change-analysis request is required." },
        { status: 400 },
      );
    }
    const parsed = constructionChangeAnalysisRequestSchema.safeParse(input);
    if (!parsed.success) {
      return Response.json(
        {
          error:
            parsed.error.issues[0]?.message ??
            "Invalid change-analysis request.",
        },
        { status: 400 },
      );
    }
    const result = await useCase.execute(id, parsed.data);
    switch (result.kind) {
      case "persisted":
        return Response.json(
          constructionChangeAnalysisViewModel(result.value),
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
          { error: "Construction-change services are currently unavailable." },
          { status: 503 },
        );
      case "failed":
        return Response.json(
          { error: "Unable to prepare the deterministic imagery comparison." },
          { status: 500 },
        );
    }
  };
}

export function createConstructionChangeAnalysisGetHandler(
  useCase: GetConstructionChangeAnalyses,
) {
  return async function get(_request: Request, context: RouteContext) {
    const { id } = await context.params;
    const result = await useCase.execute(id);
    switch (result.kind) {
      case "found":
        return Response.json({
          investigationId: result.investigationId,
          analyses: result.value.map(constructionChangeAnalysisViewModel),
        });
      case "invalid":
        return Response.json({ error: result.message }, { status: 400 });
      case "not_found":
        return Response.json(
          { error: "Investigation was not found." },
          { status: 404 },
        );
      case "unavailable":
        return Response.json(
          { error: "Construction-change services are currently unavailable." },
          { status: 503 },
        );
      case "failed":
        return Response.json(
          { error: "Unable to retrieve deterministic imagery comparisons." },
          { status: 500 },
        );
    }
  };
}
