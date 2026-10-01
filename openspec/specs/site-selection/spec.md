# Site Selection Specification

## Purpose

Establish a construction `Site` as the geographic anchor for an investigation without treating a source location claim as verified property or legal information.

## Requirements

### Requirement: Provenance-aware site input

The system SHALL accept a selected site or location with stable identity, coordinates when available, location description when available, discovery/source metadata, provenance, and quality/availability state.

#### Scenario: Partial location information

- **WHEN** a source provides only an address or landmark
- **THEN** the system preserves the missing coordinates and does not fabricate a coordinate pair.

### Requirement: Provider-independent Site retrieval

The system SHALL retrieve a Site by its stable CivicLens internal ID through a `SiteProvider` boundary. The provider result SHALL distinguish a found Site from `not_found`, `unavailable`, and `unresolved` identity states. A source record ID MAY be retained as origin metadata but SHALL not replace the CivicLens Site ID.

#### Scenario: Deterministic non-live fixture retrieval

- **WHEN** a development caller requests a known seeded Site ID
- **THEN** the seeded provider returns a defensive copy with explicit non-live seeded or analyst-prepared origin metadata
- **AND** it does not make a network request or claim a live construction-data integration.

### Requirement: Location-state integrity

The system SHALL require latitude and longitude together when coordinates exist, validate their global ranges, and require coordinate quality only for a valid pair. It SHALL support `MAPPABLE`, `NOT_MAPPABLE`, and `UNRESOLVED` Site location states without geocoding or treating coordinates as property boundaries.

#### Scenario: Address-only Site

- **WHEN** a Site has useful address/location metadata but no coordinates
- **THEN** its location state is `NOT_MAPPABLE`
- **AND** the system does not infer or create a coordinate pair.

### Requirement: Site and investigation remain distinct

The system SHALL not use a `Site` as a substitute for an `Investigation`; a site MAY support multiple investigations over time.

### Requirement: Source-backed construction candidate discovery

The system SHALL support a provider-independent candidate-source boundary separate from direct Site lookup. A source-backed candidate SHALL retain provider/dataset/resource provenance, raw external record identifiers, raw source name, coordinate semantics, validation status, and source limitations. A candidate that passes deterministic validation MAY project to a Site without making the Site domain source-format-specific.

#### Scenario: Imported approximate project location

- **WHEN** a versioned construction-project source snapshot provides a valid source Point
- **THEN** the normalized candidate SHALL preserve it as an approximate project/site location
- **AND** an accepted Site projection SHALL be `MAPPABLE` with `APPROXIMATE` coordinate quality
- **AND** it SHALL not receive an invented coordinate precision, address, footprint, parcel, or construction-status claim.

#### Scenario: Quarantined source anomaly

- **WHEN** a source-specific deterministic validation rule identifies a known inconsistent source record
- **THEN** the system SHALL retain that raw candidate record for traceability
- **AND** it SHALL mark it `QUARANTINED`
- **AND** it SHALL not expose an investigation-ready Site projection.

#### Scenario: Duplicate source coordinates

- **WHEN** multiple source records share the same coordinate tuple
- **THEN** the system SHALL flag the duplicate-coordinate condition
- **AND** retain every distinct source record without automatically merging or excluding it.
