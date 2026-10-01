import type {
  ComplaintLookupResult,
  ComplaintProvider,
} from "@/domain/complaints/complaint-provider";

import { SEEDED_COMPLAINTS, SEEDED_DEMO_PROVIDER } from "./seeded-complaints";

function normalizeComplaintNumber(complaintNumber: string): string {
  return complaintNumber.trim().toUpperCase();
}

function seededProviderIdentity() {
  return structuredClone(SEEDED_DEMO_PROVIDER);
}

export class SeededComplaintProvider implements ComplaintProvider {
  private readonly complaintsByNumber = new Map(
    SEEDED_COMPLAINTS.map((complaint) => [
      complaint.complaintNumber,
      complaint,
    ]),
  );

  async getByComplaintNumber(
    complaintNumber: string,
  ): Promise<ComplaintLookupResult> {
    const normalizedNumber = normalizeComplaintNumber(complaintNumber);
    const complaint = this.complaintsByNumber.get(normalizedNumber);

    if (!complaint) {
      return {
        kind: "not_found",
        provider: seededProviderIdentity(),
        complaintNumber: normalizedNumber,
      };
    }

    return {
      kind: "found",
      complaint: structuredClone(complaint),
    };
  }
}
