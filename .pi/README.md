# Local Pi Configuration

This directory contains auditable, repository-safe Pi configuration for the local production formal workbench. It is intentionally not a credentials directory.

## Files

- `config.json`: committed default profile for local development. It records the expected `comathd` base URL, local Pi extension path, external CLI command assumptions, and safety boundaries.
- `local.user.example.json`: copy shape for machine-local overrides. If a real override is needed, use `.pi/local.user.json`; that path is ignored by `.pi/.gitignore`.
- `agents/` and `prompts/`: local Pi-facing research agent and prompt resources.

## Local Defaults

- `comathd.baseUrl`: `http://127.0.0.1:48731`
- Pi extension local package path: `./extensions/comath-pi`
- Expected local service command: `comathd serve --host 127.0.0.1 --port 48731`
- Expected project initialization command: `comath-lab project init`
- Expected research entry command: `comath-lab research start`

The command names are current integration assumptions for the local worker branch. If the main CLI names change, update `docs/integrations/pi-installation.md` and this directory together.

## Safety Boundary

Pi packages and local harnesses can have broad machine access. Do not commit secrets, access tokens, private certificates, cookies, SSH material, or personal service credentials here. `comathd` remains the only trusted mutation gateway; TriviumDB is optional derived memory with fallback behavior; MathProve is an evidence producer and gate runner, not proof authority.
