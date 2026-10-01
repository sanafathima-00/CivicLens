# Evidence-backed Findings Specification

## Purpose

Present transparent findings and a human-verification recommendation from validated evidence and deterministic analysis.

## Requirements

### Requirement: Structured finding

Each finding SHALL contain its type, statement, supporting evidence IDs, epistemic status, confidence where appropriate, limitations, and recommended verification.

Finding types SHALL support `CONSTRUCTION_CHANGE`, `SPATIAL_CONFLICT`, `GOVERNMENT_RECORD_DISCREPANCY`, `CIVIC_SIGNAL`, and `ADMINISTRATIVE_CONTEXT`.

### Requirement: Grounded synthesis

AI synthesis SHALL use validated evidence and deterministic facts supplied to it. It SHALL not introduce permits, dates, land ownership, legal conclusions, records, measurements, authorities, or government actions that are absent from those inputs.

### Requirement: Non-binary assessment

An investigation MAY contain coexisting outcomes including `CONSISTENT_WITH_AVAILABLE_RECORDS`, `POTENTIAL_SPATIAL_CONFLICT`, `POTENTIAL_DISCREPANCY`, `INSUFFICIENT_EVIDENCE`, and `REQUIRES_HUMAN_VERIFICATION`. It SHALL not return a simplistic `SAFE` or `ILLEGAL` verdict.
