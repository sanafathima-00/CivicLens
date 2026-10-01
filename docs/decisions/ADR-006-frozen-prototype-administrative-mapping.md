# ADR-006: Frozen prototype administrative mapping

- **Status:** Accepted
- **Date:** 2026-09-03

## Context

CivicLens needs repeatable administrative context for prototype complaint coordinates, but live GIS calls and broad coordinate heuristics would make the buildathon flow fragile and could falsely imply official routing precision. The seeded complaint coordinates are explicitly approximate and the current GBA corporation/ward structure is subject to future change.

## Options considered

1. Call a live geocoding or GBA GIS service at runtime.
2. Infer wards with broad coordinate ranges or address text.
3. Store a full boundary dataset and introduce PostGIS.
4. Freeze exact-coordinate prototype references validated from official GBA coordinate-lookup and ward-delimitation material.

## Decision

Use option 4 for the MVP. The seeded administrative provider performs exact coordinate-pair lookup against an in-memory, frozen reference dataset. Each retained reference records the official GBA source URL, ward-delimitation version, retrieval date, method, approximate quality, and limitations. Geographic context is derived separately from the source complaint location.

The category-to-service registry is a CivicLens administrative responsibility suggestion. It identifies a city-corporation function or role, never an individual, and is not a legal or official routing determination.

## Rationale and evidence

The official GBA "Know Your Ward and New City Corporation" service and 2025 ward-delimitation portal provide the current source basis for the retained prototype points. Frozen references preserve repeatability and provenance without making the app depend on an external runtime service.

## Trade-offs

Coverage is intentionally limited to retained coordinates. Valid coordinates outside that set return `UNRESOLVED`; missing coordinates return `NOT_MAPPABLE`. The app does not detect geometric boundary proximity, process polygons, or provide production-grade routing.

## Reconsider when

Replace this adapter only after CivicLens has a verified, licensed, versioned authoritative boundary dataset and documented update, retention, accuracy, and responsibility-routing policies.
