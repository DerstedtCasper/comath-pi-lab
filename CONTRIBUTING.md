# Contributing

CoMath contributions must preserve the Lean-authority boundary.

## Required Invariants

- Lean4/mathlib clean replay is the only final proof authority.
- Do not add business-layer theorem recognizers, Nat-only proof synthesis, theorem-family production routing, or default variable/assumption injection.
- Do not promote claims from agent votes, reviewer approval, CAS/SAT/SMT output, papers, theorem-search results, or MathProve-style audits.
- Pi, agents, and adapters must not write trusted `.comath/` proof state directly.
- Adapter outputs must carry `proof_authority=none` unless a later Lean final replay promotes the claim.
- Failed routes, blockers, and counterexamples are durable evidence and must not be hidden.

## Development Checks

Before opening a release-facing change against the public product snapshot, run the public build and typecheck gates:

```text
corepack pnpm build
corepack pnpm typecheck
```

Maintainers run private QA, replay, and evaluation suites before a release tag. Those suites are intentionally not shipped in the public product tree.

Use `docs/architecture/ga-release-criteria.md` for release decisions and `docs/architecture/threat-model.md` for security review.

## Documentation Rules

- State whether a feature is a workflow gate, evidence source, candidate generator, or proof authority.
- Say `candidate`, `draft`, or `replayable blocker` when final clean replay is absent.
- Keep historical vertical-slice claims out of user-facing docs unless they are regenerated through the current trusted path and backed by public replay evidence.
- Cite product source, architecture documents, replay manifests, or public evidence packs for implementation claims.
