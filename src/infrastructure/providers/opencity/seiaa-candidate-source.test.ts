import assert from "node:assert/strict";
import test from "node:test";

import { ListConstructionCandidates } from "@/application/candidates/list-construction-candidates";
import { ListInvestigationReadyCandidates } from "@/application/candidates/list-investigation-ready-candidates";
import type { CandidateSource } from "@/domain/candidates/candidate-source";

import {
  normalizeSeiaaKml,
  OpenCitySeiaaCandidateSource,
  SEIAA_KNOWN_MYSURU_ANOMALY_CONSTRUCTION_IDS,
} from "./seiaa-candidate-source";
import { createSeiaaSourceMetadata } from "./seiaa-source-metadata";

const source = createSeiaaSourceMetadata("test-content-hash");

function kmlFor(
  simpleData: readonly [string, string][],
  coordinates: string | undefined,
): string {
  const fields = simpleData
    .map(([name, value]) => `<SimpleData name="${name}">${value}</SimpleData>`)
    .join("");
  const point =
    coordinates === undefined
      ? ""
      : `<Point><coordinates>${coordinates}</coordinates></Point>`;

  return `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2"><Document><Placemark><ExtendedData><SchemaData>${fields}</SchemaData></ExtendedData>${point}</Placemark></Document></kml>`;
}

const validFields: readonly [string, string][] = [
  ["KGISCONSTRUCTIONId", "900"],
  ["KGISCode", "KGIS-900"],
  ["CONSTRUCTIONName", "Raw source construction name"],
  ["KGISVillageID", "123"],
  ["DepartmentCode", "456"],
];

test("normalizes KML Point longitude/latitude into a mappable approximate Site", () => {
  const result = normalizeSeiaaKml(
    kmlFor(validFields, "77.5946,12.9716,0"),
    source,
  );
  const candidate = result.candidates[0];

  assert.equal(candidate.validation.status, "ACCEPTED");
  assert.equal(candidate.sourceRecord.constructionId, "900");
  assert.equal(candidate.sourceRecord.kGISCode, "KGIS-900");
  assert.equal(
    candidate.sourceRecord.rawConstructionName,
    "Raw source construction name",
  );
  assert.equal(candidate.sourceRecord.rawCoordinates, "77.5946,12.9716,0");
  assert.equal(candidate.location?.latitude, 12.9716);
  assert.equal(candidate.location?.longitude, 77.5946);
  assert.equal(candidate.location?.locationState, "MAPPABLE");
  assert.equal(candidate.location?.coordinateQuality, "APPROXIMATE");
  assert.equal(candidate.location?.coordinatePrecisionMeters, undefined);
  assert.equal(candidate.site?.origin.externalRecordId, "KGIS-900");
  assert.equal(candidate.site?.origin.isLive, false);
  assert.equal(candidate.site?.origin.sourceContentHash, "test-content-hash");
  assert.equal(
    candidate.site?.origin.licenseDesignation,
    "Other (Public Domain), as labelled by OpenCity",
  );
  assert.equal(
    candidate.locationSemantics,
    "APPROXIMATE_PROJECT_SITE_LOCATION",
  );
});

test("rejects malformed, out-of-range, and missing KML Point coordinates", () => {
  const invalidCoordinates = [
    "not,a,coordinate",
    ",,",
    "77.5946,12.9716,not-an-altitude",
    "77.5946,91,0",
    "181,12.9716,0",
    "77.5946,12.9716,0 77.6,12.98,0",
  ];

  for (const coordinate of invalidCoordinates) {
    const result = normalizeSeiaaKml(kmlFor(validFields, coordinate), source);
    assert.equal(result.candidates[0]?.validation.status, "INVALID");
    assert.deepEqual(result.candidates[0]?.validation.conditions, [
      "MALFORMED_COORDINATE",
    ]);
  }

  const missingPoint = normalizeSeiaaKml(
    kmlFor(validFields, undefined),
    source,
  );
  assert.equal(missingPoint.candidates[0]?.validation.status, "INVALID");
});

test("retains KML longitude/latitude ordering without silently swapping globally valid values", () => {
  const result = normalizeSeiaaKml(
    kmlFor(validFields, "12.9716,77.5946,0"),
    source,
  );

  assert.equal(result.candidates[0]?.validation.status, "ACCEPTED");
  assert.equal(result.candidates[0]?.location?.longitude, 12.9716);
  assert.equal(result.candidates[0]?.location?.latitude, 77.5946);
});

test("rejects KML records missing required source identity or name fields", () => {
  const result = normalizeSeiaaKml(
    kmlFor(
      [
        ["KGISCONSTRUCTIONId", "901"],
        ["CONSTRUCTIONName", "Name without code"],
      ],
      "77.5946,12.9716,0",
    ),
    source,
  );

  assert.equal(result.candidates[0]?.validation.status, "INVALID");
  assert.deepEqual(result.candidates[0]?.validation.conditions, [
    "MISSING_REQUIRED_SOURCE_FIELD",
  ]);
  assert.match(result.candidates[0]?.validation.reason ?? "", /KGISCode/);
});

test("quarantines the known Mysuru anomaly while retaining the source record", () => {
  const anomalousFields = validFields.map(([name, value]) =>
    name === "KGISCONSTRUCTIONId"
      ? ([name, "639"] as [string, string])
      : name === "CONSTRUCTIONName"
        ? ([name, "Brigade Residential Project, Nachanahalli, Mysuru"] as [
            string,
            string,
          ])
        : ([name, value] as [string, string]),
  );
  const result = normalizeSeiaaKml(
    kmlFor(anomalousFields, "77.6987309819512,12.9680868581067,0"),
    source,
  );
  const candidate = result.candidates[0];

  assert.equal(candidate.validation.status, "QUARANTINED");
  assert.deepEqual(candidate.validation.conditions, ["KNOWN_SOURCE_ANOMALY"]);
  assert.equal(candidate.site, undefined);
  assert.equal(candidate.location?.locationState, "MAPPABLE");
  assert.equal(candidate.sourceRecord.constructionId, "639");
});

test("marks duplicate coordinates without merging or quarantining source records", () => {
  const first = kmlFor(validFields, "77.5946,12.9716,0");
  const second = kmlFor(
    validFields.map(([name, value]) =>
      name === "KGISCONSTRUCTIONId"
        ? ([name, "901"] as [string, string])
        : name === "KGISCode"
          ? ([name, "KGIS-901"] as [string, string])
          : ([name, value] as [string, string]),
    ),
    "77.5946,12.9716,0",
  );
  const result = normalizeSeiaaKml(
    first.replace("</Document></kml>", "") +
      second.replace(/^[\s\S]*?<Document>/, ""),
    source,
  );

  assert.equal(result.candidates.length, 2);
  assert.equal(result.statistics.duplicateCoordinateGroups, 1);
  assert.equal(result.statistics.duplicateCoordinateRecords, 2);

  for (const candidate of result.candidates) {
    assert.equal(candidate.validation.status, "ACCEPTED");
    assert.ok(candidate.validation.conditions.includes("DUPLICATE_COORDINATE"));
    assert.equal(candidate.validation.duplicateCoordinateGroupSize, 2);
  }
});

test("imports the complete checked-in source snapshot with traceable provenance", async () => {
  const result = await new OpenCitySeiaaCandidateSource().listCandidates();

  assert.equal(result.kind, "available");
  if (result.kind !== "available") {
    return;
  }

  assert.deepEqual(result.statistics, {
    imported: 600,
    accepted: 592,
    quarantined: 8,
    invalid: 0,
    investigationReady: 592,
    duplicateCoordinateRecords: 24,
    duplicateCoordinateGroups: 12,
  });
  assert.equal(result.source.dataClassification, "IMPORTED_SOURCE_SNAPSHOT");
  assert.equal(result.source.isLive, false);
  assert.match(result.source.contentHash, /^[a-f0-9]{64}$/);
  assert.equal(
    result.source.resourceId,
    "574c6f7c-5d1c-48e7-9321-8081dac104ac",
  );
  assert.equal(
    result.source.licenseDesignation,
    "Other (Public Domain), as labelled by OpenCity",
  );
  assert.equal(
    result.candidates.filter(
      (candidate) => candidate.validation.status === "QUARANTINED",
    ).length,
    SEIAA_KNOWN_MYSURU_ANOMALY_CONSTRUCTION_IDS.size,
  );
  assert.deepEqual(
    result.candidates
      .filter((candidate) => candidate.validation.status === "QUARANTINED")
      .map((candidate) => candidate.sourceRecord.constructionId)
      .sort(),
    [...SEIAA_KNOWN_MYSURU_ANOMALY_CONSTRUCTION_IDS].sort(),
  );
  assert.ok(
    result.candidates
      .filter((candidate) => candidate.validation.status === "QUARANTINED")
      .every((candidate) => candidate.site === undefined),
  );
  assert.ok(
    result.candidates
      .filter((candidate) => candidate.validation.status === "ACCEPTED")
      .every(
        (candidate) =>
          candidate.site?.location.locationState === "MAPPABLE" &&
          candidate.site.location.coordinateQuality === "APPROXIMATE" &&
          candidate.site.location.coordinatePrecisionMeters === undefined,
      ),
  );
  assert.ok(
    result.candidates.every(
      (candidate) =>
        candidate.locationSemantics === "APPROXIMATE_PROJECT_SITE_LOCATION",
    ),
  );
});

test("candidate source returns defensive snapshots and application use case stays provider-independent", async () => {
  const sourceProvider = new OpenCitySeiaaCandidateSource();
  const first = await sourceProvider.listCandidates();
  assert.equal(first.kind, "available");

  if (first.kind !== "available") {
    return;
  }

  (first.candidates[0]?.source as { providerLabel: string }).providerLabel =
    "Mutated";
  const second = await new ListConstructionCandidates(sourceProvider).execute();
  assert.equal(second.kind, "available");

  if (second.kind === "available") {
    assert.equal(
      second.candidates[0]?.source.providerLabel,
      "OpenCity / KSRSAC SEIAA Bengaluru Urban Maps",
    );
  }
});

test("candidate lookup distinguishes found, not_found, and preserves validation", async () => {
  const sourceProvider = new OpenCitySeiaaCandidateSource();
  const candidates = await sourceProvider.listCandidates();
  assert.equal(candidates.kind, "available");
  if (candidates.kind !== "available") {
    return;
  }

  const knownCandidate = candidates.candidates.find(
    (candidate) => candidate.validation.status === "ACCEPTED",
  );
  assert.ok(knownCandidate);

  const found = await sourceProvider.getById(knownCandidate.id);
  assert.equal(found.kind, "found");
  if (found.kind === "found") {
    assert.equal(found.candidate.validation.status, "ACCEPTED");
    assert.equal(found.candidate.site?.id, knownCandidate.site?.id);
  }

  const missing = await sourceProvider.getById(
    "candidate-opencity-seiaa-missing",
  );
  assert.equal(missing.kind, "not_found");
});

test("investigation-ready listing excludes quarantined and invalid source records", async () => {
  const result = await new ListInvestigationReadyCandidates(
    new OpenCitySeiaaCandidateSource(),
  ).execute();

  assert.equal(result.kind, "available");
  if (result.kind !== "available") {
    return;
  }

  assert.equal(result.candidates.length, result.statistics.investigationReady);
  assert.ok(
    result.candidates.every(
      (candidate) =>
        candidate.validation.status === "ACCEPTED" &&
        candidate.site?.location.locationState === "MAPPABLE",
    ),
  );
});

test("application use case propagates unavailable candidate sources", async () => {
  const unavailable: CandidateSource = {
    async listCandidates() {
      return {
        kind: "unavailable",
        source,
        reason: "Snapshot unavailable.",
      };
    },
    async getById(candidateId) {
      return {
        kind: "unavailable",
        source,
        reason: `Snapshot unavailable for ${candidateId}.`,
      };
    },
  };

  const result = await new ListConstructionCandidates(unavailable).execute();
  assert.equal(result.kind, "unavailable");

  const lookup = await unavailable.getById("candidate-opencity-seiaa-1");
  assert.equal(lookup.kind, "unavailable");
});
