import { runVisionAnalysisRequestSchema } from "@/contracts/construction-change/run-vision-analysis";
import { visionAnalysisViewModel } from "@/application/construction-change/vision-analysis-view-model";
import type { RunVisionAnalysisForConstructionChange } from "@/application/construction-change/run-vision-analysis";
import type { GetVisionAnalyses } from "@/application/construction-change/get-vision-analyses";

type Context = { params: Promise<{ id: string; analysisId: string }> };

function response(result: {
  readonly kind: string;
  readonly [key: string]: unknown;
}) {
  switch (result.kind) {
    case "persisted":
      return Response.json(
        visionAnalysisViewModel(
          result.value as Parameters<typeof visionAnalysisViewModel>[0],
        ),
        { status: 201 },
      );
    case "found":
      return Response.json({
        investigationId: result.investigationId,
        analyses: (
          result.value as Parameters<typeof visionAnalysisViewModel>[0][]
        ).map(visionAnalysisViewModel),
      });
    case "invalid":
      return Response.json(
        { error: result.message as string },
        { status: 400 },
      );
    case "not_found":
      return Response.json(
        {
          error: "Investigation or construction-change analysis was not found.",
        },
        { status: 404 },
      );
    case "unprocessable":
      return Response.json(
        { error: result.message as string },
        { status: 422 },
      );
    case "unavailable":
      return Response.json(
        { error: "Vision-analysis services are currently unavailable." },
        { status: 503 },
      );
    case "invalid_output":
    case "refused":
    case "failed":
      return Response.json(
        { error: "Unable to obtain a valid visual interpretation." },
        { status: 500 },
      );
  }
}

export function createVisionAnalysisPostHandler(
  useCase: RunVisionAnalysisForConstructionChange,
) {
  return async (request: Request, context: Context) => {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return Response.json(
        { error: "A JSON vision-analysis request is required." },
        { status: 400 },
      );
    }
    if (!runVisionAnalysisRequestSchema.safeParse(body).success)
      return Response.json(
        { error: "Invalid vision-analysis request." },
        { status: 400 },
      );
    const { id, analysisId } = await context.params;
    return response(await useCase.execute(id, analysisId));
  };
}

export function createVisionAnalysisGetHandler(useCase: GetVisionAnalyses) {
  return async (_request: Request, context: Context) => {
    const { id, analysisId } = await context.params;
    return response(await useCase.execute(id, analysisId));
  };
}
