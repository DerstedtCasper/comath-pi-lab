# GA Release Checklist

CoMath Pi Lab is currently **Production Formal Workbench Core, not GA**.

The repository can now enforce local and CI-equivalent release readiness, but a public GA release remains blocked until the external runtime evidence below is collected and reviewed.

## Required Release Gates

| Gate | Required Evidence | Current Status |
| --- | --- | --- |
| CI workflow | `.github/workflows/ci.yml` runs install, build, typecheck, test, and release readiness checks. | Required for every PR. |
| Local CI equivalent | `corepack pnpm run ci` exits 0 on the target release commit. | Required before tagging. |
| Release readiness | `corepack pnpm release:check` exits 0 and verifies release docs, CI workflow, scripts, and no root `.comath`. This is a repository contract check, not GA certification. | Required before tagging. |
| Pi installed runtime validation | Installed official Pi runtime registers tools, invokes tools, handles cancellation, respects headless/UI context, and enforces mutation confirmation. | GA blocker. |
| MathProve workspace runner validation | Full workspace run produces problem, assumptions, MAGI/SymPy/Lean artifacts, final audit, manifest, durable logs, and promotion-gate binding. | GA blocker. |
| TriviumDB native validation | Target OS/Node runtime installs native backend and passes persistence, search, snapshot/restore, fallback, and performance checks. | GA blocker. |
| runner re-execution replay validation | Runner replay re-executes recorded runner argv in a controlled environment, verifies hashes, denies undeclared network, and records provenance. | GA blocker. |
| package metadata and artifacts | Intended publishable packages have semver, license, files/exports/bin as applicable, changelog, provenance, and dry-run pack artifacts. | GA blocker. |
| DLP and secret scanning | Release export gate has a documented threat model and machine-readable report for text/binary/archive/PDF inputs. | GA blocker. |
| locking stress | Multi-process local stress test covers crash recovery and stale recovery on Windows target filesystem. Distributed lock required only if distributed daemon mode is claimed. | GA blocker for multi-daemon claims. |

The tag/release workflow `.github/workflows/release-guard.yml` runs `corepack pnpm external:check` and is expected to fail until all GA blocker evidence is attached. `external:check` requires `schema_version=1`, reviewer signoff, non-placeholder check fields, and local evidence artifacts with matching SHA-256 hashes.

## Release Commands

```powershell
corepack pnpm install --frozen-lockfile
corepack pnpm run ci
corepack pnpm release:check
corepack pnpm external:check
```

`external:check` is expected to fail until `docs/release/external-runtime-evidence.json` or `COMATH_EXTERNAL_EVIDENCE` points to reviewed target-runtime evidence.

## No-GA Rule

Do not publish, tag, or announce a GA release while any GA blocker above lacks target-runtime evidence.
