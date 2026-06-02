# Adapter Contracts

CoMath integrates maintained tools through adapters. Adapters provide hints, candidates, evidence, and diagnostics; they never become proof authority by themselves.

## Common Adapter Envelope

Every adapter result must include:

- `adapter_id`
- `provider`
- `capabilities`
- request hash and response hash
- timestamp
- version or API endpoint when available
- license/terms note when content is external
- `proof_authority: "none"`
- artifact or evidence IDs for stored outputs
- blocker details when unavailable

Adapter failures are replayable blockers or degraded capability reports, not silent success.

## Theorem Search Adapters

Providers may include Loogle, LeanSearch, LeanSearchClient, Moogle, LeanExplore, LeanDojo traces, local mathlib indexes, and local external-repo indexes.

Allowed capabilities:

- constant and name search
- subexpression search
- natural-language theorem search
- proof-state search
- premise retrieval

Theorem search results may suggest imports, declarations, lemmas, or proof routes. They may not certify that a theorem is proved or that a statement is equivalent to the FormalSpecLock.

## Proof-Search Backend Adapters

Providers may include LeanRunner, Lean LSP/MCP adapters, LeanDojo, LeanCopilot, Aesop/tactic runners, Codex-compatible backends, and other configured proof-search systems.

Backend output must be an AgentCandidatePack or strict JSON equivalent with:

- locked statement hash
- candidate statement hash
- introduced assumptions
- introduced dependencies
- requested Lean checks
- hard vetoes and blockers
- `proof_authority: "none"`

Any Lean source from a backend must be rechecked by the service-owned LeanRunner and final replay gate.

## Agent Adapter OS Isolation

Agent adapter package launch metadata records whether an adapter currently runs behind `process_boundary_only` or has service-owned OS-isolation evidence. A release-readiness review may accept OS-enforced isolation only when the evidence is produced by a `comathd` service-owned collector and is bound to adapter id, backend, provider, probe id, stdout/stderr/transcript hashes, process isolation, filesystem scope, network isolation, no-new-privileges, and escape-prevention checks.

Provider-specific sandbox launch preflight is a separate service-owned manifest. It may record that a configured provider such as OCI, Nix, Firejail, Windows AppContainer, or macOS `sandbox-exec` is ready for a future service-owned execution probe, but it does not by itself record adapter execution, kernel/firewall isolation, or GA readiness. Preflight manifests must keep `shell=false`, `network_policy=disabled`, `command_override_allowed=false`, `caller_supplied_success_allowed=false`, `proof_authority="none"`, and `can_certify_ga=false`.

Provider-runner contract manifests bind a ready sandbox-launch preflight to a fixed provider argv template and service-owned environment policy. They reject caller-supplied command, argv, env, runner hash, and success metadata, and default to a service-owned `blocked_provider_runner_unavailable` blocker when the host has no configured OCI/Nix/Firejail/Windows AppContainer/macOS helper. A host operator may configure absolute service-owned helper executables through provider-specific handles such as `COMATH_AGENT_ADAPTER_OSISO_OCI_HELPER`, `COMATH_AGENT_ADAPTER_OSISO_NIX_HELPER`, `COMATH_AGENT_ADAPTER_OSISO_FIREJAIL_HELPER`, `COMATH_AGENT_ADAPTER_OSISO_WINDOWS_APPCONTAINER_HELPER`, or `COMATH_AGENT_ADAPTER_OSISO_MACOS_SANDBOX_EXEC_HELPER`, with `COMATH_AGENT_ADAPTER_OSISO_PROVIDER_HELPER` as a host-only fallback. The default resolver records only the helper binary hash and non-secret diagnostics, never the helper path. Provider-runner manifests still do not record adapter execution, cannot satisfy the readiness gate, and must keep `adapter_execution_isolation.os_enforced=false`, `proof_authority="none"`, and `can_certify_ga=false` until a later service-owned execution probe writes canonical collected evidence.

Provider-helper host-validation manifests bind a ready provider-runner manifest back to its sandbox-launch artifact, selected provider, service-owned helper binary hash, supported host platform list, fixed argv template hash, and non-inherited environment policy. The default host validator uses the service-observed host platform, not caller-supplied route platform strings, and fails closed when platform-specific helpers are configured on incompatible hosts. For env-configured helpers, the default host validator also runs a fixed CoMath provider-helper self-test with service-owned argv/env; public manifests record only self-test exit/status and stdout/stderr/transcript hashes plus args-prefix hash/count, never helper paths, raw prefix args, or stdout/stderr text. Route callers cannot submit helper-host-ready booleans, command overrides, argv, env, binary hashes, self-test hashes, platform strings, or version strings as validation evidence. Only a service-owned `provider_helper_host_validator` can mark the helper host ready, and even a ready host-validation manifest is still a pre-execution readiness artifact: it does not run the adapter under OS enforcement, does not collect OS-enforcement evidence, cannot satisfy the readiness gate, and must keep `adapter_execution_isolation.os_enforced=false`, `proof_authority="none"`, and `can_certify_ga=false`.

Provider-helper execution attempt manifests bind a ready provider-runner manifest to a prior append-only provider-helper host-validation artifact before any helper process can be configured or spawned. The referenced host-validation manifest must be service-owned, validated, and exactly bound to the same project, adapter, backend, provider, launch artifact, runner artifact, runner binary hash, and helper binary hash; missing, unvalidated, or mismatched host-validation artifacts fail closed before the helper config resolver runs. When binding passes, `comathd` launches the service-owned helper with `shell=false`, an optional service-owned configured args prefix, fixed argv, a non-inherited fixed `COMATH_*` environment, and a runner-binary hash match; the manifest records the host-validation artifact hash plus only executable hash, args-prefix hash/count, exit status, signal, stdout/stderr/transcript hashes, output sizes, fixed argv template hash, environment-policy hash, diagnostics, and audit metadata. It never records the helper executable path or prefix argument values. Caller-supplied command overrides, argv, env, exit codes, stdout/stderr hashes, host-ready booleans, and success-shaped route payloads remain untrusted. A host-bound helper exit code of 0 proves only that the configured helper process was attempted under the service-owned contract; it is not collected OS-enforcement evidence, cannot satisfy the readiness gate, and must keep `adapter_execution_isolation.os_enforced=false`, `proof_authority="none"`, and `can_certify_ga=false`.

Provider-helper collection bridge manifests bind a successful provider-helper execution attempt back to its ready provider-runner and sandbox-launch artifacts. Route callers cannot submit OS-enforcement booleans, exit codes, or stdout/stderr/transcript hashes as collected evidence. Only an internal service-owned provider-helper collection callback can feed the existing canonical probe/evidence writer, and the callback's exit/stdout/stderr/transcript hashes must exactly match the provider-helper execution manifest. The wrapper manifest is not readiness evidence by itself; only the canonical Task170 probe/evidence artifact can satisfy the readiness review, and the result still keeps `proof_authority="none"`, `can_promote_claim=false`, and `can_certify_ga=false`.

Sandbox execution probe manifests bridge that preflight to canonical OS-isolation evidence. They may bind a ready sandbox-launch manifest to a service-owned execution probe and then emit the same collected probe/evidence artifacts consumed by the readiness gate. Route callers and Pi payloads still cannot submit success-shaped execution metadata; only an internal service-owned execution probe callback can produce collected evidence. The Pi `/cm:release agent-adapter-os-isolation-sandbox-execution` consumer is host-confirmed release tooling for this route only; it strips confirmation ids, sanitizes host paths/secrets/proof-success and transport overclaims, and cannot write `.comath/` directly. The bridge manifest remains routing/operator evidence until the internal callback writes canonical artifacts, and the Pi consumer is operator UX only. Only canonical service-owned probe/evidence artifacts can feed readiness gates; the bridge and consumer are not mathematical proof authority, GA certification, or a guarantee that every supported provider has a production runner on the current host.

Caller-supplied request fields, Pi payloads, operator attestations, contract-only metadata, package launch metadata, and health-probe text cannot satisfy the OS-isolation readiness gate. They remain blocker evidence or diagnostics with `proof_authority: "none"`, `can_promote_claim: false`, and `can_certify_ga: false`.

## Literature And Ingestion Adapters

Providers may include arXiv, Semantic Scholar, OpenAlex, Crossref, Unpaywall, Jina Reader/Search, AnySearch, local PDF, local TeX, local Markdown, BibTeX, and Zotero-compatible metadata.

Every literature evidence record must include:

- provider and source reference
- URL, DOI, arXiv ID, local artifact, or bibliography key where available
- retrieval timestamp
- content hash
- page, section, paragraph, line, or byte anchors
- prompt-injection scan result
- license/terms note
- extracted-claim kind
- `proof_authority: "none"`

Only extracted definitions, theorem statements, lemma statements, and proof-step text may become formalization candidates. They still require FormalSpecLock and Lean replay.

## Computation Adapters

Providers may include SymPy, SageMath, Python exact arithmetic, Z3, cvc5, SAT solvers, MATLAB/Mathematica/Maple when explicitly configured, and domain-specific exact scripts.

Computation reports may support:

- counterexample search
- exact computation
- symbolic exploration
- finite model search
- candidate lemma discovery
- sanity checks

They cannot promote `formally_checked` unless their certificate is formalized and accepted by Lean final replay.

## Adapter Configuration Sample

See `config/comath.sample.json` for a non-secret configuration shape. Live credentials must stay in service-owned environment variables or local secret stores and must not appear in Pi payloads, evidence packs, or committed config samples.
