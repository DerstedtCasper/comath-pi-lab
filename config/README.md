# Config Samples

This directory contains non-secret configuration examples. Do not commit live credentials, API keys, private paths, paid-provider account details, provider transcripts, or user paper corpora.

Runtime configuration is owned by `comathd`; Pi may select declared options but must not receive secret values.

## Durable research service

Use absolute project/config paths with `comathd doctor --project-root <path> --config <path>` or `comathd serve --project-root <path> --config <path>`. The sample keeps research execution disabled, declares no paid provider or campaign budget, and uses separate loopback operator and worker listeners. `--host` and `--port` override the operator listener only.

The doctor inspects configuration, runtime binary hashes, SQLite availability and explicitly configured credential environment-variable presence. It does not execute a runtime, start a model turn, provision a sandbox or modify Codex configuration. Active WAL data may require a consistent snapshot; that diagnostic is not a failed migration and must not be relabeled verified.

Host-installed adapters resolve the `research.runtimes[*].kind` identifiers. Naming a kind does not install or authorize it. Missing execution consumers remain blocked before launch. Sandbox rollout is deferred; a process-management boundary does not certify isolation. Runtime/provider configuration is separate from operator access: the user's familiar harness can invoke the same Pi external commands used in the manual Pi workbench workflow.

The daemon acquires one owner per canonical project, recovers durable state before starting listeners/scheduling, and stops new grants before draining shutdown. An unconfirmed process keeps its durable reservations; a still-running application callback prevents the owner/store from being released underneath it. `SIGINT`/`SIGTERM` and embedded `close()` share the shutdown path. Forced process termination requires recovery on the next start.

## Provider Helper Handles

Adapter OS-isolation provider helpers are configured outside the sample with absolute service-owned executable paths. macOS is outside the current GA environment-adaptation scope.

Provider-specific helper handles:

- `COMATH_AGENT_ADAPTER_OSISO_OCI_HELPER`
- `COMATH_AGENT_ADAPTER_OSISO_NIX_HELPER`
- `COMATH_AGENT_ADAPTER_OSISO_FIREJAIL_HELPER`
- `COMATH_AGENT_ADAPTER_OSISO_WINDOWS_APPCONTAINER_HELPER`
- `COMATH_AGENT_ADAPTER_OSISO_PROVIDER_HELPER` as host-only fallback

Optional fixed helper argument prefixes may be configured with bounded JSON string arrays:

- `COMATH_AGENT_ADAPTER_OSISO_OCI_HELPER_ARGS_JSON`
- `COMATH_AGENT_ADAPTER_OSISO_NIX_HELPER_ARGS_JSON`
- `COMATH_AGENT_ADAPTER_OSISO_FIREJAIL_HELPER_ARGS_JSON`
- `COMATH_AGENT_ADAPTER_OSISO_WINDOWS_APPCONTAINER_HELPER_ARGS_JSON`
- `COMATH_AGENT_ADAPTER_OSISO_PROVIDER_HELPER_ARGS_JSON` as fallback

Provider-specific variables take precedence over fallback variables.

## Collection And Live Probes

Collection probes and live probes are configured separately from helper execution assets. They are service-owned subprocesses invoked with `shell=false`, fixed argv/env, and disabled-network proof-authority metadata.

Collection probe handles:

- `COMATH_AGENT_ADAPTER_OSISO_OCI_COLLECTION_PROBE`
- `COMATH_AGENT_ADAPTER_OSISO_NIX_COLLECTION_PROBE`
- `COMATH_AGENT_ADAPTER_OSISO_FIREJAIL_COLLECTION_PROBE`
- `COMATH_AGENT_ADAPTER_OSISO_WINDOWS_APPCONTAINER_COLLECTION_PROBE`
- `COMATH_AGENT_ADAPTER_OSISO_PROVIDER_HELPER_COLLECTION_PROBE` as fallback

Live probe handles:

- `COMATH_AGENT_ADAPTER_OSISO_OCI_LIVE_PROBE`
- `COMATH_AGENT_ADAPTER_OSISO_NIX_LIVE_PROBE`
- `COMATH_AGENT_ADAPTER_OSISO_FIREJAIL_LIVE_PROBE`
- `COMATH_AGENT_ADAPTER_OSISO_WINDOWS_APPCONTAINER_LIVE_PROBE`
- `COMATH_AGENT_ADAPTER_OSISO_PROVIDER_SPECIFIC_LIVE_PROBE` as fallback

All probe output is provenance/readiness material only. Missing, mismatched, incomplete, stale, caller-supplied, or success-shaped probe material becomes a replayable blocker and does not alter Lean proof authority.

## Public Sample Policy

Samples may document provider families, disabled network policy, no-new-privileges requirements, and path-free tool family names. They must not include helper paths, daemon/socket/container state, image names, account details, command output, proof claims, production credentials, or host-specific runtime paths.
