import assert from "node:assert/strict";
import test from "node:test";

import { GetComplaintByNumber } from "@/application/complaints/get-complaint-by-number";
import { complaintLocationSchema } from "@/contracts/complaints/complaint-location";
import { hasUsableCoordinates } from "@/domain/complaints/complaint";
import type { ComplaintProvider } from "@/domain/complaints/complaint-provider";

import { SEEDED_COMPLAINTS } from "./seeded-complaints";
import { SeededComplaintProvider } from "./seeded-complaint-provider";

const provider = new SeededComplaintProvider();

test("returns each required demo complaint with seeded provenance", async () => {
  const expected = [
    ["BLR-2026-00842", "WATERLOGGING"],
    ["BLR-2026-01471", "ILLEGAL_DUMPING"],
    ["BLR-2026-01903", "DRAIN_OBSTRUCTION"],
  ] as const;

  for (const [complaintNumber, category] of expected) {
    const result = await provider.getByComplaintNumber(complaintNumber);
    assert.equal(result.kind, "found");

    if (result.kind === "found") {
      assert.equal(result.complaint.category, category);
      assert.equal(result.complaint.sourceStatus, "MARKED_RESOLVED");
      assert.equal(result.complaint.provider.sourceKind, "SEEDED_DEMO");
      assert.equal(result.complaint.provider.isLive, false);
    }
  }
});

test("returns not_found for an unknown complaint number", async () => {
  const result = await provider.getByComplaintNumber("BLR-2026-99999");

  assert.deepEqual(result, {
    kind: "not_found",
    provider: {
      id: "civiclens-seeded-demo",
      label: "CivicLens Seeded Demo Provider",
      sourceKind: "SEEDED_DEMO",
      isLive: false,
    },
    complaintNumber: "BLR-2026-99999",
  });
});

test("does not expose mutable provider metadata in not_found results", async () => {
  const first = await provider.getByComplaintNumber("BLR-2026-99999");
  assert.equal(first.kind, "not_found");

  if (first.kind !== "not_found") {
    return;
  }

  (first.provider as { label: string }).label = "Mutated provider";

  const second = await provider.getByComplaintNumber("BLR-2026-99998");
  const found = await provider.getByComplaintNumber("BLR-2026-00842");

  assert.equal(second.kind, "not_found");
  assert.equal(found.kind, "found");

  if (second.kind === "not_found") {
    assert.equal(second.provider.label, "CivicLens Seeded Demo Provider");
  }

  if (found.kind === "found") {
    assert.equal(
      found.complaint.provider.label,
      "CivicLens Seeded Demo Provider",
    );
  }
});

test("use case normalizes complaint numbers and rejects blank input", async () => {
  const useCase = new GetComplaintByNumber(provider);
  const found = await useCase.execute(" blr-2026-00842 ");
  const invalid = await useCase.execute("   ");

  assert.equal(found.kind, "found");
  assert.equal(invalid.kind, "invalid");
});

test("use case preserves an unavailable provider result", async () => {
  const unavailableProvider: ComplaintProvider = {
    async getByComplaintNumber() {
      return {
        kind: "unavailable",
        provider: {
          id: "test-provider",
          label: "Test Provider",
          sourceKind: "AUTHORIZED_EXTERNAL",
          isLive: true,
        },
        reason: "Provider is unavailable.",
      };
    },
  };

  const result = await new GetComplaintByNumber(unavailableProvider).execute(
    "BLR-2026-00842",
  );

  assert.equal(result.kind, "unavailable");
});

test("returns defensive copies instead of mutable fixture references", async () => {
  const first = await provider.getByComplaintNumber("BLR-2026-00842");
  assert.equal(first.kind, "found");

  if (first.kind !== "found") {
    return;
  }

  first.complaint.sourceHistory[0].occurredAt.setUTCFullYear(2030);
  const second = await provider.getByComplaintNumber("BLR-2026-00842");

  assert.equal(second.kind, "found");
  if (second.kind === "found") {
    assert.notEqual(
      second.complaint.sourceHistory[0].occurredAt.getUTCFullYear(),
      2030,
    );
  }
});

test("fixtures are deterministic, chronological, and retain imported event times", () => {
  assert.equal(SEEDED_COMPLAINTS.length, 12);
  assert.equal(
    new Set(SEEDED_COMPLAINTS.map((complaint) => complaint.id)).size,
    12,
  );
  assert.equal(
    new Set(SEEDED_COMPLAINTS.map((complaint) => complaint.complaintNumber))
      .size,
    12,
  );
  assert.deepEqual(
    SEEDED_COMPLAINTS.reduce<Record<string, number>>((counts, complaint) => {
      counts[complaint.category] = (counts[complaint.category] ?? 0) + 1;
      return counts;
    }, {}),
    {
      WATERLOGGING: 3,
      ILLEGAL_DUMPING: 3,
      DRAIN_OBSTRUCTION: 2,
      ENCROACHMENT: 1,
      CONSTRUCTION_DEBRIS: 2,
      ROAD_BLOCKAGE: 1,
    },
  );

  for (const complaint of SEEDED_COMPLAINTS) {
    for (let index = 1; index < complaint.sourceHistory.length; index += 1) {
      assert.ok(
        complaint.sourceHistory[index - 1].occurredAt <=
          complaint.sourceHistory[index].occurredAt,
      );
    }

    for (const event of complaint.sourceHistory) {
      assert.ok(event.importedAt > event.occurredAt);
    }
  }

  const addressOnlyComplaint = SEEDED_COMPLAINTS.find(
    (complaint) => complaint.complaintNumber === "BLR-2026-02155",
  );
  assert.ok(addressOnlyComplaint);
  assert.equal(hasUsableCoordinates(addressOnlyComplaint.location), false);
});

test("validates coordinate pairs while allowing address-only and administrative context", () => {
  assert.equal(
    complaintLocationSchema.safeParse({
      latitude: 12.9716,
      longitude: 77.5946,
      jurisdiction: "Seeded demo jurisdiction",
      ward: "Seeded demo ward",
    }).success,
    true,
  );
  assert.equal(
    complaintLocationSchema.safeParse({
      displayAddress: "Prototype address-only location",
    }).success,
    true,
  );
  assert.equal(
    complaintLocationSchema.safeParse({ latitude: 12.9716 }).success,
    false,
  );
  assert.equal(
    complaintLocationSchema.safeParse({ longitude: 77.5946 }).success,
    false,
  );
});
