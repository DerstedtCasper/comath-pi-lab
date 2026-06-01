# Example Campaigns

These examples describe expected public campaign shapes. They are documentation examples, not proof artifacts.

## Minimal Goal-Mode Input

```text
/cm:research --goal "Formalize the statement that a continuous image of a compact set is compact in Lean/mathlib." --mode goal --strict --budget frontier
```

Expected early state:

- raw goal hash recorded;
- no default variables or assumptions injected;
- campaign reaches `needs_user_statement_disambiguation` or creates a FormalSpecLock only after the theorem statement, variables, assumptions, imports, and notation are approved;
- theorem search and literature adapters may produce hints with `proof_authority=none`.

## Paper-To-Formal-Spec Input

```text
/cm:research --goal "Formalize Theorem 2.1 from the attached note." --paper ./paper.pdf --attach ./notes.md --mode goal --strict
```

Expected evidence policy:

- PDF/Markdown text is scanned for prompt injection;
- extracted theorem text has page/section/paragraph anchors;
- copyright/terms notes are recorded;
- paper proof text cannot promote a claim;
- FormalSpecLock and AssumptionLedger must be created before proof search.

## External Lean Repo Candidate

```text
/cm:research --goal "Reuse a theorem from a user-provided Lean project if it is compatible." --workspace-ref ./external-lean-project --mode goal --strict
```

Expected dependency policy:

- external repo starts as `planning_reference`;
- license, commit, Lean/Lake toolchain, manifest, imported modules, and source hashes are checked;
- it cannot enter final proof replay until it reaches `trusted_replay_dependency`;
- final replay has network disabled.

## Terminal States

Valid terminal outcomes are:

- `formal_replay_passed` only after the service-owned `FinalReplayManifest` and promotion gate packaging verify
- `formal_counterexample_confirmed`
- `needs_user_statement_disambiguation`
- `blocked_with_replayable_certificate`
- `budget_exhausted_with_resume_state`

Any other stop condition must be mapped to a replayable blocker or resumable state before public export.
