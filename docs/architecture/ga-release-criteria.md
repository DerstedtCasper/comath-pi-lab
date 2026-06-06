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
- Adapter OS-isolation provider-helper collection route payloads, caller-supplied collection booleans, caller-supplied stdout/stderr/transcript hashes, caller-supplied provider-tool witness hashes, helper executions without current runtime-attestation binding, configured collection probes without current provider host-capability and host-validation artifact binding, default route collection blockers, hash-bound service-owned collection probes with incomplete OS-enforcement facts, service-owned collection probes that lack a current provider-specific executed-tool witness binding, provider-specific host-capability tool binding, provider-family OS-enforcement witness, provider-family execution profile binding, provider-specific live probe attempt binding, provider-specific live probe execution binding, provider-specific live probe collection binding back to the service-executed live probe transcript, or provider control-plane execution witness binding, stale pre-Task203/pre-Task204/pre-Task205/pre-Task206/pre-Task207/pre-Task208/pre-Task209/pre-Task210 collection artifacts, current host-capability artifact drift, or wrapper manifests can be treated as collected OS-enforcement evidence without complete process/filesystem/network/no-new-privileges/escape-prevention checks, a provider-tool witness bound to service-derived collection-probe executable/profile/argv hashes, the current helper execution transcript, the current host-capability provider tool name/hash, a `provider_family_os_enforcement_witness` bound to those facts, a provider-family execution profile hash binding, provider-specific live probe attempt/execution bindings, collection-side live-probe execution binding, provider control-plane execution witness binding, and a collected canonical Task170 probe/evidence artifact.
- Task204 keeps provider-specific tool binding under release-hardening coverage: complete provider-helper collection evidence must bind the provider-tool witness to the current host-capability provider tool name/hash.
- Task205 keeps provider-family OS-enforcement witness binding under release-hardening coverage: complete provider-helper collection evidence must carry `provider_family_os_enforcement_witness` material bound to the current provider family, host-capability/tool bindings, helper transcript, and complete OS-enforcement facts.
- Task206 keeps provider-family execution profile binding under release-hardening coverage: complete provider-helper collection evidence must also carry service-derived `provider_family_execution_profile` material binding the provider-family execution kind, profile hash, and argv hash. This is provenance metadata only and remains non-authoritative, non-release-grade, and non-shipping.
- Task207 keeps provider-specific live probe attempt binding under release-hardening coverage: complete provider-helper collection evidence must also carry `provider_specific_live_probe_attempt` material bound to the current provider-family execution profile, provider tool hashes, helper transcript, complete OS facts, disabled network policy, and non-authority boundary.
- Task208 keeps provider-specific live probe execution binding under release-hardening coverage: complete provider-helper collection evidence must also carry `provider_specific_live_probe_execution` material from a separately configured service-owned live OS probe subprocess, bound to the current provider-family execution profile, provider tool hashes, helper transcript, live probe tool/argv/stdout/stderr/transcript hashes, disabled network policy, and non-authority boundary.
- Task209 keeps provider-specific live probe collection binding under release-hardening coverage: configured collection-probe stdout must bind the same service-executed `provider_specific_live_probe_execution` id/hash/tool/argv/stdout/stderr/transcript material before complete provider-helper collection facts can satisfy readiness.
- Task210 keeps provider control-plane execution witness binding under release-hardening coverage: complete provider-helper collection evidence must also carry `provider_control_plane_execution_witness` material bound to the current provider family execution profile, provider tool hashes, helper transcript, provider-specific live probe execution id/hash/tool/argv/stdout/stderr/transcript hashes, disabled network policy, and non-authority boundary.
- Task211 keeps the Task202-210 provider-helper witness chain under check-debug coverage: release-hardening suites, public wording, route sanitization, config flags, blocker/veto wiring, and Task202-210 suite discovery must stay synchronized without turning witness metadata into proof authority, real-Pi evidence, broad provider support, production helper shipment, daemon/policy inspection, OS-enforcement proof, or GA certification.
- Task212 keeps a Windows AppContainer production-helper profile contract under release-hardening coverage: env-configured Windows AppContainer helpers must be distinguishable from bundled provider-helper protocol assets through non-secret manifest profile-source fields, while neither profile source can certify GA, become proof authority, or satisfy readiness without the existing helper witness chain and canonical service-owned evidence.
- Task222 keeps an OCI/Docker/Podman production-helper profile contract under release-hardening coverage: OCI helper manifests must carry a service-derived `production_helper_profile_contract` binding helper profile source, helper executable hash, Docker/Podman facility family, disabled network policy, no-new-privileges requirement, path-free host-facility tool names, and non-authority flags. The focused suite `goal3-task222-agent-adapter-os-isolation-oci-production-helper-profile-contract.test.mjs` must keep this lineage distinct from container launch, daemon/socket/container inspection, OS-enforcement proof, readiness, Lean authority, real-Pi evidence, and GA certification.
- Task232 keeps a Nix sandbox production-helper profile contract under release-hardening coverage: Nix helper manifests must carry a service-derived `production_helper_profile_contract` binding helper profile source, helper executable hash, Nix sandbox facility family, disabled network policy, no-new-privileges requirement, path-free host-facility tool names, and non-authority flags. The focused suite `goal3-task232-agent-adapter-os-isolation-nix-production-helper-profile-contract.test.mjs` must keep this lineage distinct from Nix command execution, store/profile inspection, OS-enforcement proof, readiness, Lean authority, real-Pi evidence, broad provider support, and GA certification.
- Task213 keeps campaign-native live Mathlib replay breadth evidence separate from historical toy smoke replay: final replay requests that opt into `campaign_live_mathlib_non_toy` must use campaign scope, `primary_dependency: "Mathlib"`, a theorem source importing Mathlib, and non-toy statement/proof material. `True`, default `n : Nat`, `by trivial`, `by omega`, and positive-matrix release paths fail closed before final replay workspace allocation.
- Task214 keeps campaign-native live Mathlib dependency material explicit before final replay: the same opt-in profile must carry a Mathlib `require` in `lakefile.lean`, a `lake-manifest.json` mathlib package pinned to an immutable commit SHA, a trusted mathlib4 source URL, a recorded non-unknown license, and no local `Mathlib` module shadowing before final replay workspace allocation.
- Task215 keeps final replay dependency evidence on the V2 closure path: the stable `dependency_closure.json` artifact written by final clean replay must carry `comath.dependency_closure.v2` content, and FinalReplayManifest v3 dependency locks must bind any V2 package revision material.
- Task216 keeps campaign-native Mathlib provisioning explicit before final replay: the same opt-in profile must have locally materialized `.lake/packages/mathlib` source material with package hashes and no package-internal symlinks before final replay workspace allocation, and those provisioning diagnostics remain non-authoritative. Final clean replay may copy pinned materialized Mathlib package sources into its clean workspace, but provisioning metadata cannot promote a claim or substitute for a passing network-disabled Lean clean replay.
- Task217 keeps FinalReplayManifest v3 dependency locks consistent at verification time: manifest verification must keep the `lean-toolchain`, `lakefile.lean`, and `lake-manifest.json` dependency-lock paths fixed to the clean workspace, recompute their hashes, bind `lean_toolchain` text to the clean `lean-toolchain` file, and, when the dependency report is `DependencyClosureV2`, match `dependency_lock.external_revisions` against the V2 package material before accepting the manifest.
- Task218 keeps host replay availability visible before final replay allocation: the same opt-in profile must write a non-authoritative `mathlib_host_replay_diagnostic.json` with service-owned Lean/Lake version probes, expected toolchain match, binary hashes, replay plan, provisioning-diagnostic hash, safe replay arguments, and lakefile-declared build targets before allocating `.comath/lean/final_replay`. Missing Lean/Lake, failed probes, toolchain mismatch, unsafe replay arguments, or undeclared build targets fail closed as replayable blockers; the diagnostic is not proof authority and cannot promote a claim.
- Task219 keeps Lean/Lake import-graph evidence visible before final replay allocation: the same opt-in profile must write a non-authoritative `mathlib_import_graph_diagnostic.json` with service-owned `lake env lean --deps` theorem/audit probes, command argv, exit codes, stdout/stderr/output hashes, host-diagnostic hash, and deps-stdout-only coarse Mathlib presence before allocating `.comath/lean/final_replay`. Failed probes, empty deps stdout, stderr-only dependency mentions, option-shaped theorem/audit file args, or missing primary-dependency evidence fail closed as replayable blockers; the diagnostic is not proof authority and cannot promote a claim.
- Task220 keeps bounded Pi/operator transport leases bound to a service-owned `AgentRun` log-session before lease persistence or guided real-Pi execution consumption. Arbitrary, expired, stale, missing, wrong-project, wrong-recovery, or tampered log-session routes/bindings fail closed; the binding records only route/run/cursor/event-count/body-hash provenance with `proof_authority=none` and still does not provide durable long-lived WebSocket/SSE transport or GA certification.
- Task221 keeps bounded Pi/operator transport heartbeats as append-only lease rebind checkpoints: heartbeat/rebind must read an unexpired Task220-bound lease, re-run the service-owned `AgentRun` log-session formatter, write only a new heartbeat artifact, and leave session/recovery/lease artifacts unchanged. Static tampering, expired, wrong-project, stale-client, wrong-chain, non-monotonic live-log, or unreadable leases fail closed; same-route/same-run live log growth is accepted only as bounded rebind provenance. Pi consumers sanitize proof/secret/host-path/long-lived-transport wording and use the service route with host confirmation. Heartbeats do not extend into a CoMath-owned transport stack, durable long-lived WebSocket/SSE, proof authority, or GA certification.
- Task223 keeps the interactive real-Pi checkpoint UX read-only: `comath.release.piCodexLifecycleInteractiveRealPi` and `/cm:release lifecycle-interactive-real-pi` must render sanitized next-action plans over existing host-confirmed lifecycle commands, never call `comathd`, never write `.comath`, never echo caller-supplied trusted runtime paths or path-shaped IDs, never auto-execute lifecycle actions, and never claim proof authority, durable long-lived transport, or GA certification. The focused suite `goal3-task223-pi-interactive-real-pi-checkpoint-ux.test.mjs` must remain in the release-hardening matrix.
- Task224 keeps guided real-Pi terminal evidence service-owned: `reviewPiCodexLifecycleTerminalExecution()` and `POST /release/pi-codex-lifecycle/terminal-execution-review` must bind runtime probe, operator-session manifest, recovery checkpoint, bounded lease, heartbeat/rebind, and guided execution artifact paths/hashes into a single append-only review before release review can consume the workflow chain. Missing heartbeat, poisoned heartbeat, stale hashes, path/id mismatch, secrets, proof-success wording, or long-lived transport wording must fail closed or be sanitized. The focused suite `goal3-task224-pi-guided-execution-terminal-chain-review.test.mjs` must remain in the release-hardening matrix.
- Task225 keeps operator/service transport provenance bound to maintained primitives: `recordPiCodexLifecycleOperatorServiceTransportContract()` and `POST /release/pi-codex-lifecycle/operator-service-transport-contract` must consume a Task224 terminal review, verify the current Task221 heartbeat hash, bind only the existing Node HTTP `GET /agent/run/<run_id>/log-session` route and Pi `fetch`/`getText` client primitive, and re-run bounded `formatAgentRunLogSseSession()` before writing append-only contract evidence. Stale heartbeat hashes, missing reviews, secrets, proof-success wording, or long-lived transport claims must fail closed or be sanitized. The focused suite `goal3-task225-pi-operator-service-transport-contract.test.mjs` must remain in the release-hardening matrix.
- Task226 keeps the Pi consumer for Task225 host-confirmed and non-authoritative: `comath.release.piCodexLifecycleOperatorServiceTransportContract` and `/cm:release lifecycle-operator-service-transport-contract` must call only `POST /release/pi-codex-lifecycle/operator-service-transport-contract` through host confirmation, must not forward model-supplied `confirmation_id`, must sanitize actor/path/result surfaces, and must force proof/GA/durable/live/direct-Pi-write/direct-trusted-state authority flags false. The interactive real-Pi planner may show the contract checkpoint, but it must not auto-execute it. The focused suite `goal3-task226-pi-operator-service-transport-contract-consumer.test.mjs` must remain in the release-hardening matrix.
- Task227 keeps automatic real-Pi execution orchestration service-owned and checkpoint-bound: `orchestratePiCodexLifecycleAutomaticRealPiExecution()` and `POST /release/pi-codex-lifecycle/automatic-real-pi-execution` must compose only the existing runtime probe, operator session, recovery, bounded lease, heartbeat/rebind, guided execution, terminal review, and operator/service transport contract producers. The orchestration manifest must bind every checkpoint id/path/hash, reject non-service-owned operator routes before persistence, and force proof/GA/durable/live/direct-Pi-write/direct-trusted-state authority flags false. The focused suite `goal3-task227-pi-automatic-real-pi-execution-orchestration.test.mjs` must remain in the release-hardening matrix.
- Task228 keeps the Pi consumer for Task227 host-confirmed and non-authoritative: `comath.release.piCodexLifecycleAutomaticRealPiExecution` and `/cm:release lifecycle-automatic-real-pi-execution` must call only `POST /release/pi-codex-lifecycle/automatic-real-pi-execution` through host confirmation, must not forward model-supplied `confirmation_id`, must sanitize nested checkpoint request/result surfaces, and must force proof/GA/durable/live/direct-Pi-write/direct-trusted-state authority flags false. The interactive real-Pi planner may show the automatic orchestration checkpoint, but it must not call `comathd` or auto-execute it. The focused suite `goal3-task228-pi-automatic-real-pi-execution-consumer.test.mjs` must remain in the release-hardening matrix.
- Task229 keeps operator/service transport continuity bound to maintained primitives: `recordPiCodexLifecycleOperatorServiceTransportContinuity()` and `POST /release/pi-codex-lifecycle/operator-service-transport-continuity` must consume a Task225 transport contract artifact, require and verify the caller-supplied contract hash, resume only from the contract `log_session_next_cursor`, and re-run bounded `formatAgentRunLogSseSession()` over the existing Node HTTP AgentRun log-session route plus Pi `fetch`/`getText` primitive. Tampered contracts, stale hashes, missing hashes, secrets, proof-success wording, or long-lived transport claims must fail closed or be sanitized. The continuity checkpoint may record durable resume provenance, but it must not claim durable long-lived transport, live stream ownership, proof authority, direct Pi writes, or GA certification. The focused suite `goal3-task229-pi-operator-service-transport-continuity.test.mjs` must remain in the release-hardening matrix.
- Task230 keeps the Pi consumer for Task229 host-confirmed and non-authoritative: `comath.release.piCodexLifecycleOperatorServiceTransportContinuity` and `/cm:release lifecycle-operator-service-transport-continuity` must call only `POST /release/pi-codex-lifecycle/operator-service-transport-continuity` through host confirmation, require `transport_contract_sha256`, must not forward model-supplied `confirmation_id`, must sanitize actor/path/result surfaces, and must force proof/GA/durable/live/direct-Pi-write/direct-trusted-state authority flags false. The interactive real-Pi planner may show the continuity checkpoint, but it must not call `comathd` or auto-execute it. The focused suite `goal3-task230-pi-operator-service-transport-continuity-consumer.test.mjs` must remain in the release-hardening matrix.
- Task231 keeps the prepared unattended real-Pi handoff as a read-only planner mode over existing service-owned checkpoint references: `comath.release.piCodexLifecycleInteractiveRealPi` with `action="unattended-handoff"` and `/cm:release lifecycle-interactive-real-pi unattended-handoff` must not call `comathd`, must not accept or forward `confirmation_id`, must not ask for mutation confirmation, must not write `.comath`, must not auto-execute lifecycle actions, and must require sanitized service-owned checkpoint path/hash pairs before marking a handoff ready. Missing or poisoned checkpoint refs must block the handoff view. Public output must force proof/GA/durable/live/direct-Pi-write/direct-trusted-state/unattended-execution authority flags false and must not echo trusted runtime paths, host paths, secrets, proof-success wording, or operator-free/unattended-executor overclaims. The focused suite `goal3-task231-pi-prepared-unattended-real-pi-handoff-ux.test.mjs` must remain in the release-hardening matrix.
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
node services/comathd/tests/unit/goal3-task204-agent-adapter-os-isolation-provider-specific-tool-binding.test.mjs
node services/comathd/tests/unit/goal3-task205-agent-adapter-os-isolation-provider-family-enforcement-witness-gate.test.mjs
node services/comathd/tests/unit/goal3-task206-agent-adapter-os-isolation-provider-family-execution-profile-gate.test.mjs
node services/comathd/tests/unit/goal3-task207-agent-adapter-os-isolation-provider-specific-live-probe-attempt-gate.test.mjs
node services/comathd/tests/unit/goal3-task208-agent-adapter-os-isolation-provider-specific-live-probe-execution-gate.test.mjs
node services/comathd/tests/unit/goal3-task209-agent-adapter-os-isolation-provider-specific-live-probe-collection-binding-gate.test.mjs
node services/comathd/tests/unit/goal3-task210-agent-adapter-os-isolation-provider-control-plane-execution-witness-gate.test.mjs
node services/comathd/tests/unit/goal3-task211-agent-adapter-os-isolation-provider-helper-witness-chain-check-debug.test.mjs
node services/comathd/tests/unit/goal3-task212-agent-adapter-os-isolation-windows-appcontainer-production-helper-profile-contract.test.mjs
node services/comathd/tests/unit/goal3-task232-agent-adapter-os-isolation-nix-production-helper-profile-contract.test.mjs
node services/comathd/tests/unit/goal3-task213-campaign-live-mathlib-replay-breadth-gate.test.mjs
node services/comathd/tests/unit/goal3-task214-campaign-live-mathlib-dependency-material-gate.test.mjs
node services/comathd/tests/unit/goal3-task215-final-replay-dependency-closure-v2-binding.test.mjs
node services/comathd/tests/unit/goal3-task216-campaign-live-mathlib-provisioning-diagnostic.test.mjs
node services/comathd/tests/unit/goal3-task217-final-replay-dependency-lock-consistency.test.mjs
node services/comathd/tests/unit/goal3-task218-campaign-live-mathlib-host-replay-diagnostic.test.mjs
node services/comathd/tests/unit/goal3-task219-campaign-live-mathlib-import-graph-diagnostic.test.mjs
node services/comathd/tests/unit/goal3-task220-pi-operator-transport-lease-agentrun-log-session-binding.test.mjs
node services/comathd/tests/unit/goal3-task221-pi-operator-transport-lease-heartbeat-rebind.test.mjs
node extensions/comath-pi/tests/goal3-task221-pi-operator-transport-heartbeat-consumer.test.mjs
node services/comathd/tests/unit/goal3-task225-pi-operator-service-transport-contract.test.mjs
node extensions/comath-pi/tests/goal3-task226-pi-operator-service-transport-contract-consumer.test.mjs
node services/comathd/tests/unit/goal3-task227-pi-automatic-real-pi-execution-orchestration.test.mjs
node extensions/comath-pi/tests/goal3-task228-pi-automatic-real-pi-execution-consumer.test.mjs
node services/comathd/tests/unit/goal3-task229-pi-operator-service-transport-continuity.test.mjs
node extensions/comath-pi/tests/goal3-task230-pi-operator-service-transport-continuity-consumer.test.mjs
node extensions/comath-pi/tests/goal3-task231-pi-prepared-unattended-real-pi-handoff-ux.test.mjs
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
- Explicit blocker list for any deliberately deferred broad proof-test breadth. Broad matrix-style proof campaigns are final-release-candidate audit debt, not a prerequisite for ordinary product-closure tasks.

## Non-GA Labels

Use these labels when evidence is incomplete:

- `research-alpha`: workflow foundation with fail-closed gates.
- `vertical-slice`: executable path over bounded examples only.
- `ga-candidate`: all gates implemented, final review pending.
- `replayable-blocker`: a blocker certificate and resume path exist.
- `draft` or `candidate`: no final clean Lean replay.
