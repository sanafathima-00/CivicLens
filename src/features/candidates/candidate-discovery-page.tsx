"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { ConstructionCandidateMap } from "@/components/candidates/construction-candidate-map";
import { CreateInvestigationButton } from "@/components/candidates/create-investigation-button";
import { SelectedSiteCard } from "@/components/candidates/selected-site-card";

import type { CandidateApiResponse, CandidateViewModel } from "./types";

export function CandidateDiscoveryPage() {
  const [data, setData] = useState<CandidateApiResponse>();
  const [selectedCandidateId, setSelectedCandidateId] = useState<string>();
  const [error, setError] = useState<string>();

  useEffect(() => {
    const controller = new AbortController();

    async function loadCandidates() {
      try {
        const response = await fetch("/api/candidates", {
          signal: controller.signal,
        });
        const payload = (await response.json().catch(() => undefined)) as
          CandidateApiResponse | { readonly error?: string } | undefined;

        if (
          !response.ok ||
          payload === undefined ||
          !("candidates" in payload)
        ) {
          throw new Error(
            payload !== undefined && "error" in payload && payload.error
              ? payload.error
              : "Unable to load construction candidates.",
          );
        }

        setData(payload);
      } catch (caught) {
        if (controller.signal.aborted) {
          return;
        }

        setError(
          caught instanceof Error
            ? caught.message
            : "Unable to load construction candidates.",
        );
      }
    }

    void loadCandidates();
    return () => controller.abort();
  }, []);

  const selectCandidate = useCallback((candidateId: string) => {
    setSelectedCandidateId(candidateId);
  }, []);

  const selectedCandidate = useMemo<CandidateViewModel | undefined>(() => {
    return data?.candidates.find(
      (candidate) => candidate.candidateId === selectedCandidateId,
    );
  }, [data?.candidates, selectedCandidateId]);

  if (error !== undefined) {
    return (
      <main className="flex flex-1 items-center justify-center px-6 py-24">
        <section className="max-w-lg rounded-2xl border border-red-200 bg-red-50 p-6 text-center text-zinc-900">
          <h1 className="text-xl font-semibold">Candidates unavailable</h1>
          <p className="mt-3 text-sm leading-6 text-zinc-700">{error}</p>
        </section>
      </main>
    );
  }

  if (data === undefined) {
    return (
      <main className="flex flex-1 items-center justify-center px-6 py-24">
        <p className="text-sm text-zinc-600">
          Loading construction candidates…
        </p>
      </main>
    );
  }

  if (data.candidates.length === 0) {
    return (
      <main className="flex flex-1 items-center justify-center px-6 py-24">
        <section className="max-w-lg rounded-2xl border border-zinc-200 bg-white p-6 text-center text-zinc-900 shadow-sm">
          <h1 className="text-xl font-semibold">
            No investigation-ready sites
          </h1>
          <p className="mt-3 text-sm leading-6 text-zinc-600">
            The source snapshot did not provide any eligible construction
            candidates.
          </p>
        </section>
      </main>
    );
  }

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-6 px-6 py-8">
      <header className="max-w-3xl space-y-3">
        <p className="text-sm font-medium tracking-[0.2em] text-teal-700 uppercase">
          CivicLens candidate discovery
        </p>
        <h1 className="text-3xl font-semibold tracking-tight text-zinc-950 sm:text-4xl">
          Start with a source-backed construction candidate.
        </h1>
        <p className="text-base leading-7 text-zinc-600">
          {data.statistics.investigationReady} approximate project/site
          locations are available from a non-live imported source snapshot.
          Select one to create a new investigation.
        </p>
      </header>

      <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <ConstructionCandidateMap
          accessToken={process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN}
          candidates={data.candidates}
          onSelect={selectCandidate}
          selectedCandidateId={selectedCandidateId}
        />
        {selectedCandidate === undefined ? (
          <aside className="rounded-2xl border border-zinc-200 bg-white p-5 text-sm leading-6 text-zinc-600 shadow-sm">
            Select a map point to inspect its source-backed site information.
          </aside>
        ) : (
          <SelectedSiteCard candidate={selectedCandidate}>
            <CreateInvestigationButton
              candidateId={selectedCandidate.candidateId}
            />
          </SelectedSiteCard>
        )}
      </section>
    </main>
  );
}
