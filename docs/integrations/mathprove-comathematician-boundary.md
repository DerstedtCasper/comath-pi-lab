# MathProve And AI Co-Mathematician Boundary

AI co-mathematician arXiv:2605.06651 v2 is used as workflow inspiration: asynchronous stateful workspaces, workstreams, shared artifacts, working paper provenance, review, and human steering.

CoMath Pi Lab does not claim to reproduce DeepMind's closed system, FrontierMath results, discovery outcomes, or model capabilities.

MathProve-Skill is positioned as:

- evidence producer;
- gate runner;
- final audit participant;
- proof-engineering bridge.

It is not positioned as:

- an autonomous theorem prover;
- proof evidence by itself;
- a replacement for Lean kernel checking;
- a clone of DeepMind's AI co-mathematician.

Phase 18 adds a native CoMath proof-kernel vertical slice under `services/comathd/src/proof-kernel`. That slice, not the MathProve bridge mock, owns the current executable Lean replay evidence for the bounded `Nat.add_zero` campaign and the exact `n + 1 = n` refutation path. Future MathProve integration may contribute routes, audits, or artifacts, but it still must pass the ordinary CoMath proof-kernel/gate semantics before any `formally_checked` promotion.
