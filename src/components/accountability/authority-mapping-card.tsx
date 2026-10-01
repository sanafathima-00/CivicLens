import type { AuthorityMappingResult } from "@/domain/accountability/authority-mapping";

interface AuthorityMappingCardProps {
  readonly result: AuthorityMappingResult;
}

const stateLabel: Record<AuthorityMappingResult["state"], string> = {
  MAPPED: "Administrative mapping available",
  PARTIAL: "Administrative context partially resolved",
  NOT_MAPPABLE: "Location cannot be mapped",
  UNRESOLVED: "Administrative context could not be resolved",
  UNAVAILABLE: "Administrative mapping is unavailable",
};

function Limitations({
  limitations,
}: {
  readonly limitations: readonly string[];
}) {
  return (
    <ul className="mt-3 list-disc space-y-1 pl-5 text-sm leading-6 text-zinc-600">
      {limitations.map((limitation) => (
        <li key={limitation}>{limitation}</li>
      ))}
    </ul>
  );
}

export function AuthorityMappingCard({ result }: AuthorityMappingCardProps) {
  if (result.state === "NOT_MAPPABLE" || result.state === "UNRESOLVED") {
    return (
      <section className="rounded-xl border border-amber-200 bg-amber-50 p-5 text-zinc-900">
        <p className="text-sm font-semibold text-amber-900">
          {stateLabel[result.state]}
        </p>
        <Limitations limitations={result.limitations} />
      </section>
    );
  }

  if (result.state === "UNAVAILABLE") {
    return (
      <section className="rounded-xl border border-zinc-300 bg-zinc-50 p-5 text-zinc-900">
        <p className="text-sm font-semibold">{stateLabel[result.state]}</p>
        <p className="mt-2 text-sm text-zinc-700">{result.reason}</p>
        <Limitations limitations={result.limitations} />
      </section>
    );
  }

  const { administrativeContext, provenance } = result;
  const limitations =
    result.state === "PARTIAL"
      ? result.limitations
      : [...provenance.limitations, ...result.responsibility.limitations];

  return (
    <section className="rounded-xl border border-zinc-200 bg-white p-5 text-zinc-900 shadow-sm">
      <p className="text-sm font-semibold text-emerald-800">
        {stateLabel[result.state]}
      </p>
      <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-zinc-500">City corporation</dt>
          <dd className="font-medium">
            {administrativeContext.cityCorporation.name}
          </dd>
        </div>
        {administrativeContext.ward ? (
          <div>
            <dt className="text-zinc-500">Ward</dt>
            <dd className="font-medium">{administrativeContext.ward.name}</dd>
          </div>
        ) : null}
        {administrativeContext.zone ? (
          <div>
            <dt className="text-zinc-500">Zone</dt>
            <dd className="font-medium">{administrativeContext.zone.name}</dd>
          </div>
        ) : null}
        {result.state === "MAPPED" ? (
          <>
            <div>
              <dt className="text-zinc-500">Civic service function</dt>
              <dd className="font-medium">
                {result.responsibility.serviceFunction}
              </dd>
            </div>
            <div>
              <dt className="text-zinc-500">
                Accountable administrative function
              </dt>
              <dd className="font-medium">
                {result.responsibility.accountableAdministrativeFunction}
              </dd>
            </div>
          </>
        ) : null}
      </dl>
      <details className="mt-5 border-t border-zinc-100 pt-4 text-sm text-zinc-600">
        <summary className="cursor-pointer font-medium text-zinc-800">
          Mapping provenance and limitations
        </summary>
        <dl className="mt-3 grid gap-2">
          <div>
            <dt className="inline text-zinc-500">Source: </dt>
            <dd className="inline">{provenance.sourceName}</dd>
          </div>
          <div>
            <dt className="inline text-zinc-500">Version: </dt>
            <dd className="inline">{provenance.sourceVersion}</dd>
          </div>
          <div>
            <dt className="inline text-zinc-500">Method: </dt>
            <dd className="inline">{provenance.mappingMethod}</dd>
          </div>
          <div>
            <dt className="inline text-zinc-500">Match quality: </dt>
            <dd className="inline">{provenance.matchQuality}</dd>
          </div>
          {result.state === "MAPPED" ? (
            <div>
              <dt className="inline text-zinc-500">Responsibility rule: </dt>
              <dd className="inline">
                {result.responsibility.ruleId} (
                {result.responsibility.ruleVersion})
              </dd>
            </div>
          ) : null}
        </dl>
        <Limitations limitations={limitations} />
      </details>
    </section>
  );
}
