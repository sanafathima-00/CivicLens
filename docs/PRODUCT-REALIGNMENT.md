# CivicLens Product Realignment Matrix

## Purpose

This matrix records how the prior complaint-accountability prototype relates to the active construction-site investigation model. It is a migration guide, not permission to rename or delete runtime code without a later approved implementation step.

| Legacy concept | New role | Treatment now | Later action |
| --- | --- | --- | --- |
| `Complaint` | Optional contextual civic signal | Legacy | Do not use as the primary product object. Re-evaluate only when a civic-signal provider is designed. |
| `ComplaintLocation` | Reusable geographic-location concepts | Reframe | Extract shared location concepts only in a later domain migration. |
| `ComplaintProvider` | Potential `CivicSignalProvider` input | Legacy | Do not extend; preserve fixtures as explicitly fictional prototype material. |
| `EvidenceAsset` | `EvidenceItem` | Reframe | Redesign persistence/model later around investigation evidence. |
| `AuthorityMappingService` | `AdministrativeContext` | Reframe | Preserve source-versioned geographic context; remove complaint-service routing from the active model. |
| GBA frozen reference data | Administrative-context prototype input | Retain with limitation | It is not a land-feature, property-boundary, or enforcement dataset. |
| `VerificationAssessment` | Construction-change and investigation findings | Superseded | Replace only after evidence and AI contracts are designed. |
| `Case` / `CaseEvent` | `Investigation` / future investigation audit | Superseded | Do not migrate until the persistence model is approved. |
| `EscalationPackage` / `EscalationAction` | Outside MVP | Deprecated from positioning | Leave untouched; do not expand or present as active capability. |
| Complaint source history | Possible source provenance pattern | Legacy | Retain history/provenance discipline, not complaint lifecycle semantics. |
| Complaint status/category routing | Not part of core investigation | Deprecated from MVP | Do not treat a source `MARKED_RESOLVED` claim as investigation evidence. |

## Implementation guardrails

- A later migration must preserve provenance and clearly distinguish legacy seeded complaint fixtures from real civic signals.
- Administrative context must not be converted into legal liability, enforcement ownership, or individual responsibility.
- New `Site` and `Investigation` contracts must be designed before changes to the Prisma schema.
- Historical Git commits and ADRs remain the record of the previous product direction.
