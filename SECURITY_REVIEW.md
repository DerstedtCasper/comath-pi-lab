# SECURITY REVIEW

## Current Security Verdict

Current status: **Production Formal Workbench Core, not GA**.

The local trusted-state boundary has been strengthened beyond the prior Research Alpha/early production-core state. Append-only audit, provenance, gate-result, and mutation ledgers use collision-resistant IDs rather than read-then-sequential allocation. Gate results are appended rather than file-rewritten. Promotion artifact verification hashes and sizes the same open file descriptor. Claim promotion and formal-proof metadata writers use claim-version compare-and-swap protection to avoid stale writers resurrecting older mathematical statements. Session lock release now requires a `lock_id` capability token and cleans recovery sentinels after malformed lock reads.

Residual blockers for external GA remain: installed Pi runtime validation, full MathProve workspace-runner validation, native TriviumDB target validation, runner re-execution replay, package/release artifact provenance, DLP-grade release scanning, and multi-process locking stress evidence.

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

### Residual Risks

- Secret scanning is pattern-based. It is suitable as a fail-closed Research Alpha import/export gate but not a full DLP classifier.
- Snapshot manifests are integrity-checked but not cryptographically signed by an external trust anchor. Untrusted imported snapshots still require operator review and future signature support.
- Snapshot/replay verifies deterministic envelopes and stale outputs, but does not re-execute runner commands.
- `comathd` still lacks lock/session semantics for multi-process writers; current tests exercise single-process Research Alpha behavior.
- Production Pi runtime permissions must be revalidated before enabling installed runtime registration.

## Production Formal Workbench Security Delta

### New Security-Relevant Surfaces

- Formal proof run store: `.comath/evidence/formal-proof-runs.jsonl`.
- Provenance ledger: `.comath/provenance/events.jsonl`.
- Paper span store: `.comath/artifacts/papers/spans.json`.
- Session lock and mutation queue: `.comath/session/lock.json` and `.comath/session/mutations.jsonl`.
- Pi official adapter: `extensions/comath-pi/src/pi-official-adapter.ts`.
- MathGraphIndex wrapper over `ResearchMemoryDB` and optional TriviumDB.
- MathProve run manifest embedded in bridge reports, audit payloads, and provenance events.

### Closed Or Reduced Risks

1. **Formal proof authority is now evidence-bound and multi-authority.** `formally_checked` promotion requires a trusted Lean4 proof run bound to the same claim and requested proof/log artifacts, plus separate formalization, dependency-closure, and proof-audit certification provenance. Reported kernel checks containing `sorry` or `admit` fail schema validation, and caller-supplied Lean executables are recorded as fail-closed runs rather than executed as proof authority.
2. **MathProve bridge output is manifest-bound but not trusted as proof.** MathProve reports are parsed, archived as artifacts, registered as evidence, and emitted into provenance. They feed vetoes/warnings into the ordinary gate rather than mutating claims directly.
3. **Provenance is append-only.** Formal proof runs, MathProve runs, paper spans, and index rebuilds produce provenance records under service-owned runtime paths.
4. **Session coordination exists for local writers.** Active lock acquisition uses exclusive file creation and fails closed, stale lock recovery is explicit and serialized with a recovery mutex, release is owner-checked, and mutation queue records are append-only with collision-resistant default IDs.
5. **Pi adapter remains a client boundary.** The official adapter converts descriptors and validates manifest keys but does not read or write `.comath/`, import service internals, or call UI methods when `ctx.hasUI=false`.
6. **TriviumDB remains a derived index.** MathGraphIndex health states that the provenance ledger is the truth source and Trivium/native state is optional, rebuildable, and degradable.
7. **Runtime layout reserves production directories.** Project initialization now creates `provenance/` and `session/` under `.comath`, so security scans and backups can treat them as expected runtime surfaces.
8. **Public barrels no longer export raw trusted-state writers.** `appendFormalProofRun`, `applyGatePromotedClaim`, and `applyClaimPromotionDecision` are not exported from `services/comathd/src/index.ts`; public promotion and proof authority must pass through gate/check APIs.
9. **Runtime JSON schema exports are real artifacts.** The runtime `jsonSchemas` registry loads root schema artifacts and no longer exposes placeholder object-only contracts.

### Required Invariants Going Forward

- Lean proof execution, proof artifacts, and logs must remain path-policy-confined and artifact-hashed before promotion.
- MathProve manifests are untrusted inputs until parsed, archived, and passed through the ordinary gate.
- TriviumDB corruption or absence must degrade indexing/search behavior without corrupting claims, evidence, ledger, paper state, or proof authority.
- Pi official adapter code must remain free of direct service-internal imports and direct runtime filesystem access.
- Session locks are local project coordination. A future distributed daemon mode must add a stronger lock backend rather than overclaim this file lock.

### Focused Validation

```text
corepack pnpm --filter @comath/comathd build
Result: exit 0.

node services/comathd/tests/unit/phase18-formal-proof-authority.test.mjs
Result: exit 0 after second reviewer remediation; covers proof-run authority, no `sorry`/`admit`, hidden raw append API, caller-supplied executable rejection, separate formalization/dependency/audit certification, and gate binding.

node services/comathd/tests/unit/phase19-provenance-ledger.test.mjs
Result: covered by the fresh full-root verification below; covers append/read/filter and path-policy confinement.

node services/comathd/tests/unit/phase21-session-lock.test.mjs
Result: exit 0 after second reviewer remediation; covers active-lock rejection, recovery mutex behavior, stale recovery, owner release, and distinct mutation queue IDs.

node extensions/comath-pi/tests/phase18-pi-official-adapter.test.mjs
Result: covered by the fresh full-root verification below; covers official adapter shape and headless UI safety.
```

Fresh full-root verification completed on 2026-05-26:

```text
corepack pnpm build
Result: exit 0; root recursive build passed.

corepack pnpm typecheck
Result: exit 0; root recursive typecheck passed.

corepack pnpm test
Result: exit 0; Phase 0 smoke, Pi extension tests, comathd Phase 0-21 tests, and Phase 17 integrity evaluation passed.

Test-Path -LiteralPath 'D:\MATH _Studio\comath-pi-lab\.worktrees\production-formal-workbench\.comath'
Result: False; no worktree-root runtime state was left behind.
```

### Residual Risks

- The lock is a local file coordination mechanism, not distributed consensus.
- Pi official runtime behavior must still be validated against the installed official Pi runtime.
- Native TriviumDB behavior remains a target-platform dependency risk.
- Formal proof logs/artifacts require continued secret/path scanning when imported, snapshotted, or exchanged.
- A full MathProve skill workspace runner remains future work beyond the current fail-closed manifest bridge.
