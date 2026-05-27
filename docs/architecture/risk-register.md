# Risk Register

| Risk | Severity | Phase | Mitigation |
| --- | --- | --- | --- |
| Pi API drift between ecosystem docs and official docs | High | 6 | Revalidate against installed Pi; treat ecosystem docs as taxonomy only. |
| Pi packages/extensions have broad system access | High | 6+ | Audit third-party package source; keep permission-gate pattern; no direct trusted DB writes. |
| TriviumDB native load failure on target platform | High | 5, 13 | Keep adapter interface and in-memory fallback; probe native import before enabling. |
| TriviumDB numeric IDs leak into business contracts | High | 1, 5, 13 | Stable string IDs only; internal `StableIdMap`. |
| Multiple processes open `.tdb` | Medium | 13 | Only `comathd` owns DB connection; document single-process ownership. |
| MathProve overtrusted as proof oracle | High | 4, 9 | Position as evidence producer/gate runner; final status requires durable artifacts and gate checks. |
| Phase 18 proof-kernel vertical slice overclaimed as arbitrary theorem proving | High | 18+ | Document the implemented `Nat.add_zero`/refutation slices and require new tests before broadening theorem classes. |
| Proof candidate voting mistaken for proof evidence | High | 18+ | Candidate selection filters hard vetoes and statement drift before scoring; `formally_checked` requires replay-bound artifacts. |
| V8 dialectical stress mistaken for proof evidence | High | 19+ | Persist `proof_authority: none`, require downstream Lean/exact-computation/citation gates, and test that ensemble recovery selects Lean-valid evidence rather than stress artifacts. |
| Internal proof-stage names mistaken for public campaign states | Medium | 20+ | Public `ResearchCampaign.current_stage` uses v3 canonical states; internal proof-kernel stages such as `lemma_sprint` stay confined to candidate/gate artifacts. |
| Bounded tick success mistaken for autonomous research completion | High | 20+ | Phase 20 validates public state semantics and blocks unsupported final replay targets; it does not validate generic proof planning or real agent scheduling. |
| Dashboard read model mistaken for proof authority | Medium | 21+ | Claim/evidence/gate list routes are read-only inspection surfaces; promotions still require gate-mediated evidence and proof-kernel replay where applicable. |
| Pi research loop mistaken for production runtime registration | Medium | 22+ | Phase 22 verifies a thin-client orchestration helper with scoped capability checks; installed Pi runtime registration and persistent child-agent scheduling remain separate blockers. |
| Agent consensus mistaken for proof | High | 4+ | Gate rules say reviewer/agent votes are advisory only. |
| Workstream patch pollutes trusted graph | High | 7+ | `GraphPatch` review state; no auto-apply. |
| Arbitrary shell execution from workstream | High | 10 | Runner sandbox, deny-by-default commands, timeout/memory limits. |
| Working paper hides conjectural status | High | 12 | Paper checker fails on claim status/wording mismatch. |
| Literature support from LLM memory | High | 11 | Exact citation artifacts and condition matching required. |
| Context overflow across long goal runs | Medium | all | Keep handoff docs, TODO/REVIEW, progress logs, and phase stop rules. |
| Overlarge phases cause partial unreviewed implementation | Medium | all | Use phase goals, allowed edit scopes, validation, and stop conditions. |
| High concurrency creates write conflicts | High | all | Current global budget is `rpm=4`; keep subagents bounded and use strict disjoint write scopes plus parent-coordinator merge review. |
| Parallelism before mutation gateway pollutes core state | High | 1-7 | Keep early/middle parallelism read-only or disjoint; wait until Phase 8 for broad subagent workstream fan-out. |

## Current Risk Posture

After Phase 22:

- Runtime safety risks are active code-path risks, so validation must run against `comathd` routes, Pi descriptors, and proof-kernel replay artifacts rather than docs alone.
- TriviumDB native persistence, production Pi runtime registration, real child-agent scheduling, real MathProve execution, and generic runner re-execution remain intentionally deferred behind adapter/gate boundaries.
- The largest immediate risk is proof-scope overclaiming: Phase 18-22 cover bounded GA vertical slices, an ensemble recovery benchmark, canonical campaign-state flow, product read models, and a Pi loop, not arbitrary theorem proving.
- Phase 20 validates public campaign state semantics, not autonomous GA research completion.
- Phase 21 improves product inspection through read-only claim/evidence/gate routes; it does not alter proof authority or promotion rules.
- Phase 22 improves the user-facing Pi entry path; it does not validate installed Pi API registration or replace a real scheduler.
- Subagent concurrency is intentionally small (`rpm=4`); prefer local deterministic commands and reserve child agents for bounded review or disjoint work.
