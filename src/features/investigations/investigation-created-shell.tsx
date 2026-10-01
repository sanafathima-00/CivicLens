/* eslint-disable @next/next/no-img-element */
"use client";

import { useEffect, useState } from "react";

import type { InvestigationApiResponse } from "@/features/candidates/types";
import {
  formatObservationDate,
  historicalImageryTimeline,
  type HistoricalImageryEvidenceView,
} from "@/features/investigations/historical-imagery-presentation";

interface InvestigationCreatedShellProps {
  readonly investigationId: string;
}

interface ConstructionChangeAnalysisView {
  readonly id: string;
  readonly beforeEvidenceItemId: string;
  readonly afterEvidenceItemId: string;
  readonly comparability: string;
  readonly evidenceSufficiency: string;
  readonly limitations: readonly string[];
}

interface VisionAnalysisView {
  readonly interpretation: {
    readonly outcome: string;
    readonly epistemicState: string;
    readonly observedIndicators: readonly string[];
    readonly interpretation?: string;
    readonly limitations: readonly string[];
  };
  readonly metadata: {
    readonly providerLabel: string;
    readonly model: string;
    readonly promptVersion: string;
  };
}

interface InvestigationEvidenceResponse {
  readonly items: readonly HistoricalImageryEvidenceView[];
}

interface InvestigationDashboard {
  readonly investigation: InvestigationApiResponse;
  readonly evidence: InvestigationEvidenceResponse;
  readonly comparisons: readonly ConstructionChangeAnalysisView[];
  readonly vision: readonly VisionAnalysisView[];
}

function assetUrl(investigationId: string, evidenceItemId: string) {
  return `/api/investigations/${encodeURIComponent(investigationId)}/evidence/${encodeURIComponent(evidenceItemId)}/asset`;
}

async function json<T>(url: string, signal: AbortSignal): Promise<T> {
  const response = await fetch(url, { signal });
  const payload = (await response.json().catch(() => undefined)) as
    T | { readonly error?: string } | undefined;
  if (!response.ok || payload === undefined) {
    throw new Error(
      payload !== null &&
        payload !== undefined &&
        typeof payload === "object" &&
        "error" in payload &&
        payload.error
        ? payload.error
        : "Unable to load investigation evidence.",
    );
  }
  return payload as T;
}

function qualitySummary(item: HistoricalImageryEvidenceView) {
  const imagery = item.metadata.imagery;
  if (
    imagery === null ||
    typeof imagery !== "object" ||
    Array.isArray(imagery)
  ) {
    return item.qualityNotes;
  }
  const metadata = imagery as Record<string, unknown>;
  const flags = Array.isArray(metadata.qualityFlags)
    ? metadata.qualityFlags.filter(
        (flag): flag is string => typeof flag === "string",
      )
    : [];
  return [
    typeof metadata.usability === "string"
      ? `Usability: ${metadata.usability}`
      : undefined,
    flags.length === 0 ? undefined : `Quality flags: ${flags.join(", ")}`,
    item.qualityNotes,
  ]
    .filter((value): value is string => value !== undefined)
    .join(" · ");
}

function ObservationCard({
  title,
  item,
  investigationId,
}: {
  readonly title: string;
  readonly item: HistoricalImageryEvidenceView | undefined;
  readonly investigationId: string;
}) {
  if (item === undefined) {
    return (
      <article className="rounded-xl border border-dashed border-zinc-300 bg-zinc-50 p-4 text-sm text-zinc-600">
        <h3 className="font-semibold text-zinc-900">{title}</h3>
        <p className="mt-2">
          The referenced imagery observation is unavailable.
        </p>
      </article>
    );
  }

  const observedAt =
    item.observedAt?.value ?? item.capturedAt?.value ?? item.publishedAt?.value;
  const quality = qualitySummary(item);

  return (
    <article className="overflow-hidden rounded-xl border border-zinc-200 bg-white">
      {item.asset?.contentType === "image/png" ? (
        <img
          className="aspect-square w-full bg-zinc-100 object-cover"
          src={assetUrl(investigationId, item.id)}
          alt={`${title}: ${item.label ?? "satellite observation"}`}
        />
      ) : (
        <div className="flex aspect-square items-center justify-center bg-zinc-100 p-4 text-center text-sm text-zinc-600">
          No rendered imagery asset is available for this observation.
        </div>
      )}
      <div className="p-4 text-sm text-zinc-700">
        <h3 className="font-semibold text-zinc-950">{title}</h3>
        <p className="mt-2 font-medium">{formatObservationDate(observedAt)}</p>
        <p className="mt-1 text-zinc-600">{item.provenance.providerLabel}</p>
        {quality === "" ? null : (
          <p className="mt-2 text-xs leading-5 text-zinc-600">{quality}</p>
        )}
      </div>
    </article>
  );
}

export function InvestigationCreatedShell({
  investigationId,
}: InvestigationCreatedShellProps) {
  const [data, setData] = useState<InvestigationDashboard>();
  const [error, setError] = useState<string>();

  useEffect(() => {
    const controller = new AbortController();

    async function loadInvestigation() {
      try {
        const [investigation, evidence, comparisonPayload] = await Promise.all([
          json<InvestigationApiResponse>(
            `/api/investigations/${investigationId}`,
            controller.signal,
          ),
          json<InvestigationEvidenceResponse>(
            `/api/investigations/${investigationId}/evidence`,
            controller.signal,
          ),
          json<{
            readonly analyses: readonly ConstructionChangeAnalysisView[];
          }>(
            `/api/investigations/${investigationId}/change-analysis`,
            controller.signal,
          ),
        ]);
        const latestComparison = comparisonPayload.analyses.at(-1);
        const vision =
          latestComparison === undefined
            ? []
            : (
                await json<{
                  readonly analyses: readonly VisionAnalysisView[];
                }>(
                  `/api/investigations/${investigationId}/change-analysis/${latestComparison.id}/vision`,
                  controller.signal,
                )
              ).analyses;
        setData({
          investigation,
          evidence,
          comparisons: comparisonPayload.analyses,
          vision,
        });
      } catch (caught) {
        if (controller.signal.aborted) return;
        setError(
          caught instanceof Error
            ? caught.message
            : "Unable to load the investigation.",
        );
      }
    }

    void loadInvestigation();
    return () => controller.abort();
  }, [investigationId]);

  if (error !== undefined) {
    return <p className="text-sm text-red-700">{error}</p>;
  }
  if (data === undefined) {
    return <p className="text-sm text-zinc-600">Loading investigation…</p>;
  }

  const imagery = historicalImageryTimeline(data.evidence.items);
  const latestComparison = data.comparisons.at(-1);
  const before = data.evidence.items.find(
    (item) => item.id === latestComparison?.beforeEvidenceItemId,
  );
  const after = data.evidence.items.find(
    (item) => item.id === latestComparison?.afterEvidenceItemId,
  );
  const latestVision = data.vision.at(-1);
  const limitations =
    latestVision?.interpretation.limitations ??
    latestComparison?.limitations ??
    [];

  return (
    <div className="w-full space-y-8">
      <section className="max-w-2xl rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
        <p className="text-xs font-semibold tracking-[0.16em] text-teal-700 uppercase">
          Investigation
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-zinc-950">
          {data.investigation.site.label ?? "Source-backed construction site"}
        </h1>
        <dl className="mt-6 grid gap-4 text-sm text-zinc-700 sm:grid-cols-2">
          <div>
            <dt className="text-zinc-500">Status</dt>
            <dd className="font-medium text-teal-700">
              {data.investigation.investigation.status}
            </dd>
          </div>
          <div>
            <dt className="text-zinc-500">Site source</dt>
            <dd className="font-medium">
              {data.investigation.site.origin.providerLabel}
            </dd>
          </div>
          <div>
            <dt className="text-zinc-500">Location quality</dt>
            <dd className="font-medium">Approximate project/site location</dd>
          </div>
        </dl>
      </section>

      <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <div>
            <p className="text-xs font-semibold tracking-[0.16em] text-teal-700 uppercase">
              Historical imagery
            </p>
            <h2 className="mt-1 text-2xl font-semibold tracking-tight text-zinc-950">
              Before and after comparison
            </h2>
          </div>
          {latestComparison === undefined ? (
            <p className="text-sm text-zinc-600">
              No persisted comparison yet.
            </p>
          ) : null}
        </div>
        {latestComparison === undefined ? (
          <p className="mt-4 text-sm leading-6 text-zinc-600">
            Historical imagery has not produced a persisted deterministic
            comparison. The timeline below shows only evidence actually
            available for this investigation.
          </p>
        ) : (
          <>
            <div className="mt-5 grid gap-5 md:grid-cols-2">
              <ObservationCard
                title="Before"
                item={before}
                investigationId={investigationId}
              />
              <ObservationCard
                title="After"
                item={after}
                investigationId={investigationId}
              />
            </div>
            <div className="mt-5 rounded-xl bg-amber-50 p-4 text-sm leading-6 text-amber-950">
              AI visual interpretation only — not a legal, ownership, permit, or
              regulatory determination. Sentinel-2 imagery is context-scale and
              the AOI is not a construction footprint, parcel, or legal
              boundary.
            </div>
            <div className="mt-5 grid gap-4 text-sm md:grid-cols-2">
              <div>
                <p className="text-zinc-500">Deterministic comparison</p>
                <p className="font-medium text-zinc-900">
                  {latestComparison.comparability} ·{" "}
                  {latestComparison.evidenceSufficiency}
                </p>
              </div>
              <div>
                <p className="text-zinc-500">Visual interpretation</p>
                <p className="font-medium text-zinc-900">
                  {latestVision?.interpretation.outcome ?? "Not yet run"}
                  {latestVision === undefined
                    ? ""
                    : ` · ${latestVision.interpretation.epistemicState}`}
                </p>
              </div>
            </div>
            {latestVision === undefined ? null : (
              <div className="mt-5 rounded-xl border border-zinc-200 p-4 text-sm text-zinc-700">
                <p className="font-semibold text-zinc-950">
                  AI visual interpretation
                </p>
                <ul className="mt-2 list-disc space-y-1 pl-5">
                  {latestVision.interpretation.observedIndicators.map(
                    (indicator) => (
                      <li key={indicator}>{indicator}</li>
                    ),
                  )}
                </ul>
                {latestVision.interpretation.interpretation ===
                undefined ? null : (
                  <p className="mt-3 leading-6">
                    {latestVision.interpretation.interpretation}
                  </p>
                )}
                <p className="mt-3 text-xs text-zinc-500">
                  {latestVision.metadata.providerLabel} ·{" "}
                  {latestVision.metadata.model}
                  {" · "}
                  {latestVision.metadata.promptVersion}
                </p>
              </div>
            )}
            {limitations.length === 0 ? null : (
              <div className="mt-5 text-sm text-zinc-700">
                <p className="font-semibold text-zinc-950">Limitations</p>
                <ul className="mt-2 list-disc space-y-1 pl-5">
                  {limitations.map((limitation) => (
                    <li key={limitation}>{limitation}</li>
                  ))}
                </ul>
              </div>
            )}
          </>
        )}
      </section>

      <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
        <p className="text-xs font-semibold tracking-[0.16em] text-teal-700 uppercase">
          Evidence timeline
        </p>
        <h2 className="mt-1 text-2xl font-semibold tracking-tight text-zinc-950">
          Dated imagery observations
        </h2>
        {imagery.length === 0 ? (
          <p className="mt-4 text-sm text-zinc-600">
            No persisted imagery observations are available for this
            investigation.
          </p>
        ) : (
          <ol className="mt-5 space-y-5 border-l border-zinc-200 pl-5">
            {imagery.map((observation) => (
              <li key={observation.id} className="relative">
                <span className="absolute -left-[25px] top-1.5 size-2 rounded-full bg-teal-600" />
                <div className="flex flex-col gap-3 sm:flex-row">
                  <div className="min-w-32">
                    <p className="font-medium text-zinc-950">
                      {formatObservationDate(observation.observedAt)}
                    </p>
                    <p className="text-sm text-zinc-600">
                      {observation.providerLabel}
                    </p>
                  </div>
                  {observation.hasDisplayableAsset ? (
                    <img
                      className="size-24 rounded-lg border border-zinc-200 object-cover"
                      src={assetUrl(investigationId, observation.id)}
                      alt={`${observation.label} thumbnail`}
                    />
                  ) : (
                    <div className="flex size-24 items-center justify-center rounded-lg border border-dashed border-zinc-300 p-2 text-center text-xs text-zinc-500">
                      No asset
                    </div>
                  )}
                  <div>
                    <p className="font-medium text-zinc-900">
                      {observation.label}
                    </p>
                    <p className="mt-1 text-sm text-zinc-600">
                      {observation.usability === undefined
                        ? "Usability unavailable"
                        : `Usability: ${observation.usability}`}
                      {observation.qualityFlags.length === 0
                        ? ""
                        : ` · ${observation.qualityFlags.join(", ")}`}
                    </p>
                    {observation.limitations.length === 0 ? null : (
                      <p className="mt-1 text-xs leading-5 text-zinc-500">
                        {observation.limitations.join(" ")}
                      </p>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  );
}
