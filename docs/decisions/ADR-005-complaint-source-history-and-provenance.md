# ADR-005: Complaint source history and seeded provenance

- **Status:** Accepted
- **Date:** 2026-09-03

## Context

CivicLens needs realistic complaint timelines while remaining able to challenge a source system's resolution claim. The original foundation had a generic complaint status and `CaseEvent`, but no distinct representation for source-system history.

## Options considered

1. Record source history in `CaseEvent`.
2. Keep only a mutable current source status on `Complaint`.
3. Preserve immutable `ComplaintSourceEvent` records separately and label seeded records with explicit prototype provenance.

## Decision

Use normalized source statuses including `MARKED_RESOLVED`, distinct from CivicLens verification outcomes. Store source-history events as immutable `ComplaintSourceEvent` records with distinct occurrence and import timestamps. The MVP seeded provider returns defensive copies with `SEEDED_DEMO` provenance and never claims live Sahaaya access. Complaint locations carry optional administrative context when supplied and validate latitude/longitude as a pair.

## Rationale

This preserves the evidence that a source authority claimed a resolution without treating that claim as independent verification. A separate source-history record keeps future imported data auditable and prevents CivicLens case activity from rewriting source history.

## Trade-offs

The domain and future database schema gain one entity and a few explicit source fields. That is smaller and clearer than mixing external-system history with CivicLens audit events.

## Reconsider when

Revisit event normalization and source-provenance values when an authorized complaint provider supplies documented event semantics, retention requirements, and stable source event identifiers.
