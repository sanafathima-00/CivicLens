# Spatial Investigation Specification

## Purpose

Use deterministic geometry to describe the relationship between a construction footprint and relevant mapped land features.

## Requirements

### Requirement: Provenance-aware geometry

Construction footprints and land features SHALL retain source, version/date, method, quality, and limitations. Prepared or approximate geometry SHALL not be described as authoritative cadastral/property geometry.

### Requirement: Deterministic relationship

The system SHALL compute overlap and proximity only from compatible geometry. It SHALL distinguish overlap, proximity, no relationship, unavailable geometry, and unresolved geometry.

#### Scenario: Polygon intersection

- **WHEN** compatible polygons intersect
- **THEN** the system MAY create a `POTENTIAL_SPATIAL_CONFLICT` finding with input provenance and limitations.

### Requirement: No legal conclusion

An overlap SHALL NOT be labelled legal encroachment, illegal construction, ownership, or enforcement responsibility.
