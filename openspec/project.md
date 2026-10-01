# CivicLens Project Specification

## Purpose

CivicLens is a Bengaluru-focused construction-site investigation MVP. It helps a user examine available evidence about a selected site and decide whether the site warrants human verification. It cross-examines construction change, spatial context, available government records, civic signals, and administrative context.

It is not an illegal-construction detector, property-title system, legal-compliance checker, enforcement service, civic complaint portal, or real-time imagery monitor.

## Product principles

- `Site` is the physical anchor; `Investigation` is the central product object.
- Evidence requires source, provenance, dates when known, quality, and limitations.
- Keep observed evidence, deterministic derived facts, AI inferences, and unresolved questions distinct.
- Deterministic computation establishes facts. AI interprets and synthesizes those facts.
- Spatial overlap is not legal encroachment; proximity is not overlap; mapped boundaries are not automatically ownership boundaries.
- Missing records do not establish non-compliance.
- Label prepared, seeded, simulated, generated, approximate, and unavailable data honestly.
- Keep external providers replaceable and never claim an API, data source, or official result that has not been verified.

## Capability map

- `site-selection`: select or normalize a construction site without fabricating location information.
- `investigation-creation`: create a bounded investigation of one site.
- `evidence-gathering`: inventory provenance-aware available, prepared, or unavailable evidence.
- `construction-change`: interpret dated site evidence with explicit uncertainty.
- `spatial-investigation`: deterministically analyze footprint/land-feature relationships.
- `government-record-cross-check`: compare available record evidence without turning absence into non-compliance.
- `civic-signals`: correlate contextual public evidence without treating it as legal proof.
- `administrative-context`: describe city-corporation/ward context without assigning legal liability.
- `evidence-backed-findings`: synthesize structured findings and human-verification recommendations.

## MVP constraints

- The MVP may use prepared/seeded evidence only with explicit provenance.
- It must not rely on a live imagery, government-record, civic-report, GIS, or candidate-discovery API.
- It favors one credible end-to-end investigation over broad city coverage.
- It is a modular root-level Next.js application, not a monorepo or distributed platform.
- Complaint intake, closure verification, escalation, enforcement, and named-person accountability are outside the active MVP.
