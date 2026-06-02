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

Sandbox execution route and Pi consumer payloads may be mistaken for a production OS sandbox runner or for collected OS-enforcement evidence. Mitigation: sandbox execution probe manifests must bind an existing ready sandbox-launch preflight, reject caller-supplied success-shaped execution metadata, and feed readiness only through an internal service-owned execution probe callback that writes canonical Task170 probe/evidence artifacts. The Pi consumer strips confirmation ids, sanitizes host-path/secret/proof-success/long-lived transport overclaims, and can only call the service route through host confirmation. The bridge and consumer remain release-readiness evidence with `proof_authority=none`; they do not certify GA or guarantee broad provider support.

### Provider Runner Contract Confusion

Provider-runner contract manifests may be mistaken for executed sandboxing because they contain fixed argv templates and environment policy. Mitigation: provider-runner manifests require a ready service-owned sandbox-launch preflight, reject caller command/argv/env/hash/success metadata, record unavailable blockers when no service-owned helper is configured, and cannot satisfy readiness without later canonical collected probe/evidence artifacts.

### Provider Helper Host Validation Confusion

Provider-helper host-validation manifests may be mistaken for executed sandboxing because they bind a service-owned helper binary hash, supported platform list, and fixed environment policy. Mitigation: host-validation manifests require a ready provider-runner manifest, reject caller helper-host-ready booleans, command/argv/env/hash/version metadata, record blockers for missing validators, binary mismatches, and platform mismatches, and cannot satisfy readiness without later canonical collected probe/evidence artifacts.

### Provider Helper Execution Confusion

Provider-helper execution attempt manifests may be mistaken for collected OS-enforcement evidence because they record a service-owned helper process exit code and stdout/stderr/transcript hashes. Mitigation: helper execution manifests require a ready provider-runner manifest, a service-owned helper configuration, a runner-binary hash match, `shell=false`, fixed argv, a non-inherited fixed environment, and hash-only output recording. Caller-supplied helper command, argv, env, exit codes, stdout/stderr hashes, and route payloads are ignored. A helper exit code of 0 records only an attempted helper execution and cannot satisfy readiness without later canonical Task170/Task172 collected probe/evidence artifacts.

### Provider Helper Collection Confusion

Provider-helper collection bridge manifests may be mistaken for readiness evidence because they can contain a canonical probe result when a service-owned collector succeeds. Mitigation: the route cannot accept collector callbacks or caller-supplied OS-enforcement booleans, exit codes, or stdout/stderr/transcript hashes. The internal collector must bind to the ready helper execution, provider runner, and launch artifacts, and its exit/stdout/stderr/transcript hashes must exactly match the helper execution manifest before `comathd` writes canonical Task170 probe/evidence artifacts. The collection wrapper manifest itself remains non-authoritative and is rejected by the readiness gate; only the canonical probe/evidence artifact can be reviewed.

## Residual Risks

- Pattern-based secret scanning is not full DLP.
- Service-level network-denial metadata is not equivalent to OS/kernel-enforced network isolation.
- Adapter sandbox-launch preflight is not equivalent to actually executing adapters inside an OS-enforced sandbox.
- Adapter provider-runner contracts, provider-helper host validations, provider-helper execution attempts, provider-helper collection bridge manifests, sandbox-execution probe bridging, and Pi consumer wiring are not equivalent to broad production OS-enforced execution across OCI/Nix/Firejail/AppContainer/macOS helpers and hosts.
- Injected-client Codex API tests are not live production account validation.
- Goal 3 positive acceptance breadth is representative unless the full 100-task matrix is clean-replayed.
- Documentation must continue to distinguish implemented trust gates from final global GA completion.
