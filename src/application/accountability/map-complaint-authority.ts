import type {
  AuthorityMappingResult,
  AuthorityMappingService,
} from "@/domain/accountability/authority-mapping";
import type {
  ComplaintCategory,
  ComplaintLocation,
} from "@/domain/complaints/complaint";

export class MapComplaintAuthority {
  constructor(
    private readonly authorityMappingService: AuthorityMappingService,
  ) {}

  async execute(
    location: ComplaintLocation | undefined,
    category: ComplaintCategory,
  ): Promise<AuthorityMappingResult> {
    return this.authorityMappingService.map(location, category);
  }
}
