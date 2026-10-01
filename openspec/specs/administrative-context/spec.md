# Administrative Context Specification

## Purpose

Describe where a site falls administratively without assigning personal, legal, or enforcement liability.

## Requirements

### Requirement: Provenance-aware administrative mapping

The system SHALL return available city corporation, ward, optional administrative function, mapping source/version, method, quality, and limitations.

#### Scenario: Prototype mapping coverage

- **WHEN** an exact coordinate exists in the retained prototype mapping reference
- **THEN** the system returns its context with prototype/approximate limitations.

#### Scenario: Mapping is unavailable or unresolved

- **WHEN** coordinates are missing or not defensibly covered
- **THEN** the system returns an explicit state and does not guess a ward from address text or broad heuristics.

### Requirement: Context is not enforcement

Administrative context SHALL NOT claim an individual officer, legal liability, official routing, or enforcement responsibility.
