# Config Samples

This directory contains non-secret configuration examples. Do not commit live credentials, API keys, private paths, paid-provider account details, provider transcripts, or user paper corpora.

Runtime configuration is owned by `comathd`; Pi may select declared options but must not receive secret values.

## Durable research service

Use absolute project/config paths with `comathd doctor --project-root <path> --config <path>` or `comathd serve --project-root <path> --config <path>`. The sample keeps research execution disabled, declares no paid provider or campaign budget, and uses separate loopback operator and worker listeners. `--host` and `--port` override the operator listener only.

The doctor inspects configuration, runtime binary hashes, SQLite availability and explicitly configured credential environment-variable presence. It does not execute a runtime, start a model turn, provision a sandbox or modify Codex configuration. Active WAL data may require a consistent snapshot; that diagnostic is not a failed migration and must not be relabeled verified.

Host-installed adapters resolve the `research.runtimes[*].kind` identifiers. Naming a kind does not install or authorize it. Missing execution consumers remain blocked before launch. Sandbox rollout is deferred; a process-management boundary does not certify isolation. Runtime/provider configuration is separate from operator access: the user's familiar harness can invoke the same Pi external commands used in the manual Pi workbench workflow.

The daemon acquires one owner per canonical project, recovers durable state before starting listeners/scheduling, and stops new grants before draining shutdown. An unconfirmed process keeps its durable reservations; a still-running application callback prevents the owner/store from being released underneath it. `SIGINT`/`SIGTERM` and embedded `close()` share the shutdown path. Forced process termination requires recovery on the next start.

`research.live_tools` optionally configures `retrieval_search`, `retrieval_read` and `theorem_search` with an explicit endpoint, supported wire format, terms and optional credential environment-variable name. The sample configures none. Each worker call must also be listed in its tool policy and is admitted through the shared retrieval permit pool. Reader URLs must occur in task-readable source evidence or an explicit host authorization callback. Successful result artifacts and replayable receipts are committed together; repeating the same command does not repeat the HTTP request. A disconnected worker request cancels its HTTP tool, while operator command acceptance remains durable.

An optional `research.supervisor` object requires explicit `model_policy_id`, `tool_policy_id`, `role_template` and `budget` values. It queues normal budget-managed synthesize tasks and reads complete service snapshots of the charter, frontier and budgets. It never grants its own budget or host approval. The default context policy permits only exact task input references; formal assumptions and blind statement briefs require an explicit host policy. An oversized required snapshot blocks rather than truncating research context.

Configured Codex workers use a private generation-specific `CODEX_HOME`, strict configuration validation and environment-variable credentials. Worker MCP receives its scoped service capability, not the provider credential. The native readiness guard currently blocks actual launch before private configuration or credential materialization; installing a binary or selecting `sandbox_mode` does not bypass that guard.

Worker research results and supervisor proposals enter the service's structure/provenance checks and immutable artifact commit. Accepted results retain `proof_authority=none`. A completed task can replay its exact committed submission while its capability remains current; new tool calls and changed submissions remain rejected. Validation aggregation and formal-candidate ingestion require their dedicated consumers and cannot be inferred from a generic accepted result.

`ResearchResult.kind: "breakthrough"` publishes an immutable candidate without finishing the source task or releasing its runtime permits. The same task may publish further candidates, checkpoint, and later submit a final result. Historical candidate verification retains the original publication generation and scope even after same-scope recovery or a final result; it never reauthorizes an old worker capability. Candidate events wake supervision immediately and do not count as ordinary task completions.

The embedded daemon's optional `validation` host dependency selects one explicit policy version and six model/tool/role/budget profiles. It requires trusted root-approval, statement-brief and artifact-authorization producers; these callbacks are not worker inputs or JSON configuration booleans. The daemon verifies declared tool visibility against configured tool policies, fixes candidate context to its publication, and replays durable candidate events after restart. A blocked candidate does not stop independent candidates. Missing producers remain explicit blockers.

Validation results are accepted only for a bound current slot and a verified candidate, with exact examined statements and visible, hash-checked evidence. Aggregation keeps historical counterexamples, missing assumptions and disagreements in append-only events across slot replacement and policy changes. It needs all six current results, an accepted independent comparison of both completed blind results, and closure of every adverse issue before emitting `ValidationIntakePrepareQueued`. That event means queued for preparation, not prepared, approved, or proved. Independent comparison and resolution interpretation remain explicit trusted host consumers. Native filesystem isolation, fresh provider-thread evidence and replacement-context materialization require their own verification; a six-task receipt does not certify them.

A `synthesize` task with `specialization: "triage"` may submit a progress result containing a `triage` array. Each target must be a completed exploration task whose accepted result is explicitly present in the triage task's input references. The service checks source provenance and applies the deterministic eligible-quarter policy, creating C4 deepening successors with the source policies, scope and budget. It does not rewrite completed tasks or increase pool limits; insufficient deepening balance leaves work queued.

Repeated hard-blocker admission uses explicit shared immutable evidence. The default groups counterexample references within the same campaign, scope and problem slice; ten distinct task sources require structural synthesis rather than another ordinary route. Other hard-failure modes require the host's `classifyHardBlocker` callback. A new artifact hash alone never clears the cluster: resolution requires host-verified retry conditions. Existing exact failed-route checks continue to apply.

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
