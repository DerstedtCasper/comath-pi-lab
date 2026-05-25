# Phase 10 Compute Runner Boundary

## Scope

Phase 10 introduces bounded compute runners with replay metadata. Runner output may become artifact and audit evidence. Runner output must not mutate claim status or trusted graph state directly.

## Files

Add:

- `python/exact_compute.py`
- `python/counterexample_search.py`
- `services/comathd/src/verification/runner-contracts.ts`
- `services/comathd/src/verification/sympy.ts`
- `services/comathd/src/verification/sage.ts`
- `services/comathd/src/verification/sat.ts`
- `services/comathd/tests/unit/phase10-compute-runners.test.mjs`

Avoid in Phase 10 unless explicitly serialized by the coordinator:

- `services/comathd/src/api/server.ts`
- `services/comathd/src/claim/claim-store.ts`
- `services/comathd/src/memory/*`
- broad changes to `services/comathd/src/types/schemas.ts`

## Required Invariants

- No general shell runner.
- Use a fixed runner registry mapping runner id to script path and argument schema.
- Spawn scripts with `shell:false`, fixed executable, bounded timeout, bounded output, and no network.
- Do not accept a user-supplied command string as execution authority.
- Exact symbolic output must reject decimal literals, Python floats, SymPy `Float`, approximate constants, and numerical sampling.
- Counterexample search is numeric/search evidence only; it cannot support `symbolically_checked`.
- Sage and SAT placeholders fail closed with structured JSON and `not_implemented` vetoes.
- Claim promotion stays a separate gate operation.

## Runner Result Metadata

Each result should include:

- `runner_id`
- `runner_version`
- `script_sha256`
- canonical input hash
- `seed` for search runners
- timeout and resource envelope
- canonical replay argv
- `cwd_policy: "project_root"`
- stdout/stderr hashes and truncation metadata
- output artifact id and SHA-256
- exactness classification
- vetoes and warnings

## Evidence Flow

1. Node builds canonical JSON input.
2. Python emits canonical JSON result.
3. Service writes a staging result under `.comath/artifacts/runner-staging` or another runtime-owned path.
4. Service imports the result through the content-addressed artifact store as `runner_output`.
5. Service appends `runner.completed` or `runner.failed`.
6. Service returns artifact ids and evidence candidates only.
7. Claim status remains unchanged.

## Tests

Required Phase 10 tests:

- shell metacharacters in input cannot affect execution;
- unknown runner id is rejected;
- timeout produces failed artifact/audit evidence;
- SymPy exact runner rejects decimal/float contamination;
- numeric counterexample output cannot request `symbolically_checked`;
- fixed seed produces byte-stable canonical result hash;
- artifact is registered as `runner_output`;
- audit events are emitted for success and failure;
- claim status stays unchanged after runner completion;
- Sage and SAT placeholders fail closed;
- stdout/stderr are bounded and hashed.
