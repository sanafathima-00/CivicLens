import { investigationViewModel } from "@/application/investigations/investigation-view-model";
import { getInvestigation } from "@/infrastructure/composition/investigation-services";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const result = await getInvestigation.execute(id);

  switch (result.kind) {
    case "found":
      return Response.json(investigationViewModel(result.value));
    case "invalid":
      return Response.json({ error: result.message }, { status: 400 });
    case "not_found":
      return Response.json(
        { error: "Investigation was not found." },
        { status: 404 },
      );
    case "unavailable":
      return Response.json(
        { error: "Investigation services are currently unavailable." },
        { status: 503 },
      );
  }
}
