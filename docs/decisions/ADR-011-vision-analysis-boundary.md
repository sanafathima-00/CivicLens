# ADR-011: Vision-analysis boundary and uncertainty model

- Status: Active MVP decision
- Date: 2026-09-05

## Decision

Step 6C keeps deterministic imagery comparison separate from model-dependent
visual interpretation. A `ConstructionChangeAnalysis` remains immutable,
deterministic preparation of a verified imagery pair. Each model attempt is a
new immutable `VisionAnalysis` linked to that parent.

The application, not the model, establishes investigation ownership, asset
integrity, observation dates, AOI identity, GSD, CRS, comparability, and
evidence sufficiency. The vision provider receives only verified PNG bytes and
bounded trusted context; it never receives signed imagery URLs or Prisma data.

The OpenAI Responses adapter uses strict structured output and validates output
again at the domain boundary. The prompt version is
`construction-context-vision-v1`. Results retain provider, model, prompt,
schema, and canonical input-fingerprint provenance for reanalysis.

## Uncertainty and safety

CivicLens does not persist numeric model confidence. Uncertainty is expressed
by deterministic evidence sufficiency, `OBSERVED`/`INFERRED`/`UNRESOLVED`, and
explicit limitations. These are not calibrated probabilities or legal
certainty.

The model can only interpret supplied context imagery. It cannot assert
illegality, compliance, encroachment, ownership, approvals, permits,
enforcement, footprints, parcels, or dates/measurements not supplied as trusted
metadata. The AOI remains a context window around a Site coordinate, not a
construction or legal boundary.
