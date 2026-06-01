# CoMath Pi Lab

CoMath is an open-source agentic formal mathematics workbench built around Lean4/mathlib. It does not implement its own theorem prover or mathematical kernel. It orchestrates external proof, search, retrieval, computation, and agent tools, and promotes a mathematical claim only after a clean Lean replay and integrity audit pass.

The current repository is a Goal 3 GA-refactor worktree with Research Alpha foundations, a Goal 3 trust-core implementation, and a representative GA acceptance harness. It is not final global GA until the final Task 20 audit closes the remaining release blockers. In public wording, describe it as an auditable formal mathematics research workbench with strict Lean-authority gates, not as an arbitrary theorem prover.

## What CoMath Owns

- Pi interaction surfaces for `/cm:research`, `/cm:campaign`, `/cm:agent`, and `/cm:release` commands.
- `comathd`, the trusted local mutation boundary for runtime state, artifacts, audit logs, campaign state, and promotion decisions.
- FormalSpecLock, AssumptionLedger, StatementDiffGate, statement-drift red-team reports, and no-cheat gates that preserve theorem boundaries.
- External wheel registry contracts for theorem search, proof-search backends, literature retrieval, ingestion, and computation adapters.
- Lean Authority v3 evidence shapes: service-owned Lean run manifests, dependency locks, final replay manifests, structured audit material, and third-party replay packs whose embedded `FinalReplayManifest.json` and `expected_hashes.json` bind exactly to the project-local final replay evidence.
- A native MathProve-style stage machine and 1 coordinator plus 8 specialist agent workflow where agent outputs remain untrusted proposals.
- Pi goal-mode routing that can end only in formal replay passed, confirmed counterexample, user-visible statement disambiguation, replayable blocker, or resumable budget exhaustion.

## What CoMath Does Not Own

- CoMath does not verify theorem truth independently of Lean.
- CoMath does not replace Lean, mathlib, Lake, or maintained external Lean projects.
- CoMath does not maintain a proprietary theorem library or business-layer theorem prover.
- CoMath does not use theorem-family recognizers, Nat-linear synthesis, or default `n : Nat` injection as a production proof path.
- CoMath does not let agent votes, reviewer approval, papers, CAS/SAT/SMT reports, search results, or MathProve-style audits certify proofs.
- CoMath does not redistribute full third-party papers or external repositories in evidence packs unless license and user consent permit it.

## Current Product State

Goal 3 removed the old toy/Nat-only production path and replaced the trusted path with fail-closed formal-spec, statement-boundary, Lean-run, dependency, integrity, agent-workflow, adapter, Pi goal-mode, and acceptance-harness surfaces. Older Phase 18-81 material remains useful as historical vertical-slice evidence or negative fixtures, but it must not be described as the current production proof path.

Implemented Goal 3 trust-core evidence includes:

- `goal3-task2-no-toy-production-path.test.mjs` and `goal4-p0-no-reinvent-violations.test.mjs` for no-reinvent quarantine.
- FormalSpecLock and AssumptionLedger schema and intake tests.
- StatementDiffGate and statement-drift red-team tests.
- LeanRunManifest v3, final replay, dependency closure, integrity scanner, axiom profile, and no-cheat tests.
- Artifact-backed Lean evidence gates for live adapter replay claims and non-exact statement-equivalence replay claims.
- External wheel registry tests for proof-authority-none adapter outputs.
- Native MathProve-style stage-machine and GA agent-stage workflow tests.
- Pi goal-mode route and extension tests.
- Goal 3 GA negative and representative positive proof-workflow harnesses.

Task 17's positive matrix is a harness with representative seeds and a replayable blocker for the unexecuted 100-task breadth. Task96 hardens batch consumers so representative fixture or aggregate harness evidence is not displayed as per-task clean replay. Task97 hardens the promotion gate so legacy final replay manifests cannot substitute for Lean Authority v3 final replay packaging. Task98 also blocks legacy PM-002 v1 final-authority packaging reports from satisfying `formally_checked`; only generic Lean Authority v3 packaging is promotion-grade. Task99 requires promotion-grade FinalReplayManifest v3 evidence to bind Lean/Lake executable binary hashes to a passing final-replay LeanRunManifest. Task100 prevents campaign/Pi proof-success read models and goal export readiness from treating legacy `completed_formal_proof` as proof success unless an explicit `formal_replay_authority_evidence` envelope is present. Task111-112 require live adapter and non-exact statement-equivalence replay claims to cite verified service-owned Lean replay manifests rather than marker strings. Do not claim that all 100 positive proof tasks have been clean-replayed.

## Runtime Baseline

- Node.js: `>=22.19.0`
- Package manager: `pnpm@11.3.0` via Corepack
- Runtime state: `.comath/`, ignored by Git and owned by `comathd`

Local validation:

```text
corepack pnpm install
corepack pnpm build
corepack pnpm typecheck
corepack pnpm test
```

Focused package validation:

```text
corepack pnpm --filter @comath/comathd build
corepack pnpm --filter @comath/comathd typecheck
corepack pnpm --filter @comath/comathd test
corepack pnpm --filter @comath/pi-extension build
corepack pnpm --filter @comath/pi-extension typecheck
corepack pnpm --filter @comath/pi-extension test
```

## Product Entrypoints

Use `comathd` as the trusted runtime owner and the Pi package as the interaction layer:

- Start or open projects through service-owned routes.
- Submit research goals through Pi `/cm:research` goal mode or equivalent service APIs.
- Inspect claims, evidence, gates, campaigns, agent runs, blockers, and exports through read-model routes and Pi tools.
- Export evidence packs only after all promotion gates and replay manifests agree.

Pi remains a thin client. It must not write `.comath/`, mutate trusted proof state, promote claims, or treat UI state as mathematical evidence.

## Proof Authority

The only final mathematical proof authority is clean Lean4/mathlib kernel replay. A promoted proof artifact must bind all of the following:

- FormalSpecLock and AssumptionLedger hashes.
- Locked theorem statement and theorem-header hash.
- DependencyLock with pinned Lean/Lake/mathlib/external repository material.
- Toolchain and artifact hashes.
- Service-owned LeanRunManifest records.
- Structured no-cheat, dependency, axiom, and statement checks.
- FinalReplayManifest and third-party replay command.

Artifacts without clean replay remain `draft`, `hypothesis`, `candidate`, `blocked_with_replayable_certificate`, or equivalent non-promotional states.

## Release Hardening Docs

Public release material uses three separate archive contracts. A source-review public diagnostic archive is non-authoritative (`proof_authority: none`) and may include sanitized source, markdown, HTML, and JSON reports for review, but `public_archive_is_proof_authority=false`; it cannot replace FinalAuthorityPackagingV3 / Lean Authority v3 source-report evidence. A default snapshot export is a sanitized `public_download` with `can_restore=false`, is not a restore source, and is rejected by restore with `SNAPSHOT_PUBLIC_DOWNLOAD_NOT_RESTORABLE`. Only an explicit `internal_restore` snapshot is a byte-for-byte runtime-fidelity restore source, and it is not a public distribution artifact. Pi `/cm:release` and release tools expose source-review assembly and public archive review through `comathd` with host confirmation; they do not write `.comath/` directly or turn public diagnostics into proof authority.

- [GA Release Criteria](docs/architecture/ga-release-criteria.md)
- [Threat Model](docs/architecture/threat-model.md)
- [Adapter Contracts](docs/architecture/adapter-contracts.md)
- [External Lean Supply Chain](docs/architecture/external-lean-supply-chain.md)
- [Evidence Pack Policy](docs/architecture/evidence-pack-policy.md)
- [Example Campaigns](docs/examples/README.md)
- [Config Samples](config/README.md)

Canonical project documents:

- [Development Plan](COMATH_PI_LAB_DEV_PLAN.md)
- [Goal Runbook](CODEX_GOAL_RUNBOOK.md)
- [Agent Instructions](AGENTS.md)
- [TODO](TODO.md)
- [Review Log](REVIEW.md)
- [Security Review](SECURITY_REVIEW.md)
- [Mathematical Integrity Review](MATH_INTEGRITY_REVIEW.md)
