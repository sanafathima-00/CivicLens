export const COMPLAINT_CATEGORIES = [
  "WATERLOGGING",
  "ILLEGAL_DUMPING",
  "DRAIN_OBSTRUCTION",
  "ENCROACHMENT",
  "CONSTRUCTION_DEBRIS",
  "ROAD_BLOCKAGE",
  "OTHER",
] as const;

export type ComplaintCategory = (typeof COMPLAINT_CATEGORIES)[number];

export const COMPLAINT_CATEGORY_LABELS: Record<ComplaintCategory, string> = {
  WATERLOGGING: "Waterlogging / flooding",
  ILLEGAL_DUMPING: "Illegal dumping / garbage accumulation",
  DRAIN_OBSTRUCTION: "Drain obstruction",
  ENCROACHMENT: "Encroachment affecting public space",
  CONSTRUCTION_DEBRIS: "Construction debris",
  ROAD_BLOCKAGE: "Major road blockage",
  OTHER: "Other overhead-visible civic issue",
};

export const COMPLAINT_SOURCE_STATUSES = [
  "REPORTED",
  "ACKNOWLEDGED",
  "ASSIGNED",
  "IN_PROGRESS",
  "MARKED_RESOLVED",
  "CLOSED",
  "REOPENED",
  "UNKNOWN",
] as const;

export type ComplaintSourceStatus = (typeof COMPLAINT_SOURCE_STATUSES)[number];

export const COMPLAINT_SOURCE_EVENT_TYPES = [
  "REPORTED",
  "ACKNOWLEDGED",
  "ASSIGNED",
  "WORK_REPORTED",
  "STATUS_CHANGED",
  "MARKED_RESOLVED",
  "CLOSED",
  "REOPENED",
  "NOTE",
] as const;

export type ComplaintSourceEventType =
  (typeof COMPLAINT_SOURCE_EVENT_TYPES)[number];

export type ComplaintSourceKind = "SEEDED_DEMO" | "AUTHORIZED_EXTERNAL";

export interface ComplaintProviderIdentity {
  readonly id: string;
  readonly label: string;
  readonly sourceKind: ComplaintSourceKind;
  readonly isLive: boolean;
}

interface ComplaintLocationDetails {
  readonly coordinatePrecisionMeters?: number;
  readonly coordinateSource?: string;
  readonly displayAddress?: string;
  readonly landmark?: string;
  readonly jurisdiction?: string;
  readonly zone?: string;
  readonly ward?: string;
  readonly boundaryReference?: string;
  readonly boundaryVersion?: string;
  readonly matchQuality?: string;
  readonly limitationNotes?: string;
}

export type ComplaintLocation = ComplaintLocationDetails &
  (
    | {
        readonly latitude: number;
        readonly longitude: number;
      }
    | {
        readonly latitude?: undefined;
        readonly longitude?: undefined;
      }
  );

export interface ComplaintSourceEvent {
  readonly id: string;
  readonly providerEventId: string;
  readonly eventType: ComplaintSourceEventType;
  readonly rawEventType?: string;
  readonly resultingSourceStatus?: ComplaintSourceStatus;
  readonly occurredAt: Date;
  readonly summary: string;
  readonly sourceRecordReference?: string;
  readonly sourceEventVersion?: string;
  readonly importedAt: Date;
}

export interface Complaint {
  readonly id: string;
  readonly complaintNumber: string;
  readonly provider: ComplaintProviderIdentity;
  readonly providerComplaintId: string;
  readonly title: string;
  readonly category: ComplaintCategory;
  readonly description: string;
  readonly sourceStatus: ComplaintSourceStatus;
  readonly sourceStatusRaw?: string;
  readonly reportedAt: Date;
  readonly sourceUpdatedAt?: Date;
  readonly markedResolvedAt?: Date;
  readonly closedAt?: Date;
  readonly sourceRecordReference?: string;
  readonly originalSourceEvidenceReference?: string;
  readonly sourceRetrievedAt: Date;
  readonly normalizedRecordVersion: string;
  readonly location?: ComplaintLocation;
  readonly sourceHistory: readonly ComplaintSourceEvent[];
}

export function hasUsableCoordinates(
  location: ComplaintLocation | undefined,
): location is ComplaintLocation & { latitude: number; longitude: number } {
  return location?.latitude !== undefined && location.longitude !== undefined;
}
