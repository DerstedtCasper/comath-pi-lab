# Local Pi Configuration

This directory contains auditable, repository-safe Pi configuration for the local production formal workbench. It is intentionally not a credentials directory.

## Files

- `settings.json`: project-level Pi settings. It declares the local package source `../extensions/comath-pi`, relative to `.pi/`.
- `config.json`: committed CoMath profile for local development. It records the `comathd` base URL, Pi package path, SDK/RPC orchestration assumptions, development CLI fallback, and safety boundaries.
- `local.user.example.json`: copy shape for machine-local overrides. If a real override is needed, use `.pi/local.user.json`; that path is ignored by `.pi/.gitignore`.
- `agents/` and `prompts/`: local Pi-facing research agent and prompt resources.

## Local Defaults

- `comathd.baseUrl`: `http://127.0.0.1:48731`
- Pi project package source: `../extensions/comath-pi`
- Pi extension local package path: `./extensions/comath-pi`
- Pi extension entry: `./dist/pi-extension.js`
- SDK/RPC research entry tool: `comath.research.start`
- SDK/RPC tool groups: service, project, claim, evidence, artifact, workstream, graph patch, memory, literature, paper, snapshot, replay, status

`comathd` and `comath-lab` remain development CLI fallbacks for local smoke tests and operations. The product control surface is Pi SDK/RPC invoking registered CoMath tools.

## Safety Boundary

Pi packages and local harnesses can have broad machine access. Do not commit secrets, access tokens, private certificates, cookies, SSH material, or personal service credentials here. `comathd` remains the only trusted mutation gateway; mutating CoMath tools fail closed without confirmation; TriviumDB is optional derived memory with fallback behavior; MathProve is an evidence producer and gate runner, not proof authority.
