"use client";

import mapboxgl from "mapbox-gl";
import { useEffect, useRef } from "react";

import type { CandidateViewModel } from "@/features/candidates/types";

interface ConstructionCandidateMapProps {
  readonly candidates: readonly CandidateViewModel[];
  readonly selectedCandidateId?: string;
  readonly onSelect: (candidateId: string) => void;
  readonly accessToken?: string;
}

function geoJson(candidates: readonly CandidateViewModel[]) {
  return {
    type: "FeatureCollection" as const,
    features: candidates
      .filter(
        (candidate) =>
          candidate.site.location.longitude !== undefined &&
          candidate.site.location.latitude !== undefined,
      )
      .map((candidate) => ({
        type: "Feature" as const,
        geometry: {
          type: "Point" as const,
          coordinates: [
            candidate.site.location.longitude as number,
            candidate.site.location.latitude as number,
          ],
        },
        properties: {
          candidateId: candidate.candidateId,
          label:
            candidate.site.label ??
            candidate.sourceRecord.rawConstructionName ??
            "Unnamed source record",
        },
      })),
  };
}

export function ConstructionCandidateMap({
  candidates,
  selectedCandidateId,
  onSelect,
  accessToken,
}: ConstructionCandidateMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | undefined>(undefined);
  const selectedCandidateIdRef = useRef(selectedCandidateId);

  useEffect(() => {
    selectedCandidateIdRef.current = selectedCandidateId;
    const map = mapRef.current;
    if (map === undefined || !map.isStyleLoaded()) {
      return;
    }

    map.setFilter("selected-candidate-circle", [
      "==",
      ["get", "candidateId"],
      selectedCandidateId ?? "",
    ]);
  }, [selectedCandidateId]);

  useEffect(() => {
    if (accessToken === undefined || containerRef.current === null) {
      return;
    }

    mapboxgl.accessToken = accessToken;
    const data = geoJson(candidates);
    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: "mapbox://styles/mapbox/light-v11",
      center: [77.5946, 12.9716],
      zoom: 9.5,
    });

    map.on("load", () => {
      map.addSource("construction-candidates", {
        type: "geojson",
        data,
      });
      map.addLayer({
        id: "candidate-circles",
        type: "circle",
        source: "construction-candidates",
        paint: {
          "circle-radius": 5,
          "circle-color": "#0f766e",
          "circle-stroke-width": 1,
          "circle-stroke-color": "#ffffff",
        },
      });
      map.addLayer({
        id: "selected-candidate-circle",
        type: "circle",
        source: "construction-candidates",
        filter: [
          "==",
          ["get", "candidateId"],
          selectedCandidateIdRef.current ?? "",
        ],
        paint: {
          "circle-radius": 9,
          "circle-color": "#f59e0b",
          "circle-stroke-width": 2,
          "circle-stroke-color": "#78350f",
        },
      });

      const bounds = new mapboxgl.LngLatBounds();
      for (const feature of data.features) {
        bounds.extend(feature.geometry.coordinates as [number, number]);
      }
      if (!bounds.isEmpty()) {
        map.fitBounds(bounds, { padding: 48, maxZoom: 13 });
      }

      map.on("click", "candidate-circles", (event) => {
        const candidateId = event.features?.[0]?.properties?.candidateId;
        if (typeof candidateId === "string") {
          onSelect(candidateId);
        }
      });
      map.on("mouseenter", "candidate-circles", () => {
        map.getCanvas().style.cursor = "pointer";
      });
      map.on("mouseleave", "candidate-circles", () => {
        map.getCanvas().style.cursor = "";
      });
    });
    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = undefined;
    };
  }, [accessToken, candidates, onSelect]);

  if (accessToken === undefined) {
    return (
      <section className="flex min-h-96 items-center justify-center rounded-2xl border border-amber-200 bg-amber-50 p-8 text-center text-zinc-800">
        <div className="max-w-md space-y-2">
          <p className="font-semibold">Map configuration is required</p>
          <p className="text-sm leading-6 text-zinc-600">
            Add a valid public Mapbox token to view source-backed approximate
            project/site locations.
          </p>
        </div>
      </section>
    );
  }

  return <div ref={containerRef} className="min-h-96 rounded-2xl" />;
}
