# Pi Runtime Assumptions

The current installation entry point is [Pi Installation And SDK Orchestration](pi-installation.md). This file records the runtime assumptions that remain relevant when that installation path is exercised against an installed Pi runtime, Pi SDK harness, or Pi RPC controller.

## Current Assumptions

- Node runtime: `>=22.19.0`.
- The local `comathd` endpoint defaults to `http://127.0.0.1:48731`.
- The project-level Pi settings file is `.pi/settings.json`.
- `.pi/settings.json` resolves package paths relative to `.pi/`, so the local package source is `../extensions/comath-pi`.
- The installable package manifest is `extensions/comath-pi/package.json#pi.extensions`, currently pointing at `./dist/pi-extension.js`.
- The default Pi extension entry is an official Pi extension factory. It uses `pi.registerTool()`, `pi.registerCommand(name, options)`, and `pi.on("tool_call", ...)`.
- `comath.research.start` is the SDK/RPC entry tool for starting a CoMath workflow. It initializes a project and spawns the first bounded workstream through `comathd`.
- Registered Pi tools use TypeBox-backed JSON Schema parameters, matching Pi's documented `ToolDefinition.parameters` contract while keeping the emitted schema inspectable as ordinary JSON Schema.
- Registered Pi tools cover the daemon research route groups for service health, project lifecycle, claims, evidence, artifacts, workstreams, GraphPatch review/apply, memory index, literature, working paper, snapshots, replay, and status snapshots.
- Pi SDK orchestration should use `createAgentSession()` with `DefaultResourceLoader`, `.pi/settings.json`, `additionalExtensionPaths`, or `extensionFactories`.
- Non-Node controllers should use `pi --mode rpc` instead of a CoMath-specific external control plane.
- Mutating CoMath tools call `comathd` and are guarded by a Pi `tool_call` confirmation gate. Headless contexts without an explicit confirmation mechanism fail closed.
- Headless contexts expose no usable UI surface; adapters must avoid UI calls when `ctx.hasUI=false`.
- Resource discovery means local skill, prompt, domain-pack, subagent, and artifact descriptor discovery; it is not a raw DB or `.comath/` resource surface.

## Development Fallback

The `comathd` and `comath-lab` bin names remain useful for local smoke tests and operations after the workspace package is installed or linked. In an unlinked checkout, use:

```powershell
node .\services\comathd\dist\cli.js serve --host 127.0.0.1 --port 48731
node .\services\comathd\dist\cli.js research start --root "<repo-root>" --base-url http://127.0.0.1:48731 --goal "Start a bounded mathematical research workflow."
```

Those commands are not the product orchestration contract. The product contract is Pi SDK/RPC loading the installed extension package and invoking registered CoMath tools.

## Historical Notes

Research Alpha treated Pi registration as a descriptor-level compatibility layer. Production Formal Workbench adds an installable local/npm package boundary and a default runtime entry that registers with official Pi APIs. Current repository validation covers the source-level SDK contract, package manifest, fake Pi registration, and local `comathd` route execution. Installed-runtime validation against the user's Pi binary and RPC controller remains external evidence, not a repository-only claim.
