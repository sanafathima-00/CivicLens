# ADR-002: Verification and accountability policy

- **Status:** Accepted
- **Date:** 2026-09-02

## Context

Overhead imagery does not make every civic issue observable, and a single AI statement is not a defensible accountability record. Mapping a complaint to a named person can also be inaccurate and unfair.

## Decision

Return structured verification output with separate observations, assessment, limitations, recommendation, evidence references, and model-confidence label/value. Support `RESOLVED`, `LIKELY_UNRESOLVED`, and `INCONCLUSIVE` as peer outcomes. Map complaints to accountable administrative authorities or roles based on geography and service category, not automatically to individuals.

## Rationale

The result is traceable, can communicate uncertainty honestly, and supports an evidence-backed escalation process without converting an AI judgement into a personal accusation.

## Trade-offs

Users may prefer a binary answer, and incomplete mapping reduces apparent specificity. Structured records require schema validation and a slightly richer data model. These costs are necessary for credible use.

## Reconsider when

Revisit outcome taxonomy after evaluation with a labelled corpus, and revise authority granularity when an authoritative maintained data source supports it.
