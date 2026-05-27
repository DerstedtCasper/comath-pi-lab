# Pi Runtime Assumptions

Phase 26 revalidated the local Pi runtime against the installed Pi 0.75.5 packages.

Verified local facts:

- `pi --version` reports `0.75.5`.
- `pi --help` exposes extension loading through `--extension` and package `pi.extensions`.
- The installed package loader iterates `package.json` `pi.extensions` as extension entrypoint paths, so `@comath/pi-extension` uses `pi.extensions: ["./dist/index.js"]`.
- The default export in `extensions/comath-pi/dist/index.js` is the Pi runtime factory and registers executable research/campaign tools plus the supported `cm:*` commands.
- CoMath-specific safety and goal-continuation metadata is not treated as Pi's official manifest API. It lives under `pi.runtime_policy` and the named `runtime_registration` export.
- `global_rpm=4` is the user-approved global request budget for this goal run; it is a rate limit, not a Pi runtime version.

Runtime boundary:

- Trusted mathematical state remains `comathd_only`; the extension must not write `.comath/` directly.
- Pi is not proof authority. `runtime_registration.boundary.pi_session_is_math_authority` remains `false`.
- Mutating registered tools require Pi host-side confirmation before execution reaches `comathd`; the runtime tool schema does not expose `confirmation_id` as a model-supplied parameter.
- Descriptor-only tools remain listed by `createComathTools()` but are not registered into the production Pi runtime factory until executable handlers exist.

Remaining caveats:

- Phase 26 validates package manifest shape, dynamic import, default-export registration, fake Pi API registration, and installed Pi loader loading.
- A full interactive Pi session with a live `comathd` install/start flow remains a separate e2e target.
