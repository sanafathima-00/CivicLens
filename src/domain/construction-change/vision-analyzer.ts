import type { EvidenceAssetReference } from "@/domain/evidence/evidence";
import type {
  ImageryQualityFlag,
  ImageryUsability,
} from "@/domain/imagery/historical-imagery-provider";

import type {
  AoiIdentity,
  ChangeEvidenceSufficiency,
  ImageryComparability,
} from "./construction-change-analysis";
import type {
  VisionAnalyzerMetadata,
  VisualInterpretation,
} from "./vision-analysis";

export const CONSTRUCTION_CONTEXT_VISION_PROMPT_VERSION =
  "construction-context-vision-v1";

export interface VisionImageInput {
  readonly evidenceItemId: string;
  readonly observedAt: string;
  readonly bytes: Uint8Array;
  readonly contentType: "image/png";
  readonly sha256: string;
  readonly source: {
    readonly providerId: string;
    readonly collectionId: string;
    readonly nativeGsdMeters?: number;
    readonly crs?: string;
    readonly usability: ImageryUsability;
    readonly qualityFlags: readonly ImageryQualityFlag[];
  };
}

export interface VisionComparisonInput {
  readonly comparisonAnalysisId: string;
  readonly comparisonPolicyId: string;
  readonly before: VisionImageInput;
  readonly after: VisionImageInput;
  readonly deterministicContext: {
    readonly comparability: ImageryComparability;
    readonly evidenceSufficiency: ChangeEvidenceSufficiency;
    readonly temporalGapDays: number;
    readonly seasonalDifferenceDays: number;
    readonly aoiIdentity: AoiIdentity;
    readonly limitations: readonly string[];
  };
}

export type VisionAnalyzerResult =
  | {
      readonly kind: "completed";
      readonly value: VisualInterpretation;
      readonly metadata: VisionAnalyzerMetadata;
    }
  | { readonly kind: "refused"; readonly reason: string }
  | { readonly kind: "invalid_output"; readonly reason: string }
  | { readonly kind: "unavailable"; readonly reason: string }
  | { readonly kind: "failed"; readonly reason: string };

export interface VisionAnalyzer {
  readonly providerId: string;
  analyze(input: VisionComparisonInput): Promise<VisionAnalyzerResult>;
}

export interface VerifiedVisionAsset {
  readonly itemId: string;
  readonly asset: EvidenceAssetReference;
  readonly bytes: Uint8Array;
}
