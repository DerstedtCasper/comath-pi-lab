# Risk Register

| Risk | Severity | Phase | Mitigation |
| --- | --- | --- | --- |
| Pi API drift between ecosystem docs and official docs | High | 6 | Revalidate against installed Pi; treat ecosystem docs as taxonomy only. |
| Pi packages/extensions have broad system access | High | 6+ | Audit third-party package source; keep permission-gate pattern; no direct trusted DB writes. |
| TriviumDB native load failure on target platform | High | 5, 13 | Keep adapter interface and in-memory fallback; probe native import before enabling. |
| TriviumDB numeric IDs leak into business contracts | High | 1, 5, 13 | Stable string IDs only; internal `StableIdMap`. |
| Multiple processes open `.tdb` | Medium | 13 | Only `comathd` owns DB connection; document single-process ownership. |
| MathProve overtrusted as proof oracle | High | 4, 9 | Position as evidence producer/gate runner; final status requires durable artifacts and gate checks. |
| Agent consensus mistaken for proof | High | 4+ | Gate rules say reviewer/agent votes are advisory only. |
| Workstream patch pollutes trusted graph | High | 7+ | `GraphPatch` review state; no auto-apply. |
| Arbitrary shell execution from workstream | High | 10 | Runner sandbox, deny-by-default commands, timeout/memory limits. |
| Working paper hides conjectural status | High | 12 | Paper checker fails on claim status/wording mismatch. |
| Literature support from LLM memory | High | 11 | Exact citation artifacts and condition matching required. |
| Context overflow across long goal runs | Medium | all | Keep handoff docs, TODO/REVIEW, progress logs, and phase stop rules. |
| Overlarge phases cause partial unreviewed implementation | Medium | all | Use phase goals, allowed edit scopes, validation, and stop conditions. |
| High concurrency creates write conflicts | High | all | Use `rpm=1000` only with strict disjoint write scopes and parent-coordinator merge review. |
| Parallelism before mutation gateway pollutes core state | High | 1-7 | Keep early/middle parallelism read-only or disjoint; wait until Phase 8 for broad subagent workstream fan-out. |

## Current Risk Posture

After Phase 0 and design documentation:

- No runtime behavior exists, so runtime safety risks are design risks, not active code paths.
- The largest immediate risk is future scope creep: Phase 1 must remain contracts-only.
- TriviumDB and MathProve are intentionally deferred behind adapter/gate boundaries.
- High subagent concurrency is allowed, but active implementation remains bounded by file ownership and phase stop rules.
