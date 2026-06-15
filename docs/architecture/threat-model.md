# Threat Model

CoMath is a local research workbench. Its highest-value assets are theorem boundary integrity, Lean replay authenticity, dependency provenance, evidence hashes, user attachments, API credentials, and runtime project state under `.comath/`.

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

Final proof artifacts may use `sorry`, `admit`, `axiom`, `constant`, `unsafe`, `opaque`, local shadowing, or import pollution. Mitigation: LeanIntegrityScannerV2, target-bound AxiomProfileV2, dependency closure, allowed import prefixes, namespace/import checks, and no-cheat gates.

### Dependency Supply Chain Drift

External Lean repositories, mathlib revisions, Lake manifests, or toolchain binaries may change after a result is claimed. Mitigation: DependencyLock, pinned commits, manifest hashes, license checks, source hashes, network-disabled final replay, and the trusted replay dependency state machine.

### Literature Prompt Injection

Papers, TeX, Markdown, web pages, and search results can contain instructions that ask the system to skip gates, alter the statement, or exfiltrate credentials. Mitigation: treat document text as quoted data, scan for prompt injection, require anchors and hashes, and keep adapter output `proof_authority=none`.

### Copyright And Terms Leakage

Evidence packs may accidentally redistribute full copyrighted PDFs or API-restricted material. Mitigation: store metadata, hashes, anchors, excerpts, and local/user-provided paths unless redistribution is allowed.

### Runtime And Secret Leakage

Snapshots, logs, adapter outputs, and evidence packs may expose host paths, API keys, tokens, private keys, or local PDFs. Mitigation: secret scanning, host-path scrubbing, `.comath/` git ignore, service-owned config, and no Pi exposure of API key values.

### Agent Or Adapter Escape

Child processes may write outside scope, run shell strings, or consume unbounded resources. Mitigation: allowlisted realpaths, `shell:false`, scoped cwd/log paths, writer locks, rate limits, timeouts, byte caps, cancellation, and OS-isolation evidence before stronger production claims.

### Sandbox Evidence Confusion

Sandbox launch manifests, provider-runner contracts, host capability probes, helper validation, helper execution attempts, collection bridge manifests, and Pi consumer payloads may be mistaken for executed OS isolation. Mitigation: keep those records non-authoritative, reject caller-supplied success metadata, and accept readiness only from canonical service-owned collected evidence.

### Live Provider Confusion

Live retrieval, theorem search, and computation providers can return useful hints that look authoritative. Mitigation: opt-in live execution, provider allowlists, sanitized request/response hashes, prompt-injection scans, no persisted secrets, and explicit `proof_authority=none` flags. Live results cannot write Lean authority manifests, change locked statements, or promote claims.

### Public Archive Confusion

Source review archives, public checklists, provider receipts, and immutable-storage attestations may be mistaken for proof or restore authority. Mitigation: mark them release provenance only, bind paths and hashes, reject restore claims from public downloads, and keep final proof status dependent on Lean Authority v3.

## Residual Risks

- Pattern-based secret scanning is not full DLP.
- Service-level network-denial metadata is not equivalent to OS/kernel-enforced network isolation.
- Adapter preflight and host validation are not equivalent to executing adapters inside an OS-enforced sandbox.
- Injected-client API checks are not live production account validation.
- Representative proof campaigns are not broad mathematical coverage.
- Documentation must continue to distinguish implemented trust gates from global product readiness.
