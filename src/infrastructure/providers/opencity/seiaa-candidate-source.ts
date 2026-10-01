import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import type {
  CandidateImportStatistics,
  CandidateSourceMetadata,
  CandidateSourceRecord,
  CandidateValidation,
  CandidateValidationCondition,
  ConstructionCandidate,
} from "@/domain/candidates/construction-candidate";
import type {
  CandidateSource,
  CandidateLookupResult,
  CandidateSourceResult,
} from "@/domain/candidates/candidate-source";
import type { Site, SiteLocation } from "@/domain/sites/site";

import { parseSeiaaKml, type SeiaaKmlPlacemark } from "./seiaa-kml-parser";
import {
  createSeiaaSourceMetadata,
  SEIAA_OPENCITY_PROVIDER,
  SEIAA_SOURCE_REFERENCE,
} from "./seiaa-source-metadata";

const SEIAA_SNAPSHOT_PATH = join(
  process.cwd(),
  "src",
  "infrastructure",
  "providers",
  "opencity",
  "data",
  "seiaa-bengaluru-urban-construction-projects.kml",
);

export const SEIAA_KNOWN_MYSURU_ANOMALY_CONSTRUCTION_IDS = new Set([
  "639",
  "640",
  "641",
  "642",
  "643",
  "644",
  "645",
  "646",
]);

function createCandidateId(
  record: CandidateSourceRecord,
  index: number,
): string {
  return record.constructionId === undefined
    ? `candidate-opencity-seiaa-invalid-${index + 1}`
    : `candidate-opencity-seiaa-${record.constructionId}`;
}

function parseCoordinatePair(
  rawCoordinates: string | undefined,
): { readonly latitude: number; readonly longitude: number } | undefined {
  if (rawCoordinates === undefined) {
    return undefined;
  }

  const tuples = rawCoordinates.trim().split(/\s+/).filter(Boolean);

  if (tuples.length !== 1) {
    return undefined;
  }

  const values = tuples[0].split(",");

  if (values.length < 2 || values.length > 3) {
    return undefined;
  }

  if (values.some((value) => value.trim().length === 0)) {
    return undefined;
  }

  const longitude = Number(values[0]);
  const latitude = Number(values[1]);
  const altitude = values.length === 3 ? Number(values[2]) : undefined;

  if (
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude) ||
    (altitude !== undefined && !Number.isFinite(altitude)) ||
    latitude < -90 ||
    latitude > 90 ||
    longitude < -180 ||
    longitude > 180
  ) {
    return undefined;
  }

  return { latitude, longitude };
}

function sourceRecordFrom(placemark: SeiaaKmlPlacemark): CandidateSourceRecord {
  return {
    constructionId: placemark.constructionId,
    kGISCode: placemark.kGISCode,
    rawConstructionName: placemark.rawConstructionName,
    villageId: placemark.villageId,
    departmentCode: placemark.departmentCode,
    rawCoordinates: placemark.rawCoordinates,
  };
}

function missingRequiredSourceFields(
  record: CandidateSourceRecord,
): readonly string[] {
  return [
    record.constructionId === undefined ? "KGISCONSTRUCTIONId" : undefined,
    record.kGISCode === undefined ? "KGISCode" : undefined,
    record.rawConstructionName === undefined ? "CONSTRUCTIONName" : undefined,
  ].filter((value): value is string => value !== undefined);
}

function siteLocation(coordinate: {
  readonly latitude: number;
  readonly longitude: number;
}): SiteLocation {
  return {
    locationState: "MAPPABLE",
    latitude: coordinate.latitude,
    longitude: coordinate.longitude,
    coordinateQuality: "APPROXIMATE",
  };
}

function sourceBackedSite(
  candidateId: string,
  record: CandidateSourceRecord,
  metadata: CandidateSourceMetadata,
  location: SiteLocation,
): Site {
  return {
    id: candidateId.replace("candidate-", "site-"),
    label: record.rawConstructionName,
    origin: {
      ...SEIAA_OPENCITY_PROVIDER,
      externalRecordId: record.kGISCode,
      retrievedAt: new Date(metadata.retrievedAt),
      sourceReference: metadata.sourceReference,
      sourceVersion: metadata.sourceVersion,
      sourceContentHash: metadata.contentHash,
      licenseDesignation: metadata.licenseDesignation,
    },
    location,
  };
}

function invalidCandidate(
  record: CandidateSourceRecord,
  index: number,
  source: CandidateSourceMetadata,
  conditions: readonly CandidateValidationCondition[],
  reason: string,
): ConstructionCandidate {
  return {
    id: createCandidateId(record, index),
    source,
    sourceRecord: record,
    locationSemantics: "APPROXIMATE_PROJECT_SITE_LOCATION",
    validation: {
      status: "INVALID",
      conditions,
      reason,
    },
  };
}

export function normalizeSeiaaKml(
  kml: string,
  source: CandidateSourceMetadata,
): {
  readonly candidates: readonly ConstructionCandidate[];
  readonly statistics: CandidateImportStatistics;
} {
  const parsed = parseSeiaaKml(kml);
  const preliminary: ConstructionCandidate[] = [];

  for (const [index, placemark] of parsed.entries()) {
    const record = sourceRecordFrom(placemark);
    const missingFields = missingRequiredSourceFields(record);

    if (missingFields.length > 0) {
      preliminary.push(
        invalidCandidate(
          record,
          index,
          source,
          ["MISSING_REQUIRED_SOURCE_FIELD"],
          `Missing required source field(s): ${missingFields.join(", ")}.`,
        ),
      );
      continue;
    }

    const coordinate = parseCoordinatePair(record.rawCoordinates);

    if (coordinate === undefined) {
      preliminary.push(
        invalidCandidate(
          record,
          index,
          source,
          ["MALFORMED_COORDINATE"],
          "Missing, malformed, non-finite, or out-of-range KML Point coordinate.",
        ),
      );
      continue;
    }

    const location = siteLocation(coordinate);
    const quarantined =
      record.constructionId !== undefined &&
      SEIAA_KNOWN_MYSURU_ANOMALY_CONSTRUCTION_IDS.has(record.constructionId);
    const validation: CandidateValidation = quarantined
      ? {
          status: "QUARANTINED",
          conditions: ["KNOWN_SOURCE_ANOMALY"],
          reason:
            "Known Nachanahalli/Mysuru name anomaly in the Bengaluru Urban source snapshot; retained for traceability but excluded from the candidate pool.",
        }
      : {
          status: "ACCEPTED",
          conditions: [],
        };
    const id = createCandidateId(record, index);

    preliminary.push({
      id,
      source,
      sourceRecord: record,
      location,
      ...(quarantined
        ? {}
        : { site: sourceBackedSite(id, record, source, location) }),
      locationSemantics: "APPROXIMATE_PROJECT_SITE_LOCATION",
      validation,
    });
  }

  const coordinateGroups = new Map<string, number>();
  for (const candidate of preliminary) {
    if (candidate.location?.latitude === undefined) {
      continue;
    }

    const key = `${candidate.location.latitude},${candidate.location.longitude}`;
    coordinateGroups.set(key, (coordinateGroups.get(key) ?? 0) + 1);
  }

  const candidates = preliminary.map((candidate) => {
    if (candidate.location?.latitude === undefined) {
      return candidate;
    }

    const key = `${candidate.location.latitude},${candidate.location.longitude}`;
    const groupSize = coordinateGroups.get(key) ?? 1;

    if (groupSize === 1) {
      return candidate;
    }

    return {
      ...candidate,
      validation: {
        ...candidate.validation,
        conditions: [
          ...candidate.validation.conditions,
          "DUPLICATE_COORDINATE" as const,
        ],
        duplicateCoordinateGroupSize: groupSize,
      },
    };
  });

  const accepted = candidates.filter(
    (candidate) => candidate.validation.status === "ACCEPTED",
  );
  const quarantined = candidates.filter(
    (candidate) => candidate.validation.status === "QUARANTINED",
  );
  const invalid = candidates.filter(
    (candidate) => candidate.validation.status === "INVALID",
  );
  const duplicateGroups = [...coordinateGroups.values()].filter(
    (count) => count > 1,
  );

  return {
    candidates,
    statistics: {
      imported: candidates.length,
      accepted: accepted.length,
      quarantined: quarantined.length,
      invalid: invalid.length,
      investigationReady: accepted.filter(
        (candidate) => candidate.site !== undefined,
      ).length,
      duplicateCoordinateRecords: duplicateGroups.reduce(
        (total, count) => total + count,
        0,
      ),
      duplicateCoordinateGroups: duplicateGroups.length,
    },
  };
}

export class OpenCitySeiaaCandidateSource implements CandidateSource {
  private snapshot?: Extract<CandidateSourceResult, { kind: "available" }>;

  async listCandidates(): Promise<CandidateSourceResult> {
    try {
      if (this.snapshot === undefined) {
        const kml = readFileSync(SEIAA_SNAPSHOT_PATH, "utf8");
        const source = createSeiaaSourceMetadata(
          createHash("sha256").update(kml).digest("hex"),
        );
        const normalized = normalizeSeiaaKml(kml, source);

        this.snapshot = {
          kind: "available",
          source,
          ...normalized,
        };
      }

      return structuredClone(this.snapshot);
    } catch (error) {
      return {
        kind: "unavailable",
        source: createSeiaaSourceMetadata("unavailable"),
        reason:
          error instanceof Error
            ? `Unable to load the versioned SEIAA KML snapshot: ${error.message}`
            : "Unable to load the versioned SEIAA KML snapshot.",
      };
    }
  }

  async getById(candidateId: string): Promise<CandidateLookupResult> {
    const result = await this.listCandidates();

    if (result.kind === "unavailable") {
      return result;
    }

    const candidate = result.candidates.find(
      (availableCandidate) => availableCandidate.id === candidateId,
    );

    if (candidate === undefined) {
      return {
        kind: "not_found",
        source: structuredClone(result.source),
        candidateId,
      };
    }

    return {
      kind: "found",
      candidate: structuredClone(candidate),
    };
  }
}

export { SEIAA_SOURCE_REFERENCE };
