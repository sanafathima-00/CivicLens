# Investigation Creation Specification

## Purpose

Create a bounded, structured examination of one site.

## Requirements

### Requirement: Investigation scope

The system SHALL associate an investigation with one site and retain its status, evidence inventory, findings, limitations, confidence where appropriate, and recommended human verification.

#### Scenario: Evidence is incomplete

- **WHEN** one or more required evidence sources are unavailable
- **THEN** the investigation records that availability state and does not convert absence into a negative conclusion.
