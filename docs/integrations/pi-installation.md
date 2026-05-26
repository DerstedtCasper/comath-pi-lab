# Pi Installation And SDK Orchestration

This document records the supported Pi connection path for CoMath Pi Lab. The product control surface is the official Pi package, extension, SDK, and RPC layer; `comathd` remains the local single-write service behind that layer.

## Local Configuration

The repository-safe Pi configuration lives under `.pi/`:

- `.pi/settings.json` is the project-level Pi settings file. It points Pi at the local package source `../extensions/comath-pi`, relative to `.pi/`.
- `.pi/config.json` is the committed no-secret CoMath profile.
- `.pi/local.user.example.json` shows the shape for machine-local overrides.
- `.pi/local.user.json` is the recommended real override path and is ignored by `.pi/.gitignore`.

The default local `comathd` endpoint is:

```powershell
http://127.0.0.1:48731
```

The default local Pi extension package path is:

```powershell
.\extensions\comath-pi
```

## Route 1: Simplified Local Pi Package Install

Use this route when testing this worktree directly without publishing a package.

```powershell
corepack pnpm install --frozen-lockfile
corepack pnpm --filter @comath/comathd build
corepack pnpm --filter @comath/pi-extension build
node .\services\comathd\dist\cli.js serve --host 127.0.0.1 --port 48731
pi install -l .\extensions\comath-pi
```

Because `.pi/settings.json` already records `../extensions/comath-pi`, Pi can also load the project-local package from the current repository settings after dependencies and build artifacts exist. Installed-runtime validation must still be run against the user's actual Pi binary and configuration.

Expected result: Pi loads `extensions/comath-pi/package.json#pi.extensions`, imports `dist/pi-extension.js`, registers TypeBox-backed CoMath tools and commands through the official Pi extension API, and calls `comathd` for trusted project state.

## Route 2: npm Package Install

Use this route after package metadata and artifacts are ready for the intended distribution boundary.

```powershell
pi install npm:@comath/pi-extension@0.0.0
node .\services\comathd\dist\cli.js serve --host 127.0.0.1 --port 48731
```

Package install does not weaken the local safety model. The installed package must still route trusted mutations through `comathd`, keep mutation confirmation fail-closed, and avoid committing runtime state or credentials.

## Route 3: Pi SDK Or RPC Orchestration

External controllers should drive CoMath through Pi, not by bypassing Pi with a separate CoMath control plane.

For Node/TypeScript harnesses, use Pi SDK `createAgentSession()` with a `DefaultResourceLoader` that either discovers `.pi/settings.json` from the project root or explicitly passes the local package/extension through `additionalExtensionPaths` or `extensionFactories`. For language-neutral controllers, use Pi RPC mode:

```powershell
pi --mode rpc
```

The CoMath extension exposes `comath.research.start` as the SDK-oriented entry tool. A Pi SDK/RPC caller can invoke that tool with:

```json
{
  "root_path": "<repo-root-or-project-root>",
  "name": "CoMath Project",
  "goal": "Start a bounded mathematical research workflow.",
  "kind": "proof_route",
  "actor": "pi-sdk",
  "headless": true
}
```

The tool performs the same service-side workflow as the development CLI's research start path:

1. `POST /project/init`
2. `POST /workstream/spawn`

It returns a Pi tool result whose `details` contain `{ ok, headless, project, runtime_root, workstream }`.

Other registered tools cover the full daemon research surface rather than a separate CoMath control plane:

- service and project lifecycle: health, project init/open/status;
- claim and evidence state: claim register/get/update/link/promotion request, evidence attach;
- artifacts and provenance: artifact import/list, working-paper init/state/update/render/check/export, snapshot export/verify/restore, replay-manifest verification;
- workstreams and graph evolution: spawn/status/list/bundle/report/transition, GraphPatch propose/review/apply;
- research memory and literature: memory health/rebuild/search/context-pack, BibTeX/PDF import, citation registration, citation-condition check, literature list.

All trusted mutations go through `comathd`. The Pi SDK/RPC layer is therefore the product control plane, while `comathd` remains the auditable mutation gateway and local service boundary.

## Development CLI Fallback

The `comathd` package still exposes `comathd` and `comath-lab` bin names for local smoke tests and operations after the package is installed or linked. From an unlinked checkout, use the checked-in build artifact entrypoint:

```powershell
node .\services\comathd\dist\cli.js health --base-url http://127.0.0.1:48731
node .\services\comathd\dist\cli.js research start --root "<repo-root>" --base-url http://127.0.0.1:48731 --goal "Start a bounded mathematical research workflow."
```

This CLI is not the product orchestration contract. The product contract is Pi SDK/RPC loading the installed extension package and invoking registered CoMath tools.

## Security And Research Integrity Boundary

- Pi packages have local machine permissions. Audit package source and installation paths before enabling mutating tools.
- Do not store secrets in `.pi/config.json`, `.pi/local.user.example.json`, `.pi/settings.json`, documentation, prompts, or committed package metadata.
- Keep real credentials in the Pi runtime secret store, the OS credential manager, or another untracked secret location outside this repository.
- `comathd` is the single trusted mutation gateway for project memory, claims, artifacts, provenance, snapshots, and runtime DB files.
- The Pi extension installs a `tool_call` confirmation gate for CoMath mutating tools. In headless/RPC contexts without a confirmation UI or host policy, the gate fails closed.
- TriviumDB remains optional and derived. If native TriviumDB is unavailable or unsafe on the target runtime, CoMath must fall back rather than blocking basic audited operation.
- MathProve remains an evidence producer and gate runner. It can contribute manifests, logs, Lean/SymPy/MAGI artifacts, vetoes, and warnings, but it is not proof authority by itself.
- Claim promotion remains fail-closed. A claim cannot advance to a stronger status without the required evidence and gate decision.

## Validation Evidence

Before GA, the installed target runtime must produce evidence for the Pi runtime, MathProve workspace runner, native TriviumDB behavior, package artifacts, DLP scanning, replay, and locking stress. See `docs/release/EXTERNAL_RUNTIME_VALIDATION.md`.
