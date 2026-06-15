# GA Release Criteria

This document is the public release gate for CoMath Pi Lab. It is intentionally stricter than a working demo: a release can be called GA only when proof promotion, replay, provenance, adapter, and no-cheat boundaries are all demonstrably closed.

macOS is outside the current GA environment-adaptation scope.

## Release Positioning

Allowed wording:

```text
CoMath is a source-available, non-commercially licensed agentic formal mathematics workbench built around Lean4/mathlib. It does not implement its own theorem prover or mathematical kernel. It orchestrates external proof, search, retrieval, computation, and agent tools, and promotes a mathematical claim only after a clean Lean replay and integrity audit pass.
```

Forbidden wording:

```text
CoMath proves arbitrary mathematics by itself.
CoMath verifies theorem truth independently of Lean.
CoMath replaces mathlib.
CoMath has a proprietary internal theorem library.
CoMath agents can certify proofs by vote.
CoMath uses CAS, SMT, SAT, theorem search, or papers as formal proof authority.
```

## Hard GA Blockers

Any one of these blocks a GA release:

- A production path imports a theorem-family recognizer, Nat-only proof synthesizer, default variable injection, synthetic winner, or business-layer theorem verifier.
- A proof claim can reach a proven/promoted state without a service-owned FinalReplayManifest whose result is `pass`.
- A proof claim lacks FormalSpecLock, AssumptionLedger, statement hash, dependency lock, toolchain hash, artifact hash, LeanRunManifest, and final replay material.
- Candidate text, literature, computation, theorem search, agent vote, reviewer approval, or MathProve-style audit output can override Lean replay failure.
- Pi, an agent, or an adapter can write trusted `.comath/` proof state directly.
- Final replay can run with unpinned Lean/Lake/mathlib material, mutable dependency references, network access, local module shadowing, symlink escapes, or unverifiable external repository material.
- Static no-cheat, dependency closure, axiom profile, statement-diff, and statement-drift red-team gates are missing, bypassable, or advisory-only.
- Adapter OS-isolation readiness, provider-helper readiness, host capability probes, or operator attestations are treated as mathematical proof authority or GA certification.
- Evidence packs cannot distinguish included redistributable material from omitted copyrighted/private material.
- Public exports leak secrets, absolute host paths, private papers, provider transcripts, or local runtime state.

## Required Public Evidence Before GA Tagging

Before a public GA announcement, maintainers must attach replayable evidence for:

- requirement-by-requirement status against the no-reinvent audit and open formal workbench design;
- source scans proving old toy/Nat production proof paths are absent from production source;
- clean repository state with no tracked `.comath`, `.tmp`, `dist`, `node_modules`, coverage, tests, local plans, local goal ledgers, private paper corpora, or host-path material;
- at least one promoted proof artifact that a third party can replay from a clean workspace with Lean4/mathlib;
- FormalSpecLock, AssumptionLedger, dependency lock, toolchain hash, artifact hash, LeanRunManifest, FinalReplayManifest, and third-party replay command bindings for every promoted proof claim;
- negative trust-core cases showing fake stdout, agent pass logs, forbidden Lean constructs, statement drift, hidden assumptions, unpinned dependencies, network replay, symlink escape, CAS-only proof, literature-only proof, vote-only proof, and human-review-only proof fail closed;
- public evidence-pack sanitization showing no secrets, no host roots, no private corpora, and no overclaiming proof language.

Maintainer QA suites, evaluation fixtures, and local development ledgers are not shipped in the public product snapshot. They are release-engineering material, not user-facing product assets.

## Public Validation Commands

The public source tree must at minimum pass:

```text
corepack pnpm build
corepack pnpm typecheck
```

Package-level public validation:

```text
corepack pnpm --filter @comath/comathd build
corepack pnpm --filter @comath/comathd typecheck
corepack pnpm --filter @comath/pi-extension build
corepack pnpm --filter @comath/pi-extension typecheck
```

These commands do not replace final clean Lean replay for promoted proof artifacts.

## Non-GA Labels

Use these labels when evidence is incomplete:

- `research-alpha`: workflow foundation with fail-closed gates.
- `vertical-slice`: executable path over bounded examples only.
- `ga-candidate`: all product gates implemented, final public review pending.
- `replayable-blocker`: a blocker certificate and resume path exist.
- `draft` or `candidate`: no final clean Lean replay.
