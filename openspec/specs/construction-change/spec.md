# Construction Change Specification

## Purpose

Describe meaningful construction change from dated site evidence with explicit distinction between observation and inference.

## Requirements

### Requirement: Structured change categories

The system SHALL support `NEW_CONSTRUCTION`, `FOOTPRINT_EXPANSION`, `CONSTRUCTION_PROGRESS`, `EXCAVATION_OR_SITE_PREPARATION`, `OPEN_LAND_TO_BUILT`, `NO_SIGNIFICANT_CHANGE`, and `INSUFFICIENT_EVIDENCE`.

### Requirement: Evidence-bound interpretation

The system SHALL retain supporting evidence IDs, known dates, observations, inferred interpretation, confidence where appropriate, and limitations. It SHALL not invent imagery dates or claim a change when the evidence is insufficient.

#### Scenario: Inadequate comparison evidence

- **WHEN** dated imagery is unavailable, incompatible, or too weak to support interpretation
- **THEN** the system returns `INSUFFICIENT_EVIDENCE` or an unresolved finding.
