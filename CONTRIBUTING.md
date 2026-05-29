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

Before opening a release-facing change, run the smallest relevant focused test plus the package or root gate:

```text
corepack pnpm --filter @comath/comathd test
corepack pnpm --filter @comath/pi-extension test
corepack pnpm build
corepack pnpm typecheck
corepack pnpm test
node scripts/phase0-smoke.mjs
```

Use `docs/architecture/ga-release-criteria.md` for release decisions and `docs/architecture/threat-model.md` for security review.

## Documentation Rules

- State whether a feature is a workflow gate, evidence source, candidate generator, or proof authority.
- Say `candidate`, `draft`, or `replayable blocker` when final clean replay is absent.
- Keep old Phase 18-81 slices described as historical vertical-slice evidence or fixtures unless regenerated through the Goal 3 trusted path.
- Cite tests or file paths for any implementation claim.

