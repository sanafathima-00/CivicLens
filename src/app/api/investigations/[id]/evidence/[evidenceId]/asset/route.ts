import { getInvestigationEvidenceAsset } from "@/infrastructure/composition/evidence-services";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string; evidenceId: string }> },
) {
  const { id, evidenceId } = await context.params;
  const result = await getInvestigationEvidenceAsset.execute(id, evidenceId);

  switch (result.kind) {
    case "found":
      return new Response(
        result.bytes.buffer.slice(
          result.bytes.byteOffset,
          result.bytes.byteOffset + result.bytes.byteLength,
        ) as ArrayBuffer,
        {
          headers: {
            "Content-Type": result.contentType,
            "Cache-Control": "private, max-age=3600",
          },
        },
      );
    case "invalid":
      return Response.json({ error: result.message }, { status: 400 });
    case "not_found":
      return Response.json(
        { error: "Evidence asset was not found." },
        { status: 404 },
      );
    case "unavailable":
      return Response.json(
        { error: "Evidence asset storage is currently unavailable." },
        { status: 503 },
      );
    case "failed":
      return Response.json(
        { error: "Unable to load the evidence asset." },
        { status: 500 },
      );
  }
}
