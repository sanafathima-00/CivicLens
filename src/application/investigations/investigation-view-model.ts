import type { InvestigationWithSite } from "@/domain/investigations/investigation-store";

export function investigationViewModel(value: InvestigationWithSite) {
  return {
    investigation: {
      id: value.investigation.id,
      siteId: value.investigation.siteId,
      status: value.investigation.status,
      createdAt: value.investigation.createdAt.toISOString(),
      updatedAt: value.investigation.updatedAt.toISOString(),
    },
    site: {
      id: value.site.id,
      label: value.site.label,
      origin: {
        ...value.site.origin,
        retrievedAt: value.site.origin.retrievedAt.toISOString(),
      },
      location: value.site.location,
    },
  };
}
