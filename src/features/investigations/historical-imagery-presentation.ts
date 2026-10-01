export interface HistoricalImageryEvidenceView {
  readonly id: string;
  readonly kind: string;
  readonly label?: string;
  readonly provenance: { readonly providerLabel: string };
  readonly observedAt?: { readonly value: string; readonly precision: string };
  readonly capturedAt?: { readonly value: string; readonly precision: string };
  readonly publishedAt?: { readonly value: string; readonly precision: string };
  readonly qualityNotes?: string;
  readonly limitations: readonly string[];
  readonly metadata: Record<string, unknown>;
  readonly asset?: { readonly contentType: string };
}

export interface ImageryPresentation {
  readonly id: string;
  readonly label: string;
  readonly observedAt?: string;
  readonly providerLabel: string;
  readonly usability?: string;
  readonly qualityFlags: readonly string[];
  readonly limitations: readonly string[];
  readonly hasDisplayableAsset: boolean;
}

function imageryMetadata(item: HistoricalImageryEvidenceView) {
  const imagery = item.metadata.imagery;
  return imagery !== null &&
    typeof imagery === "object" &&
    !Array.isArray(imagery)
    ? (imagery as Record<string, unknown>)
    : undefined;
}

export function imageryObservationTime(item: HistoricalImageryEvidenceView) {
  return (
    item.observedAt?.value ?? item.capturedAt?.value ?? item.publishedAt?.value
  );
}

export function historicalImageryTimeline(
  items: readonly HistoricalImageryEvidenceView[],
): readonly ImageryPresentation[] {
  return items
    .filter((item) => item.kind === "IMAGERY")
    .map((item) => {
      const imagery = imageryMetadata(item);
      const flags = imagery?.qualityFlags;
      return {
        id: item.id,
        label: item.label ?? "Satellite observation",
        ...(imageryObservationTime(item) === undefined
          ? {}
          : { observedAt: imageryObservationTime(item) }),
        providerLabel: item.provenance.providerLabel,
        ...(typeof imagery?.usability === "string"
          ? { usability: imagery.usability }
          : {}),
        qualityFlags: Array.isArray(flags)
          ? flags.filter((flag): flag is string => typeof flag === "string")
          : [],
        limitations: item.limitations,
        hasDisplayableAsset: item.asset?.contentType === "image/png",
      };
    })
    .sort((left, right) => {
      if (left.observedAt === undefined && right.observedAt === undefined)
        return left.id.localeCompare(right.id);
      if (left.observedAt === undefined) return 1;
      if (right.observedAt === undefined) return -1;
      return (
        left.observedAt.localeCompare(right.observedAt) ||
        left.id.localeCompare(right.id)
      );
    });
}

export function formatObservationDate(value: string | undefined) {
  if (value === undefined) return "Date unavailable";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "Date unavailable"
    : new Intl.DateTimeFormat("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        timeZone: "UTC",
      }).format(date);
}
