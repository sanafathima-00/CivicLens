import type { AdministrativeMappingResult } from "@/domain/accountability/authority-mapping";
import type { AdministrativeMappingProvider } from "@/domain/accountability/administrative-mapping-provider";
import {
  hasUsableCoordinates,
  type ComplaintLocation,
} from "@/domain/complaints/complaint";

import { SEEDED_ADMINISTRATIVE_REFERENCES } from "./seeded-administrative-references";

function coordinateKey(latitude: number, longitude: number): string {
  return `${latitude},${longitude}`;
}

export class SeededAdministrativeMappingProvider implements AdministrativeMappingProvider {
  private readonly referencesByCoordinate = new Map(
    SEEDED_ADMINISTRATIVE_REFERENCES.map((reference) => [
      coordinateKey(reference.latitude, reference.longitude),
      reference,
    ]),
  );

  async mapCoordinates(
    location: ComplaintLocation | undefined,
  ): Promise<AdministrativeMappingResult> {
    if (!hasUsableCoordinates(location)) {
      return {
        state: "NOT_MAPPABLE",
        limitations: [
          "Administrative context cannot be mapped because no coordinate pair was provided.",
        ],
      };
    }

    const reference = this.referencesByCoordinate.get(
      coordinateKey(location.latitude, location.longitude),
    );

    if (!reference) {
      return {
        state: "UNRESOLVED",
        limitations: [
          "The valid coordinate pair is outside the retained CivicLens prototype reference dataset.",
        ],
      };
    }

    return {
      state: "MAPPED",
      administrativeContext: structuredClone(reference.administrativeContext),
      provenance: structuredClone(reference.provenance),
    };
  }
}
