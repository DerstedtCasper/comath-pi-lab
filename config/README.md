# Config Samples

This directory contains non-secret configuration examples. Do not commit live credentials, API keys, private paths, paid-provider account details, provider transcripts, or user paper corpora.

Runtime configuration is owned by `comathd`; Pi may select declared options but must not receive secret values.

## Durable research service

Use absolute project/config paths with `comathd doctor --project-root <path> --config <path>` or `comathd serve --project-root <path> --config <path>`. The sample keeps research execution disabled, declares no paid provider or campaign budget, and uses separate loopback operator and worker listeners. `--host` and `--port` override the operator listener only. A stopped daemon can be rolled back with `comathd rollback --project-root <path> --config <path> --snapshot <absolute-internal-manifest>`; it rejects public-download snapshots and never opens a listener.

The doctor inspects configuration, runtime binary hashes, SQLite availability and explicitly configured credential environment-variable presence. It does not execute a runtime, start a model turn, provision a sandbox or modify Codex configuration. Active WAL data may require a consistent snapshot; that diagnostic is not a failed migration and must not be relabeled verified.

Host-installed adapters resolve the `research.runtimes[*].kind` identifiers. Naming a kind does not install or authorize it. Missing execution consumers remain blocked before launch. Sandbox rollout is deferred; a process-management boundary does not certify isolation. Runtime/provider configuration is separate from operator access: the user's familiar harness can invoke the same Pi external commands used in the manual Pi workbench workflow.

The daemon acquires one owner per canonical project, recovers durable state before starting listeners/scheduling, and stops new grants before draining shutdown. An unconfirmed process keeps its durable reservations; a still-running application callback prevents the owner/store from being released underneath it. `SIGINT`/`SIGTERM` and embedded `close()` share the shutdown path. Forced process termination requires recovery on the next start.

`research.live_tools` optionally configures `retrieval_search`, `retrieval_read` and `theorem_search` with an explicit endpoint, supported wire format, terms and optional credential environment-variable name. The sample configures none. Each worker call must also be listed in its tool policy and is admitted through the shared retrieval permit pool. Reader URLs must occur in task-readable source evidence or an explicit host authorization callback. Successful result artifacts and replayable receipts are committed together; repeating the same command does not repeat the HTTP request. A disconnected worker request cancels its HTTP tool, while operator command acceptance remains durable.

An optional `research.supervisor` object requires explicit `model_policy_id`, `tool_policy_id`, `role_template` and `budget` values. It queues normal budget-managed synthesize tasks and reads complete service snapshots of the charter, frontier and budgets. It never grants its own budget or host approval. The default context policy permits only exact task input references; formal assumptions and blind statement briefs require an explicit host policy. An oversized required snapshot blocks rather than truncating research context.

Configured Codex workers use a private generation-specific `CODEX_HOME`, strict configuration validation and environment-variable credentials. Worker MCP receives its scoped service capability, not the provider credential. Host-approval and operator credentials must use distinct environment-variable names **and distinct resolved values**; if the host sees equal values it rejects every host approval operation rather than treating an operator token as host authority. The native readiness guard currently blocks actual launch before private configuration or credential materialization; installing a binary or selecting `sandbox_mode` does not bypass that guard.

Worker research results and supervisor proposals enter the service's structure/provenance checks and immutable artifact commit. Accepted results retain `proof_authority=none`. A completed task can replay its exact committed submission while its capability remains current; new tool calls and changed submissions remain rejected. Validation aggregation and formal-candidate ingestion require their dedicated consumers and cannot be inferred from a generic accepted result.

`ResearchResult.kind: "breakthrough"` publishes an immutable candidate without finishing the source task or releasing its runtime permits. The same task may publish further candidates, checkpoint, and later submit a final result. Historical candidate verification retains the original publication generation and scope even after same-scope recovery or a final result; it never reauthorizes an old worker capability. Candidate events wake supervision immediately and do not count as ordinary task completions.

`research.validation` optionally selects one explicit policy version and six model/tool/role/budget profiles. When it is present, the daemon owns the root-approval lookup, exact artifact authorization, and immutable statement-brief producer; it does not accept any of those facts from workers or JSON booleans. Blind profiles must declare a blind `new_thread` tool policy, while the service leaves independent blind comparison and adverse-issue resolution to their dedicated trusted consumers. An embedded host may still supply stricter callbacks. The daemon verifies declared tool visibility, fixes candidate context to its publication, and replays durable candidate events after restart. Without this explicit policy no validation driver is enabled.

Validation results are accepted only for a bound current slot and a verified candidate, with exact examined statements and visible, hash-checked evidence. Aggregation keeps historical counterexamples, missing assumptions and disagreements in append-only events across slot replacement and policy changes. It needs all six current results, an accepted independent comparison of both completed blind results, and closure of every adverse issue before emitting `ValidationIntakePrepareQueued`. That event means queued for preparation, not prepared, approved, or proved. Independent comparison and resolution interpretation remain explicit trusted host consumers. Native filesystem isolation, fresh provider-thread evidence and replacement-context materialization require their own verification; a six-task receipt does not certify them.

A completed validation task may be retried with new host-authorized evidence after its committed result is verified. The daemon creates a distinct task, retains the accepted result and prior slot history, and records the replacement context in the same transaction. Unrelated succeeded tasks cannot use this path. Evidence already present in the original input/result/checkpoint cannot be presented as new. Blind additions require the host's synchronous `prepareReplacementSources` classification as public prerequisites; source proofs, prior validator results and full root materials remain denied. Missing classification or context failure rolls back the task and slot change. The current policy's candidate state returns to waiting; old adverse issues still require independent resolution.

The embedded `intake` service prepares exact source-bound root and lemma specifications before requesting approval. Preparation reserves stable claim/PO IDs, retains the existing root claim, preserves the complete lock/ledger fields and root before/after values, and stores immutable bytes with `approval_state: "not_approved"`. Schema fields such as an assumption's `approved` flag are draft data until the host receipt is committed. Operator requests only enter `awaiting_approval`; host ticket issuance binds the displayed digest, revision and host principal for ten minutes. Only the ticket hash is stored. A lost issuance response requires a new issuance command; approval retries return the original non-sensitive commit receipt.

Approval installs claims, versioned lock/ledger/receipt packages, the complete PO collection and planning artifacts under one recoverable commit. Planning output is grouped under `proof/plans/<prepared_sha256>` and records decomposition and dependency graphs separately. Default daemon formal admission/context and the validation root resolver require the real consumed ticket and committed package, including installed/CAS hashes. New campaign wording never grants formal access; tick and replay require a matching approved PO. Public C8 operator/host transports, the full per-PO execution workflow and native live evidence remain separate integration work. All preparation and approval receipts retain `proof_authority: "none"`.

Proof obligation updates replace one ID and retain every sibling. Only `queued` obligations whose explicit prerequisites are all `integrated` become ready; parent lineage does not imply a prerequisite. The active stage view and its `obligation_cursors` entry advance together, while `stage_runs` remains append-only history with PO/attempt/scope ownership. A planning tick checks the approved plan's committed hashes and writes a consumption record under `proof/<PO>/stages/planning/a<attempt>` without rewriting the plan. Retry gets a new attempt directory. PO-specific blockers remain visible while independent ready obligations proceed. The ordinary tick still returns `formal_candidate_consumer_unavailable` pending its durable asynchronous proof-stage owner and actual Lean verification consumer; it cannot invoke the legacy synthetic candidate path.

The embedded daemon exposes `formalCandidates.submitCandidateGenerationTasks` for a host-selected `formalCandidateProfile` (role, model/tool policy, per-task budget and priority). It creates eight ordinary queued `formalize` tasks using the existing strategies and a committed task/PO/variant reservation. This host dependency is not a worker-controlled configuration or an implicit budget. Preparing each admitted attempt fixes a unique CAND ID for that generation in both the sealed context and worker context endpoint. A retry preserves all prior candidate identities.

`research_worker_result` and `/worker/v1/results` accept the same strict `formal_candidate` submission shape. The service verifies current identity, reservation, approved scope, accepted checkpoint and authorized source CAS bytes, then installs the exact source with submitted CandidateRun/Manifest records. HTTP 202 means the recoverable file commit is pending; 200 means it is committed, not kernel checked. The daemon reconciles pending operations without asking the model to resubmit. Normal owned-process termination retains `submission_pending` until finalize; a prior cancellation or fence preserves inactive history. Only complete verified after-images can emit `FormalCandidateReadyForVerification`. Exact recorded-command receipt replay remains available to the original capability after termination, without reopening tools or allowing changed input. Lean execution, per-claim immutable replay packaging and final proof authority remain separate downstream gates.

`formalCandidateProjects.materializeAcceptedCandidateLeanProject` copies accepted source bytes and the active claim's exact canonical lock/ledger into an immutable candidate project. Derived build directories use service-reserved `LPROJ` identities beneath `.comath/lean/projects` to avoid Windows Lake path limits; the complete configuration hash and original candidate identity remain bound in the receipt, and canonical source storage stays unchanged. Generated Lake/audit files never replace a proof body or infer variables. The current base project contains no fetched external packages; explicit integrated dependencies still require the gate-verified local material consumer. Missing imports must fail actual Lean/dependency checks, not trigger an implicit dependency or scope expansion.

`executeOwnedToolProcess` uses the existing native Job/process-group session with a separate admitted tool identity. It writes the tool handle without replacing a worker handle, bounds both output streams and preserves actual cancellation/timeout/termination state. Callers retain responsibility for tool charging and releasing permits only after confirmed termination. The async Lean command and version wrappers use native executables. `runServiceOwnedLeanCommandV3Async` fixes input/binary hashes and a service LRUN identity before execution, awaits outside writer transactions, then commits immutable logs, manifest and provenance. Changed inputs or interrupted/unconfirmed execution cannot acquire proof authority. These helpers do not yet supply the autonomous proof-stage owner or asynchronous final clean replay; the old synchronous maintenance path is not the new research workflow.

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
