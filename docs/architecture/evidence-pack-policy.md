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

## Public Diagnostic Archives And Restore Snapshots

Source-review public diagnostic archives may include source files plus generated markdown, HTML, and JSON reports for release review, but they remain non-authoritative (`proof_authority: none`) and `public_archive_is_proof_authority=false`. Each source-review public archive must include a project-relative notarization-policy sidecar that binds the archive manifest and public report hashes, records `tamper_evident_manifest=true`, and states that OS immutable storage and external notarization are `not_configured` unless future executable evidence proves otherwise. Task308 source-only open-source review artifacts may add a clean `git archive` tar from `HEAD`, but only after a current Task307 package, clean worktree, forbidden-entry scan, and public archive review pass; those artifacts must keep `source_artifact_is_proof_authority=false`. Task309 source artifact presentation reviews may expose a download descriptor for that `source.tar`, but only after re-reading the Task308 manifest and archive bytes by hash/size; those descriptors must keep `can_restore=false`, `proof_authority="none"`, `can_promote_claim=false`, and `presentation_is_proof_authority=false`. A missing or mismatched sidecar is a public archive review veto, but the sidecar is still policy evidence only. A sanitized snapshot download is a `public_download` with `can_restore=false`; it is not a restore source and restore must reject it with `SNAPSHOT_PUBLIC_DOWNLOAD_NOT_RESTORABLE`. Byte-for-byte runtime fidelity belongs only to an explicit `internal_restore` snapshot, which is a restore source for local recovery and not a public distribution artifact. Neither source-review archives, source-only open-source review artifacts, source artifact presentation reviews, nor public/internal snapshots can replace FinalAuthorityPackagingV3 / Lean Authority v3 source-report evidence.

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
