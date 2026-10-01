"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface CreateInvestigationButtonProps {
  readonly candidateId: string;
}

export function CreateInvestigationButton({
  candidateId,
}: CreateInvestigationButtonProps) {
  const router = useRouter();
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string>();

  async function createInvestigation() {
    setIsCreating(true);
    setError(undefined);

    try {
      const response = await fetch("/api/investigations", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ candidateId }),
      });
      const payload = (await response.json().catch(() => undefined)) as
        | {
            readonly error?: string;
            readonly investigation?: { readonly id: string };
          }
        | undefined;

      if (!response.ok || payload?.investigation === undefined) {
        throw new Error(
          payload?.error ?? "Unable to create the investigation.",
        );
      }

      router.push(`/investigations/${payload.investigation.id}`);
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Unable to create the investigation.",
      );
      setIsCreating(false);
    }
  }

  return (
    <div className="space-y-3">
      <button
        className="w-full rounded-xl bg-teal-700 px-4 py-3 text-sm font-semibold text-white transition hover:bg-teal-800 disabled:cursor-not-allowed disabled:bg-teal-400"
        disabled={isCreating}
        onClick={createInvestigation}
        type="button"
      >
        {isCreating ? "Creating investigation…" : "Investigate this site"}
      </button>
      {error === undefined ? null : (
        <p className="text-sm leading-6 text-red-700" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
