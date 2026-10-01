# ADR-003: MVP application architecture

- **Status:** Accepted
- **Date:** 2026-09-02

## Context

The project needs a fast, maintainable implementation path after the buildathon planning phase. The desired future integrations do not justify a multi-service platform before the end-to-end product flow is proven.

## Decision

Use a modular Next.js application with server-side route handlers and domain services. Keep provider adapters, AI verification, authority mapping, case/audit management, and escalation packaging separate from the UI. Prefer PostgreSQL plus Prisma and object storage when persistence is introduced. Avoid microservices, Kubernetes, and distributed event infrastructure for the MVP.

## Rationale

This supports a fast demo while preserving clean seams for later integrations. It reduces deployment, operational, and coordination overhead.

## Trade-offs

A single application can require extraction later if workloads grow. That is cheaper and more evidence-based than operating distributed infrastructure before there is traffic, data volume, or a team need.

## Reconsider when

Revisit when measured verification workloads, ingestion volume, provider scheduling, team ownership, or reliability needs cannot be met by the modular application.
