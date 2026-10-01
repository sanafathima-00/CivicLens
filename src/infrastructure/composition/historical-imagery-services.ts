import { join } from "node:path";

import { RetrieveHistoricalImageryForInvestigation } from "@/application/imagery/retrieve-historical-imagery-for-investigation";
import { prisma } from "@/lib/prisma";
import { PrismaEvidenceStore } from "@/infrastructure/persistence/prisma-evidence-store";
import { PlanetaryComputerSentinel2Provider } from "@/infrastructure/providers/imagery/planetary-computer-sentinel2-provider";
import { LocalEvidenceAssetStore } from "@/infrastructure/storage/local-evidence-asset-store";

const evidenceStore = new PrismaEvidenceStore(prisma);
const imageryProvider = new PlanetaryComputerSentinel2Provider();
const assetStore = new LocalEvidenceAssetStore(
  join(process.cwd(), ".civiclens-assets"),
);

export const retrieveHistoricalImageryForInvestigation =
  new RetrieveHistoricalImageryForInvestigation(
    evidenceStore,
    imageryProvider,
    assetStore,
  );
