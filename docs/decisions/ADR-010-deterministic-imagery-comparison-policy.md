# ADR-010: Deterministic imagery-comparison policy

- Status: Active MVP decision
- Date: 2026-09-05

## Context

Step 6A provides dated Sentinel-2 context imagery around a derived AOI. The
existing OpenCity site coordinate is approximate and Sentinel-2 visible imagery
has an approximately 10 m native ground sample distance. This evidence can
support preparation of an auditable comparison, but it cannot reliably establish
an individual-building footprint, parcel boundary, construction activity, or any
legal conclusion.

## Decision

CivicLens persists an immutable `ConstructionChangeAnalysis` for one selected
imagery pair. Step 6B derives only deterministic facts: asset integrity,
chronological ordering, AOI identity, provider/collection/GSD/CRS compatibility,
rendered dimensions, temporal gap, seasonal difference, quality flags, and
selection rationale.

The policy `sentinel2-context-comparison-v1` requires a minimum 90-day temporal
gap. It prefers observations within 45 days of the same seasonal cycle and
records gaps greater than 730 days as a limitation rather than discarding them.
Selection ranks comparability, seasonal similarity, temporal separation, and
stable observation identifiers in that order.

No pixel-difference score, embedding, segmentation, image model, confidence
score, or visual interpretation is produced. Even a fully comparable pair is
persisted as `INSUFFICIENT_EVIDENCE` and `UNRESOLVED` until a later, separately
approved visual-analysis increment interprets the supplied imagery.

## Consequences

`COMPARABLE`, `LIMITED`, and `NOT_COMPARABLE` describe the pair. Evidence
sufficiency describes the strongest *future conservative visual statement* the
pair could support. Neither describes construction legality, ownership,
encroachment, approval, a footprint, or a change outcome.

The AOI remains a derived imagery context around a source-provided site point;
it is not a construction footprint or boundary. Missing, corrupt, or
incompatible assets produce an honest non-comparable/insufficient state.

## Reconsideration criteria

Revisit this policy only after a tested visual-analysis design can cite exact
imagery EvidenceItems, preserve the observed/inferred/unresolved boundary, and
demonstrate robust handling of cloud, shadow, vegetation, seasonality, and the
10 m context-scale limitation.
