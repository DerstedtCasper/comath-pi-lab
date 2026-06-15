# Adapter Contracts

CoMath integrates maintained tools through adapters. Adapters provide hints, candidates, evidence, and diagnostics; they never become proof authority by themselves.

## Common Adapter Envelope

Every adapter result must include:

- `adapter_id`
- provider id and capability id
- request hash and response hash
- timestamp
- version or API endpoint when available
- license or terms note when content is external
- `proof_authority: "none"`
- artifact or evidence IDs for stored outputs
- blocker details when unavailable

Adapter failures are replayable blockers or degraded capability reports, not silent success.

## Theorem Search

Providers may include Loogle, LeanSearch, LeanSearchClient, Moogle, LeanExplore, LeanDojo traces, local mathlib indexes, and local external-repo indexes.

Allowed capabilities include constant search, subexpression search, natural-language theorem search, proof-state search, and premise retrieval. Results may suggest imports, declarations, lemmas, or proof routes. They may not certify that a theorem is proved or that a statement is equivalent to the FormalSpecLock.

## Proof-Search Backends

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

## Literature And Ingestion

Providers may include arXiv, Semantic Scholar, OpenAlex, Crossref, Unpaywall, Jina Reader/Search, AnySearch, local PDF, local TeX, local Markdown, BibTeX, and Zotero-compatible metadata.

Every literature evidence record must include:

- provider and source reference
- URL, DOI, arXiv ID, local artifact, or bibliography key where available
- retrieval timestamp
- content hash
- page, section, paragraph, line, or byte anchors
- prompt-injection scan result
- license or terms note
- extracted-claim kind
- `proof_authority: "none"`

Only extracted definitions, theorem statements, lemma statements, and proof-step text may become formalization candidates. They still require FormalSpecLock and Lean replay.

## Computation

Providers may include SymPy, SageMath, Python exact arithmetic, Z3, cvc5, SAT solvers, MATLAB/Mathematica/Maple when explicitly configured, and domain-specific exact scripts.

Computation reports may support counterexample search, exact computation, symbolic exploration, finite model search, candidate lemma discovery, and sanity checks. They cannot promote `formally_checked` unless their certificate is formalized and accepted by Lean final replay.

## Adapter OS Isolation

Adapter launch metadata distinguishes process-boundary execution from service-owned OS-isolation evidence. A readiness review may accept OS-enforced isolation only when evidence is produced by a `comathd` service-owned collector and is bound to adapter id, backend, provider, probe id, stdout/stderr/transcript hashes, process isolation, filesystem scope, network isolation, no-new-privileges, and escape-prevention checks.

Sandbox launch, provider-runner contracts, host capability probes, helper host validation, helper execution attempts, and collection bridge manifests are provenance and anti-confusion material. They are not mathematical proof authority, not real-Pi proof evidence, not direct GA certification, and not substitutes for canonical service-owned collected evidence.

Route callers and Pi payloads cannot submit success-shaped execution metadata, OS-enforcement booleans, binary hashes, stdout/stderr hashes, provider witness hashes, proof-authority flags, or GA-certification flags as trusted evidence. Service-owned routes must fail closed on stale, missing, mismatched, incomplete, or caller-supplied material.

## Live Provider Execution

Live retrieval, theorem-search, and computation providers are opt-in. Live calls require configured provider URLs, allowlists, bounded request envelopes, no persisted secrets, prompt-injection scans, response hashes, and explicit no-authority flags.

Live results may shape repair hints or candidate material only. They cannot write LeanRunManifest or FinalReplayManifest artifacts, change the locked statement, promote claims, certify GA, or replace clean Lean replay.

## Configuration Sample

See `config/comath.sample.json` for a non-secret configuration shape. Live credentials must stay in service-owned environment variables or local secret stores and must not appear in Pi payloads, evidence packs, or committed config samples.
