export const INVESTIGATION_STATUSES = [
  "CREATED",
  "IN_PROGRESS",
  "COMPLETED",
  "FAILED",
] as const;

export type InvestigationStatus = (typeof INVESTIGATION_STATUSES)[number];

export interface Investigation {
  readonly id: string;
  readonly siteId: string;
  readonly status: InvestigationStatus;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}
