import type {
  SiteLookupResult,
  SiteProvider,
} from "@/domain/sites/site-provider";

import { SEEDED_SITE_PROVIDER, SEEDED_SITES } from "./seeded-sites";

function seededProviderIdentity() {
  return structuredClone(SEEDED_SITE_PROVIDER);
}

export class SeededSiteProvider implements SiteProvider {
  private readonly sitesById = new Map(
    SEEDED_SITES.map((site) => [site.id, site]),
  );

  async getById(siteId: string): Promise<SiteLookupResult> {
    const normalizedSiteId = siteId.trim();
    const site = this.sitesById.get(normalizedSiteId);

    if (!site) {
      return {
        kind: "not_found",
        provider: seededProviderIdentity(),
        siteId: normalizedSiteId,
      };
    }

    return {
      kind: "found",
      site: structuredClone(site),
    };
  }
}
