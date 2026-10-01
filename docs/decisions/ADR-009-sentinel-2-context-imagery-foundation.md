# ADR-009: Sentinel-2 Context Imagery Foundation

## Status

Active MVP decision — September 5, 2026.

## Context

CivicLens needs dated visual evidence without claiming that every candidate has
usable imagery or that an approximate OpenCity Site coordinate is an exact
construction boundary. Provider research and bounded Bengaluru requests
confirmed that Microsoft Planetary Computer can discover Sentinel-2 L2A STAC
items and serve a bounded rendered context image after source-asset signing.

## Decision

Use Microsoft Planetary Computer Sentinel-2 L2A behind a provider boundary for
the Step 6A prototype. A request derives a deterministic 320m by 320m context
AOI around a mappable Site coordinate. It stores actual selected dated
observations as `IMAGERY` EvidenceItems, including source identity, acquisition
time, cloud metadata, source licence designation, local content hash, and the
derived-AOI policy.

The AOI is explicitly imagery context. It is not a construction footprint,
parcel, property, cadastral boundary, or legal boundary. The provider is live;
signed source URLs are intentionally not persisted because they expire.

## Rationale and evidence

- The public STAC API returned actual Bengaluru Sentinel-2 L2A observations
  from 2022–2026.
- The Planetary Computer signing endpoint enabled raw source-asset access.
- The Data API returned bounded RGB context pixels suitable for asset storage.
- Sentinel-2 has 10m visible bands and a nominal five-day combined revisit,
  but actual availability and usability remain cloud-dependent.

## Trade-offs

- Ten-metre imagery is context-scale evidence. It is not reliable for
  individual-building construction detection.
- Scene cloud metadata is retained but does not establish AOI-level quality.
- Anonymous access is throttled and provider availability is not guaranteed.
- The local evidence asset adapter is development/test infrastructure, not a
  production object-store decision.

## Reconsideration criteria

Use a separately licensed, validated higher-resolution provider when the
product needs reliable individual-building visibility. Reconsider the AOI
policy only with independently evidenced coordinate accuracy or an explicitly
sourced construction footprint. Do not add construction-change conclusions
until a later approved increment validates comparable dated observations.

## Live smoke test

Normal imagery tests use recorded STAC fixtures. To run the deliberately
bounded live check against one existing Bengaluru coordinate, set
`RUN_LIVE_IMAGERY_SMOKE=1` and run `npm run test:imagery`. The test discovers
one actual observation, obtains a temporary signed source-asset URL, and
retrieves one bounded PNG context render. It does not run in ordinary CI and
does not persist application evidence.
