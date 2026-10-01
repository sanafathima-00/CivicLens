import { z } from "zod";

import {
  CHANGE_EPISTEMIC_STATE_VALUES,
  VISUAL_CHANGE_OUTCOME_VALUES,
  type ChangeEpistemicState,
  type VisualChangeOutcome,
} from "./construction-change-analysis";

export const VISION_ANALYSIS_SCHEMA_VERSION = "vision-analysis-v1";

export interface VisualInterpretation {
  readonly outcome: VisualChangeOutcome;
  readonly epistemicState: ChangeEpistemicState;
  readonly observedIndicators: readonly string[];
  readonly interpretation?: string;
  readonly limitations: readonly string[];
  readonly supportingEvidenceItemIds: readonly [string, string];
}

export interface VisionAnalyzerMetadata {
  readonly providerId: string;
  readonly providerLabel: string;
  readonly model: string;
  readonly promptVersion: string;
  readonly schemaVersion: string;
}

export interface VisionAnalysis {
  readonly id: string;
  readonly constructionChangeAnalysisId: string;
  readonly beforeEvidenceItemId: string;
  readonly afterEvidenceItemId: string;
  readonly metadata: VisionAnalyzerMetadata;
  readonly inputFingerprint: string;
  readonly interpretation: VisualInterpretation;
  readonly createdAt: Date;
}

const observedOutcomes = [
  "VISIBLE_CONTEXT_CHANGE_UNCLASSIFIED",
  "NO_SIGNIFICANT_VISIBLE_CONTEXT_CHANGE",
] as const;
const inferredOutcomes = [
  "APPARENT_LARGE_SCALE_BUILT_CONTEXT_CHANGE",
  "APPARENT_GROUND_DISTURBANCE_OR_SURFACE_CHANGE",
  "APPARENT_OPEN_CONTEXT_TO_BUILT_SURFACE_CHANGE",
  "VISIBLE_CONTEXT_CHANGE_UNCLASSIFIED",
] as const;

// Vision output may describe what is visible, but it cannot establish legal,
// ownership, or source-metadata facts. These allowlisted, conservative checks
// deliberately target assertion vocabulary rather than ordinary visual language.
const prohibitedLegalClaim =
  /\b(?:illegal|illegality|unlawful|lawful|legal(?:\s+(?:status|conclusion))?|non[-\s]?compliant|non[-\s]?compliance|compliance|violat(?:e|es|ed|ions?)|breach(?:es|ed)?|encroach(?:ment|ing)?|(?:un)?authori[sz](?:ed|ation)|(?:un)?approved|approval|permit(?:ted)?|regulat(?:ory|ion)|enforc(?:e|es|ed|ing|ement)|owner(?:ship)?|title|cadastral(?:\s+(?:authority|boundary))?)\b/i;

const prohibitedTechnicalClaim =
  /(?:\b(?:gsd|crs|epsg|sha-?256|asset\s+(?:hash|integrity)|coordinates?|latitude|longitude|acquisition\s+(?:date|time|timestamp)|capture\s+(?:date|time|timestamp)|observ(?:ed|ation)\s+(?:date|time|timestamp)|source\s+(?:provider|identity)|collection\s+identity)\b|\b(?:provider|source|collection)\s+(?:is|was|:)|\b(?:image|imagery|source)\s+(?:(?:is|was|came|comes)\s+from|(?:was\s+)?(?:provided|sourced)\s+from|was\s+provided\s+by)\b|\baccording\s+to\s+(?:the\s+)?(?:provider|source)\b|\bprovider\b[^.]{0,80}\b(?:confirm(?:s|ed)?|state(?:s|d)?|report(?:s|ed)?)\b|\b(?:aoi|area\s+of\s+interest)\b[^.]{0,80}\b(?:dimension|measure(?:s|ment)?|square|\d+(?:\.\d+)?\s*(?:m|met(?:er|re)s?|km))|\b(?:parcel|footprint)\s+boundar(?:y|ies)\b|\b(?:exactly|approximately|about)\s+\d+(?:\.\d+)?\s*(?:m|met(?:er|re)s?|km|ft|feet)\b|\b\d+(?:\.\d+)?\s*(?:m|met(?:er|re)s?)\s*(?:gsd|resolution)\b|\b(?:resolution|gsd)\s+(?:is|was|of|:)\s*\d|\b\d{4}-\d{2}-\d{2}\b|\b(?:january|february|march|april|may|june|july|august|september|october|november|december)\s+\d{1,2},?\s+\d{4}\b)/i;

const sourceActor = String.raw`(?:(?:an?\s+)?(?:(?:remote[-\s]sensing|imaging)\s+)?(?:satellite|provider|sensor|source|platform)(?:\s+[a-z0-9-]+){0,3}|[a-z]+-\d+(?:[a-z0-9-]*)?)`;
const imageryObject = String.raw`(?:(?:this|the|an?)\s+)?(?:(?:later|earlier)\s+)?(?:image|imagery|observation|source)`;
const provenanceVerb = String.raw`(?:capture(?:s|d)?|collect(?:s|ed)?|acquir(?:e|es|ed)|suppl(?:y|ies|ied)|sourc(?:e|es|ed)|provid(?:e|es|ed))`;
const pastProvenanceVerb = String.raw`(?:captured|collected|acquired|provided|sourced)`;

const sourceFirstProvenanceAssertion = new RegExp(
  String.raw`\b${sourceActor}\s+${provenanceVerb}\s+${imageryObject}\b`,
  "i",
);
const imageFirstProvenanceAssertion = new RegExp(
  String.raw`\b${imageryObject}\s+(?:was\s+)?${pastProvenanceVerb}\s+(?:by|from)\s+${sourceActor}\b|\b(?:this|it)\s+was\s+${pastProvenanceVerb}\s+(?:by|from)\s+${sourceActor}\b`,
  "i",
);

function isSourceIdentityAssertion(text: string): boolean {
  return (
    sourceFirstProvenanceAssertion.test(text) ||
    imageFirstProvenanceAssertion.test(text)
  );
}

const provenanceDateAssertion =
  /\b(?:(?:image|imagery|source)\s+)?(?:was\s+)?(?:captured|collected|acquired|published|retrieved)\s+(?:on|at)\s+(?:(?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\s+\d{1,2}|\d{1,2}\s+(?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?))\b|\b(?:imagery|image|capture|collection|acquisition|publication|retrieval|source\s+update)\s+date\s+(?:is|was|:)\s+(?:(?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\s+\d{1,2}|\d{1,2}\s+(?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?))\b/i;

function containsUnsupportedClaim(text: string): boolean {
  return (
    prohibitedLegalClaim.test(text) ||
    prohibitedTechnicalClaim.test(text) ||
    isSourceIdentityAssertion(text) ||
    provenanceDateAssertion.test(text)
  );
}

export const visualInterpretationSchema = z
  .object({
    outcome: z.enum(VISUAL_CHANGE_OUTCOME_VALUES),
    epistemicState: z.enum(CHANGE_EPISTEMIC_STATE_VALUES),
    observedIndicators: z.array(z.string().trim().min(1)).max(12),
    interpretation: z.string().trim().min(1).max(1200).optional(),
    limitations: z.array(z.string().trim().min(1)).max(20),
    supportingEvidenceItemIds: z.tuple([z.string().min(1), z.string().min(1)]),
  })
  .strict()
  .superRefine((value, context) => {
    const permitted =
      value.epistemicState === "UNRESOLVED"
        ? value.outcome === "INSUFFICIENT_EVIDENCE"
        : value.epistemicState === "OBSERVED"
          ? observedOutcomes.includes(
              value.outcome as (typeof observedOutcomes)[number],
            )
          : inferredOutcomes.includes(
              value.outcome as (typeof inferredOutcomes)[number],
            );
    if (!permitted) {
      context.addIssue({
        code: "custom",
        message: "The visual outcome is not permitted for its epistemic state.",
      });
    }
    if (
      value.supportingEvidenceItemIds[0] === value.supportingEvidenceItemIds[1]
    ) {
      context.addIssue({
        code: "custom",
        message: "Two distinct imagery evidence references are required.",
      });
    }
  });

export function validateVisualInterpretation(
  value: unknown,
  trustedLimitations: readonly string[] = [],
): VisualInterpretation | undefined {
  const parsed = visualInterpretationSchema.safeParse(value);
  if (!parsed.success) return undefined;
  const trusted = new Set(trustedLimitations);
  for (const text of [
    ...parsed.data.observedIndicators,
    ...(parsed.data.interpretation === undefined
      ? []
      : [parsed.data.interpretation]),
    ...parsed.data.limitations.filter((limitation) => !trusted.has(limitation)),
  ]) {
    if (containsUnsupportedClaim(text)) return undefined;
  }
  return parsed.data;
}
