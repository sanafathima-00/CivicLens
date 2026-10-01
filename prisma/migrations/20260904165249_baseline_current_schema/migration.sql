-- CreateEnum
CREATE TYPE "ComplaintStatus" AS ENUM ('REPORTED', 'ACKNOWLEDGED', 'ASSIGNED', 'IN_PROGRESS', 'MARKED_RESOLVED', 'CLOSED', 'REOPENED', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "ComplaintCategory" AS ENUM ('WATERLOGGING', 'ILLEGAL_DUMPING', 'DRAIN_OBSTRUCTION', 'ENCROACHMENT', 'CONSTRUCTION_DEBRIS', 'ROAD_BLOCKAGE', 'OTHER');

-- CreateEnum
CREATE TYPE "ComplaintSourceKind" AS ENUM ('SEEDED_DEMO', 'AUTHORIZED_EXTERNAL');

-- CreateEnum
CREATE TYPE "ComplaintSourceEventType" AS ENUM ('REPORTED', 'ACKNOWLEDGED', 'ASSIGNED', 'WORK_REPORTED', 'STATUS_CHANGED', 'MARKED_RESOLVED', 'CLOSED', 'REOPENED', 'NOTE');

-- CreateEnum
CREATE TYPE "SiteSourceType" AS ENUM ('SEEDED_DEMO', 'ANALYST_PREPARED', 'GOVERNMENT_BUILDING_PERMISSION', 'K_RERA', 'GIS', 'OPENCITY', 'VERIFIED_PUBLIC', 'OTHER');

-- CreateEnum
CREATE TYPE "CoordinateQuality" AS ENUM ('EXACT', 'APPROXIMATE', 'PREPARED');

-- CreateEnum
CREATE TYPE "SiteLocationState" AS ENUM ('MAPPABLE', 'NOT_MAPPABLE', 'UNRESOLVED');

-- CreateEnum
CREATE TYPE "EvidenceRole" AS ENUM ('ORIGINAL', 'BEFORE', 'LATEST', 'SUPPORTING', 'AUTHORITY_RESPONSE');

-- CreateEnum
CREATE TYPE "EvidenceProvenance" AS ENUM ('SOURCE_COMPLAINT', 'PREPARED', 'SIMULATED', 'GENERATED', 'LICENSED_EXTERNAL', 'AUTHORITY_RESPONSE');

-- CreateEnum
CREATE TYPE "AssessmentOutcome" AS ENUM ('RESOLVED', 'LIKELY_UNRESOLVED', 'INCONCLUSIVE');

-- CreateEnum
CREATE TYPE "CaseLifecycleStatus" AS ENUM ('OPEN', 'VERIFIED', 'ESCALATED', 'RESPONSE_RECORDED', 'CLOSED');

-- CreateEnum
CREATE TYPE "CaseActorType" AS ENUM ('USER', 'SYSTEM', 'PROVIDER', 'AUTHORITY');

-- CreateEnum
CREATE TYPE "CaseEventType" AS ENUM ('COMPLAINT_RETRIEVED', 'EVIDENCE_RETRIEVED', 'ASSESSMENT_CREATED', 'ESCALATION_PACKAGE_GENERATED', 'ESCALATION_ACTION_RECORDED', 'AUTHORITY_RESPONSE_RECORDED', 'REVERIFICATION_CREATED');

-- CreateEnum
CREATE TYPE "EscalationActionStatus" AS ENUM ('GENERATED', 'SIMULATED', 'QUEUED', 'SENT', 'DELIVERED', 'FAILED', 'RESPONSE_RECORDED');

-- CreateTable
CREATE TABLE "Complaint" (
    "id" TEXT NOT NULL,
    "complaintNumber" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerComplaintId" TEXT NOT NULL,
    "sourceKind" "ComplaintSourceKind" NOT NULL,
    "title" TEXT NOT NULL,
    "category" "ComplaintCategory" NOT NULL,
    "description" TEXT NOT NULL,
    "sourceStatus" "ComplaintStatus" NOT NULL,
    "sourceStatusRaw" TEXT,
    "reportedAt" TIMESTAMP(3) NOT NULL,
    "sourceUpdatedAt" TIMESTAMP(3),
    "markedResolvedAt" TIMESTAMP(3),
    "closedAt" TIMESTAMP(3),
    "sourceRecordReference" TEXT,
    "sourceOriginalEvidenceReference" TEXT,
    "sourceRetrievedAt" TIMESTAMP(3) NOT NULL,
    "normalizedRecordVersion" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Complaint_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Site" (
    "id" TEXT NOT NULL,
    "label" TEXT,
    "originProviderId" TEXT NOT NULL,
    "originProviderLabel" TEXT NOT NULL,
    "originSourceType" "SiteSourceType" NOT NULL,
    "originIsLive" BOOLEAN NOT NULL,
    "originExternalRecordId" TEXT,
    "originRetrievedAt" TIMESTAMP(3) NOT NULL,
    "originSourceReference" TEXT,
    "originSourceVersion" TEXT,
    "latitude" DECIMAL(65,30),
    "longitude" DECIMAL(65,30),
    "coordinatePrecisionMeters" INTEGER,
    "coordinateQuality" "CoordinateQuality",
    "locationState" "SiteLocationState" NOT NULL,
    "displayAddress" TEXT,
    "locality" TEXT,
    "neighborhood" TEXT,
    "city" TEXT,
    "postalCode" TEXT,
    "descriptiveLocation" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Site_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Location" (
    "id" TEXT NOT NULL,
    "complaintId" TEXT NOT NULL,
    "latitude" DECIMAL(9,6),
    "longitude" DECIMAL(9,6),
    "coordinatePrecision" INTEGER,
    "coordinateSource" TEXT,
    "displayAddress" TEXT,
    "landmark" TEXT,
    "jurisdiction" TEXT,
    "zone" TEXT,
    "ward" TEXT,
    "boundaryReference" TEXT,
    "boundaryVersion" TEXT,
    "matchQuality" TEXT,
    "limitationNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Location_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ComplaintSourceEvent" (
    "id" TEXT NOT NULL,
    "complaintId" TEXT NOT NULL,
    "providerEventId" TEXT NOT NULL,
    "eventType" "ComplaintSourceEventType" NOT NULL,
    "rawEventType" TEXT,
    "resultingSourceStatus" "ComplaintStatus",
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "summary" TEXT NOT NULL,
    "sourceRecordReference" TEXT,
    "sourceEventVersion" TEXT,
    "importedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ComplaintSourceEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EvidenceAsset" (
    "id" TEXT NOT NULL,
    "complaintId" TEXT,
    "role" "EvidenceRole" NOT NULL,
    "provider" TEXT NOT NULL,
    "providerReference" TEXT,
    "storageReference" TEXT NOT NULL,
    "provenance" "EvidenceProvenance" NOT NULL,
    "capturedAt" TIMESTAMP(3),
    "publishedAt" TIMESTAMP(3),
    "retrievedAt" TIMESTAMP(3),
    "availableAt" TIMESTAMP(3),
    "locationCoverage" JSONB,
    "viewpoint" TEXT,
    "qualityNotes" TEXT,
    "contentType" TEXT,
    "byteSize" INTEGER,
    "integrityHash" TEXT,
    "accessClassification" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EvidenceAsset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Case" (
    "id" TEXT NOT NULL,
    "complaintId" TEXT NOT NULL,
    "currentStatus" "CaseLifecycleStatus" NOT NULL DEFAULT 'OPEN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Case_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuthorityAssignment" (
    "id" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "jurisdiction" TEXT,
    "zone" TEXT,
    "ward" TEXT,
    "service" TEXT,
    "department" TEXT,
    "authorityRole" TEXT,
    "ruleReference" TEXT,
    "mappingSource" TEXT,
    "mappingVersion" TEXT,
    "limitationNotes" TEXT,
    "resolvedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuthorityAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VerificationAssessment" (
    "id" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "beforeEvidenceId" TEXT NOT NULL,
    "latestEvidenceId" TEXT NOT NULL,
    "outcome" "AssessmentOutcome" NOT NULL,
    "modelConfidenceLabel" TEXT,
    "modelConfidenceValue" DECIMAL(5,2),
    "observations" JSONB NOT NULL,
    "limitations" JSONB NOT NULL,
    "recommendation" TEXT,
    "serviceVersion" TEXT,
    "configurationReference" TEXT,
    "schemaVersion" TEXT NOT NULL,
    "validationStatus" TEXT NOT NULL,
    "failureContext" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VerificationAssessment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CaseEvent" (
    "id" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "eventType" "CaseEventType" NOT NULL,
    "actorType" "CaseActorType" NOT NULL,
    "affectedRecord" TEXT,
    "correlationId" TEXT,
    "summary" TEXT NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CaseEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EscalationPackage" (
    "id" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "contentReference" TEXT,
    "includedEvidence" JSONB NOT NULL,
    "includedMapping" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EscalationPackage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EscalationAction" (
    "id" TEXT NOT NULL,
    "escalationPackageId" TEXT NOT NULL,
    "status" "EscalationActionStatus" NOT NULL,
    "deliveryProvider" TEXT,
    "deliveryReference" TEXT,
    "deliveryEvidence" JSONB,
    "failureSummary" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EscalationAction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Complaint_complaintNumber_key" ON "Complaint"("complaintNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Complaint_provider_providerComplaintId_key" ON "Complaint"("provider", "providerComplaintId");

-- CreateIndex
CREATE INDEX "Site_originProviderId_idx" ON "Site"("originProviderId");

-- CreateIndex
CREATE INDEX "Site_originSourceType_idx" ON "Site"("originSourceType");

-- CreateIndex
CREATE UNIQUE INDEX "Location_complaintId_key" ON "Location"("complaintId");

-- CreateIndex
CREATE INDEX "ComplaintSourceEvent_complaintId_occurredAt_idx" ON "ComplaintSourceEvent"("complaintId", "occurredAt");

-- CreateIndex
CREATE UNIQUE INDEX "ComplaintSourceEvent_complaintId_providerEventId_key" ON "ComplaintSourceEvent"("complaintId", "providerEventId");

-- CreateIndex
CREATE UNIQUE INDEX "EscalationPackage_caseId_version_key" ON "EscalationPackage"("caseId", "version");

-- AddForeignKey
ALTER TABLE "Location" ADD CONSTRAINT "Location_complaintId_fkey" FOREIGN KEY ("complaintId") REFERENCES "Complaint"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ComplaintSourceEvent" ADD CONSTRAINT "ComplaintSourceEvent_complaintId_fkey" FOREIGN KEY ("complaintId") REFERENCES "Complaint"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EvidenceAsset" ADD CONSTRAINT "EvidenceAsset_complaintId_fkey" FOREIGN KEY ("complaintId") REFERENCES "Complaint"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Case" ADD CONSTRAINT "Case_complaintId_fkey" FOREIGN KEY ("complaintId") REFERENCES "Complaint"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuthorityAssignment" ADD CONSTRAINT "AuthorityAssignment_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "Case"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VerificationAssessment" ADD CONSTRAINT "VerificationAssessment_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "Case"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VerificationAssessment" ADD CONSTRAINT "VerificationAssessment_beforeEvidenceId_fkey" FOREIGN KEY ("beforeEvidenceId") REFERENCES "EvidenceAsset"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VerificationAssessment" ADD CONSTRAINT "VerificationAssessment_latestEvidenceId_fkey" FOREIGN KEY ("latestEvidenceId") REFERENCES "EvidenceAsset"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CaseEvent" ADD CONSTRAINT "CaseEvent_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "Case"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EscalationPackage" ADD CONSTRAINT "EscalationPackage_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "Case"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EscalationAction" ADD CONSTRAINT "EscalationAction_escalationPackageId_fkey" FOREIGN KEY ("escalationPackageId") REFERENCES "EscalationPackage"("id") ON DELETE CASCADE ON UPDATE CASCADE;
