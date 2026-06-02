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

Public release material uses three separate archive contracts. A source-review public diagnostic archive is non-authoritative (`proof_authority: none`) and may include sanitized source, markdown, HTML, and JSON reports for review, but `public_archive_is_proof_authority=false`; it cannot replace FinalAuthorityPackagingV3 / Lean Authority v3 source-report evidence. Source-review public archives also write a project-relative tamper-evident notarization-policy sidecar that binds the public manifest and report hashes while explicitly recording OS immutable storage and external notarization as `not_configured`; this is policy evidence, not external notarization or proof authority. A default snapshot export is a sanitized `public_download` with `can_restore=false`, is not a restore source, and is rejected by restore with `SNAPSHOT_PUBLIC_DOWNLOAD_NOT_RESTORABLE`. Only an explicit `internal_restore` snapshot is a byte-for-byte runtime-fidelity restore source, and it is not a public distribution artifact. Pi `/cm:release` and release tools expose source-review assembly and public archive review through `comathd` with host confirmation; they do not write `.comath/` directly or turn public diagnostics into proof authority.

Pi/Codex lifecycle release evidence now has service-owned non-authoritative producers for artifact-backed lifecycle intake, durable `comathd` service lifecycle probes, production Codex API account/network validation probes, real-Pi install/runtime-registration probe artifacts, durable operator-session manifests, operator transport recovery checkpoint artifacts, bounded operator transport lease artifacts, guided real-Pi execution evidence chains, adapter OS-isolation sandbox-launch preflight manifests, provider-runner contract manifests, provider-helper host-validation manifests, host-validation-bound provider-helper execution attempt manifests, provider-helper OS-isolation collection bridge manifests, adapter OS-isolation sandbox-execution probe manifests, adapter OS-isolation probe artifacts, configured-host OS-isolation collection contracts, and adapter OS-isolation readiness reviews. Pi release tooling covers the lifecycle review, Codex API probe, real-Pi runtime probe, read-only lifecycle walkthrough, bounded `lifecycle-control` operator actions, read-only `lifecycle-session` recovery planning, host-confirmed `lifecycle-operator-session` service persistence, host-confirmed operator transport recovery checkpointing, host-confirmed bounded operator transport lease opening, host-confirmed guided real-Pi execution recording, host-confirmed adapter OS-isolation probe recording, and host-confirmed adapter OS-isolation sandbox execution probe recording through `comathd`. Guided execution records also bind the real-Pi runtime snapshot host label to the operator-session host label and reject contradictory explicit Pi host labels. Adapter package launch metadata now explicitly records that GA requires OS-enforced isolation and that the current package launcher boundary is still `process_boundary_only` unless a service-owned OS-isolation probe artifact passes review. The OS-isolation sandbox-launch route records provider-specific preflight manifests only; it rejects caller-supplied command overrides or success metadata as proof of sandbox execution. The provider-runner route binds a ready preflight to fixed provider argv/environment policy and records an unavailable blocker when no service-owned runner helper is configured; caller command, argv, env, hashes, or success-shaped metadata cannot resolve the runner. The provider-helper host-validation route binds a ready provider-runner manifest to a service-owned helper-host validator, verifies helper binary hash and supported platform metadata, and rejects caller-supplied host-ready booleans, command/argv/env/hash/version metadata; host validation is still not executed OS isolation or readiness evidence. The provider-helper execution route now requires a prior append-only service-owned host-validation manifest that is validated and exactly bound to the same project, adapter, backend, provider, launch artifact, runner artifact, runner binary hash, and helper binary hash before any helper config resolver or helper process can run; when that binding passes, it launches the service-owned helper with `shell=false` and fixed argv/env and records only the host-validation artifact hash plus exit status and stdout/stderr/transcript hashes. Missing, unvalidated, or mismatched host-validation artifacts and caller-supplied helper success metadata fail closed; helper exit 0 is still not collected OS-enforcement evidence or readiness evidence. The provider-helper collection route binds a ready helper execution back to its runner and launch artifacts, rejects caller-supplied collection metadata, and can write canonical Task170 probe/evidence artifacts only through an internal service-owned collection callback whose exit/stdout/stderr/transcript hashes exactly match the helper execution manifest. The OS-isolation sandbox-execution route bridges a ready preflight to an internal service-owned execution probe, but route and Pi callers still cannot submit success-shaped execution metadata as collected evidence. The OS-isolation probe route and Pi consumers record blocker evidence by default; caller-supplied request metadata cannot satisfy the readiness review, and collected OS-enforcement evidence can be recorded only through a service-owned collector inside `comathd`. These reports, manifests, checkpoints, leases, guided execution records, walkthroughs, controls, recovery plans, preflight manifests, provider-runner manifests, provider-helper host validations, host-validation-bound provider-helper execution attempts, provider-helper collection bridge manifests, execution-probe manifests, probe artifacts, collection records, consumer outputs, and readiness reviews can feed or guide release gates, but they cannot promote claims, certify GA, expose API secrets, claim durable long-lived transport, claim indefinite WebSocket/SSE transport, replace an operator-controlled real Pi host run, or by themselves provide a general-purpose OS sandbox for adapter execution.

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
