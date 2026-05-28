# SECURITY REVIEW

Current-state note: sections below are chronological. The Phase 0 statement describes the bootstrap-only repository state at that time; later phases now include controlled runtime writes, runner execution, memory mutation, proof-kernel replay, Pi runtime registration, AgentRun scoped write boundaries, and allowlisted AgentRun process scheduling.

Phase 69 security note: external v3 terminal vocabulary is exposed only as a derived response field, `campaign.external_v3_terminal_state`. It is not persisted into `.comath/campaign/*/status.json`, is not accepted from Pi/model input, and cannot mutate campaign, proof, refutation, blocker, cancellation, or claim-promotion authority.

## Phase 0

No runtime code capable of path writes, shell execution, network calls, claim promotion, or database mutation has been implemented.

Security requirements queued for later phases:

- path policy before artifact import;
- fail-closed runner sandbox;
- secret scanning before snapshot/replay;
- `.comath/` ignored by Git;
- no eager TriviumDB FFI hooks by default;
- no arbitrary workstream shell execution.

## Phase 1

Security-relevant contract hardening is in place:

- GraphPatch cannot directly mutate protected claim promotion fields.
- privileged claim statuses require gate identity at schema level.
- `formally_checked` requires kernel/audit/dependency closure metadata.
- TriviumDB native integration remains optional and dynamically loaded behind the adapter boundary.

## Phase 2-4 Security Review

### Findings

1. **[P1] Path policy must be semantic, not string-prefix based.** Phase 2 path decisions must canonicalize paths and deny traversal/outside-root writes. Windows-specific cases include drive-letter casing, UNC paths, junctions/reparse points, symlinks, `..`, mixed separators, trailing spaces/dots, and alternate data streams.
2. **[P1] Artifact import needs a quarantine-and-copy model.** Phase 3 must copy untrusted external files into controlled `.comath/artifacts` paths by content hash or generated artifact ID. It must not preserve attacker-controlled path structure or basename as authority.
3. **[P1] Runner envelope must stay non-shell-shaped.** Future runner contracts should use structured `program`, `args[]`, `cwd`, `timeout_ms`, resource limits, and allowlisted runner kinds. Do not implement `exec(command)`.
4. **[P1] Claim promotion gate must be the only status escalation path.** Create/update routes must reject privileged statuses except through durable gate decisions.
5. **[P2] `.comath/` runtime ownership needs lock/session semantics.** Phase 2 should create project lock/session markers before mutation to prevent parallel daemon or agent races.
6. **[P2] TriviumDB native/FFI risk remains deferred.** Phase 2-4 code must contain no TriviumDB imports, native dynamic loads, or `.tdb` open paths.

### Required Tests Before Phase 2-4 Completion

- path policy rejects traversal, outside-root absolute paths, UNC/device paths, mixed separators, NUL bytes, and sensitive non-runtime targets;
- path policy resolves symlink/junction/reparse escapes before write approval where the filesystem object exists;
- project init/open canonicalizes root once and uses canonical root for later decisions;
- runtime tree creation is idempotent and never writes outside `<projectRoot>/.comath`;
- artifact import copies external sources into generated internal artifact paths and hashes the registered internal file;
- audit JSONL writer emits one valid JSON object per line and cannot be redirected by payload fields;
- claim create/update rejects direct escalation to privileged statuses;
- promotion route returns fail-closed with durable blockers when evidence is absent;
- GraphPatch/workstream-derived data cannot mutate claim status or evidence level directly;
- static scans fail on shell execution APIs, dynamic native imports, direct TriviumDB imports, or `.tdb` open code.

### Security Defaults

- deny by default for every path decision, runner request, artifact import, snapshot export, and promotion gate;
- `comathd` is the only mutation gateway for `.comath`, claims, evidence, audit logs, and future DB adapters;
- artifact import is untrusted input ingestion, not execution or proof;
- TriviumDB native/FFI is unavailable until Phase 13 capability probes pass;
- mathematical records use append/retract/supersede semantics rather than destructive cleanup.

## Phase 2

Implemented and tested:

- semantic path policy using normalized filesystem paths rather than string-prefix checks;
- denial of empty paths, NUL bytes, URL-shaped paths, UNC/device paths, alternate data stream syntax, traversal outside root, `.git`, `.env`, and runtime writes outside `.comath`;
- realpath escape rejection for existing symlink/junction targets when `resolveRealpath=true`;
- project runtime tree creation restricted to `<projectRoot>/.comath`;
- `config.json` default keeps shell execution disabled with `allowShell=false`;
- HTTP route tests confirm traversal payloads return an error and do not create escape runtime state.

Remaining Phase 3 security requirement: artifact import must consume this path policy and must copy untrusted inputs into content-addressed internal artifact paths without trusting source basename.

## Phase 3

Implemented and tested:

- file hashing via SHA-256;
- artifact import through Phase 2 path policy;
- quarantine copy before hashing;
- content-addressed internal storage under `.comath/artifacts/sha256/<prefix>/<sha256>`;
- artifact metadata JSONL under `.comath/artifacts/artifacts.jsonl`;
- append-only audit JSONL under `.comath/audit/events.jsonl`;
- sanitized audit payloads that do not preserve source basename;
- secret-scan stub with explicit non-blocking `status=stub`;
- snapshot manifest stub that sets `can_restore=false`.

Remaining security requirements:

- replace secret-scan stub before Phase 16 replay/export gates;
- keep runner execution unavailable until structured runner envelopes exist;
- do not let paper/literature systems treat artifact existence as proof or citation correctness.

## Phase 4

Implemented and tested:

- claim registry writes stay under `.comath/claims`;
- direct privileged status escalation is rejected by service code;
- promotion route is fail-closed and records durable gate results;
- rejected promotion appends audit events and does not mutate claim status;
- `human_accepted` is explicitly not treated as mathematical proof.

Remaining security requirements:

- Phase 5 must keep TriviumDB unavailable behind an adapter shim;
- future routes must not bypass `promoteClaim`;
- future GraphPatch apply code must not mutate claim status or evidence level directly.

## Phase 5

Implemented and tested:

- no `triviumdb` dependency in `services/comathd/package.json`;
- static guard against bare Trivium/native loader imports;
- TriviumDB backend represented by an unavailable shim until Phase 13;
- StableIdMap conflict checks prevent cross-binding stable IDs and adapter IDs;
- GraphPatch begin/apply in memory still relies on Phase 1 schema hardening against claim promotion bypass.

Remaining security requirements:

- Phase 13 must probe native dependency capability before enabling any real Trivium backend;
- future route layer must depend on `ResearchMemoryDB` interface rather than native adapter details.

## Final Research Alpha Security Audit

### Inspected Surfaces

- Path policy and project runtime layout: `services/comathd/src/security/path-policy.ts`, `services/comathd/src/project/project-store.ts`.
- Artifact, audit, paper, snapshot, and replay paths: `services/comathd/src/artifacts/`, `services/comathd/src/audit/jsonl-writer.ts`.
- Secret scanning: `services/comathd/src/security/secret-scan.ts`.
- Runner envelopes: `services/comathd/src/verification/runner-contracts.ts`, `python/exact_compute.py`, `python/counterexample_search.py`.
- MathProve bridge execution boundary: `services/comathd/src/verification/mathprove.ts` and `services/comathd/tests/unit/phase25-real-mathprove-bridge.test.mjs`.
- Claim promotion gate: `services/comathd/src/verification/gate.ts`.
- Native proof-kernel campaign and Lean replay: `services/comathd/src/proof-kernel/`.
- Pi extension boundary: `extensions/comath-pi/src/`.
- Native dependency boundary: `services/comathd/src/memory/trivium-*.ts`.
- Evaluation coverage: `tests/evaluation/phase17-integrity-evaluation.test.mjs`.

### Closed Findings

1. **Secret scan stub replaced for artifact import and snapshot export.** Phase 3 `scanForSecretsStub()` remains for compatibility tests, but artifact import and Phase 16 snapshot export use `scanForSecrets()` and fail closed on known API key, token, password, private-key, and truncated-file patterns.
2. **Snapshot/restore traversal hardened.** Snapshot export, verification, and restore now combine lexical checks with realpath and source-side symlink/reparse/device rejection before reading or copying snapshot entries.
3. **Runner host path leaks blocked.** Runner metadata records `<runner-path>/<script>` instead of host absolute Python script paths, runner stdout/stderr metadata is scrubbed, and replay verification vetoes copied runner reports that still contain host-path leaks.
4. **Paper export fails closed.** `exportPaper()` records `paper.export_rejected` and throws `PAPER_CHECK_FAILED` when `checkPaper()` returns vetoes.
5. **Promotion gate validates real evidence and artifacts.** The gate now checks evidence and artifact existence, project/claim binding, evidence-artifact linkage, artifact hash/size, and target-status evidence kind.
6. **Pi extension dashboard remains read-only.** Phase 15/17 tests statically reject service-internal imports, direct `.comath` access, and filesystem writes from dashboard files.
7. **TriviumDB remains optional.** `triviumdb@0.7.1` is a root optional dependency for explicit target-platform evaluation only; no ordinary `services/comathd` dependency or eager native import exists, and native loading stays behind capability probing and adapter boundaries.
8. **Replay integrity checks include internal run hashes.** Snapshot verification validates replay manifest `runs_sha256` values so hand-edited replay metadata fails closed.
9. **Snapshot/replay are exposed only through `comathd`.** HTTP routes now cover snapshot export, verify, restore, and replay-manifest verification; Pi extension entries are descriptors/commands only and do not read or write `.comath/` directly.
10. **Phase 18 proof-kernel replay remains service-owned.** Campaign routes, candidate artifacts, Lean replay outputs, and counterexample evidence write only under path-policy-controlled `.comath/` directories; Pi campaign tools call `comathd` and do not mutate trusted files directly.
11. **Formal promotion requires replay evidence.** The gate rejects preloaded kernel metadata unless the requested artifacts include a passed proof-kernel `final_replay_manifest.json` for the same claim.
12. **Compute runner replay no longer trusts manifest descriptors alone.** Strict `/replay/verify-manifest` reconstructs allowlisted runner commands from service code, uses persisted canonical runner input, and fails closed on replay/report drift, static snapshot vetoes before Python execution, script hash drift, input hash drift, oversized replay timeout, report-local stdio hash drift, untrusted replay argv, runner-version drift, nonzero exit, timeout, invalid JSON, runner ID mismatch, and result hash mismatch.
13. **External MathProve runner is service-owned and non-authoritative.** Phase 25 invokes only the sibling `MathProve-Skill` `scripts/verify_sympy.py` through a fixed argv template, controlled `.comath/evidence/<claim>/mathprove` workspace, bounded timeout, explicit `shell:false`, and `network=false` metadata. Untrusted runner roots, missing runner, and statement-hash mismatch paths are archived fail-closed before promotion is attempted.
14. **AgentRun scheduled processes are bounded and non-authoritative.** Phase 28 requires absolute-realpath program allowlists, `shell:false`, scoped `.tmp/comath/<ARUN>/` cwd/log paths, minimal inherited environment, sensitive env rejection, enqueue-time rpm reservation, queued/running cancellation, byte-capped stdout/stderr with truncation markers, scheduler report envelopes with `proof_authority: none`, invalid-report fail-closed persistence, and timeout/cancel process-tree termination attempts.
15. **Proof-planning artifacts are campaign-scoped.** Phase 33 writes lemma DAG, line-map, per-obligation YAML, skeleton Lean, and skeleton report artifacts under `.comath/campaign/<CAM>/proof/` through path-policy-controlled runtime writes, avoiding cross-campaign overwrite of proof-planning provenance.
16. **Ensemble artifacts are campaign-scoped.** Phase 34 writes candidate workspaces, candidate batch indexes, and arbitration decisions under `.comath/campaign/<CAM>/ensembles/lemma_sprint/<PO>/`, so concurrent supported campaigns cannot overwrite or read each other's proof-candidate state.
17. **Final replay audit paths are claim-scoped.** Phase 35 removes hardcoded `C-0001` pointers from final replay stage-run artifact paths, so later campaign audits point to the active claim's evidence bundle.
18. **Runner replay provenance is explicit.** Phase 36 records sandbox policy and dependency-lock material in compute runner reports and replay manifests, and replay integrity fails closed if either class of provenance is missing.
19. **Statement-alias equivalence is allowlisted.** Phase 37 accepts non-identical Lean target signatures only through explicit registered definitional aliases and records the witness; unregistered mismatches remain fail-closed.
20. **Native TriviumDB target evaluation is explicit.** Phase 38 runs native TriviumDB through an adapter-owned evaluation harness, records fail-closed unavailable reports, and keeps default memory backend selection unchanged.
21. **Project writer sessions have a fail-closed lock primitive.** Phase 39 writes `.comath/sessions/writer.lock.json` through the runtime-write path policy, rejects concurrent active locks, requires the session token for release, records stale takeover provenance, and treats malformed lock JSON as an unreadable active lock rather than overwriting it.
22. **Scheduled AgentRuns respect project writer locks.** Phase 40 makes scheduler execution acquire the writer session before child-process mutation, reject active-lock conflicts before spawn, preserve the queued run on blocked launch, and release the scheduler-owned lock after terminal report handling.
23. **Live profile adapters execute only through the scheduler boundary.** Phase 41 exposes profile-backed adapter execution through `executeProfileAgentRun()`, `/agent/run/profile/execute`, and Pi host-confirmed `comath.agent.executeProfile`, preserving program allowlists, scoped writes, writer locks, and non-authoritative report wrapping.
24. **AgentRun observability is bounded and non-promotional.** Phase 42 exposes capped AgentRun stdout/stderr reads and adapter health probes through `comathd`; health probes use absolute program validation, `shell:false`, bounded timeout/output, a minimal environment, `COMATH_PROOF_AUTHORITY=none`, Pi host confirmation, and audit events.
25. **Packaged adapters are resolved by comathd, not model-supplied shell strings.** Phase 43 adds a service-owned `codex-cli` adapter package registry and bundled launcher script. Pi can request package prepare/execute, but the executable, prefix arguments, rpm, profile support, and `proof_authority=none` environment are resolved by `comathd` and launched through the existing scheduler/writer-lock boundary.
26. **External Codex-compatible CLI execution is service-configured and fail-closed.** Phase 44 allows `backend: "external"` only behind the service-owned package launcher. The external program is resolved from `COMATH_CODEX_CLI_PROGRAM` as an absolute existing realpath, optional prefix args come from service JSON configuration, Pi/model input can select only the backend enum, and missing configuration produces a failed AgentRun rather than falling back to arbitrary execution.
27. **Install-session e2e exercises the built package over real HTTP.** Phase 45 starts a local `comathd` HTTP server, imports the Pi extension from the built package manifest, and drives campaign/agent operations through `createComathClient({ baseUrl })` with Pi host confirmations. This catches boundary drift that mocked clients cannot see.
28. **AgentRun log streaming is cursor-bounded and non-promotional.** Phase 46 exposes `GET /agent/run/:id/log-stream` and Pi `/cm:agent stream` as read-only cursor polling over scheduler-owned stdout/stderr files. Cursors and `max_bytes` are validated, paths remain project-confined, audit events are emitted, and returned chunks carry `proof_authority=none`.
29. **AgentRun log subscriptions are SSE-compatible snapshots, not shell access.** Phase 47 exposes `GET /agent/run/:id/log-subscription` and Pi `/cm:agent subscribe-logs` as read-only `text/event-stream` frames over the same bounded cursor/path policy. It emits audit events and keeps `proof_authority=none` in the frame payload.
30. **AgentRun operator panels are service-owned read models.** Phase 48 exposes `GET /agent/run/:id/operator-panel` and Pi `/cm:agent panel` as read-only aggregation over AgentRun status, cursor log chunks, SSE snapshot metadata, and action availability. It does not expose shell access, executable paths, direct `.comath/` mutation, or fake cancellation; `cancel.enabled=false` until a real active scheduler registry can prove cancellability.
31. **AgentRun operator cancellation is scheduler-backed and host-confirmed.** Phase 49 exposes `POST /agent/run/:id/cancel` only for same-process active scheduler registry entries. Pi `comath.agent.cancelRun` and `/cm:agent cancel` require host confirmation, do not expose executable paths or shell strings, and write no runtime state outside `comathd`.
32. **AgentRun log sessions are bounded SSE responses.** Phase 50 exposes `GET /agent/run/:id/log-session` and Pi `/cm:agent log-session` as read-only multi-event SSE responses over cursor-bounded log reads. `max_events`, byte limits, project-confined paths, no-progress termination, and audit events prevent the surface from becoming shell access, direct `.comath/` mutation, or an unbounded operator channel.
33. **Codex API backend is service-configured and secret-free at the Pi boundary.** Phase 51 lets Pi select only `backend=codex-api`; API key, base URL, and model are resolved by `comathd`. Prepare-launch responses expose `COMATH_CODEX_API_KEY_REF` and configured metadata, not the API key value, and API output is wrapped as untrusted AgentRun report/log material.
34. **Codex API retry telemetry is bounded and secret-free.** Phase 52 retries only retryable `429`/`5xx` responses, caps `Retry-After`, bounds attempts through `COMATH_CODEX_API_MAX_ATTEMPTS`, records status/rate-limit telemetry, and fails closed without writing API keys to reports, logs, or Pi payloads.
35. **Installed Codex CLI validation remains service-configured and path-secret-free.** Phase 53 resolves the external CLI only from `COMATH_CODEX_CLI_PROGRAM` plus optional service prefix args, runs bounded `--version` and `--health` probes with `shell:false` and `COMATH_PROOF_AUTHORITY=none`, and omits the configured executable path from route responses and audit payloads.
36. **Lean declaration parser is fail-closed target binding, not execution.** Phase 54 parses theorem/lemma declaration headers from already supplied Lean source, rejects ambiguous and comment-only substring matches, records the signature source, and does not execute code or add proof authority.
37. **Runner replay environment drift fails closed.** Phase 55 compares recorded replay-run Node/platform/architecture metadata against the current process before re-execution and vetoes mismatches without launching a child runner.
38. **Registered logical equivalence is metadata-gated.** Phase 56 accepts logical-equivalence statement binding only from exact registered formal-spec/target-signature pairs with kernel-witness metadata, witness artifact id/hash, and non-empty lemma names; free-form text cannot create an equivalence bypass.
39. **Theorem template instantiation is registry-bound.** Phase 57 instantiates only a service-owned theorem-family entry for `nat_zero_add`; user/model text cannot provide proof terms, replay commands, executable paths, or arbitrary Lean code.
40. **MathProve final-audit runner is fixed and non-authoritative.** Phase 58 invokes only the trusted sibling `MathProve-Skill` `scripts/final_audit.py` with CoMath-generated steps, controlled workspace/log/solution paths, bounded timeout, `shell:false`, `network=false` metadata, host-path scrubbing, and fail-closed untrusted-root, missing-runner, and statement-hash mismatch handling.
41. **Negative GA release slices are service-owned and non-promotional.** Phase 68 runs the required negative GA slice suite through `comathd`, writes `.comath/release/v3_negative_ga_slices.json`, records failed promotion gates through the ordinary promotion path, and preserves evidence without granting proof authority to the summary artifact.

### Validation Commands

Latest security-relevant validation:

```text
corepack pnpm --filter @comath/comathd test
Result: exit 0; comathd Phase 0/1/2/3/4/5/7/9/10/11/12/13/14/16 tests passed after gate, paper, artifact import secret-scan, snapshot route, and snapshot hardening.

node tests/evaluation/phase17-integrity-evaluation.test.mjs
Result: exit 0; Phase 17 integrity evaluation tests passed, including gate binding, trusted runner audit provenance, paper export blocking, dashboard read-only checks, snapshot stale-runner detection, secret scan blocking, and memory retrieval benchmark.

corepack pnpm build
Result: exit 0; root recursive build passed.

corepack pnpm typecheck
Result: exit 0; root recursive typecheck passed.

corepack pnpm test
Result: exit 0; Phase 0 smoke, all workspace tests, and Phase 17 integrity evaluation passed.

Test-Path -LiteralPath 'D:\MATH _Studio\comath-pi-lab\.comath'
Result: False; no repository-root runtime state remained after validation.
```

Phase 18 targeted validation added after the Research Alpha audit:

```text
corepack pnpm --filter @comath/comathd test
Result: exit 0; includes proof-kernel gate, GA campaign, refutation, and snapshot replay tests.

corepack pnpm --filter @comath/pi-extension test
Result: exit 0; includes Pi research/campaign command and tool descriptor tests.
```

Phase 25 targeted validation added after the Research Alpha audit:

```text
node services/comathd/tests/unit/phase25-real-mathprove-bridge.test.mjs
Result: exit 0; real MathProve external bridge tests passed, including missing-runner fail-closed behavior, controlled external `verify_sympy.py` invocation, statement-hash mismatch vetoes, metadata hashes, and no formal promotion from external runner output alone.
```

Phase 26 targeted validation added after the Research Alpha audit:

```text
corepack pnpm --filter @comath/pi-extension test
Result: exit 0; includes Phase 26 package manifest, runtime registration contract, fake Pi API registration, dynamic entrypoint import, command dispatch, Pi host-side mutating-tool confirmation, and no Pi proof-authority checks.

Installed Pi 0.75.5 loader smoke
Result: exit 0; `@earendil-works/pi-coding-agent@0.75.5` loaded `extensions/comath-pi/dist/index.js` with no loader errors and registered the executable research/campaign tools.
```

Phase 27 targeted validation added after the Research Alpha audit:

```text
node services/comathd/tests/unit/phase27-agent-run-runtime.test.mjs
Result: exit 0; AgentRun runtime-boundary tests passed, including scoped workstream and `.tmp/comath/<ARUN>/` writes, outside-scope rejection, report validation, producer self-review rejection, and failed-route memory recording.
```

Phase 28 targeted validation added after the Research Alpha audit:

```text
node services/comathd/tests/unit/phase28-agent-run-scheduler.test.mjs
Result: exit 0; AgentRun scheduler tests passed, including absolute-realpath allowlisted real process launch, serial scheduling, enqueue-time rpm rejection, minimal environment inheritance, sensitive env rejection, invalid-report fail-closed handling, timeout, running and queued cancellation, scoped byte-capped stdout/stderr logs, process-tree termination attempts, non-authoritative scheduler report envelopes, and report persistence.
```

Phase 33 targeted validation added after the Research Alpha audit:

```text
node services/comathd/tests/unit/phase33-proof-obligation-dag.test.mjs
Result: exit 0; proof-obligation DAG planning tests passed, including duplicate-node, unknown-endpoint, unsupported-relation, and cycle rejection; campaign-scoped planning artifacts; multi-obligation skeleton/report closure; stage-run provenance; and two-campaign no-overwrite behavior.
```

Phase 34 targeted validation:

```text
node services/comathd/tests/integration/phase34-campaign-ensemble-isolation.test.mjs
Result: exit 0; interleaved supported campaigns kept candidates, candidate batch indexes, and decision artifacts in campaign-scoped ensemble paths.
```

Phase 35 targeted validation:

```text
node services/comathd/tests/integration/phase35-final-replay-artifact-paths.test.mjs
Result: exit 0; final replay stage-run artifact paths used the second campaign's active claim id instead of hardcoded `C-0001`.
```

Phase 36 targeted validation:

```text
node services/comathd/tests/unit/phase36-runner-replay-provenance.test.mjs
Result: exit 0; runner reports and replay manifests carried sandbox/dependency provenance and missing provenance failed closed.
```

Phase 37 targeted validation:

```text
node services/comathd/tests/unit/phase37-lean-statement-alias-equivalence.test.mjs
Result: exit 0; registered Lean statement alias equivalence passed and missing/ambiguous/unregistered mismatches failed closed.
```

Phase 38 targeted validation:

```text
node services/comathd/tests/unit/phase38-trivium-native-evaluation.test.mjs
Result: exit 0; TriviumDB target-platform evaluation contract passed for unavailable and available native probes.

$env:COMATH_ENABLE_TRIVIUM_TESTS='1'; corepack pnpm --filter @comath/comathd test:trivium
Result: exit 0; real `triviumdb@0.7.1` native adapter smoke passed on Windows x64.

corepack pnpm --filter @comath/comathd eval:trivium
Result: exit 0; real target evaluation passed with `backend=trivium`, `sample_size=64`, `search_top_hit_ratio=1`, `persistence_reopen.result=pass`, and no hard vetoes.
```

Phase 39 targeted validation:

```text
node services/comathd/tests/unit/phase39-project-session-lock.test.mjs
Result: exit 0; project writer session lock tests passed for exclusive acquisition, active-lock rejection, token-gated release, stale takeover, previous-session provenance, and malformed-lock fail-closed behavior.
```

Phase 40 targeted validation:

```text
node services/comathd/tests/unit/phase40-agent-scheduler-session-lock.test.mjs
Result: exit 0; scheduler writer-lock integration tests passed for active-lock launch rejection, no child/log side effects on blocked launch, queued-run preservation, scheduler acquire/release, and writer-lock audit events.
```

Phase 41 targeted validation:

```text
node services/comathd/tests/unit/phase41-live-agent-adapter-execution.test.mjs
Result: exit 0; live agent adapter execution tests passed for real allowlisted profile adapter execution through the scheduler, service route behavior, writer-lock use, and non-authoritative report wrapping.

node extensions/comath-pi/tests/phase41-agent-execute-tool.test.mjs
Result: exit 0; Pi agent execute tool tests passed for runtime tool/command registration, host confirmation, and `/agent/run/profile/execute` payload shape.
```

### Residual Risks

- Secret scanning is pattern-based. It is suitable as a fail-closed Research Alpha import/export gate but not a full DLP classifier.
- Snapshot manifests are integrity-checked but not cryptographically signed by an external trust anchor. Untrusted imported snapshots still require operator review and future signature support.
- Snapshot/replay verifies deterministic envelopes and stale outputs, Phase 18 reruns the campaign Lean proof replay after restore, Phase 24 reruns the implemented Python compute runners through strict replay, Phase 36 records sandbox/dependency provenance with fail-closed integrity checks, and Phase 55 rejects cross-machine replay environment drift before runner launch. The Phase 25 MathProve bridge records `network=false` and uses fixed argv/timeout controls, but OS-level sandboxing and enforced network denial remain deferred.
- Phase 40 integrates the project writer lock into the service-side AgentRun scheduler mutation path, but true OS-level multi-process sandboxing, network-denial enforcement, and mandatory external-process lock enforcement remain deferred.
- Phase 41-53 execute live adapters through the scheduler boundary, add capped log readback plus cursor-based log polling, SSE-compatible subscription snapshots, bounded multi-event SSE log-session responses, read-only operator panels, same-process scheduler-backed cancellation, and bounded health probes, add a service-owned packaged adapter launcher, support service-configured external Codex-compatible CLI invocation, validate a service-configured installed Codex CLI through bounded probes, add a service-configured Codex API backend contract, and harden that backend with retry/rate-limit telemetry. Production Codex API account/network validation, indefinite WebSocket/SSE sessions beyond bounded responses, richer operator controls beyond same-process cancellation, OS-level sandboxing, and enforced network denial remain deferred.
- Phase 68 adds release-level negative GA evidence for rejection paths. It is a `comathd`-owned runner and artifact writer, not a new external execution boundary, not a Pi mutation path, and not a claim-promotion authority.
- Phase 26 validates installed-loader registration and Pi host-side mutating-tool confirmation gates for Pi 0.75.5, and Phase 45 validates an automated local Pi/comathd install-session over HTTP. Richer real-host Pi UI, manual install walkthrough, service lifecycle management, and runtime permission UX remain separate hardening targets.
- Phase 27 validates AgentRun persistence and scoped writes; Phase 28 adds service-side process launch and scheduler controls on top of that boundary.
- Phase 28 validates absolute-realpath allowlisted process launch, minimal env inheritance, timeout/cancel, process-tree termination attempts, output byte caps, non-authoritative scheduler envelopes, and rpm/concurrency controls; Phase 42 adds capped log read APIs; Phase 46 adds cursor-based log polling; Phase 47 adds SSE-compatible snapshot frames; Phase 48 adds read-only operator panels; Phase 49 adds same-process scheduler-backed live cancellation; Phase 50 adds bounded multi-event SSE log-session responses. It still does not provide OS-level sandboxing, network-denial enforcement, production Pi/Codex agent adapters, indefinite subscriptions, cross-process cancellation/recovery, or multi-process writer locks.

Phase 42 targeted validation:

- `node services/comathd/tests/unit/phase42-agent-run-observability.test.mjs`

Result: exit 0; AgentRun log readback, service log route, adapter health probe, health route, audit events, and non-authoritative metadata passed for an allowlisted fixture adapter.

Phase 43 targeted validation:

- `node services/comathd/tests/unit/phase43-agent-adapter-package.test.mjs`
- `node extensions/comath-pi/tests/phase43-agent-adapter-package-tools.test.mjs`

Result: both exited 0; packaged adapter registry, bundled launcher execution, service routes, Pi tools/commands, host confirmation, and non-authoritative audit boundaries passed.

Phase 44 targeted validation:

- `node services/comathd/tests/unit/phase44-codex-cli-external-invocation.test.mjs`
- `node extensions/comath-pi/tests/phase44-agent-adapter-external-tools.test.mjs`

Result: both exited 0; service-configured external CLI invocation, missing-config fail-closed behavior, fixed argv, untrusted output wrapping, and Pi backend passthrough passed without exposing executable paths.

Phase 45 targeted validation:

- `node tests/e2e/phase45-pi-comathd-install-session.test.mjs`

Result: exit 0; built Pi package import, real local comathd HTTP server, host-confirmed mutation, live campaign/agent command dispatch, project status, and resources discovery passed.

Phase 46 targeted validation:

- `node services/comathd/tests/unit/phase46-agent-log-stream.test.mjs`
- `node extensions/comath-pi/tests/phase46-agent-log-stream-tools.test.mjs`

Result: both exited 0; cursor-bounded service log polling, invalid-cursor rejection, audit events, Pi tool/command routing, and `proof_authority=none` metadata passed.

Phase 47 targeted validation:

- `node services/comathd/tests/unit/phase47-agent-log-subscription.test.mjs`
- `node extensions/comath-pi/tests/phase47-agent-log-subscription-tools.test.mjs`

Result: both exited 0; SSE-compatible log snapshot formatting, `text/event-stream` route headers/body, audit events, Pi text-client routing, and `proof_authority=none` payloads passed.

Phase 48 targeted validation:

- `node services/comathd/tests/unit/phase48-agent-operator-panel.test.mjs`
- `node extensions/comath-pi/tests/phase48-agent-operator-panel-tools.test.mjs`

Result: both exited 0; service-owned operator panel aggregation, route handling, action availability metadata, disabled-cancel semantics, audit events, Pi JSON routing, and `proof_authority=none` payloads passed.

Phase 49 targeted validation:

- `node services/comathd/tests/unit/phase49-agent-operator-cancel.test.mjs`
- `node extensions/comath-pi/tests/phase49-agent-operator-cancel-tools.test.mjs`

Result: both exited 0; same-process active scheduler cancellation, host-confirmed Pi cancellation, persisted cancelled state, audit events, and `proof_authority=none` payloads passed.

Phase 50 targeted validation:

- `node services/comathd/tests/unit/phase50-agent-log-session.test.mjs`
- `node extensions/comath-pi/tests/phase50-agent-log-session-tools.test.mjs`

Result: both exited 0; bounded multi-event SSE log-session responses, Pi text-client routing, audit events, max-event termination, and `proof_authority=none` payloads passed.

Phase 51 targeted validation:

- `node services/comathd/tests/unit/phase51-codex-api-backend.test.mjs`
- `node extensions/comath-pi/tests/phase51-codex-api-backend-tools.test.mjs`

Result: both exited 0; service-configured Codex API backend request shaping, API-key non-disclosure in prepare/Pi payloads, missing-key fail-closed behavior, Pi backend selection, and `proof_authority=none` wrapping passed with an injected client.

Phase 52 targeted validation:

- `node services/comathd/tests/unit/phase52-codex-api-retry-telemetry.test.mjs`

Phase 53 targeted validation:

- `node services/comathd/tests/unit/phase53-installed-codex-cli-validation.test.mjs`

Phase 54 targeted validation:

- `node services/comathd/tests/unit/phase54-lean-declaration-parser.test.mjs`

Result: exit 0; retryable 429/5xx handling, capped retry telemetry, exhausted-attempt fail-closed behavior, audit events, and API-key non-disclosure passed with an injected client.
- Phase 54 adds in-process declaration-header parsing and does not add a new external execution boundary; richer proof-producing logical-equivalence machinery remains a future proof-authority hardening target.
- Phase 38 loads native TriviumDB only through dynamic adapter probing and explicit evaluation. Broader multi-platform native benchmarking and production default-backend rollout remain separate decisions.

Phase 55 targeted validation:

- `node services/comathd/tests/unit/phase55-runner-cross-machine-replay.test.mjs`

Result: exit 0; snapshot replay verification rejects tampered-but-rehashed replay environment metadata with `runner_reexecution_environment_mismatch` and leaves `runner_reexecution` empty, so no child runner is launched under mismatched Node/platform/arch metadata.
- Phase 55 is an integrity drift gate only. It does not add OS-level isolation, enforced network denial, or dependency installation control.

Phase 56 targeted validation:

- `node services/comathd/tests/unit/phase56-lean-registered-logical-equivalence.test.mjs`

Result: exit 0; registered logical-equivalence witnesses require exact formal-spec/target matching, `lean_kernel_checked_equivalence`, witness artifact id, SHA-256 witness hash, and non-empty lemma names. Missing witness hash, missing lemma names, and wrong target signatures fail closed.
- Phase 56 adds no shell, network, parser execution, or broad proof-search surface; it is metadata-gated statement binding only.

Phase 57 targeted validation:

- `node services/comathd/tests/integration/phase57-ga-theorem-template-instantiation.test.mjs`

Result: exit 0; `0 + n = n` is classified into the service-owned `nat_zero_add` template, candidates and Lean files use fixed `Nat.zero_add` metadata, and promotion still requires final clean replay plus the ordinary gate.
- Phase 57 adds no dynamic command construction, no model-supplied Lean proof terms, and no new execution boundary.

Phase 58 targeted validation:

- `node services/comathd/tests/unit/phase58-mathprove-final-audit-runner.test.mjs`

Result: exit 0; the final-audit bridge invokes the real sibling `MathProve-Skill` `final_audit.py` through fixed argv, archives host-path-scrubbed `external-final-audit` reports, records steps/solution hashes, and keeps `gate_result=failed` with final-audit authority vetoes.
- Phase 58 adds a controlled external runner boundary but no model-supplied executable path, no shell string, no network authority, and no proof-authority escalation.

Phase 68 targeted validation:

- `node services/comathd/tests/integration/phase68-v3-negative-ga-slices.test.mjs`

Result: exit 0; the release negative GA slice runner wrote `.comath/release/v3_negative_ga_slices.json`, preserved evidence for statement drift, cheating Lean artifacts, false-theorem refutation, all-candidate failure recovery, and snapshot replay, and kept failed promotion attempts on the normal gate/audit path.
- Phase 68 adds no model-supplied executable path, no shell string, no direct Pi `.comath/` mutation, and no proof-authority escalation.
