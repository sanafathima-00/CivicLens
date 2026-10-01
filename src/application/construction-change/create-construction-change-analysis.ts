import { investigationIdSchema } from "@/contracts/investigations/get-investigation";
import type { ConstructionChangeAnalysisRequest } from "@/contracts/construction-change/create-construction-change-analysis";
import type { EvidenceAssetStore } from "@/domain/evidence/evidence-asset-store";
import type { ConstructionChangeStore } from "@/domain/construction-change/construction-change-store";
import {
  compareImageryPair,
  EvidenceAssetDependencyUnavailableError,
  selectImageryComparison,
} from "@/domain/construction-change/deterministic-imagery-comparison";

export type CreateConstructionChangeAnalysisResult =
  | Awaited<ReturnType<ConstructionChangeStore["persist"]>>
  | { readonly kind: "invalid"; readonly message: string }
  | { readonly kind: "not_found"; readonly investigationId: string }
  | { readonly kind: "unprocessable"; readonly message: string }
  | { readonly kind: "unavailable"; readonly reason: string }
  | { readonly kind: "failed"; readonly reason: string };

export class CreateConstructionChangeAnalysis {
  constructor(
    private readonly store: ConstructionChangeStore,
    private readonly assetStore: EvidenceAssetStore,
  ) {}

  async execute(
    investigationId: string,
    request: ConstructionChangeAnalysisRequest,
  ): Promise<CreateConstructionChangeAnalysisResult> {
    const parsed = investigationIdSchema.safeParse(investigationId);
    if (!parsed.success) {
      return {
        kind: "invalid",
        message: parsed.error.issues[0]?.message ?? "Invalid investigation ID.",
      };
    }
    const imagery = await this.store.getInvestigationImagery(parsed.data);
    if (imagery.kind !== "found") return imagery;

    try {
      let comparison;
      if (
        request.beforeEvidenceItemId !== undefined &&
        request.afterEvidenceItemId !== undefined
      ) {
        const before = imagery.items.find(
          (item) => item.id === request.beforeEvidenceItemId,
        );
        const after = imagery.items.find(
          (item) => item.id === request.afterEvidenceItemId,
        );
        if (
          before === undefined ||
          after === undefined ||
          before.id === after.id
        ) {
          return {
            kind: "unprocessable",
            message:
              "Selected imagery evidence must be two distinct items from this Investigation.",
          };
        }
        comparison = await compareImageryPair(before, after, this.assetStore, [
          "The caller selected this persisted imagery pair; chronological order was normalized deterministically.",
        ]);
      } else {
        comparison = await selectImageryComparison(
          imagery.items,
          this.assetStore,
        );
      }
      if ("kind" in comparison) {
        return {
          kind: "unprocessable",
          message: comparison.limitations.join(" "),
        };
      }
      return await this.store.persist({
        investigationId: parsed.data,
        beforeEvidenceItemId: comparison.before.id,
        afterEvidenceItemId: comparison.after.id,
        aoiIdentity: comparison.aoiIdentity,
        comparisonPolicyId: comparison.comparisonPolicyId,
        deterministicFacts: comparison.deterministicFacts,
        comparability: comparison.comparability,
        evidenceSufficiency: comparison.evidenceSufficiency,
        outcome: "INSUFFICIENT_EVIDENCE",
        epistemicState: "UNRESOLVED",
        observedIndicators: [],
        limitations: comparison.limitations,
      });
    } catch (error) {
      if (error instanceof EvidenceAssetDependencyUnavailableError) {
        return {
          kind: "unavailable",
          reason:
            "Imagery assets are currently unavailable for deterministic comparison.",
        };
      }
      return {
        kind: "failed",
        reason: "Unable to prepare the deterministic imagery comparison.",
      };
    }
  }
}
