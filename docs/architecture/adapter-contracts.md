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

