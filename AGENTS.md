# CivicLens Agent Operating Guide

Read this file before meaningful work in this repository.

## Product boundary

CivicLens is an AI-powered construction-site investigation system for Bengaluru. It cross-examines evidence about a selected site and recommends human verification when evidence warrants it. It is not a complaint portal, legal-compliance checker, illegal-construction detector, property-title system, enforcement system, or real-time satellite monitor.

## Evidence rules

- Treat every input as evidence with provenance, quality, dates, and limitations.
- Keep observed evidence, deterministic derived facts, AI inferences, and unresolved questions distinct.
- Do not invent permits, records, imagery dates, measurements, ownership, violations, authorities, civic reports, or enforcement actions.
- A footprint overlap may support a potential spatial conflict. It is not legal encroachment or a legal determination.
- Missing records do not establish non-compliance.
- Clearly label seeded, prepared, simulated, generated, approximate, and unavailable evidence. Never present it as live or official.
- Protect precise site locations, image/document metadata, credentials, and any personal information.

## Deterministic and AI responsibilities

> Deterministic computation establishes facts. AI interprets and synthesizes those facts.

- Deterministic work: validation, coordinates, dates, metadata, filtering, evidence relationships, document retrieval, geometry/intersection, proximity, and schema validation.
- AI work: visual/document interpretation, construction-change interpretation, evidence comparison, and structured investigation narrative.
- AI output is decision support. It must cite supporting evidence, limitations, and uncertainty rather than assert legal conclusions.

## Working model

Before changing code, requirements, or architecture:

1. Identify the relevant boundary: site, investigation, evidence, spatial analysis, government records, civic signals, administrative context, or platform operations.
2. Read `README.md`, relevant OpenSpec specifications, and applicable files in `docs/`.
3. State scope, assumptions, unknowns, evidence provenance, and whether data is real, prepared, or unavailable.
4. Prefer the smallest maintainable change that preserves provider boundaries and auditability.
5. Use a decision record for consequential product, provider, privacy, evidence, or evaluation decisions.
6. Research external source availability, licensing, and API claims before selecting or advertising an integration.

## Architecture rules

- The repository is one modular Next.js application at the root. Do not create a monorepo or nested application.
- UI components must not directly access Prisma, OpenAI, Mapbox, government APIs, GIS systems, or provider adapters.
- Route handlers validate input, invoke application use cases, and return safe responses.
- Domain contracts remain independent of Next.js, Prisma, and concrete providers.
- Provider adapters isolate seeded, prepared, and future external data sources.
- Do not introduce microservices, Kubernetes, Redis, queues, Docker, authentication, or telemetry infrastructure without a demonstrated requirement.

## Legacy prototype handling

The repository retains complaint-oriented prototype code and a GBA administrative-mapping foundation from an earlier CivicLens direction. Do not extend complaint lifecycle, authority-routing, case, verification, or escalation functionality unless a later approved migration explicitly repurposes it. Reuse only its modularity, coordinate validation, provenance discipline, fixture discipline, and administrative-context foundations.

## Project resources

- Product overview: `README.md`
- Requirements: `docs/REQUIREMENTS.md`
- Architecture: `docs/ARCHITECTURE.md`
- Conceptual model: `docs/DATA-MODEL.md`
- Legacy realignment matrix: `docs/PRODUCT-REALIGNMENT.md`
- Decisions: `docs/decisions/`
- OpenSpec: `openspec/`
- Application source: `src/`

## Completion standard

Verify changes in proportion to their risk. Report changed files, validation evidence, remaining uncertainty, and unimplemented dependencies. Do not build code, APIs, migrations, integrations, or UI when the task is documentation or planning only.
