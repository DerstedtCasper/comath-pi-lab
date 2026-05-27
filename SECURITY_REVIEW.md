# SECURITY REVIEW

## Phase 0

No runtime code capable of path writes, shell execution, network calls, claim promotion, or database mutation has been implemented.

Security requirements queued for later phases:

- path policy before artifact import;
- fail-closed runner sandbox;
- secret scanning before snapshot/replay;
- `.comath/` ignored by Git;
- no direct TriviumDB FFI hooks by default;
- no arbitrary workstream shell execution.

## Phase 1

Security-relevant contract hardening is in place:

- GraphPatch cannot directly mutate protected claim promotion fields.
- privileged claim statuses require gate identity at schema level.
- `formally_checked` requires kernel/audit/dependency closure metadata.
- TriviumDB native integration remains absent from dependencies and runtime code.

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
7. **TriviumDB remains optional.** No ordinary dependency or eager native import exists; native loading stays behind capability probing and adapter boundaries.
8. **Replay integrity checks include internal run hashes.** Snapshot verification validates replay manifest `runs_sha256` values so hand-edited replay metadata fails closed.
9. **Snapshot/replay are exposed only through `comathd`.** HTTP routes now cover snapshot export, verify, restore, and replay-manifest verification; Pi extension entries are descriptors/commands only and do not read or write `.comath/` directly.
10. **Phase 18 proof-kernel replay remains service-owned.** Campaign routes, candidate artifacts, Lean replay outputs, and counterexample evidence write only under path-policy-controlled `.comath/` directories; Pi campaign tools call `comathd` and do not mutate trusted files directly.
11. **Formal promotion requires replay evidence.** The gate rejects preloaded kernel metadata unless the requested artifacts include a passed proof-kernel `final_replay_manifest.json` for the same claim.
12. **Compute runner replay no longer trusts manifest descriptors alone.** Strict `/replay/verify-manifest` reconstructs allowlisted runner commands from service code, uses persisted canonical runner input, and fails closed on replay/report drift, static snapshot vetoes before Python execution, script hash drift, input hash drift, oversized replay timeout, report-local stdio hash drift, untrusted replay argv, runner-version drift, nonzero exit, timeout, invalid JSON, runner ID mismatch, and result hash mismatch.

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

### Residual Risks

- Secret scanning is pattern-based. It is suitable as a fail-closed Research Alpha import/export gate but not a full DLP classifier.
- Snapshot manifests are integrity-checked but not cryptographically signed by an external trust anchor. Untrusted imported snapshots still require operator review and future signature support.
- Snapshot/replay verifies deterministic envelopes and stale outputs, Phase 18 reruns the campaign Lean proof replay after restore, and Phase 24 reruns the implemented Python compute runners through strict replay. Stronger OS-level sandboxing, network-denial enforcement, dependency lock capture, and cross-machine replay validation remain deferred.
- `comathd` still lacks lock/session semantics for multi-process writers; current tests exercise single-process Research Alpha behavior.
- Production Pi runtime permissions must be revalidated before enabling installed runtime registration.
