export const SENTINEL_2_CONTEXT_COMPARISON_POLICY_ID =
  "sentinel2-context-comparison-v1";

export const MINIMUM_TEMPORAL_GAP_DAYS = 90;
export const SAME_SEASON_PREFERENCE_DAYS = 45;
export const LONG_TEMPORAL_GAP_DAYS = 730;

export const COMPARISON_POLICY_LIMITATIONS = {
  nativeResolution:
    "Native Sentinel-2 resolution remains context-scale even when the stored PNG has more rendered pixels.",
  approximateAoi:
    "The AOI is derived imagery context around a Site coordinate, not a construction footprint, parcel, property, or legal boundary.",
  longGap:
    "The long interval means intermediate changes are not observed by this comparison.",
  seasonal:
    "The observations are from different seasonal periods; surface appearance may differ for reasons unrelated to construction.",
  unassessed:
    "Imagery usability remains unassessed at AOI level; download success alone does not establish visual suitability.",
  cloudMetadata:
    "Scene-level cloud metadata is a limitation and does not establish AOI-level cloud conditions.",
} as const;
