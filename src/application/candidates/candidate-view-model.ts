import type { ConstructionCandidate } from "@/domain/candidates/construction-candidate";

function dateValue(value: Date): string {
  return value.toISOString();
}

export function constructionCandidateViewModel(
  candidate: ConstructionCandidate,
) {
  return {
    candidateId: candidate.id,
    site:
      candidate.site === undefined
        ? undefined
        : {
            id: candidate.site.id,
            label: candidate.site.label,
            origin: {
              ...candidate.site.origin,
              retrievedAt: dateValue(candidate.site.origin.retrievedAt),
            },
            location: candidate.site.location,
          },
    sourceRecord: candidate.sourceRecord,
    validation: candidate.validation,
    locationSemantics: candidate.locationSemantics,
  };
}

export function candidateSourceViewModel(
  source: ConstructionCandidate["source"],
) {
  return {
    providerId: source.providerId,
    providerLabel: source.providerLabel,
    sourceType: source.sourceType,
    dataClassification: source.dataClassification,
    isLive: source.isLive,
    datasetName: source.datasetName,
    resourceName: source.resourceName,
    resourceId: source.resourceId,
    sourceReference: source.sourceReference,
    upstreamAttribution: source.upstreamAttribution,
    sourceVersion: source.sourceVersion,
    retrievedAt: dateValue(source.retrievedAt),
    contentHash: source.contentHash,
    licenseDesignation: source.licenseDesignation,
  };
}
