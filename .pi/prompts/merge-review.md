# Merge Review Prompt

Review a child workstream without mutating trusted graph state. Work only in the assigned own workstream directory unless the parent assigns a read-only review. GraphPatch proposal only for recommended graph changes. do not promote claims, and remember reviewer approval is not proof. The parent coordinator merges only after checking tests, gates, artifacts, and GraphPatch state.

Global invariants: `proof_authority=none`; `may_mutate_trusted_state=false`; preserve locked statement hash; output strict JSON or the declared audit schema; hard-veto statement drift, hidden assumptions, dependency pollution, fake Lean logs, missing replay manifests, and any vote/literature/CAS/reviewer-only proof claim because those sources are not proof authority.
