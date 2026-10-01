import {
  Prisma,
  type EvidenceItem as PrismaEvidenceItem,
  type EvidenceRetrieval as PrismaEvidenceRetrieval,
  type Investigation as PrismaInvestigation,
  type PrismaClient,
  type Site as PrismaSite,
} from "@/generated/prisma/client";
import type {
  EvidencePackageLookupResult,
  EvidenceStore,
  PersistEvidenceRetrievalsResult,
} from "@/domain/evidence/evidence-store";
import type {
  CollectedEvidenceItem,
  EvidenceItem,
  EvidenceProvenance,
  EvidenceRetrieval,
  EvidenceRetrievalStatus,
  EvidenceTimePrecision,
  ProviderEvidenceResult,
} from "@/domain/evidence/evidence";
import type {
  Investigation,
  InvestigationStatus,
} from "@/domain/investigations/investigation";
import type {
  CoordinateQuality,
  Site,
  SiteLocationState,
  SiteSourceType,
} from "@/domain/sites/site";

const DATABASE_UNAVAILABLE_ERROR_CODES = new Set([
  "P1000",
  "P1001",
  "P1002",
  "P1008",
  "P1017",
  "P2024",
  "ECONNREFUSED",
  "ECONNRESET",
  "ETIMEDOUT",
  "EHOSTUNREACH",
  "ENETUNREACH",
  "ENOTFOUND",
]);

function databaseUnavailable(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    typeof error.code === "string" &&
    DATABASE_UNAVAILABLE_ERROR_CODES.has(error.code)
  );
}

function stringArray(value: Prisma.JsonValue): readonly string[] {
  if (
    !Array.isArray(value) ||
    !value.every((entry) => typeof entry === "string")
  ) {
    return [];
  }
  return value;
}

function metadata(value: Prisma.JsonValue): Readonly<Record<string, unknown>> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return {};
  }
  return value as Readonly<Record<string, unknown>>;
}

function toSite(site: PrismaSite): Site {
  return {
    id: site.id,
    ...(site.label === null ? {} : { label: site.label }),
    origin: {
      providerId: site.originProviderId,
      providerLabel: site.originProviderLabel,
      sourceType: site.originSourceType as SiteSourceType,
      isLive: site.originIsLive,
      ...(site.originExternalRecordId === null
        ? {}
        : { externalRecordId: site.originExternalRecordId }),
      retrievedAt: site.originRetrievedAt,
      ...(site.originSourceReference === null
        ? {}
        : { sourceReference: site.originSourceReference }),
      ...(site.originSourceVersion === null
        ? {}
        : { sourceVersion: site.originSourceVersion }),
      ...(site.originSourceContentHash === null
        ? {}
        : { sourceContentHash: site.originSourceContentHash }),
      ...(site.originLicenseDesignation === null
        ? {}
        : { licenseDesignation: site.originLicenseDesignation }),
    },
    location: {
      locationState: site.locationState as SiteLocationState,
      ...(site.latitude === null ? {} : { latitude: site.latitude.toNumber() }),
      ...(site.longitude === null
        ? {}
        : { longitude: site.longitude.toNumber() }),
      ...(site.coordinatePrecisionMeters === null
        ? {}
        : { coordinatePrecisionMeters: site.coordinatePrecisionMeters }),
      ...(site.coordinateQuality === null
        ? {}
        : { coordinateQuality: site.coordinateQuality as CoordinateQuality }),
      ...(site.displayAddress === null
        ? {}
        : { displayAddress: site.displayAddress }),
      ...(site.locality === null ? {} : { locality: site.locality }),
      ...(site.neighborhood === null
        ? {}
        : { neighborhood: site.neighborhood }),
      ...(site.city === null ? {} : { city: site.city }),
      ...(site.postalCode === null ? {} : { postalCode: site.postalCode }),
      ...(site.descriptiveLocation === null
        ? {}
        : { descriptiveLocation: site.descriptiveLocation }),
    },
  };
}

function toInvestigation(value: PrismaInvestigation): Investigation {
  return {
    id: value.id,
    siteId: value.siteId,
    status: value.status as InvestigationStatus,
    createdAt: value.createdAt,
    updatedAt: value.updatedAt,
  };
}

function retrievalProvenance(
  value: PrismaEvidenceRetrieval,
): EvidenceProvenance {
  return {
    providerId: value.providerId,
    providerLabel: value.providerLabel,
    sourceClassification: value.sourceClassification,
    isLive: value.isLive,
    ...(value.sourceReference === null
      ? {}
      : { sourceReference: value.sourceReference }),
    ...(value.sourceVersion === null
      ? {}
      : { sourceVersion: value.sourceVersion }),
    ...(value.sourceContentHash === null
      ? {}
      : { sourceContentHash: value.sourceContentHash }),
    ...(value.licenseDesignation === null
      ? {}
      : { licenseDesignation: value.licenseDesignation }),
    retrievedAt: value.retrievedAt,
  };
}

function timeValue(
  value: Date | null,
  precision: string | null,
):
  | { readonly value: Date; readonly precision: EvidenceTimePrecision }
  | undefined {
  if (value === null || precision === null) {
    return undefined;
  }

  return { value, precision: precision as EvidenceTimePrecision };
}

function itemProvenance(
  item: PrismaEvidenceItem,
  retrieval: PrismaEvidenceRetrieval,
): EvidenceProvenance {
  return {
    ...retrievalProvenance(retrieval),
    ...(item.externalRecordId === null
      ? {}
      : { externalRecordId: item.externalRecordId }),
    ...(item.sourceReference === null
      ? {}
      : { sourceReference: item.sourceReference }),
    ...(item.sourceVersion === null
      ? {}
      : { sourceVersion: item.sourceVersion }),
  };
}

function toEvidenceItem(
  item: PrismaEvidenceItem,
  retrieval: PrismaEvidenceRetrieval,
): EvidenceItem {
  return {
    id: item.id,
    retrievalId: item.retrievalId,
    kind: item.kind,
    sourceItemKey: item.sourceItemKey,
    ...(item.label === null ? {} : { label: item.label }),
    provenance: itemProvenance(item, retrieval),
    ...(timeValue(item.capturedAt, item.capturedAtPrecision) === undefined
      ? {}
      : { capturedAt: timeValue(item.capturedAt, item.capturedAtPrecision) }),
    ...(timeValue(item.observedAt, item.observedAtPrecision) === undefined
      ? {}
      : { observedAt: timeValue(item.observedAt, item.observedAtPrecision) }),
    ...(timeValue(item.publishedAt, item.publishedAtPrecision) === undefined
      ? {}
      : {
          publishedAt: timeValue(item.publishedAt, item.publishedAtPrecision),
        }),
    ...(timeValue(item.sourceUpdatedAt, item.sourceUpdatedPrecision) ===
    undefined
      ? {}
      : {
          sourceUpdatedAt: timeValue(
            item.sourceUpdatedAt,
            item.sourceUpdatedPrecision,
          ),
        }),
    completeness: item.completeness,
    integrity: item.integrity,
    ...(item.qualityNotes === null ? {} : { qualityNotes: item.qualityNotes }),
    limitations: stringArray(item.limitations),
    metadata: metadata(item.metadata),
    ...(item.assetStorageKey === null ||
    item.assetContentType === null ||
    item.assetByteSize === null ||
    item.assetSha256 === null
      ? {}
      : {
          asset: {
            storageKey: item.assetStorageKey,
            contentType: item.assetContentType,
            byteSize: item.assetByteSize,
            sha256: item.assetSha256,
          },
        }),
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  };
}

type PrismaRetrievalWithItems = PrismaEvidenceRetrieval & {
  readonly items: PrismaEvidenceItem[];
};

function toRetrieval(value: PrismaRetrievalWithItems): EvidenceRetrieval {
  return {
    id: value.id,
    investigationId: value.investigationId,
    provenance: retrievalProvenance(value),
    status: value.status as EvidenceRetrievalStatus,
    retrievedAt: value.retrievedAt,
    limitations: stringArray(value.limitations),
    items: value.items.map((item) => toEvidenceItem(item, value)),
    createdAt: value.createdAt,
  };
}

function evidenceTimeData(
  item: CollectedEvidenceItem,
): Pick<
  Prisma.EvidenceItemCreateWithoutRetrievalInput,
  | "capturedAt"
  | "capturedAtPrecision"
  | "observedAt"
  | "observedAtPrecision"
  | "publishedAt"
  | "publishedAtPrecision"
  | "sourceUpdatedAt"
  | "sourceUpdatedPrecision"
> {
  return {
    capturedAt: item.capturedAt?.value,
    capturedAtPrecision: item.capturedAt?.precision,
    observedAt: item.observedAt?.value,
    observedAtPrecision: item.observedAt?.precision,
    publishedAt: item.publishedAt?.value,
    publishedAtPrecision: item.publishedAt?.precision,
    sourceUpdatedAt: item.sourceUpdatedAt?.value,
    sourceUpdatedPrecision: item.sourceUpdatedAt?.precision,
  };
}

function itemCreateData(
  item: CollectedEvidenceItem,
): Prisma.EvidenceItemCreateWithoutRetrievalInput {
  return {
    kind: item.kind,
    sourceItemKey: item.sourceItemKey,
    label: item.label,
    externalRecordId: item.provenance.externalRecordId,
    sourceReference: item.provenance.sourceReference,
    sourceVersion: item.provenance.sourceVersion,
    ...evidenceTimeData(item),
    completeness: item.completeness,
    integrity: item.integrity,
    qualityNotes: item.qualityNotes,
    limitations: [...item.limitations],
    metadata: item.metadata as Prisma.InputJsonValue,
    assetStorageKey: item.asset?.storageKey,
    assetContentType: item.asset?.contentType,
    assetByteSize: item.asset?.byteSize,
    assetSha256: item.asset?.sha256,
  };
}

function compareOptionalTime(
  left: Date | undefined,
  right: Date | undefined,
): number {
  if (left === undefined && right === undefined) {
    return 0;
  }
  if (left === undefined) {
    return 1;
  }
  if (right === undefined) {
    return -1;
  }
  return left.getTime() - right.getTime();
}

function compareEvidenceItems(left: EvidenceItem, right: EvidenceItem): number {
  return (
    compareOptionalTime(left.capturedAt?.value, right.capturedAt?.value) ||
    compareOptionalTime(left.observedAt?.value, right.observedAt?.value) ||
    compareOptionalTime(left.publishedAt?.value, right.publishedAt?.value) ||
    left.provenance.providerId.localeCompare(right.provenance.providerId) ||
    left.kind.localeCompare(right.kind) ||
    left.sourceItemKey.localeCompare(right.sourceItemKey) ||
    left.provenance.retrievedAt.getTime() -
      right.provenance.retrievedAt.getTime() ||
    left.retrievalId.localeCompare(right.retrievalId) ||
    left.id.localeCompare(right.id)
  );
}

export class PrismaEvidenceStore implements EvidenceStore {
  constructor(private readonly prisma: PrismaClient) {}

  async getInvestigationWithSite(investigationId: string) {
    try {
      const value = await this.prisma.investigation.findUnique({
        where: { id: investigationId },
        include: { site: true },
      });
      if (value === null) {
        return { kind: "not_found" as const, investigationId };
      }
      return {
        kind: "found" as const,
        value: {
          investigation: toInvestigation(value),
          site: toSite(value.site),
        },
      };
    } catch (error) {
      if (databaseUnavailable(error)) {
        return {
          kind: "unavailable" as const,
          reason: "Evidence storage is currently unavailable.",
        };
      }
      return {
        kind: "failed" as const,
        reason: "Unable to load the investigation evidence context.",
      };
    }
  }

  async persistRetrievals(
    investigationId: string,
    results: readonly ProviderEvidenceResult[],
  ): Promise<PersistEvidenceRetrievalsResult> {
    try {
      await this.prisma.$transaction(async (transaction) => {
        for (const result of results) {
          await transaction.evidenceRetrieval.create({
            data: {
              investigationId,
              providerId: result.provenance.providerId,
              providerLabel: result.provenance.providerLabel,
              sourceClassification: result.provenance.sourceClassification,
              isLive: result.provenance.isLive,
              status: result.status,
              sourceVersion: result.provenance.sourceVersion,
              sourceReference: result.provenance.sourceReference,
              sourceContentHash: result.provenance.sourceContentHash,
              licenseDesignation: result.provenance.licenseDesignation,
              retrievedAt: result.retrievedAt,
              limitations: [...result.limitations],
              items: {
                create: result.items.map(itemCreateData),
              },
            },
          });
        }
      });

      const packageResult = await this.getPackage(investigationId);
      if (packageResult.kind === "found") {
        return { kind: "persisted", value: packageResult.value };
      }
      if (packageResult.kind === "unavailable") {
        return packageResult;
      }
      return {
        kind: "failed",
        reason: "Unable to read the persisted evidence package.",
      };
    } catch (error) {
      if (databaseUnavailable(error)) {
        return {
          kind: "unavailable",
          reason: "Evidence storage is currently unavailable.",
        };
      }
      return {
        kind: "failed",
        reason: "Unable to persist evidence retrieval results.",
      };
    }
  }

  async getPackage(
    investigationId: string,
  ): Promise<EvidencePackageLookupResult> {
    try {
      const investigation = await this.prisma.investigation.findUnique({
        where: { id: investigationId },
        include: {
          evidenceRetrievals: {
            orderBy: [
              { retrievedAt: "asc" },
              { providerId: "asc" },
              { id: "asc" },
            ],
            include: {
              items: {
                orderBy: [
                  { capturedAt: "asc" },
                  { observedAt: "asc" },
                  { publishedAt: "asc" },
                  { kind: "asc" },
                  { sourceItemKey: "asc" },
                ],
              },
            },
          },
        },
      });

      if (investigation === null) {
        return { kind: "not_found", investigationId };
      }

      const retrievals = investigation.evidenceRetrievals.map(toRetrieval);
      return {
        kind: "found",
        value: {
          investigationId,
          retrievals,
          items: retrievals
            .flatMap((retrieval) => retrieval.items)
            .sort(compareEvidenceItems),
        },
      };
    } catch (error) {
      if (databaseUnavailable(error)) {
        return {
          kind: "unavailable",
          reason: "Evidence storage is currently unavailable.",
        };
      }
      return {
        kind: "failed",
        reason: "Unable to read the evidence package.",
      };
    }
  }
}
