import type { CandidateSourceMetadata } from "@/domain/candidates/construction-candidate";
import type { SiteProviderIdentity } from "@/domain/sites/site";

export const SEIAA_OPENCITY_PROVIDER: SiteProviderIdentity = {
  providerId: "opencity-seiaa-bengaluru-urban",
  providerLabel: "OpenCity / KSRSAC SEIAA Bengaluru Urban Maps",
  sourceType: "OPENCITY",
  isLive: false,
};

export const SEIAA_SOURCE_REFERENCE =
  "https://data.opencity.in/dataset/1a231f9a-5b6f-4dc0-b533-a3eca1ad4beb/resource/574c6f7c-5d1c-48e7-9321-8081dac104ac/download/76e1aa89-f66b-42b5-a2dc-42fbacc94f62.kml";

export const SEIAA_RESOURCE_ID = "574c6f7c-5d1c-48e7-9321-8081dac104ac";

export const SEIAA_SNAPSHOT_RETRIEVED_AT = new Date("2026-09-04T14:44:13.593Z");

export function createSeiaaSourceMetadata(
  contentHash: string,
): CandidateSourceMetadata {
  return {
    ...SEIAA_OPENCITY_PROVIDER,
    dataClassification: "IMPORTED_SOURCE_SNAPSHOT",
    isLive: false,
    datasetName: "Karnataka and Bengaluru Urban SEIAA Maps",
    resourceName: "Construction Projects in Bengaluru Urban Approved by SEIAA",
    resourceId: SEIAA_RESOURCE_ID,
    sourceReference: SEIAA_SOURCE_REFERENCE,
    upstreamAttribution: "KSRSAC, as attributed by OpenCity",
    sourceVersion: "OpenCity resource updated 2025-11-25",
    retrievedAt: new Date(SEIAA_SNAPSHOT_RETRIEVED_AT),
    contentHash,
    licenseDesignation: "Other (Public Domain), as labelled by OpenCity",
  };
}
