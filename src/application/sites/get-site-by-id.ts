import { getSiteByIdInputSchema } from "@/contracts/sites/get-site-by-id";
import type {
  SiteLookupResult,
  SiteProvider,
} from "@/domain/sites/site-provider";

export type GetSiteByIdResult =
  | SiteLookupResult
  | {
      readonly kind: "invalid";
      readonly message: string;
    };

export class GetSiteById {
  constructor(private readonly siteProvider: SiteProvider) {}

  async execute(siteId: string): Promise<GetSiteByIdResult> {
    const parsed = getSiteByIdInputSchema.safeParse(siteId);

    if (!parsed.success) {
      return {
        kind: "invalid",
        message: parsed.error.issues[0]?.message ?? "Invalid site ID.",
      };
    }

    return this.siteProvider.getById(parsed.data);
  }
}
