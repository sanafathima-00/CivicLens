-- CreateTable
CREATE TABLE "VisionAnalysis" (
    "id" TEXT NOT NULL,
    "constructionChangeAnalysisId" TEXT NOT NULL,
    "beforeEvidenceItemId" TEXT NOT NULL,
    "afterEvidenceItemId" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "providerLabel" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "promptVersion" TEXT NOT NULL,
    "schemaVersion" TEXT NOT NULL,
    "inputFingerprint" TEXT NOT NULL,
    "outcome" "VisualChangeOutcome" NOT NULL,
    "epistemicState" "ChangeEpistemicState" NOT NULL,
    "observedIndicators" JSONB NOT NULL,
    "interpretation" TEXT,
    "limitations" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VisionAnalysis_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "VisionAnalysis_constructionChangeAnalysisId_createdAt_idx" ON "VisionAnalysis"("constructionChangeAnalysisId", "createdAt");

-- CreateIndex
CREATE INDEX "VisionAnalysis_providerId_model_idx" ON "VisionAnalysis"("providerId", "model");

-- CreateIndex
CREATE INDEX "VisionAnalysis_beforeEvidenceItemId_idx" ON "VisionAnalysis"("beforeEvidenceItemId");

-- CreateIndex
CREATE INDEX "VisionAnalysis_afterEvidenceItemId_idx" ON "VisionAnalysis"("afterEvidenceItemId");

-- AddForeignKey
ALTER TABLE "VisionAnalysis" ADD CONSTRAINT "VisionAnalysis_constructionChangeAnalysisId_fkey" FOREIGN KEY ("constructionChangeAnalysisId") REFERENCES "ConstructionChangeAnalysis"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VisionAnalysis" ADD CONSTRAINT "VisionAnalysis_beforeEvidenceItemId_fkey" FOREIGN KEY ("beforeEvidenceItemId") REFERENCES "EvidenceItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VisionAnalysis" ADD CONSTRAINT "VisionAnalysis_afterEvidenceItemId_fkey" FOREIGN KEY ("afterEvidenceItemId") REFERENCES "EvidenceItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
