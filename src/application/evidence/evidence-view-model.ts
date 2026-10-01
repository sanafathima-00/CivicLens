import type {
  EvidenceItem,
  EvidenceRetrieval,
  EvidenceTimeValue,
  InvestigationEvidencePackage,
} from "@/domain/evidence/evidence";

function timeValueViewModel(value: EvidenceTimeValue | undefined) {
  return value === undefined
    ? undefined
    : { value: value.value.toISOString(), precision: value.precision };
}

function evidenceItemViewModel(item: EvidenceItem) {
  return {
    id: item.id,
    retrievalId: item.retrievalId,
    kind: item.kind,
    sourceItemKey: item.sourceItemKey,
    label: item.label,
    provenance: {
      ...item.provenance,
      retrievedAt: item.provenance.retrievedAt.toISOString(),
    },
    capturedAt: timeValueViewModel(item.capturedAt),
    observedAt: timeValueViewModel(item.observedAt),
    publishedAt: timeValueViewModel(item.publishedAt),
    sourceUpdatedAt: timeValueViewModel(item.sourceUpdatedAt),
    completeness: item.completeness,
    integrity: item.integrity,
    qualityNotes: item.qualityNotes,
    limitations: item.limitations,
    metadata: item.metadata,
    asset: item.asset,
    createdAt: item.createdAt.toISOString(),
    updatedAt: item.updatedAt.toISOString(),
  };
}

function retrievalViewModel(retrieval: EvidenceRetrieval) {
  return {
    id: retrieval.id,
    investigationId: retrieval.investigationId,
    provenance: {
      ...retrieval.provenance,
      retrievedAt: retrieval.provenance.retrievedAt.toISOString(),
    },
    status: retrieval.status,
    retrievedAt: retrieval.retrievedAt.toISOString(),
    limitations: retrieval.limitations,
    items: retrieval.items.map(evidenceItemViewModel),
    createdAt: retrieval.createdAt.toISOString(),
  };
}

export function investigationEvidencePackageViewModel(
  value: InvestigationEvidencePackage,
) {
  return {
    investigationId: value.investigationId,
    retrievals: value.retrievals.map(retrievalViewModel),
    items: value.items.map(evidenceItemViewModel),
  };
}
