import assert from "node:assert/strict";
import test from "node:test";

import { MapComplaintAuthority } from "@/application/accountability/map-complaint-authority";
import {
  AuthorityMappingService,
  type AdministrativeMappingResult,
} from "@/domain/accountability/authority-mapping";
import type { AdministrativeMappingProvider } from "@/domain/accountability/administrative-mapping-provider";
import { civicServiceResponsibilityRegistry } from "@/domain/accountability/responsibility-registry";
import { complaintLocationSchema } from "@/contracts/complaints/complaint-location";

import { SEEDED_COMPLAINTS } from "./seeded-complaints";
import { SeededAdministrativeMappingProvider } from "./seeded-administrative-mapping-provider";

const provider = new SeededAdministrativeMappingProvider();
const service = new AuthorityMappingService(
  provider,
  civicServiceResponsibilityRegistry,
);
const useCase = new MapComplaintAuthority(service);

function complaintByNumber(complaintNumber: string) {
  const complaint = SEEDED_COMPLAINTS.find(
    (candidate) => candidate.complaintNumber === complaintNumber,
  );

  assert.ok(complaint, `Expected seeded complaint ${complaintNumber}.`);
  return complaint;
}

test("maps every retained coordinate-bearing complaint through an exact reference", async () => {
  const coordinateBearingComplaints = SEEDED_COMPLAINTS.filter(
    (complaint) =>
      complaint.location?.latitude !== undefined &&
      complaint.location.longitude !== undefined,
  );

  assert.equal(coordinateBearingComplaints.length, 11);

  for (const complaint of coordinateBearingComplaints) {
    const result = await provider.mapCoordinates(complaint.location);
    assert.equal(result.state, "MAPPED", complaint.complaintNumber);

    if (result.state === "MAPPED") {
      assert.equal(result.provenance.mappingMethod, "SEEDED_REFERENCE_LOOKUP");
      assert.equal(result.provenance.matchQuality, "PROTOTYPE_APPROXIMATE");
      assert.equal(
        result.provenance.sourceReference,
        "https://bbmp.gov.in/KnowYourNewCorporation/index.html",
      );
      assert.equal(
        result.administrativeContext.ward?.id.includes("WARD"),
        true,
      );
    }
  }
});

test("maps the three demo complaints to their CivicLens service functions", async () => {
  const expected = [
    ["BLR-2026-00842", "Storm-water drainage / engineering"],
    ["BLR-2026-01471", "Solid waste management"],
    ["BLR-2026-01903", "Storm-water drainage / engineering"],
  ] as const;

  for (const [complaintNumber, serviceFunction] of expected) {
    const complaint = complaintByNumber(complaintNumber);
    const result = await useCase.execute(
      complaint.location,
      complaint.category,
    );

    assert.equal(result.state, "MAPPED", complaintNumber);
    if (result.state === "MAPPED") {
      assert.equal(result.responsibility.serviceFunction, serviceFunction);
      assert.equal(
        result.responsibility.ruleVersion,
        "civiclens-prototype-routing-v1",
      );
      assert.equal("individualOfficer" in result.responsibility, false);
      assert.equal("person" in result.responsibility, false);
    }
  }
});

test("returns not_mappable for the address-only complaint", async () => {
  const complaint = complaintByNumber("BLR-2026-02155");
  const result = await useCase.execute(complaint.location, complaint.category);

  assert.equal(result.state, "NOT_MAPPABLE");
});

test("returns unresolved for valid coordinates outside retained coverage", async () => {
  const result = await useCase.execute(
    {
      latitude: 12.8,
      longitude: 77.4,
      coordinateSource: "SYNTHETIC_TEST_COORDINATE",
    },
    "WATERLOGGING",
  );

  assert.equal(result.state, "UNRESOLVED");
});

test("returns partial when geography maps but no category rule exists", async () => {
  const complaint = complaintByNumber("BLR-2026-00842");
  const result = await useCase.execute(complaint.location, "OTHER");

  assert.equal(result.state, "PARTIAL");
  if (result.state === "PARTIAL") {
    assert.equal(
      result.administrativeContext.cityCorporation.name,
      "Bengaluru East City Corporation",
    );
  }
});

test("propagates an unavailable administrative mapping provider", async () => {
  const unavailableProvider: AdministrativeMappingProvider = {
    async mapCoordinates(): Promise<AdministrativeMappingResult> {
      return {
        state: "UNAVAILABLE",
        reason: "Reference dataset is unavailable.",
        limitations: ["Synthetic provider failure for contract testing."],
      };
    },
  };
  const unavailableService = new AuthorityMappingService(
    unavailableProvider,
    civicServiceResponsibilityRegistry,
  );

  const result = await unavailableService.map(
    complaintByNumber("BLR-2026-00842").location,
    "WATERLOGGING",
  );

  assert.equal(result.state, "UNAVAILABLE");
});

test("returns defensive copies of retained administrative context and provenance", async () => {
  const complaint = complaintByNumber("BLR-2026-00842");
  const first = await provider.mapCoordinates(complaint.location);
  assert.equal(first.state, "MAPPED");

  if (first.state !== "MAPPED") {
    return;
  }

  (first.administrativeContext.cityCorporation as { name: string }).name =
    "Mutated corporation";
  (first.provenance.limitations as string[]).push("Mutated limitation");

  const second = await provider.mapCoordinates(complaint.location);
  assert.equal(second.state, "MAPPED");

  if (second.state === "MAPPED") {
    assert.equal(
      second.administrativeContext.cityCorporation.name,
      "Bengaluru East City Corporation",
    );
    assert.equal(
      second.provenance.limitations.includes("Mutated limitation"),
      false,
    );
  }
});

test("validates global coordinate bounds without swapping coordinate order", () => {
  assert.equal(
    complaintLocationSchema.safeParse({ latitude: 90, longitude: 180 }).success,
    true,
  );
  assert.equal(
    complaintLocationSchema.safeParse({ latitude: 90.1, longitude: 77.5 })
      .success,
    false,
  );
  assert.equal(
    complaintLocationSchema.safeParse({ latitude: 12.9, longitude: 180.1 })
      .success,
    false,
  );
});
