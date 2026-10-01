# ADR-001: MVP provider and evidence strategy

- **Status:** Accepted
- **Date:** 2026-09-02

## Context

The buildathon needs a credible, usable demonstration, but a live Sahaaya API and licensed/current aerial imagery may be unavailable, unstable, unauthorized, or unsuitable for a four-hour event. A hard dependency would make the demo fragile and encourage misleading claims about its data.

## Decision

Use seeded realistic complaint records and prepared imagery for the MVP. Access both through `ComplaintProvider` and `EvidenceProvider` interfaces. Store and display provenance for every evidence item, and label mock, prepared, simulated, or generated imagery as such. Future authorized providers can implement the same contracts.

## Rationale

This keeps the core intelligence—normalization, mapping, structured comparison, evidence packaging, and case history—real and demonstrable while isolating unavailable infrastructure.

## Trade-offs

The MVP cannot establish real-time city coverage or prove that imagery is current. Seed data must be curated and transparently described. Adapter contracts and provenance fields add modest design work now, but remove a major integration risk.

## Reconsider when

Revisit when CivicLens has documented authorization, licensing, coverage, reliability, and data-governance terms for a real complaint or imagery provider.
