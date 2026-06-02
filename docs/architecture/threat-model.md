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

## Residual Risks

- Pattern-based secret scanning is not full DLP.
- Service-level network-denial metadata is not equivalent to OS/kernel-enforced network isolation.
- Adapter sandbox-launch preflight is not equivalent to actually executing adapters inside an OS-enforced sandbox.
- Injected-client Codex API tests are not live production account validation.
- Goal 3 positive acceptance breadth is representative unless the full 100-task matrix is clean-replayed.
- Documentation must continue to distinguish implemented trust gates from final global GA completion.
