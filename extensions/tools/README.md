# Extension Tools

Research Alpha plus Phase 18 tool descriptors live in `extensions/comath-pi/src/index.ts`.

Implemented descriptor groups:

- project open/status;
- claim register/get/promotion request;
- evidence attach placeholder;
- GraphPatch proposal;
- working paper init/state/update/render/check/export;
- snapshot export/verify/restore;
- replay manifest verification.
- research campaign start/status/tick/next-actions/final-audit/replay.

Descriptors are not direct runtime mutations by themselves. Mutating tools are marked `mutates=true` and must pass host confirmation before a Pi runtime calls `comathd`. Read-only dashboard code must not import these descriptors as a shortcut to write `.comath/` state directly.
