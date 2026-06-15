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

Remaining caveat: full interactive validation with a live `comathd` install/start flow is a deployment-level check.
