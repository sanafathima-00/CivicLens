import type { ComplaintLocation } from "@/domain/complaints/complaint";

import type { AdministrativeMappingResult } from "./authority-mapping";

export interface AdministrativeMappingProvider {
  mapCoordinates(
    location: ComplaintLocation | undefined,
  ): Promise<AdministrativeMappingResult>;
}
