import type { Site, SiteProviderIdentity } from "./site";

export type SiteLookupResult =
  | {
      readonly kind: "found";
      readonly site: Site;
    }
  | {
      readonly kind: "not_found";
      readonly provider: SiteProviderIdentity;
      readonly siteId: string;
    }
  | {
      readonly kind: "unavailable";
      readonly provider: SiteProviderIdentity;
      readonly reason: string;
    }
  | {
      readonly kind: "unresolved";
      readonly provider: SiteProviderIdentity;
      readonly siteId: string;
      readonly reason: string;
    };

export interface SiteProvider {
  getById(siteId: string): Promise<SiteLookupResult>;
}
