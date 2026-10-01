-- CreateEnum
CREATE TYPE "EvidenceKind" AS ENUM ('SITE_SOURCE_RECORD', 'IMAGERY', 'DOCUMENT', 'GOVERNMENT_RECORD', 'CIVIC_SIGNAL', 'SPATIAL_DATA', 'ADMINISTRATIVE_RECORD', 'OTHER');

-- CreateEnum
CREATE TYPE "EvidenceSourceClassification" AS ENUM ('LIVE_SOURCE', 'IMPORTED_SNAPSHOT', 'PREPARED', 'SEEDED_TEST');

-- CreateEnum
CREATE TYPE "EvidenceRetrievalStatus" AS ENUM ('AVAILABLE', 'PARTIAL', 'UNAVAILABLE', 'UNRESOLVED');

-- CreateEnum
CREATE TYPE "EvidenceTimePrecision" AS ENUM ('EXACT', 'DATE', 'MONTH', 'YEAR', 'APPROXIMATE');

-- CreateEnum
CREATE TYPE "EvidenceCompleteness" AS ENUM ('COMPLETE', 'PARTIAL', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "EvidenceIntegrity" AS ENUM ('VERIFIED_BY_HASH', 'SOURCE_DECLARED', 'NOT_VERIFIED');

-- CreateTable
CREATE TABLE "EvidenceRetrieval" (
    "id" TEXT NOT NULL,
    "investigationId" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "providerLabel" TEXT NOT NULL,
    "sourceClassification" "EvidenceSourceClassification" NOT NULL,
    "isLive" BOOLEAN NOT NULL,
    "status" "EvidenceRetrievalStatus" NOT NULL,
    "sourceVersion" TEXT,
    "sourceReference" TEXT,
    "sourceContentHash" TEXT,
    "licenseDesignation" TEXT,
    "retrievedAt" TIMESTAMP(3) NOT NULL,
    "limitations" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EvidenceRetrieval_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EvidenceItem" (
    "id" TEXT NOT NULL,
    "retrievalId" TEXT NOT NULL,
    "kind" "EvidenceKind" NOT NULL,
    "sourceItemKey" TEXT NOT NULL,
    "label" TEXT,
    "externalRecordId" TEXT,
    "sourceReference" TEXT,
    "sourceVersion" TEXT,
    "capturedAt" TIMESTAMP(3),
    "capturedAtPrecision" "EvidenceTimePrecision",
    "observedAt" TIMESTAMP(3),
    "observedAtPrecision" "EvidenceTimePrecision",
    "publishedAt" TIMESTAMP(3),
    "publishedAtPrecision" "EvidenceTimePrecision",
    "sourceUpdatedAt" TIMESTAMP(3),
    "sourceUpdatedPrecision" "EvidenceTimePrecision",
    "completeness" "EvidenceCompleteness" NOT NULL,
    "integrity" "EvidenceIntegrity" NOT NULL,
    "qualityNotes" TEXT,
    "limitations" JSONB NOT NULL,
    "metadata" JSONB NOT NULL,
    "assetStorageKey" TEXT,
    "assetContentType" TEXT,
    "assetByteSize" INTEGER,
    "assetSha256" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EvidenceItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "EvidenceRetrieval_investigationId_retrievedAt_idx" ON "EvidenceRetrieval"("investigationId", "retrievedAt");

-- CreateIndex
CREATE INDEX "EvidenceRetrieval_investigationId_providerId_idx" ON "EvidenceRetrieval"("investigationId", "providerId");

-- CreateIndex
CREATE INDEX "EvidenceItem_retrievalId_kind_sourceItemKey_idx" ON "EvidenceItem"("retrievalId", "kind", "sourceItemKey");

-- CreateIndex
CREATE INDEX "EvidenceItem_assetSha256_idx" ON "EvidenceItem"("assetSha256");

-- CreateIndex
CREATE UNIQUE INDEX "EvidenceItem_retrievalId_sourceItemKey_key" ON "EvidenceItem"("retrievalId", "sourceItemKey");

-- AddForeignKey
ALTER TABLE "EvidenceRetrieval" ADD CONSTRAINT "EvidenceRetrieval_investigationId_fkey" FOREIGN KEY ("investigationId") REFERENCES "Investigation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EvidenceItem" ADD CONSTRAINT "EvidenceItem_retrievalId_fkey" FOREIGN KEY ("retrievalId") REFERENCES "EvidenceRetrieval"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
