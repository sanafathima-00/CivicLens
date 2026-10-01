# CivicLens Conceptual Data Model

## Scope

This document defines the target conceptual model for the construction-site investigation product. The Prisma schema includes additive `Site`, `Investigation`, `EvidenceRetrieval`, and `EvidenceItem` foundations; the legacy complaint/case models remain unchanged.

## Primary relationships

```text
Site 1 ── * Investigation
Investigation 1 ── * EvidenceItem
Investigation 1 ── * Finding
Site 0..* ── ConstructionFootprint
ConstructionFootprint * ── * LandFeature
Investigation 0..* ── CivicSignal
Investigation 0..1 ── AdministrativeContext
Investigation 0..* ── GovernmentRecordFinding
```

## Site

The physical construction location and geographic anchor.

- Stable internal identity.
- Coordinate pair, source, precision/quality, and availability state.
- Address or location description where available.
- Discovery/source metadata and provenance.
- Optional construction-footprint references.

A `Site` is not an `Investigation`; one site may have multiple investigations over time.

### Implemented Site foundation

The runtime `Site` contract has a stable CivicLens internal ID, optional label, a consolidated origin object, and a separate location object. `origin.externalRecordId` is optional and never replaces the CivicLens ID. Origin records provider identity, source classification, live/non-live state, retrieval date, and optional verified reference/version without duplicating those facts in separate source or provenance objects.

`SiteLocation` is `MAPPABLE` with a valid latitude/longitude pair and `EXACT`, `APPROXIMATE`, or `PREPARED` quality; `NOT_MAPPABLE` with useful address/location metadata but no coordinates; or `UNRESOLVED` when a source record lacks enough geographic context. Coordinates identify a location only; they are not property, cadastral, or ownership boundaries. Seeded and analyst-prepared fixtures are explicitly non-live demo data.

The `Site` Prisma model is additive. It now has an Investigation relation; it does not carry evidence, finding, or geometry relations directly. Evidence remains scoped to an Investigation so separate examinations can retain their own retrieval context.

### Implemented source-backed candidate population

Candidate discovery is represented separately from the Site contract. A `ConstructionCandidate` preserves the raw source record, source metadata, location semantics, validation state, and optional accepted `Site` projection.

```text
CandidateSourceMetadata + CandidateSourceRecord
        ↓
ConstructionCandidate
        ├── validation: ACCEPTED | QUARANTINED | INVALID
        ├── conditions: known anomaly, duplicate coordinate, malformed coordinate, missing field
        ├── location semantics: approximate project/site location
        └── accepted Site projection only when investigation-ready
```

The implemented OpenCity/KSRSAC SEIAA snapshot preserves KGIS construction ID, KGIS code, raw construction name, village ID, department code, raw KML coordinate, source URL, resource identity, source snapshot hash, retrieval date, attribution, and catalogue licence designation. It is source-backed static data, not a live API result, fictional seed, or analyst-prepared coordinate.

An accepted KML Point is `MAPPABLE` and `APPROXIMATE`; it has no `coordinatePrecisionMeters`. Quarantined and invalid records remain traceable as candidate records but do not become investigation-ready Sites. Duplicate-coordinate records remain distinct because source records may describe an original project, an expansion, or another distinct approval.

## Investigation

A structured examination of one site at a point in time.

- Site reference, investigation status, and creation/update timestamps are implemented.
- Evidence retrieval outcomes and EvidenceItems are implemented as an additive inventory foundation.
- Findings, confidence/limitations, human-verification recommendation, and downstream analysis references remain planned.

## EvidenceItem and EvidenceRetrieval

An externally sourced or explicitly prepared artifact supporting an investigation. Examples include imagery, documents, records, land-feature data, civic reports, notices, and administrative mapping results. Step 5 implements `EvidenceItem` with an associated `EvidenceRetrieval` attempt.

- Stable identity and evidence type.
- Provider/source and explicit provenance class.
- Capture, publication, creation, availability, and retrieval dates when known.
- Geographic/site relevance and quality notes.
- Content/storage reference, access classification, and integrity metadata where feasible.
- Limitations and availability state.

Provider availability is represented by `EvidenceRetrieval` (`AVAILABLE`, `PARTIAL`, `UNAVAILABLE`, or `UNRESOLVED`), not by fabricating an EvidenceItem. An unavailable provider therefore records an availability fact without claiming that evidence does not exist.

### Implemented Step 6A imagery foundation

Step 6A can persist a dated `IMAGERY` EvidenceItem through the existing
retrieval and asset-reference fields. Its metadata contains the provider's
stable STAC item/product identity, actual acquisition time, source update or
publication time when available, cloud metadata, resolution, CRS, asset role,
processing record, and a versioned derived context AOI. The AOI is a 320m by
320m context around a mappable Site coordinate; it is not a construction
footprint, parcel, property, or legal boundary. Sentinel-2's 10m imagery is
therefore retained as context-scale evidence only.

Evidence does not become fact solely because AI interprets it.

### Implemented deterministic comparison and vision interpretation foundations

`ConstructionChangeAnalysis` is an immutable deterministic comparison of one
verified imagery pair. It retains the pair, AOI identity, comparison policy,
integrity/date/quality facts, comparability, evidence sufficiency, and
limitations. Before visual interpretation it remains
`INSUFFICIENT_EVIDENCE` / `UNRESOLVED`; it does not claim construction change.

`VisionAnalysis` is a separate immutable, model-dependent interpretation linked
to one deterministic comparison. It records the exact before/after evidence
references, provider/model/prompt/schema identity, an input fingerprint,
structured visual interpretation, and limitations. It never overwrites the
deterministic comparison. Numeric model confidence is not persisted: uncertainty
is expressed by deterministic evidence sufficiency, epistemic state, and
limitations.

## Planned ConstructionChangeFinding

Answers what changed at the site using dated evidence. Categories are `NEW_CONSTRUCTION`, `FOOTPRINT_EXPANSION`, `CONSTRUCTION_PROGRESS`, `EXCAVATION_OR_SITE_PREPARATION`, `OPEN_LAND_TO_BUILT`, `NO_SIGNIFICANT_CHANGE`, and `INSUFFICIENT_EVIDENCE`.

It retains imagery observations, inference, supporting evidence IDs, confidence, dates, and limitations separately.

## ConstructionFootprint and LandFeature

`ConstructionFootprint` is a polygon for the construction area. It records whether it is sourced, derived, analyst-prepared, or approximate. It is never treated as authoritative cadastral/property geometry without supporting evidence.

`LandFeature` is a provenance-aware polygon or other geometry for a lake, park, public/open space, road/right-of-way, or another relevant feature. Its feature type, source, version/date, quality, and geometry basis are retained.

## SpatialFinding

A deterministic relationship between a construction footprint and land feature.

- Input footprint and feature IDs.
- Calculation method/version and geometry compatibility.
- Relationship state: overlap, proximity, no relationship, unavailable, or unresolved.
- Supporting geometry provenance and limitations.

An overlap may support `POTENTIAL_SPATIAL_CONFLICT`. It does not establish encroachment, ownership, or illegality.

## GovernmentRecordFinding

Represents what available building/permission records state and whether available evidence appears consistent.

- Supporting record evidence IDs.
- Extracted fields such as use, areas, floors, height, project/file number, approval date, conditions, and plan information when available.
- Outcome: `CONSISTENT_WITH_AVAILABLE_RECORDS`, `POTENTIAL_DISCREPANCY`, or `INSUFFICIENT_EVIDENCE`.
- Extraction method, confidence, limitations, and recommended verification.

Record absence is evidence of unavailability, not non-compliance.

## CivicSignal

Contextual, provenance-aware public evidence such as a relevant civic report, repeated reports, notice/order, or temporal relationship. A signal supports investigation context but is not legal proof.

## AdministrativeContext

Describes where a site falls administratively.

- City corporation, optional ward, and optional administrative function.
- Mapping source, version, retrieval date, method, quality, and limitations.

It is separate from the source location and is not an enforcement or legal-liability determination.

## Finding and overall assessment

`Finding` is the normalized, evidence-backed product conclusion.

- Type: `CONSTRUCTION_CHANGE`, `SPATIAL_CONFLICT`, `GOVERNMENT_RECORD_DISCREPANCY`, `CIVIC_SIGNAL`, or `ADMINISTRATIVE_CONTEXT`.
- Statement and supporting evidence IDs.
- Epistemic status: `OBSERVED`, `DERIVED`, `INFERRED`, or `UNRESOLVED`.
- Assessment/model confidence where applicable, limitations, and verification recommendation.

An investigation may carry multiple overall outcomes: `CONSISTENT_WITH_AVAILABLE_RECORDS`, `POTENTIAL_SPATIAL_CONFLICT`, `POTENTIAL_DISCREPANCY`, `INSUFFICIENT_EVIDENCE`, and `REQUIRES_HUMAN_VERIFICATION`. It has no `SAFE` or `ILLEGAL` conclusion.
