import { Prisma } from "@/generated/prisma/client";
import type { PrismaClient } from "@/generated/prisma/client";
import type { ConstructionChangeAnalysis } from "@/domain/construction-change/construction-change-analysis";
import type {
  PersistVisionAnalysisResult,
  VisionAnalysesLookupResult,
  VisionAnalysisParentLookup,
  VisionAnalysisStore,
} from "@/domain/construction-change/vision-analysis-store";
import type { VisionAnalysis } from "@/domain/construction-change/vision-analysis";
import { validateVisualInterpretation } from "@/domain/construction-change/vision-analysis";
import { PrismaEvidenceStore } from "./prisma-evidence-store";

const unavailableCodes = new Set([
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

function unavailable(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    typeof error.code === "string" &&
    unavailableCodes.has(error.code)
  );
}

function strings(value: Prisma.JsonValue): readonly string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string")
    ? value
    : [];
}

function toConstruction(
  value: Prisma.ConstructionChangeAnalysisGetPayload<Record<string, never>>,
): ConstructionChangeAnalysis {
  return {
    ...value,
    aoiIdentity: value.aoiIdentity,
    deterministicFacts: value.deterministicFacts,
    observedIndicators: strings(value.observedIndicators),
    limitations: strings(value.limitations),
  } as unknown as ConstructionChangeAnalysis;
}

function toVision(
  value: Prisma.VisionAnalysisGetPayload<Record<string, never>>,
): VisionAnalysis {
  return {
    id: value.id,
    constructionChangeAnalysisId: value.constructionChangeAnalysisId,
    beforeEvidenceItemId: value.beforeEvidenceItemId,
    afterEvidenceItemId: value.afterEvidenceItemId,
    metadata: {
      providerId: value.providerId,
      providerLabel: value.providerLabel,
      model: value.model,
      promptVersion: value.promptVersion,
      schemaVersion: value.schemaVersion,
    },
    inputFingerprint: value.inputFingerprint,
    interpretation: {
      outcome: value.outcome,
      epistemicState: value.epistemicState,
      observedIndicators: strings(value.observedIndicators),
      ...(value.interpretation === null
        ? {}
        : { interpretation: value.interpretation }),
      limitations: strings(value.limitations),
      supportingEvidenceItemIds: [
        value.beforeEvidenceItemId,
        value.afterEvidenceItemId,
      ],
    },
    createdAt: value.createdAt,
  };
}

export class PrismaVisionAnalysisStore implements VisionAnalysisStore {
  private readonly evidenceStore: PrismaEvidenceStore;
  constructor(private readonly prisma: PrismaClient) {
    this.evidenceStore = new PrismaEvidenceStore(prisma);
  }

  async getParent(
    investigationId: string,
    analysisId: string,
  ): Promise<VisionAnalysisParentLookup> {
    try {
      const value = await this.prisma.constructionChangeAnalysis.findUnique({
        where: { id: analysisId },
      });
      if (value === null) return { kind: "not_found", investigationId };
      if (value.investigationId !== investigationId) {
        return {
          kind: "unprocessable",
          message:
            "The deterministic comparison does not belong to this Investigation.",
        };
      }
      return { kind: "found", investigationId, value: toConstruction(value) };
    } catch (error) {
      return unavailable(error)
        ? {
            kind: "unavailable",
            reason: "Vision-analysis storage is currently unavailable.",
          }
        : {
            kind: "failed",
            reason: "Unable to load the deterministic comparison.",
          };
    }
  }

  async getInput(investigationId: string, analysisId: string) {
    const parent = await this.getParent(investigationId, analysisId);
    if (parent.kind !== "found") return parent;
    const packageResult = await this.evidenceStore.getPackage(investigationId);
    if (packageResult.kind !== "found") return packageResult;
    const before = packageResult.value.items.find(
      (item) => item.id === parent.value.beforeEvidenceItemId,
    );
    const after = packageResult.value.items.find(
      (item) => item.id === parent.value.afterEvidenceItemId,
    );
    if (before === undefined || after === undefined) {
      return {
        kind: "unprocessable" as const,
        message:
          "The deterministic comparison's imagery evidence is unavailable.",
      };
    }
    return {
      kind: "found" as const,
      investigationId,
      analysis: parent.value,
      before,
      after,
    };
  }

  async persist(
    value: Omit<VisionAnalysis, "id" | "createdAt">,
  ): Promise<PersistVisionAnalysisResult> {
    try {
      const result = await this.prisma.$transaction(
        async (transaction) => {
          const parent =
            await transaction.constructionChangeAnalysis.findUnique({
              where: { id: value.constructionChangeAnalysisId },
              select: {
                investigationId: true,
                beforeEvidenceItemId: true,
                afterEvidenceItemId: true,
                limitations: true,
              },
            });
          const evidence = await transaction.evidenceItem.findMany({
            where: {
              id: {
                in: [value.beforeEvidenceItemId, value.afterEvidenceItemId],
              },
            },
            select: {
              id: true,
              retrieval: { select: { investigationId: true } },
            },
          });
          const before = evidence.find(
            (item) => item.id === value.beforeEvidenceItemId,
          );
          const after = evidence.find(
            (item) => item.id === value.afterEvidenceItemId,
          );
          if (parent === null || before === undefined || after === undefined)
            return { kind: "unprocessable" as const };
          const validInterpretation = validateVisualInterpretation(
            value.interpretation,
            strings(parent.limitations),
          );
          if (
            validInterpretation === undefined ||
            parent.beforeEvidenceItemId !== value.beforeEvidenceItemId ||
            parent.afterEvidenceItemId !== value.afterEvidenceItemId ||
            before.retrieval.investigationId !== parent.investigationId ||
            after.retrieval.investigationId !== parent.investigationId
          )
            return { kind: "unprocessable" as const };
          return {
            kind: "persisted" as const,
            value: await transaction.visionAnalysis.create({
              data: {
                constructionChangeAnalysisId:
                  value.constructionChangeAnalysisId,
                beforeEvidenceItemId: value.beforeEvidenceItemId,
                afterEvidenceItemId: value.afterEvidenceItemId,
                providerId: value.metadata.providerId,
                providerLabel: value.metadata.providerLabel,
                model: value.metadata.model,
                promptVersion: value.metadata.promptVersion,
                schemaVersion: value.metadata.schemaVersion,
                inputFingerprint: value.inputFingerprint,
                outcome: value.interpretation.outcome,
                epistemicState: value.interpretation.epistemicState,
                observedIndicators: [
                  ...value.interpretation.observedIndicators,
                ],
                interpretation: value.interpretation.interpretation,
                limitations: [...value.interpretation.limitations],
              },
            }),
          };
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );
      if (result.kind === "unprocessable")
        return {
          kind: "unprocessable",
          message:
            "The vision analysis does not match the Investigation's deterministic imagery pair.",
        };
      return { kind: "persisted", value: toVision(result.value) };
    } catch (error) {
      return unavailable(error)
        ? {
            kind: "unavailable",
            reason: "Vision-analysis storage is currently unavailable.",
          }
        : {
            kind: "failed",
            reason: "Unable to persist the visual interpretation.",
          };
    }
  }

  async list(
    investigationId: string,
    analysisId: string,
  ): Promise<VisionAnalysesLookupResult> {
    try {
      const parent = await this.prisma.constructionChangeAnalysis.findFirst({
        where: { id: analysisId, investigationId },
        select: { id: true },
      });
      if (parent === null) return { kind: "not_found", investigationId };
      const values = await this.prisma.visionAnalysis.findMany({
        where: { constructionChangeAnalysisId: analysisId },
        orderBy: [{ createdAt: "asc" }, { id: "asc" }],
      });
      return { kind: "found", investigationId, value: values.map(toVision) };
    } catch (error) {
      return unavailable(error)
        ? {
            kind: "unavailable",
            reason: "Vision-analysis storage is currently unavailable.",
          }
        : { kind: "failed", reason: "Unable to load visual interpretations." };
    }
  }
}
