# Evidence Gathering Specification

## Purpose

Inventory available, prepared, and unavailable evidence without presenting prototype material as live evidence.

## Requirements

### Requirement: Evidence provenance

Each `EvidenceItem` SHALL retain source/provider, provenance class, retrieval date, capture/publication date when known, quality, site relevance, and limitations.

#### Scenario: Prepared prototype evidence

- **WHEN** an MVP uses prepared, seeded, simulated, generated, or approximate evidence
- **THEN** the evidence item and resulting findings clearly identify that status.

### Requirement: No fabricated retrieval

- **WHEN** a provider has no available evidence
- **THEN** the system returns an explicit unavailable state and does not invent imagery, documents, records, or civic reports.
