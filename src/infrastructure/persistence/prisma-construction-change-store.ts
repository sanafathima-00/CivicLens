import { Prisma } from "@/generated/prisma/client";
import type { PrismaClient } from "@/generated/prisma/client";
import { PrismaEvidenceStore } from "@/infrastructure/persistence/prisma-evidence-store";
import type {
  ConstructionChangeAnalysesLookupResult,
  ConstructionChangeStore,
  InvestigationImageryLookupResult,
  PersistConstructionChangeAnalysisResult,
} from "@/domain/construction-change/construction-change-store";
import type {
  ConstructionChangeAnalysis,
  AoiIdentity,
  ChangeEpistemicState,
  ChangeEvidenceSufficiency,
  ComparisonFacts,
  ImageryComparability,
  VisualChangeOutcome,
} from "@/domain/construction-change/construction-change-analysis";

const DATABASE_UNAVAILABLE_ERROR_CODES = new Set([
  "P1000",
  "P1001",
  "P1002",
  "P1008",
  "P1017",
  "P2024",
  "ECONNREFUSED",
  "ECONNRESET",
  "ETIMEDOUT",
  "EHOSTUNREACH",
  "ENETUNREACH",
  "ENOTFOUND",
]);

function databaseUnavailable(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    typeof error.code === "string" &&
    DATABASE_UNAVAILABLE_ERROR_CODES.has(error.code)
  );
}

function stringArray(value: Prisma.JsonValue): readonly string[] {
  return Array.isArray(value) &&
    value.every((entry) => typeof entry === "string")
    ? value
    : [];
}

function aoiIdentity(value: Prisma.JsonValue): AoiIdentity {
  return value as unknown as AoiIdentity;
}

function facts(value: Prisma.JsonValue): ComparisonFacts {
  return value as unknown as ComparisonFacts;
}

function toAnalysis(value: {
  id: string;
  investigationId: string;
  beforeEvidenceItemId: string;
  afterEvidenceItemId: string;
  aoiIdentity: Prisma.JsonValue;
  comparisonPolicyId: string;
  comparability: string;
  deterministicFacts: Prisma.JsonValue;
  evidenceSufficiency: string;
  outcome: string;
  epistemicState: string;
  observedIndicators: Prisma.JsonValue;
  limitations: Prisma.JsonValue;
  createdAt: Date;
}): ConstructionChangeAnalysis {
  return {
    id: value.id,
    investigationId: value.investigationId,
    beforeEvidenceItemId: value.beforeEvidenceItemId,
    afterEvidenceItemId: value.afterEvidenceItemId,
    aoiIdentity: aoiIdentity(value.aoiIdentity),
    comparisonPolicyId: value.comparisonPolicyId,
    comparability: value.comparability as ImageryComparability,
    deterministicFacts: facts(value.deterministicFacts),
    evidenceSufficiency: value.evidenceSufficiency as ChangeEvidenceSufficiency,
    outcome: value.outcome as VisualChangeOutcome,
    epistemicState: value.epistemicState as ChangeEpistemicState,
    observedIndicators: stringArray(value.observedIndicators),
    limitations: stringArray(value.limitations),
    createdAt: value.createdAt,
  };
}

type PersistTransactionResult =
  | {
      readonly kind: "persisted";
      readonly value: Awaited<
        ReturnType<PrismaClient["constructionChangeAnalysis"]["create"]>
      >;
    }
  | { readonly kind: "missing_evidence" }
  | { readonly kind: "cross_investigation_evidence" };

export class PrismaConstructionChangeStore implements ConstructionChangeStore {
  private readonly evidenceStore: PrismaEvidenceStore;

  constructor(private readonly prisma: PrismaClient) {
    this.evidenceStore = new PrismaEvidenceStore(prisma);
  }

  async getInvestigationImagery(
    investigationId: string,
  ): Promise<InvestigationImageryLookupResult> {
    const result = await this.evidenceStore.getPackage(investigationId);
    if (result.kind !== "found") return result;
    return {
      kind: "found",
      investigationId,
      items: result.value.items.filter((item) => item.kind === "IMAGERY"),
    };
  }

  async persist(
    analysis: Omit<ConstructionChangeAnalysis, "id" | "createdAt">,
  ): Promise<PersistConstructionChangeAnalysisResult> {
    try {
      const result = await this.prisma.$transaction(
        async (transaction): Promise<PersistTransactionResult> => {
          const evidenceItems = await transaction.evidenceItem.findMany({
            where: {
              id: {
                in: [
                  analysis.beforeEvidenceItemId,
                  analysis.afterEvidenceItemId,
                ],
              },
            },
            select: {
              id: true,
              retrieval: { select: { investigationId: true } },
            },
          });
          const before = evidenceItems.find(
            (item) => item.id === analysis.beforeEvidenceItemId,
          );
          const after = evidenceItems.find(
            (item) => item.id === analysis.afterEvidenceItemId,
          );
          if (before === undefined || after === undefined) {
            return { kind: "missing_evidence" };
          }
          if (
            before.retrieval.investigationId !== analysis.investigationId ||
            after.retrieval.investigationId !== analysis.investigationId
          ) {
            return { kind: "cross_investigation_evidence" };
          }

          const value = await transaction.constructionChangeAnalysis.create({
            data: {
              investigationId: analysis.investigationId,
              beforeEvidenceItemId: analysis.beforeEvidenceItemId,
              afterEvidenceItemId: analysis.afterEvidenceItemId,
              aoiIdentity:
                analysis.aoiIdentity as unknown as Prisma.InputJsonValue,
              comparisonPolicyId: analysis.comparisonPolicyId,
              comparability: analysis.comparability,
              deterministicFacts:
                analysis.deterministicFacts as unknown as Prisma.InputJsonValue,
              evidenceSufficiency: analysis.evidenceSufficiency,
              outcome: analysis.outcome,
              epistemicState: analysis.epistemicState,
              observedIndicators: [...analysis.observedIndicators],
              limitations: [...analysis.limitations],
            },
          });
          return { kind: "persisted", value };
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );
      if (result.kind === "missing_evidence") {
        return {
          kind: "unprocessable",
          message: "Selected imagery evidence was not found.",
        };
      }
      if (result.kind === "cross_investigation_evidence") {
        return {
          kind: "unprocessable",
          message:
            "Selected imagery evidence does not belong to this Investigation.",
        };
      }
      return { kind: "persisted", value: toAnalysis(result.value) };
    } catch (error) {
      if (databaseUnavailable(error)) {
        return {
          kind: "unavailable",
          reason: "Construction-change storage is currently unavailable.",
        };
      }
      return {
        kind: "failed",
        reason: "Unable to persist the deterministic comparison.",
      };
    }
  }

  async list(
    investigationId: string,
  ): Promise<ConstructionChangeAnalysesLookupResult> {
    try {
      const investigation = await this.prisma.investigation.findUnique({
        where: { id: investigationId },
        select: { id: true },
      });
      if (investigation === null) return { kind: "not_found", investigationId };
      const values = await this.prisma.constructionChangeAnalysis.findMany({
        where: { investigationId },
        orderBy: [{ createdAt: "asc" }, { id: "asc" }],
      });
      return { kind: "found", investigationId, value: values.map(toAnalysis) };
    } catch (error) {
      if (databaseUnavailable(error)) {
        return {
          kind: "unavailable",
          reason: "Construction-change storage is currently unavailable.",
        };
      }
      return {
        kind: "failed",
        reason: "Unable to load deterministic comparisons.",
      };
    }
  }
}
