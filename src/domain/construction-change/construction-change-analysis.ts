export const IMAGERY_COMPARABILITY_VALUES = [
  "COMPARABLE",
  "LIMITED",
  "NOT_COMPARABLE",
] as const;

export type ImageryComparability =
  (typeof IMAGERY_COMPARABILITY_VALUES)[number];

export const CHANGE_EVIDENCE_SUFFICIENCY_VALUES = [
  "SUFFICIENT_FOR_CONSERVATIVE_VISUAL_STATEMENT",
  "LIMITED",
  "INSUFFICIENT",
] as const;

export type ChangeEvidenceSufficiency =
  (typeof CHANGE_EVIDENCE_SUFFICIENCY_VALUES)[number];

export const CHANGE_EPISTEMIC_STATE_VALUES = [
  "OBSERVED",
  "INFERRED",
  "UNRESOLVED",
] as const;

export type ChangeEpistemicState =
  (typeof CHANGE_EPISTEMIC_STATE_VALUES)[number];

export const VISUAL_CHANGE_OUTCOME_VALUES = [
  "VISIBLE_CONTEXT_CHANGE_UNCLASSIFIED",
  "APPARENT_LARGE_SCALE_BUILT_CONTEXT_CHANGE",
  "APPARENT_GROUND_DISTURBANCE_OR_SURFACE_CHANGE",
  "APPARENT_OPEN_CONTEXT_TO_BUILT_SURFACE_CHANGE",
  "NO_SIGNIFICANT_VISIBLE_CONTEXT_CHANGE",
  "INSUFFICIENT_EVIDENCE",
] as const;

export type VisualChangeOutcome = (typeof VISUAL_CHANGE_OUTCOME_VALUES)[number];

export interface AoiIdentity {
  readonly policyId: string;
  readonly geometryHash: string;
  readonly purpose: "IMAGERY_CONTEXT_RETRIEVAL";
  readonly sourcePointIsApproximate: boolean;
}

export interface RenderedDimensions {
  readonly width: number;
  readonly height: number;
}

export interface ComparisonFacts {
  readonly beforeEvidenceItemId: string;
  readonly afterEvidenceItemId: string;
  readonly beforeSha256?: string;
  readonly afterSha256?: string;
  readonly beforeObservedAt: string;
  readonly afterObservedAt: string;
  readonly temporalGapDays: number;
  readonly seasonalDifferenceDays: number;
  readonly aoiIdentity: AoiIdentity;
  readonly sameAoi: boolean;
  readonly sameAoiPolicy: boolean;
  readonly sameProvider: boolean;
  readonly sameCollection: boolean;
  readonly compatibleNativeGsd: boolean;
  readonly sameCrs: boolean;
  readonly renderedDimensionsComparable: boolean;
  readonly beforeRenderedDimensions?: RenderedDimensions;
  readonly afterRenderedDimensions?: RenderedDimensions;
  readonly assetsIntegrityVerified: boolean;
  readonly beforeUsability: string;
  readonly afterUsability: string;
  readonly beforeQualityFlags: readonly string[];
  readonly afterQualityFlags: readonly string[];
  readonly selectionRationale: readonly string[];
}

/**
 * A durable deterministic comparison state. It deliberately contains no
 * visual interpretation: Step 6B does not decide what changed.
 */
export interface ConstructionChangeAnalysis {
  readonly id: string;
  readonly investigationId: string;
  readonly beforeEvidenceItemId: string;
  readonly afterEvidenceItemId: string;
  readonly aoiIdentity: AoiIdentity;
  readonly comparisonPolicyId: string;
  readonly deterministicFacts: ComparisonFacts;
  readonly comparability: ImageryComparability;
  readonly evidenceSufficiency: ChangeEvidenceSufficiency;
  readonly outcome: VisualChangeOutcome;
  readonly epistemicState: ChangeEpistemicState;
  readonly observedIndicators: readonly string[];
  readonly limitations: readonly string[];
  readonly createdAt: Date;
}
