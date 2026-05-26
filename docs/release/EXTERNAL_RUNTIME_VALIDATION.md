# External Runtime Validation

This document defines the evidence required before CoMath Pi Lab can be called GA.

Run:

```powershell
corepack pnpm external:check
```

By default the command reads `docs/release/external-runtime-evidence.json`. Use `COMATH_EXTERNAL_EVIDENCE` to point at a private evidence file.

Generate a template:

```powershell
corepack pnpm external:check -- --template
```

## Evidence File Contract

`external:check` validates the evidence file, not just its presence. The file must include:

- `schema_version: 1`;
- non-empty `reviewed_by`;
- ISO `reviewed_at`;
- every required check with `status: "passed"`;
- non-placeholder `evidence_uri`;
- ISO `completed_at`;
- non-placeholder required fields for that check;
- one or more `evidence_artifacts` entries with a local file `path` and matching lowercase SHA-256.

Placeholder strings such as `placeholder`, `todo`, `tbd`, `n/a`, `missing`, or blank values fail closed.

## Required Evidence

### Pi installed runtime validation

Evidence must identify the official Pi runtime version and show:

- extension registration succeeds;
- tool invocation succeeds through the installed runtime;
- cancellation signal is observed;
- headless context avoids UI calls;
- UI context calls only supported UI APIs;
- mutating tools require confirmation and call `comathd`.

### MathProve workspace runner validation

Evidence must show a full MathProve workspace run with:

- `problem.md`;
- assumptions and target status;
- MAGI/SymPy/Lean artifacts;
- final audit;
- manifest and durable logs;
- failure preservation;
- promotion gate binding.

MathProve remains evidence producer and gate runner, not proof authority.

### TriviumDB native validation

Evidence must show native TriviumDB on the target platform with:

- exact OS, Node, package, and Pi environment versions;
- backend selection audit;
- persistence and search checks;
- snapshot/restore checks;
- corruption/fallback behavior;
- performance thresholds.

TriviumDB remains a derived index; provenance and claim stores remain the truth source.

### runner re-execution replay validation

Evidence must show replay re-executes recorded runner commands with:

- dependency and version checks;
- stdout, stderr, and result hash verification;
- network denied unless declared;
- timeout and resource policy;
- pass/fail replay provenance.

Manifest verification alone is not runner re-execution replay validation.

### package metadata and artifacts

Evidence must show package and release artifacts with:

- semver values for every intended published package;
- license and notice review;
- `files`, `exports`, and `bin` boundaries where applicable;
- changelog or release notes;
- dry-run pack artifacts and checksums;
- artifact provenance.

Private packages may remain private, but GA evidence must explicitly state the intended distribution boundary.

### DLP and secret scanning

Evidence must show DLP and secret scanning with:

- documented release-export threat model;
- text, binary, archive, PDF, and generated artifact scan scope;
- machine-readable report path;
- remediation decision for every finding;
- fail-closed behavior for blocked imports and exports.

### locking stress

Evidence must show locking stress with:

- target Windows filesystem and Node version;
- process count and duration;
- crash recovery behavior;
- stale recovery behavior;
- duplicate-id and lost-update checks.

Distributed lock evidence is required before claiming distributed daemon support.
