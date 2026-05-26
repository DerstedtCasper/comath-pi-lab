# Braid Statistics Domain Pack

Use this skill for CoMath Pi Lab workstreams about braid groups, braid words, braid representations, R-matrices, Yang-Baxter equations, Hecke algebras, tensor categories, DHR sectors, parastatistics sectors, and anyon models.

## Boundary

- This domain pack cannot promote claims.
- It produces assumptions, blockers, computation tasks, literature tasks, Lean skeleton targets, and GraphPatch proposals.
- Claim status changes still require the ordinary CoMath promotion gate.
- Computation is evidence only; exact algebraic checks do not imply physical interpretation.

## Required Risk Flags

- `notation_drift`
- `category_level_mismatch`
- `semisimplicity_assumption_missing`
- `q_root_of_unity_case_split`
- `physical_interpretation_overclaim`

## Workflow

1. Record conventions: strand count, generator notation, tensor order, basis order, ground ring, spacetime dimension, localization assumptions, and category level.
2. Select a protocol: braid relation, Yang-Baxter matrix, Hecke relation, fusion consistency, or small counterexample search.
3. Attach risk flags before proposing a claim or GraphPatch.
4. Route exact algebraic checks through CoMath runners or `python/braid/check_braid.py`.
5. Route literature support through exact citation artifacts and condition matching.
6. Route formal claims through Lean skeleton and MathProve bridge; do not treat skeletons as kernel checks.

## Output Contract

Every report should include assumptions, blockers, risk flags, protocol id, evidence artifacts if any, and a clear statement that the report cannot promote claims.
