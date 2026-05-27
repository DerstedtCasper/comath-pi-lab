# Risk Register

| Risk | Severity | Phase | Mitigation |
| --- | --- | --- | --- |
| Pi API drift between ecosystem docs and official docs | High | 6 | Revalidate against installed Pi; treat ecosystem docs as taxonomy only. |
| Pi packages/extensions have broad system access | High | 6+ | Audit third-party package source; keep permission-gate pattern; no direct trusted DB writes. |
| TriviumDB native load failure on target platform | High | 5, 13 | Keep adapter interface and in-memory fallback; probe native import before enabling. |
| TriviumDB numeric IDs leak into business contracts | High | 1, 5, 13 | Stable string IDs only; internal `StableIdMap`. |
| Multiple processes open `.tdb` | Medium | 13 | Only `comathd` owns DB connection; document single-process ownership. |
| MathProve overtrusted as proof oracle | High | 4, 9 | Position as evidence producer/gate runner; final status requires durable artifacts and gate checks. |
| Phase 18-28 slices overclaimed as arbitrary theorem proving | High | 18+ | Document the implemented `Nat.add_zero`, `Nat.mul_zero`, refutation, runner-reexecution, MathProve evidence-runner, Pi runtime-registration, AgentRun boundary, and AgentRun scheduler slices; require registered theorem-family tests before broadening theorem classes. |
| Proof candidate voting mistaken for proof evidence | High | 18+ | Candidate selection filters hard vetoes and statement drift before scoring; `formally_checked` requires replay-bound artifacts. |
| V8 dialectical stress mistaken for proof evidence | High | 19+ | Persist `proof_authority: none`, require downstream Lean/exact-computation/citation gates, and test that ensemble recovery selects Lean-valid evidence rather than stress artifacts. |
| Internal proof-stage names mistaken for public campaign states | Medium | 20+ | Public `ResearchCampaign.current_stage` uses v3 canonical states; internal proof-kernel stages such as `lemma_sprint` stay confined to candidate/gate artifacts. |
| Bounded tick success mistaken for autonomous research completion | High | 20+ | Phase 20 validates public state semantics and blocks unsupported final replay targets; it does not validate generic proof planning or real agent scheduling. |
| Dashboard read model mistaken for proof authority | Medium | 21+ | Claim/evidence/gate list routes are read-only inspection surfaces; promotions still require gate-mediated evidence and proof-kernel replay where applicable. |
| Pi research loop mistaken for proof authority or full interactive runtime e2e | Medium | 22+ | Phase 22 verifies a thin-client orchestration helper with scoped capability checks; Phase 26 validates Pi 0.75.5 package/runtime registration, and Phase 28 validates service-side scheduled fixture processes, but full interactive Pi/comathd install-session e2e and production Pi/Codex child-agent profile integration remain separate blockers. |
| AgentRun report mistaken for trusted proof or graph authority | High | 27+ | Phase 27 persists AgentRuns and reports as scoped artifacts, rejects producer self-review of GraphPatch proposals, and records failed runs as `FailureRoute` memory without promoting claims. |
| Scheduled child process mistaken for proof authority | High | 28+ | Phase 28 launches allowlisted processes and captures logs/reports in non-authoritative envelopes with `proof_authority: none`, `supports_claim_status: none`, and `child_stdout_untrusted: true`; proof status still requires evidence gates, independent GraphPatch review, and proof-kernel replay. |
| Agent process escape or resource abuse | High | 28+ | Phase 28 uses `shell:false`, absolute-realpath allowlisted programs, minimal env inheritance, sensitive-env rejection, scoped cwd/log paths, byte-capped output, timeout, queued/running cancellation, process-tree termination attempts, and rpm/concurrency gates; OS-level sandboxing, network denial, live log streaming APIs, and multi-process locks remain deferred. |
| Theorem-family metadata drift binds the wrong proof to a claim | High | 23+ | Phase 23 requires family/proposition/Lean-target/locked-statement consistency and replay-manifest locked-hash binding before promotion. |
| Replay manifest descriptors mistaken for executable evidence | High | 24+ | Phase 24 strict replay reconstructs allowlisted runner commands from service code, stores canonical runner input, and fails closed on script/input/argv/result drift. |
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

After Phase 28:

- Runtime safety risks are active code-path risks, so validation must run against `comathd` routes, Pi descriptors, and proof-kernel replay artifacts rather than docs alone.
- TriviumDB native persistence, production Pi/Codex child-agent profile integration, broad MathProve proof search/final-audit semantics, full interactive Pi/comathd install-session e2e, and stronger OS/network runner sandboxing remain intentionally deferred behind adapter/gate boundaries.
- The largest immediate risk is proof-scope overclaiming: Phase 18-28 cover bounded GA vertical slices, two registered elementary Nat theorem families, an exact refutation path, an ensemble recovery benchmark, canonical campaign-state flow, product read models, a Pi loop, deterministic compute-runner replay, controlled external MathProve evidence production, Pi runtime registration, AgentRun boundary contracts, and allowlisted AgentRun process scheduling, not arbitrary theorem proving.
- Phase 20 validates public campaign state semantics, not autonomous GA research completion.
- Phase 21 improves product inspection through read-only claim/evidence/gate routes; it does not alter proof authority or promotion rules.
- Phase 22 improves the user-facing Pi entry path; Phase 26 validates package/runtime registration against installed Pi 0.75.5 loader behavior but does not replace a real scheduler or full interactive install-session e2e.
- Phase 23 improves registered theorem-family replay; it does not implement broad theorem synthesis, semantic Lean parsing, or real MathProve proof search.
- Phase 24 improves deterministic runner replay; it does not provide OS-level sandboxing, network-denial enforcement, dependency lock capture, or cross-machine replay validation.
- Phase 25 improves external MathProve evidence production; it does not grant MathProve proof-authority status.
- Phase 26 improves Pi runtime integration; it does not make Pi a mathematical authority or validate every interactive UX path.
- Phase 27 improves child-agent auditability and write confinement; it does not launch, schedule, or rate-limit real child-agent processes.
- Phase 28 adds real allowlisted child-process launch, logging, timeout/cancel, concurrency, and rpm controls; it does not provide OS-level sandboxing, production Pi/Codex agent profile integration, or multi-process writer locks.
- Subagent concurrency is intentionally small (`rpm=4`); prefer local deterministic commands and reserve child agents for bounded review or disjoint work.
