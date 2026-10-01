# CivicLens Architecture

## Status legend

- **Decided:** product or architecture direction for the MVP.
- **Planned:** capability documented now but not implemented.
- **Legacy:** retained previous-prototype code or schema that is not the active product flow.

## Architecture goal

CivicLens is a modular, single Next.js application that produces an evidence-backed investigation of a selected construction site. Its central object is an `Investigation` of a `Site`, not a complaint or escalation case.

```text
UI / route handler
        ↓
Investigation application use case
        ↓
Domain contracts + deterministic services
        ↓
Provider adapters and persistence
```

## Product flow

```text
Site → Investigation → Evidence → Change analysis → Spatial analysis
     → Government-record cross-check → Civic signals → Administrative context
     → Findings → Human-verification recommendation
```

The application must preserve evidence availability and uncertainty at every stage. A missing provider or record is a fact about availability, not a negative legal conclusion.

## Application shape

- **Decided:** one root-level Next.js application using React, TypeScript, Tailwind CSS 4, npm, and Node 24 LTS.
- **Decided:** route handlers validate requests, invoke application use cases, and return safe view models.
- **Decided:** UI code does not call Prisma, OpenAI, Mapbox, government APIs, GIS systems, or provider adapters directly.
- **Planned:** PostgreSQL/Prisma stores durable investigation metadata; object storage stores image/document assets.
- **Deferred:** authentication, queues, workers, Docker, microservices, Redis, Kubernetes, and telemetry vendor selection.

## Domain boundaries

| Domain area | Responsibility |
| --- | --- |
| `sites` | Geographic anchor, location quality, discovery provenance, and optional footprint reference. |
| `investigations` | Investigation lifecycle, evidence inventory, findings, limitations, and human-review recommendation. |
| `evidence` | Provenance-aware imagery, documents, GIS data, civic signals, and administrative results. |
| `construction-change` | Structured observations and AI-assisted interpretation of dated evidence. |
| `spatial` | Deterministic footprint/land-feature overlap and proximity calculations. |
| `government-records` | Available record evidence and disciplined consistency/discrepancy findings. |
| `civic-signals` | Contextual public reports, notices, and timing correlations. |
| `administrative-context` | City-corporation/ward context and source-versioned mapping quality. |

### Implemented Site foundation

The Site foundation follows the established provider boundary:

```text
GetSiteById → SiteProvider → SeededSiteProvider → deterministic in-memory fixtures
```

`GetSiteById` depends only on the `SiteProvider` domain port. The seeded adapter does not access Prisma, a network, or an external source, and it returns defensive copies. It is a development/demo retrieval capability, not candidate discovery or an external construction-site integration. A later provider may replace it without changing the use case.

Site location is source data, not a property boundary or an administrative conclusion. The Site Prisma model is additive only; no migration is run until a safe development PostgreSQL database is available.

### Implemented candidate discovery foundation

Step 3 adds a separate candidate-discovery boundary without expanding `SiteProvider` beyond direct ID retrieval:

```text
ListConstructionCandidates → CandidateSource → OpenCitySeiaaCandidateSource
                                                  ↓
                                      versioned local KML snapshot
                                                  ↓
                                  normalized candidate → accepted Site
```

The OpenCity adapter is an imported source snapshot, not a live integration. It parses the complete stored KML deterministically, preserves source identifiers and provenance, and returns defensive copies. Accepted records become source-backed `Site` values with `MAPPABLE` / `APPROXIMATE` location semantics. KML-specific IDs, raw names, validation status, duplicate-coordinate conditions, and quarantine reasons remain on the candidate record rather than leaking into the Site domain.

The SEIAA KML Point is an approximate project/site location only. It is not a construction footprint, parcel, cadastral boundary, ownership claim, approval-status assertion, or proof of active construction. Known source anomalies are quarantined; duplicate coordinates are flagged and retained as distinct records.

## Deterministic and AI boundary

> **Deterministic computation establishes facts. AI interprets and synthesizes those facts.**

| Deterministic responsibilities | AI responsibilities |
| --- | --- |
| Coordinates, dates, metadata, filtering, evidence relationships, retrieval, schema validation, geometry intersection, proximity, and structured extraction where appropriate | Visual interpretation, document interpretation, change interpretation, cross-evidence synthesis, and human-readable narrative |

AI output cannot establish legality, ownership, enforcement, an unobserved permit, an invented measurement, or a government action absent from evidence. A schema-validated AI result remains an inference and must carry supporting evidence and limitations.

## Provider boundaries

| Boundary | MVP direction | Future replacement path |
| --- | --- | --- |
| `SiteProvider` | Direct Site retrieval by internal ID | Candidate Sites remain retrievable through an adapter without changing the port |
| `CandidateSource` | Versioned source-backed construction candidate snapshots | Validated K-RERA, BPAS, or other candidate-source adapters |
| `EvidenceProvider` | Prepared or available evidence inventory | Managed external/object-storage evidence sources |
| `ImageryProvider` | Provenance-labelled dated imagery | Licensed, validated imagery source |
| `LandFeatureProvider` | Provenance-labelled prepared or public geometry | Versioned authoritative/credible feature dataset |
| `GovernmentRecordProvider` | Available document/record evidence | Authorized or documented public record source |
| `CivicSignalProvider` | Seeded or verified public signals | Validated civic/public data source |
| `AdministrativeMappingProvider` | Existing frozen GBA prototype references | Maintained source-versioned administrative dataset |
| `VisionAnalyzer` | Structured visual interpretation | Evaluated vision service/model |
| `InvestigationSynthesizer` | Structured evidence-grounded narrative | Evaluated model or human-review workflow |

No provider selection or source API availability is implied by this table. Integrations must be separately researched for access, licensing, coverage, accuracy, and operational suitability.

## Evidence package and finding model

An investigation consumes an evidence package: normalized items, deterministic calculations, provider availability, source versions, and limitations. It emits findings, not an opaque verdict.

Each finding identifies its type, statement, supporting evidence IDs, epistemic status (`OBSERVED`, `DERIVED`, `INFERRED`, or `UNRESOLVED`), confidence where appropriate, limitations, and human-verification recommendation.

Multiple findings can coexist. An overall `REQUIRES_HUMAN_VERIFICATION` result is appropriate when evidence suggests a concern without supporting a legal conclusion.

## Spatial safety

Spatial code may calculate intersection or proximity only from compatible, provenance-labelled geometry. It distinguishes overlap, proximity, missing geometry, and incompatible/uncertain geometry. An overlap can be presented as `POTENTIAL_SPATIAL_CONFLICT`; it is not a property boundary, title, or illegal-encroachment determination.

PostGIS and a full GIS engine are deferred. A later MVP may use bounded, deterministic geometry processing only when the evidence sources justify it.

## Legacy foundation

The current complaint provider, complaint domain, source-history model, authority-routing registry, case/escalation schema, and prototype authority card are legacy from the earlier complaint-accountability direction. They remain untouched in this documentation realignment. Reusable portions are coordinate validation, seeded-fixture discipline, provenance, uncertainty, provider boundaries, and GBA mapping source metadata.

The existing complaint/case schema is legacy conceptual infrastructure. It now coexists with an additive, standalone Site persistence foundation; the active Site/Investigation persistence model beyond Site will be designed in later approved steps.

## Security and privacy

- Do not expose secrets, private addresses, personal complainant data, or restricted imagery/document data.
- Validate provider and AI output before it enters findings.
- Record safe diagnostics without raw credentials or sensitive content.
- Do not publish individual-official assignments, legal accusations, or unsupported claims.
