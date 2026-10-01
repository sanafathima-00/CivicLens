import assert from "node:assert/strict";
import test from "node:test";

import {
  formatObservationDate,
  historicalImageryTimeline,
} from "./historical-imagery-presentation";

test("builds an honest chronological imagery timeline from persisted evidence", () => {
  const timeline = historicalImageryTimeline([
    {
      id: "after",
      kind: "IMAGERY",
      label: "Later observation",
      provenance: { providerLabel: "Planetary Computer" },
      observedAt: { value: "2024-02-18T00:00:00.000Z", precision: "EXACT" },
      limitations: ["Context imagery only."],
      metadata: {
        imagery: { usability: "LIMITED", qualityFlags: ["CLOUD_AFFECTED"] },
      },
      asset: { contentType: "image/png" },
    },
    {
      id: "before",
      kind: "IMAGERY",
      label: "Earlier observation",
      provenance: { providerLabel: "Planetary Computer" },
      observedAt: { value: "2022-01-23T00:00:00.000Z", precision: "EXACT" },
      limitations: [],
      metadata: { imagery: { usability: "USABLE", qualityFlags: [] } },
      asset: { contentType: "image/png" },
    },
    {
      id: "site-origin",
      kind: "SITE_SOURCE_RECORD",
      provenance: { providerLabel: "OpenCity" },
      limitations: [],
      metadata: {},
    },
  ]);

  assert.deepEqual(
    timeline.map((entry) => entry.id),
    ["before", "after"],
  );
  assert.equal(timeline[1]?.usability, "LIMITED");
  assert.deepEqual(timeline[1]?.qualityFlags, ["CLOUD_AFFECTED"]);
  assert.equal(formatObservationDate(timeline[0]?.observedAt), "23 Jan 2022");
});

test("keeps missing imagery dates and assets explicit rather than fabricating them", () => {
  const timeline = historicalImageryTimeline([
    {
      id: "unavailable-date",
      kind: "IMAGERY",
      provenance: { providerLabel: "Planetary Computer" },
      limitations: ["No rendered asset is available."],
      metadata: { imagery: { usability: "UNSUITABLE", qualityFlags: [] } },
    },
  ]);

  assert.equal(timeline[0]?.observedAt, undefined);
  assert.equal(timeline[0]?.hasDisplayableAsset, false);
  assert.equal(formatObservationDate(undefined), "Date unavailable");
});
