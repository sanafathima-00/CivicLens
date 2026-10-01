# ADR-004: Single application root and Prisma version

- **Status:** Accepted
- **Date:** 2026-09-03

## Context

CivicLens is a single modular Next.js application. The repository root already contains the product documentation and OpenSpec source of truth. The active Node baseline is 24 LTS. The npm registry exposes Prisma 8 as a release candidate, while Prisma 7.10.0 is the matching stable CLI/client release.

## Options considered

1. Place the application in a nested directory and add workspace-style deployment configuration.
2. Keep the application at the repository root alongside its product documentation.
3. Adopt Prisma 8 release-candidate contract/composer tooling.
4. Use Prisma 7.10.0's stable schema and migration workflow.

## Decision

Keep the Next.js application at the repository root with source under `src/`, public assets under `public/`, and Prisma files under `prisma/`. Use Node 24 LTS, npm, PostgreSQL, and Prisma 7.10.0 with matching `@prisma/client` and driver adapter versions.

## Rationale

The root layout meets the single-application requirement and keeps the documentation beside the implementation without introducing workspaces. Prisma 7 is fully supported and uses the conventional schema/migration workflow needed for the MVP. Introducing Prisma 8's release-candidate workflow would add unvalidated platform assumptions without a product need.

## Trade-offs

The repository contains both documentation and application files at the root, so root-ignore rules must remain careful. Prisma 7 may require a future major upgrade after Prisma 8 is proven stable for the project.

## Reconsider when

Revisit the Prisma version after Prisma 8 reaches stable release and its migration path, generated-client workflow, and deployment behavior have been evaluated against CivicLens. Revisit the root layout only if a second deployable application becomes a real requirement.
