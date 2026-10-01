# ADR-008: OpenCity SEIAA Candidate Snapshot

## Status

Active MVP decision — September 4, 2026.

## Context

CivicLens needs a real, reproducible construction-related candidate population without claiming that a project record proves active construction, legality, or a property boundary. The OpenCity resource “Construction Projects in Bengaluru Urban Approved by SEIAA” is a public KML snapshot attributed by the catalogue to KSRSAC. The audited snapshot contains 600 Point records with unique KGIS construction IDs and KGIS codes, but no footprint, dates, status, address, or positional-accuracy metadata.

## Decision

Use a checked-in, versioned snapshot of the OpenCity/KSRSAC SEIAA KML as the Step 3 primary candidate source. Parse it deterministically through an infrastructure adapter and expose normalized records through the `CandidateSource` domain boundary.

Accepted records become source-backed Sites with `MAPPABLE` and `APPROXIMATE` coordinates. `coordinatePrecisionMeters` remains absent. The snapshot is not a live provider integration. The original KML resource, source record IDs, raw names, source attribution, retrieval date, content hash, and catalogue licence designation are retained.

The eight known Nachanahalli/Mysuru name anomalies are quarantined and remain traceable. Shared coordinates are flagged but not merged or excluded.

## Rationale and evidence

- The resource is publicly downloadable KML and can be imported without runtime scraping.
- The catalogue labels the resource as Public Domain and attributes its source to KSRSAC; no stronger licence claim is made.
- A spatial sanity check found broadly plausible Bengaluru locality context for most sampled records, while identifying the eight name/coordinate anomalies.
- A static snapshot makes the hackathon build deterministic and avoids a production dependency on an external service.

## Trade-offs

- KML Points are approximate project/site context, not surveyed exact locations.
- The source does not establish project currency, construction activity, approval status, footprint, parcel, ownership, or legality.
- Later imagery analysis must use a conservative context AOI. Later spatial overlap work requires separately evidenced footprint geometry.
- The catalogue’s Public Domain designation is retained as observed metadata; downstream reuse terms are not independently adjudicated here.

## Reconsideration criteria

Replace or supplement this source when a public, reproducible source provides construction-specific location accuracy, footprint geometry, dates/status, or stronger authoritative provenance. Revisit the quarantine rules when the upstream source corrects or versions the anomalous records.
