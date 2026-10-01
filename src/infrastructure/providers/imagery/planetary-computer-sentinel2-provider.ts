import type { EvidenceProvenance } from "@/domain/evidence/evidence";
import type {
  HistoricalImageryObservation,
  HistoricalImageryProvider,
  HistoricalImageryProviderResult,
  ImageryQualityFlag,
  ImageryUsability,
} from "@/domain/imagery/historical-imagery-provider";

const STAC_API = "https://planetarycomputer.microsoft.com/api/stac/v1";
const DATA_API = "https://planetarycomputer.microsoft.com/api/data/v1";
const SAS_API = "https://planetarycomputer.microsoft.com/api/sas/v1/sign";
const COLLECTION_ID = "sentinel-2-l2a";
const PROVIDER_ID = "microsoft-planetary-computer-sentinel-2-l2a";
const PROVIDER_LABEL = "Microsoft Planetary Computer Sentinel-2 Level-2A";
const REQUEST_TIMEOUT_MILLISECONDS = 30_000;
const MAXIMUM_DISCOVERED_OBSERVATIONS = 100;
const MAXIMUM_CONTEXT_PIXELS = 512;

interface StacAsset {
  readonly href?: unknown;
}

interface StacFeature {
  readonly id?: unknown;
  readonly bbox?: unknown;
  readonly properties?: unknown;
  readonly assets?: unknown;
  readonly links?: unknown;
}

interface StacCollection {
  readonly id?: unknown;
  readonly license?: unknown;
  readonly links?: unknown;
}

interface Candidate {
  readonly id: string;
  readonly observedAt: Date;
  readonly publishedAt?: Date;
  readonly sourceUpdatedAt?: Date;
  readonly cloudCover?: number;
  readonly gsd?: number;
  readonly crs?: string;
  readonly sourceReference: string;
  readonly sourceVersion?: string;
  readonly visualAssetHref: string;
  readonly coverageValid: boolean;
}

function record(value: unknown): Record<string, unknown> | undefined {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;
}

function text(value: unknown): string | undefined {
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : undefined;
}

function finiteNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value)
    ? value
    : undefined;
}

function validDate(value: unknown): Date | undefined {
  const source = text(value);
  if (source === undefined) return undefined;
  const parsed = new Date(source);
  return Number.isFinite(parsed.getTime()) ? parsed : undefined;
}

function sourceLink(links: unknown, rel: string): string | undefined {
  if (!Array.isArray(links)) return undefined;
  for (const entry of links) {
    const link = record(entry);
    if (link?.rel === rel && text(link.href) !== undefined) {
      return text(link.href);
    }
  }
  return undefined;
}

function boundsCoverAoi(
  bbox: unknown,
  coordinates: readonly (readonly [number, number])[],
): boolean {
  if (
    !Array.isArray(bbox) ||
    bbox.length < 4 ||
    !bbox.slice(0, 4).every((entry) => typeof entry === "number")
  ) {
    return false;
  }
  const [west, south, east, north] = bbox as number[];
  return coordinates.every(
    ([longitude, latitude]) =>
      longitude >= west &&
      longitude <= east &&
      latitude >= south &&
      latitude <= north,
  );
}

function candidateFromFeature(
  feature: StacFeature,
  aoiCoordinates: readonly (readonly [number, number])[],
): Candidate | undefined {
  const id = text(feature.id);
  const properties = record(feature.properties);
  const assets = record(feature.assets);
  const visual = record(assets?.visual) as StacAsset | undefined;
  const visualAssetHref = text(visual?.href);
  const observedAt = validDate(properties?.datetime);
  if (
    id === undefined ||
    visualAssetHref === undefined ||
    observedAt === undefined ||
    !boundsCoverAoi(feature.bbox, aoiCoordinates)
  ) {
    return undefined;
  }

  const cloudCover = finiteNumber(properties?.["eo:cloud_cover"]);
  const gsd = finiteNumber(properties?.gsd) ?? 10;
  const epsg = finiteNumber(properties?.["proj:epsg"]);
  return {
    id,
    observedAt,
    ...(validDate(properties?.created) === undefined
      ? {}
      : { publishedAt: validDate(properties?.created) }),
    ...(validDate(properties?.updated) === undefined
      ? {}
      : { sourceUpdatedAt: validDate(properties?.updated) }),
    ...(cloudCover === undefined ? {} : { cloudCover }),
    ...(gsd === undefined ? {} : { gsd }),
    ...(epsg === undefined ? {} : { crs: `EPSG:${epsg}` }),
    sourceReference:
      sourceLink(feature.links, "self") ??
      `${STAC_API}/collections/${COLLECTION_ID}/items/${encodeURIComponent(id)}`,
    sourceVersion: text(properties?.["s2:product_uri"]),
    visualAssetHref,
    coverageValid: true,
  };
}

function compareCandidateQuality(left: Candidate, right: Candidate): number {
  return (
    (left.cloudCover ?? Number.POSITIVE_INFINITY) -
      (right.cloudCover ?? Number.POSITIVE_INFINITY) ||
    (left.gsd ?? Number.POSITIVE_INFINITY) -
      (right.gsd ?? Number.POSITIVE_INFINITY) ||
    left.observedAt.getTime() - right.observedAt.getTime() ||
    left.id.localeCompare(right.id)
  );
}

function selectCandidates(
  candidates: readonly Candidate[],
  maximumObservations: number,
): readonly Candidate[] {
  const ranked = [...candidates].sort(compareCandidateQuality);
  if (ranked.length <= maximumObservations) {
    return ranked.sort(
      (left, right) =>
        left.observedAt.getTime() - right.observedAt.getTime() ||
        left.id.localeCompare(right.id),
    );
  }

  const selected: Candidate[] = [ranked[0]!];
  while (selected.length < maximumObservations) {
    const next = ranked
      .filter((candidate) => !selected.some(({ id }) => id === candidate.id))
      .sort((left, right) => {
        const distance = (candidate: Candidate) =>
          Math.min(
            ...selected.map((chosen) =>
              Math.abs(
                candidate.observedAt.getTime() - chosen.observedAt.getTime(),
              ),
            ),
          );
        return (
          distance(right) - distance(left) ||
          compareCandidateQuality(left, right)
        );
      })[0];
    if (next === undefined) break;
    selected.push(next);
  }

  return selected.sort(
    (left, right) =>
      left.observedAt.getTime() - right.observedAt.getTime() ||
      left.id.localeCompare(right.id),
  );
}

function providerProvenance(
  retrievedAt: Date,
  licenseDesignation?: string,
): EvidenceProvenance {
  return {
    providerId: PROVIDER_ID,
    providerLabel: PROVIDER_LABEL,
    sourceClassification: "LIVE_SOURCE",
    isLive: true,
    sourceReference: `${STAC_API}/collections/${COLLECTION_ID}`,
    sourceVersion: COLLECTION_ID,
    ...(licenseDesignation === undefined ? {} : { licenseDesignation }),
    retrievedAt,
  };
}

function contentType(response: Response): string | undefined {
  return text(response.headers.get("content-type")?.split(";")[0]);
}

function quality(candidate: Candidate): {
  readonly usability: ImageryUsability;
  readonly flags: readonly ImageryQualityFlag[];
  readonly limitations: readonly string[];
} {
  const flags: ImageryQualityFlag[] = [];
  const limitations: string[] = [
    "Sentinel-2 visible imagery is 10m context-scale evidence and is not reliable for individual-building construction detection.",
    "Provider scene-level cloud-cover metadata does not establish cloud conditions within this derived imagery context AOI.",
  ];
  if ((candidate.gsd ?? 10) >= 10) flags.push("LOW_RESOLUTION");
  if (candidate.cloudCover !== undefined && candidate.cloudCover >= 20) {
    flags.push("CLOUD_AFFECTED");
  }
  if (candidate.cloudCover === undefined) {
    limitations.push(
      "The provider did not supply scene-level cloud-cover metadata.",
    );
  }

  return {
    usability: flags.includes("CLOUD_AFFECTED") ? "LIMITED" : "UNASSESSED",
    flags,
    limitations,
  };
}

async function fetchJson(
  input: string,
  init: RequestInit,
): Promise<{ readonly response: Response; readonly value?: unknown }> {
  const response = await fetch(input, {
    ...init,
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MILLISECONDS),
  });
  if (!response.ok) return { response };
  try {
    return { response, value: await response.json() };
  } catch {
    return { response };
  }
}

/**
 * Reads current Planetary Computer STAC metadata and renders a bounded AOI PNG.
 * The signed raw COG URL is used only to verify source-asset access and is never
 * retained because Planetary Computer SAS URLs expire.
 */
export class PlanetaryComputerSentinel2Provider implements HistoricalImageryProvider {
  readonly providerId = PROVIDER_ID;

  async retrieve(input: {
    readonly site: Parameters<HistoricalImageryProvider["retrieve"]>[0]["site"];
    readonly aoi: Parameters<HistoricalImageryProvider["retrieve"]>[0]["aoi"];
    readonly timeRange: Parameters<
      HistoricalImageryProvider["retrieve"]
    >[0]["timeRange"];
    readonly maximumObservations: number;
  }): Promise<HistoricalImageryProviderResult> {
    const retrievedAt = new Date();
    let collection: StacCollection | undefined;
    try {
      const collectionResult = await fetchJson(
        `${STAC_API}/collections/${COLLECTION_ID}`,
        { method: "GET" },
      );
      if (collectionResult.response.ok) {
        collection = record(collectionResult.value) as
          StacCollection | undefined;
      }
    } catch {
      // A collection metadata failure should not block a separately successful STAC query.
    }
    const licenseDesignation = text(collection?.license);
    const provenance = providerProvenance(retrievedAt, licenseDesignation);

    let searchResult: { readonly response: Response; readonly value?: unknown };
    try {
      searchResult = await fetchJson(`${STAC_API}/search`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          collections: [COLLECTION_ID],
          intersects: input.aoi.geometry,
          datetime: `${input.timeRange.start.toISOString()}/${input.timeRange.end.toISOString()}`,
          limit: MAXIMUM_DISCOVERED_OBSERVATIONS,
        }),
      });
    } catch {
      return {
        provenance,
        status: "UNAVAILABLE",
        retrievedAt,
        limitations: [
          "Planetary Computer Sentinel-2 discovery could not be reached for this request.",
        ],
        observations: [],
      };
    }

    if (
      searchResult.response.status === 429 ||
      searchResult.response.status >= 500
    ) {
      return {
        provenance,
        status: "UNAVAILABLE",
        retrievedAt,
        limitations: [
          "Planetary Computer Sentinel-2 discovery is currently unavailable or throttled.",
        ],
        observations: [],
      };
    }
    if (!searchResult.response.ok || record(searchResult.value) === undefined) {
      return {
        provenance,
        status: "UNRESOLVED",
        retrievedAt,
        limitations: [
          "Planetary Computer Sentinel-2 discovery returned data that could not be safely interpreted.",
        ],
        observations: [],
      };
    }

    const features = record(searchResult.value)?.features;
    if (!Array.isArray(features)) {
      return {
        provenance,
        status: "UNRESOLVED",
        retrievedAt,
        limitations: [
          "Planetary Computer Sentinel-2 discovery did not provide a valid observation list.",
        ],
        observations: [],
      };
    }

    const aoiCoordinates = input.aoi.geometry.coordinates[0].slice(0, 4);
    const candidates = features
      .map((feature) =>
        candidateFromFeature(
          (record(feature) ?? {}) as StacFeature,
          aoiCoordinates,
        ),
      )
      .filter((candidate): candidate is Candidate => candidate !== undefined);
    const selected = selectCandidates(candidates, input.maximumObservations);
    const notSelectedSourceItemKeys = candidates
      .filter((candidate) => !selected.some(({ id }) => id === candidate.id))
      .map((candidate) => candidate.id)
      .sort();

    if (selected.length === 0) {
      return {
        provenance,
        status: "AVAILABLE",
        retrievedAt,
        limitations: [
          "No Sentinel-2 L2A observations with valid source metadata and complete AOI coverage were available for the requested time range.",
        ],
        observations: [],
      };
    }

    const observations: HistoricalImageryObservation[] = [];
    const limitations: string[] = [];
    for (const [index, candidate] of selected.entries()) {
      try {
        const signed = await fetchJson(
          `${SAS_API}?href=${encodeURIComponent(candidate.visualAssetHref)}`,
          { method: "GET" },
        );
        const signedHref = text(record(signed.value)?.href);
        if (!signed.response.ok || signedHref === undefined) {
          limitations.push(
            `The source visual asset for Sentinel-2 observation ${candidate.id} could not be signed.`,
          );
          continue;
        }
        const signedSourceResponse = await fetch(signedHref, {
          method: "HEAD",
          signal: AbortSignal.timeout(REQUEST_TIMEOUT_MILLISECONDS),
        });
        if (!signedSourceResponse.ok) {
          limitations.push(
            `The signed source visual asset for Sentinel-2 observation ${candidate.id} could not be accessed.`,
          );
          continue;
        }

        const [[west, south], , [east, north]] =
          input.aoi.geometry.coordinates[0];
        const rasterUrl = new URL(
          `${DATA_API}/item/bbox/${west},${south},${east},${north}/${MAXIMUM_CONTEXT_PIXELS}x${MAXIMUM_CONTEXT_PIXELS}.png`,
        );
        rasterUrl.searchParams.set("collection", COLLECTION_ID);
        rasterUrl.searchParams.set("item", candidate.id);
        rasterUrl.searchParams.append("assets", "visual");
        rasterUrl.searchParams.set("asset_bidx", "visual|1,2,3");
        rasterUrl.searchParams.set("nodata", "0");
        const rasterResponse = await fetch(rasterUrl, {
          signal: AbortSignal.timeout(REQUEST_TIMEOUT_MILLISECONDS),
        });
        const rasterContentType = contentType(rasterResponse);
        if (!rasterResponse.ok || rasterContentType !== "image/png") {
          limitations.push(
            `The bounded context render for Sentinel-2 observation ${candidate.id} could not be retrieved.`,
          );
          continue;
        }
        const bytes = new Uint8Array(await rasterResponse.arrayBuffer());
        if (bytes.byteLength === 0) {
          limitations.push(
            `The bounded context render for Sentinel-2 observation ${candidate.id} was empty.`,
          );
          continue;
        }

        const evaluatedQuality = quality(candidate);
        const itemProvenance: EvidenceProvenance = {
          ...provenance,
          externalRecordId: candidate.id,
          sourceReference: candidate.sourceReference,
          ...(candidate.sourceVersion === undefined
            ? {}
            : { sourceVersion: candidate.sourceVersion }),
        };
        observations.push({
          sourceItemKey: `${COLLECTION_ID}:${candidate.id}:visual-context:${input.aoi.policyId}`,
          label: `Sentinel-2 context observation ${candidate.observedAt.toISOString()}`,
          provenance: itemProvenance,
          observedAt: { value: candidate.observedAt, precision: "EXACT" },
          capturedAt: { value: candidate.observedAt, precision: "EXACT" },
          ...(candidate.publishedAt === undefined
            ? {}
            : {
                publishedAt: {
                  value: candidate.publishedAt,
                  precision: "EXACT" as const,
                },
              }),
          ...(candidate.sourceUpdatedAt === undefined
            ? {}
            : {
                sourceUpdatedAt: {
                  value: candidate.sourceUpdatedAt,
                  precision: "EXACT" as const,
                },
              }),
          collectionId: COLLECTION_ID,
          productId: candidate.id,
          assetRole: "RGB_CONTEXT_RENDER",
          ...(candidate.gsd === undefined
            ? {}
            : { groundSampleDistanceMeters: candidate.gsd }),
          ...(candidate.crs === undefined ? {} : { crs: candidate.crs }),
          ...(candidate.cloudCover === undefined
            ? {}
            : { providerCloudCoverPercent: candidate.cloudCover }),
          aoi: input.aoi,
          usability: evaluatedQuality.usability,
          qualityFlags: evaluatedQuality.flags,
          limitations: [
            ...input.aoi.limitations,
            ...evaluatedQuality.limitations,
          ],
          processing: [
            {
              operation:
                "planetary-computer-data-api-bounded-rgb-context-render",
              version: "item-bbox-png",
            },
          ],
          selection: {
            rank: index + 1,
            discoveredObservationCount: features.length,
            eligibleObservationCount: candidates.length,
            selectedObservationCount: selected.length,
            notSelectedSourceItemKeys,
          },
          pixels: {
            bytes,
            contentType: rasterContentType,
            stableAssetKey: "visual",
          },
        });
      } catch {
        limitations.push(
          `The source visual asset for Sentinel-2 observation ${candidate.id} could not be retrieved.`,
        );
      }
    }

    return {
      provenance,
      status:
        observations.length === selected.length
          ? "AVAILABLE"
          : observations.length > 0
            ? "PARTIAL"
            : "UNAVAILABLE",
      retrievedAt,
      limitations: [
        ...(features.length >= MAXIMUM_DISCOVERED_OBSERVATIONS
          ? [
              "Discovery reached the bounded provider result limit; additional observations may exist outside this retrieval result.",
            ]
          : []),
        ...(notSelectedSourceItemKeys.length > 0
          ? [
              `${notSelectedSourceItemKeys.length} valid observation(s) were retained as unselected source metadata because this retrieval is bounded to ${input.maximumObservations} item(s).`,
            ]
          : []),
        ...limitations,
      ],
      observations,
    };
  }
}
