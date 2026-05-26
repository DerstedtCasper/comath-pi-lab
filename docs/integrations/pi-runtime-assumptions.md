# Pi Runtime Assumptions

The current installation entry point is [Pi Installation And Local Integration](pi-installation.md). This file records the runtime assumptions that remain relevant when that installation path is exercised against an installed Pi runtime or a headless harness.

## Current Assumptions

- Node runtime: `>=22.19.0`.
- The local `comathd` endpoint defaults to `http://127.0.0.1:48731`.
- The local extension package path is `extensions/comath-pi`.
- The installable package manifest is `extensions/comath-pi/package.json#pi.extensions`, currently pointing at `./dist/pi-extension.js`.
- The default Pi extension entry registers tools and maps supported tool calls to local `comathd` HTTP routes.
- Official Pi package resources are constrained to `extensions`, `skills`, `prompts`, and `themes` by the current adapter contract.
- `createOfficialPiToolRegistrations` and `createOfficialPiManifest` remain compatibility helpers and test fixtures, not the primary installed package entry.
- Headless contexts expose no usable UI surface; adapters must avoid UI calls when `ctx.hasUI=false`.
- Mutating tools require host confirmation before they call `comathd`.
- Resource discovery means local skill, prompt, domain-pack, subagent, and artifact descriptor discovery; it is not a raw DB or `.comath/` resource surface.

## Historical Notes

Research Alpha treated Pi registration as a descriptor-level compatibility layer. Production Formal Workbench adds an installable local/npm package boundary and default runtime entry. Installed-runtime validation against the user's Pi binary remains external evidence, not a repository-only claim.

The assumed CLI names are:

```powershell
comathd serve
comath-lab project init
comath-lab research start
```

If the main CLI names change, update this file, `.pi/config.json`, and `docs/integrations/pi-installation.md` together.

