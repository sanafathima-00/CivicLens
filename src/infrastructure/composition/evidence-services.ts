import { GetInvestigationEvidence } from "@/application/evidence/get-investigation-evidence";
import { GetInvestigationEvidenceAsset } from "@/application/evidence/get-investigation-evidence-asset";
import { RetrieveEvidenceForInvestigation } from "@/application/evidence/retrieve-evidence-for-investigation";
import { prisma } from "@/lib/prisma";
import { PrismaEvidenceStore } from "@/infrastructure/persistence/prisma-evidence-store";
import { PersistedSiteOriginEvidenceProvider } from "@/infrastructure/providers/evidence/persisted-site-origin-evidence-provider";
import { LocalEvidenceAssetStore } from "@/infrastructure/storage/local-evidence-asset-store";

import { join } from "node:path";

const evidenceStore = new PrismaEvidenceStore(prisma);
const assetStore = new LocalEvidenceAssetStore(
  join(process.cwd(), ".civiclens-assets"),
);
const evidenceProviders = [new PersistedSiteOriginEvidenceProvider()];

export const retrieveEvidenceForInvestigation =
  new RetrieveEvidenceForInvestigation(evidenceStore, evidenceProviders);
export const getInvestigationEvidence = new GetInvestigationEvidence(
  evidenceStore,
);
export const getInvestigationEvidenceAsset = new GetInvestigationEvidenceAsset(
  evidenceStore,
  assetStore,
);
