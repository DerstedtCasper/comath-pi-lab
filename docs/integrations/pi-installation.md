# Pi Installation And Local Integration

This document records how CoMath Pi Lab connects to Pi from this worktree. The commands below match the local `comathd`/`comath-lab` CLI entry points and the package manifest in `extensions/comath-pi/package.json`.

## Local Configuration

The repository-safe Pi configuration lives under `.pi/`:

- `.pi/config.json` is the committed, no-secret local profile.
- `.pi/local.user.example.json` shows where a user can place machine-local overrides.
- `.pi/local.user.json` is the recommended real override path and is ignored by `.pi/.gitignore`.

The default local `comathd` endpoint is:

```powershell
http://127.0.0.1:48731
```

The default local Pi extension package path is:

```powershell
.\extensions\comath-pi
```

The examples use the bare `comathd` and `comath-lab` bin names. They are available after installing or linking the `@comath/comathd` workspace package; from an unlinked checkout, use the equivalent `corepack pnpm --filter @comath/comathd exec comathd ...` and `corepack pnpm --filter @comath/comathd exec comath-lab ...` forms.

## Route 1: Pi Local Package Install

Use this route when testing this worktree directly without publishing a package.

```powershell
corepack pnpm install --frozen-lockfile
corepack pnpm --filter @comath/comathd build
corepack pnpm --filter @comath/pi-extension build
comathd serve --host 127.0.0.1 --port 48731
pi install -l .\extensions\comath-pi
```

In the Pi runtime, install or link the local extension package from:

```powershell
<repo-root>\extensions\comath-pi
```

Then initialize the local project:

```powershell
comath-lab project init --root "<repo-root>" --comathd http://127.0.0.1:48731
comath-lab research start --root "<repo-root>" --comathd http://127.0.0.1:48731
```

Expected result: Pi registers the CoMath extension, tools call `comathd`, mutating tools require confirmation, and no extension code writes trusted `.comath/` state directly.

## Route 2: npm Package Install

Use this route after package metadata and artifacts are ready for the intended distribution boundary.

```powershell
pi install npm:@comath/pi-extension@0.0.0
comathd serve --host 127.0.0.1 --port 48731
comath-lab project init --root "<repo-root>" --comathd http://127.0.0.1:48731
comath-lab research start --root "<repo-root>" --comathd http://127.0.0.1:48731
```

Package install does not weaken the local safety model. The installed package must still route trusted mutations through `comathd`, keep confirmation on mutating tools, and avoid committing runtime state or credentials.

## Route 3: External CLI Or Headless Harness

Use this route when an external controller starts Pi or a headless Pi-compatible harness around the local `comath-lab`.

```powershell
comathd serve --host 127.0.0.1 --port 48731
comath-lab project init --root "<repo-root>" --comathd http://127.0.0.1:48731
comath-lab research start --root "<repo-root>" --comathd http://127.0.0.1:48731 --headless
```

Headless mode must set or emulate a context where UI calls are unavailable. The Pi adapter is expected to avoid UI calls when `ctx.hasUI=false`; runtime validation must prove this against the installed Pi version or harness.

## Security And Research Integrity Boundary

- Pi packages have local machine permissions. Audit package source and installation paths before enabling mutating tools.
- Do not store secrets in `.pi/config.json`, `.pi/local.user.example.json`, documentation, prompts, or committed package metadata.
- Keep real credentials in the Pi runtime secret store, the OS credential manager, or another untracked secret location outside this repository.
- `comathd` is the single trusted mutation gateway for project memory, claims, artifacts, provenance, snapshots, and runtime DB files.
- TriviumDB remains optional and derived. If native TriviumDB is unavailable or unsafe on the target runtime, CoMath must fall back rather than blocking basic audited operation.
- MathProve remains an evidence producer and gate runner. It can contribute manifests, logs, Lean/SymPy/MAGI artifacts, vetoes, and warnings, but it is not proof authority by itself.
- Claim promotion remains fail-closed. A claim cannot advance to a stronger status without the required evidence and gate decision.

## Validation Evidence

Before GA, the installed target runtime must produce evidence for the Pi runtime, MathProve workspace runner, native TriviumDB behavior, package artifacts, DLP scanning, replay, and locking stress. See `docs/release/EXTERNAL_RUNTIME_VALIDATION.md`.
