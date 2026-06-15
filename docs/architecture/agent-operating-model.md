# Agent Operating Model

CoMath uses agents as bounded research workers, not as proof authorities. The coordinator owns campaign state, merge order, and release decisions through `comathd`; specialist agents produce proposals, critiques, variants, retrieval notes, computation reports, and blockers.

## Coordinator Role

The coordinator owns:

- campaign scope and stage order;
- FormalSpecLock and AssumptionLedger preservation;
- candidate intake and elimination;
- hard-veto routing for statement drift, hidden assumptions, dependency pollution, fake Lean logs, and no-replay proof claims;
- final promotion requests through `comathd` gates only.

The coordinator must not trust a child agent's success claim without checking the referenced artifacts and service-owned replay evidence.

## Agent Roles

The GA workflow is one coordinator plus eight specialists:

| Agent | Responsibility | Authority Boundary |
| --- | --- | --- |
| coordinator | owns stage sequencing, merge decisions, and terminal-state routing | may request `comathd` actions but cannot certify proof truth |
| librarian | searches literature and records citation/provenance notes | retrieval output is evidence only |
| computation | runs CAS/SMT/SAT-style hint adapters when enabled | computation output is hint/refutation only |
| proof-route | proposes proof strategies and failed-route memory | proposals are candidates only |
| formalization | drafts Lean skeletons and candidate proof bodies | candidate material requires Lean replay |
| reviewer | attacks assumptions, dependencies, and statement drift | review is a veto source, not proof authority |
| graph-builder | prepares structured evidence and relation updates | graph changes remain service-gated |
| security-auditor | checks path, secret, adapter, and supply-chain boundaries | security findings cannot promote claims |
| math-integrity-auditor | checks proof-status wording and no-cheat boundaries | integrity findings cannot replace Lean replay |

## Child Agent Output Contract

Every machine-ingested child result should include:

- assigned role and exact scope;
- `proof_authority=none`;
- `may_mutate_trusted_state=false`;
- locked statement hash, or an explicit blocker if no FormalSpecLock exists;
- introduced assumptions and dependencies;
- files or artifacts read;
- candidate outputs, blockers, and hard vetoes;
- statement-drift and no-cheat observations;
- requested next `comathd` action, if any.

## Stage-Local Variants

Stage-local multi-candidate generation is a search mechanism. Variants may be ranked, voted on, eliminated, or promoted to later stages only as candidates. A vote, reviewer approval, literature hit, theorem-search result, CAS/SMT/SAT result, or MathProve-style audit can never mark a proof as proven.

## Merge Protocol

1. Read the child artifact or report.
2. Check the locked statement and assumptions.
3. Check the output's authority flags.
4. Submit only valid candidate material to `comathd`.
5. Require service-owned LeanRunManifest and final clean replay material before any proof promotion.

## Escalation Protocol

Escalate to the operator when:

- the statement or assumptions are ambiguous;
- a live adapter dependency cannot be configured or probed;
- replay fails for environmental reasons and produces a replayable blocker;
- a requested behavior would weaken the Lean-authority or no-cheat boundary.
