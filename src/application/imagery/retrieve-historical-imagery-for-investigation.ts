import { investigationIdSchema } from "@/contracts/investigations/get-investigation";
import type { HistoricalImageryRequest } from "@/contracts/imagery/retrieve-historical-imagery";
import type { EvidenceAssetStore } from "@/domain/evidence/evidence-asset-store";
import type {
  CollectedEvidenceItem,
  ProviderEvidenceResult,
} from "@/domain/evidence/evidence";
import type {
  EvidenceStore,
  PersistEvidenceRetrievalsResult,
} from "@/domain/evidence/evidence-store";
import { deriveSentinel2ContextAoi } from "@/domain/imagery/derived-context-aoi";
import type {
  HistoricalImageryObservation,
  HistoricalImageryProvider,
} from "@/domain/imagery/historical-imagery-provider";

export type RetrieveHistoricalImageryForInvestigationResult =
  | PersistEvidenceRetrievalsResult
  | { readonly kind: "invalid"; readonly message: string }
  | { readonly kind: "not_found"; readonly investigationId: string }
  | { readonly kind: "unprocessable"; readonly message: string };

function toEvidenceItem(
  observation: HistoricalImageryObservation,
  asset: Awaited<ReturnType<EvidenceAssetStore["put"]>>,
): CollectedEvidenceItem {
  return {
    kind: "IMAGERY",
    sourceItemKey: observation.sourceItemKey,
    label: observation.label,
    provenance: observation.provenance,
    capturedAt: observation.capturedAt,
    observedAt: observation.observedAt,
    ...(observation.publishedAt === undefined
      ? {}
      : { publishedAt: observation.publishedAt }),
    ...(observation.sourceUpdatedAt === undefined
      ? {}
      : { sourceUpdatedAt: observation.sourceUpdatedAt }),
    completeness: "PARTIAL",
    integrity: "VERIFIED_BY_HASH",
    qualityNotes: `Imagery usability is ${observation.usability}; quality flags: ${observation.qualityFlags.length === 0 ? "none supplied" : observation.qualityFlags.join(", ")}.`,
    limitations: observation.limitations,
    metadata: {
      imagery: {
        collectionId: observation.collectionId,
        productId: observation.productId,
        assetRole: observation.assetRole,
        ...(observation.groundSampleDistanceMeters === undefined
          ? {}
          : {
              groundSampleDistanceMeters:
                observation.groundSampleDistanceMeters,
            }),
        ...(observation.crs === undefined ? {} : { crs: observation.crs }),
        ...(observation.providerCloudCoverPercent === undefined
          ? {}
          : {
              providerCloudCoverPercent: observation.providerCloudCoverPercent,
            }),
        aoi: observation.aoi,
        usability: observation.usability,
        qualityFlags: observation.qualityFlags,
        processing: observation.processing,
        selection: observation.selection,
        stableSourceAssetKey: observation.pixels.stableAssetKey,
      },
    },
    asset,
  };
}

export class RetrieveHistoricalImageryForInvestigation {
  constructor(
    private readonly evidenceStore: EvidenceStore,
    private readonly imageryProvider: HistoricalImageryProvider,
    private readonly assetStore: EvidenceAssetStore,
  ) {}

  async execute(
    investigationId: string,
    request: HistoricalImageryRequest,
  ): Promise<RetrieveHistoricalImageryForInvestigationResult> {
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
    if (context.kind !== "found") return context;

    const aoi = deriveSentinel2ContextAoi(context.value.site);
    if (aoi.kind !== "derived") {
      return { kind: "unprocessable", message: aoi.reason };
    }

    let providerResult: Awaited<
      ReturnType<HistoricalImageryProvider["retrieve"]>
    >;
    try {
      providerResult = await this.imageryProvider.retrieve({
        site: context.value.site,
        aoi: aoi.value,
        timeRange: { start: request.start, end: request.end },
        maximumObservations: request.maximumObservations ?? 3,
      });
    } catch {
      return {
        kind: "failed",
        reason: "Historical imagery retrieval could not complete.",
      };
    }

    const items: CollectedEvidenceItem[] = [];
    try {
      for (const observation of providerResult.observations) {
        const asset = await this.assetStore.put({
          bytes: observation.pixels.bytes,
          contentType: observation.pixels.contentType,
        });
        items.push(toEvidenceItem(observation, asset));
      }
    } catch {
      return {
        kind: "unavailable",
        reason: "Imagery asset storage is currently unavailable.",
      };
    }

    const evidenceResult: ProviderEvidenceResult = {
      provenance: providerResult.provenance,
      status: providerResult.status,
      retrievedAt: providerResult.retrievedAt,
      limitations: providerResult.limitations,
      items,
    };
    return this.evidenceStore.persistRetrievals(parsed.data, [evidenceResult]);
  }
}
