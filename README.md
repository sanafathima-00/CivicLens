# CivicLens

**Evidence-backed construction-site investigation for Bengaluru.**

CivicLens connects construction-related candidate locations, maps, persistent investigations, dated imagery, and structured visual interpretation. It helps people understand what the available evidence supports and what still needs human verification.

The central question is: **What changed here, what evidence supports that observation, and what remains uncertain?**

## Current capabilities

| Capability                | Current implementation                                                                                                                                                 |
| ------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Candidate discovery       | Parses a versioned OpenCity/KSRSAC SEIAA KML snapshot. Preserves source IDs, attribution, retrieval date, and content hash; quarantines known name/location anomalies. |
| Map and selection         | Displays eligible approximate candidate points through Mapbox, with site provenance before investigation creation.                                                     |
| Persistent investigations | Stores sites, investigations, and source snapshots in PostgreSQL through Prisma.                                                                                       |
| Evidence inventory        | Retrieves site-origin evidence with provenance, dates, availability, limitations, and investigation ownership.                                                         |
| Historical imagery        | Retrieves dated Sentinel-2 L2A context imagery through Microsoft Planetary Computer; stores PNG assets and SHA-256 hashes.                                             |
| Comparison preparation    | Validates chronology, AOI, provider, collection, GSD, CRS, rendered dimensions, and asset integrity deterministically.                                                 |
| Visual interpretation     | Optional OpenAI Responses adapter with structured output and domain validation; separate immutable attempts retain model/prompt/schema/input provenance.               |
| Investigation view        | Presents site context, evidence, chronological imagery, comparison limitations, and vision results.                                                                    |

These are prototype capabilities. Spatial-overlap analysis, permission-record cross-checks, civic-signal integration, and a complete cross-source investigation narrative remain future work. Legacy complaint and administrative-mapping modules are retained as foundations, rather than the active product flow.

## Workflow and boundaries

```text
Source-backed candidate → Map selection → Site + investigation
    → Evidence inventory → Dated context imagery
    → Deterministic comparison → Optional visual interpretation
    → Observations, limitations, and unresolved questions
```

Deterministic code establishes metadata, dates, ownership relationships, integrity, and comparability. AI interprets supplied pixels within that context.

- The candidate catalogue is a **non-live imported snapshot**. It does not establish active construction, footprints, ownership, or current approval status.
- The imagery AOI is a derived **320 m × 320 m context window** around an approximate point, not a parcel or construction boundary.
- Sentinel-2 visible imagery is approximately **10 m resolution**: context-scale evidence, not dependable individual-building detection.
- Clouds, shadows, vegetation, seasonality, and provider availability can make results inconclusive.
- Observed, inferred, and unresolved statements remain distinct. No calibrated numeric model confidence is claimed.
- CivicLens does not determine legality, encroachment, compliance, ownership, liability, or enforcement responsibility. Missing records do not establish non-compliance.

## Architecture

One modular application lives at the repository root. UI components do not directly access database or vision-provider implementations.

```text
src/app                 Pages and validated API route handlers
src/features            Candidate and investigation presentation
src/components          Reusable UI
src/application         Investigation and evidence use cases
src/domain              Provider-independent contracts and policies
src/contracts           Request/response contracts
src/infrastructure      Prisma stores, source/imagery/vision adapters, asset storage
prisma                  Schema and migrations
docs                    Requirements, architecture, decisions, evaluations
openspec                Target capability specifications
```

Stack: TypeScript, Next.js 16, React 19, Tailwind CSS 4, PostgreSQL, Prisma 7, Mapbox GL, and the OpenAI SDK.

## Local setup

Use **Node.js 24.x**, **npm 11.19.0**, and PostgreSQL. From the repository root:

```powershell
npm ci
Copy-Item .env.example .env.local
```

Configure `.env.local` with your own values:

```dotenv
DATABASE_URL=postgresql://USER:PASSWORD@localhost:5432/civiclens
SHADOW_DATABASE_URL=postgresql://USER:PASSWORD@localhost:5432/civiclens_shadow
NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN=YOUR_MAPBOX_PUBLIC_TOKEN
# Optional: both settings are needed for visual interpretation.
OPENAI_API_KEY=
OPENAI_MODEL=
```

Create the development and shadow databases first. `prisma.config.ts` requires both database variables. Next.js loads `.env.local`, but the Prisma CLI's `dotenv/config` does not load that filename automatically. Export the database variables in the Prisma shell, or configure a separate ignored `.env` for the CLI. The example file currently contains only the basic database placeholder; add the settings above as needed.

```powershell
npm run prisma:generate
npx prisma migrate deploy
npm run dev
```

Open `http://localhost:3000`. Select a map candidate, create an investigation, retrieve available evidence/imagery, and inspect comparison and vision results. Without a Mapbox token the map reports unavailable. Without both OpenAI settings the vision provider reports unconfigured.

Imagery retrieval calls an external provider. Vision analysis sends verified imagery bytes and bounded context to OpenAI. Local assets live in `.civiclens-assets/`; this is a development adapter, not a production object store. Keep environment files and local assets out of version control. Authentication and production access controls are not implemented.

## Validation

```powershell
npm run typecheck
npm run lint
npm run format:check
npm run build
npm run test:sites
npm run test:candidates
npm run test:investigations
npm run test:evidence
npm run test:imagery
npm run test:construction-change
npm run test:vision
```

Database integration tests require `TEST_DATABASE_URL` referencing a dedicated **civiclens_test** database with migrations applied; otherwise they skip. Do not use development or production data. Normal imagery/vision tests use fixtures or mocks. `RUN_LIVE_IMAGERY_SMOKE=1` explicitly enables the bounded external imagery check.

## Documentation and attribution

- [Requirements](docs/REQUIREMENTS.md), [architecture](docs/ARCHITECTURE.md), [data model](docs/DATA-MODEL.md)
- [Product realignment](docs/PRODUCT-REALIGNMENT.md)
- [Decision records](docs/decisions/README.md), especially ADR-008 through ADR-011 for the current pipeline
- [Vision fixture evaluation](docs/evaluations/2026-09-05-step-6-mvp-vision-fixtures.md)
- [OpenSpec capability index](openspec/README.md)

Some planning documents describe earlier increments or future requirements. The status table above describes the current source; a specification alone does not establish implementation.

The candidate snapshot retains OpenCity's attribution to KSRSAC and its observed licence designation, **“Other (Public Domain)”**. This is source metadata, not an independent legal determination. Sentinel-2 evidence retains provider and licence metadata. Check source/provider terms before redistribution or production use.
