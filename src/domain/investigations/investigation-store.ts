import type { Site } from "@/domain/sites/site";

import type { Investigation } from "./investigation";

export interface InvestigationWithSite {
  readonly investigation: Investigation;
  readonly site: Site;
}

export type CreateInvestigationResult =
  | {
      readonly kind: "created";
      readonly investigation: Investigation;
      readonly site: Site;
    }
  | {
      readonly kind: "unavailable";
      readonly reason: string;
    }
  | {
      readonly kind: "failed";
      readonly reason: string;
    };

export type InvestigationLookupResult =
  | {
      readonly kind: "found";
      readonly value: InvestigationWithSite;
    }
  | {
      readonly kind: "not_found";
      readonly investigationId: string;
    }
  | {
      readonly kind: "unavailable";
      readonly reason: string;
    };

export interface InvestigationStore {
  createForSite(site: Site): Promise<CreateInvestigationResult>;
  getById(investigationId: string): Promise<InvestigationLookupResult>;
}
