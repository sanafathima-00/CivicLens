import assert from "node:assert/strict";
import test from "node:test";

import { validateVisualInterpretation } from "./vision-analysis";

const ids = [
  "ck1234567890123456789012345",
  "ck1234567890123456789012346",
] as const;

test("accepts the approved visual state and outcome combinations", () => {
  for (const [epistemicState, outcome] of [
    ["UNRESOLVED", "INSUFFICIENT_EVIDENCE"],
    ["OBSERVED", "VISIBLE_CONTEXT_CHANGE_UNCLASSIFIED"],
    ["OBSERVED", "NO_SIGNIFICANT_VISIBLE_CONTEXT_CHANGE"],
    ["INFERRED", "APPARENT_LARGE_SCALE_BUILT_CONTEXT_CHANGE"],
  ] as const) {
    assert.notEqual(
      validateVisualInterpretation({
        outcome,
        epistemicState,
        observedIndicators: ["A visible context pattern was reviewed."],
        limitations: ["Context-scale imagery."],
        supportingEvidenceItemIds: ids,
      }),
      undefined,
    );
  }
});

test("rejects invalid semantics, duplicate evidence, and legal claims", () => {
  assert.equal(
    validateVisualInterpretation({
      outcome: "APPARENT_LARGE_SCALE_BUILT_CONTEXT_CHANGE",
      epistemicState: "OBSERVED",
      observedIndicators: [],
      limitations: [],
      supportingEvidenceItemIds: ids,
    }),
    undefined,
  );
  assert.equal(
    validateVisualInterpretation({
      outcome: "INSUFFICIENT_EVIDENCE",
      epistemicState: "UNRESOLVED",
      observedIndicators: [],
      limitations: [],
      supportingEvidenceItemIds: [ids[0], ids[0]],
    }),
    undefined,
  );
  assert.equal(
    validateVisualInterpretation({
      outcome: "VISIBLE_CONTEXT_CHANGE_UNCLASSIFIED",
      epistemicState: "OBSERVED",
      observedIndicators: ["An illegal construction is visible."],
      limitations: [],
      supportingEvidenceItemIds: ids,
    }),
    undefined,
  );
});

function interpretationWithText(
  field: "observedIndicators" | "interpretation" | "limitations",
  text: string,
) {
  return {
    outcome: "VISIBLE_CONTEXT_CHANGE_UNCLASSIFIED" as const,
    epistemicState: "OBSERVED" as const,
    observedIndicators:
      field === "observedIndicators"
        ? [text]
        : ["A visible context pattern was reviewed."],
    ...(field === "interpretation" ? { interpretation: text } : {}),
    limitations: field === "limitations" ? [text] : ["Context-scale imagery."],
    supportingEvidenceItemIds: ids,
  };
}

test("rejects unsupported legal and deterministic metadata claims in every model-controlled text field", () => {
  const unsafe = [
    "An unlawful development is visible.",
    "This construction is illegal.",
    "The site is non-compliant.",
    "This is an encroachment.",
    "The development is unauthorized.",
    "The building lacks approval.",
    "The building is approved.",
    "The imagery has 1m GSD.",
    "The CRS is EPSG:4326.",
    "The image was captured on March 4, 2021.",
    "The imagery was collected on January 1.",
    "The image was captured on Jan 1.",
    "The imagery was acquired on 1 January.",
    "The capture date is Jan 1.",
    "The site is exactly 25m wide.",
    "The image came from Provider X.",
    "The image is from Provider X.",
    "This imagery was provided by Provider X.",
    "The image was sourced from X.",
    "According to Provider X, this is visible.",
    "Provider X confirms this observation.",
    "The imagery was collected by satellite X.",
    "The image was collected by satellite X.",
    "The imagery was captured by satellite X.",
    "The image was captured by satellite X.",
    "The imagery was acquired by satellite X.",
    "The image was acquired by satellite X.",
    "The imagery was collected by Provider X.",
    "The image was captured by Sensor X.",
    "Satellite X collected this imagery.",
    "Satellite X captured this image.",
    "Satellite X captures the later image.",
    "Sentinel-2 collected this imagery.",
    "Sentinel-2 captured this image.",
    "Sentinel-2 captures this imagery.",
    "Provider X supplied this imagery.",
    "Provider X sourced this image.",
    "Provider X collected the image.",
    "Sensor Y acquired the imagery.",
    "Source Z captured this observation.",
    "A satellite collected this imagery.",
    "A satellite sensor captured this image.",
    "An imaging provider acquired this imagery.",
    "The image was captured by Sentinel-2.",
    "The imagery was acquired by Provider X.",
    "The source was provided by Provider X.",
    "This observation was collected by Sentinel-2.",
    "This was captured by satellite X.",
    "The government should enforce this.",
    "Authorities must enforce the regulation.",
    "The authority enforced the restriction.",
    "This requires enforcement.",
  ];
  for (const field of [
    "observedIndicators",
    "interpretation",
    "limitations",
  ] as const) {
    for (const text of unsafe) {
      assert.equal(
        validateVisualInterpretation(interpretationWithText(field, text)),
        undefined,
      );
    }
  }
});

test("allows cautious visual observations in every model-controlled text field", () => {
  const allowed = [
    "A larger contiguous light-toned surface is visible.",
    "The later image contains more built-looking context.",
    "Vegetation obscures part of the apparent surface.",
    "A dark region may be shadow.",
    "A darker elongated surface is captured in the later image.",
    "A visible texture is captured by the later observation.",
    "A broad cleared area is captured in the image.",
    "A structural edge is captured clearly in the later observation.",
    "A surface is partly obscured by vegetation.",
    "A structure is surrounded by vegetation.",
    "A dark region is separated by a visible boundary.",
    "The later image captures a darker surface.",
    "The later image captures a visible structure.",
    "The image shows increased bare ground.",
    "A visible change appears near the center of the AOI.",
  ];
  for (const field of [
    "observedIndicators",
    "interpretation",
    "limitations",
  ] as const) {
    for (const text of allowed) {
      assert.notEqual(
        validateVisualInterpretation(interpretationWithText(field, text)),
        undefined,
      );
    }
  }
});
