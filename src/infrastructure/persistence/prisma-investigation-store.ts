import {
  Prisma,
  type Investigation as PrismaInvestigation,
  type PrismaClient,
  type Site as PrismaSite,
} from "@/generated/prisma/client";
import type {
  CreateInvestigationResult,
  InvestigationLookupResult,
  InvestigationStore,
} from "@/domain/investigations/investigation-store";
import type {
  Investigation,
  InvestigationStatus,
} from "@/domain/investigations/investigation";
import type {
  CoordinateQuality,
  Site,
  SiteLocationState,
  SiteSourceType,
} from "@/domain/sites/site";

function toSite(site: PrismaSite): Site {
  return {
    id: site.id,
    ...(site.label === null ? {} : { label: site.label }),
    origin: {
      providerId: site.originProviderId,
      providerLabel: site.originProviderLabel,
      sourceType: site.originSourceType as SiteSourceType,
      isLive: site.originIsLive,
      ...(site.originExternalRecordId === null
        ? {}
        : { externalRecordId: site.originExternalRecordId }),
      retrievedAt: site.originRetrievedAt,
      ...(site.originSourceReference === null
        ? {}
        : { sourceReference: site.originSourceReference }),
      ...(site.originSourceVersion === null
        ? {}
        : { sourceVersion: site.originSourceVersion }),
      ...(site.originSourceContentHash === null
        ? {}
        : { sourceContentHash: site.originSourceContentHash }),
      ...(site.originLicenseDesignation === null
        ? {}
        : { licenseDesignation: site.originLicenseDesignation }),
    },
    location: {
      locationState: site.locationState as SiteLocationState,
      ...(site.latitude === null ? {} : { latitude: site.latitude.toNumber() }),
      ...(site.longitude === null
        ? {}
        : { longitude: site.longitude.toNumber() }),
      ...(site.coordinatePrecisionMeters === null
        ? {}
        : { coordinatePrecisionMeters: site.coordinatePrecisionMeters }),
      ...(site.coordinateQuality === null
        ? {}
        : {
            coordinateQuality: site.coordinateQuality as CoordinateQuality,
          }),
      ...(site.displayAddress === null
        ? {}
        : { displayAddress: site.displayAddress }),
      ...(site.locality === null ? {} : { locality: site.locality }),
      ...(site.neighborhood === null
        ? {}
        : { neighborhood: site.neighborhood }),
      ...(site.city === null ? {} : { city: site.city }),
      ...(site.postalCode === null ? {} : { postalCode: site.postalCode }),
      ...(site.descriptiveLocation === null
        ? {}
        : { descriptiveLocation: site.descriptiveLocation }),
    },
  };
}

function toInvestigation(investigation: PrismaInvestigation): Investigation {
  return {
    id: investigation.id,
    siteId: investigation.siteId,
    status: investigation.status as InvestigationStatus,
    createdAt: investigation.createdAt,
    updatedAt: investigation.updatedAt,
  };
}

function siteCreateData(site: Site): Prisma.SiteCreateInput {
  return {
    id: site.id,
    label: site.label,
    originProviderId: site.origin.providerId,
    originProviderLabel: site.origin.providerLabel,
    originSourceType: site.origin.sourceType,
    originIsLive: site.origin.isLive,
    originExternalRecordId: site.origin.externalRecordId,
    originRetrievedAt: site.origin.retrievedAt,
    originSourceReference: site.origin.sourceReference,
    originSourceVersion: site.origin.sourceVersion,
    originSourceContentHash: site.origin.sourceContentHash,
    originLicenseDesignation: site.origin.licenseDesignation,
    latitude: site.location.latitude,
    longitude: site.location.longitude,
    coordinatePrecisionMeters: site.location.coordinatePrecisionMeters,
    coordinateQuality: site.location.coordinateQuality,
    locationState: site.location.locationState,
    displayAddress: site.location.displayAddress,
    locality: site.location.locality,
    neighborhood: site.location.neighborhood,
    city: site.location.city,
    postalCode: site.location.postalCode,
    descriptiveLocation: site.location.descriptiveLocation,
  };
}

const DATABASE_UNAVAILABLE_ERROR_CODES = new Set([
  "P1000",
  "P1001",
  "P1002",
  "P1008",
  "P1017",
  "P2024",
  "ECONNREFUSED",
  "ECONNRESET",
  "ETIMEDOUT",
  "EHOSTUNREACH",
  "ENETUNREACH",
  "ENOTFOUND",
]);

function databaseUnavailable(error: unknown): boolean {
  if (
    typeof error !== "object" ||
    error === null ||
    !("code" in error) ||
    typeof error.code !== "string"
  ) {
    return false;
  }

  return DATABASE_UNAVAILABLE_ERROR_CODES.has(error.code);
}

export class PrismaInvestigationStore implements InvestigationStore {
  constructor(private readonly prisma: PrismaClient) {}

  async createForSite(site: Site): Promise<CreateInvestigationResult> {
    try {
      const value = await this.prisma.$transaction(async (transaction) => {
        const persistedSite = await transaction.site.upsert({
          where: { id: site.id },
          create: siteCreateData(site),
          update: {},
        });
        const investigation = await transaction.investigation.create({
          data: {
            siteId: persistedSite.id,
            status: "CREATED",
          },
        });

        return { investigation, site: persistedSite };
      });

      return {
        kind: "created",
        investigation: toInvestigation(value.investigation),
        site: toSite(value.site),
      };
    } catch (error) {
      if (databaseUnavailable(error)) {
        return {
          kind: "unavailable",
          reason: "Investigation storage is currently unavailable.",
        };
      }

      return {
        kind: "failed",
        reason: "Unable to create the investigation.",
      };
    }
  }

  async getById(investigationId: string): Promise<InvestigationLookupResult> {
    try {
      const value = await this.prisma.investigation.findUnique({
        where: { id: investigationId },
        include: { site: true },
      });

      if (value === null) {
        return {
          kind: "not_found",
          investigationId,
        };
      }

      return {
        kind: "found",
        value: {
          investigation: toInvestigation(value),
          site: toSite(value.site),
        },
      };
    } catch (error) {
      if (databaseUnavailable(error)) {
        return {
          kind: "unavailable",
          reason: "Investigation storage is currently unavailable.",
        };
      }

      return {
        kind: "unavailable",
        reason: "Investigation storage is currently unavailable.",
      };
    }
  }
}
