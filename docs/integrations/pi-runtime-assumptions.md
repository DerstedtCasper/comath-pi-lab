# Pi Runtime Assumptions

Official Pi documentation is the API authority for Phase 6. The current planning assumptions are:

- Node runtime: `>=22.19.0`.
- TypeScript extensions are runtime-loaded by Pi tooling.
- Commands and tools are supported extension concepts.
- Tool parameters should follow official Pi docs for the installed version.
- Resource discovery currently means skill, prompt, and theme discovery, not a generic MCP resource contract.
- Permission is implemented as a tool-call gate pattern until a separate stable permission API is verified.
- Subagent support is treated as a workflow/tooling pattern until a first-class API is verified.

Phase 6 must re-check the installed Pi version before implementation.

