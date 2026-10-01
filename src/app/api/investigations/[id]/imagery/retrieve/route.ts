import { retrieveHistoricalImageryForInvestigation } from "@/infrastructure/composition/historical-imagery-services";

import { createHistoricalImageryRetrieveHandler } from "../imagery-route-handlers";

export const runtime = "nodejs";

export const POST = createHistoricalImageryRetrieveHandler(
  retrieveHistoricalImageryForInvestigation,
);
