# CivicLens Requirements

## Status and scope

This is the source of truth for the CivicLens construction-site investigation MVP. CivicLens helps a user examine a selected Bengaluru construction site and determine whether available evidence warrants human review. It does not establish legality, ownership, liability, enforcement responsibility, or official government routing.

## Definitions

- **Site:** the geographic construction location under examination; it is not an investigation.
- **Investigation:** a structured, time-bounded examination of one site.
- **EvidenceItem:** sourced or explicitly prepared information with provenance, known dates, quality, and limitations.
- **Finding:** an evidence-backed conclusion that identifies whether it is observed, deterministically derived, AI-inferred, or unresolved.
- **AdministrativeContext:** city-corporation, ward, and related contextual mapping; it is not an enforcement decision.

## Functional requirements

### FR-1: Site selection and investigation creation

The system SHALL accept a selected site or location and create an investigation context separate from the site identity. It SHALL retain source, discovery, coordinate-quality, and availability metadata when supplied. Missing or invalid inputs SHALL remain explicit; the system SHALL not fabricate a site address, coordinates, or construction footprint.

**Implemented foundation:** the application can retrieve a Site by its stable CivicLens internal ID through a provider-independent use case. A Site has explicit origin/provenance and location state. The application can also list a versioned, source-backed OpenCity/KSRSAC SEIAA KML candidate snapshot through a separate `CandidateSource` use case. Candidate discovery does not assert current construction, approval compliance, exact point accuracy, or a footprint; investigation creation and other external source integrations remain deferred.

### FR-2: Evidence inventory and provenance

The system SHALL organize imagery, documents, GIS features, civic reports, notices, and administrative results as `EvidenceItem` records. Each item SHALL identify source/provider, provenance classification, retrieval date, applicable capture/publication date when known, site relevance, quality, and limitations. Prepared, seeded, simulated, generated, approximate, and unavailable evidence SHALL be visibly distinct from externally sourced evidence.

### FR-3: Construction-change findings

The system SHALL support structured construction-change findings: `NEW_CONSTRUCTION`, `FOOTPRINT_EXPANSION`, `CONSTRUCTION_PROGRESS`, `EXCAVATION_OR_SITE_PREPARATION`, `OPEN_LAND_TO_BUILT`, `NO_SIGNIFICANT_CHANGE`, and `INSUFFICIENT_EVIDENCE`. Findings SHALL keep imagery observations separate from AI interpretation and SHALL not invent imagery dates or changes.

### FR-4: Construction footprint and land-feature context

The system SHALL support an explicitly sourced, derived, or analyst-prepared construction footprint and provenance-aware `LandFeature` evidence for lakes, parks, public/open spaces, roads/right-of-way, and other relevant public/environmental features. Approximate or prepared geometry SHALL not be represented as authoritative cadastral or ownership geometry.

### FR-5: Deterministic spatial findings

The system SHALL perform geometry intersection and proximity calculations deterministically when compatible geometry and provenance are available. An intersection MAY produce `POTENTIAL_SPATIAL_CONFLICT`; it SHALL not itself produce a legal encroachment or illegality conclusion. Proximity, overlap, and unavailable geometry SHALL remain distinct states.

### FR-6: Government-record cross-check

The system SHALL represent available government-record evidence and extracted fields such as approved use, areas, floors, height, project/file number, approval date, conditions, and plan information when supported by evidence. It SHALL support `CONSISTENT_WITH_AVAILABLE_RECORDS`, `POTENTIAL_DISCREPANCY`, and `INSUFFICIENT_EVIDENCE`. Missing records SHALL not imply non-compliance.

### FR-7: Civic signals

The system SHALL support contextual civic signals, including relevant reports, repeated reports, public notices/orders, and time relationships to observed change. It SHALL preserve their provenance and SHALL not fabricate reports or treat signals as legal proof.

### FR-8: Administrative context

The system SHALL expose available current city-corporation, ward, optional administrative function, mapping source/version, quality, and limitations. It SHALL not identify a person, assign legal liability, or assert enforcement ownership. The MVP may use the existing frozen prototype GBA mapping only with its approximate/prototype limitations.

### FR-9: Evidence-backed findings and assessment

The system SHALL present findings with statement, type, supporting evidence IDs, epistemic status, confidence where appropriate, limitations, and a recommended verification step. The overall investigation SHALL support coexisting outcomes including `CONSISTENT_WITH_AVAILABLE_RECORDS`, `POTENTIAL_SPATIAL_CONFLICT`, `POTENTIAL_DISCREPANCY`, `INSUFFICIENT_EVIDENCE`, and `REQUIRES_HUMAN_VERIFICATION`; it SHALL not classify a site as safe or illegal.

## Non-functional requirements

### NFR-1: Provider independence

Site, evidence, imagery, land-feature, government-record, civic-signal, administrative-mapping, vision-analysis, and synthesis integrations SHALL be replaceable provider boundaries. A missing external integration SHALL produce an explicit unavailable state rather than invented evidence.

### NFR-2: Evidence integrity and explainability

The application SHALL retain enough provenance, source versioning, dates, inputs, calculation method, and limitations to explain each finding. AI-generated narrative SHALL be grounded in validated evidence and structured facts.

### NFR-3: Privacy and responsible communication

The application SHALL minimize sensitive location and personal data, protect credentials and source metadata, avoid unsupported accusations, and clearly distinguish prototype information from live/public evidence.

### NFR-4: Reliability and uncertainty

Provider errors, incompatible geometry, incomplete records, missing imagery, and invalid AI output SHALL return safe, explicit partial or unavailable states. Insufficient evidence is a valid outcome.

### NFR-5: MVP maintainability

The MVP SHALL remain a modular single Next.js application. It SHALL avoid microservices, queues, Redis, Kubernetes, Docker requirements, and authentication unless later justified by an implemented need.

## MVP boundary

The MVP aims to demonstrate one credible end-to-end site investigation using honestly labelled available or prepared evidence. It may use seeded/prototype data when a real source is unavailable, but it SHALL label that provenance and SHALL not claim live government APIs, live imagery, official routing, or legal conclusions.

The current Site fixtures are deterministic, fictional, and non-live. They establish the Site contract only. Separately, the implemented SEIAA KML candidate snapshot is imported source-backed data with explicit non-live snapshot provenance; its points are approximate project/site locations, not live observations or property boundaries.

## Out of scope

- Complaint intake, complaint closure verification, complaint escalation, and complaint-routing workflows.
- Automated enforcement, legal determinations, or authoritative property-ownership determinations.
- Continuous city-wide monitoring, real-time satellite monitoring, or an exhaustive construction registry.
- User accounts, authority accounts, citizen reporting, notifications, or background jobs unless later justified.
- Unverified K-RERA, building-permission, GIS, OpenCity, imagery, or other external integrations.
