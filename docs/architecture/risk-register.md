# Risk Register

This register tracks product-facing risks that remain relevant for a public CoMath Pi Lab release.

| Risk | Severity | Mitigation |
| --- | --- | --- |
| Documentation overclaims proof status | High | Public docs must say that only clean Lean replay plus promotion gates can mark a proof as proven. |
| Statement drift during repair | High | FormalSpecLock, AssumptionLedger, StatementDiffGate, and red-team review must bind every promoted artifact. |
| Agent vote mistaken for proof | High | Agent reports, votes, and reviewer notes remain `proof_authority=none`. |
| External tools mistaken for proof authority | High | Literature, theorem search, CAS, SMT, SAT, and live provider outputs are hints or provenance only. |
| Dependency drift after replay | High | Pin toolchain, dependency revisions, manifest hashes, source hashes, and final replay manifests. |
| Lean escape hatches | High | Scan for `sorry`, `admit`, axioms, constants, unsafe code, opaque definitions, local shadowing, and import pollution. |
| Runtime state accidentally published | High | Keep `.comath/`, local ledgers, tests, fixtures, evaluation material, generated output, and host-specific paths out of the public tree. |
| Secret or host-path leakage | High | Scrub API keys, tokens, private paths, provider transcripts, user corpora, and local PDFs from public artifacts. |
| Sandbox metadata overclaim | Medium | Treat sandbox preflight, host probes, helper validation, and Pi bridge records as non-authoritative until service-owned collected evidence passes. |
| Provider outage or terms drift | Medium | Record provider ids, terms notes, hashes, and blocker states; keep live execution optional. |
| Large theorem campaigns exceed local resources | Medium | Preserve replayable blockers and budget-exhaustion states instead of weakening statements or hiding failures. |

## Release Gate

A release candidate is acceptable only when:

- build and typecheck pass;
- public documentation avoids proof, license, and readiness overclaims;
- tracked paths exclude local development records, tests, fixtures, generated output, runtime state, and secrets;
- every promoted proof artifact is bound to FormalSpecLock, dependency locks, toolchain hashes, artifact hashes, replay manifests, and clean Lean replay authority.
