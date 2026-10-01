import type { Complaint, ComplaintProviderIdentity } from "./complaint";

export type ComplaintLookupResult =
  | {
      readonly kind: "found";
      readonly complaint: Complaint;
    }
  | {
      readonly kind: "not_found";
      readonly provider: ComplaintProviderIdentity;
      readonly complaintNumber: string;
    }
  | {
      readonly kind: "unavailable";
      readonly provider: ComplaintProviderIdentity;
      readonly reason: string;
    };

export interface ComplaintProvider {
  getByComplaintNumber(complaintNumber: string): Promise<ComplaintLookupResult>;
}
