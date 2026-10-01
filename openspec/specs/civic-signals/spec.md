# Civic Signals Specification

## Purpose

Correlate relevant civic/public reports, notices, and activity as contextual investigation evidence.

## Requirements

### Requirement: Provenance and relevance

Each civic signal SHALL identify its source, date when known, geographic/temporal relevance, provenance, and limitations.

#### Scenario: Multiple relevant signals

- **WHEN** several independent signals relate to a site
- **THEN** the investigation may describe the correlation while preserving each signal's source and without treating the set as legal proof.

### Requirement: No fabricated reports

The system SHALL not invent reports, notices, complaints, or government activity. Seeded demo signals SHALL be labelled as such.
