import { getComplaintByNumberInputSchema } from "@/contracts/complaints/get-complaint-by-number";
import type {
  ComplaintLookupResult,
  ComplaintProvider,
} from "@/domain/complaints/complaint-provider";

export type GetComplaintByNumberResult =
  | ComplaintLookupResult
  | {
      readonly kind: "invalid";
      readonly message: string;
    };

export class GetComplaintByNumber {
  constructor(private readonly complaintProvider: ComplaintProvider) {}

  async execute(complaintNumber: string): Promise<GetComplaintByNumberResult> {
    const parsed = getComplaintByNumberInputSchema.safeParse(complaintNumber);

    if (!parsed.success) {
      return {
        kind: "invalid",
        message: parsed.error.issues[0]?.message ?? "Invalid complaint number.",
      };
    }

    return this.complaintProvider.getByComplaintNumber(parsed.data);
  }
}
