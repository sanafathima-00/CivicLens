# Government Record Cross-check Specification

## Purpose

Compare available government-record evidence with observed site evidence without overstating availability or legal meaning.

## Requirements

### Requirement: Available-record extraction

The system SHALL preserve record evidence and extracted fields only when supported, including approved use, areas, floors, height, project/file number, approval date, conditions, and plan information where available.

### Requirement: Disciplined outcomes

The system SHALL support `CONSISTENT_WITH_AVAILABLE_RECORDS`, `POTENTIAL_DISCREPANCY`, and `INSUFFICIENT_EVIDENCE`.

#### Scenario: No record retrieved

- **WHEN** no usable record is available
- **THEN** the system records unavailability or insufficient evidence and does not infer non-compliance.
