import { investigationIdSchema } from "@/contracts/investigations/get-investigation";
import type {
  EvidenceStore,
  PersistEvidenceRetrievalsResult,
} from "@/domain/evidence/evidence-store";
import {
  EVIDENCE_KINDS,
  EVIDENCE_RETRIEVAL_STATUSES,
  EVIDENCE_SOURCE_CLASSIFICATIONS,
  EVIDENCE_TIME_PRECISIONS,
  type EvidenceProvenance,
  type ProviderEvidenceResult,
  type EvidenceTimeValue,
} from "@/domain/evidence/evidence";
import type { SiteEvidenceProvider } from "@/domain/evidence/site-evidence-provider";

export type RetrieveEvidenceForInvestigationResult =
  | PersistEvidenceRetrievalsResult
  | { readonly kind: "invalid"; readonly message: string }
  | { readonly kind: "not_found"; readonly investigationId: string };

function validDate(value: Date): boolean {
  return Number.isFinite(value.getTime());
}

function validJsonValue(value: unknown): boolean {
  if (
    value === null ||
    typeof value === "string" ||
    typeof value === "boolean"
  ) {
    return true;
  }
  if (typeof value === "number") {
    return Number.isFinite(value);
  }
  if (Array.isArray(value)) {
    return value.every(validJsonValue);
  }
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) {
    return false;
  }
  return Object.values(value).every(validJsonValue);
}

function validMetadata(
  value: unknown,
): value is Readonly<Record<string, unknown>> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false;
  }

  return validJsonValue(value);
}

function validProvenance(value: EvidenceProvenance): boolean {
  return (
    value.providerId.trim().length > 0 &&
    value.providerLabel.trim().length > 0 &&
    !/[\r\n]/.test(value.providerId) &&
    !/[\r\n]/.test(value.providerLabel) &&
    !/[\r\n]/.test(value.sourceReference ?? "") &&
    !/[\r\n]/.test(value.externalRecordId ?? "") &&
    EVIDENCE_SOURCE_CLASSIFICATIONS.includes(value.sourceClassification) &&
    validDate(value.retrievedAt) &&
    (value.sourceClassification === "LIVE_SOURCE") === value.isLive
  );
}

function validTimeValue(value: EvidenceTimeValue | undefined): boolean {
  return (
    value === undefined ||
    (validDate(value.value) &&
      EVIDENCE_TIME_PRECISIONS.includes(value.precision))
  );
}

function validProviderResult(result: ProviderEvidenceResult): boolean {
  if (
    !validProvenance(result.provenance) ||
    !EVIDENCE_RETRIEVAL_STATUSES.includes(result.status) ||
    !validDate(result.retrievedAt) ||
    result.provenance.retrievedAt.getTime() !== result.retrievedAt.getTime() ||
    !result.limitations.every((limitation) => limitation.trim().length > 0)
  ) {
    return false;
  }

  const sourceItemKeys = new Set<string>();
  for (const item of result.items) {
    if (
      !EVIDENCE_KINDS.includes(item.kind) ||
      item.sourceItemKey.trim().length === 0 ||
      sourceItemKeys.has(item.sourceItemKey) ||
      !validMetadata(item.metadata) ||
      !item.limitations.every((limitation) => limitation.trim().length > 0) ||
      !validProvenance(item.provenance) ||
      !validTimeValue(item.capturedAt) ||
      !validTimeValue(item.observedAt) ||
      !validTimeValue(item.publishedAt) ||
      !validTimeValue(item.sourceUpdatedAt) ||
      (item.asset !== undefined &&
        (!/^[a-z]+\/[a-z0-9.+-]+$/.test(item.asset.contentType) ||
          item.asset.byteSize <= 0 ||
          !/^[a-f0-9]{64}$/.test(item.asset.sha256) ||
          item.asset.storageKey.trim().length === 0))
    ) {
      return false;
    }
    sourceItemKeys.add(item.sourceItemKey);
  }

  return (
    (result.status !== "UNAVAILABLE" && result.status !== "UNRESOLVED") ||
    result.items.length === 0
  );
}

export class RetrieveEvidenceForInvestigation {
  constructor(
    private readonly evidenceStore: EvidenceStore,
    private readonly providers: readonly SiteEvidenceProvider[],
  ) {}

  async execute(
    investigationId: string,
  ): Promise<RetrieveEvidenceForInvestigationResult> {
    const parsed = investigationIdSchema.safeParse(investigationId);
    if (!parsed.success) {
      return {
        kind: "invalid",
        message: parsed.error.issues[0]?.message ?? "Invalid investigation ID.",
      };
    }

    const context = await this.evidenceStore.getInvestigationWithSite(
      parsed.data,
    );
    if (context.kind !== "found") {
      return context;
    }

    const results: ProviderEvidenceResult[] = [];
    for (const provider of [...this.providers].sort((left, right) =>
      left.providerId.localeCompare(right.providerId),
    )) {
      let result: ProviderEvidenceResult;
      try {
        result = await provider.retrieve(context.value);
      } catch {
        return {
          kind: "failed",
          reason: `Evidence provider ${provider.providerId} could not complete retrieval.`,
        };
      }
      if (!validProviderResult(result)) {
        return {
          kind: "failed",
          reason: `Evidence provider ${provider.providerId} returned an invalid result.`,
        };
      }
      results.push(result);
    }

    return this.evidenceStore.persistRetrievals(parsed.data, results);
  }
}
