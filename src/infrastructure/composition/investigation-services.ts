import { CreateInvestigationFromCandidate } from "@/application/investigations/create-investigation-from-candidate";
import { GetInvestigation } from "@/application/investigations/get-investigation";
import { prisma } from "@/lib/prisma";
import { PrismaInvestigationStore } from "@/infrastructure/persistence/prisma-investigation-store";

import { candidateSource } from "./candidate-services";

const investigationStore = new PrismaInvestigationStore(prisma);

export const createInvestigationFromCandidate =
  new CreateInvestigationFromCandidate(candidateSource, investigationStore);
export const getInvestigation = new GetInvestigation(investigationStore);
