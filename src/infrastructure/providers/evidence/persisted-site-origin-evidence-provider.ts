import type {
  EvidenceProvenance,
  EvidenceSourceClassification,
  ProviderEvidenceResult,
} from "@/domain/evidence/evidence";
import type { SiteEvidenceProvider } from "@/domain/evidence/site-evidence-provider";
import type { Site } from "@/domain/sites/site";

function sourceClassification(site: Site): EvidenceSourceClassification {
  if (site.origin.isLive) {
    return "LIVE_SOURCE";
  }

  if (site.origin.sourceType === "ANALYST_PREPARED") {
    return "PREPARED";
  }

  if (site.origin.sourceType === "SEEDED_DEMO") {
    return "SEEDED_TEST";
  }

  return "IMPORTED_SNAPSHOT";
}

function provenanceFor(site: Site, retrievedAt: Date): EvidenceProvenance {
  return {
    providerId: site.origin.providerId,
    providerLabel: site.origin.providerLabel,
    sourceClassification: sourceClassification(site),
    isLive: site.origin.isLive,
    ...(site.origin.externalRecordId === undefined
      ? {}
      : { externalRecordId: site.origin.externalRecordId }),
    ...(site.origin.sourceReference === undefined
      ? {}
      : { sourceReference: site.origin.sourceReference }),
    ...(site.origin.sourceVersion === undefined
      ? {}
      : { sourceVersion: site.origin.sourceVersion }),
    ...(site.origin.sourceContentHash === undefined
      ? {}
      : { sourceContentHash: site.origin.sourceContentHash }),
    ...(site.origin.licenseDesignation === undefined
      ? {}
      : { licenseDesignation: site.origin.licenseDesignation }),
    retrievedAt,
  };
}

function locationMetadata(site: Site): Readonly<Record<string, unknown>> {
  return {
    locationState: site.location.locationState,
    ...(site.location.latitude === undefined
      ? {}
      : { latitude: site.location.latitude }),
    ...(site.location.longitude === undefined
      ? {}
      : { longitude: site.location.longitude }),
    ...(site.location.coordinateQuality === undefined
      ? {}
      : { coordinateQuality: site.location.coordinateQuality }),
    ...(site.location.coordinatePrecisionMeters === undefined
      ? {}
      : {
          coordinatePrecisionMeters: site.location.coordinatePrecisionMeters,
        }),
    locationSemantics: "APPROXIMATE_SOURCE_PROJECT_SITE_LOCATION",
    sourceOriginRetrievedAt: site.origin.retrievedAt.toISOString(),
  };
}

function sourceItemKey(site: Site): string {
  return [
    site.origin.providerId,
    site.origin.externalRecordId ?? site.id,
    site.origin.sourceVersion ?? "unversioned",
    "site-origin",
  ].join(":");
}

/**
 * Inventories the persisted Site origin as source evidence. It deliberately
 * does not inspect the KML or infer activity, approval, or legal status.
 */
export class PersistedSiteOriginEvidenceProvider implements SiteEvidenceProvider {
  readonly providerId = "persisted-site-origin";

  async retrieve(input: {
    readonly investigation: { readonly id: string };
    readonly site: Site;
  }): Promise<ProviderEvidenceResult> {
    const retrievedAt = new Date();
    const provenance = provenanceFor(input.site, retrievedAt);

    return {
      provenance,
      status: "AVAILABLE",
      retrievedAt,
      limitations: [
        "This item inventories the source-backed Site origin used by CivicLens.",
        "Its coordinates identify an approximate source-provided project/site location, not a construction footprint, parcel, cadastral boundary, ownership claim, approval status, activity status, or legal determination.",
      ],
      items: [
        {
          kind: "SITE_SOURCE_RECORD",
          sourceItemKey: sourceItemKey(input.site),
          ...(input.site.label === undefined
            ? {}
            : { label: input.site.label }),
          provenance,
          completeness: "PARTIAL",
          integrity: "NOT_VERIFIED",
          limitations: [
            "The originating source does not establish an exact construction footprint or coordinate accuracy.",
          ],
          metadata: locationMetadata(input.site),
        },
      ],
    };
  }
}
