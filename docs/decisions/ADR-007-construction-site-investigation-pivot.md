# ADR-007: Construction-site investigation product pivot

- **Status:** Accepted
- **Date:** 2026-09-04

## Context

The initial CivicLens concept centered on independently verifying civic-complaint closure, mapping a complaint to an administrative function, and preparing an escalation record. The repository now contains a useful modular foundation, seeded complaint fixtures, provenance rules, and frozen prototype GBA administrative references, but it does not contain the intended construction-investigation capability.

The product is being narrowed for the Bengaluru Tech Week buildathon. Its central question is whether available cross-system evidence about a selected construction site warrants human investigation. A conclusion about spatial overlap, available records, or civic signals cannot establish illegality, ownership, enforcement responsibility, or liability.

## Options considered

1. Continue expanding the complaint verification and escalation product.
2. Retain the foundation but make complaint handling the primary investigation workflow.
3. Pivot the active product model to `Site` and `Investigation`, retaining complaint artifacts only as legacy or future contextual civic-signal inputs.

## Decision

Adopt option 3.

```text
Site → Investigation → Evidence → Change / spatial / record / signal analysis
     → Administrative context → Evidence-backed findings → Human verification
```

`Site` is the physical anchor. `Investigation` is the central product object. Evidence is normalized with provenance and limitations. Findings distinguish observed, deterministic derived, AI-inferred, and unresolved conclusions.

Deterministic computation establishes facts such as validated metadata, dates, geometry intersection, and proximity. AI interprets imagery/documents and synthesizes only validated evidence. Neither layer determines legality, ownership, enforcement, or unobserved government records.

The modular root-level Next.js architecture, provider-port pattern, coordinate validation, fixture discipline, provenance rules, and GBA source/version metadata remain useful. Complaint lifecycle, authority routing, verification outcomes, cases, and escalation are no longer active MVP capabilities.

## Rationale and evidence

The construction-investigation thesis is stronger when it cross-examines multiple evidence sources instead of asking a user to manually compare one image pair. It also fits a bounded MVP: one site can demonstrate evidence collection, change interpretation, spatial context, record availability, civic signals, administrative context, and a transparent recommendation without building a city-wide civic platform.

Provider availability, licensing, coverage, and source quality remain unknown until separately researched. The product therefore preserves replaceable boundaries and labels prepared or unavailable evidence honestly.

## Trade-offs

- Existing complaint code and the Prisma schema are now legacy and may temporarily coexist with the active documentation.
- The MVP must resist overclaiming when imagery, land geometry, or government records are unavailable.
- A credible spatial claim requires provenance-aware compatible geometry; approximate site coordinates or administrative references alone are insufficient.
- The pivot defers escalation and enforcement workflows rather than pretending a finding can automatically trigger official action.

## Supersession and reframing

- **ADR-001:** superseded in product scope; its provider-boundary and honest-provenance principles remain active.
- **ADR-002:** superseded; the old verification taxonomy and complaint authority-routing policy no longer define the product.
- **ADR-003:** remains active; the modular single-application architecture remains appropriate.
- **ADR-004:** remains active; root application, Node/npm, PostgreSQL, and Prisma version decisions remain appropriate.
- **ADR-005:** superseded in product scope; immutable external-source provenance remains a useful pattern.
- **ADR-006:** reframed; frozen GBA data may provide administrative context but is not a land boundary, property record, or enforcement-routing authority.

## Reconsider when

Revisit this decision if validated sources, legal review, user research, or evaluation show that construction-site investigation should include a different primary object or workflow. Revisit each provider boundary only after source access, licensing, coverage, accuracy, retention, and privacy characteristics are documented.
