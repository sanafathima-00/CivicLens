-- CreateEnum
CREATE TYPE "ImageryComparability" AS ENUM ('COMPARABLE', 'LIMITED', 'NOT_COMPARABLE');

-- CreateEnum
CREATE TYPE "ChangeEvidenceSufficiency" AS ENUM ('SUFFICIENT_FOR_CONSERVATIVE_VISUAL_STATEMENT', 'LIMITED', 'INSUFFICIENT');

-- CreateEnum
CREATE TYPE "ChangeEpistemicState" AS ENUM ('OBSERVED', 'INFERRED', 'UNRESOLVED');

-- CreateEnum
CREATE TYPE "VisualChangeOutcome" AS ENUM ('VISIBLE_CONTEXT_CHANGE_UNCLASSIFIED', 'APPARENT_LARGE_SCALE_BUILT_CONTEXT_CHANGE', 'APPARENT_GROUND_DISTURBANCE_OR_SURFACE_CHANGE', 'APPARENT_OPEN_CONTEXT_TO_BUILT_SURFACE_CHANGE', 'NO_SIGNIFICANT_VISIBLE_CONTEXT_CHANGE', 'INSUFFICIENT_EVIDENCE');

-- CreateTable
CREATE TABLE "ConstructionChangeAnalysis" (
    "id" TEXT NOT NULL,
    "investigationId" TEXT NOT NULL,
    "beforeEvidenceItemId" TEXT NOT NULL,
    "afterEvidenceItemId" TEXT NOT NULL,
    "aoiIdentity" JSONB NOT NULL,
    "comparisonPolicyId" TEXT NOT NULL,
    "comparability" "ImageryComparability" NOT NULL,
    "deterministicFacts" JSONB NOT NULL,
    "evidenceSufficiency" "ChangeEvidenceSufficiency" NOT NULL,
    "outcome" "VisualChangeOutcome" NOT NULL,
    "epistemicState" "ChangeEpistemicState" NOT NULL,
    "observedIndicators" JSONB NOT NULL,
    "limitations" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ConstructionChangeAnalysis_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ConstructionChangeAnalysis_investigationId_createdAt_idx" ON "ConstructionChangeAnalysis"("investigationId", "createdAt");

-- CreateIndex
CREATE INDEX "ConstructionChangeAnalysis_beforeEvidenceItemId_idx" ON "ConstructionChangeAnalysis"("beforeEvidenceItemId");

-- CreateIndex
CREATE INDEX "ConstructionChangeAnalysis_afterEvidenceItemId_idx" ON "ConstructionChangeAnalysis"("afterEvidenceItemId");

-- AddForeignKey
ALTER TABLE "ConstructionChangeAnalysis" ADD CONSTRAINT "ConstructionChangeAnalysis_investigationId_fkey" FOREIGN KEY ("investigationId") REFERENCES "Investigation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConstructionChangeAnalysis" ADD CONSTRAINT "ConstructionChangeAnalysis_beforeEvidenceItemId_fkey" FOREIGN KEY ("beforeEvidenceItemId") REFERENCES "EvidenceItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConstructionChangeAnalysis" ADD CONSTRAINT "ConstructionChangeAnalysis_afterEvidenceItemId_fkey" FOREIGN KEY ("afterEvidenceItemId") REFERENCES "EvidenceItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
