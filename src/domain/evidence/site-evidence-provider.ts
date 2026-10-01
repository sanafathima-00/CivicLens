import type { Investigation } from "@/domain/investigations/investigation";
import type { Site } from "@/domain/sites/site";

import type { ProviderEvidenceResult } from "./evidence";

export interface SiteEvidenceProvider {
  readonly providerId: string;

  retrieve(input: {
    readonly investigation: Investigation;
    readonly site: Site;
  }): Promise<ProviderEvidenceResult>;
}
