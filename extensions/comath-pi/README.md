# CoMath Pi Extension

Runtime registration package for the CoMath Pi Lab thin client.

The extension declares commands, tools, resources, permission policy, and the
bounded Pi goal continuation contract. Trusted mathematical state remains owned
by `comathd`; this package must not write `.comath/` runtime state directly.

The published package includes `skills/comath-pi-operator/` for the supported
external-harness → Pi RPC → CoMath path. The helper loads the selected extension
and optional packaged skill explicitly, never grants host approval, and records
only non-authoritative recovery state outside `.comath/`. Its portable argv
arrays and current Pi compatibility envelope are documented in the packaged
protocol reference and `docs/integrations/pi-runtime-assumptions.md`.
