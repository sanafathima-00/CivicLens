# Step 6 MVP vision fixture coverage

These deterministic application-boundary fixtures are not a live-model accuracy
evaluation. They verify that CivicLens can safely represent dated, context-scale
visual interpretations without treating them as legal or regulatory findings.

| Case | Recorded interpretation | Required behavior |
| --- | --- | --- |
| Positive context change | `APPARENT_LARGE_SCALE_BUILT_CONTEXT_CHANGE` / `INFERRED` | Persist a bounded apparent context-change result with limitations. |
| No meaningful visible change | `NO_SIGNIFICANT_VISIBLE_CONTEXT_CHANGE` / `OBSERVED` | Do not fabricate a construction event. |
| Vegetation or seasonal variation | `VISIBLE_CONTEXT_CHANGE_UNCLASSIFIED` / `OBSERVED` | Preserve environmental caveats and avoid a construction claim. |
| Shadow or haze ambiguity | `INSUFFICIENT_EVIDENCE` / `UNRESOLVED` | Preserve uncertainty rather than manufacture a finding. |
| Poor or non-comparable imagery | no model invocation | Keep deterministic Step 6B gating authoritative. |

Fixtures are prepared test data only. They do not establish model accuracy on
real Sentinel-2 observations. A live OpenAI smoke run remains opt-in and must
use a real persisted investigation only when local server-side configuration is
available.
