# Pi Runtime Assumptions

CoMath Pi Lab treats Pi as a thin, host-confirmed interaction layer over `comathd`.

Expected runtime shape:

- the Pi extension package exposes a default runtime factory;
- package metadata declares extension entrypoints through `pi.extensions`;
- executable research, campaign, agent, paper, claim, and release tools are registered through the extension;
- CoMath-specific safety metadata lives under `pi.runtime_policy` and the named `runtime_registration` export.

Runtime boundary:

- Trusted mathematical state remains `comathd_only`.
- The extension must not write `.comath/` directly.
- Pi is not proof authority.
- Mutating registered tools require host-side confirmation before execution reaches `comathd`.
- The runtime tool schema must not expose `confirmation_id` as a model-supplied parameter.
- Descriptor-only tools may be listed before executable handlers exist, but production registration should expose only supported handlers.

## External harness operator path

An external harness may use the packaged `comath-pi-operator` command through Pi. It sends a versioned request with a stable `request_id` and an allowlisted operator tool name; Pi returns a `comath.operator.response.v1` custom message that echoes the same request ID. A transport-level response means the operator request was handled, not that research or proof work completed. Clients read the durable campaign receipt or event cursor for business state.

Handoff state is non-authoritative and remains outside `.comath/`. It may retain the project binding, campaign ID, start command ID, last event sequence, and one pending mutation. A lost response is retried with the identical command ID and payload. It must not cause a second campaign to be created.

The operator credential can control research but cannot issue host approval tickets or approve a formal scope. `ctx.hasUI`, a model tool call, or a harness message is not a human confirmation and cannot establish proof authority.

Remaining caveat: full interactive validation with a live `comathd` install/start flow is a deployment-level check.
