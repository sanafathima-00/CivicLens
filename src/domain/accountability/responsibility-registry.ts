import type { ComplaintCategory } from "@/domain/complaints/complaint";

export interface CivicServiceResponsibility {
  readonly ruleId: string;
  readonly ruleVersion: string;
  readonly category: Exclude<ComplaintCategory, "OTHER">;
  readonly serviceFunction: string;
  readonly accountableAdministrativeFunction: string;
  readonly rationale: string;
  readonly sourceReference?: string;
  readonly limitations: readonly string[];
}

export interface CivicServiceResponsibilityRegistry {
  getByCategory(
    category: ComplaintCategory,
  ): CivicServiceResponsibility | undefined;
}

const REGISTRY_VERSION = "civiclens-prototype-routing-v1";
const PROTOTYPE_LIMITATION =
  "This is a CivicLens prototype administrative responsibility suggestion, not an official routing instruction or legal determination.";

export const CIVIC_SERVICE_RESPONSIBILITY_RULES: readonly CivicServiceResponsibility[] =
  [
    {
      ruleId: "civiclens-waterlogging-drainage-v1",
      ruleVersion: REGISTRY_VERSION,
      category: "WATERLOGGING",
      serviceFunction: "Storm-water drainage / engineering",
      accountableAdministrativeFunction:
        "Relevant city-corporation drainage-engineering function",
      rationale:
        "Waterlogging complaints are routed to the city-corporation storm-water drainage / engineering function for prototype accountability review.",
      limitations: [PROTOTYPE_LIMITATION],
    },
    {
      ruleId: "civiclens-illegal-dumping-solid-waste-v1",
      ruleVersion: REGISTRY_VERSION,
      category: "ILLEGAL_DUMPING",
      serviceFunction: "Solid waste management",
      accountableAdministrativeFunction:
        "Relevant city-corporation solid-waste management function",
      rationale:
        "Illegal dumping is routed to the city-corporation solid-waste management function for prototype accountability review.",
      limitations: [PROTOTYPE_LIMITATION],
    },
    {
      ruleId: "civiclens-drain-obstruction-drainage-v1",
      ruleVersion: REGISTRY_VERSION,
      category: "DRAIN_OBSTRUCTION",
      serviceFunction: "Storm-water drainage / engineering",
      accountableAdministrativeFunction:
        "Relevant city-corporation drainage-engineering function",
      rationale:
        "Drain-obstruction complaints are routed to the city-corporation storm-water drainage / engineering function for prototype accountability review.",
      limitations: [PROTOTYPE_LIMITATION],
    },
    {
      ruleId: "civiclens-encroachment-public-space-v1",
      ruleVersion: REGISTRY_VERSION,
      category: "ENCROACHMENT",
      serviceFunction: "Public-space / estate-enforcement coordination",
      accountableAdministrativeFunction:
        "Relevant city-corporation public-space / estate function",
      rationale:
        "Encroachment complaints are routed to a city-corporation public-space / estate coordination function pending land-ownership confirmation.",
      limitations: [
        PROTOTYPE_LIMITATION,
        "Land or asset ownership may require confirmation before any external routing.",
      ],
    },
    {
      ruleId: "civiclens-construction-debris-waste-v1",
      ruleVersion: REGISTRY_VERSION,
      category: "CONSTRUCTION_DEBRIS",
      serviceFunction:
        "Construction-and-demolition waste / solid-waste coordination",
      accountableAdministrativeFunction:
        "Relevant city-corporation waste-management function",
      rationale:
        "Construction-debris complaints are routed to a city-corporation waste-management function for prototype accountability review.",
      limitations: [
        PROTOTYPE_LIMITATION,
        "The applicable collection or contractor arrangement is not represented by this registry.",
      ],
    },
    {
      ruleId: "civiclens-road-blockage-roads-v1",
      ruleVersion: REGISTRY_VERSION,
      category: "ROAD_BLOCKAGE",
      serviceFunction: "Roads / engineering",
      accountableAdministrativeFunction:
        "Relevant city-corporation roads-engineering function",
      rationale:
        "Road-blockage complaints are routed to the city-corporation roads-engineering function for prototype accountability review.",
      limitations: [
        PROTOTYPE_LIMITATION,
        "Traffic enforcement or non-city-corporation road ownership may require a different authority.",
      ],
    },
  ];

export const civicServiceResponsibilityRegistry: CivicServiceResponsibilityRegistry =
  {
    getByCategory(category) {
      return CIVIC_SERVICE_RESPONSIBILITY_RULES.find(
        (rule) => rule.category === category,
      );
    },
  };
