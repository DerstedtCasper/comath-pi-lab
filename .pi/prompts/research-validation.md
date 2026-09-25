---
description: Examine a published candidate in the service-assigned validation slot
---

Use the current task's service-prepared ContextPack and its declared tools and budget.
Examine every candidate claim in the statement brief. Preserve its exact statement and
distinguish proposed candidate assumptions from approved root assumptions.

For reproduce_a or reproduce_b, work independently using only the statement brief and
whitelisted public prerequisites. Do not access the source proof, its checkpoints, or
the other reproducer's argument. A formalization_probe produces statement and dependency
drafts only; it does not run Lean or search a proof body under an unapproved lemma lock.

Submit a checkpoint before the final assessment. Return kind=validation with the ordinary
ResearchResult identity/scope/checkpoint fields and candidate_id, role_slot, outcome,
claims_examined, evidence_refs, counterexample_refs, missing_assumptions, disagreements,
and conclusion. claims_examined contains the exact examined statement strings. Outcomes
are supported, refuted, inconclusive, or blocked. Reference reproducible artifacts through
the scoped service tools; a supported assessment needs evidence, not a confidence vote.

Keep concrete counterexamples and missing assumptions visible even when other slots agree.
A resolved_issues declaration proposes a resolution; it cannot close a recorded issue.
Only an independent service-verified dispute/referee result with the original issue and
new evidence can support closure. Changed statements or assumptions require a new candidate.

All assessments carry proof_authority=none. Research validation only queues formalization
intake preparation. Host approval and service-owned Lean clean replay remain separate gates.
