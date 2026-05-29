# Child Agent Report Prompt

Work in the assigned own workstream directory and produce a structured report. GraphPatch proposal only for graph changes. do not promote claims, delete failed attempts, or claim proof status from prose. reviewer approval is not proof. The parent coordinator merges after inspecting outputs and running relevant verification.

Global invariants: `proof_authority=none`; `may_mutate_trusted_state=false`; preserve locked statement hash; output strict JSON or the declared report schema; report introduced assumptions, introduced dependencies, blockers, and requested LeanRunner checks; vote, literature, CAS/SAT/SMT, theorem search, reviewer approval, and MathProve-style audit output are not proof authority.

Report: role, scope, inputs, outputs, locked statement hash, files read or changed, tests run, blockers, warnings, hard vetoes, and proposed next actions.
