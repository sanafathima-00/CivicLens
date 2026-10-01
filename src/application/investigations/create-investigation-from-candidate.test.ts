import assert from "node:assert/strict";
import test from "node:test";

import { CreateInvestigationFromCandidate } from "@/application/investigations/create-investigation-from-candidate";
import type {
  CandidateLookupResult,
  CandidateSource,
  CandidateSourceResult,
} from "@/domain/candidates/candidate-source";
import type { ConstructionCandidate } from "@/domain/candidates/construction-candidate";
import type {
  CreateInvestigationResult,
  InvestigationLookupResult,
  InvestigationStore,
} from "@/domain/investigations/investigation-store";
import type { Site } from "@/domain/sites/site";
import { OpenCitySeiaaCandidateSource } from "@/infrastructure/providers/opencity/seiaa-candidate-source";

class MemoryInvestigationStore implements InvestigationStore {
  readonly sites = new Map<string, Site>();
  readonly investigations: CreateInvestigationResult[] = [];

  async createForSite(site: Site): Promise<CreateInvestigationResult> {
    const persistedSite = this.sites.get(site.id) ?? site;
    this.sites.set(site.id, persistedSite);
    const timestamp = new Date("2026-09-05T00:00:00.000Z");
    const result: CreateInvestigationResult = {
      kind: "created",
      investigation: {
        id: `investigation-${this.investigations.length + 1}`,
        siteId: persistedSite.id,
        status: "CREATED",
        createdAt: timestamp,
        updatedAt: timestamp,
      },
      site: persistedSite,
    };
    this.investigations.push(result);
    return result;
  }

  async getById(_investigationId: string): Promise<InvestigationLookupResult> {
    return {
      kind: "not_found",
      investigationId: _investigationId,
    };
  }
}

function sourceFor(
  candidate: ConstructionCandidate,
  unavailable = false,
): CandidateSource {
  const source = candidate.source;

  return {
    async listCandidates(): Promise<CandidateSourceResult> {
      return unavailable
        ? { kind: "unavailable", source, reason: "Snapshot unavailable." }
        : {
            kind: "available",
            source,
            candidates: [candidate],
            statistics: {
              imported: 1,
              accepted: candidate.validation.status === "ACCEPTED" ? 1 : 0,
              quarantined:
                candidate.validation.status === "QUARANTINED" ? 1 : 0,
              invalid: candidate.validation.status === "INVALID" ? 1 : 0,
              investigationReady: candidate.site === undefined ? 0 : 1,
              duplicateCoordinateRecords: 0,
              duplicateCoordinateGroups: 0,
            },
          };
    },
    async getById(candidateId: string): Promise<CandidateLookupResult> {
      if (unavailable) {
        return { kind: "unavailable", source, reason: "Snapshot unavailable." };
      }
      return candidateId === candidate.id
        ? { kind: "found", candidate }
        : { kind: "not_found", source, candidateId };
    },
  };
}

async function sourceCandidates() {
  const result = await new OpenCitySeiaaCandidateSource().listCandidates();
  assert.equal(result.kind, "available");
  if (result.kind !== "available") {
    throw new Error("Expected available source snapshot.");
  }
  return result.candidates;
}

function requiredCandidate(
  candidates: readonly ConstructionCandidate[],
  status: ConstructionCandidate["validation"]["status"],
): ConstructionCandidate {
  const candidate = candidates.find(
    (value) => value.validation.status === status,
  );
  if (candidate === undefined) {
    throw new Error(`Expected a ${status} source candidate.`);
  }
  return candidate;
}

test("accepted candidate creates a CREATED investigation and persists its deterministic Site", async () => {
  const candidate = requiredCandidate(await sourceCandidates(), "ACCEPTED");
  assert.ok(candidate?.site);

  const store = new MemoryInvestigationStore();
  const useCase = new CreateInvestigationFromCandidate(
    sourceFor(candidate),
    store,
  );
  const result = await useCase.execute(candidate.id);

  assert.equal(result.kind, "created");
  if (result.kind !== "created") {
    return;
  }
  assert.equal(result.investigation.status, "CREATED");
  assert.equal(result.site.id, candidate.site.id);
  assert.equal(store.sites.size, 1);
});

test("repeated candidate selection reuses Site identity and creates a new Investigation", async () => {
  const candidate = requiredCandidate(await sourceCandidates(), "ACCEPTED");

  const store = new MemoryInvestigationStore();
  const useCase = new CreateInvestigationFromCandidate(
    sourceFor(candidate),
    store,
  );
  const first = await useCase.execute(candidate.id);
  const second = await useCase.execute(candidate.id);

  assert.equal(first.kind, "created");
  assert.equal(second.kind, "created");
  if (first.kind === "created" && second.kind === "created") {
    assert.equal(first.site.id, second.site.id);
    assert.notEqual(first.investigation.id, second.investigation.id);
  }
  assert.equal(store.sites.size, 1);
  assert.equal(store.investigations.length, 2);
});

test("rejects unknown, quarantined, invalid input, and unavailable source results", async () => {
  const candidates = await sourceCandidates();
  const accepted = requiredCandidate(candidates, "ACCEPTED");
  const quarantined = requiredCandidate(candidates, "QUARANTINED");

  const store = new MemoryInvestigationStore();
  const normal = new CreateInvestigationFromCandidate(
    sourceFor(accepted),
    store,
  );
  assert.equal((await normal.execute(" ")).kind, "invalid");
  assert.equal(
    (await normal.execute("candidate-missing")).kind,
    "candidate_not_found",
  );

  const blocked = new CreateInvestigationFromCandidate(
    sourceFor(quarantined),
    store,
  );
  assert.equal(
    (await blocked.execute(quarantined.id)).kind,
    "candidate_not_investigation_ready",
  );

  const unavailable = new CreateInvestigationFromCandidate(
    sourceFor(accepted, true),
    store,
  );
  assert.equal(
    (await unavailable.execute(accepted.id)).kind,
    "candidate_source_unavailable",
  );
});
