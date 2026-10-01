import { getInvestigationEvidence } from "@/infrastructure/composition/evidence-services";

import { createEvidenceGetHandler } from "./evidence-route-handlers";

export const runtime = "nodejs";

export const GET = createEvidenceGetHandler(getInvestigationEvidence);
