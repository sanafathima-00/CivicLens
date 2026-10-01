# CivicLens Decision Records

Decision records document consequential product, architecture, data, provider, privacy, and evaluation choices. They are not implementation logs. Historical decisions remain readable even when a later ADR supersedes their active product scope.

| Record | Status | Current relevance |
| --- | --- | --- |
| [ADR-001](ADR-001-mvp-provider-and-evidence-strategy.md) | Superseded in scope | Provider boundaries and provenance remain active; complaint/closure product scope does not. |
| [ADR-002](ADR-002-verification-and-accountability-policy.md) | Superseded | Complaint verification outcomes and authority routing are no longer the product model. |
| [ADR-003](ADR-003-mvp-application-architecture.md) | Active | Modular root-level Next.js application remains the MVP architecture. |
| [ADR-004](ADR-004-single-app-root-and-prisma-version.md) | Active | Root application, Node/npm, PostgreSQL, and Prisma baseline remain active. |
| [ADR-005](ADR-005-complaint-source-history-and-provenance.md) | Superseded in scope | Immutable source provenance remains useful; complaint history is legacy. |
| [ADR-006](ADR-006-frozen-prototype-administrative-mapping.md) | Reframed | GBA mapping is administrative context, not routing or enforcement. |
| [ADR-007](ADR-007-construction-site-investigation-pivot.md) | Active | Defines the Site/Investigation product pivot and evidence boundary. |
| [ADR-008](ADR-008-opencity-seiaa-candidate-snapshot.md) | Active MVP decision | Uses a versioned OpenCity/KSRSAC SEIAA KML snapshot as an approximate, source-backed candidate population with explicit quarantine and spatial limitations. |
| [ADR-009](ADR-009-sentinel-2-context-imagery-foundation.md) | Active MVP decision | Uses Planetary Computer Sentinel-2 L2A only as dated, provenance-labelled context imagery around a Site coordinate. |
| [ADR-010](ADR-010-deterministic-imagery-comparison-policy.md) | Active MVP decision | Defines evidence-bounded deterministic imagery-pair selection and comparability without visual interpretation. |
| [ADR-011](ADR-011-vision-analysis-boundary.md) | Active MVP decision | Defines bounded model interpretation, uncertainty, and output provenance for verified imagery pairs. |

Use the decision-log skill for consequential decisions. New decisions must distinguish tested facts from MVP assumptions and record reconsideration criteria.
