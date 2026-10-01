import type { CoordinateQuality, Site } from "@/domain/sites/site";

export const SENTINEL_2_CONTEXT_AOI_POLICY_ID =
  "sentinel-2-context-square-320m-v1";

export const IMAGERY_CONTEXT_AOI_PURPOSE = "IMAGERY_CONTEXT_RETRIEVAL" as const;

export interface DerivedContextAoi {
  readonly id: string;
  readonly sourceSiteId: string;
  readonly geometry: {
    readonly type: "Polygon";
    readonly coordinates: readonly [
      readonly [
        readonly [number, number],
        readonly [number, number],
        readonly [number, number],
        readonly [number, number],
        readonly [number, number],
      ],
    ];
  };
  readonly policyId: string;
  readonly coordinateQuality?: CoordinateQuality;
  readonly sourcePointIsApproximate: boolean;
  readonly purpose: typeof IMAGERY_CONTEXT_AOI_PURPOSE;
  readonly limitations: readonly string[];
}

export type DeriveContextAoiResult =
  | { readonly kind: "derived"; readonly value: DerivedContextAoi }
  | { readonly kind: "unmappable"; readonly reason: string };

const EARTH_RADIUS_METERS = 6_378_137;
const HALF_SIDE_METERS = 160;

function validCoordinate(latitude: number, longitude: number): boolean {
  return (
    Number.isFinite(latitude) &&
    Number.isFinite(longitude) &&
    latitude >= -90 &&
    latitude <= 90 &&
    longitude >= -180 &&
    longitude <= 180 &&
    Math.abs(latitude) < 89.999
  );
}

function rounded(value: number): number {
  return Number(value.toFixed(12));
}

/**
 * Creates a deterministic local geodesic approximation for imagery retrieval.
 * It is explicitly a context window, never a project, parcel, or footprint.
 */
export function deriveSentinel2ContextAoi(site: Site): DeriveContextAoiResult {
  const { latitude, longitude } = site.location;
  if (
    site.location.locationState !== "MAPPABLE" ||
    latitude === undefined ||
    longitude === undefined ||
    !validCoordinate(latitude, longitude)
  ) {
    return {
      kind: "unmappable",
      reason:
        "The Site does not have a valid mappable coordinate for imagery context retrieval.",
    };
  }

  const latitudeRadians = (latitude * Math.PI) / 180;
  const latitudeDelta =
    (HALF_SIDE_METERS / EARTH_RADIUS_METERS) * (180 / Math.PI);
  const longitudeDelta =
    (HALF_SIDE_METERS / (EARTH_RADIUS_METERS * Math.cos(latitudeRadians))) *
    (180 / Math.PI);

  const west = rounded(longitude - longitudeDelta);
  const east = rounded(longitude + longitudeDelta);
  const south = rounded(latitude - latitudeDelta);
  const north = rounded(latitude + latitudeDelta);
  const sourcePointIsApproximate =
    site.location.coordinateQuality === "APPROXIMATE";

  return {
    kind: "derived",
    value: {
      id: `${SENTINEL_2_CONTEXT_AOI_POLICY_ID}:${site.id}`,
      sourceSiteId: site.id,
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [west, south],
            [east, south],
            [east, north],
            [west, north],
            [west, south],
          ],
        ],
      },
      policyId: SENTINEL_2_CONTEXT_AOI_POLICY_ID,
      ...(site.location.coordinateQuality === undefined
        ? {}
        : { coordinateQuality: site.location.coordinateQuality }),
      sourcePointIsApproximate,
      purpose: IMAGERY_CONTEXT_AOI_PURPOSE,
      limitations: [
        "This is a derived 320m by 320m imagery context around the Site coordinate, not a construction footprint, parcel, property, or legal boundary.",
        ...(sourcePointIsApproximate
          ? [
              "The source Site coordinate is approximate; this context window does not establish the exact location of a construction project.",
            ]
          : []),
      ],
    },
  };
}
