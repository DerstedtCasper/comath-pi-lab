# GA Release Criteria

This document is the Goal 3 public-release gate. It is stricter than historical Phase 18-81 vertical-slice readiness and must be read together with `docs/progress/goal-3-ga-gap-matrix.md` and `goal-3/tasks.md`.

## Release Positioning

Allowed wording:

```text
CoMath is an open-source agentic formal mathematics workbench built around Lean4/mathlib. It does not implement its own theorem prover or mathematical kernel. It orchestrates external proof, search, retrieval, computation, and agent tools, and promotes a mathematical claim only after a clean Lean replay and integrity audit pass.
```

Forbidden wording:

```text
CoMath proves arbitrary mathematics by itself.
CoMath verifies theorem truth independently of Lean.
CoMath replaces mathlib.
CoMath has a proprietary internal theorem library.
CoMath agents can certify proofs by vote.
CoMath uses CAS or papers as formal proof authority.
```

## Hard GA Blockers

Any one of these blocks a GA release:

- A production path imports a theorem-family recognizer, Nat-linear synthesizer, default `n : Nat` injection, synthetic V1 winner, or business-layer theorem verifier.
- A claim can reach `formally_checked` without a service-owned FinalReplayManifest whose result is `pass` and matching FinalAuthorityPackagingV3 source report / generic Lean Authority v3 packaging evidence.
- A proof claim lacks FormalSpecLock, AssumptionLedger, dependency lock, toolchain hash, artifact hash, LeanRunManifest, and final replay material.
- Candidate, literature, computation, agent vote, reviewer approval, or MathProve-style audit output can override Lean replay failure.
- Pi or an agent can write trusted `.comath/` proof state directly.
- Adapter OS-isolation readiness can be satisfied by caller-supplied request metadata, Pi payloads, operator attestations, contract-only metadata, or package launch metadata instead of service-owned collector evidence.
- Adapter OS-isolation sandbox-launch preflight manifests can be treated as proof of executed OS isolation, as readiness-review evidence, or as GA certification without a later service-owned collected execution probe.
- Adapter OS-isolation provider-runner contract manifests, fixed argv templates, service-owned unavailable blockers, or route payloads can be treated as executed OS isolation, readiness-review evidence, broad provider support, mathematical proof authority, or GA certification.
- Provider host capability probe manifests, default service-owned host capability probe diagnostics, Windows AppContainer host facility diagnostics, OCI container host facility diagnostics, Nix sandbox / Firejail / macOS `sandbox-exec` host facility diagnostics, discovered host tools, platform/kernel feature facts, bundled protocol asset metadata, probe exit status, diagnostics, or route payloads can be treated as provider-helper readiness, helper self-test/runtime-attestation evidence, executed OS isolation, collected OS-enforcement evidence, mathematical proof authority, real-Pi execution evidence, broad provider support, or GA certification.
- Provider-helper host validation can run without a matching service-owned observed provider host capability probe, or a host capability binding can be treated as readiness-review evidence, executed OS isolation, collected OS-enforcement evidence, proof authority, real-Pi execution evidence, broad provider support, or GA certification.
- Pi `/cm:release agent-adapter-os-isolation-provider-host-capability-probe` or `/cm:release agent-adapter-os-isolation-provider-helper-host-validation` payloads, tool outputs, host confirmation prompts, caller-supplied platform/notes, or success-shaped environment fields can be treated as provider-helper readiness, executed OS isolation, collected OS-enforcement evidence, direct `.comath/` writes, mathematical proof authority, real-Pi execution evidence, broad provider support, or GA certification.
- Configured provider-helper asset environment variables, including `COMATH_AGENT_ADAPTER_OSISO_OCI_HELPER`, `COMATH_AGENT_ADAPTER_OSISO_NIX_HELPER`, `COMATH_AGENT_ADAPTER_OSISO_FIREJAIL_HELPER`, `COMATH_AGENT_ADAPTER_OSISO_WINDOWS_APPCONTAINER_HELPER`, `COMATH_AGENT_ADAPTER_OSISO_MACOS_SANDBOX_EXEC_HELPER`, their `*_HELPER_ARGS_JSON` args-prefix handles, configured collection-probe handles such as `COMATH_AGENT_ADAPTER_OSISO_WINDOWS_APPCONTAINER_COLLECTION_PROBE` and `*_COLLECTION_PROBE_ARGS_JSON`, and fallback helper/collection-probe handles, can be treated as executed OS isolation, readiness-review evidence, broad provider support, mathematical proof authority, real-Pi execution, or GA certification merely because configuration exists.
- Bundled provider-helper protocol assets, packaged helper scripts, packaged args-prefixes, Node executable resolution, self-test/runtime-attestation hashes, or bundled helper execution/collection wrappers can be treated as production helper binaries, collected OS-enforcement evidence, readiness-review evidence by themselves, mathematical proof authority, real-Pi execution evidence, broad provider support, or GA certification.
- Adapter OS-isolation provider-helper host-validation manifests, helper-host-ready booleans, helper binary hashes, supported-platform lists, provider-helper self-test status/hashes, or route payloads can be treated as executed OS isolation, readiness-review evidence, broad provider support, mathematical proof authority, or GA certification.
- Adapter OS-isolation provider-helper execution manifests, missing/unvalidated/mismatched host-validation bindings, helper runtime-attestation status/hashes, helper args-prefix hash/count metadata, helper exit codes, stdout/stderr/transcript hashes, or route payloads can be treated as collected OS-enforcement evidence, readiness-review evidence, broad provider support, mathematical proof authority, or GA certification.
- Adapter OS-isolation provider-helper collection route payloads, caller-supplied collection booleans, caller-supplied stdout/stderr/transcript hashes, caller-supplied provider-tool witness hashes, helper executions without current runtime-attestation binding, configured collection probes without current provider host-capability and host-validation artifact binding, default route collection blockers, hash-bound service-owned collection probes with incomplete OS-enforcement facts, service-owned collection probes that lack a current provider-specific executed-tool witness binding, stale pre-Task203 collection artifacts, or wrapper manifests can be treated as collected OS-enforcement evidence without complete process/filesystem/network/no-new-privileges/escape-prevention checks, a provider-tool witness bound to service-derived collection-probe executable/profile/argv hashes and the current helper execution transcript, and a collected canonical Task170 probe/evidence artifact.
- Adapter OS-isolation sandbox-execution route payloads, caller-supplied execution booleans, process exit codes, or stdout/stderr/transcript hashes can be treated as collected OS-enforcement evidence without an internal service-owned execution probe callback and canonical probe/evidence artifact.
- Pi `/cm:release agent-adapter-os-isolation-sandbox-execution` payloads or tool outputs can be treated as collected OS-enforcement evidence, direct `.comath/` writes, production sandbox-runner evidence, or GA certification.
- Adapter OS-isolation sandbox-execution probe manifests are described as a production provider-specific sandbox runner, broad cross-platform OS-enforced execution support, mathematical proof authority, or GA certification.
- External Lean repositories can enter final replay without license, toolchain, commit, manifest, import, hash, and symlink checks.
- Literature or RAG evidence lacks provider, retrieval timestamp, content hash, terms note, prompt-injection scan, and citation anchors.
- Evidence packs cannot be replayed by a third party or do not distinguish omitted copyrighted material from included redistributable material.
- Public release/source-review archives blur the archive contract: source-review public diagnostic archives must stay non-authoritative (`proof_authority: none`), sanitized `public_download` snapshots must state `can_restore=false` and not a restore source, explicit `internal_restore` snapshots must be byte-for-byte runtime-fidelity restore sources only, and no public archive may substitute for FinalAuthorityPackagingV3 / Lean Authority v3 source-report evidence.

## Required Verification Before GA Tagging

Run at minimum:

```text
corepack pnpm build
corepack pnpm typecheck
corepack pnpm test
corepack pnpm --filter @comath/comathd build
corepack pnpm --filter @comath/comathd typecheck
corepack pnpm --filter @comath/comathd test
corepack pnpm --filter @comath/pi-extension build
corepack pnpm --filter @comath/pi-extension typecheck
corepack pnpm --filter @comath/pi-extension test
node scripts/phase0-smoke.mjs
```

Also run focused Goal 3 acceptance suites:

```text
node services/comathd/tests/unit/goal3-task2-no-toy-production-path.test.mjs
node services/comathd/tests/unit/goal3-task4-formal-spec-lock.test.mjs
node services/comathd/tests/unit/goal3-task5-statement-diff-gate.test.mjs
node services/comathd/tests/unit/goal3-task7-lean-run-manifest-v3.test.mjs
node services/comathd/tests/unit/goal3-task8-lean-authority-v3-final-replay.test.mjs
node services/comathd/tests/unit/goal3-task10-integrity-dependency-axiom-v2.test.mjs
node services/comathd/tests/unit/goal3-task11-external-wheel-registry.test.mjs
node services/comathd/tests/unit/goal3-task13-mathprove-native-stage-machine.test.mjs
node services/comathd/tests/unit/goal3-task14-ga-agent-stage-workflow.test.mjs
node services/comathd/tests/unit/goal3-task16-pi-goal-mode-routes.test.mjs
node services/comathd/tests/unit/goal3-task17-ga-acceptance-workflow.test.mjs
node extensions/comath-pi/tests/goal3-task16-pi-goal-mode.test.mjs
```

Also run focused release-hardening suites for the current adapter/Pi lifecycle boundary:

```text
node services/comathd/tests/unit/goal3-task167-agent-adapter-os-isolation-readiness.test.mjs
node services/comathd/tests/unit/goal3-task168-agent-adapter-os-isolation-probe.test.mjs
node services/comathd/tests/unit/goal3-task170-agent-adapter-os-isolation-host-collection.test.mjs
node services/comathd/tests/unit/goal3-task171-agent-adapter-os-isolation-sandbox-launch.test.mjs
node services/comathd/tests/unit/goal3-task172-agent-adapter-os-isolation-sandbox-execution.test.mjs
node extensions/comath-pi/tests/goal3-task173-pi-agent-adapter-os-isolation-sandbox-execution-consumer.test.mjs
node services/comathd/tests/unit/goal3-task175-agent-adapter-os-isolation-provider-runner.test.mjs
node services/comathd/tests/unit/goal3-task176-agent-adapter-os-isolation-provider-helper-execution.test.mjs
node services/comathd/tests/unit/goal3-task177-agent-adapter-os-isolation-provider-helper-collection.test.mjs
node services/comathd/tests/unit/goal3-task197-agent-adapter-os-isolation-provider-helper-collection-complete-enforcement-gate.test.mjs
node services/comathd/tests/unit/goal3-task198-agent-adapter-os-isolation-provider-helper-default-collection-probe.test.mjs
node services/comathd/tests/unit/goal3-task199-agent-adapter-os-isolation-configured-provider-helper-collection-probe.test.mjs
node services/comathd/tests/unit/goal3-task200-agent-adapter-os-isolation-configured-collection-host-capability-binding.test.mjs
node services/comathd/tests/unit/goal3-task201-agent-adapter-os-isolation-provider-helper-release-chain-check-debug.test.mjs
node services/comathd/tests/unit/goal3-task202-agent-adapter-os-isolation-bundled-provider-helper-collection-probe.test.mjs
node services/comathd/tests/unit/goal3-task203-agent-adapter-os-isolation-provider-tool-witness-gate.test.mjs
node services/comathd/tests/unit/goal3-task178-agent-adapter-os-isolation-provider-helper-host-validation.test.mjs
node services/comathd/tests/unit/goal3-task179-agent-adapter-os-isolation-provider-helper-execution-host-validation-binding.test.mjs
node services/comathd/tests/unit/goal3-task181-agent-adapter-os-isolation-configured-provider-helper-asset.test.mjs
node services/comathd/tests/unit/goal3-task182-agent-adapter-os-isolation-configured-helper-execution-collection.test.mjs
node services/comathd/tests/unit/goal3-task184-agent-adapter-os-isolation-cross-provider-helper-assets.test.mjs
node services/comathd/tests/unit/goal3-task185-agent-adapter-os-isolation-helper-self-test-contract.test.mjs
node services/comathd/tests/unit/goal3-task186-agent-adapter-os-isolation-self-test-binding.test.mjs
node services/comathd/tests/unit/goal3-task187-agent-adapter-os-isolation-helper-runtime-attestation.test.mjs
node services/comathd/tests/unit/goal3-task188-agent-adapter-os-isolation-bundled-helper-asset.test.mjs
node services/comathd/tests/unit/goal3-task189-agent-adapter-os-isolation-provider-helper-chain-check-debug.test.mjs
node services/comathd/tests/unit/goal3-task190-agent-adapter-os-isolation-provider-host-capability-probe-contract.test.mjs
node services/comathd/tests/unit/goal3-task191-agent-adapter-os-isolation-provider-host-capability-helper-validation-binding.test.mjs
node extensions/comath-pi/tests/goal3-task192-pi-provider-helper-host-capability-consumer.test.mjs
node services/comathd/tests/unit/goal3-task193-agent-adapter-os-isolation-default-provider-host-capability-probe.test.mjs
node services/comathd/tests/unit/goal3-task194-agent-adapter-os-isolation-windows-appcontainer-host-facility-probe.test.mjs
node services/comathd/tests/unit/goal3-task195-agent-adapter-os-isolation-oci-container-host-facility-probe.test.mjs
node services/comathd/tests/unit/goal3-task196-agent-adapter-os-isolation-remaining-provider-host-facility-probes.test.mjs
node services/comathd/tests/unit/phase43-agent-adapter-package.test.mjs
node services/comathd/tests/unit/phase44-codex-cli-external-invocation.test.mjs
```

## Release Evidence Checklist

Before a public GA announcement, attach evidence for:

- Requirement-by-requirement status against the 2026-05-29 no-reinvent audit and open formal workbench design.
- Static scans proving old toy/Nat production paths are absent from production source.
- Clean runtime state: no tracked `.comath`, `.tmp`, `dist`, `node_modules`, or host-path leakage.
- At least one replayable promoted proof artifact whose clean Lean replay can be reproduced from the evidence pack.
- Negative trust-core cases: fake stdout, agent pass logs, forbidden Lean constructs, statement drift, hidden assumptions, unpinned dependencies, network replay, symlink escape, CAS-only proof, literature-only proof, vote-only proof, and human-review-only proof.
- Explicit blocker list for any unexecuted breadth, including the 100-task positive matrix if not fully clean-replayed.

## Non-GA Labels

Use these labels when evidence is incomplete:

- `research-alpha`: workflow foundation with fail-closed gates.
- `vertical-slice`: executable path over bounded examples only.
- `ga-candidate`: all gates implemented, final review pending.
- `replayable-blocker`: a blocker certificate and resume path exist.
- `draft` or `candidate`: no final clean Lean replay.
