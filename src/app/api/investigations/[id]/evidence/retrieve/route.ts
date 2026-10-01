import { retrieveEvidenceForInvestigation } from "@/infrastructure/composition/evidence-services";

import { createEvidenceRetrieveHandler } from "../evidence-route-handlers";

export const runtime = "nodejs";

export const POST = createEvidenceRetrieveHandler(
  retrieveEvidenceForInvestigation,
);
