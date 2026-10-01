import type {
  AdministrativeContext,
  AdministrativeMappingProvenance,
} from "@/domain/accountability/authority-mapping";

export interface SeededAdministrativeReference {
  readonly id: string;
  readonly latitude: number;
  readonly longitude: number;
  readonly administrativeContext: AdministrativeContext;
  readonly provenance: AdministrativeMappingProvenance;
}

const SOURCE_REFERENCE =
  "https://bbmp.gov.in/KnowYourNewCorporation/index.html";
const SOURCE_VERSION = "GBA ward delimitation 2025";
const RETRIEVED_AT = new Date("2026-09-03T00:00:00.000Z");
const COMMON_LIMITATIONS = [
  "The complaint coordinate is a 500 m seeded-demo approximation.",
  "This frozen reference records a Greater Bengaluru Authority coordinate lookup and is not an official routing decision or a boundary determination.",
] as const;

function provenance(): AdministrativeMappingProvenance {
  return {
    providerId: "civiclens-seeded-administrative-mapping",
    providerLabel: "CivicLens Seeded Administrative Mapping Provider",
    datasetName: "CivicLens frozen GBA coordinate reference dataset",
    sourceName:
      "Greater Bengaluru Authority Know Your Ward and New City Corporation",
    sourceReference: SOURCE_REFERENCE,
    sourceVersion: SOURCE_VERSION,
    retrievedAt: RETRIEVED_AT,
    mappingMethod: "SEEDED_REFERENCE_LOOKUP",
    matchQuality: "PROTOTYPE_APPROXIMATE",
    limitations: COMMON_LIMITATIONS,
  };
}

function reference(
  id: string,
  latitude: number,
  longitude: number,
  cityCorporation: AdministrativeContext["cityCorporation"],
  ward: NonNullable<AdministrativeContext["ward"]>,
  zone: NonNullable<AdministrativeContext["zone"]>,
): SeededAdministrativeReference {
  return {
    id,
    latitude,
    longitude,
    administrativeContext: { cityCorporation, ward, zone },
    provenance: provenance(),
  };
}

export const SEEDED_ADMINISTRATIVE_REFERENCES: readonly SeededAdministrativeReference[] =
  [
    reference(
      "gba-coordinate-00842",
      12.9912,
      77.6953,
      { id: "GBA-EAST", name: "Bengaluru East City Corporation" },
      { id: "GBA-EAST-WARD-35", name: "35 - Garudachar Palya" },
      { id: "GBA-EAST-ZONE-MAHADEVAPURA", name: "Mahadevapura" },
    ),
    reference(
      "gba-coordinate-00918",
      12.9788,
      77.6404,
      { id: "GBA-CENTRAL", name: "Bengaluru Central City Corporation" },
      { id: "GBA-CENTRAL-WARD-09", name: "9 - Hoysala Nagara Central" },
      { id: "GBA-CENTRAL-ZONE-CV-RAMAN-NAGAR", name: "C.V. Raman Nagar" },
    ),
    reference(
      "gba-coordinate-01471",
      13.0318,
      77.6252,
      { id: "GBA-NORTH", name: "Bengaluru North City Corporation" },
      { id: "GBA-NORTH-WARD-23", name: "23 - Hennur" },
      { id: "GBA-NORTH-ZONE-BYATARAYANAPURA", name: "Byatarayanapura" },
    ),
    reference(
      "gba-coordinate-01534",
      12.9619,
      77.6388,
      { id: "GBA-CENTRAL", name: "Bengaluru Central City Corporation" },
      { id: "GBA-CENTRAL-WARD-22", name: "22 - Domluru" },
      { id: "GBA-CENTRAL-ZONE-CV-RAMAN-NAGAR", name: "C.V. Raman Nagar" },
    ),
    reference(
      "gba-coordinate-02313",
      12.9357,
      77.6104,
      { id: "GBA-SOUTH", name: "Bengaluru South City Corporation" },
      { id: "GBA-SOUTH-WARD-23", name: "23 - Lakkasandra" },
      { id: "GBA-SOUTH-ZONE-BOMMANAHALLI", name: "Bommanahalli" },
    ),
    reference(
      "gba-coordinate-01903",
      12.9149,
      77.6397,
      { id: "GBA-SOUTH", name: "Bengaluru South City Corporation" },
      { id: "GBA-SOUTH-WARD-72", name: "72 - HSR Layout" },
      { id: "GBA-SOUTH-ZONE-BOMMANAHALLI", name: "Bommanahalli" },
    ),
    reference(
      "gba-coordinate-02472",
      13.0184,
      77.5902,
      { id: "GBA-NORTH", name: "Bengaluru North City Corporation" },
      { id: "GBA-NORTH-WARD-54", name: "54 - Gangenahalli" },
      { id: "GBA-NORTH-ZONE-YELAHANKA", name: "Yelahanka" },
    ),
    reference(
      "gba-coordinate-02704",
      12.9716,
      77.5946,
      { id: "GBA-CENTRAL", name: "Bengaluru Central City Corporation" },
      { id: "GBA-CENTRAL-WARD-25", name: "25 - Ashokanagar" },
      { id: "GBA-CENTRAL-ZONE-CV-RAMAN-NAGAR", name: "C.V. Raman Nagar" },
    ),
    reference(
      "gba-coordinate-01126",
      12.9279,
      77.6271,
      { id: "GBA-SOUTH", name: "Bengaluru South City Corporation" },
      { id: "GBA-SOUTH-WARD-28", name: "28 - Kormangala East" },
      { id: "GBA-SOUTH-ZONE-BOMMANAHALLI", name: "Bommanahalli" },
    ),
    reference(
      "gba-coordinate-02540",
      12.9487,
      77.5864,
      { id: "GBA-CENTRAL", name: "Bengaluru Central City Corporation" },
      { id: "GBA-CENTRAL-WARD-40", name: "40 - Ashoka Pillar" },
      { id: "GBA-CENTRAL-ZONE-GANDHINAGARA", name: "Gandhinagara" },
    ),
    reference(
      "gba-coordinate-03011",
      13.0056,
      77.6714,
      { id: "GBA-EAST", name: "Bengaluru East City Corporation" },
      { id: "GBA-EAST-WARD-17", name: "17 - Vijinapura" },
      { id: "GBA-EAST-ZONE-KR-PURA", name: "K.R. Pura" },
    ),
  ];
