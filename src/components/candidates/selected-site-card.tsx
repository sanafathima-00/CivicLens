import type { CandidateViewModel } from "@/features/candidates/types";

interface SelectedSiteCardProps {
  readonly candidate: CandidateViewModel;
  readonly children: React.ReactNode;
}

function sourceValue(value: string | undefined) {
  return value === undefined || value.length === 0 ? "Not supplied" : value;
}

export function SelectedSiteCard({
  candidate,
  children,
}: SelectedSiteCardProps) {
  const duplicateGroupSize = candidate.validation.duplicateCoordinateGroupSize;

  return (
    <aside className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
      <p className="text-xs font-semibold tracking-[0.16em] text-teal-700 uppercase">
        Selected source-backed site
      </p>
      <h2 className="mt-2 text-xl font-semibold text-zinc-950">
        {sourceValue(candidate.site.label)}
      </h2>
      <dl className="mt-5 grid gap-3 text-sm text-zinc-700">
        <div>
          <dt className="text-zinc-500">Source construction ID</dt>
          <dd className="font-medium">
            {sourceValue(candidate.sourceRecord.constructionId)}
          </dd>
        </div>
        <div>
          <dt className="text-zinc-500">KGIS code</dt>
          <dd className="font-medium">
            {sourceValue(candidate.sourceRecord.kGISCode)}
          </dd>
        </div>
        <div>
          <dt className="text-zinc-500">Location</dt>
          <dd className="font-medium">
            {sourceValue(candidate.sourceRecord.rawCoordinates)}
          </dd>
        </div>
        <div>
          <dt className="text-zinc-500">Source</dt>
          <dd className="font-medium">{candidate.site.origin.providerLabel}</dd>
        </div>
      </dl>

      <div className="mt-5 space-y-3 rounded-xl bg-amber-50 p-4 text-sm leading-6 text-amber-950">
        <p className="font-medium">Approximate project/site location</p>
        <p>
          This source point is not a construction footprint, parcel boundary,
          cadastral boundary, ownership claim, activity-status claim, or legal
          conclusion.
        </p>
        {duplicateGroupSize === undefined ? null : (
          <p>
            This source coordinate is shared by {duplicateGroupSize} distinct
            source records. They have not been merged.
          </p>
        )}
      </div>

      <a
        className="mt-5 inline-block text-sm font-medium text-teal-700 underline"
        href={candidate.site.origin.sourceReference}
        rel="noreferrer"
        target="_blank"
      >
        View source snapshot reference
      </a>
      <div className="mt-5">{children}</div>
    </aside>
  );
}
