# Risk Register

| Risk | Severity | Phase | Mitigation |
| --- | --- | --- | --- |
| Pi API drift between ecosystem docs and official docs | High | 6 | Revalidate against installed Pi; treat ecosystem docs as taxonomy only. |
| Pi packages/extensions have broad system access | High | 6+ | Audit third-party package source; keep permission-gate pattern; no direct trusted DB writes. |
| TriviumDB native load failure on target platform | High | 5, 13 | Keep adapter interface and in-memory fallback; probe native import before enabling. |
| TriviumDB numeric IDs leak into business contracts | High | 1, 5, 13 | Stable string IDs only; internal `StableIdMap`. |
| Multiple processes open `.tdb` | Medium | 13 | Only `comathd` owns DB connection; document single-process ownership. |
| MathProve overtrusted as proof oracle | High | 4, 9 | Position as evidence producer/gate runner; final status requires durable artifacts and gate checks. |
| Phase 18-68 slices overclaimed as arbitrary theorem proving | High | 18+ | Document the implemented `Nat.add_zero`, `Nat.mul_zero`, `Nat.zero_add`, refutation, runner-reexecution, MathProve evidence-runner, Pi runtime-registration, AgentRun boundary, scheduler/profile/adapter slices, conservative Lean statement-binding extensions, optional TriviumDB evaluation, positive v3 campaign slice, and negative GA release slices; require registered theorem-family tests before broadening theorem classes. |
| Proof candidate voting mistaken for proof evidence | High | 18+ | Candidate selection filters hard vetoes and statement drift before scoring; `formally_checked` requires replay-bound artifacts. |
| V8 dialectical stress mistaken for proof evidence | High | 19+ | Persist `proof_authority: none`, require downstream Lean/exact-computation/citation gates, and test that ensemble recovery selects Lean-valid evidence rather than stress artifacts. |
| Internal proof-stage names mistaken for public campaign states | Medium | 20+ | Public `ResearchCampaign.current_stage` uses v3 canonical states; internal proof-kernel stages such as `lemma_sprint` stay confined to candidate/gate artifacts. |
| Bounded tick success mistaken for autonomous research completion | High | 20+ | Phase 20 validates public state semantics and blocks unsupported final replay targets; it does not validate generic proof planning or real agent scheduling. |
| Dashboard read model mistaken for proof authority | Medium | 21+ | Claim/evidence/gate list routes are read-only inspection surfaces; promotions still require gate-mediated evidence and proof-kernel replay where applicable. |
| Pi research loop mistaken for proof authority or durable real-host lifecycle management | Medium | 22+ | Phase 22 verifies a thin-client orchestration helper with scoped capability checks; Phase 26 validates Pi 0.75.5 package/runtime registration; Phase 45 validates an automated local Pi/comathd install-session e2e over real HTTP; Phase 41-53 add bounded agent/Codex adapter surfaces. Richer real-host Pi UX, manual install walkthrough, durable service lifecycle management, production account/network validation, and OS isolation remain separate blockers. |
| AgentRun report mistaken for trusted proof or graph authority | High | 27+ | Phase 27 persists AgentRuns and reports as scoped artifacts, rejects producer self-review of GraphPatch proposals, and records failed runs as `FailureRoute` memory without promoting claims. |
| Scheduled child process mistaken for proof authority | High | 28+ | Phase 28 launches allowlisted processes and captures logs/reports in non-authoritative envelopes with `proof_authority: none`, `supports_claim_status: none`, and `child_stdout_untrusted: true`; proof status still requires evidence gates, independent GraphPatch review, and proof-kernel replay. |
| Agent process escape or resource abuse | High | 28+ | Phase 28 uses `shell:false`, absolute-realpath allowlisted programs, minimal env inheritance, sensitive-env rejection, scoped cwd/log paths, byte-capped output, timeout, queued/running cancellation, process-tree termination attempts, and rpm/concurrency gates; Phase 39-40 add writer locks; Phase 41-53 add bounded execution, observability, cancellation, package, external CLI, installed CLI, and Codex API slices. OS-level sandboxing, enforced network denial, indefinite operator sessions, and cross-process scheduler recovery remain deferred. |
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
| Documentation overclaims Goal 3 readiness | High | 19+ | README, GA release criteria, examples, and smoke checks must state that Task 17 positive breadth is representative unless every task is clean-replayed; Task 20 is the final GA audit. |
| Literature/RAG prompt injection changes proof boundary | High | 19+ | Treat document text as quoted data, require prompt-injection scans, source anchors, content hashes, and `proof_authority=none` adapter records. |
| Evidence packs leak copyright, terms-restricted content, secrets, or host paths | High | 19+ | Evidence-pack policy requires terms notes, excerpt policy, hashes, local-reference handling, secret scans, and host-path scrubbing before public export. |
| External Lean supply chain drifts after proof claim | High | 19+ | External repos must move through `planning_reference -> candidate_dependency -> approved_dependency -> trusted_replay_dependency` with pinned commits, manifests, source hashes, licenses, and network-disabled final replay. |
| Agent prompt edits weaken proof-authority invariants | High | 19+ | `.pi/agents` and `.pi/prompts` must retain `proof_authority=none`, `may_mutate_trusted_state=false`, locked statement hash preservation, strict JSON/schema output, blocker reporting, and no vote/literature/CAS proof authority. |

## Current Risk Posture

After Goal 3 Task 19:

- Runtime safety risks are active code-path risks, so validation must run against `comathd` routes, Pi descriptors, and proof-kernel replay artifacts rather than docs alone.
- TriviumDB production-default rollout, production Codex API account/network validation, broad MathProve proof search/final-audit authority, richer real-host Pi UX/service lifecycle management, and stronger OS/network runner sandboxing remain intentionally deferred behind adapter/gate boundaries.
- The largest immediate risk is proof-scope overclaiming: old Phase 18-81 Nat/theorem-family material is historical vertical-slice or negative-fixture material under Goal 3. Current release wording must describe FormalSpecLock, AssumptionLedger, StatementDiffGate, Lean Authority v3, dependency locks, no-cheat gates, external adapter contracts, and evidence-pack replay without claiming arbitrary theorem proving or global GA completion before Task 20.
- Phase 20 validates public campaign state semantics, not autonomous GA research completion.
- Phase 21 improves product inspection through read-only claim/evidence/gate routes; it does not alter proof authority or promotion rules.
- Phase 22 improves the user-facing Pi entry path; Phase 26 validates package/runtime registration against installed Pi 0.75.5 loader behavior; Phase 45 validates an automated local Pi/comathd install-session e2e. These do not replace richer real-host Pi UX, manual installation/lifecycle documentation, or durable service management.
- Phase 23 improves registered theorem-family replay; it does not implement broad theorem synthesis, semantic Lean parsing, or real MathProve proof search.
- Phase 24 improves deterministic runner replay; it does not provide OS-level sandboxing, network-denial enforcement, dependency lock capture, or cross-machine replay validation.
- Phase 25 improves external MathProve evidence production; it does not grant MathProve proof-authority status.
- Phase 26 improves Pi runtime integration; it does not make Pi a mathematical authority or validate every interactive UX path.
- Phase 27 improves child-agent auditability and write confinement; it does not launch, schedule, or rate-limit real child-agent processes.
- Phase 28 adds real allowlisted child-process launch, logging, timeout/cancel, concurrency, and rpm controls; Phase 39-40 add writer-lock integration; Phase 41-53 add bounded profile execution, adapter package, external CLI, installed CLI, and Codex API surfaces. These do not provide OS-level sandboxing, enforced network denial, live production account validation, indefinite operator sessions, or cross-process scheduler recovery.
- Subagent concurrency is intentionally small (`rpm=4`); prefer local deterministic commands and reserve child agents for bounded review or disjoint work.
