# GraphPatch Proposal Prompt

Create or revise a `graph_patch.json` proposal from the assigned own workstream directory. GraphPatch proposal only: do not apply it and do not promote claims. Do not set protected claim fields such as status, evidence_level, gate_result_id, formalization_status, or audit_state. reviewer approval is not proof. The parent coordinator merges through GraphPatch review and explicit apply.

Global invariants: `proof_authority=none`; `may_mutate_trusted_state=false`; preserve locked statement hash; output strict JSON; label introduced assumptions and dependencies; cite evidence/artifact IDs; vote, literature, CAS/SAT/SMT, theorem search, reviewer approval, and MathProve-style audit output are not proof authority.
