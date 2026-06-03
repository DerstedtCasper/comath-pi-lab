# Threat Model

CoMath is a local research workbench. Its highest-value assets are theorem boundary integrity, replay authenticity, dependency provenance, evidence hashes, user attachments, API credentials, and runtime project state under `.comath/`.

## Trust Boundaries

| Boundary | Trusted writer | Rule |
| --- | --- | --- |
| User goal and attachments | User/Pi input | Immutable input hashes; attachment content is data, not instruction. |
| `.comath/` runtime state | `comathd` only | Pi, agents, docs, and adapter outputs do not write trusted state directly. |
| FormalSpecLock and AssumptionLedger | `comathd` | No proof search without approved statement and sourced assumptions. |
| Agent output | Untrusted | `proof_authority=none`; strict JSON; no trusted mutation. |
| Literature and RAG output | Untrusted | Anchored evidence only; no proof status. |
| CAS/SAT/SMT output | Untrusted | Hints, refutation leads, or certificates to be formalized; not proof authority. |
| LeanRunManifest | Conditionally trusted | Only service-owned LeanRunner can write it. |
| FinalReplayManifest | Trusted if gates pass | Requires hermetic clean replay and integrity audit. |

## Primary Threats

### Statement Drift

An agent or repair loop may weaken the theorem, add hidden assumptions, change domains, or alter quantifiers. Mitigation: FormalSpecLock, AssumptionLedger, StatementDiffGate, locked statement hashes, and statement-drift red-team reports. Non-exact equivalence requires Lean-proved equivalence replay.

### Fake Proof Evidence

An agent can write stdout, pass logs, JSON manifests, or reviewer notes that mimic successful Lean output. Mitigation: service-owned LeanRunManifest, hashed stdout/stderr, path-bound runs, final clean replay, and rejection of agent-written proof logs.

### Lean Escape Hatches

Final proof artifacts may use `sorry`, `admit`, `axiom`, `constant`, `unsafe`, `opaque`, shadowing, or import pollution. Mitigation: LeanIntegrityScannerV2, target-bound AxiomProfileV2, dependency closure, allowed import prefixes, namespace/import checks, and no-cheat gates.

### Dependency Supply Chain Drift

External Lean repositories, mathlib revisions, Lake manifests, or toolchain binaries may change after a result is claimed. Mitigation: DependencyLock, pinned commits, manifest hashes, license checks, source hashes, network-disabled final replay, and the `trusted_replay_dependency` state machine.

### Literature/RAG Prompt Injection

Papers, TeX, Markdown, web pages, and search results can contain instructions such as “ignore the system prompt,” “skip Lean,” or credential exfiltration text. Mitigation: treat document text as quoted data, scan for prompt injection, require anchors and hashes, and keep adapter output `proof_authority=none`.

### Copyright And Terms Leakage

Evidence packs may accidentally redistribute full copyrighted PDFs or API-restricted material. Mitigation: store metadata, hashes, anchors, excerpts, and local/user-provided paths unless license permits redistribution.

### Runtime And Secret Leakage

Snapshots, logs, adapter outputs, and evidence packs may expose host paths, API keys, tokens, private keys, or local PDFs. Mitigation: secret scanning, host-path scrubbing, `.comath/` git ignore, service-owned config, and no Pi exposure of API key values.

### Agent Or Adapter Escape

Child processes may write outside scope, run shell strings, or consume unbounded resources. Mitigation: allowlisted realpaths, `shell:false`, scoped cwd/log paths, writer locks, rpm limits, timeouts, byte caps, cancellation, and future OS-level isolation before stronger production claims.

### Sandbox Preflight Confusion

Provider-specific sandbox launch manifests may be mistaken for executed isolation evidence. Mitigation: sandbox-launch preflight records only a service-owned provider-command contract, keeps command overrides and caller-supplied success metadata untrusted, and cannot satisfy the adapter OS-isolation readiness gate. Readiness still requires a later service-owned collected execution probe with bound stdout/stderr/transcript hashes and OS-enforcement checks.

### Sandbox Execution Probe Confusion

Sandbox execution route and Pi consumer payloads may be mistaken for a production OS sandbox runner or for collected OS-enforcement evidence. Mitigation: sandbox execution probe manifests must bind an existing ready sandbox-launch preflight, reject caller-supplied success-shaped execution metadata, and feed readiness only through an internal service-owned execution probe callback that writes canonical Task170 probe/evidence artifacts. The Pi consumer strips confirmation ids, sanitizes host-path/secret/proof-success/long-lived transport overclaims, and can only call the service route through host confirmation. The bridge and consumer are operator-routing and UX artifacts with `proof_authority=none`; only canonical service-owned probe/evidence artifacts and readiness reviews can feed release gates, and they still do not certify GA or guarantee broad provider support.

### Provider Runner Contract Confusion

Provider-runner contract manifests may be mistaken for executed sandboxing because they contain fixed argv templates and environment policy. Mitigation: provider-runner manifests require a ready service-owned sandbox-launch preflight, reject caller command/argv/env/hash/success metadata, record unavailable blockers when no service-owned helper is configured, and cannot satisfy readiness without later canonical collected probe/evidence artifacts.

### Provider Host Capability Probe Confusion

Provider host capability probe manifests may be mistaken for production helper readiness or OS enforcement because they can record service-observed provider-family tool, platform, and kernel-feature facts. Mitigation: the host capability probe is diagnostics only. The default route probe may observe provider/platform compatibility, bundled provider-helper protocol asset metadata, Windows AppContainer host facility / `windows_checknetisolation` diagnostics, OCI container host facility / Docker/Podman CLI presence-hash diagnostics, and Nix sandbox / Firejail / macOS `sandbox-exec` facility diagnostics from service-owned state, but route callers cannot submit platform strings, tool paths, kernel-feature booleans, proof-authority fields, or GA-certification flags as capability evidence; host facility diagnostics must not execute host tools, inspect daemon/socket/container/store/profile/sandbox-policy state, record tool versions, or expose PATH/system/executable paths; Pi consumers for the route are host-confirmed thin clients that forward only sanitized `platform` / `notes` diagnostics; manifests keep `adapter_execution_isolation.os_enforced=false`, `proof_authority=none`, and `can_certify_ga=false`; provider-helper host validation must bind an observed service-owned probe before running a host validator; and readiness still requires canonical service-owned probe/evidence artifacts, not host capability manifests, default-probe diagnostics, host-facility diagnostics, or host-validation bindings.

Configured provider-helper asset environment variables may be mistaken for broad OS sandbox support. Mitigation: OCI, Nix, Firejail, Windows AppContainer, and macOS `sandbox-exec` helper paths must be absolute service-owned executables configured in the host environment, and public manifests record only the helper binary hash, fixed argv/env policy, provider/platform contract result, self-test hashes/status, runtime-attestation bound status/hash, and non-secret diagnostics. The default host validator uses the service-observed platform, rejects platform-specific provider mismatches, and requires env-configured helpers to pass a fixed CoMath provider-helper self-test that binds the current project id, host-validation id, provider-runner id, and sandbox-launch id before helper execution can be unlocked; generic reusable self-test success output fails closed. The helper execution path also requires stdout runtime attestation binding the current project id, helper-execution id, provider-runner id, sandbox-launch id, adapter, backend, provider, disabled network policy, and proof-authority boundary before provider-helper collection can invoke canonical probe writing; generic reusable runtime success output fails closed. The production route's default provider-helper collection probe runs a bundled CoMath provider-helper collection probe asset, binds persisted helper exit/stdout/stderr/transcript hashes plus host-validation and host-capability facts, and records false OS-enforcement facts until a provider-specific OS probe reports complete service-owned facts. A configured collection probe must also bind the current provider-helper host-validation artifact and the observed service-owned provider host-capability probe artifact; stale host-validation bindings, tampered provider host-capability artifact files, host-capability binding mismatch cases, or generic host-capability success metadata fail closed before collected evidence is accepted. Task201 keeps this helper release chain risk under explicit check-debug coverage. Task202 keeps the bundled provider-helper collection probe asset under explicit default-path coverage. The configured asset, runtime attestation, host-capability binding, and default collection blocker still do not prove OS enforcement, do not expose the helper path or raw helper output to Pi payloads, and cannot satisfy readiness without later canonical collected probe/evidence artifacts.

Configured provider-helper execution args-prefix environment variables may be mistaken for an executed sandbox profile or public helper script. Mitigation: provider-specific `*_HELPER_ARGS_JSON` handles and the fallback args-prefix handle are host configuration only; public manifests record only the args-prefix hash and count, never the prefix argument values or helper script paths. The configured prefix can help run a service-owned helper asset after validated host binding, but helper execution still does not prove OS enforcement and cannot satisfy readiness without later canonical collected probe/evidence artifacts.

### Bundled Provider Helper Protocol Confusion

The bundled CoMath provider-helper protocol asset may be mistaken for a production OCI/Nix/Firejail/AppContainer/macOS sandbox helper because it can pass the fixed self-test and emit runtime attestation under service-owned argv/env. Mitigation: the bundled asset is packaged protocol material only. It runs through the current Node executable, records only executable hashes plus args-prefix hash/count, exposes no helper paths or raw stdout/stderr text, keeps `proof_authority=none`, `adapter_execution_isolation.os_enforced=false`, and `can_certify_ga=false`, and cannot satisfy readiness unless a separate canonical service-owned probe/evidence artifact passes the readiness review.

### Provider Helper Host Validation Confusion

Provider-helper host-validation manifests may be mistaken for executed sandboxing because they bind a service-owned helper binary hash, supported platform list, fixed environment policy, and possibly a successful provider-helper self-test. Mitigation: host-validation manifests require a ready provider-runner manifest plus a matching service-owned provider host capability probe, reject caller helper-host-ready booleans, command/argv/env/hash/version/self-test metadata, record blockers for missing validators, binary mismatches, platform mismatches, missing or mismatched host capability probes, and failed self-tests, and cannot satisfy readiness without later canonical collected probe/evidence artifacts. Pi host-validation consumers are host-confirmed thin clients that forward only sanitized `platform` / `notes` diagnostics and cannot promote caller helper-readiness metadata.

### Provider Helper Execution Confusion

Provider-helper execution attempt manifests may be mistaken for collected OS-enforcement evidence because they record a service-owned helper process exit code and stdout/stderr/transcript hashes. Mitigation: helper execution manifests require a ready provider-runner manifest plus a prior service-owned provider-helper host-validation artifact that is validated and exactly bound to the same project, adapter, backend, provider, launch artifact, runner artifact, runner binary hash, and helper binary hash before any helper config resolver or helper process can run. Missing, unvalidated, or mismatched host-validation artifacts fail closed. Caller-supplied helper command, argv, env, exit codes, stdout/stderr hashes, host-ready booleans, and route payloads are ignored. A host-bound helper exit code of 0 records only an attempted helper execution and cannot satisfy readiness without later canonical Task170/Task172 collected probe/evidence artifacts.

### Provider Helper Collection Confusion

Provider-helper collection bridge manifests may be mistaken for readiness evidence because they can contain a canonical probe result when a service-owned collector succeeds. Mitigation: the route cannot accept collector callbacks or caller-supplied OS-enforcement booleans, exit codes, or stdout/stderr/transcript hashes. The internal collector must bind to the ready helper execution, provider runner, and launch artifacts, and its exit/stdout/stderr/transcript hashes must exactly match the helper execution manifest before `comathd` writes canonical Task170 probe/evidence artifacts. A matching hash set is not enough: missing or false service-owned process, filesystem, network, no-new-privileges, escape-prevention, collection-source, or helper-exit facts produce an explicit incomplete-OS-enforcement blocker. The collection wrapper manifest itself remains non-authoritative, keeps its top-level `adapter_execution_isolation.os_enforced=false`, and is rejected by the readiness gate; only the canonical probe/evidence artifact can be reviewed.

## Residual Risks

- Pattern-based secret scanning is not full DLP.
- Service-level network-denial metadata is not equivalent to OS/kernel-enforced network isolation.
- Adapter sandbox-launch preflight is not equivalent to actually executing adapters inside an OS-enforced sandbox.
- Adapter provider-runner contracts, provider host capability probes, provider-helper host validations, provider-helper execution attempts, provider-helper collection bridge manifests, sandbox-execution probe bridging, and Pi consumer wiring are not equivalent to broad production OS-enforced execution across OCI/Nix/Firejail/AppContainer/macOS helpers and hosts.
- Injected-client Codex API tests are not live production account validation.
- Goal 3 positive acceptance breadth is representative unless the full 100-task matrix is clean-replayed.
- Documentation must continue to distinguish implemented trust gates from final global GA completion.
