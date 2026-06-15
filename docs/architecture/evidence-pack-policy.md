# Evidence Pack Policy

Evidence packs are the reproducibility unit for promoted proof artifacts. They are not log dumps; they are minimal, hash-bound replay bundles that an independent reviewer can inspect.

## Required For Promoted Proofs

Every promoted proof artifact must export or reference:

- FormalSpecLock.
- AssumptionLedger.
- Lean sources used for the final theorem.
- `lakefile.lean` or equivalent project descriptor.
- `lean-toolchain`.
- `lake-manifest.json` when applicable.
- DependencyLock or DependencyClosureV2.
- LeanRunManifest records for candidate checks.
- StructuredLeanAudit or target-bound audit report.
- AxiomProfileV2 report.
- StatementDiffGate report.
- FinalReplayManifest.
- Replay command and expected hashes.
- `README_REPLAY.md` explaining prerequisites, terms, replay steps, and blocker states.

## Evidence Labels

Use these labels consistently:

- `proven`: final clean Lean replay passed, promotion gates passed, and the release evidence includes Lean Authority v3 packaging material.
- `candidate`: Lean or candidate work exists, but final replay or integrity gates are incomplete.
- `hypothesis`: no formal proof evidence exists yet.
- `counterexample`: refutation evidence is present; Lean confirmation is required for formal status where applicable.
- `replayable_blocker`: the system reached a blocker with enough evidence to reproduce or resume.

No pack may label a result `proven` without FinalReplayManifest pass, promotion-gate pass, and Lean Authority v3 packaging evidence.

## Public Diagnostic Archives

Source-review diagnostic archives may include source files plus generated markdown, HTML, and JSON reports for release review. They remain non-authoritative with `proof_authority: "none"` and `public_archive_is_proof_authority=false`.

A clean source archive may be attached only after a clean worktree check, forbidden-entry scan, and public archive review pass. Archive manifests and sidecars must bind hashes for the source archive, report set, and release checklist. External notarization, immutable-storage receipts, and provider policy checks are release provenance only; they cannot restore runtime state, promote proof claims, certify GA, or replace Lean Authority v3 evidence.

Sanitized public downloads are `public_download` artifacts with `can_restore=false`. Byte-for-byte runtime recovery belongs only to explicit internal restore snapshots, which are local recovery material and not public distribution artifacts.

## Literature And Copyright

For literature-derived material:

- Store source metadata, DOI/arXiv/URL/local artifact IDs, retrieval timestamps, content hashes, and anchors.
- Prefer quoted excerpts, facts, and anchors over full copyrighted PDFs.
- Include full PDFs or TeX sources only when user-provided and redistribution is allowed.
- Preserve license or terms notes for every provider.
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
