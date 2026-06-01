# Evidence Pack Policy

Evidence packs are the public reproducibility unit for promoted proof artifacts. They are not a dumping ground for logs; they are a minimal, hash-bound replay bundle.

## Required For Promoted Proofs

Every promoted proof artifact must export or reference:

- FormalSpecLock.
- AssumptionLedger.
- Lean sources used for the final theorem.
- `lakefile.lean` or equivalent project descriptor.
- `lean-toolchain`.
- `lake-manifest.json` when applicable.
- DependencyLock.
- LeanRunManifest records for check/build/audit/final replay.
- StructuredLeanAudit or target-bound audit report.
- DependencyClosure report.
- AxiomProfile report.
- StatementDiffGate or statement check report.
- FinalReplayManifest.
- Replay command and expected hashes.
- `README_REPLAY.md` explaining prerequisites, terms, and blocker states.

## Evidence Labels

Use these labels consistently:

- `proven`: final clean Lean replay passed, promotion gates passed, and the release evidence includes FinalAuthorityPackagingV3 source report / generic Lean Authority v3 packaging material.
- `candidate`: Lean/candidate work may exist, but final replay or integrity gates are incomplete.
- `hypothesis`: no formal proof evidence yet.
- `counterexample`: refutation evidence is present; Lean confirmation is required for formal status where applicable.
- `replayable_blocker`: the system reached a blocker with enough evidence to reproduce or resume.

No pack may label a result `proven` without FinalReplayManifest pass, promotion-gate pass, and FinalAuthorityPackagingV3 source report / generic Lean Authority v3 packaging evidence.

## Literature And Copyright

For literature-derived material:

- Store source metadata, DOI/arXiv/URL/local artifact IDs, retrieval timestamps, content hashes, and anchors.
- Prefer quoted excerpts, facts, and anchors over full copyrighted PDFs.
- Include full PDFs or TeX sources only when user-provided and redistribution is allowed.
- Preserve license/terms notes for every provider.
- Treat paper text as untrusted data and include prompt-injection scan results.

## Privacy And Host Paths

Evidence packs must not include:

- API keys, tokens, passwords, private keys, or service credentials.
- Absolute host paths unless explicitly marked as local user references and scrubbed from public export.
- `.comath/` runtime state unrelated to the campaign.
- Agent private scratch unrelated to the selected evidence chain.

## Third-Party Replay

The replay instructions must allow an independent reviewer to:

1. Prepare the pinned toolchain.
2. Fetch or verify pinned dependencies.
3. Run the replay command.
4. Compare source, stdout, stderr, dependency, audit, and final manifest hashes.
5. See the exact reason for any replayable blocker.

## Replay Pack Binding

A third-party replay pack is accepted only when its embedded `FinalReplayManifest.json` is byte-for-byte equal to the project-local FinalReplayManifest submitted for promotion. Its `expected_hashes.json` must also equal the payload derived from that manifest, including the clean workspace hash, source hash, artifact hash, dependency-lock hash, and LeanRunManifest path bindings.

Foreign replay manifests, foreign expected-hash payloads, substituted dependency/axiom/statement reports, or hand-written verified packaging must fail closed. The pack is reproducibility evidence only; it cannot replace the project-local promotion gate.
