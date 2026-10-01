import { CreateConstructionChangeAnalysis } from "@/application/construction-change/create-construction-change-analysis";
import { GetConstructionChangeAnalyses } from "@/application/construction-change/get-construction-change-analyses";
import { GetVisionAnalyses } from "@/application/construction-change/get-vision-analyses";
import { RunVisionAnalysisForConstructionChange } from "@/application/construction-change/run-vision-analysis";
import type { VisionAnalyzer } from "@/domain/construction-change/vision-analyzer";
import { env } from "@/config/env";
import { prisma } from "@/lib/prisma";
import { PrismaConstructionChangeStore } from "@/infrastructure/persistence/prisma-construction-change-store";
import { PrismaVisionAnalysisStore } from "@/infrastructure/persistence/prisma-vision-analysis-store";
import { OpenAiVisionAnalyzer } from "@/infrastructure/providers/vision/openai-vision-analyzer";
import { LocalEvidenceAssetStore } from "@/infrastructure/storage/local-evidence-asset-store";
import OpenAI from "openai";

import { join } from "node:path";

const store = new PrismaConstructionChangeStore(prisma);
const visionStore = new PrismaVisionAnalysisStore(prisma);
const assetStore = new LocalEvidenceAssetStore(
  join(process.cwd(), ".civiclens-assets"),
);

export const createConstructionChangeAnalysis =
  new CreateConstructionChangeAnalysis(store, assetStore);
export const getConstructionChangeAnalyses = new GetConstructionChangeAnalyses(
  store,
);

const unavailableAnalyzer: VisionAnalyzer = {
  providerId: "openai",
  async analyze() {
    return {
      kind: "unavailable",
      reason: "Vision analysis is not configured.",
    };
  },
};
const visionAnalyzer: VisionAnalyzer =
  env.server.OPENAI_API_KEY === undefined ||
  env.server.OPENAI_MODEL === undefined
    ? unavailableAnalyzer
    : new OpenAiVisionAnalyzer(
        new OpenAI({ apiKey: env.server.OPENAI_API_KEY }),
        env.server.OPENAI_MODEL,
      );

export const runVisionAnalysisForConstructionChange =
  new RunVisionAnalysisForConstructionChange(
    visionStore,
    assetStore,
    visionAnalyzer,
  );
export const getVisionAnalyses = new GetVisionAnalyses(visionStore);
