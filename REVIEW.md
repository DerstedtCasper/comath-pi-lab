# Goal 3 Task 150 / Production Codex API Account-Network Probe

Scope: move from durable `comathd` service lifecycle evidence to a service-owned production Codex API account/network validation probe that can produce the `codex_validation_report` artifact consumed by Task148, without claiming proof authority or GA certification.

Work performed:

- Re-read the Goal 3 tracker/context and confirmed `main` was clean at `ab88067` before opening Task150.
- Audited Task146 readiness review, Task148 evidence intake, Task149 durable service lifecycle probe, and Phase51-53 Codex API/CLI validation.
- Added `goal3-task150-codex-api-account-network-probe.test.mjs`.
- RED showed `probePiCodexProductionCodexAccountNetwork` was not exported by `comathd`.
- Added `validateCodexApiAccountNetworkConnectivity()` over the existing service-configured Codex API backend config/retry path.
- Added `probePiCodexProductionCodexAccountNetwork()` and `POST /release/pi-codex-lifecycle/codex-api-probe`.
- The probe writes `.comath/release/pi-codex-lifecycle/<id>/codex-account-network-validation.json`, emits a `codex_validation_report` artifact descriptor, feeds Task148 lifecycle evidence intake through a readiness fragment, preserves bounded retry/rate-limit/status metadata, and records missing credentials, API/network failures, thrown client errors, and invalid base URLs as non-authoritative blocker evidence.
- Added the `pi_codex_production_codex_api_account_network_probe` service status capability.

Verification evidence:

- `corepack pnpm --filter @comath/comathd build` exited 0.
- TDD RED: `node services/comathd/tests/unit/goal3-task150-codex-api-account-network-probe.test.mjs` failed because `../../dist/index.js` did not export `probePiCodexProductionCodexAccountNetwork`.
- GREEN focused tests exited 0: Task150 Codex API account/network probe.
- GREEN adjacent regressions exited 0: Task146 Pi/Codex lifecycle readiness, Task148 Pi/Codex lifecycle evidence intake, Task149 durable service lifecycle probe, Phase51 Codex API backend, Phase52 Codex API retry telemetry, and Phase53 installed Codex CLI validation.
- Package gates exited 0: `corepack pnpm --filter @comath/comathd typecheck` and `corepack pnpm --filter @comath/comathd test`, with Task150 discovered by the default comathd runner.
- Post-code `node scripts/phase0-smoke.mjs`, `git diff --check`, and `Test-Path -LiteralPath .comath` exited 0.
- Code commit: `a9379f0` (`Add Codex API lifecycle validation probe`).

Boundary notes: Task150 validates Codex API account/network reachability only through service-owned credentials and a bounded Responses-compatible request. It does not expose credentials, raw auth headers, host paths, raw prompts, or raw model output in persisted artifacts. It is lifecycle readiness evidence only: `proof_authority: none`, `can_promote_claim: false`, and `can_certify_ga: false`.

Residual risks: Goal 3 remains incomplete. Task150 does not add a Pi command/tool consumer for the probe, does not validate a real Pi host install/runtime-registration path, does not provide OS-level adapter isolation, does not provide indefinite operator sessions, does not broaden Lean/mathlib replay, does not complete nontrivial theorem synthesis, and does not certify GA.

# Goal 3 Task 149 / Pi-Codex Durable Service Lifecycle Probe

Scope: move from artifact-backed operator-submitted lifecycle evidence to a service-owned durable `comathd` lifecycle probe that can directly produce the service lifecycle log consumed by Task148, without claiming proof authority or GA certification.

Work performed:

- Re-read the Goal 3 tracker/context and confirmed `main` was clean at `ef4c465` before opening Task149.
- Audited Task146 readiness review, Task148 evidence intake, Phase43 packaged adapter execution, and Phase53 installed Codex CLI validation against the remaining durable-service lifecycle collector gap.
- Added `goal3-task149-pi-codex-service-lifecycle-probe.test.mjs`.
- RED showed `probePiCodexDurableServiceLifecycle` was not exported by `comathd`.
- Added `probePiCodexDurableServiceLifecycle()` and `POST /release/pi-codex-lifecycle/service-probe`.
- The probe executes configured allowlisted `shell:false` start/status/stop/restart/status commands with bounded timeout/output capture, writes `.comath/release/pi-codex-lifecycle/<id>/service-lifecycle-probe.json`, emits a `durable_service_lifecycle_log` artifact descriptor, and returns readiness-compatible durable service lifecycle booleans.
- Missing commands, unallowlisted programs, shell-like arguments, nonzero exits, and timeouts fail closed; failed command probes still persist non-authoritative blocker evidence.

Verification evidence:

- `corepack pnpm --filter @comath/comathd build` exited 0.
- TDD RED: `node services/comathd/tests/unit/goal3-task149-pi-codex-service-lifecycle-probe.test.mjs` failed because `../../dist/index.js` did not export `probePiCodexDurableServiceLifecycle`.
- GREEN focused/adjacent tests exited 0: Task149 durable service lifecycle probe, Task148 Pi/Codex lifecycle evidence intake, Task146 Pi/Codex lifecycle readiness, Task147 Pi/Codex lifecycle consumer, Phase53 installed Codex CLI validation, and Phase43 agent adapter package.
- Package gates exited 0: `corepack pnpm --filter @comath/comathd typecheck` and `corepack pnpm --filter @comath/comathd test`, with Task149 discovered by the default comathd runner.
- `node scripts/phase0-smoke.mjs` exited 0 with 33 required entries and 33 invariants.
- Post-code `git diff --check` exited 0 with Windows LF-to-CRLF warnings only, and `Test-Path -LiteralPath .comath` returned `False`.

Boundary notes: Task149 only probes durable service lifecycle commands configured by the service operator. It does not validate a real Pi host install/runtime registration path, does not validate production Codex credentials or network access, does not provide OS-level process isolation, does not promote claims, and cannot certify GA.

Residual risks: Goal 3 remains incomplete. Real Pi host install/runtime-registration probes beyond durable service lifecycle, production Codex account/network validation, OS-level adapter isolation, richer operator UI, broader Lean/mathlib replay, nontrivial theorem synthesis, and final GA audit remain open.

Code commit: `2857649` (`Add Pi Codex service lifecycle probe`)

# Goal 3 Task 148 / Pi-Codex Lifecycle Evidence Intake

Scope: move from Pi-side lifecycle review exposure to service-owned artifact-backed evidence intake for real-host Pi/Codex lifecycle review, without treating operator-submitted evidence as proof authority or GA certification.

Work performed:

- Re-read the Goal 3 tracker/context and confirmed `main` was clean at `e94634c` before opening Task148.
- Audited Task146 readiness review and Task147 Pi release consumer wiring and identified the remaining gap: lifecycle evidence could be submitted as bare structured fields without a service-owned artifact manifest binding real-host install, runtime registration, durable service lifecycle, and Codex validation material.
- Added `goal3-task148-pi-codex-lifecycle-evidence-intake.test.mjs`.
- RED showed `collectPiCodexLifecycleEvidence` was not exported by `comathd`.
- Added `collectPiCodexLifecycleEvidence()` and `POST /release/pi-codex-lifecycle/evidence`.
- The intake reads project-contained evidence artifacts, records project-relative paths, SHA-256 hashes, and byte sizes, writes `.comath/release/pi-codex-lifecycle/<id>/evidence.json`, and produces a readiness-gate input envelope.
- Missing or non-file evidence artifacts fail closed before a readiness review can be assembled.

Verification evidence:

- `corepack pnpm --filter @comath/comathd build` exited 0.
- TDD RED: `node services/comathd/tests/unit/goal3-task148-pi-codex-lifecycle-evidence-intake.test.mjs` failed because `../../dist/index.js` did not export `collectPiCodexLifecycleEvidence`.
- GREEN focused/adjacent tests exited 0: Task148 Pi/Codex lifecycle evidence intake, Task146 Pi/Codex lifecycle readiness, Task147 Pi/Codex lifecycle consumer, Phase53 installed Codex CLI validation, and Phase43 agent adapter package.
- Package gates exited 0: `corepack pnpm --filter @comath/comathd typecheck` and `corepack pnpm --filter @comath/comathd test`, with Task148 discovered by the default comathd runner.
- Post-code `git diff --check` exited 0 and `Test-Path -LiteralPath .comath` returned `False`.
- Code commit: `678c574` (`Add Pi Codex lifecycle evidence intake`).

Boundary notes: Task148 is evidence intake and manifest binding only. It does not independently operate a real Pi host, install or manage a durable `comathd` service, validate production Codex credentials/network access, promote claims, certify proofs, or certify GA.

Residual risks: Goal 3 remains incomplete. Real-host Pi lifecycle execution, durable service start/stop/restart automation, production Codex account/network validation, OS-level adapter isolation, richer operator UI, broader Lean/mathlib replay, nontrivial theorem synthesis, and final GA audit remain open.

# Goal 3 Task 147 / Pi-Codex Lifecycle Release Consumer

Scope: expose the Task146 service-owned Pi/Codex lifecycle readiness review gate through the Pi release consumer surface without letting Pi write `.comath/` directly, overclaim proof authority, or treat submitted lifecycle evidence as verified real-host validation.

Work performed:

- Re-read the Goal 3 tracker/context and confirmed `main` was clean at `01c730c` before opening Task147.
- Audited the Task146 service gate and route plus the existing Task143 `/cm:release` public archive consumer path.
- Added `goal3-task147-pi-codex-lifecycle-consumer.test.mjs`.
- RED showed `comath.release.piCodexLifecycleReview` was not registered in the Pi extension.
- Added the `comath.release.piCodexLifecycleReview` mutating Pi tool, executable runtime registration, public result sanitization, and route dispatch to `POST /release/pi-codex-lifecycle/review`.
- Added `/cm:release pi-codex-lifecycle` command parsing for explicit install-session and Codex evidence fields, reusing Pi host confirmation and sanitized notifications.
- Wired the Task147 regression into the default `@comath/pi-extension` package test chain and updated adjacent Phase6/Phase26 registration checks.

Verification evidence:

- `corepack pnpm --filter @comath/pi-extension build` exited 0.
- TDD RED: `node extensions/comath-pi/tests/goal3-task147-pi-codex-lifecycle-consumer.test.mjs` failed because `comath.release.piCodexLifecycleReview` was not registered.
- GREEN focused/adjacent tests exited 0: Task147 Pi/Codex lifecycle consumer, Task143 Pi public release review consumer, Phase6 extension, Phase26 Pi runtime registration, and Task146 service Pi/Codex lifecycle readiness.
- Package gates exited 0: `corepack pnpm --filter @comath/pi-extension typecheck` and `corepack pnpm --filter @comath/pi-extension test`, with Task147 discovered by the default Pi extension runner.
- Post-code `node scripts/phase0-smoke.mjs` exited 0 with 33 required entries and 33 invariants, `git diff --check` exited 0, and `Test-Path -LiteralPath .comath` returned `False`.
- Code commit: `d99122c` (`Add Pi Codex lifecycle release consumer`).

Boundary notes: Task147 is a Pi consumer and release-command exposure task only. It does not create real Pi host evidence, install or manage a durable `comathd` service, validate a production Codex account/network path, provide OS-enforced adapter isolation, promote claims, certify proofs, or certify GA.

Residual risks: Goal 3 remains incomplete. The lifecycle readiness gate is now reachable from Pi tooling and `/cm:release`, but actual evidence producers for real-host Pi installation, durable service start/stop/restart, and production Codex account/network validation remain open, along with richer Lean/mathlib replay, nontrivial theorem synthesis, OS-level sandboxing, and final GA audit.

# Goal 3 Task 146 / Pi-Codex Lifecycle Readiness Gate

Scope: move from public archive hardening to the real-host Pi/Codex lifecycle residual blocker by adding a service-owned readiness gate that refuses to treat fake-host install-session evidence as full production lifecycle validation.

Work performed:

- Re-read the Goal 3 required context set and confirmed `main` was clean with no earlier `[ ]`, `[~]`, or `Commit: pending` tracker item before opening Task146.
- Audited Phase45 local Pi/comathd install-session e2e, Phase43 packaged Codex adapter lifecycle metadata, Phase53 installed Codex CLI validation, and the TODO/REVIEW residual-risk wording around real-host Pi UX and production Codex validation.
- Added `goal3-task146-pi-codex-lifecycle-readiness.test.mjs`.
- RED showed `reviewPiCodexLifecycleReadiness` was not exported by `comathd`.
- Added `reviewPiCodexLifecycleReadiness()` and `POST /release/pi-codex-lifecycle/review`.
- The review writes `.comath/release/pi-codex-lifecycle/<id>/review.json`, records `proof_authority: "none"`, `can_promote_claim: false`, and `can_certify_ga: false`, and vetoes missing real Pi host validation, ephemeral/non-durable service lifecycle evidence, and missing production Codex account/network validation.

Verification evidence:

- `corepack pnpm --filter @comath/comathd build` exited 0.
- TDD RED: `node services/comathd/tests/unit/goal3-task146-pi-codex-lifecycle-readiness.test.mjs` failed because `../../dist/index.js` did not export `reviewPiCodexLifecycleReadiness`.
- GREEN focused tests exited 0: Task146 Pi/Codex lifecycle readiness, Phase53 installed Codex CLI validation, and Phase43 agent adapter package.
- Package gates exited 0: `corepack pnpm --filter @comath/comathd typecheck`, `corepack pnpm --filter @comath/comathd test`, and `corepack pnpm --filter @comath/pi-extension test`, with Task146 discovered by the default comathd runner.
- Post-doc `node scripts/phase0-smoke.mjs` exited 0 with 33 required entries and 33 invariants, and `Test-Path -LiteralPath .comath` returned `False`.
- Code commit: `6bc1ebb` (`Add Pi Codex lifecycle readiness gate`).

Boundary notes: Task146 is a lifecycle readiness gate and blocker-evidence surface only. It does not run a real Pi host, does not install a durable service, does not validate a production Codex account/network path, does not expose a Pi UI walkthrough, does not promote claims, and does not certify GA.

Residual risks: Goal 3 remains incomplete. Task146 prevents fake-host and ephemeral local install-session evidence from satisfying full lifecycle readiness, but actual real-host Pi validation, durable service start/stop/restart validation, production Codex account/network validation, richer Lean/mathlib replay, nontrivial theorem synthesis, OS-level sandboxing, and final GA audit remain open.

# Goal 3 Task 145 / Public Archive Notarization Policy Evidence

Scope: move the public source-review archive line to the next highest-risk release blocker by adding explicit tamper-evident/notarization-policy evidence while preserving the public/internal archive authority boundary.

Work performed:

- Re-read the Goal 3 required context set and confirmed `main` was clean with no earlier `[ ]`, `[~]`, or `Commit: pending` tracker item before opening Task145.
- Audited `source-review-public-archive`, `public-archive-review`, adjacent Task141/142/144 regressions, and release-hardening docs.
- Added `goal3-task145-public-archive-notarization-policy.test.mjs`.
- RED showed assembled source-review public archives had no `notarization_manifest_path` or immutability/notarization policy evidence.
- Added a service-owned `.comath/release/source-review/public-archive/<id>/notarization-policy.json` sidecar that binds the source-review manifest hash and public report hashes.
- Recorded an explicit `source_review_public_archive_immutability_policy` with `proof_authority: "none"`, `can_promote_claim: false`, `can_restore: false`, `tamper_evident_manifest: true`, and OS immutable storage / external notarization statuses set to `not_configured`.
- Hardened the public archive review gate so legacy source-review public archive manifests without sidecar evidence, or archives whose sidecar manifest hash no longer matches, receive sanitized non-authoritative vetoes.

Verification evidence:

- `corepack pnpm --filter @comath/comathd build` exited 0.
- TDD RED: `node services/comathd/tests/unit/goal3-task145-public-archive-notarization-policy.test.mjs` failed because `notarization_manifest_path` was `undefined`.
- GREEN focused tests exited 0: Task145 public archive notarization policy, Task141 source-review public archive, Task142 public archive review gate, and Task144 public archive review error contract.
- Package gates exited 0: `corepack pnpm --filter @comath/comathd typecheck`, `corepack pnpm --filter @comath/comathd test`, and `corepack pnpm --filter @comath/pi-extension test`.
- `node scripts/phase0-smoke.mjs` exited 0 with 33 required entries and 33 invariants.
- Post-doc `git diff --check` exited 0 with Windows LF-to-CRLF warnings only, and `Test-Path -LiteralPath .comath` returned `False`.
- Code commit: `d9e9be8` (`Add public archive notarization policy evidence`).

Boundary notes: Task145 adds tamper-evident policy evidence for public diagnostic archives only. It does not provide OS-level immutable storage, does not perform external notarization, does not make public archives restorable, does not promote claims, and does not weaken Lean Authority v3 source-report or final packaging gates.

Residual risks: Goal 3 remains incomplete. Task145 closes one public archive policy-evidence gap, but richer visual review workflows, real OS-level immutable storage, external notarization, richer Lean/mathlib dependency fetching, nontrivial theorem synthesis, broader live Lean positive-matrix replay, full real-host Pi/Codex lifecycle validation, and final GA audit remain open.

# Goal 3 Task 144 / Public Archive Review Error Contract

Scope: audit public review package presentation surfaces outside the Pi command/tool path, especially service-side release review error responses that could leak host paths or privileged proof-authority vocabulary.

Work performed:

- Re-read the Goal 3 required context set and confirmed `goal-3/tasks.md` had no earlier open task; Task143's next step named Task144 as the next frontier.
- Audited `source-review-public-archive`, `public-archive-review`, release routes, and adjacent Task141-143 tests.
- Found that `/release/public-archive/review` could inspect a source-review public archive manifest whose `reports[].public_relative_path` points to a missing public report, then surface Node's `ENOENT` message with the absolute host path in the public route error body.
- Added `goal3-task144-public-archive-review-error-contract.test.mjs`.
- RED showed the route returned `500 INTERNAL_ERROR` and exposed an absolute temp path for a missing referenced report.
- Hardened referenced public report reads so missing referenced reports and directory-valued report paths fail as structured `ComathError` responses with stable codes and no path echo.

Verification evidence:

- `corepack pnpm --filter @comath/comathd build` exited 0.
- TDD RED: `node services/comathd/tests/unit/goal3-task144-public-archive-review-error-contract.test.mjs` failed because the route returned `500 INTERNAL_ERROR` and echoed an absolute `C:\Users\...\missing-public.md` path.
- GREEN focused tests exited 0: Task144 public archive review error contract, Task142 public archive review gate, and Task141 source-review public archive.
- Package gates exited 0: `corepack pnpm --filter @comath/comathd typecheck`, `corepack pnpm --filter @comath/comathd test`, and `corepack pnpm --filter @comath/pi-extension test`.
- `node scripts/phase0-smoke.mjs` exited 0 with 33 required entries and 33 invariants.
- `git diff --check` exited 0 with Windows LF-to-CRLF warnings only, and `Test-Path -LiteralPath .comath` returned `False`.

Boundary notes: Task144 changes only the public archive review error contract for referenced public report material. It does not make public archives restorable, does not alter internal source-report fidelity, does not promote claims, and does not weaken Lean Authority v3 gates.

Residual risks: Goal 3 remains incomplete. Task144 closes one remaining service-side public review error leak, but richer visual review workflows, OS-level immutable storage, external notarization, richer Lean/mathlib dependency fetching, nontrivial theorem synthesis, broader live Lean positive-matrix replay, full real-host Pi/Codex lifecycle validation, and final GA audit remain open.

# Goal 3 Task 143 / Pi Public Release Review Consumer

Scope: audit Pi/UI and public release consumer ergonomics for the source-review public archive and public archive review routes added by Tasks141-142, without letting Pi write `.comath/` directly, leak host paths, or present public diagnostics as proof authority.

Work performed:

- Re-read the Goal 3 required context set and confirmed `goal-3/tasks.md` had no earlier open task before Task143; also repaired the stale Task142 `Commit: pending` tracker marker to `cf9cfba`.
- Audited Pi runtime registration, executable tool allowlists, `/cm:*` command parsing/handlers, public tool result sanitization, and adjacent snapshot/replay/campaign export sanitizer tests.
- Added `goal3-task143-pi-public-release-review-consumer.test.mjs`.
- RED showed `comath.release.sourceReviewPublicArchive` was not registered in the Pi extension.
- Added `comath.release.sourceReviewPublicArchive` and `comath.release.publicArchiveReview` tools, both routed only to `comathd` release endpoints and both requiring Pi host confirmation.
- Added `/cm:release source-review|review` command handling and runtime-registration metadata.
- Expanded public Pi result/notification sanitization so release review responses redact privileged proof-authority vocabulary and host-path echoes.
- Updated Phase6/Phase26 runtime contract tests, Pi package test chain, README public surface wording, and TODO deferred-risk wording.

Verification evidence:

- `corepack pnpm --filter @comath/pi-extension build` exited 0.
- TDD RED: `node extensions/comath-pi/tests/goal3-task143-pi-public-release-review-consumer.test.mjs` failed because `comath.release.sourceReviewPublicArchive` was not registered.
- GREEN focused test exited 0: Task143 Pi public release review consumer.
- Package gate exited 0: `corepack pnpm --filter @comath/pi-extension test`, with Task143 discovered by the default runner.
- Typecheck gates exited 0 for `@comath/pi-extension` and `@comath/comathd`.
- Adjacent service regressions exited 0: Task141 source-review public archive and Task142 public archive review gate.
- `corepack pnpm --filter @comath/comathd build` exited 0.
- `node scripts/phase0-smoke.mjs` exited 0 with 33 required entries and 33 invariants.

Boundary notes: Task143 is a Pi consumer and presentation hardening task only. It does not change service-side release archive semantics, does not make public archives restorable, does not promote claims, and does not weaken final Lean Authority v3 packaging gates.

Residual risks: Goal 3 remains incomplete. Task143 closes the Pi public release review consumer gap, but richer visual review workflows, OS-level immutable storage, external notarization, richer Lean/mathlib dependency fetching, nontrivial theorem synthesis, broader live Lean positive-matrix replay, full real-host Pi/Codex lifecycle validation, and final GA audit remain open.

# Goal 3 Task 142 / Public Archive Review Gate

Scope: audit final GA public archive review and public review package consumers after the new source-review assembly route, especially cross-route archive manifests or download presentation surfaces that could reintroduce authority vocabulary, host-path echoes, or restorable-public-archive semantics.

Work performed:

- Re-read the Goal 3 required context set and confirmed `goal-3/tasks.md` had no earlier open task before Task142.
- Audited Task134-141 public archive/download surfaces: source-review public archive manifests, public snapshot export payloads, paper export payloads, generated report sanitization, and the service route table.
- Added `goal3-task142-public-archive-review-gate.test.mjs`.
- RED showed `dist/index.js` did not export `reviewGoal3PublicArchiveSurfaces`.
- Added `reviewGoal3PublicArchiveSurfaces()` and `/release/public-archive/review`.
- The review gate inspects manifest files and route payloads without treating the review as proof authority, writes `.comath/release/public-archive-review/<id>/review.json`, emits non-authoritative audit metadata, and reports sanitized veto codes for public archive restorable semantics, proof-authority claims, host-path exposure, authority vocabulary, and host-path echoes.
- The review output deliberately does not repeat leaked host paths or final-authority vocabulary found in malicious public material.

Verification evidence:

- `corepack pnpm build` in `services/comathd` exited 0.
- TDD RED: `node tests/unit/goal3-task142-public-archive-review-gate.test.mjs` failed because `../../dist/index.js` did not export `reviewGoal3PublicArchiveSurfaces`.
- GREEN focused test exited 0: Task142 public archive review gate.
- Adjacent public archive/path regressions exited 0: Task141 source-review public archive, Task139 public snapshot export path contract, Task137 public paper export path contract, and Task134 release public archive contract.
- Package gates exited 0: `corepack pnpm typecheck` and `corepack pnpm test` in `services/comathd`, with Task142 discovered by the default runner.

Boundary notes: Task142 adds a public archive review gate only. It does not make public archives restorable, does not certify proofs, does not change final authority packaging, and does not weaken internal restore fidelity.

Residual risks: Goal 3 remains incomplete. Task142 closes the discovered final public archive review gap for service-side manifests and route payloads, but it does not add Pi/UI review-export ergonomics, OS-level immutable storage, external notarization, richer Lean/mathlib dependency fetching, nontrivial theorem synthesis, broader live Lean positive-matrix replay, full real-host Pi/Codex lifecycle validation, or final GA audit.

# Goal 3 Task 141 / Source-Review Public Archive Contract

Scope: audit remaining source-review package assembly and generated HTML/Markdown/JSON download presentation surfaces after the Pi-host project-relative snapshot manifest UX fix, without letting public review material act as proof authority or expose host paths.

Work performed:

- Re-read the Goal 3 required context set and confirmed `goal-3/tasks.md` had no earlier open task before Task141.
- Audited release public archive contracts, snapshot public generated-report sanitization, `/paper/export`, `/snapshot/export`, and the service route table after Task134-140.
- Found a real contract gap: Task134 declared source-review public archives and sanitized generated Markdown/HTML/JSON reports, but `comathd` had no service-owned source-review public archive assembler or route that enforced those semantics at package time.
- Added `goal3-task141-source-review-public-archive.test.mjs`.
- RED showed `dist/index.js` did not export `assembleSourceReviewPublicArchive`.
- Added `assembleSourceReviewPublicArchive()` and `/release/source-review/public-archive`.
- The assembler writes a public diagnostic archive manifest plus sanitized Markdown/HTML/JSON report copies under `.comath/release/source-review/public-archive/<id>/`, exposes only project-relative paths, records `proof_authority: "none"`, `can_restore: false`, `can_promote_claim: false`, and preserves source report files unchanged.
- Bound the audit event target to `project_id` while keeping the free-form archive id in payload/result, because audit `target_id` requires a CoMath stable id.

Verification evidence:

- `corepack pnpm build` in `services/comathd` exited 0.
- TDD RED: `node tests/unit/goal3-task141-source-review-public-archive.test.mjs` failed because `../../dist/index.js` did not export `assembleSourceReviewPublicArchive`.
- GREEN focused test exited 0: Task141 source-review public archive.
- Adjacent public archive/path regressions exited 0: Task134 release public archive contract, Task135 public generated report sanitizer, Task137 public paper export path contract, and Task139 public snapshot export path contract.
- Package gates exited 0: `corepack pnpm typecheck` and `corepack pnpm test` in `services/comathd`, with Task141 discovered by the default runner.
- `node scripts/phase0-smoke.mjs` exited 0 with 33 required entries and 33 invariants.
- `git diff --check` exited 0 with Windows LF-to-CRLF warnings only, and `Test-Path -LiteralPath .comath` returned `False`.

Boundary notes: Task141 adds a public diagnostic package assembly surface only. It does not make public archives restorable, does not promote claims, does not alter internal snapshot restore fidelity, and does not make Markdown/HTML/JSON reports proof authority.

Residual risks: Goal 3 remains incomplete. Task141 closes the discovered source-review public archive assembly gap for generated Markdown/HTML/JSON report presentation, but it does not complete final GA public archive review, OS-level immutable storage, external notarization, richer Lean/mathlib dependency fetching, nontrivial theorem synthesis, broader live Lean positive-matrix replay, full real-host Pi/Codex lifecycle validation, or final GA audit.

# Goal 3 Task 140 / Pi Relative Snapshot Manifest Contract

Scope: audit the public-download presentation consumer side after Task139's project-relative snapshot export path contract, with emphasis on Pi-host UX for project-relative snapshot manifest paths and without weakening internal restore or replay fidelity.

Work performed:

- Re-read the Goal 3 required context set and confirmed `goal-3/tasks.md` had no earlier open task before Task140.
- Audited Pi snapshot tool schemas, live `/cm:snapshot` command handling, runtime registration metadata, and adjacent snapshot/replay sanitizer tests after Task139.
- Found that public `/snapshot/export` now returns project-relative manifest paths, but Pi `comath.snapshot.verify`, `comath.snapshot.restore`, `comath.replay.verifyManifest`, and `/cm:snapshot verify|restore|verify-manifest` still did not advertise or forward `project_root`.
- Added `goal3-task140-pi-relative-snapshot-manifest-contract.test.mjs`.
- RED showed `comath.snapshot.verify` did not advertise optional `project_root`; after the first fix, RED also showed `/cm:snapshot` did not advertise `verify-manifest`.
- Hardened Pi tool execution and live command handling so relative public snapshot manifest paths are submitted with `project_root` when available while absolute manifest paths remain compatible.
- Advertised `verify-manifest` in `/cm:snapshot` runtime metadata and wired the Task140 regression into the Pi extension default test chain.

Verification evidence:

- `corepack pnpm --filter @comath/pi-extension build` exited 0.
- TDD RED: `node extensions/comath-pi/tests/goal3-task140-pi-relative-snapshot-manifest-contract.test.mjs` first failed because `comath.snapshot.verify` lacked `project_root`, then failed because `/cm:snapshot` did not advertise `verify-manifest`.
- GREEN focused tests exited 0: Task140, Task131 Pi snapshot runtime consistency, Phase59 Pi product surface tool routing, and Task130 Pi snapshot/replay public authority sanitizer.
- Package gates exited 0: `corepack pnpm --filter @comath/pi-extension typecheck` and `corepack pnpm --filter @comath/pi-extension test`, with Task140 discovered by the default runner.
- `node scripts/phase0-smoke.mjs` exited 0 with 33 required entries and 33 invariants.
- `git diff --check` exited 0 with Windows LF-to-CRLF warnings only, and `Test-Path -LiteralPath .comath` returned `False`.

Boundary notes: Task140 is Pi extension consumer/metadata hardening only. It does not change service-side snapshot resolution, persisted snapshot manifests, direct internal restore fidelity, public download non-restorability, replay semantics, or proof-authority gates.

Residual risks: Goal 3 remains incomplete. Task140 closes the discovered Pi-host project-relative snapshot manifest UX gap, but it does not audit any future source-review package assembly route, generated HTML/Markdown download renderers, OS-level immutable storage, external notarization, richer Lean/mathlib dependency fetching, nontrivial theorem synthesis, broader live Lean positive-matrix replay, full real-host Pi/Codex lifecycle validation, or final GA audit.

# Goal 3 Task 139 / Public Snapshot Export Path Contract

Scope: audit remaining source-review/package assembly or public download route surfaces for host-path, metadata, and non-authority contract leaks after the paper and snapshot route hardening line, without weakening internal restore or replay fidelity.

Work performed:

- Re-read the Goal 3 required context set and confirmed `goal-3/tasks.md` had no earlier open task item before Task139.
- Audited the remaining public snapshot download route surface after Task137/Task138 hardening and found `POST /snapshot/export` still returned the direct `exportSnapshot()` result, including absolute `snapshot_root`, `manifest_path`, and `replay_manifest_path`.
- Added `goal3-task139-public-snapshot-export-path-contract.test.mjs`.
- RED showed `/snapshot/export` lacked the expected non-authoritative public archive contract and still exposed internal route shape before any project-relative path checks could pass.
- Wrapped public `/snapshot/export` responses so they expose project-relative snapshot paths and explicit `proof_authority: none`, `can_restore: false`, and `exposes_host_paths: false` public download semantics.
- Added optional `project_root` handling to public snapshot verify/restore/replay routes so project-relative manifest paths returned by public export can still be verified while absolute internal manifest inputs remain supported.
- Preserved direct internal `exportSnapshot()` fidelity, including absolute local paths and explicit `internal_restore` byte-for-byte restore material.

Verification evidence:

- `corepack pnpm --filter @comath/comathd build` exited 0.
- TDD RED: `node services/comathd/tests/unit/goal3-task139-public-snapshot-export-path-contract.test.mjs` failed because `public_archive_contract` was missing from `/snapshot/export`.
- GREEN focused tests exited 0: Task139, Task133 public snapshot restore contract, Task134 release public archive contract, Task138 snapshot route public contract, Phase16 snapshot/replay, and Phase55 runner cross-machine replay.
- Package gates exited 0: `corepack pnpm --filter @comath/comathd typecheck` and `corepack pnpm --filter @comath/comathd test`, with Task139 discovered by the default runner.
- `node scripts/phase0-smoke.mjs` exited 0 with 33 required entries and 33 invariants.
- `git diff --check` exited 0 with Windows LF-to-CRLF warnings only, and `Test-Path -LiteralPath .comath` returned `False`.

Boundary notes: Task139 is public route response hardening only. It does not rewrite persisted snapshot manifests, does not change public snapshot copy contents, does not weaken direct `internal_restore` fidelity, and does not promote snapshot or replay diagnostics into proof authority.

Residual risks: Goal 3 remains incomplete. Task139 closes the discovered public snapshot export path/contract leak, but it does not audit any future source-review package assembly route, generated HTML/Markdown download renderers, real Pi-host UX around project-relative snapshot manifests, OS-level immutable storage, external notarization, richer Lean/mathlib dependency fetching, nontrivial theorem synthesis, broader live Lean positive-matrix replay, full real-host Pi/Codex lifecycle validation, or final GA audit.

# Goal 3 Task 138 / Snapshot Route Public Path Contract

Scope: audit snapshot verify/restore and replay-verify public route payloads for path/metadata exposure, caller-supplied absolute path echoes, and public-vs-internal restore semantics while preserving explicit `internal_restore` byte-for-byte fidelity.

Work performed:

- Re-read the Goal 3 required context set and confirmed `goal-3/tasks.md` had no earlier open task before Task138.
- Audited `/snapshot/verify`, `/snapshot/restore`, and `/replay/verify-manifest` after the Task133-137 public archive hardening line.
- Added `goal3-task138-snapshot-route-public-contract.test.mjs`.
- RED showed public `/snapshot/restore` echoed the caller-provided absolute restore target.
- Hardened public snapshot verify/replay-verify responses with recursive host-path redaction before public authority vocabulary sanitization.
- Wrapped public `/snapshot/restore` so it returns restored entry count, project id, and explicit non-authoritative restore contract metadata without exposing the internal `target_root`.
- Preserved direct internal `restoreSnapshot()` behavior, including absolute `target_root` and byte-for-byte `internal_restore` material.

Verification evidence:

- `corepack pnpm --filter @comath/comathd build` exited 0.
- TDD RED: `node services/comathd/tests/unit/goal3-task138-snapshot-route-public-contract.test.mjs` failed because public `/snapshot/restore` echoed the Windows absolute route restore target.
- GREEN focused tests exited 0: Task138, Task133 public snapshot restore contract, Task137 public paper export path contract, Phase16 snapshot/replay, and Phase55 runner cross-machine replay.
- Package gates exited 0: `corepack pnpm --filter @comath/comathd typecheck` and `corepack pnpm --filter @comath/comathd test`, with Task138 discovered by the default runner.
- `node scripts/phase0-smoke.mjs` exited 0 with 33 required entries and 33 invariants.
- `git diff --check` exited 0 with Windows LF-to-CRLF warnings only, and `Test-Path -LiteralPath .comath` returned `False`.

Boundary notes: Task138 is public route response hardening only. It does not change persisted snapshot manifests, public snapshot export paths, direct internal restore fidelity, public download non-restorability, runner replay semantics, or proof authority gates.

Residual risks: Goal 3 remains incomplete. Task138 closes the discovered snapshot verify/restore/replay public route host-path echo surface, but it does not yet audit any future source-review package assembly route, OS-level immutable storage, external notarization, richer Lean/mathlib dependency fetching, nontrivial theorem synthesis, broader live Lean positive-matrix replay, full real-host Pi/Codex lifecycle validation, or final GA audit.

# Goal 3 Task 137 / Public Paper Export Path Contract

Scope: audit remaining public export/package route payloads for non-authoritative archive semantics and path/metadata exposure, with emphasis on `/paper/export` route fields.

Work performed:

- Re-read the Goal 3 required context set and confirmed `goal-3/tasks.md` had no earlier open task item before Task137.
- Audited remaining public export/package route payloads after the Task133-136 public archive and route-sanitizer line.
- Added `goal3-task137-public-paper-export-path-contract.test.mjs`.
- RED showed `/paper/export` exposed the internal absolute `path` returned by `exportPaper()`.
- Wrapped the public `/paper/export` route response so it omits the internal host path, exposes a slash-normalized project-relative artifact path, and includes a non-authoritative public archive contract with `proof_authority: none`, `can_restore: false`, and `exposes_host_paths: false`.
- Preserved direct internal `exportPaper()` behavior, including its absolute local source path for internal file fidelity.

Verification evidence:

- `corepack pnpm --filter @comath/comathd build` exited 0.
- TDD RED: `node services/comathd/tests/unit/goal3-task137-public-paper-export-path-contract.test.mjs` failed because `/paper/export` still returned public `path`.
- GREEN focused tests exited 0: Task137, Task136 public paper/literature route sanitizer, Task135 public generated report sanitizer, Task134 release public archive contract, Task133 public snapshot restore contract, and Phase12 working paper.
- Package gates exited 0: `corepack pnpm --filter @comath/comathd typecheck` and `corepack pnpm --filter @comath/comathd test`, with Task137 discovered by the default runner.
- `node scripts/phase0-smoke.mjs` exited 0 with 33 required entries and 33 invariants.
- `git diff --check` exited 0 with Windows LF-to-CRLF warnings only, and `Test-Path -LiteralPath .comath` returned `False`.

Boundary notes: Task137 is public route response hardening only. It does not rewrite persisted paper artifacts, does not change `exportPaper()` internal return fidelity, does not change snapshot restore rules, and does not make paper export material proof authority.

Residual risks: Goal 3 remains incomplete. Task137 closes the discovered public paper export host-path leak and adds explicit non-authoritative archive semantics for that route, but it does not yet fully audit snapshot verify/restore route response path echoes, any future source-review package assembly route, OS-level immutable storage, external notarization, richer Lean/mathlib dependency fetching, nontrivial theorem synthesis, broader live Lean positive-matrix replay, full real-host Pi/Codex lifecycle validation, or final GA audit.

# Goal 3 Task 136 / Public Paper And Literature Route Sanitizer

Scope: audit remaining public export/read-model route bodies outside snapshot material, with emphasis on paper and literature responses that could bypass the public authority vocabulary sanitizer.

Work performed:

- Re-read the Goal 3 required context set and confirmed `goal-3/tasks.md` had no earlier open task item before Task136.
- Audited public `comathd` route bodies after the Task131-135 sanitizer line and found that paper and literature routes still returned internal records directly.
- Added `goal3-task136-public-paper-literature-route-sanitizer.test.mjs`.
- RED showed `/paper/update-section` returned raw `formal_replay_passed`, `lean_kernel_clean_replay`, `formally_checked`, `proven`, and related privileged public vocabulary.
- Hardened public route responses for `/literature/import-bibtex`, `/literature/import-pdf`, `/literature/register-citation`, `/literature/check-condition`, `/literature/list`, `/paper/init`, `/paper/state`, `/paper/update-section`, `/paper/render-claim`, `/paper/check`, and `/paper/export`.
- Preserved internal paper and literature stores unchanged; sanitizer is applied only to public HTTP route response bodies.

Verification evidence:

- `corepack pnpm --filter @comath/comathd build` exited 0.
- TDD RED: `node services/comathd/tests/unit/goal3-task136-public-paper-literature-route-sanitizer.test.mjs` failed on `/paper/update-section must sanitize route response vocabulary`.
- GREEN focused tests exited 0: Task136, Task132 public read-model route sanitizer, Task135 public generated report sanitizer, Task128 paper export public authority sanitizer, Phase12 working paper, Phase11 literature, Task127 campaign export public authority sanitizer, and Phase21 read-model routes.
- Package gates exited 0: `corepack pnpm --filter @comath/comathd typecheck` and `corepack pnpm --filter @comath/comathd test`, with Task136 discovered by the default runner.
- `node scripts/phase0-smoke.mjs` exited 0 with 33 required entries and 33 invariants.
- `git diff --check` exited 0 with Windows LF-to-CRLF warnings only, and `Test-Path -LiteralPath .comath` returned `False`.

Boundary notes: Task136 is response-surface hardening only. It does not rewrite persisted paper/literature evidence, does not change claim promotion gates, and does not make citation, paper, or export material proof authority.

Residual risks: Goal 3 remains incomplete. Task136 closes the discovered public paper/literature route vocabulary leaks, but it does not provide OS-level immutable storage, external notarization, richer Lean/mathlib dependency fetching, nontrivial theorem synthesis, broader live Lean positive-matrix replay, full real-host Pi/Codex lifecycle validation, or final GA audit.

# Goal 3 Task 135 / Public Generated Report Snapshot Sanitizer

Scope: comprehensive check-debug loop over the Task133-134 public/internal archive and release-metadata hardening line, with emphasis on generated Markdown/HTML/JSON reports copied into public snapshot downloads.

Work performed:

- Re-read the Goal 3 required context set and confirmed `goal-3/tasks.md` had no earlier open task item before Task135.
- Audited source-review/package assembly references, generated report paths, snapshot verify/restore semantics, public archive docs/runbooks, and public proof-authority vocabulary scans.
- Added `goal3-task135-public-generated-report-sanitizer.test.mjs`.
- RED showed `.comath/artifacts/papers/main.md` was copied raw into a default `public_download` snapshot when it contained `proven`, `formally_checked`, and `clean_replay_passed`.
- Hardened public snapshot copy sanitization so generated working-paper/report material under `.comath/artifacts/papers/**` is sanitized like release, evidence, audit, workstream, artifact-index, and UTF-8 artifact-blob material.

Verification evidence:

- `corepack pnpm --filter @comath/comathd build` exited 0.
- TDD RED: `node services/comathd/tests/unit/goal3-task135-public-generated-report-sanitizer.test.mjs` failed on `.comath/artifacts/papers/main.md` leaking privileged public vocabulary.
- GREEN focused tests exited 0: Task135, Task134 release public archive contract, Task133 public snapshot restore contract, Phase16 snapshot/replay, Task131 public download consumer sanitizer, and Task17 GA acceptance workflow.
- Package gates exited 0: `corepack pnpm --filter @comath/comathd typecheck` and `corepack pnpm --filter @comath/comathd test`, with Task135 discovered by the default comathd test runner.
- `node scripts/phase0-smoke.mjs` exited 0 with 33 required entries and 33 invariants.
- `git diff --check` exited 0 with Windows LF-to-CRLF warnings only, and `Test-Path -LiteralPath .comath` returned `False`.

Boundary notes: Task135 preserves the Task133 split: default/public snapshots remain sanitized `public_download` artifacts with `can_restore=false`, while explicit `internal_restore` snapshots preserve byte-for-byte generated paper/report material and remain local restore sources only.

Residual risks: Goal 3 remains incomplete. Task135 closes the discovered generated paper/report public-snapshot leak, but it does not provide OS-level immutable storage, external notarization, richer Lean/mathlib dependency fetching, nontrivial theorem synthesis, broader live Lean positive-matrix replay, full real-host Pi/Codex lifecycle validation, or final GA audit.

# Goal 3 Task 134 / Release Public Archive Contract Metadata

Scope: align release/source-review package wording and generated GA acceptance metadata after the Task133 public-vs-internal snapshot split.

Work performed:

- Added `goal3-task134-release-public-archive-contract.test.mjs`.
- Added `public_archive_contract` to `runGoal3GaAcceptanceWorkflow()` so generated release reports explicitly distinguish source-review public diagnostic archives, sanitized `public_download` snapshots with `can_restore=false`, explicit `internal_restore` byte-for-byte runtime-fidelity snapshots, and FinalAuthorityPackagingV3 / Lean Authority v3 source-report evidence.
- Hardened `scripts/phase0-smoke.mjs` so README, REVIEW, runbook, GA release criteria, and evidence-pack policy must preserve that distinction.

Boundary notes: source-review public diagnostic archives remain non-authoritative with `proof_authority: none`; public snapshot downloads are not restore sources; internal restore snapshots are not public release artifacts; none of these archive forms can substitute for Lean Authority v3 final packaging evidence.

Residual risks: final GA audit, external notarization, richer real Lean/mathlib replay coverage, and full real-host Pi/Codex lifecycle validation remain open.

# Goal 3 Task 112 / Artifact-Backed Statement-Equivalence Replay Evidence Gate

Scope: prevent marker-only or id-only non-exact statement-equivalence evidence from satisfying candidate arbitration, StatementDiffGate, or registered logical/transitive statement-equivalence acceptance.

Work performed:

- Used two read-only subagents to inspect remaining equivalence replay evidence risks across decision arbitration, StatementDiffGate, registered logical/transitive witnesses, and bounded materialization.
- Added `goal3-task112-statement-equivalence-artifact-gate.test.mjs`. RED showed `lean_equivalence_replay:CAND-*` marker-only evidence could still select a non-exact equivalent candidate.
- Added `hasVerifiedServiceOwnedLeanEquivalenceEvidence()` requiring equivalence-specific evidence refs to resolve to verified service-owned LeanRunManifest v3 or FinalReplayManifest v3 artifacts with matching campaign/claim/candidate identity.
- Hardened non-exact `statement_equivalence_claim: "equivalent"` arbitration, StatementDiffGate replay witnesses, registered logical equivalence, registered transitive equivalence, and bounded materialized equivalence witness propagation.
- Updated Task5, Phase56, Phase78, Phase79, and Phase80 fixtures so positive non-exact equivalence cases carry artifact-backed Lean replay manifest paths.

Verification evidence:

- Focused GREEN tests: Task112, Task5, Phase18 proof-kernel gates, Phase56, Phase62, Phase78, Phase79, Phase80, and Task111.
- Package gates passed: `corepack pnpm --dir services/comathd build`, `corepack pnpm --filter @comath/comathd typecheck`, and `corepack pnpm --filter @comath/comathd test`.

Boundary notes: Task112 still does not make equivalence-search plans or materialized metadata proof authority. Non-exact statement equivalence can satisfy these local gates only when it points at verified service-owned Lean replay manifests; final promotion remains downstream Lean Authority and clean replay gated.

Residual risks: automatic equivalence proof search/execution, real live Lean/mathlib execution for broader candidates, OS-level isolation, production Pi/Codex lifecycle validation, and final GA audit remain open.

# Goal 3 Task 111 / Artifact-Backed Live Adapter Lean Evidence Gate

Scope: prevent marker-only live adapter evidence strings from substituting for service-owned LeanRunManifest v3 or FinalReplayManifest v3 artifacts when candidates are marked `candidate_kernel_checked` or when replay-project descriptors/material sources are produced.

Work performed:

- Used two read-only subagents to inspect marker-string evidence risks in the agent-stage runner, decision forest, and Task106/107 material producers.
- Added `goal3-task111-live-adapter-evidence-artifact-gate.test.mjs`. RED showed `service_owned_lean_replay:CAND-*` marker-only evidence could still satisfy replay-project descriptor emission.
- Added a shared service-owned Lean evidence resolver requiring project-contained LeanRunManifest v3 or FinalReplayManifest v3 artifacts with matching campaign/claim/candidate identity and passing service-owned Lean authority fields.
- Hardened agent-stage replay-project descriptor emission, decision-forest `candidate_kernel_checked` proof-grade evidence, candidate replay-material source production, and final replay material production to call the artifact-backed resolver.
- Updated Task14/106/107/108 and Phase18/62 fixtures to use real service-owned LeanRunManifest v3 artifact paths instead of bare replay markers.

Verification evidence:

- Focused GREEN tests: Task111, Task110, Task109, Task108 production/fail-closed, Task107 production/fail-closed, Task106 production/fail-closed, Task14, Phase18 proof-kernel gates, and Phase62 decision forest.
- Package/root gates passed: `corepack pnpm --dir services/comathd build`, `corepack pnpm --filter @comath/comathd typecheck`, `corepack pnpm --filter @comath/comathd test`, `corepack pnpm build`, and `corepack pnpm typecheck`.

Boundary notes: Task111 still does not make agent output proof authority. Adapter evidence can only satisfy these local gates when it points at verified service-owned Lean replay manifest artifacts; final proof authority still requires downstream Lean Authority packaging and clean replay gates.

Residual risks: full live Lean/mathlib execution, OS-level isolation, production Pi/Codex lifecycle validation, and GA audit remain open. The older non-exact statement-equivalence replay marker surface is intentionally left for a separate targeted audit.

# Goal 3 Task 110 / Line-Map-Owned Native Candidate Generation Request

Scope: move production of the native `candidate_generation_request.json` into the live campaign line-map gate, so Task109 native candidate generation no longer depends on hand-authored request artifacts.

Work performed:

- Used two read-only subagents to inspect the safest insertion point and request/manifest no-cheat risks.
- Added `goal3-task110-planning-native-generation-request.test.mjs`. RED showed `line_map_gate` did not produce the request; strengthened REDs exposed missing line-map hash binding and candidate-verification drift.
- Added a line-map-owned request writer that records the request in the completed `line_map_gate` stage run.
- Hardened request consumption with project/campaign/claim/obligation/statement identity, stage-run provenance, line-map and obligation hashes, V1-V8 variant requirements, and non-authority statement-boundary metadata.
- Hardened `candidate_verification` to parse candidate manifests and require candidate records plus manifests to bind the current obligation statement hash.
- Converted proof-grade-empty native arbitration to `blocked_with_replayable_reason` instead of unsupported `repair`.

Verification evidence:

- Focused GREEN tests: Task110, Task109, Task108 production/fail-closed, Task107 production/fail-closed, Task106 production/fail-closed, Task14, Phase20, Phase61, Phase62, Phase70, and Phase71.
- Package-level build/typecheck/test evidence is recorded in `goal-3/tasks.md` for this task.

Boundary notes: Task110 does not make agent output proof authority. Generated requests, candidates, manifests, and arbitration blockers remain `proof_authority: none` / non-promotional until downstream service-owned Lean Authority evidence and final replay pass.

Residual risks: live adapter evidence for replay-project descriptors still needs stronger artifact-backed LeanRunManifest/FinalReplayManifest validation; default live candidates remain plausible-only.

# Goal 3 Task 100 / Terminal Read-Model Authority-Evidence Gate

Scope: prevent campaign/Pi proof-success read models from treating legacy or imported `completed_formal_proof` campaign records as `formal_proof_verified`, `formal_replay_passed`, or export-ready proof evidence unless explicit current Lean Authority pass evidence is bound.

Work performed:

- Used high-concurrency read-only subagents to inspect service terminal projections, Pi goal-mode mapping, tests, and documentation targets.
- Added `goal3-task100-terminal-read-model-authority-gate.test.mjs`. RED showed legacy `completed_formal_proof` records projected to proof success before the authority gate.
- Added `formalReplayAuthorityEvidenceSchema` and persisted optional `formal_replay_authority_evidence` on campaigns; `formal_replay_authority_passed: true` now requires that evidence envelope.
- Hardened service terminal projections and goal-mode export readiness so proof-success aliases require both `completed_formal_proof` and a valid `comath.formal_replay_authority_evidence.v1` envelope.
- Hardened Pi `mapGoalTerminalState()` so stale `goal_mode_terminal_state: formal_replay_passed` or `external_v3_terminal_state: formal_proof_verified` cannot bypass the evidence envelope.

Verification evidence:

- TDD RED: Task100 service test initially failed because legacy `completed_formal_proof` projected to `formal_proof_verified`; Phase22 Pi test initially failed because stale external proof state mapped to `formal_replay_passed`.
- GREEN focused tests: Task100 service gate, Phase22 Pi loop, Phase69 v3 terminal vocabulary, Task16 service goal-mode routes, and Task16 Pi goal-mode.
- `corepack pnpm --filter @comath/comathd test`, `corepack pnpm build`, and `corepack pnpm typecheck` exited 0 after the evidence-envelope hardening.

Boundary notes: Task100 is read-model/export semantic hardening only. It does not install Lean, fetch mathlib, execute fresh live Lean/mathlib replay, promote any positive-matrix task, broaden theorem coverage, validate production Pi/Codex lifecycle behavior, provide OS-level sandboxing, or complete Goal 3 GA.

Residual risks: the real campaign final replay path still blocks before producing live `formal_replay_authority_evidence`; future live authority production must set that envelope only from promotion-grade Lean Authority v3 artifacts after clean replay.

# Goal 3 Task 99 / Lean-Lake Binary Provenance Gate Hardening

Scope: require promotion-grade FinalReplayManifest v3 evidence to bind Lean/Lake executable binary hashes to a passing final-replay LeanRunManifest. This closes the gap where a replay bundle could bind toolchain files and registry provenance while omitting the actual executed `lean` / `lake` binary provenance.

Work performed:

- Used high-concurrency read-only subagents to inspect binary provenance, terminal read-model semantics, and test compatibility.
- Added `goal3-task99-final-replay-binary-provenance-gate.test.mjs`. RED showed an otherwise valid v3 final-authority bundle with empty `binary_hashes` and no LeanRunManifest binary hashes could still promote a claim to `formally_checked`.
- Hardened `services/comathd/src/verification/gate.ts` so v3 final-authority packaging only satisfies promotion when `binary_hashes.lean` and `binary_hashes.lake` are SHA-256 values matching a passing final-replay LeanRunManifest v3.
- Added the explicit veto `formally_checked requires Lean/Lake binary hash provenance`.
- Updated promotion-grade positive fixtures in Task45/66/68/70 to carry dummy Lean/Lake executable files, LeanRunManifest binary hashes, and matching FinalReplayManifest `binary_hashes`.

Verification evidence:

- TDD RED: `node services/comathd/tests/unit/goal3-task99-final-replay-binary-provenance-gate.test.mjs` failed because `promotion.gate.ok` was `true`.
- GREEN focused tests: Task99, Task45, Task66, Task68, and Task70.
- `corepack pnpm --filter @comath/comathd build` exited 0.
- `corepack pnpm --filter @comath/comathd test` exited 0 with Task99 included.

Boundary notes: Task99 is promotion-gate evidence hardening only. It does not install Lean, fetch mathlib, execute fresh clean replay, promote any positive-matrix task, harden campaign/Pi terminal read-model wording, or complete Goal 3 GA.

Residual risks: concurrent read-only review confirmed the remaining high-value read-model risk: legacy or imported `completed_formal_proof` campaign records can still be projected to `formal_proof_verified` / `formal_replay_passed` unless the projection is bound to explicit current Lean Authority pass evidence.

# Goal 3 Task 98 / Legacy PM-002 Packaging Promotion-Gate Hardening

Scope: prevent legacy `comath.goal3_pm002_final_authority_packaging.v1` reports from authorizing `formally_checked` promotion. PM-002 v1 packaging remains historical compatibility material; promotion-grade proof authority now requires generic `comath.final_authority_packaging.v3`.

Work performed:

- Used high-concurrency read-only subagents to inspect final-authority/no-cheat risks, Pi goal-mode terminal read-model risks, and real Lean replay readiness gaps.
- Added `goal3-task98-legacy-pm002-packaging-v1-gate.test.mjs`. RED showed a PM-002 v1 packaging report plus FinalReplayManifest v3 could still promote a claim to `formally_checked`.
- Hardened `services/comathd/src/verification/gate.ts` so `hasVerifiedFinalAuthorityPackagingV3()` accepts only `comath.final_authority_packaging.v3` with the requested claim id.
- Updated the older Task44 PM-002 regression to assert v1 packaging cannot satisfy promotion-grade authority, while Task45 continues to cover the generic v3 positive path.

Verification evidence:

- TDD RED: `node services/comathd/tests/unit/goal3-task98-legacy-pm002-packaging-v1-gate.test.mjs` failed because `promotion.gate.ok` was `true`.
- GREEN focused tests: Task98, Task44, Task45, and Task97.
- `corepack pnpm --filter @comath/comathd build` exited 0.
- `node services/comathd/scripts/run-default-tests.mjs` exited 0.

Boundary notes: Task98 is final-authority/no-cheat gate hardening only. It does not install Lean, fetch mathlib, execute fresh clean replay, promote any positive-matrix task, broaden theorem coverage, harden Pi terminal read-model wording, or complete Goal 3 GA.

Residual risks: concurrent read-only review flagged two high-value next targets: FinalReplayManifest v3 does not yet require Lean/Lake executable binary hash provenance, and campaign/Pi terminal read-model projection can still overstate legacy `completed_formal_proof` records as proof success unless bound to an explicit current authority pass.

# Goal 3 Task 97 / Legacy Final Replay Promotion-Gate Hardening

Scope: prevent old `finalLeanReplaySchema` artifacts from authorizing `formally_checked` promotion. Legacy final replay material remains historical/diagnostic schema compatibility only; promotion authority is now Lean Authority v3 final replay packaging with registry provenance, derived binding, report checks, and replay-pack binding.

Work performed:

- Added `goal3-task97-legacy-final-replay-promotion-gate.test.mjs`. RED showed a fresh hash-bound legacy final replay manifest could still promote a claim through the old OR branch.
- Hardened `services/comathd/src/verification/gate.ts` so `formally_checked` passed-replay and promotion-grade authority checks require `hasVerifiedFinalAuthorityPackagingV3()`.
- Added explicit veto text: `formally_checked requires Lean Authority v3 final replay packaging`.
- Removed the dead legacy `hasPassedProofKernelReplay()`, `hasHashBoundFreshProofKernelReplay()`, and `finalReplayArtifactsAreFresh()` helper path from the promotion gate.

Verification evidence:

- TDD RED: `node services/comathd/tests/unit/goal3-task97-legacy-final-replay-promotion-gate.test.mjs` failed because `promotion.gate.ok` was `true`.
- GREEN focused tests: Task97, Phase64 Lean authority v2 negative fixtures, Phase18 proof-kernel gates, Phase18 campaign vertical slice, Task45/62/64/66 final-authority v3 regressions.
- `corepack pnpm --filter @comath/comathd build`, `corepack pnpm build`, `corepack pnpm typecheck`, and `corepack pnpm test` exited 0.
- Static scan confirmed `gate.ts` no longer references `finalLeanReplaySchema` or the legacy proof-kernel replay helper names. `Test-Path -LiteralPath .comath` returned `False`.

Boundary notes: Task97 is final-authority/no-cheat gate hardening only. It does not install Lean, fetch mathlib, execute fresh clean replay, promote any positive-matrix task, broaden theorem coverage, or complete Goal 3 GA.

Residual risks: broader live Lean/mathlib positive-matrix replay, production Pi/Codex lifecycle validation, OS-level sandboxing, and final GA audit remain open. Local `lean` and `lake` still resolve to elan shims but fail because no default Lean toolchain is configured.

# Goal 3 Task 96 / Positive-Matrix Batch Consumer Semantics Hardening

Scope: prevent batch positive-matrix consumers from presenting PM-001 representative fixture or aggregate harness evidence as per-task `lean_kernel_clean_replay`, without claiming live Lean replay or GA completion.

Work performed:

- Added `goal3-task96-positive-batch-consumer-semantics.test.mjs`, proving the separate representative proof workflow remains available while `runGoal3GaPositiveMatrixBatch()` keeps PM-001 and all other batch tasks non-authoritative unless each task has its own clean Lean/mathlib replay evidence.
- Hardened `runGoal3GaPositiveMatrixBatch()` so it no longer calls the representative proof workflow or copies its replay IDs into PM-001 batch output.
- Updated the older Task21 matrix-runner regression to require `proof_authority: "none"`, empty evidence binding, and `replayable_blocker` classification for PM-001 batch output.

Verification evidence:

- TDD RED: `node services/comathd/tests/unit/goal3-task96-positive-batch-consumer-semantics.test.mjs` failed with `batch matrix consumers cannot inherit the representative fixture clean replay` because `summary.clean_replay_passed` was `1`.
- GREEN focused tests: Task96, Task21, Task94 positive-matrix consumer semantics, Task17 GA acceptance workflow, Task95 real replay toolchain mismatch blocker, Task86 real Lean replay slice gate, Task90 final authority provenance gate, Task91 final replay artifact kind gate, and Task94 final-authority FormalSpec schema gate.
- `corepack pnpm --filter @comath/comathd build`, `corepack pnpm --filter @comath/comathd typecheck`, full `corepack pnpm --filter @comath/comathd test`, root `corepack pnpm build`, root `corepack pnpm typecheck`, and root `corepack pnpm test` exited 0.
- Static scans found no direct privileged claim-status writes outside read-only paper checks, no `can_promote_claim: true`, no `direct_claim_mutation: true`, no non-Lean `proof_authority` assignment, and no restored theorem-family/Nat-linear/default-assumption production path. `Test-Path -LiteralPath .comath` returned `False`, and no `.comath`, `.tmp`, `dist`, `node_modules`, or package `dist` paths are tracked by Git.

Boundary notes: Task96 is consumer-semantics hardening only. It does not install Lean, fetch mathlib, execute fresh clean replay, promote any positive-matrix task, broaden theorem coverage, or complete Goal 3 GA.

Residual risks: a read-only subagent flagged the legacy `hasHashBoundFreshProofKernelReplay()` promotion-gate OR branch as a higher-risk remaining final replay binding audit target. Broader live Lean/mathlib positive-matrix replay, production Pi/Codex lifecycle validation, OS-level sandboxing, and final GA audit remain open.

# Goal 3 Task 95 / Real Replay Toolchain Mismatch Blocker Contract

Scope: make the real positive-matrix Lean replay path fail closed when the declared `lean-toolchain` does not match the probed Lean version, without throwing out of the workflow or producing authority-shaped replay evidence.

Work performed:

- Added `goal3-task95-real-replay-toolchain-mismatch-blocker.test.mjs`. RED showed `runServiceOwnedLeanCommandV3()` threw `lean_toolchain_mismatch` through the positive-matrix executor instead of returning a structured blocker.
- Added a dedicated blocker code, `lean_toolchain_mismatch_for_live_replay`, for real replay setup mismatches.
- Hardened the generic positive-matrix executor, PM-002 legacy executor, and final replay completion boundary so Lean/Lake/toolchain metadata failures are converted into non-authoritative replayable blockers before any replay command runs.
- Preserved archive and environment diagnostic semantics: mismatch archives remain `proof_authority: none`, `can_promote_claim: false`, and diagnostic-only.

Verification evidence:

- TDD RED: `node services/comathd/tests/unit/goal3-task95-real-replay-toolchain-mismatch-blocker.test.mjs` initially failed with thrown `Error: lean_toolchain_mismatch`.
- GREEN focused tests: Task95, Task86, Task89, Task90, Task91, Task94 schema gate, Task94 positive-matrix consumer semantics, and Task17 acceptance workflow.
- `corepack pnpm --filter @comath/comathd build`, `corepack pnpm --filter @comath/comathd typecheck`, full `corepack pnpm --filter @comath/comathd test`, root `corepack pnpm build`, root `corepack pnpm typecheck`, and root `corepack pnpm test` exited 0.
- Static scans found no direct claim-status mutation writes outside read-only paper checks, no `can_promote_claim: true`, no `direct_claim_mutation: true`, and no restored theorem-family/Nat-linear/default-assumption production path.
- `lean` and `lake` still resolve to elan shims, but both fail with no default toolchain configured; Task95 records mismatch/unavailable states as blockers rather than proof authority.

Boundary notes: Task95 does not install Lean, fetch mathlib, execute a fresh real clean replay, or broaden theorem coverage. It only hardens the live replay environment boundary.

Residual risks: a read-only subagent flagged that PM-001 batch consumer semantics can still look like per-task `lean_kernel_clean_replay`, and another flagged the older final replay gate path as a future binding audit target. Those are left for Task96+.

# Goal 3 Task 94 / Final-Authority Binding Schema And Matrix Consumer Semantics

Scope: close the Task91-93 check-debug gap where final-authority derived binding material could omit explicit claim-bound FormalSpecLock / AssumptionLedger fields while still verifying, and prevent the GA acceptance positive matrix from inheriting proof authority from a separate representative fixture.

Work performed:

- Added `goal3-task94-final-authority-formal-spec-schema-gate.test.mjs`. RED showed malformed FormalSpecLock / AssumptionLedger material still returned `verified_final_authority_evidence`; GREEN now requires explicit `schema_version`, `task_id`, `claim_id`, `statement_hash` / `formal_spec_lock_hash`, theorem identity, and `proof_authority: "none"` in both packaging and ordinary promotion-gate derived binding checks.
- Added `goal3-task94-positive-matrix-consumer-semantics.test.mjs`. RED showed `runGoal3GaAcceptanceWorkflow()` rewrote the first positive-matrix seed into `representative_verified_fixture` with `lean_kernel_clean_replay`; GREEN now leaves the 100-task positive matrix as replayable blockers and keeps the representative proof workflow separate.
- Reworked default `@comath/comathd` test execution through `scripts/run-default-tests.mjs` after Windows rejected the previous long package test command line.
- Updated final-authority positive fixtures to carry explicit claim-bound FormalSpecLock / AssumptionLedger binding fields.
- Added a Goal 3 supersession note to `docs/progress/product-readiness-matrix.md`; also corrected the external agent prompt source so only Lean4/mathlib clean replay is proof authority, with computation/literature/search/votes remaining evidence or hints only.

Verification evidence:

- TDD RED: `node services/comathd/tests/unit/goal3-task94-final-authority-formal-spec-schema-gate.test.mjs` initially failed because malformed bindings verified.
- TDD RED: `node services/comathd/tests/unit/goal3-task94-positive-matrix-consumer-semantics.test.mjs` initially failed because the positive matrix rewrote `PM-001` as proof-authority fixture evidence.
- GREEN focused tests: Task94 schema gate, Task94 consumer semantics, Task17 acceptance workflow, Task62/64/70/90/91 final-authority regressions.
- `corepack pnpm --filter @comath/comathd build`, `corepack pnpm --filter @comath/comathd typecheck`, and full `corepack pnpm --filter @comath/comathd test` exited 0.
- Static scans over `services/comathd/src` and `extensions/comath-pi/src` found no direct claim-status mutation writes, no `can_promote_claim: true`, no `direct_claim_mutation: true`, no non-Lean proof-authority assignment, and no restored `Lean Nat notation` / `Lean Nat syntax` production wording. Remaining `n : Nat` hits are documented historical/negative fixtures.
- `where.exe lean` and `where.exe lake` resolve to elan shims, but `lean --version` and `lake --version` still fail with no default toolchain configured; Task94 did not install or configure Lean.

Boundary notes: Task94 is still not live Lean/mathlib proof execution. It hardens evidence binding and consumer semantics while preserving fail-closed behavior on this workstation's missing Lean toolchain. Broader live replay, real Pi/Codex lifecycle validation, OS-level sandboxing, and complete GA release validation remain open.

# Goal 3 Task 92 / Dashboard Audit Evidence Semantics

Scope: fix Pi dashboard read-model wording so `audit` evidence from real replay attempt archives is not rendered as generic `runner` evidence.

Changes:

- Added `goal3-task92-dashboard-audit-evidence-semantics.test.mjs`.
- Extended `EvidenceBoardItem.source` with `audit`.
- Updated Pi dashboard evidence normalization so `kind: "audit"` renders as `audit`, while Lean/symbolic/computation/counterexample evidence still renders as `runner`.
- Wired the Task92 regression into the default `@comath/pi-extension` test chain.

TDD evidence:

```text
node tests/goal3-task92-dashboard-audit-evidence-semantics.test.mjs
Initial RED result: exit 1; `kind: "audit"` rendered as `runner`.
```

Verification:

- `corepack pnpm --filter @comath/pi-extension build`
- `node tests/goal3-task92-dashboard-audit-evidence-semantics.test.mjs`
- `corepack pnpm --filter @comath/pi-extension typecheck`
- `node tests/phase15-dashboard.test.mjs`
- `node tests/goal3-task16-pi-goal-mode.test.mjs`
- `corepack pnpm --filter @comath/pi-extension test`
- `node services/comathd/tests/unit/goal3-task88-real-replay-attempt-archive.test.mjs`
- `node services/comathd/tests/unit/goal3-task89-real-replay-environment-diagnostic.test.mjs`
- `node services/comathd/tests/unit/goal3-task91-final-replay-artifact-kind-gate.test.mjs`
- `corepack pnpm build`
- `corepack pnpm typecheck`
- `corepack pnpm test`

Boundary notes: Task92 is a Pi read-model/UI semantics fix only. It does not alter service-side promotion gates, artifact kinds, audit evidence records, final replay manifests, replay registry provenance, Lean environment probing, theorem recognition, Nat-linear synthesis, default assumptions, or proof authority. Archive and diagnostic evidence remain non-authoritative unless an ordinary `comathd` final Lean Authority promotion gate passes.

Residual risks: this workstation still has elan shims without an active/default Lean toolchain, so real Lean/mathlib clean replay remains blocked. A read-only no-reinvent scan also flagged a `notation_gate` wording risk in `campaign-tick.ts` that mentions Lean Nat notation; it did not inject `n : Nat` in this task, but should be reviewed as a later formal-spec-derived notation cleanup.

# Goal 3 Task 91 / Final Replay Artifact Provenance Gate

Scope: harden the ordinary promotion gate so FinalReplayManifest v3 evidence must have both runner-output artifact provenance and service-owned append-only registry audit provenance.

Changes:

- Added `goal3-task91-final-replay-artifact-kind-gate.test.mjs`.
- Extended `appendFinalReplayRegistryEntryV3()` with optional audit provenance emission via `lean.final_replay_registry_appended`.
- Hardened `hasFinalReplayRegistryProvenance()` so JSONL equality alone is insufficient; the gate now also requires the matching audit event with replay id, manifest hash, runner, proof authority, and service-owned provenance flag.
- Hardened `hasVerifiedFinalAuthorityPackagingV3()` so the submitted FinalReplayManifest v3 artifact itself must be `runner_output`.
- Added explicit veto `formally_checked requires final replay manifest runner_output artifact provenance`.
- Updated positive final-authority fixtures to append registry entries with audit provenance.

TDD evidence:

```text
node services/comathd/tests/unit/goal3-task91-final-replay-artifact-kind-gate.test.mjs
Initial RED result: exit 1; registry JSONL equality alone promoted helper-created final-authority evidence.

Earlier RED variant: exit 1; FinalReplayManifest v3 submitted as artifact kind "other" still promoted.
```

Verification:

- `corepack pnpm --filter @comath/comathd build`
- `node services/comathd/tests/unit/goal3-task91-final-replay-artifact-kind-gate.test.mjs`
- `node services/comathd/tests/unit/goal3-task44-pm002-packaging-promotion-gate.test.mjs`
- `node services/comathd/tests/unit/goal3-task45-generic-final-authority-packaging-gate.test.mjs`
- `node services/comathd/tests/unit/goal3-task66-derived-binding-promotion-gate.test.mjs`
- `node services/comathd/tests/unit/goal3-task68-derived-report-binding-gate.test.mjs`
- `node services/comathd/tests/unit/goal3-task70-derived-binding-promotion-bundle.test.mjs`
- `node services/comathd/tests/unit/goal3-task8-lean-authority-v3-final-replay.test.mjs`
- `node services/comathd/tests/unit/goal3-task87-injected-final-replay-authority-gate.test.mjs`
- `node services/comathd/tests/unit/goal3-task88-real-replay-attempt-archive.test.mjs`
- `node services/comathd/tests/unit/goal3-task89-real-replay-environment-diagnostic.test.mjs`
- `node services/comathd/tests/unit/goal3-task90-final-authority-provenance-gate.test.mjs`
- `corepack pnpm --filter @comath/comathd typecheck`
- `corepack pnpm --filter @comath/comathd test`
- `corepack pnpm build`
- `corepack pnpm typecheck`
- `corepack pnpm test`

Boundary notes: Task91 does not install Lean, configure elan, download mathlib, add theorem recognition, add Nat-linear synthesis, add default assumptions, or turn archive/diagnostic/UI evidence into proof authority. On this workstation `lean` and `lake` still resolve to elan shims but fail with no default toolchain configured.

Residual risks: the Pi dashboard currently renders `audit` evidence with a generic runner label in read-only UI text; this is a consumer-semantics issue rather than a promotion-gate bypass and should be handled in a later task. Real PM-084 Lean/mathlib execution still requires a prepared Lean toolchain and declared replay material.

## Goal 3 Task 90 / Final Authority Provenance Check-Debug Loop

Scope: comprehensive check-debug loop over Tasks 87-89, closing helper-created final-authority artifact promotion and clarifying real replay archive non-authority semantics.

Changes:

- Added `goal3-task90-final-authority-provenance-gate.test.mjs`.
- Hardened final-authority promotion gating so FinalReplayManifest v3 packaging must be submitted as `runner_output` and must match an exact append-only `final_replay_registry.jsonl` entry before it can satisfy Lean authority evidence.
- Added the explicit veto `formally_checked requires service-owned clean replay provenance`.
- Updated positive final-authority fixtures to append registry entries before promotion.
- Made final-authority promotion bundles report `proof_authority: none` and `promoted_by_ordinary_gate: false` when the ordinary gate rejects.
- Added archive-only semantics and a dedicated `goal3.real_replay_attempt_archived` audit event for Task88/89 replay attempt archives.

TDD evidence:

```text
node services/comathd/tests/unit/goal3-task90-final-authority-provenance-gate.test.mjs
Initial RED result: exit 1; helper-created authority-shaped artifacts promoted without replay registry provenance.
```

Verification:

- `node services/comathd/tests/unit/goal3-task90-final-authority-provenance-gate.test.mjs`
- `node services/comathd/tests/unit/goal3-task88-real-replay-attempt-archive.test.mjs`
- `node services/comathd/tests/unit/goal3-task89-real-replay-environment-diagnostic.test.mjs`
- `node services/comathd/tests/unit/goal3-task86-real-lean-replay-slice-gate.test.mjs`
- `node services/comathd/tests/unit/goal3-task87-injected-final-replay-authority-gate.test.mjs`
- `node services/comathd/tests/unit/goal3-task44-pm002-packaging-promotion-gate.test.mjs`
- `node services/comathd/tests/unit/goal3-task45-generic-final-authority-packaging-gate.test.mjs`
- `node services/comathd/tests/unit/goal3-task66-derived-binding-promotion-gate.test.mjs`
- `node services/comathd/tests/unit/goal3-task68-derived-report-binding-gate.test.mjs`
- `node services/comathd/tests/unit/goal3-task70-derived-binding-promotion-bundle.test.mjs`
- `corepack pnpm --filter @comath/comathd build`
- `corepack pnpm --filter @comath/comathd typecheck`
- `corepack pnpm --filter @comath/comathd test`
- `corepack pnpm build`
- `corepack pnpm typecheck`
- `corepack pnpm test`

Boundary notes: Task90 does not install Lean, configure elan, download mathlib, add theorem recognition, add Nat-linear synthesis, add default assumptions, or turn archives/diagnostics into proof authority. On this workstation `lean` and `lake` still resolve to elan shims but fail with no default toolchain configured.

Residual risks: real PM-084 Lean/mathlib execution still requires a prepared Lean toolchain and declared replay material. Broader positive-matrix live replay, production Pi/Codex lifecycle validation, OS-level sandboxing, and comprehensive GA release validation remain open.

## Goal 3 Task 89 / Real Replay Environment Diagnostic Archive

Scope: bind real Lean/Lake replay-readiness diagnostics into the Task88 archive path without making environment probes or archives proof authority.

Changes:

- Added `Goal3GaRealReplayEnvironmentDiagnostic` and embedded `environment_diagnostic` in `Goal3GaPositiveMatrixRealReplayAttemptArchive`.
- The diagnostic records `lean --version` and `lake --version` probe results, probe source, `can_run_clean_replay`, blocker details, and explicit non-authority fields.
- Hardened `executeGoal3GaPositiveMatrixLeanAuthorityReplay()` so final-authority completion with injected version probes and no real service-owned replay command fails closed before authority evidence is produced.
- Added `goal3-task89-real-replay-environment-diagnostic.test.mjs` and wired it into the default `@comath/comathd` test chain.

TDD evidence:

```text
node services/comathd/tests/unit/goal3-task89-real-replay-environment-diagnostic.test.mjs
Initial RED result: exit 1; archived.environment_diagnostic was undefined.
```

Verification:

- `node services/comathd/tests/unit/goal3-task89-real-replay-environment-diagnostic.test.mjs`
- `node services/comathd/tests/unit/goal3-task86-real-lean-replay-slice-gate.test.mjs`
- `node services/comathd/tests/unit/goal3-task87-injected-final-replay-authority-gate.test.mjs`
- `node services/comathd/tests/unit/goal3-task88-real-replay-attempt-archive.test.mjs`
- `node services/comathd/tests/unit/goal3-task40-pm002-lean-authority-executor.test.mjs`
- `node services/comathd/tests/unit/goal3-task58-pm079-pm089-generic-lean-executor.test.mjs`
- `corepack pnpm --filter @comath/comathd build`
- `corepack pnpm --filter @comath/comathd typecheck`
- `corepack pnpm --filter @comath/comathd test`
- `corepack pnpm build`
- `corepack pnpm typecheck`
- `corepack pnpm test`

Boundary notes: Task89 does not install Lean, configure elan, download mathlib, restore injected final replay authority, or add theorem recognition/Nat-linear/default-assumption paths. On this workstation `lean` and `lake` resolve to elan shims, but both version commands fail because no default toolchain is configured; Task89 records that as `lean_toolchain_unavailable_for_live_replay` with `proof_authority: none`.

Residual risks: real PM-084 Lean/mathlib execution still requires a prepared Lean toolchain and declared replay material in runtime state. Broader positive-matrix live replay, production Pi/Codex lifecycle validation, and comprehensive GA release validation remain open.

## Goal 3 Task 88 / Real Replay Attempt Archive Evidence Layer

Scope: add a service-owned archive/evidence layer for Task86 real Lean replay attempts without turning replay blockers into proof authority.

Changes:

- Added `archiveGoal3GaPositiveMatrixRealReplayAttemptEvidence()`.
- The archive helper calls the Task86 real replay slice, writes `.comath/release/positive_matrix/<TASK>/real_lean_replay_attempt_archive_v1.json`, imports archive/blocker/packaging files as `other` artifacts, and appends `audit` evidence.
- The archive helper rejects replay material whose FormalSpecLock or AssumptionLedger is bound to a different claim.
- Archive records stay non-authoritative: `proof_authority: none`, `can_promote_claim: false`, `archive_is_proof_authority: false`, `no_injected_final_replay_authority: true`, `direct_claim_mutation: false`.
- Added `goal3-task88-real-replay-attempt-archive.test.mjs` and wired it into the default `@comath/comathd` test chain.

TDD evidence:

```text
node services/comathd/tests/unit/goal3-task88-real-replay-attempt-archive.test.mjs
Initial RED result: exit 1; ../../dist/index.js did not export archiveGoal3GaPositiveMatrixRealReplayAttemptEvidence.
```

Verification:

- `node services/comathd/tests/unit/goal3-task88-real-replay-attempt-archive.test.mjs`
- `node services/comathd/tests/unit/goal3-task85-pm084-live-final-authority-completion.test.mjs`
- `node services/comathd/tests/unit/goal3-task86-real-lean-replay-slice-gate.test.mjs`
- `node services/comathd/tests/unit/goal3-task87-injected-final-replay-authority-gate.test.mjs`
- `node services/comathd/tests/unit/goal3-task45-generic-final-authority-packaging-gate.test.mjs`
- `corepack pnpm --filter @comath/comathd build`
- `corepack pnpm --filter @comath/comathd typecheck`
- `corepack pnpm --filter @comath/comathd test`
- `corepack pnpm build`
- `corepack pnpm typecheck`
- `corepack pnpm test`

Boundary notes: Task88 does not enable real replay by default, does not download or install Lean/mathlib, does not restore injected final replay authority, and does not add theorem recognition, Nat-linear synthesis, default assumptions, or a new proof authority. On this workstation, `lean`/`lake` resolve to elan shims but no active toolchain is configured, so real PM-084 replay remains a replayable environment blocker.

Residual risks: real PM-084 Lean/mathlib execution still requires a prepared Lean toolchain and declared replay material in runtime state. Broader positive-matrix live replay, production Pi/Codex lifecycle validation, and comprehensive GA release validation remain open.

## Goal 3 Task 87 / Injected Final Replay Authority Gate

Scope: close the no-cheat gap where the exported generic positive-matrix Lean Authority executor could use an injected `runReplayCommand` callback to fabricate final replay success.

Changes:

- Added `goal3-task87-injected-final-replay-authority-gate.test.mjs`.
- Hardened `executeGoal3GaPositiveMatrixLeanAuthorityReplay()` so `completeFinalAuthorityEvidence: true` with an injected replay callback returns a replayable blocker before final replay generation.
- Preserved non-authoritative injected check/build callback coverage for executor blocker tests, but final Lean Authority evidence now requires real service-owned `lean/lake` process execution.
- Updated Task85 and Task86 regressions so mocked replay callbacks are no longer treated as verified final-authority evidence.
- Wired Task87 into the default `@comath/comathd` test chain.

TDD evidence:

```text
node services/comathd/tests/unit/goal3-task87-injected-final-replay-authority-gate.test.mjs
Initial RED result: exit 1; the injected runner was called three times, including the final replay command.
```

Verification:

- `corepack pnpm --filter @comath/comathd build`
- `node services/comathd/tests/unit/goal3-task85-pm084-live-final-authority-completion.test.mjs`
- `node services/comathd/tests/unit/goal3-task86-real-lean-replay-slice-gate.test.mjs`
- `node services/comathd/tests/unit/goal3-task87-injected-final-replay-authority-gate.test.mjs`
- `node services/comathd/tests/unit/goal3-task42-pm002-final-authority-packaging.test.mjs`
- `node services/comathd/tests/unit/goal3-task44-pm002-packaging-promotion-gate.test.mjs`
- `node services/comathd/tests/unit/goal3-task45-generic-final-authority-packaging-gate.test.mjs`
- `node services/comathd/tests/unit/goal3-task58-pm079-pm089-generic-lean-executor.test.mjs`
- `corepack pnpm --filter @comath/comathd typecheck`
- `corepack pnpm --filter @comath/comathd test`
- `corepack pnpm build`
- `corepack pnpm typecheck`
- `corepack pnpm test`

Boundary notes: Task87 does not introduce theorem recognition, Nat-linear synthesis, default assumptions, a new proof authority, or claim promotion. It makes the final replay path stricter: injected callbacks can no longer produce `verified_final_authority_evidence`.

Residual risks: real PM-084 Lean/mathlib execution remains environment-gated and was not run by default CI. A durable archive/evidence layer for real replay attempts remains the next useful frontier.

## Goal 3 Task 86 / Environment-Gated Real Lean Replay Slice

Scope: make the PM-084 real Lean/mathlib replay path explicit and fail-closed by default, and harden final-authority packaging against same-path LeanRunManifest semantic drift.

Changes:

- Added `executeGoal3GaPositiveMatrixRealLeanReplaySlice()` and `goal3RealLeanReplaySliceEnabled()`.
- The real slice validates declared PM material but returns a replayable blocker unless explicitly enabled by `COMATH_ENABLE_GOAL3_REAL_LEAN_REPLAY=1` or a service-owned enable flag.
- The real slice does not accept injected `runReplayCommand` stubs; enabled execution uses the existing service-owned Lean/Lake runner path.
- Hardened PM-002 and generic final-authority source verification so a submitted LeanRunManifest set must contain a final replay run with matching claim, campaign, clean cwd, command, disabled network policy, zero exit code, and `proof_authority: lean_kernel_check`.
- Updated older Task42/44/45 positive fixtures to include explicit final replay LeanRunManifest evidence rather than relying on check/build manifests.
- Added `goal3-task86-real-lean-replay-slice-gate.test.mjs` and wired it into the default `@comath/comathd` test chain.

TDD evidence:

```text
node services/comathd/tests/unit/goal3-task86-real-lean-replay-slice-gate.test.mjs
Initial RED result: exit 1; ../../dist/index.js did not export executeGoal3GaPositiveMatrixRealLeanReplaySlice.

node services/comathd/tests/unit/goal3-task86-real-lean-replay-slice-gate.test.mjs
Second RED result: exit 1; a same-path final LeanRunManifest mutated to purpose=build/proof_authority=none/command=echo still returned verified_final_authority_evidence.
```

Verification:

- `corepack pnpm --filter @comath/comathd build`
- `node services/comathd/tests/unit/goal3-task86-real-lean-replay-slice-gate.test.mjs`
- `node services/comathd/tests/unit/goal3-task42-pm002-final-authority-packaging.test.mjs`
- `node services/comathd/tests/unit/goal3-task44-pm002-packaging-promotion-gate.test.mjs`
- `node services/comathd/tests/unit/goal3-task85-pm084-live-final-authority-completion.test.mjs`
- `node services/comathd/tests/unit/goal3-task84-structured-audit-run-binding.test.mjs`
- `node services/comathd/tests/unit/goal3-task45-generic-final-authority-packaging-gate.test.mjs`
- `node services/comathd/tests/unit/goal3-task8-lean-authority-v3-final-replay.test.mjs`
- `corepack pnpm --filter @comath/comathd typecheck`
- `corepack pnpm --filter @comath/comathd test`
- `corepack pnpm build`
- `corepack pnpm typecheck`
- `corepack pnpm test`

Boundary notes: Task 86 does not add theorem recognition, Nat-linear synthesis, default assumptions, or a new proof authority. Without explicit real-replay enablement it records only a blocker. Verified packaging still cannot directly promote a claim.

Residual risks: Task 86 does not make default CI a real Lean/mathlib proof authority run. The real replay path is explicit and environment-gated; broader PM matrix live replay coverage and final GA validation remain open.

## Goal 2 Task 33 / Phase 81 Controlled Nat Linear Identity Synthesis

Scope: move broad theorem synthesis one product step beyond the Phase 76 registered Nat target table by adding a controlled one-variable Nat linear identity synthesizer.

Changes:

- Added a safe Nat linear-expression parser for `n`, natural-number constants, `+`, and constant multiplication with `n`.
- `theoremSpecificLeanTarget()` can now synthesize targets outside the registered table only when both sides normalize to identical coefficient/constant forms.
- The synthesized path reuses the existing theorem-specific Lean package, bounded `by omega` proof-body artifact, Lean Authority v2 report-preparation artifacts, final clean replay manifest, and promotion gate.
- Target and proof-body artifacts now record `synthesis_scope: controlled_nat_linear_identity_synthesis` and `linear_normal_form` for synthesized targets.
- False identities, negative/refutation prompts, unsafe syntax, unsupported multi-variable syntax, and nonlinear terms such as `n * n` remain fail-closed without theorem-specific packages or final replay authority.
- Wired Phase 81 into the default `@comath/comathd` test chain, service status capability, README, TODO, acceptance matrix, and readiness matrix without claiming arbitrary theorem proving.

TDD evidence:

```text
node services/comathd/tests/integration/phase81-controlled-nat-linear-synthesis.test.mjs
Initial RED result: exit 1; `2 * n + 3 = n + n + 3` stopped at blocked broad synthesis instead of reaching `completed_formal_proof`.
```

Verification:

- `corepack pnpm --filter @comath/comathd build`
- `node services/comathd/tests/integration/phase81-controlled-nat-linear-synthesis.test.mjs`
- `node services/comathd/tests/integration/phase76-registered-nat-linear-targets.test.mjs`
- `node services/comathd/tests/integration/phase75-bounded-final-clean-replay.test.mjs`
- `node services/comathd/tests/integration/phase73-bounded-lean-proof-body-synthesis.test.mjs`
- `node services/comathd/tests/integration/phase72-theorem-specific-lean-generation.test.mjs`
- `node services/comathd/tests/phase0-smoke.test.mjs`
- `corepack pnpm --filter @comath/comathd typecheck`
- `corepack pnpm --filter @comath/comathd test`

Boundary notes: Phase 81 is controlled one-variable Nat linear synthesis only. It does not implement arbitrary theorem proving, nonlinear arithmetic synthesis, multi-variable theorem synthesis, broad MathProve proof authority, or automatic statement-equivalence proof search.

Residual risks: global GA still needs product-code work on broader theorem planning/synthesis beyond this safe linear grammar, broad MathProve proof search/proof-authority semantics, production Pi/Codex lifecycle validation, OS-level runner/process sandboxing, indefinite operator sessions, and statement-equivalence proof execution beyond registered bounded materializations.

## Goal 2 Task 32 / Comprehensive Check-Debug Loop 10

Scope: comprehensive check-debug loop over Phase 79 statement-equivalence proof-search plan artifacts and Phase 80 bounded equivalence-search witness materialization.

Verification:

- `corepack pnpm --filter @comath/comathd build`
- `node services/comathd/tests/unit/phase79-lean-equivalence-search-plan.test.mjs`
- `node services/comathd/tests/unit/phase80-bounded-equivalence-witness-materialization.test.mjs`
- `node services/comathd/tests/unit/phase56-lean-registered-logical-equivalence.test.mjs`
- `node services/comathd/tests/unit/phase78-lean-transitive-equivalence.test.mjs`
- `node services/comathd/tests/unit/phase64-lean-authority-v2-final-gate.test.mjs`
- `node services/comathd/tests/phase0-smoke.test.mjs`
- `node scripts/phase0-smoke.mjs`
- `corepack pnpm --filter @comath/comathd typecheck`
- `corepack pnpm --filter @comath/comathd test`

Audit result:

- Phase 79 remains a non-authoritative `blocked_unproved` obligation artifact path. It writes only bounded search-plan metadata for unresolved unique target-signature mismatches with safe lemma hints.
- Phase 80 remains bounded witness-metadata materialization. It validates exact source/target binding, safe registered hints, non-empty witness artifact id, required next artifacts, and bounded allowlisted materializations before returning a registered witness candidate.
- Authority scans over the Phase 79/80 source and tests found no `claim.status =`, `formally_checked`, `applyGatePromotedClaim`, or `promoteClaim` usage in the Phase 79/80 surfaces. The only promotional tamper case is the negative test that must fail closed.
- Runtime/generated cleanliness checks found no repo-root `.comath` and no tracked `.comath`, `.tmp`, `dist`, `node_modules`, `services/comathd/dist`, or `extensions/comath-pi/dist` artifacts.
- Current-facing documentation continues to state that Phase 79/80 do not provide automatic proof discovery, arbitrary semantic-equivalence discovery, claim promotion, or a replacement for final Lean Authority v2.

Residual risks: no high-risk Phase 79/80 regression was found. Global GA still needs product-code work on automatic proof search/execution beyond registered bounded materializations, broader mathematical-domain trust profiles, arbitrary theorem synthesis, broad MathProve proof authority semantics, production Pi/Codex lifecycle validation, OS-level runner/process sandboxing, and indefinite operator/cross-process recovery.

## Goal 2 Task 31 / Phase 80 Bounded Equivalence-Search Witness Materialization

Scope: materialize a bounded Phase 79 blocked statement-equivalence plan into registered logical-equivalence witness metadata without proof authority or claim promotion.

Changes:

- Added `materializeStatementEquivalenceSearchPlan()` and `StatementEquivalenceWitnessMaterialization`.
- The materializer reads a non-authoritative `blocked_unproved` plan, validates exact formal-spec/target binding, safe registered lemma hints, non-empty witness artifact id, and a bounded allowlisted materialization.
- It writes `.comath/evidence/<CLAIM>/lean/equivalence_witness_materialized.json` with `proof_authority: none`, `can_promote_claim: false`, SHA-256 materialization binding, lemma names, justification, and required final Lean Authority v2 gates.
- The returned witness can be supplied to `checkStatementEquivalence()` through the existing `allowed_registered_logical_equivalences` path.
- Wired Phase 80 into the default `@comath/comathd` test chain, smoke/status markers, and current-facing docs.

TDD evidence:

```text
node services/comathd/tests/unit/phase80-bounded-equivalence-witness-materialization.test.mjs
Initial RED result: exit 1; materializeStatementEquivalenceSearchPlan was not exported from ../../dist/index.js.

Reviewer-strengthened RED result: exit 1; missing witnessArtifactId was accepted instead of fail-closed.
```

Verification:

- `corepack pnpm --filter @comath/comathd build`
- `node services/comathd/tests/unit/phase80-bounded-equivalence-witness-materialization.test.mjs`

Boundary notes: Phase 80 is bounded witness-metadata materialization only. It does not discover equivalence lemmas, prove arbitrary semantic equivalence, certify proof terms, promote claims, or replace final clean Lean replay/static audit/dependency closure/axiom profile.

Residual risks: automatic proof search/execution beyond registered bounded materializations, broader mathematical-domain trust profiles, arbitrary theorem synthesis, broad MathProve proof authority, production Pi/Codex lifecycle validation, OS-level sandboxing, and indefinite operator/cross-process recovery remain open global-GA blockers.

## Goal 2 Task 30 / Phase 79 Statement-Equivalence Proof-Search Plan Artifacts

Scope: add a bounded, service-owned, non-authoritative plan artifact for unresolved statement-equivalence mismatches without claiming automatic proof discovery.

Changes:

- Added `StatementEquivalenceSearchPlan` plus optional `equivalence_search_plan_path` and `equivalence_search_hints` inputs to `checkStatementEquivalence()`.
- When the extracted target signature is unique but mismatched, and no exact, alias, direct registered, or transitive registered witness accepts it, safe lemma-name hints can write `equivalence_search_plan.json`.
- The plan records `result: blocked_unproved`, `proof_authority: none`, `can_promote_claim: false`, exact formal-spec/target binding, candidate lemma names, and required next artifacts for a future kernel-checked equivalence witness.
- Exact matches, direct registered witnesses, transitive registered witnesses, missing target output, empty hints, and unsafe hint strings do not write unresolved plans.
- Wired Phase 79 into the default `@comath/comathd` test chain, smoke/status markers, and current-facing docs.

TDD evidence:

```text
node services/comathd/tests/unit/phase79-lean-equivalence-search-plan.test.mjs
Initial RED result: exit 1; statement-equivalence reports lacked equivalence_search_plan_path for unresolved mismatches.
```

Verification:

- `corepack pnpm --filter @comath/comathd build`
- `node services/comathd/tests/unit/phase79-lean-equivalence-search-plan.test.mjs`
- `node services/comathd/tests/unit/phase78-lean-transitive-equivalence.test.mjs`
- `node services/comathd/tests/unit/phase56-lean-registered-logical-equivalence.test.mjs`
- `node services/comathd/tests/unit/phase32-lean-statement-signature.test.mjs`
- `node services/comathd/tests/unit/phase64-lean-authority-v2-final-gate.test.mjs`

Boundary notes: Phase 79 is obligation planning evidence only. It does not prove equivalence lemmas, discover arbitrary semantic equivalence, certify proof terms, promote claims, or replace final clean Lean replay/static audit/dependency closure/axiom profile.

Residual risks: executing proof-search plans into kernel-checked equivalence witnesses, broader mathematical-domain trust profiles, arbitrary theorem synthesis, broad MathProve proof authority, production Pi/Codex lifecycle validation, OS-level sandboxing, and indefinite operator/cross-process recovery remain open global-GA blockers.

## Goal 2 Task 29 / Comprehensive Check-Debug Loop 9

Scope: comprehensive check-debug loop over Phase 77 runner network sandbox policy and Phase 78 registered transitive statement-equivalence witnesses.

Verification:

- `corepack pnpm --filter @comath/comathd build`
- `node services/comathd/tests/unit/phase77-runner-network-sandbox-policy.test.mjs`
- `node services/comathd/tests/unit/phase78-lean-transitive-equivalence.test.mjs`
- `node services/comathd/tests/unit/phase36-runner-replay-provenance.test.mjs`
- `node services/comathd/tests/unit/phase55-runner-cross-machine-replay.test.mjs`
- `node services/comathd/tests/unit/phase56-lean-registered-logical-equivalence.test.mjs`
- `node services/comathd/tests/unit/phase32-lean-statement-signature.test.mjs`
- `node services/comathd/tests/unit/phase64-lean-authority-v2-final-gate.test.mjs`
- `node scripts/phase0-smoke.mjs`
- `corepack pnpm --filter @comath/comathd typecheck`
- `corepack pnpm --filter @comath/comathd test`
- `corepack pnpm build`
- `corepack pnpm typecheck`
- `corepack pnpm test`

All commands exited 0. The root test included the Pi package tests, the default `@comath/comathd` chain with Phase 77/78, Phase 45 Pi/comathd install-session e2e, and Phase 17 integrity evaluation.

Static audit:

- `git diff --check` exited 0 with Windows LF-to-CRLF warnings only.
- `Test-Path D:\MATH _Studio\comath-pi-lab\.comath` returned `False`.
- `git ls-files '.comath' '.tmp' 'dist' 'node_modules' 'services/comathd/dist' 'extensions/comath-pi/dist'` returned no tracked runtime/build artifacts.
- Current-facing stale/overclaim scan found no unqualified `Phase 18-77`, `Phase 18-76`, old `lean_logical_equivalence_deferred`, arbitrary-transitive-equivalence claims, or OS-enforced network-sandbox claims. README hits for `COMATH_RUNNER_NETWORK=disabled` and OS-enforced sandboxing are explicit boundary statements.

Repair:

- Clarified the Phase 56 historical note in `docs/progress/design-handoff.md` so it no longer reads as if transitive registered witness chains remain wholly deferred after Phase 78. The updated wording preserves the remaining global-GA blockers: automatic equivalence proof search and broader mathematical-domain trust profiles.
- A sidecar subagent verification attempt failed because the agent thread limit was reached, so this loop was completed locally with focused, package, root, e2e, integrity, and static checks.

Residual risks: no high-risk regression was found in Phase 77 or Phase 78. Global GA still needs product-code work on automatic theorem/equivalence proof search, arbitrary theorem synthesis, broad MathProve proof authority semantics, production Pi/Codex lifecycle validation, OS-level runner/process sandboxing, and indefinite operator/cross-process recovery.

## Goal 2 Task 28 / Phase 78 Registered Transitive Statement-Equivalence Witnesses

Scope: add a conservative registered transitive logical-equivalence statement-binding path without claiming arbitrary equivalence proof search.

Changes:

- Added `StatementRegisteredTransitiveLogicalEquivalence` and `allowed_registered_transitive_logical_equivalences` to `checkStatementEquivalence()`.
- Added `registered_transitive_logical_equivalence` witness reports for accepted chains.
- Required the chain endpoint to bind the locked formal spec to the extracted target signature exactly.
- Required every intermediate link to close exactly from the previous signature to the next signature.
- Required every link to carry `lean_kernel_checked_equivalence`, a non-empty witness artifact id, a valid SHA-256 witness artifact hash, and non-empty lemma names.
- Added `phase78-lean-transitive-equivalence.test.mjs`, wired it into the default `@comath/comathd` test chain, smoke/status markers, and current-facing docs.

TDD evidence:

```text
node services/comathd/tests/unit/phase78-lean-transitive-equivalence.test.mjs
Initial RED result: exit 1; valid registered transitive witness chains returned fail instead of pass.
```

Verification:

- `corepack pnpm --filter @comath/comathd build`
- `node services/comathd/tests/unit/phase78-lean-transitive-equivalence.test.mjs`
- `node services/comathd/tests/unit/phase56-lean-registered-logical-equivalence.test.mjs`
- `node services/comathd/tests/unit/phase37-lean-statement-alias-equivalence.test.mjs`
- `node services/comathd/tests/unit/phase32-lean-statement-signature.test.mjs`
- `node services/comathd/tests/unit/phase64-lean-authority-v2-final-gate.test.mjs`
- `node scripts/phase0-smoke.mjs`
- `corepack pnpm --filter @comath/comathd typecheck`
- `corepack pnpm --filter @comath/comathd test`

Boundary notes: Phase 78 is registered statement-binding metadata only. It does not discover equivalence lemmas, prove arbitrary semantic equivalence, certify proof terms, promote claims, or replace final clean Lean replay, static audit, dependency closure, axiom profile, and the ordinary claim promotion path.

Residual risks: automatic equivalence proof search, broader mathematical-domain trust profiles, arbitrary theorem synthesis, broad MathProve proof authority, production Pi/Codex lifecycle validation, OS-level sandboxing, and indefinite operator/cross-process recovery remain open global-GA blockers.

## Goal 2 Task 27 / Phase 77 Runner Network Sandbox Policy

Scope: add a service-level runner network-denial contract for compute-runner execution and replay, narrowing the runner sandbox GA blocker without claiming OS-enforced isolation.

Changes:

- Added shared `runnerNetworkDenialPolicy` with `COMATH_RUNNER_NETWORK=disabled`.
- Compute-runner metadata now records `sandbox_policy.network_denial` and `runner_env`.
- Initial Python runner execution and replay re-execution both launch with the same network-denial environment marker.
- Replay integrity and re-execution preflight now fail closed with `runner_network_denial_policy_missing` when the network-denial contract or runner environment marker is absent.
- Replay manifests preserve the network-denial contract and runner environment marker.
- Added `phase77-runner-network-sandbox-policy.test.mjs`, wired it into the default `@comath/comathd` test chain, smoke/status markers, and current-facing docs.

TDD evidence:

```text
node services/comathd/tests/unit/phase77-runner-network-sandbox-policy.test.mjs
Initial RED result: exit 1; runner reports lacked sandbox_policy.network_denial and runner_env.
```

Verification:

- `corepack pnpm --filter @comath/comathd build`
- `node services/comathd/tests/unit/phase77-runner-network-sandbox-policy.test.mjs`
- `node services/comathd/tests/unit/phase36-runner-replay-provenance.test.mjs`
- `node services/comathd/tests/unit/phase55-runner-cross-machine-replay.test.mjs`
- `node services/comathd/tests/unit/phase10-compute-runners.test.mjs`
- `node scripts/phase0-smoke.mjs`
- `corepack pnpm --filter @comath/comathd typecheck`
- `corepack pnpm --filter @comath/comathd test`

All commands exited 0.

Static audit:

- `git diff --check` exited 0 with Windows LF-to-CRLF warnings only.
- `Test-Path D:\MATH _Studio\comath-pi-lab\.comath` returned `False`.
- `git ls-files '.comath' '.tmp' 'dist' 'node_modules' 'services/comathd/dist' 'extensions/comath-pi/dist'` returned no tracked runtime/build artifacts.
- At Task 27 completion, current-facing docs described Phase 18-77 and distinguished the service-level network-denial policy from still-deferred OS/kernel/firewall-enforced network sandboxing.

Boundary notes: Phase 77 is a service process-environment policy and replay preflight gate. It does not prove OS-level network isolation; that remains deferred.

Residual risks: OS-level runner process sandboxing, kernel/firewall-enforced network denial, broader runner-family lockfiles, arbitrary theorem synthesis, broad MathProve proof authority, production Pi/Codex lifecycle validation, indefinite operator sessions/cross-process recovery, and broad statement-equivalence proof search remain open global-GA blockers.

## Goal 2 Task 26 / Comprehensive Check-Debug Loop 8

Scope: comprehensive check-debug loop over Phase 75 bounded final clean replay promotion and Phase 76 registered Nat linear identity target registry.

Verification:

- `corepack pnpm --filter @comath/comathd build`
- `node services/comathd/tests/integration/phase76-registered-nat-linear-targets.test.mjs`
- `node services/comathd/tests/integration/phase75-bounded-final-clean-replay.test.mjs`
- `node services/comathd/tests/integration/phase72-theorem-specific-lean-generation.test.mjs`
- `node services/comathd/tests/integration/phase73-bounded-lean-proof-body-synthesis.test.mjs`
- `node services/comathd/tests/integration/phase74-bounded-authority-report-preparation.test.mjs`
- `node services/comathd/tests/integration/phase70-broad-theorem-planning-slice.test.mjs`
- `node scripts/phase0-smoke.mjs`
- `corepack pnpm --filter @comath/comathd typecheck`
- `corepack pnpm --filter @comath/comathd test`

All commands exited 0. Root build/typecheck/test gates were not rerun in this loop because the task found no cross-package defect and made no product-code or package-interface changes; the default `@comath/comathd` test chain already exercised the Phase 72-76 proof path plus the older campaign, Lean authority, Pi/service, AgentRun, Codex-adapter, formal-slice, and negative-slice regressions.

Static audit:

- `git diff --check` exited 0.
- `Test-Path D:\MATH _Studio\comath-pi-lab\.comath` returned `False`.
- `git ls-files '.comath' '.tmp' 'dist' 'node_modules' 'services/comathd/dist' 'extensions/comath-pi/dist'` returned no tracked runtime/build artifacts.
- Direct claim-status mutation scan found no `claim.status =` writes in `services/comathd/src`; hits were read-only status comparisons in paper rendering.
- Proof-authority scan found the Phase 75/76 promotion path still routed through `runCleanLeanReplay()`, `applyGatePromotedClaim()`, and `promoteClaim()` with `final_replay_manifest.json` binding; preview artifacts remain non-authoritative.
- Current-facing documentation scans continue to describe Phase 75/76 as bounded registered-target evidence and continue to mark arbitrary theorem proving, broad MathProve proof authority, production Pi/Codex lifecycle validation, OS/network sandboxing, indefinite operator sessions/cross-process recovery, and broad statement-equivalence proof search as deferred or not achieved.

Repair:

- No high-risk product-code or documentation defect was found, so no product behavior repair was made in this loop.

Residual risks: Phase 75-76 remain bounded registered-target slices. Global GA still needs further product work on arbitrary theorem synthesis beyond registered target tables, broad MathProve proof authority semantics, production Pi/Codex lifecycle validation, OS/network sandboxing, indefinite operator sessions/cross-process recovery, and broad statement-equivalence proof search.

## Goal 2 Task 25 / Phase 76 Registered Nat Linear Identity Targets

Scope: replace the single hardcoded bounded non-template target path with a small registered Nat linear identity target table, adding a second final-clean-replay-positive target without claiming arbitrary theorem proving.

Changes:

- Added `registeredNatLinearIdentityTargets` in the campaign tick path with entries for `n + n = 2 * n` and `n + 0 + n = 2 * n`.
- Bound `target_family_id` and `canonical_proposition` through theorem-specific formal spec, target package, proof-body synthesis, authority preparation, LeanProject replay metadata, final replay manifest, and proof-route metadata.
- Added `phase76-registered-nat-linear-targets.test.mjs`, wired it into the default `@comath/comathd` test chain, smoke markers, and service status capability `registered_nat_linear_identity_targets`.
- Preserved fail-closed behavior for unregistered broad goals; `n + 2 = n` receives no theorem-specific target package or final replay manifest.

Initial RED result: exit 1; `n + 0 + n = 2 * n` still terminated at `blocked` instead of `completed_formal_proof`.

Verification:

```text
node services/comathd/tests/integration/phase76-registered-nat-linear-targets.test.mjs
```

Result: exit 0; the second registered Nat linear identity reaches `completed_formal_proof`, writes target/proof-body/authority/final replay artifacts with the selected registered target metadata, promotes only through the existing Lean Authority v2 gate, and keeps an unregistered broad goal fail-closed.

Boundary notes: Phase 76 is a registered-target-table generalization, not a generic theorem prover. It does not add direct claim-status mutation, arbitrary theorem parsing, broad proof search, or MathProve proof authority.

Residual risks: arbitrary theorem synthesis, broad MathProve proof authority, production Pi/Codex lifecycle validation, OS/network sandboxing, indefinite operator sessions/cross-process recovery, and broad statement-equivalence proof search remain open global-GA blockers.

## Goal 2 Task 24 / Phase 75 Bounded Final Clean Replay Promotion

Scope: convert the bounded Phase 72-74 `n + n = 2 * n` target from campaign-scoped preview evidence into claim-scoped final Lean Authority v2 evidence, without generalizing to arbitrary theorem proving.

Implementation:

- Added a bounded final clean replay path for the theorem-specific `n + n = 2 * n` target.
- The bounded target now writes the missing `Audit/Target.lean` file and is represented as a proper `LeanProjectFiles` replay package.
- Reused the existing `runCleanLeanReplay()` and `promoteClaim()` gate path through a shared final replay/promotion helper.
- Wrote claim-scoped final static audit, statement equivalence, dependency closure, axiom profile, stdout/stderr, and `final_replay_manifest.json` under `.comath/evidence/<CLAIM>/lean/`.
- Updated the bounded target package, authority-preparation package, and broad replay target to `final_clean_replay_passed` only after the final gate passes.
- Added `phase75-bounded-final-clean-replay.test.mjs`, wired it into the default `@comath/comathd` test chain, and exposed `bounded_final_clean_replay_promotion`.

TDD evidence:

```text
node services/comathd/tests/integration/phase75-bounded-final-clean-replay.test.mjs
Initial RED result: exit 1; bounded broad target still terminated at `blocked` instead of `completed_formal_proof`.
```

Boundary notes: Phase 75 does not add direct claim-status mutation. It promotes only through the existing Lean Authority v2 gate after `runCleanLeanReplay()` writes fresh hash-bound final artifacts. Negative/non-proof prompts containing `n + n = 2 * n` still receive no final clean replay authority.

Residual risks: Phase 75 proves one bounded non-template target. It does not implement arbitrary theorem proving, broad proof search, broad MathProve proof authority, OS-enforced sandboxing, production Pi/Codex lifecycle hardening, or broad statement-equivalence proof search.

## Goal 2 Task 23 / Comprehensive Check-Debug Loop 7

Scope: comprehensive check-debug loop over Phase 72 theorem-specific Lean target package, Phase 73 bounded proof-body synthesis, and Phase 74 bounded authority-report preparation.

Verification:

- `corepack pnpm --filter @comath/comathd build`
- `node services/comathd/tests/integration/phase72-theorem-specific-lean-generation.test.mjs`
- `node services/comathd/tests/integration/phase73-bounded-lean-proof-body-synthesis.test.mjs`
- `node services/comathd/tests/integration/phase74-bounded-authority-report-preparation.test.mjs`
- `node services/comathd/tests/integration/phase70-broad-theorem-planning-slice.test.mjs`
- `node services/comathd/tests/unit/phase20-ga-campaign-state-machine.test.mjs`
- `node scripts/phase0-smoke.mjs`
- `corepack pnpm --filter @comath/comathd typecheck`
- `corepack pnpm --filter @comath/comathd test`
- `corepack pnpm build`
- `corepack pnpm typecheck`
- `corepack pnpm test`

All commands exited 0.

Static audit:

- Proof authority boundaries were rechecked around Phase 72-74 artifacts. The bounded target package, proof-body package, and authority-preview package remain non-promotional; `bounded_authority_report_preparation.json` keeps `final_replay_manifest_path: null`, and the Phase 73/74 tests assert no claim-scoped final replay manifest is written.
- `runCleanLeanReplay()`, `applyGatePromotedClaim()`, and `promoteClaim()` remain in the existing refutation/final-replay promotion paths, not in the Phase 72-74 preview/report-preparation branch.
- Runtime/generated cleanliness checks found no repo-root `.comath` and no tracked `.comath`, `.tmp`, `dist`, `node_modules`, `services/comathd/dist`, or `extensions/comath-pi/dist` artifacts.

Repair:

- Updated `COMATH_PI_LAB_DEV_PLAN.md`, `AGENTS.md`, and `docs/progress/design-handoff.md` to stop describing the current state as only Phase 18-72 and to include Phase 73 bounded proof-body candidate plus Phase 74 bounded authority-preview reports without overclaiming proof authority.

Residual risks: no high-risk regression was found in Phases 72-74. Global GA remains incomplete: the bounded broad target still lacks final clean replay/promotion, and arbitrary theorem synthesis, broad MathProve proof authority, OS/network sandboxing, production Pi/Codex lifecycle validation, indefinite operator sessions/cross-process recovery, and broader statement-equivalence proof search remain open.

## Goal 2 Task 22 / Phase 74 Bounded Lean Authority Report Preparation

Scope: implement bounded, non-promotional Lean Authority v2 report-preparation artifacts for the Phase 73 `n + n = 2 * n` proof-body candidate, without creating final replay authority.

Implementation:

- Added campaign-scoped `bounded_authority_report_preparation.json`.
- Added preview reports for static audit, statement equivalence, dependency closure, and axiom profile.
- Bound the preview package to the theorem-specific target package, proof-body synthesis artifact, target Lean file, problem lock, obligation DAG, line map, formal spec, and locked statement hash.
- Kept all preview reports non-authoritative with `proof_authority: "none"`, `can_run_clean_replay: false`, `can_promote_claim: false`, and `final_replay_manifest_path: null`.
- Updated `theorem_specific_lean_project.json`, `broad_replay_target.json`, and `broad_synthesis_failure.json` to point at the report-preparation package while preserving terminal `blocked_with_replayable_reason` and root claim `conjectural`.
- Added `phase74-bounded-authority-report-preparation.test.mjs`, wired it into the default `@comath/comathd` test chain, exposed `bounded_lean_authority_report_preparation`, and updated README, TODO, acceptance/readiness docs, and smoke markers.

TDD evidence:

```text
node services/comathd/tests/integration/phase74-bounded-authority-report-preparation.test.mjs
Initial RED result: exit 1; `.comath/campaign/CAM-0001/bounded_authority_report_preparation.json` was missing.
```

Boundary notes: Phase 74 does not call `runCleanLeanReplay()`, `applyGatePromotedClaim()`, or `promoteClaim()`. It writes no `.comath/evidence/<CLAIM>/lean/final_replay_manifest.json`, produces no final replay result, and keeps the root claim `conjectural`. The axiom-profile preview is explicitly blocked until clean replay supplies authoritative `#print axioms` output.

Residual risks: Phase 74 is still not final proof authority for the broad target. It does not run clean replay, produce final hash-bound authority reports under the claim evidence directory, promote the claim, or generalize beyond the bounded `n + n = 2 * n` target.

## Goal 2 Task 21 / Phase 73 Bounded Theorem-Specific Proof-Body Synthesis

Scope: implement a bounded proof-body synthesis artifact for the Phase 72 non-template target `Prove in Lean that n + n = 2 * n for natural numbers.`, without treating the synthesized body as final proof authority.

Implementation:

- Added bounded `by omega` proof-body candidate generation in the broad-planning target branch.
- Generated `.comath/campaign/<CAM>/bounded_proof_body_synthesis.json` and `bounded_proof_body_static_audit.json`.
- Bound the proof-body package to the problem lock, obligation DAG, line map, theorem-specific target package, target Lean file, locked statement hash, and formal spec.
- Updated `theorem_specific_lean_project.json` and `broad_replay_target.json` to record `proof_body_synthesized_unreplayed` while preserving `proof_authority: "none"`, `can_run_clean_replay: false`, and `can_promote_claim: false`.
- Added negative prompt coverage so negation/non-proof prompts containing `n + n = 2 * n` do not receive the positive proof-body package.
- Added `phase73-bounded-lean-proof-body-synthesis.test.mjs`, wired it into the default `@comath/comathd` test chain, exposed `bounded_theorem_specific_proof_body_synthesis`, and updated README, TODO, acceptance/readiness docs, and smoke markers.

TDD evidence:

```text
node services/comathd/tests/integration/phase73-bounded-lean-proof-body-synthesis.test.mjs
Initial RED result: exit 1; `.comath/campaign/CAM-0001/bounded_proof_body_synthesis.json` was missing.
```

Boundary notes: Phase 73 is proof-body candidate evidence only. It does not call `runCleanLeanReplay()`, `applyGatePromotedClaim()`, or `promoteClaim()`, produces no final replay manifest, returns no promotion gate, and leaves the root claim `conjectural`. Final Lean Authority v2 remains the only path to `formally_checked`.

Residual risks: Phase 73 is intentionally limited to one bounded target and one proof body. It does not implement arbitrary proof search, statement-equivalence proof search, dependency/axiom final reports for this target, final clean replay, broad MathProve proof authority, production Pi/Codex lifecycle hardening, or OS-enforced sandboxing.

## Goal 2 Task 20 / Comprehensive Check-Debug Loop 6

Scope: comprehensive check-debug loop over the recent global-GA product-code slices: Phase 70 broad theorem planning, Phase 71 stage-gate repair/resume, and Phase 72 theorem-specific Lean target package.

Checks performed:

- Rechecked Phase 70-72 requirement drift and proof-authority boundaries.
- Re-ran focused campaign/proof-kernel tests for Phase 70, Phase 71, Phase 72, Phase 20, and Phase 63.
- Re-ran root build, typecheck, and test gates.
- Audited runtime artifact cleanliness, tracked generated files, repo-root `.comath`, stale current-state docs, and overclaim language.
- Used a read-only verifier lane for Phases 70-72; it found no promotion/authority or Pi trusted-state issue, but did identify stale current-state wording in `COMATH_PI_LAB_DEV_PLAN.md`, `AGENTS.md`, and `docs/progress/design-handoff.md`.

Verification:

```text
corepack pnpm --filter @comath/comathd build
Result: exit 0.

node services/comathd/tests/integration/phase70-broad-theorem-planning-slice.test.mjs
Result: exit 0.

node services/comathd/tests/unit/phase71-stage-gate-repair-resume.test.mjs
Result: exit 0.

node services/comathd/tests/integration/phase72-theorem-specific-lean-generation.test.mjs
Result: exit 0.

node services/comathd/tests/unit/phase20-ga-campaign-state-machine.test.mjs
Result: exit 0.

node services/comathd/tests/unit/phase63-v3-stage-gate-artifact-coverage.test.mjs
Result: exit 0.

node scripts/phase0-smoke.mjs
Result: exit 0; Phase 0/design smoke check passed for 25 required entries and 28 invariants.

corepack pnpm --filter @comath/comathd typecheck
Result: exit 0.

corepack pnpm build
Result: exit 0.

corepack pnpm typecheck
Result: exit 0.

corepack pnpm test
Result: exit 0; root test included Phase 0 smoke, Pi extension tests through Phase 66, comathd tests through Phase 72, Phase 45 Pi/comathd install-session e2e, and Phase 17 integrity evaluation.

git diff --check
Result: exit 0 with only Windows LF-to-CRLF warnings.

Test-Path D:\MATH _Studio\comath-pi-lab\.comath
Result: False.

git ls-files '.comath' '.tmp' 'dist' 'node_modules' 'services/comathd/dist' 'extensions/comath-pi/dist'
Result: no tracked runtime/build artifacts.
```

Static audit result: targeted stale-current-state scan found no remaining `Phase 18-58` / `Current repository state after Phase 58` / `no broad Lean project generator` wording in current-facing docs after the repair. Overclaim scan hits are explicit guardrails or non-authority statements such as `proof_authority: none`, `can_promote_claim: false`, "not an arbitrary theorem prover", and "not final global v3 GA".

Changed surfaces:

- Updated `COMATH_PI_LAB_DEV_PLAN.md` current status from Phase 18-58 to Phase 18-72 and clarified that Phase 70/72 are bounded planning/target-package evidence, not proof synthesis.
- Updated `AGENTS.md` current frontier through Phase 72 while preserving the no-broad-discovery guardrail.
- Updated `docs/progress/design-handoff.md` to retire stale "broad planning next" wording and point the next blocker at proof-body synthesis and remaining global-GA hardening.

Residual risks: no high-risk regression was found in Phases 70-72. Global GA is still incomplete: arbitrary proof-body synthesis beyond the bounded target-package slice, broad MathProve proof search/proof-authority semantics, OS/network sandboxing, richer real-host Pi UX lifecycle, production Codex API/network validation, indefinite operator sessions/cross-process recovery, and broader statement-equivalence proof search remain open.

## Goal 2 Task 19 / Phase 72 Theorem-Specific Lean Target Package

Scope: implement a bounded theorem-specific Lean target package for one non-template broad-planning goal, `Prove in Lean that n + n = 2 * n for natural numbers.`, without claiming arbitrary theorem proving or proof authority.

Implementation:

- Added theorem-specific target package generation in the Phase 70 broad-planning candidate-generation block.
- Generated `.comath/campaign/<CAM>/theorem_specific_lean_project.json`, `.comath/lean/broad/<CAM>/MathResearch/Target.lean`, `FormalSpec/target.json`, `lakefile.lean`, and `lean-toolchain`.
- Bound the target package to the problem lock, obligation DAG, line map, locked statement hash, replay command, and formal spec.
- Marked the theorem-specific target package and broad replay target as non-promotional with `proof_authority: "none"`, `can_run_clean_replay: false`, and `can_promote_claim: false`.
- Added negative statement-binding coverage so negation/refutation/non-proof prompts that contain `n + n = 2 * n` do not receive a positive theorem target package.
- Added `phase72-theorem-specific-lean-generation.test.mjs`, wired it into the default `@comath/comathd` test chain, exposed `theorem_specific_lean_target_package`, and updated README, TODO, acceptance/readiness docs, and smoke markers.

TDD evidence:

```text
node services/comathd/tests/integration/phase72-theorem-specific-lean-generation.test.mjs
Initial RED result: exit 1; `theorem_specific_lean_project.json` was missing for the bounded `n + n = 2 * n` target.
```

Boundary notes: Phase 72 creates a Lean target package, not a proof. The generated Lean file records only a target proposition and `#check targetStatement`; it contains no `sorry`, `admit`, `axiom`, `unsafe`, `opaque`, or `constant`. The campaign remains terminal `blocked_with_replayable_reason`, the root claim remains `conjectural`, and no final replay or promotion gate is returned.

Residual risks: Phase 72 does not synthesize a proof body, produce Lean Authority v2 reports, run final clean replay, or promote claims. The target recognizer is intentionally narrow and does not parse arbitrary theorem statements. Broad MathProve proof search/proof-authority semantics, production Pi/Codex lifecycle hardening, OS-enforced sandboxing, and arbitrary attachment/paper-driven research closure remain open global-GA blockers.

## Goal 2 Task 18 / Phase 71 Stage-Gate Repair/Resume

Scope: implement a narrow service-owned repair/resume path for campaigns blocked by missing required stage-gate artifacts. This closes the Phase 63 residual gap without turning repair/resume into proof repair, theorem synthesis, or claim promotion.

Implementation:

- Added `repairStageGateAndResume()` in `services/comathd/src/proof-kernel/campaign/campaign-tick.ts`.
- Added `POST /campaign/:id/repair-resume` in `services/comathd/src/api/server.ts`.
- Tightened ordinary `POST /campaign/:id/resume` so it no longer unblocks `status: "blocked"` campaigns; blocked campaigns now return `CAMPAIGN_REPAIR_REQUIRED`.
- Repair requests must cite the persisted `stage_gate_blocker.json` and the exact missing artifact set. The service re-reads the blocker, verifies campaign/stage/rewind/missing-artifact consistency, checks all repaired artifacts exist under the project root, writes `stage_gate_repair.json`, and resumes only to the recorded rewind target.
- The repair artifact carries `proof_authority: "none"` and `can_promote_claim: false`. Historical blockers and blocked stage runs remain preserved.

Verification:

```text
corepack pnpm --filter @comath/comathd build
Result: exit 0.

node services/comathd/tests/unit/phase71-stage-gate-repair-resume.test.mjs
Result: exit 0. The test first failed before implementation because ordinary /resume returned 200 for a blocked missing-artifact campaign. After implementation it verifies blocked /resume, incomplete repair rejection, exact blocker/artifact matching, non-promotional repair artifact evidence, unchanged conjectural claim status, and continuation from the rewind target.
```

Boundary notes: Phase 71 handles `MISSING_REQUIRED_STAGE_ARTIFACT` recovery only. It does not implement arbitrary theorem repair loops, Lean proof synthesis, semantic-equivalence search, or broad promotion authority. Future theorem-specific Lean project generation remains a separate global-GA blocker.

## Goal 2 Task 17 / Phase 70 Broad Theorem Planning Slice

Scope: implement a bounded product slice beyond the registered Nat theorem-family replay path without claiming arbitrary theorem proving. Phase 70 upgrades non-template theorem targets from a one-line unsupported blocker into replayable service-owned planning/synthesis evidence while preserving the Lean Authority v2 promotion boundary.

Code changes:

- Added a fail-closed broad synthesis branch in `tickCampaign()` for non-template obligations at `candidate_generation`.
- The branch writes `.comath/campaign/<CAM>/broad_synthesis_plan.json`, `broad_replay_target.json`, and `broad_synthesis_failure.json`.
- The plan binds the locked statement hash, existing problem lock, obligation DAG, line map, candidate-plan requirements, and unresolved replay target.
- The failure evidence records `proof_authority: "none"`, `can_promote_claim: false`, and the missing theorem-specific Lean replay target.
- The claim remains `conjectural`; no `final_replay`, promotion gate, or kernel-checked metadata is fabricated.
- Added `phase70-broad-theorem-planning-slice.test.mjs`, wired it into the default `@comath/comathd` test chain, and updated release-facing docs/smoke checks.

TDD evidence:

```text
node services/comathd/tests/integration/phase70-broad-theorem-planning-slice.test.mjs
RED result: exit 1; existing unsupported path returned `unsupported final replay target` and lacked the required broad-planning evidence package.

corepack pnpm --filter @comath/comathd build
Result: exit 0; TypeScript build completed after adding the broad-planning branch.

node services/comathd/tests/integration/phase70-broad-theorem-planning-slice.test.mjs
Result: exit 0; Phase 70 writes `broad_synthesis_plan.json`, `broad_replay_target.json`, and `broad_synthesis_failure.json` for a non-template number-theory goal, preserves problem lock / obligation DAG / line-map evidence, terminal-blocks with `blocked_with_replayable_reason`, and keeps the root claim `conjectural`.
```

Residual risk: Phase 70 is broad-planning evidence, not broad proof synthesis. It does not yet generate theorem-specific Lean projects, run live proof search over arbitrary tactic states, or promote arbitrary claims. Those remain global-GA blockers.

## Goal 2 Task 16 / Phase 69 v3 Terminal Vocabulary Compatibility

Scope: implement the product-code gap identified by Task 15: external v3 terminal vocabulary compatibility. The change keeps internal campaign state authoritative and adds only a read-only API/Pi projection for the external document names.

Code changes:

- Added `services/comathd/src/proof-kernel/campaign/external-terminal-vocabulary.ts` with `projectExternalV3TerminalState()`, `withExternalV3TerminalState()`, and `withExternalV3CampaignResult()`.
- Wrapped campaign start/status/tick/replay/final-audit/pause/resume responses so returned campaign payloads include `external_v3_terminal_state` when a trusted internal terminal state maps to an external v3 name.
- Kept persisted `ResearchCampaign` schema and `.comath/campaign/*/status.json` state unchanged; the compatibility field is not a mutation or proof-authority input.
- Updated the Pi research loop to preserve `external_v3_terminal_state` and treat the projected external v3 terminal state as terminal loop outcome.
- Added `phase69-v3-terminal-vocabulary.test.mjs`, wired Phase 69 into the default `@comath/comathd` test chain, and extended Phase 22 Pi loop coverage.

Verification evidence:

```text
node services/comathd/tests/unit/phase69-v3-terminal-vocabulary.test.mjs
Result: exit 0; service API responses projected `formal_proof_verified`, `verified_counterexample`, and `replayable_environment_blocker`, and the exported projection function covered `user_visible_theorem_repair_required` and `user_cancelled`.

node extensions/comath-pi/tests/phase22-research-loop.test.mjs
Result: exit 0; Pi loop preserved `external_v3_terminal_state` and treated projected external v3 terminal states as terminal.
```

Residual risk: this is compatibility vocabulary, not broad theorem planning or production lifecycle hardening. The projection intentionally does not allow Pi/model input to write terminal authority, and later work must still address remaining global-GA blockers.

## Goal 2 Task 15 / Final v3 GA Completion Audit

Scope: close the final-audit gate quickly and return the goal to product implementation. This audit used the four external v3 documents plus `Goal 指令.txt` as the requirement source, checked the current Phase 18-68 implementation evidence, and deliberately did not convert vertical-slice evidence into a global GA claim.

Subagent lanes used for this task:

- Retriever lane: extracted the remaining requirement deltas from the v3 blueprint/spec/team prompts and the local readiness matrices.
- Verifier lane: cross-checked current code/tests for external v3 terminal-vocabulary support and confirmed this is an executable API gap, not only a documentation mismatch.
- Builder lane: synchronized `goal-2/tasks.md` so the next continuation starts with product implementation rather than another review.

Requirement result:

| Requirement family | Current evidence | Task 15 decision |
| --- | --- | --- |
| Native CoMath proof-kernel path for implemented slices | Phase 18, 57, 63, 64, 67 tests; final replay hash binding; positive v3 formal slice. | Covered for registered elementary Nat theorem-family slices. |
| ResearchCampaign as service-owned workflow | Phase 20, 60, 63, 66, 67 evidence. | Covered for bounded resumable product slices. |
| 8-way ensemble and evidence-weighted arbitration | Phase 19, 61, 62, 67 evidence. | Covered for registered theorem-family slices and required failure aggregate paths. |
| Failed-route memory | Phase 61 and 65 evidence. | Covered with deterministic retrieval and stale/superseded warnings. |
| Lean Authority v2 final promotion gate | Phase 31-37, 54, 56, 57, 64 evidence. | Covered for registered slices with fail-closed replay artifact hash binding. |
| Positive v3 formal campaign | Phase 67 `.comath/campaign/<CAM>/v3_formal_campaign_slice.json` evidence. | Covered for `n + 0 = n`. |
| Required negative GA slices | Phase 68 `.comath/release/v3_negative_ga_slices.json` evidence. | Covered for statement drift, cheat artifact, false theorem, all-candidate failure, and snapshot-only promotion rejection. |
| Full external terminal vocabulary | `TODO.md` still records missing aliases for `formal_proof_verified`, `verified_counterexample`, `user_visible_theorem_repair_required`, `replayable_environment_blocker`, and `user_cancelled`. | Not complete; promoted to Task 16 product code. |
| Broad theorem planning/synthesis | Current theorem registry remains bounded to registered Nat families and exact refutation slices. | Not complete; remains a global-GA blocker. |
| Broad MathProve proof search / MathProve-as-authority | MathProve runners remain non-authoritative evidence only. | Not complete as global GA proof path; do not mark the goal complete. |
| Production Pi/Codex lifecycle and OS sandboxing | Existing slices cover bounded local adapters, fake-host/runtime registration, local install e2e, provenance, and environment gates. | Not complete as production hardening. |

Verification evidence:

```text
corepack pnpm build
corepack pnpm typecheck
corepack pnpm test
git diff --check
Test-Path D:\MATH _Studio\comath-pi-lab\.comath
git ls-files '.comath' '.tmp' 'dist' 'node_modules' 'services/comathd/dist' 'extensions/comath-pi/dist'
rg -n 'claim\.status\s*=' services/comathd/src
rg -n 'shell:\s*true|exec\(|execSync\(' services/comathd/src
```

Result: the Task 15 verification pass exited 0 for the root build/typecheck/test gates, `git diff --check`, and runtime/build artifact tracking checks. `.comath/` was absent from the repo root, no runtime/build artifacts were tracked, and static scans found no direct privileged claim-status assignment or service shell-execution regression. The root test chain covered Phase 0 smoke, Pi extension tests through Phase 66, comathd tests through Phase 68, Phase 45 Pi/comathd install-session e2e, and Phase 17 integrity evaluation. The read-only subagent checks independently confirmed that external v3 terminal names are required by the v3 docs but currently rejected or absent from the product API.

Decision: Goal 2 is not complete. The repository has real Phase 18-68 product code and evidence, but final global v3 GA remains blocked by executable-feature gaps. The next continuation must start Task 16, a product-code task for external v3 terminal-vocabulary compatibility, rather than extending review text.

## Goal 2 Task 14 / Documentation And Release Evidence Synchronization

Scope: synchronize release-facing documentation with the actual Goal 2 Phase 18-68 implementation, especially the Phase 67 positive v3 formal campaign slice and Phase 68 negative GA slice runner. This task updates evidence matrices and guardrails only; it does not claim final global v3 GA completion.

Documentation changes:

- Updated `README.md` from Phase 18-67 to Phase 18-68 and added the Phase 68 release negative GA slice runner, `.comath/release/v3_negative_ga_slices.json`, and the remaining Task 15 final-audit boundary.
- Added Phase 60-68 Goal 2 acceptance rows to `docs/architecture/acceptance-matrix.md`, including Phase 68 release artifact/test coverage and non-authority boundaries.
- Rewrote `docs/progress/product-readiness-matrix.md` from the stale Goal 1 / Phase 18-58 product-scope audit into the current Goal 2 / Phase 18-68 readiness matrix.
- Updated `SECURITY_REVIEW.md`, `MATH_INTEGRITY_REVIEW.md`, and `docs/architecture/risk-register.md` so Phase 68 is recorded as service-owned release evidence, not proof authority.
- Extended `scripts/phase0-smoke.mjs` to require current Phase 18-68 README language and Phase 60-68 acceptance/test markers, including `v3_negative_ga_slices.json`.

Verification evidence:

```text
node scripts/phase0-smoke.mjs
Result: exit 0; design smoke check passed with current Phase 18-68 README evidence and Phase 60-68 acceptance/test markers.

rg -n "Phase 18-58|Phase 18-67|Goal 1" README.md docs/progress/product-readiness-matrix.md docs/architecture/acceptance-matrix.md SECURITY_REVIEW.md MATH_INTEGRITY_REVIEW.md docs/architecture/risk-register.md
Result: no stale current-state Goal 1 / Phase 18-58 / Phase 18-67 wording remained in the current-facing release docs. Historical `REVIEW.md` entries are intentionally left as prior-phase records and are not part of this current-facing scan.

rg -n "arbitrary theorem prover|MathProve.*proof authority|MathProve-as-proof-authority|proof_authority|v3_negative_ga_slices" README.md docs/progress/product-readiness-matrix.md docs/architecture/acceptance-matrix.md SECURITY_REVIEW.md MATH_INTEGRITY_REVIEW.md docs/architecture/risk-register.md
Result: hits are explicit false/guardrail statements or non-authority metadata such as `proof_authority: none`; no current-facing release doc claims arbitrary theorem proving, MathProve proof authority, or release-summary proof authority.
```

Residual risks:

- Task 14 synchronized docs and smoke invariants; it does not run the final root build/typecheck/test matrix.
- Task 15 still owns the final v3 GA completion audit, root gates, static scans, and decision whether the overall goal can be marked complete.

## Goal 2 Task 13 / Phase 68 v3 Negative GA Slice Runner

Scope: implement product code for the release-level negative GA slices required by the v3 external documents. This is a `comathd` runner and API route, not a review-only checklist: it creates runtime evidence for statement drift rejection, cheating Lean artifact rejection, false-theorem refutation, all-candidate failure recovery, and snapshot replay that still cannot promote without fresh hash-bound final replay artifacts.

TDD / implementation evidence:

```text
node services/comathd/tests/integration/phase68-v3-negative-ga-slices.test.mjs
Initial RED result: exit 1; `POST /release/v3-negative-ga-slices` returned 404, proving the release negative-slice runner was not product code yet.

corepack pnpm --filter @comath/comathd build
Result: exit 0; TypeScript build and agent-adapter copy step completed after adding the release runner, route, export, and status capability.

node services/comathd/tests/integration/phase68-v3-negative-ga-slices.test.mjs
Result: exit 0; Phase 68 created `.comath/release/v3_negative_ga_slices.json`, covered all five required negative slices, kept every final claim out of `formally_checked`, preserved evidence paths, and reported `all_required_slices_passed: true`.

corepack pnpm --filter @comath/comathd typecheck
Result: exit 0; no-emit TypeScript check passed after switching negative promotion attempts to the normal `promoteClaim()` path.

node services/comathd/tests/unit/phase18-ga-proof-kernel-gates.test.mjs
Result: exit 0; existing proof-kernel claim promotion gate behavior still passes.

node services/comathd/tests/unit/phase62-v3-decision-forest.test.mjs
Result: exit 0; evidence-weighted all-candidate failure/recovery arbitration still passes.

node services/comathd/tests/integration/phase18-ga-refutation-path.test.mjs
Result: exit 0; false theorem refutation path still reaches the refutation terminal behavior.

node services/comathd/tests/integration/phase18-ga-snapshot-replay.test.mjs
Result: exit 0; existing snapshot replay integrity behavior still passes.

node services/comathd/tests/integration/phase67-v3-formal-campaign-slice.test.mjs
Result: exit 0; the positive v3 formal campaign slice still passes after adding the negative release runner.
```

Changed surfaces:

- Added `services/comathd/src/release/v3-negative-ga-slices.ts` as a service-owned release runner that writes `.comath/release/v3_negative_ga_slices.json`.
- Added `POST /release/v3-negative-ga-slices`, exported the runner from `@comath/comathd`, exposed `v3_negative_ga_slice_runner`, and wired Phase 68 into the default comathd test chain.
- Added `services/comathd/tests/integration/phase68-v3-negative-ga-slices.test.mjs` asserting all five negative slices block promotion and preserve evidence.

Requirement result: Task 13 now has executable release evidence for the negative GA paths named in the v3 blueprint/spec: statement drift cannot promote, Lean escape hatches are rejected by static audit, a registered false theorem returns a refutation rather than proof-looking text, eight failed candidates aggregate into recovery evidence, and a restored snapshot replay is preserved but insufficient for a different claim without fresh hash-bound final replay artifacts.

Residual risks:

- This runner covers the registered theorem-family/product slice evidence required for Task 13; it is not a claim of arbitrary theorem proving or final global GA completion.
- Task 14 must still synchronize release-facing docs and matrices with Phase 68 evidence.
- Task 15 must still run the final v3 GA completion audit before marking the overall goal complete.

## Goal 2 Task 12 / Comprehensive Check-Debug Loop 4

Scope: fourth Goal 2 comprehensive check-debug loop over the Phase 67 v3 formal campaign slice and release-facing root gates. This loop verifies that the final positive v3 slice did not leave stale Phase 18-58 smoke invariants, tracked runtime artifacts, secrets, direct Pi trusted-state writes, claim-gate bypasses, or documentation overclaims before moving to the required negative GA slices.

Verification evidence:

```text
node services/comathd/tests/integration/phase67-v3-formal-campaign-slice.test.mjs
Result: exit 0; Phase 67 v3 formal campaign slice passed.

node scripts/phase0-smoke.mjs
Initial Task 12 finding: root `corepack pnpm test` first failed because the Phase 0 smoke check still required stale Phase 18-58 README evidence while the current product docs correctly describe Phase 18-67.
Result after repair: exit 0; Phase 0/design smoke check passed with 25 required entries and 28 invariants, including Phase 18-67 README evidence and Phase 67 acceptance-matrix coverage.

corepack pnpm build
Result: exit 0; workspace build passed for `extensions/comath-pi` and `services/comathd`.

corepack pnpm typecheck
Result: exit 0; workspace TypeScript no-emit checks passed for `extensions/comath-pi` and `services/comathd`.

corepack pnpm test
Result: exit 0; root Phase 0 smoke, Pi extension tests through Phase 66, comathd tests through Phase 67, Phase 45 Pi/comathd install-session e2e, and Phase 17 integrity evaluation passed.

Test-Path -LiteralPath 'D:\MATH _Studio\comath-pi-lab\.comath'
Result: False; no repo-root runtime `.comath` directory was left behind.

git ls-files '.comath' '.tmp' 'dist' 'node_modules' 'services/comathd/dist' 'extensions/comath-pi/dist'
Result: no output; no runtime, dependency, or build-output paths from those patterns are tracked.

git diff --check
Result: exit 0; no whitespace errors were found in the Task 12 diff.
```

Static scan result:

- Claim-gate/status scans found status reads and the expected `applyGatePromotedClaim` / `promoteClaim` service-owned surfaces only; no direct `claim.status =` privileged assignment was found.
- Pi direct-write scan found only service-authority metadata and scoped subagent workstream policy strings; no Pi source `writeFile`, `appendFile`, `mkdir`, `rm`, `rmdir`, or `unlink` trusted-state mutation path was found.
- Secret scan found only intentional test fixtures such as fake `OPENAI_API_KEY`, `GH_TOKEN`, and `sk-phase51/52-secret` values plus secret-scanner code; no real secret candidate was introduced by Task 12.
- MathProve/proof-authority and documentation scans continue to mark MathProve, AgentRun, adapter, and runner output as non-authoritative evidence with `proof_authority: none`; current-facing docs still state that arbitrary theorem proving, broad MathProve proof authority, full v3 GA completion, production Pi/Codex hardening, OS sandboxing, and broader theorem synthesis are not achieved or remain deferred.

Changed surfaces:

- Updated `scripts/phase0-smoke.mjs` so the README invariant requires current Phase 18-67 GA/v3 vertical-slice evidence rather than stale Phase 18-58 evidence.
- Added Phase 67 acceptance-matrix smoke invariants requiring `67 v3 end-to-end formal campaign slice` and `phase67-v3-formal-campaign-slice.test.mjs` coverage language.

Requirement drift result: Task 11's positive v3 formal campaign slice is still aligned with Goal 2, and the root smoke gate now protects that evidence instead of failing on a stale bounded-product checkpoint. No additional high-risk product-code defect was found during this loop.

Residual risks:

- Task 13 still needs release-level negative GA slices for statement drift rejection, cheating Lean artifact rejection, false-theorem refutation, all-candidate failure recovery, and clean replay from snapshot.
- Task 14 and Task 15 still need documentation/evidence synchronization and the final v3 GA completion audit before any full v3 GA claim.
- Some historical docs still mention Phase 18-58 as a past bounded checkpoint; that is acceptable as history, but Task 14 must synchronize current-facing release evidence.

## Goal 2 Task 11 / Phase 67 v3 End-To-End Formal Campaign Slice

Scope: implement and verify the positive v3 formal campaign slice required by the external GA docs: user goal intake for `n + 0 = n`, workspace/runtime creation, problem lock, v3 planning/stage-gate artifacts, 8-way candidate generation, candidate verification, evidence-weighted arbitration, Lean formalization, final static audit, clean replay, `formally_checked` promotion, memory update, and replayable artifact bundle.

TDD evidence:

```text
node services/comathd/tests/integration/phase67-v3-formal-campaign-slice.test.mjs
Initial RED result: exit 1; `.comath/campaign/<CAM>/v3_formal_campaign_slice.json` was missing after the campaign reached terminal state, proving the previous product path did not produce the v3 end-to-end slice summary artifact.

corepack pnpm --filter @comath/comathd typecheck
Result: exit 0; no-emit TypeScript check passed after replacing the incorrect `blocked_terms` summary field with the current static-audit `hard_vetoes` and `warnings` fields.

corepack pnpm --filter @comath/comathd build
Result: exit 0; TypeScript build and agent-adapter copy step completed after the Phase 67 implementation.

node services/comathd/tests/integration/phase67-v3-formal-campaign-slice.test.mjs
Result: exit 0; Phase 67 proves `/campaign/start` plus bounded service-owned ticks for `Prove in Lean that n + 0 = n for natural numbers.` reaches `completed_formal_proof`, writes `v3_formal_campaign_slice.json`, records the required v3 stage sequence, records 8 candidates with `CAND-0001` selected by `evidence_weighted` arbitration, passes static audit and clean replay, promotes the claim to `formally_checked`, and replays successfully from the campaign replay route.

node services/comathd/tests/integration/phase18-ga-campaign-vertical-slice.test.mjs
node services/comathd/tests/integration/phase35-final-replay-artifact-paths.test.mjs
node services/comathd/tests/integration/phase57-ga-theorem-template-instantiation.test.mjs
node services/comathd/tests/unit/phase63-v3-stage-gate-artifact-coverage.test.mjs
node services/comathd/tests/unit/phase64-lean-authority-v2-final-gate.test.mjs
Result: exit 0; existing positive campaign, claim-scoped final replay paths, theorem-template instantiation, native stage-gate coverage, and Lean Authority v2 final-gate hash binding still pass.

corepack pnpm --filter @comath/comathd test
Result: exit 0; full comathd default test chain passed with Phase 67 included.
```

Changed surfaces:

- Added `services/comathd/tests/integration/phase67-v3-formal-campaign-slice.test.mjs` and wired it into `@comath/comathd`'s default `test` script.
- Added terminal success emission of `.comath/campaign/<CAM>/v3_formal_campaign_slice.json` from the service-owned campaign tick path.
- Added the v3 slice summary to terminal `memory_update` artifact paths while preserving proof-memory events, final handoff, and final replay snapshot artifacts.
- Updated Phase 35 final replay artifact-path regression so it requires the new v3 summary artifact without treating additional memory artifacts as a regression.

Boundary notes:

- This is the required positive formal campaign slice for a registered theorem family, not a claim of arbitrary theorem proving or full v3 GA completion.
- The clean replay command is recorded from the theorem-family configured final replay command. The external docs permit `lake build` or a configured equivalent, and the test asserts the summary binds to the actual `final_replay.command` while accepting `lake build` or `lake env lean` forms.
- Pi goal-compatible intake remains covered by Phase 66; Phase 67 exercises the trusted `comathd` campaign API directly so the proof authority and state mutation stay service-owned.

Residual risks:

- Task 12 still needs the fourth comprehensive check-debug loop over this final-slice work and root gates.
- Task 13 still needs release-level negative GA slices for statement drift, cheating artifacts, false theorem refutation, all-candidate recovery, and clean replay from snapshot.
- Task 14 and Task 15 still need documentation/evidence synchronization and final v3 GA completion audit before any global GA claim.

## Goal 2 Task 10 / Phase 66 Pi Goal-Compatible Campaign UX

Scope: align the Pi command/tool UX with the v3 goal-compatible campaign surface required by the external GA docs: `/cm:research --goal`, `/cm:campaign status`, `/cm:campaign tick`, `/cm:campaign next-actions`, `/cm:campaign final-audit`, `/cm:campaign replay`, `/cm:audit final`, and `/cm:replay final`. This task keeps Pi as a thin client and does not move mathematical authority out of `comathd`.

TDD evidence:

```text
node tests/phase66-goal-compatible-campaign-ux.test.mjs
Initial RED result: exit 1; `/cm:research --goal "n + 0 = n" --strict` posted `user_goal: "--goal"` to `/campaign/start`, proving the goal-compatible flag form was not safe for unattended Pi goal mode.

corepack pnpm --filter @comath/pi-extension build
Result: exit 0; TypeScript build completed after command parsing and campaign subcommand routing updates.

node tests/phase66-goal-compatible-campaign-ux.test.mjs
Result: exit 0; Phase 66 proves `/cm:research --goal "<target>" --strict` sends the real target to `comathd`, and `/cm:campaign final-audit` plus `/cm:campaign replay` route through host-confirmed service-owned tools.

node tests/phase18-research-campaign-tools.test.mjs
node tests/phase22-research-loop.test.mjs
node tests/phase26-pi-runtime-registration.test.mjs
Result: exit 0; existing Pi campaign tool contracts, bounded research loop behavior, and runtime registration boundaries still pass.

corepack pnpm --filter @comath/pi-extension test
Result: exit 0; full Pi extension package test chain passed with Phase 66 included.

node tests/e2e/phase45-pi-comathd-install-session.test.mjs
Result: exit 0; installed Pi package can still talk to a real `comathd` HTTP server in the local install-session e2e.
```

Changed surfaces:

- Fixed `inferGoal()` so both `/cm:research --goal "<target>"` and `/cm:research "<target>" --goal` are parsed as goal-compatible user targets, while the historical `/cm:research start --goal "<target>"` form remains supported.
- Added `/cm:campaign final-audit` routing to `comath.campaign.finalAudit` with Pi host confirmation and service-owned `/campaign/:id/final-audit` mutation.
- Added `/cm:campaign replay` routing to `comath.campaign.replay` with Pi host confirmation and service-owned `/campaign/:id/replay` mutation.
- Added `extensions/comath-pi/tests/phase66-goal-compatible-campaign-ux.test.mjs` and wired it into the default Pi package test chain.

Boundary notes:

- Pi still does not write `.comath/`, assign claim status, certify proofs, run Lean authority, or own trusted campaign state. It submits campaign specs and host-confirmed bounded mutation requests to `comathd`.
- This task improves the goal-compatible command surface; the full `n + 0 = n` v3 formal campaign slice is covered by Task 11 / Phase 67 above.

Residual risks:

- Task 12 still needs the fourth comprehensive check-debug loop over the final-slice work and root gates.
- Task 13 still needs release-level negative GA slices for statement drift, cheating artifacts, false theorem refutation, all-candidate recovery, and clean replay from snapshot.
- Documentation and release evidence still need Task 14 synchronization and Task 15 final audit before any v3 GA completion claim.

## Goal 2 Task 9 / Comprehensive Check-Debug Loop 3

Scope: third Goal 2 comprehensive check-debug loop over Tasks 7-8 and the surrounding proof-kernel, proof-memory, campaign, Pi, and root surfaces. This loop verifies that Lean Authority v2 final replay binding and failed-route proof-memory retrieval did not weaken claim-promotion gates, introduce tracked runtime artifacts, make Pi a trusted-state writer, or reclassify MathProve/AgentRun output as proof authority.

Verification evidence:

```text
corepack pnpm build
Result: exit 0; workspace build passed for `extensions/comath-pi` and `services/comathd`.

corepack pnpm typecheck
Result: exit 0; workspace TypeScript no-emit checks passed for `extensions/comath-pi` and `services/comathd`.

corepack pnpm test
Result: exit 0; root Phase 0 smoke, Pi extension tests through Phase 59, comathd tests through Phase 65, Phase 45 Pi/comathd install-session e2e, and Phase 17 integrity evaluation passed.

Test-Path -LiteralPath 'D:\MATH _Studio\comath-pi-lab\.comath'
Result: False; no repo-root runtime `.comath` directory was left behind.

git ls-files '.comath' '.tmp' 'dist' 'node_modules' 'services/comathd/dist' 'extensions/comath-pi/dist'
Result: no output; no runtime, dependency, or build-output paths from those patterns are tracked.

git status -sb --ignored
Result: clean tracked tree; only ignored `.pnpm-store/`, `.worktrees/`, package `dist/`, and `node_modules/` directories were present.
```

Static scan result:

- Claim-gate/status scan found expected status reads, process-result status checks, and the service-owned `applyGatePromotedClaim` / `promoteClaim` surfaces only; no direct privileged `formally_checked` assignment was found in Pi or non-gate code.
- Pi direct-write scan found only `.comath` strings used for service authority descriptors and scoped subagent workstream policy; no Pi `writeFileSync`, `appendFileSync`, `mkdirSync`, `rmSync`, `unlinkSync`, or `createWriteStream` direct runtime-state mutation was found.
- MathProve/proof-authority scan continues to describe MathProve, AgentRun, adapter, and runner outputs as non-authoritative evidence or orchestration material with `proof_authority: none`; no MathProve-as-`formally_checked` authority regression was found.
- Overclaim scan continues to mark global GA readiness, arbitrary theorem proving, broad MathProve proof authority, production Pi/Codex hardening, OS sandboxing, and broader theorem synthesis as deferred or not achieved.

Requirement drift result: Tasks 7-8 are still aligned with Goal 2 v3 direction. Phase 64 strengthened final promotion by hash-binding fresh Lean replay artifacts, while Phase 65 made failed proof routes retrievable memory without adding proof authority. The product is ready to move from proof-kernel/memory hardening into Task 10 Pi goal-compatible campaign UX work.

Boundary notes: no high-risk implementation defect was found during this check-debug loop, so no product-code repair was required. The remaining work is product development, not more review: Pi goal-compatible UX, an end-to-end v3 formal campaign slice, release-level negative slices, documentation synchronization, and the final v3 GA completion audit remain open.

Residual risks:

- Task 10 still needs Pi command/API alignment for goal-compatible campaign start, status, tick, next actions, final audit, and replay UX.
- Task 11 still needs an end-to-end v3 formal campaign slice from user goal intake to final clean replay and promotion.
- Task 13 still needs consolidated release-level negative GA slices for statement drift, cheating artifact rejection, false-theorem refutation, all-candidate recovery, and clean replay from snapshot.
- Task 14 and Task 15 still need documentation/evidence synchronization and the final v3 GA completion audit.

## Goal 2 Task 8 / Phase 65 Failed-Route Proof Memory Retrieval

Scope: make failed routes first-class proof-memory records that can be read and retrieved by later obligations with explicit stale/superseded warnings. This closes the Task 8 gap where previous phases preserved failed routes and aggregates, but did not yet expose an obligation-level retrieval surface or inject it into campaign context.

TDD evidence:

```text
node services/comathd/tests/unit/phase65-proof-memory-retrieval.test.mjs
Initial RED result: exit 1; `readProofMemoryEvents` was not exported, proving the existing implementation had no proof-memory read/retrieval API for failed routes.

corepack pnpm --filter @comath/comathd build
Result: exit 0; TypeScript build completed after proof-memory event, retrieval, campaign knowledge-pack, status, and test-chain updates.

node services/comathd/tests/unit/phase65-proof-memory-retrieval.test.mjs
Result: exit 0; Phase 65 proves failed routes carry typed proof-memory fields, similar obligations retrieve prior failures, stale/superseded warnings are written, and a later campaign knowledge pack includes prior failed-route retrieval metadata.

node services/comathd/tests/unit/phase19-ga-ensemble-recovery.test.mjs
node services/comathd/tests/unit/phase61-v3-candidate-contract.test.mjs
node services/comathd/tests/unit/phase63-v3-stage-gate-artifact-coverage.test.mjs
Result: exit 0; existing failure preservation, failure aggregate, and stage-gate artifact regressions still pass.

corepack pnpm --filter @comath/comathd typecheck
Result: exit 0; comathd no-emit typecheck passed.

corepack pnpm --filter @comath/comathd test
Result: exit 0; full comathd default test chain passed with Phase 65 included.
```

Changed surfaces:

- Extended proof-memory failure events written by `recordFailedRoutes()` with statement hash, theorem/proposition route keys, manifest and candidate artifact paths, blockers, repair hints, supersession fields, final handoff pointer, and `proof_authority: "none"`.
- Added `readProofMemoryEvents()` and `retrieveSimilarFailedRoutes()` in `services/comathd/src/proof-kernel/ensemble/failure-aggregator.ts`.
- Retrieval matches exact locked statement hashes and similar theorem/proposition keys, while logging stale/superseded/unresolved-blocker warnings to `.comath/proof_memory/stale_or_superseded_warnings.jsonl`.
- The `knowledge_pack` campaign stage now calls proof-memory retrieval and writes match/warning summaries into `knowledge_pack.json` and the context-lake knowledge shard.
- Added `services/comathd/tests/unit/phase65-proof-memory-retrieval.test.mjs`, wired it into `@comath/comathd test`, and exposed `proof_memory_failed_route_retrieval` in service status.

Boundary notes: this task implements native failed-route retrieval for the current proof-kernel theorem-family campaign path. It does not yet add a broad vector/Trivium-backed proof-memory ranking layer, a full automatic repair loop, or a Pi-facing proof-memory browser.

Residual risks:

- Similarity is conservative and deterministic: exact statement hash or normalized theorem/proposition route keys. Richer semantic matching remains future work.
- Supersession is represented and warned on, but no dedicated repair command yet marks routes superseded automatically after a theorem repair; later repair-loop work should own that lifecycle.
- Task 9 should run the broader check-debug loop over proof-kernel, memory, campaign, and root surfaces.

## Goal 2 Task 7 / Phase 64 Lean Authority v2 Final Gate Hash Binding

Scope: harden the final Lean authority path so `formally_checked` promotion is bound not only to a passed replay manifest for the claim, but also to fresh, hash-bound final replay artifacts: replay stdout/stderr, final static audit, axiom profile, dependency closure, and statement-equivalence reports.

TDD evidence:

```text
node services/comathd/tests/unit/phase64-lean-authority-v2-final-gate.test.mjs
Initial RED result: exit 1; the promotion gate accepted an old-format final replay manifest with `result: "pass"` but no hash-bound final replay reports, promoting the claim instead of rejecting it.

corepack pnpm --filter @comath/comathd build
Result: exit 0; TypeScript build completed after schema, clean replay, gate, and test-chain updates.

node services/comathd/tests/unit/phase64-lean-authority-v2-final-gate.test.mjs
Result: exit 0; Phase 64 rejects both old-format stale replay manifests and hash-bound replay manifests whose live replay log has drifted after import.

node services/comathd/tests/unit/phase31-lean-trust-profile.test.mjs
node services/comathd/tests/unit/phase32-lean-statement-signature.test.mjs
node services/comathd/tests/unit/phase37-lean-statement-alias-equivalence.test.mjs
node services/comathd/tests/unit/phase56-lean-registered-logical-equivalence.test.mjs
Result: exit 0; existing unauthorized construct, axiom-profile, statement-signature, alias, and registered-equivalence checks still pass.

node services/comathd/tests/integration/phase35-final-replay-artifact-paths.test.mjs
Result: exit 0; final replay stage-run artifact paths remain claim-scoped after adding replay artifact hashes.

node services/comathd/tests/unit/phase18-ga-proof-kernel-gates.test.mjs
node services/comathd/tests/unit/phase63-v3-stage-gate-artifact-coverage.test.mjs
Result: exit 0; existing proof-kernel promotion boundaries and native v3 stage-gate artifact coverage still pass.

corepack pnpm --filter @comath/comathd typecheck
Result: exit 0; comathd no-emit typecheck passed.

corepack pnpm --filter @comath/comathd test
Result: exit 0; full comathd default test chain passed with Phase 64 included.
```

Changed surfaces:

- Extended `FinalLeanReplay` with `artifact_hashes` for final replay stdout, stderr, static audit, axiom profile, dependency closure, and statement equivalence.
- Updated `runCleanLeanReplay()` to hash each final replay report after writing it and before serializing `final_replay_manifest.json`.
- Hardened the promotion gate with a fresh-artifact check that re-reads every path named by the final replay manifest and compares its current SHA-256 and size to the manifest-bound values.
- Added `formally_checked requires hash-bound fresh final replay artifacts` as a separate fail-closed veto while preserving the older `passed proof-kernel final replay manifest` veto for missing or invalid manifests.
- Added `services/comathd/tests/unit/phase64-lean-authority-v2-final-gate.test.mjs`, wired it into `@comath/comathd test`, and exposed `lean_authority_v2_final_gate_hash_binding` in service status.

Boundary notes: this task completes the high-value final promotion binding gap for the current native theorem-family Lean replay path. It does not broaden Lean theorem synthesis, add arbitrary-domain equivalence proof search, or replace the existing Phase 31/32/37/56 trust and statement-equivalence checks.

Residual risks:

- Dependency closure and axiom profile reports remain as strong native audit reports for the current generated Lean project, but deeper transitive Lake/mathlib provenance and richer proof-search-grade equivalence are still bounded by the existing implementation.
- Required negative GA slices still need a later consolidated Task 13 run to prove statement drift, cheating artifacts, false-theorem refutation, all-candidate failure recovery, and clean replay from snapshot as release-level slices.
- Failure-memory retrieval remains Task 8.

## Goal 2 Task 6 / Comprehensive Check-Debug Loop 2

Scope: second Goal 2 comprehensive check-debug loop over Tasks 4-5. This loop verifies the Phase 62 evidence-weighted decision forest and Phase 63 native stage-gate artifact guard together, then checks root build/typecheck/test, stage-gate outputs, failure preservation, no-premature-closure semantics, Pi thin-client boundaries, runtime artifact cleanliness, and documentation overclaim risk.

Verification evidence:

```text
corepack pnpm --filter @comath/comathd build
Result: exit 0; comathd TypeScript build passed after Task 5 commit.

node services/comathd/tests/unit/phase62-v3-decision-forest.test.mjs
Result: exit 0; evidence-weighted arbitration still rejects score/vote-as-proof, routes refutation candidates to repair, and blocks no-proof batches.

node services/comathd/tests/unit/phase63-v3-stage-gate-artifact-coverage.test.mjs
Result: exit 0; native v3 stage-gate artifact coverage and missing-artifact rewind/blocker behavior still pass.

node services/comathd/tests/unit/phase20-ga-campaign-state-machine.test.mjs
Result: exit 0; campaign state machine follows the v3 native gate sequence.

node services/comathd/tests/integration/phase18-ga-campaign-vertical-slice.test.mjs
Result: exit 0; positive formal campaign still reaches `completed_formal_proof`.

node services/comathd/tests/integration/phase35-final-replay-artifact-paths.test.mjs
Result: exit 0; final replay and memory-update artifact paths remain claim-scoped and recorded.

corepack pnpm --filter @comath/comathd typecheck
Result: exit 0; comathd no-emit typecheck passed.

corepack pnpm --filter @comath/comathd test
Result: exit 0; full comathd default test chain passed with Phases 62 and 63 included.

corepack pnpm build
Result: exit 0; root recursive build passed for `extensions/comath-pi` and `services/comathd`.

corepack pnpm typecheck
Result: exit 0; root recursive no-emit typecheck passed for `extensions/comath-pi` and `services/comathd`.

corepack pnpm test
Result: exit 0; root smoke, Pi extension tests, comathd tests, Phase 45 Pi/comathd install-session e2e, and Phase 17 integrity evaluation all passed.
```

Audit scans:

```text
Test-Path D:\MATH _Studio\comath-pi-lab\.comath
Result: False; no runtime campaign state was left in the repository root.

git status -sb --ignored
Result: clean tracked tree; only ignored `.pnpm-store/`, `.worktrees/`, `extensions/comath-pi/dist/`, `node_modules/`, `services/comathd/dist/`, and `services/comathd/node_modules/` were present.

git ls-files '.comath' '.tmp' 'dist' 'node_modules' 'services/comathd/dist' 'extensions/comath-pi/dist'
Result: no tracked runtime/build/dependency artifacts.

rg over Pi extension source for direct `.comath` writes
Result: no direct Pi runtime-state write APIs in source; `.comath` occurrences are capability/write-scope strings or tests. Pi remains a thin client over `comathd`.

rg over proof-kernel campaign and Phase 62/63 tests for stage blockers, proof authority, formal promotion, and memory update
Result: `stage_gate_blocker`, `MISSING_REQUIRED_STAGE_ARTIFACT`, `refutation_red_team`, `integration_refactor`, `memory_update`, and `target_status: "formally_checked"` are covered by service-owned campaign code and focused tests.

rg over docs/review files for GA/proof-authority overclaim language
Result: docs continue to describe global GA readiness, arbitrary theorem proving, broad MathProve proof authority, production Pi/Codex hardening, OS sandboxing, and broader theorem synthesis as deferred or not achieved.
```

Result: no high-risk regression was found, so no product-code repair was made in this loop. The Task 4-5 implementation is coherent with the current v3 direction, while remaining explicitly bounded to the registered theorem-family campaign slices and the current native stage-gate artifact guard.

Residual risks:

- Stage-gate blocker repair/resume remains a later product task; blocked campaigns preserve evidence and rewind target but do not yet have a dedicated gate repair command.
- Failure-memory retrieval and similar-obligation warning behavior remain Task 8.
- Lean Authority v2 stale-log, unauthorized-construct, dependency drift, axiom-profile mismatch, and statement mismatch negative slices remain Task 7 / Task 13.

## Goal 2 Task 5 / Phase 63 v3 Native Stage-Gate Artifact Coverage

Scope: add native, service-owned stage-gate artifact coverage for the v3 campaign path. This task turns the previous implicit/merged planning and review stages into explicit campaign stage runs for knowledge, notation, skeleton, line-map, refutation/red-team, integration/refactor, final replay evidence, and memory handoff, with fail-closed artifact guards.

TDD evidence:

```text
node services/comathd/tests/unit/phase63-v3-stage-gate-artifact-coverage.test.mjs
Initial RED result: exit 1; the campaign had no `knowledge_pack` stage run, proving the test hit the missing v3 native stage-gate behavior rather than an incidental assertion.

corepack pnpm --filter @comath/comathd build
Result: exit 0; TypeScript build completed after stage-gate implementation.

node services/comathd/tests/unit/phase63-v3-stage-gate-artifact-coverage.test.mjs
Result: exit 0; Phase 63 proves the positive campaign records required v3 stage runs and artifacts, and deleting `.comath/campaign/<id>/proof/line_map.json` blocks candidate generation with `stage_gate_blocker.json` and rewind target `line_map_gate`.

node services/comathd/tests/unit/phase20-ga-campaign-state-machine.test.mjs
Result: exit 0; public campaign state-machine regression now follows the v3 native gate sequence.

node services/comathd/tests/unit/phase33-proof-obligation-dag.test.mjs
Result: exit 0; proof-obligation DAG, skeleton, line-map, and obligation YAML artifacts remain generated and campaign-scoped after the stage split.

node services/comathd/tests/integration/phase35-final-replay-artifact-paths.test.mjs
Result: exit 0; final replay stage runs now record final replay log, static audit, axiom profile, dependency closure, statement equivalence, and replay manifest paths, and memory update records its handoff artifacts.

node services/comathd/tests/integration/phase18-ga-campaign-vertical-slice.test.mjs
Result: exit 0; positive formal campaign vertical slice still reaches `completed_formal_proof`.

node services/comathd/tests/integration/phase18-ga-refutation-path.test.mjs
Result: exit 0; exact refutation path still terminates as `completed_refutation`.

node services/comathd/tests/integration/phase23-ga-integrity-boundaries.test.mjs
Result: exit 0; unsupported and mismatched integrity-boundary cases still fail closed.

node services/comathd/tests/integration/phase34-campaign-ensemble-isolation.test.mjs
Result: exit 0; campaign-scoped ensemble isolation still passes.

node services/comathd/tests/unit/phase60-v3-campaign-pause-resume.test.mjs
Result: exit 0; paused campaign tick guard still blocks mutation, and resume now continues into the v3 `knowledge_pack` stage.

node services/comathd/tests/unit/phase62-v3-decision-forest.test.mjs
Result: exit 0; evidence-weighted arbitration behavior still passes.

corepack pnpm --filter @comath/comathd typecheck
Result: exit 0; comathd no-emit typecheck passed.

corepack pnpm --filter @comath/comathd test
Result: exit 0; default comathd test chain passed with Phase 63 included.
```

Changed surfaces:

- Added v3 native public campaign stages to the schema while keeping older compatibility stages accepted for persisted campaigns.
- Changed new campaign ticks to advance through `knowledge_pack -> notation_gate -> skeleton_gate -> line_map_gate -> candidate_generation -> candidate_verification -> candidate_arbitration -> refutation_red_team -> integration_refactor -> final_static_audit -> final_global_replay -> completed_formal_proof`, with a `memory_update` stage run recorded before terminal completion.
- Added stage artifacts for knowledge packs, notation definitions/shards, skeleton and line-map gates, mandatory red-team report, integration/refactor outputs, final replay evidence, proof-memory events, final handoff shard, and final replay snapshot manifest.
- Added a required-artifact guard before downstream stages. Missing artifacts now persist `.comath/campaign/<id>/stage_gate_blocker.json`, set non-terminal `status: "blocked"`, rewind `current_stage` to the producing gate, and record a blocked stage run for the attempted stage.
- Updated state-machine, DAG, pause/resume, and final replay artifact-path regressions to reflect the v3 stage split.

Boundary notes: this task implements native artifact coverage and fail-closed missing-artifact behavior for the current theorem-family campaign path. It does not yet solve broad theorem synthesis, full terminal-vocabulary aliasing from every external document, richer failure-memory retrieval, or the later Lean Authority v2 stale-artifact/unauthorized-construct negative slices.

Residual risks:

- Blocked stage-gate campaigns currently stop in `status: "blocked"` with a rewind target and recorded blocker; an explicit repair/resume API for re-running just the producing gate remains later product work.
- Some v3 artifacts are structured native handoff artifacts for the current elementary theorem-family path, not a general literature/RAG pipeline for arbitrary math domains.
- Final memory update records the formal proof handoff but does not yet retrieve similar failed routes for future obligations; that remains Task 8.

## Goal 2 Task 4 / Phase 62 v3 Evidence-Weighted Decision Forest

Scope: harden candidate arbitration so it follows the v3 rule that the decision forest is not proof authority and must not treat majority, raw score, or plausibility as proof. This task builds on Phase 61 manifest validation and closes the specific Task 4 gap: evidence-weighted selection, verified refutation priority, and no-proof recovery behavior.

TDD evidence:

```text
node services/comathd/tests/unit/phase62-v3-decision-forest.test.mjs
Initial RED result: exit 1; decision output did not expose `selection_mode: "evidence_weighted"` and lacked the v3 decision metadata/branch semantics expected by the new regression.

corepack pnpm --filter @comath/comathd build
Result: exit 0; TypeScript build completed after decision forest changes.

node services/comathd/tests/unit/phase62-v3-decision-forest.test.mjs
Result: exit 0; Phase 62 decision-forest regression passed. It proves high-score plausible-only candidates cannot beat a kernel-checked candidate, verified refutation enters `repair_required`, and skeleton/plausible-only batches block with a recovery plan.

node services/comathd/tests/unit/phase18-ga-proof-kernel-gates.test.mjs
Result: exit 0; existing gate and statement-drift regressions still pass.

node services/comathd/tests/unit/phase19-ga-ensemble-recovery.test.mjs
Result: exit 0; seven-failures-plus-one-Lean-pass ensemble recovery still selects the Lean-valid candidate and preserves failures.

node services/comathd/tests/unit/phase61-v3-candidate-contract.test.mjs
Result: exit 0; v3 candidate manifest validation and failure aggregate contract still pass.

corepack pnpm --filter @comath/comathd typecheck
Result: exit 0; comathd no-emit typecheck passed.

corepack pnpm --filter @comath/comathd test
Result: exit 0; default comathd test chain passed with Phase 62 included.
```

Changed surfaces:

- Extended `EnsembleDecision` with `selection_mode`, optional `refutation_candidate_id`, and `proof_authority: "none"`.
- Replaced score-only ordering with evidence-layered scoring over manifest-valid kernel-checked exact/equivalent candidates: kernel check, statement-equivalence claim, dependency/replay evidence, maintainability, dependency/lemma reuse, and only capped low-weight candidate score/agreement.
- Kept candidate/manifest hard vetoes, missing statement-hash binding, statement drift, non-proof-grade statement-equivalence claims, and unapproved introduced assumptions as disqualifiers for proof selection.
- Added a verified-refutation branch that returns no selected proof candidate, records `refutation_candidate_id`, sets gate result `repair_required`, and supplies theorem repair/counterexample recovery actions.
- Added a no-proof branch that blocks with explicit failure aggregation and split/repair/refutation recovery instructions.
- Added `services/comathd/tests/unit/phase62-v3-decision-forest.test.mjs`, wired it into `@comath/comathd test`, and exposed `evidence_weighted_decision_forest` in service status.

Boundary notes: this decision forest remains an artifact selector, not proof authority. Final claim promotion still requires the ordinary CoMath proof-kernel replay and promotion gate. Agreement/raw score is capped as a tie-break-like weak signal and cannot select a non-proof-grade candidate.

Residual risks:

- The evidence scorer uses current manifest fields as proxy evidence. Later Lean Authority v2 work should hash-bind final replay, statement equivalence, dependency closure, and axiom-profile artifacts more tightly into candidate manifests and decisions.
- Verified refutation at the decision-forest layer routes to repair/counterexample protocol; full campaign-stage refutation/red-team artifact coverage is Task 5/Task 13 work.
- The current implementation does not yet persist a separate decision-forest score breakdown artifact for every candidate.

## Goal 2 Task 3 / Comprehensive Check-Debug Loop 1

Scope: perform the first Goal 2 comprehensive check-debug loop after Phase 60 and Phase 61. This loop verifies the new campaign pause/tick guard and v3 candidate-manifest/failure-aggregate contract against the current v3 GA scope without re-running the older Goal 1 audit as the development objective.

Verification evidence:

```text
corepack pnpm --filter @comath/comathd build
Result: exit 0; comathd TypeScript build passed after Tasks 1-2.

corepack pnpm --filter @comath/comathd typecheck
Result: exit 0; comathd no-emit typecheck passed.

node services/comathd/tests/unit/phase60-v3-campaign-pause-resume.test.mjs
Result: exit 0; paused campaigns reject tick with no state/artifact mutation and resume continues the bounded tick path.

node services/comathd/tests/unit/phase61-v3-candidate-contract.test.mjs
Result: exit 0; candidate manifests are validated before arbitration and failure aggregates preserve all-failure evidence.

node services/comathd/tests/unit/phase18-ga-proof-kernel-gates.test.mjs
Result: exit 0; proof-kernel gate boundaries and v3 manifest fixture compatibility still pass.

node services/comathd/tests/unit/phase19-ga-ensemble-recovery.test.mjs
Result: exit 0; seven-failures-plus-one-Lean-pass recovery still passes.

node services/comathd/tests/integration/phase18-ga-campaign-vertical-slice.test.mjs
Result: exit 0; positive formal campaign vertical slice still passes.

corepack pnpm build
Result: exit 0; root recursive build passed.

corepack pnpm typecheck
Result: exit 0; root recursive no-emit typecheck passed.

corepack pnpm test
Result: exit 0; root test chain passed, including Phase 0/design smoke, Pi package tests, comathd package tests through Phase 61, Phase 45 Pi/comathd install-session e2e, and Phase 17 integrity evaluation.
```

Static scan evidence:

```text
rg -n "applyGatePromotedClaim|promoteClaim\(|formally_checked|gate\.ok" services/comathd/src services/comathd/tests extensions/comath-pi/src README.md TODO.md REVIEW.md MATH_INTEGRITY_REVIEW.md SECURITY_REVIEW.md
Result: expected hits only in the promotion gate, campaign proof/refutation path, tests, and guardrail documentation. `applyGatePromotedClaim()` remains a low-level store primitive used by the gate-controlled promotion path and campaign proof-kernel paths; no new direct Pi or documentation-driven authority path was found.

rg -n "status\s*=" services/comathd/src services/comathd/tests
Result: ordinary local variables, assertions, replay metadata mutation in a test fixture, and campaign terminal checks only.

rg -n "\.status\s*=" services/comathd/src services/comathd/tests
Result: no direct claim-status assignment bypass found.

rg -n "\.comath|writeRuntimeFile|writeFileSync|mkdirSync|rmSync|unlinkSync|appendFileSync|createWriteStream" extensions/comath-pi/src extensions/tools
Result: expected documentation/subagent scoped-write strings only; no direct Pi trusted `.comath/` runtime-file mutation path found.

git ls-files .comath .tmp dist node_modules services/comathd/dist extensions/comath-pi/dist
Result: no tracked generated/runtime/dependency artifacts.

git ls-files -o --exclude-standard
Result: no untracked files before record edits.

Test-Path 'D:\MATH _Studio\comath-pi-lab\.comath'
Result: False; no repository-root runtime state was left behind.
```

Requirement drift result: Tasks 1-2 are aligned with Goal 2's v3 direction and do not overclaim full GA. Phase 60 closes a live resumability/control-plane defect by making paused ticks fail closed. Phase 61 makes candidate manifests and failed-route aggregates first-class audit objects before Task 4's deeper decision-forest hardening.

Boundary notes: no high-risk implementation defect was found during this check-debug loop, so no product code repair was required. A sidecar verifier attempt was launched but failed with upstream 429; the final result is based on local build/typecheck/test/static-scan evidence.

Residual risks:

- Pause/resume currently restores `running` and does not preserve a richer pre-pause substatus if future states such as `blocked` or `repairing` become pausable.
- Candidate manifests are structure- and identity-validated, but artifact descriptors are not yet content-hash bound to the decision record.
- The `candidate_verification` campaign artifact still summarizes stored `CandidateRun[]`; manifest validation is enforced at arbitration rather than at the earlier artifact-write boundary.
- Full evidence-weighted arbitration remains Task 4, not a completed property of Task 3.

## Goal 2 Task 2 / Phase 61 v3 Candidate Manifest And Failure Aggregate Contract

Scope: harden the existing 8-way theorem-family candidate path so candidate artifacts are not merely per-workspace files plus in-memory `CandidateRun` records. This task makes candidate manifests and failed-route aggregation first-class campaign-scoped audit objects before arbitration.

TDD evidence:

```text
node services/comathd/tests/unit/phase61-v3-candidate-contract.test.mjs
Initial RED result: exit 1; `candidate_manifest.json` did not expose the required `state` field.

corepack pnpm --filter @comath/comathd build
Result: exit 0; TypeScript build completed after schema, runner, arbiter, and failure aggregate changes.

node services/comathd/tests/unit/phase61-v3-candidate-contract.test.mjs
Result: exit 0; Phase 61 v3 candidate manifest and failure aggregate tests passed.

node services/comathd/tests/unit/phase18-ga-proof-kernel-gates.test.mjs
Result: exit 0; hand-built candidate fixture now carries v3 manifests and the existing statement-drift rejection still passes.

node services/comathd/tests/unit/phase19-ga-ensemble-recovery.test.mjs
Result: exit 0; existing seven-failures-plus-one-Lean-pass ensemble recovery still passes.

node services/comathd/tests/integration/phase18-ga-campaign-vertical-slice.test.mjs
Result: exit 0; positive formal campaign vertical slice still passes.

node services/comathd/tests/integration/phase34-campaign-ensemble-isolation.test.mjs
Result: exit 0; campaign-scoped ensemble isolation still passes.

corepack pnpm --filter @comath/comathd test
Result: exit 0; default comathd test chain passed with Phase 61 included.
```

Changed surfaces:

- Extended `candidateManifestSchema` with `campaign_id`, `workspace_path`, `state`, `dependencies`, `assumptions`, and structured candidate artifact descriptors.
- Updated theorem-family candidate generation to write those fields into each `candidate_manifest.json`.
- Added arbitration preflight validation in `decideCandidate()` so missing or mismatched candidate manifests fail closed with `CANDIDATE_MANIFEST_INVALID`.
- Upgraded `recordFailedRoutes()` to return and persist a `FailureRouteAggregate` with clusters, failed candidate ids, hard vetoes, recommendations, proof authority `none`, event-log path, and aggregate path.
- Added `services/comathd/tests/unit/phase61-v3-candidate-contract.test.mjs`, wired it into `@comath/comathd test`, and exposed `candidate_manifest_v3_contract` plus `failure_route_aggregate_memory` in service status.

Boundary notes: this task does not implement Task 4's full evidence-weighted decision forest scoring matrix. It ensures the current arbiter can only operate over validated candidate manifests and that failed routes have an aggregate audit object.

Residual risks: candidate artifact descriptors currently list relative artifact paths and semantic kinds, not content hashes. Full manifest hashing, batch-level candidate index files, and decision-to-aggregate hash binding remain useful hardening targets for later tasks.

## Goal 2 Task 1 / Phase 60 v3 Campaign Pause-Tick Contract

Scope: continue the v3 GA development line without repeating the Goal 1 audit. This task closes a live ResearchCampaign control-plane gap: `/campaign/:id/pause` persisted `status: "paused"`, but `/campaign/:id/tick` still advanced trusted state and wrote the next stage artifact.

TDD evidence:

```text
node services/comathd/tests/unit/phase60-v3-campaign-pause-resume.test.mjs
Initial RED result: exit 1; paused campaign tick returned 200 instead of expected 409.

corepack pnpm --filter @comath/comathd build
Result: exit 0; TypeScript build completed.

node services/comathd/tests/unit/phase60-v3-campaign-pause-resume.test.mjs
Result: exit 0; Phase 60 v3 campaign pause/resume tests passed.

node services/comathd/tests/unit/phase20-ga-campaign-state-machine.test.mjs
Result: exit 0; existing v3 campaign state-machine regression still passed.

node services/comathd/tests/integration/phase18-ga-campaign-vertical-slice.test.mjs
Result: exit 0; positive formal campaign vertical slice still passed.
```

Changed surfaces:

- Added a fail-closed `tickCampaign()` guard for paused campaigns with code `CAMPAIGN_PAUSED` and HTTP 409 through the API error wrapper.
- Added `services/comathd/tests/unit/phase60-v3-campaign-pause-resume.test.mjs` proving paused ticks do not advance stage, append stage runs, or write the next proof-obligation artifact, and that resume permits the bounded tick to continue.
- Wired the regression into the default `@comath/comathd` test chain and exposed `campaign_pause_tick_guard` in service status.
- Updated `TODO.md` and `goal-2/tasks.md` to record the implemented v3 development step and remaining GA gaps.

Boundary notes: this task improves bounded/resumable campaign semantics. It does not claim full v3 GA completion, terminal-vocabulary compatibility with every external document, broad theorem synthesis, or native stage-gate coverage beyond the existing implemented slices.

Residual risks: the external v3 documents still name terminal states as `formal_proof_verified`, `verified_counterexample`, `user_visible_theorem_repair_required`, `replayable_environment_blocker`, and `user_cancelled`; the current API exposes the Goal 1 canonicalized names and needs a later compatibility/alignment task.

## Goal 1 Task 11 Final Product Completion Audit

Scope: final requirement-by-requirement completion audit for Goal 1 on branch `ga-v3-implementation-20260527`. The audited product claim is bounded to the current Research Alpha plus Phase 18-58 vertical-slice implementation. This audit does not claim global GA readiness, arbitrary theorem proving, MathProve proof authority, production Codex/Pi managed-service hardening, OS-enforced runner isolation, default native TriviumDB deployment, or broad statement-equivalence proof search.

Requirement matrix:

| Requirement | Final evidence | Result |
| --- | --- | --- |
| Preserve the existing repo, branch, git history, and Goal Mode workspace. | `git status -sb` started clean on `ga-v3-implementation-20260527`; `git log --oneline --decorate -8` showed the Task 10 documentation commits at HEAD; `goal-1/input.md`, `goal-1/plan.md`, and `goal-1/tasks.md` were re-read before this task. | Satisfied. |
| Produce a coherent bounded product, not a rough scaffold. | `README.md`, `TODO.md`, `docs/progress/product-readiness-matrix.md`, and `docs/architecture/acceptance-matrix.md` define Research Alpha plus Phase 18-58 as the bounded product; Tasks 4-10 audited Pi, service, gate, proof/runner, memory/artifact, and documentation surfaces. | Satisfied inside bounded scope. |
| Keep Pi as a thin client with no trusted-state authority. | Final Pi static scan over `extensions/comath-pi/src` and `extensions/tools` found only documentation strings, dashboard rendering text, service-authority metadata, and subagent forbidden-scope strings for `.comath`/service paths; no source-level direct `.comath` mutation was found. Root `corepack pnpm test` included Pi Phase 6, 8, 12, 15, 18, 22, 26, 30, 41-44, 46-51, and 59 tests plus the Phase 45 Pi/comathd e2e. | Satisfied. |
| Keep `comathd` as trusted runtime owner and preserve gates/path policy/AgentRun/replay integrity. | Root tests passed across comathd Phase 1-58 unit/integration chain, including path policy, claim gate, GraphPatch, snapshot/replay, proof-kernel, runner provenance, writer locks, AgentRun scheduler, Codex/Pi service surfaces, and MathProve final-audit runner coverage. | Satisfied. |
| Preserve mathematical authority boundaries. | Final privileged-status scan found ordinary `promoteClaim()` / `applyGatePromotedClaim()` / proof-kernel paths and paper read checks; focused `claim.status =` scan found no direct assignment bypass. MathProve overclaim scan left only explicit guardrail/deferred statements. | Satisfied. |
| Keep process execution fixed/validated and non-shell by default. | Final process scan found expected `spawn`/`spawnSync` uses in validated scheduler, health, package, adapter, and Lean runner boundaries; focused `shell:\s*true` scan returned no hits. | Satisfied. |
| Keep secrets and runtime/generated artifacts out of committed state. | Secret scan hits were policy text, scanner patterns, and deterministic fake test fixtures. `Test-Path -LiteralPath 'D:\MATH _Studio\comath-pi-lab\.comath'` returned `False`; `git ls-files .comath .tmp dist node_modules services/comathd/dist extensions/comath-pi/dist` and `git ls-files -o --exclude-standard` returned no output. | Satisfied. |
| Preserve bounded non-goals rather than overclaim them as complete. | `TODO.md` and `docs/progress/product-readiness-matrix.md` classify broad theorem synthesis, broad MathProve authority, production Codex/Pi hardening, OS/network sandboxing, richer real-host Pi lifecycle, and broad statement-equivalence as deferred global-GA work. | Satisfied. |
| Run final full validation from the final worktree. | `corepack pnpm build`, `corepack pnpm typecheck`, and `corepack pnpm test` all exited 0 during Task 11. The root test covered Phase 0/design smoke, Pi tests through Phase 59, comathd Phase 1-58, Phase 45 install-session e2e, and Phase 17 integrity evaluation. | Satisfied. |

Final validation evidence:

```text
corepack pnpm build
Result: exit 0; workspace build passed for extensions/comath-pi and services/comathd.

corepack pnpm typecheck
Result: exit 0; workspace no-emit typecheck passed for extensions/comath-pi and services/comathd.

corepack pnpm test
Result: exit 0; Phase 0/design smoke, Pi package tests through Phase 59, comathd Phase 1-58 unit/integration chain, Phase 45 Pi/comathd install-session e2e, and Phase 17 integrity evaluation passed.
```

Final cleanliness and safety evidence:

```text
Test-Path -LiteralPath 'D:\MATH _Studio\comath-pi-lab\.comath'
Result: False.

git status -sb --ignored
Result: clean tracked tree on ga-v3-implementation-20260527; only ignored .pnpm-store/, .worktrees/, node_modules/, and dist/ directories were present.

git ls-files .comath .tmp dist node_modules services/comathd/dist extensions/comath-pi/dist
Result: no tracked runtime/generated entries.

git ls-files -o --exclude-standard
Result: no untracked commit candidates.

rg -n 'shell:\s*true' services/comathd/src
Result: no hits.
```

Residual risks: the remaining risks are explicitly deferred global-GA items, not hidden missing features in the bounded product: broad theorem synthesis, broad MathProve proof authority, production Codex/Pi account/network/operator lifecycle hardening, OS-enforced process/network sandboxing, cross-process scheduler recovery, richer real-host Pi service lifecycle management, and broader statement-equivalence proof search.

## Goal 1 Task 10 Documentation Synchronization Review Log

Scope: synchronize the product-facing documentation after Goal 1 Tasks 4-9 so the README, design plan, mathematical-integrity review, acceptance matrix, risk register, product-readiness matrix, and design handoff agree with the current bounded Research Alpha plus Phase 18-58 product state.

Documentation changes:

- Added a README "Usable Product Entrypoints" section naming the current local product path: `comathd` owns trusted runtime state, the Pi package is the interaction layer, root/package validation gates are the executable checks, the Phase 45 local install-session e2e is the current installed-session path, and `.comath/` remains runtime-only.
- Updated `COMATH_PI_LAB_DEV_PLAN.md` from the stale Phase 18-28 status language to Phase 18-58, including optional TriviumDB target-platform evaluation, local Pi/comathd install-session e2e, AgentRun profile/adapter slices, Codex CLI/API adapter boundaries, Lean statement-binding extensions, and controlled MathProve evidence runners.
- Updated `MATH_INTEGRITY_REVIEW.md`, `docs/architecture/acceptance-matrix.md`, `docs/architecture/risk-register.md`, `docs/progress/product-readiness-matrix.md`, and `docs/progress/design-handoff.md` so the current deferred set is not confused with already implemented bounded slices.

Boundary notes:

- The synchronized docs still describe CoMath Pi Lab as a bounded local Research Alpha plus Phase 18-58 vertical-slice product, not global GA readiness.
- `formally_checked` still requires CoMath proof-kernel replay plus the ordinary gate; MathProve final-audit output remains runner evidence only.
- TriviumDB remains optional and adapter-bound; native evaluation does not make it the default backend.
- AgentRun/Codex/Pi outputs remain untrusted runtime material with `proof_authority=none`.
- Remaining deferred work includes broad theorem synthesis, broad MathProve proof authority, OS/network sandboxing, production account/network validation, indefinite operator sessions, richer real-host Pi service lifecycle management, cross-process scheduler recovery, and broader statement-equivalence proof search.

Verification commands for this task are recorded in `goal-1/tasks.md` Task 10.

## Phase 58 MathProve Final-Audit Runner Review Log

Scope: Phase 58 adds a controlled external runner bridge for `MathProve-Skill` `final_audit.py`. CoMath generates the final-audit steps JSON, owns the workspace, hashes replay input/steps/solution/stdout/stderr/result/script material, archives host-path-scrubbed reports as `external-final-audit`, and feeds final-audit vetoes into the ordinary promotion gate.

TDD evidence:

```powershell
node services/comathd/tests/unit/phase58-mathprove-final-audit-runner.test.mjs
```

Initial RED result: exit 1; `runMathProveFinalAuditExternal` was not exported.

Focused GREEN evidence after implementation:

```powershell
corepack pnpm --filter @comath/comathd build
node services/comathd/tests/unit/phase58-mathprove-final-audit-runner.test.mjs
```

Result: both exited 0. Phase 58 invokes the real sibling `MathProve-Skill` `scripts/final_audit.py`, receives a passed MathProve final-audit report for the deterministic SymPy smoke step, archives it without Windows host paths, records `steps_sha256` and `solution_sha256`, and still rejects formal promotion with `mathprove_final_audit_not_formal_authority` plus missing CoMath kernel evidence.

Implementation notes:

- Added `phase58-final-audit-v1`, runner id `mathprove-skill.final_audit`, backend `external-final-audit`, and export `runMathProveFinalAuditExternal()` in `services/comathd/src/verification/mathprove.ts`.
- Added `services/comathd/tests/unit/phase58-mathprove-final-audit-runner.test.mjs` to the default `@comath/comathd` test chain and status capability `mathprove_final_audit_external_runner`.
- Updated smoke checks, README, TODO, security review, mathematical-integrity review, acceptance matrix, AGENTS, and design handoff to reflect the new runner boundary.

Boundary: Phase 58 is not broad MathProve proof search and not a MathProve proof-authority path. Final-audit reports are runner evidence only; `formally_checked` still requires CoMath proof-kernel replay evidence and the ordinary gate.

## Phase 57 Lean Theorem Template Instantiation Review Log

Scope: Phase 57 extends the native theorem-family registry with a third service-owned Nat identity template, `nat_zero_add`. User goals for `0 + n = n` now lock a normalized statement, Lean target, candidate metadata, final replay manifest, and proof dependency using `Nat.zero_add`, then pass only through the existing clean Lean replay and claim promotion gates.

TDD RED evidence:

```text
node services/comathd/tests/integration/phase57-ga-theorem-template-instantiation.test.mjs
```

Result: exit 1; the campaign locked the raw user goal text instead of `For every natural number n, 0 + n = n.`, showing that `0 + n = n` was not yet recognized as a supported theorem-family template.

Focused GREEN evidence:

```text
corepack pnpm --filter @comath/comathd build
node services/comathd/tests/integration/phase57-ga-theorem-template-instantiation.test.mjs
node services/comathd/tests/integration/phase23-ga-theorem-family-generalization.test.mjs
node services/comathd/tests/integration/phase23-ga-integrity-boundaries.test.mjs
```

Result: all exited 0 after implementation. Phase 57 proves the `nat_zero_add` template completes full campaign replay and promotion, while Phase 23 regressions preserve the existing `nat_mul_zero`, unsupported-goal, mismatch, and refutation boundaries.

Implementation notes:

- Added `nat_zero_add` to the service-owned theorem-family registry with proposition `0 + n = n`, Lean target `theorem C0001 (n : Nat) : 0 + n = n`, proof term `Nat.zero_add n`, and dependency `Nat.zero_add`.
- Extended goal classification and obligation matching to include `nat_zero_add`.
- Added `services/comathd/tests/integration/phase57-ga-theorem-template-instantiation.test.mjs` to the default `@comath/comathd` test chain and status capability `proof_kernel_theorem_template_instantiation`.

Residual risk:

Phase 57 is a registry-bound theorem template instantiation slice. It is not arbitrary theorem synthesis, broad proof planning, model-generated Lean code acceptance, or a replacement for final clean replay. The global GA blocker remains for broad theorem synthesis beyond registered theorem-family templates.

## Phase 56 Registered Lean Logical-Equivalence Witnesses Review Log

Scope: Phase 56 adds a controlled logical-equivalence statement-binding path. `checkStatementEquivalence()` can now accept `logically_equivalent_with_registered_lemmas` only when an explicitly registered entry exactly matches the locked formal spec and extracted target signature, supplies `witness_kind: lean_kernel_checked_equivalence`, a witness artifact id, a valid SHA-256 witness artifact hash, non-empty lemma names, and a justification. Missing witness material or a target-signature mismatch remains fail-closed.

TDD RED evidence:

```text
node services/comathd/tests/unit/phase56-lean-registered-logical-equivalence.test.mjs
```

Result: exit 1; the accepted registered logical-equivalence case returned `fail` instead of `pass`, showing the pre-existing `logically_equivalent_with_registered_lemmas` status was only a type placeholder and had no implementation path.

Focused GREEN evidence:

```text
corepack pnpm --filter @comath/comathd build
node services/comathd/tests/unit/phase56-lean-registered-logical-equivalence.test.mjs
node services/comathd/tests/unit/phase37-lean-statement-alias-equivalence.test.mjs
node services/comathd/tests/unit/phase54-lean-declaration-parser.test.mjs
```

Result: all exited 0 after implementation. Phase 56 validates registered witness acceptance plus fail-closed missing hash, missing lemma, and wrong-target cases; Phase 37/54 regressions preserve alias and declaration-parser behavior.

Implementation notes:

- Added `StatementRegisteredLogicalEquivalence` and optional `allowed_registered_logical_equivalences` input.
- Added `registered_logical_equivalence` witness reports with witness kind, artifact id/hash, lemma names, and justification.
- Required exact formal-spec/target-signature matching and valid witness metadata before reporting `logically_equivalent_with_registered_lemmas`.
- Added `services/comathd/tests/unit/phase56-lean-registered-logical-equivalence.test.mjs` to the default `@comath/comathd` test chain and status capability `lean_registered_logical_equivalence_witnesses`.

Residual risk:

Phase 56 does not search for equivalence lemmas, prove transitive semantic equivalence, or broaden the trusted mathematical domain automatically. It is a registered, witness-backed statement-binding gate; final authority still requires clean Lean replay, static audit, dependency closure, axiom profile, and the ordinary claim promotion path.

## Phase 55 Runner Cross-Machine Replay Environment Gate Review Log

Scope: Phase 55 adds a replay-integrity gate for cross-machine/environment drift. Snapshot replay verification now compares each replay run's recorded Node version, platform, and architecture against the current process before runner re-execution. A mismatch fails closed with `runner_reexecution_environment_mismatch` and does not launch runner replay.

TDD RED evidence:

```text
node services/comathd/tests/unit/phase55-runner-cross-machine-replay.test.mjs
```

Result: exit 1; after tampering `manifest.replay.runs[].environment.platform` and recomputing the manifest hashes, `/replay/verify-manifest` still returned `ok=true`. This was the expected missing environment-drift gate failure.

Focused GREEN evidence:

```text
node services/comathd/tests/unit/phase55-runner-cross-machine-replay.test.mjs
node services/comathd/tests/unit/phase16-snapshot-replay.test.mjs
```

Result: both exited 0 after implementation. The Phase 55 test verifies tampered-but-rehashed replay environment metadata fails closed before runner launch; the Phase 16 regression keeps existing strict replay behavior intact.

Implementation notes:

- Added replay-run environment comparison in `verifySnapshot()` for `node`, `platform`, and `arch`.
- Added veto `runner_reexecution_environment_mismatch` before runner re-execution summaries are launched.
- Added `services/comathd/tests/unit/phase55-runner-cross-machine-replay.test.mjs` to the default `@comath/comathd` test chain.
- Added status capability `runner_cross_machine_replay_environment_gate` and smoke/acceptance documentation.

Residual risk:

Phase 55 is a replay environment drift gate, not an OS-level sandbox, enforced network-denial layer, dependency installation resolver, signed snapshot protocol, or proof authority. It reduces cross-machine replay ambiguity for the implemented Python compute runners while leaving OS isolation and network enforcement as global GA blockers.

## Phase 54 Lean Declaration Parser Signature Fallback Review Log

Scope: Phase 54 adds a conservative Lean theorem/lemma declaration parser as a fallback for statement-equivalence binding when target `#check` output is absent. It parses declaration headers from Lean source, supports namespace-qualified theorem binding and multi-line binders, records `signature_source: lean_declaration_parser`, and preserves fail-closed behavior for ambiguous declarations and comment-only substring matches.

TDD RED evidence:

```text
node services/comathd/tests/unit/phase54-lean-declaration-parser.test.mjs
```

Result: exit 1; the test failed because `extractLeanTheoremDeclarationSignature` was not exported. This was the expected missing-parser-entrypoint failure.

GREEN evidence:

```text
corepack pnpm --filter @comath/comathd build
node services/comathd/tests/unit/phase54-lean-declaration-parser.test.mjs
```

Result: both exited 0 after implementation; the focused test validates multi-line declaration parsing, namespace-qualified target binding, statement-equivalence fallback, ambiguous declaration rejection, and comment-only substring rejection.

Implementation notes:

- Added `extractLeanTheoremDeclarationSignature()` in `statement-signature.ts` for target theorem/lemma declaration headers.
- Extended `checkStatementEquivalence()` with optional `lean_source` and `signature_source` reporting.
- Kept existing `#check` output as the preferred source when available; declaration parsing is a fallback, not a replacement for Lean kernel checks.
- Wired Phase 54 into the default `@comath/comathd` test chain and status capability `lean_declaration_parser_signature_fallback`.

Residual risk:

This is not a full Lean elaborator, proof-producing definitional equality engine, transitive logical-equivalence system, or broad mathematical-domain trust profile. It improves target binding for declaration headers only; final authority remains clean Lean replay plus the existing gate path.

## Phase 53 Installed Codex CLI Validation Review Log

Scope: Phase 53 adds a service-owned validation path for an installed external Codex-compatible CLI. `validateExternalCodexCliInstallation()` resolves `COMATH_CODEX_CLI_PROGRAM` and optional service prefix args inside `comathd`, runs bounded `--version` and `--health --profile <profile>` probes with `COMATH_PROOF_AUTHORITY=none`, exposes `/agent/adapter/package/validate-installed-cli`, and records audit telemetry without returning the configured executable path.

TDD RED evidence:

```text
node services/comathd/tests/unit/phase53-installed-codex-cli-validation.test.mjs
```

Result: exit 1; the test failed because `validateExternalCodexCliInstallation` was not exported. This was the expected missing-product-entrypoint failure.

GREEN evidence:

```text
corepack pnpm --filter @comath/comathd build
node services/comathd/tests/unit/phase53-installed-codex-cli-validation.test.mjs
```

Result: both exited 0 after implementation; the focused test validates configured CLI version/health probes, fail-closed missing configuration, route exposure, audit event emission, executable-path non-disclosure, and `proof_authority=none`.

Implementation notes:

- Added `validateExternalCodexCliInstallation()` and exported typed installed-CLI validation/probe result shapes from the agent adapter package module.
- Added `POST /agent/adapter/package/validate-installed-cli` as a service-side endpoint; callers provide adapter/profile/project metadata and timeout, not executable paths.
- Added audit event `agent_adapter.installed_codex_cli_validated` keyed by project id, with package/profile ids, probe booleans, health version/capabilities, diagnostics, and `proof_authority=none`.
- Wired Phase 53 into the default `@comath/comathd` test chain and status capability `installed_codex_cli_validation`.

Residual risk:

Phase 53 validates a service-configured installed CLI contract with bounded probes, but it is not a live production Codex API account/network validation, streaming operator UX, credential rotation workflow, OS-enforced adapter isolation, or proof authority. Probe stdout/stderr and health metadata remain runtime diagnostics only.

## Phase 52 Codex API Retry And Rate-Limit Telemetry Review Log

Scope: Phase 52 hardens the Phase 51 `codex-api` backend with bounded retry behavior and operator-visible telemetry. The backend retries only retryable statuses (`429`, `5xx`), honors capped `Retry-After`, records attempt counts/status sequences/rate-limit detection in report and audit payloads, and fails closed after exhausted attempts without exposing service API keys.

TDD RED evidence:

```text
node services/comathd/tests/unit/phase52-codex-api-retry-telemetry.test.mjs
Result: exit 1; the first injected 429 caused the Codex API backend AgentRun to fail instead of retrying and succeeding on the second attempt.
```

Focused GREEN evidence:

```text
node services/comathd/tests/unit/phase52-codex-api-retry-telemetry.test.mjs
Result: exit 0; 429 recovery, attempt/status telemetry, rate-limit report fields, exhausted 503 fail-closed behavior, `agent_adapter.codex_api_invoked` and `agent_adapter.codex_api_failed` audit events, and API-key non-disclosure passed.
```

Implementation summary:

- Added `COMATH_CODEX_API_MAX_ATTEMPTS` parsing with a conservative bounded range.
- Added retry handling for `429` and `5xx` Codex API backend responses with capped `Retry-After` delays.
- Added attempt/status/rate-limit telemetry to Codex API reports and audit events.
- Added fail-closed exhausted-attempt stderr diagnostics and `agent_adapter.codex_api_failed` audit events.
- Wired Phase 52 into the default `@comath/comathd` test chain and smoke status capability `codex_api_retry_telemetry`.

Boundary notes:

Phase 52 improves production reliability semantics, but it is still not live production API/network validation, streaming Responses API support, credential rotation UX, or proof authority. API output and retry telemetry remain AgentRun runtime material with `proof_authority=none`.

Residual risks:

- No live production OpenAI account/network call was run in this phase; tests use an injected client.
- Streaming Responses API handling, production quota dashboards, credential rotation UX, and installed production Codex CLI validation remain deferred.
- OS-enforced adapter isolation and network-denial policy remain deferred.

## Phase 51 Service-Configured Codex API Backend Contract Review Log

Scope: Phase 51 adds a `codex-api` backend option to the service-owned `codex-cli` adapter package. The backend is configured by `comathd` environment (`COMATH_CODEX_API_KEY`, optional base URL/model), exposes only secret-free launch metadata, executes through a Responses-compatible client boundary with test injection, and wraps output as non-authoritative AgentRun report/log material. Pi can select `--backend codex-api`, but cannot supply API keys, base URLs, executable paths, or proof authority.

TDD RED evidence:

```text
node services/comathd/tests/unit/phase51-codex-api-backend.test.mjs
Result: exit 1; `setCodexApiBackendClientForTests` was not exported before implementation.

node extensions/comath-pi/tests/phase51-codex-api-backend-tools.test.mjs
Result: exit 1; `codex-api` was not present in packaged-adapter backend tool schemas before implementation.
```

Focused GREEN evidence:

```text
node services/comathd/tests/unit/phase51-codex-api-backend.test.mjs
Result: exit 0; service-configured Codex API backend execution, secret-free prepare payloads, injected Responses-compatible request shape, missing-key fail-closed behavior, audit events, and `proof_authority=none` report wrapping passed.

node extensions/comath-pi/tests/phase51-codex-api-backend-tools.test.mjs
Result: exit 0; Pi backend enum, prepare/execute POST payloads, command dispatch, host confirmation path, and absence of API-key/base-URL fields passed.
```

Implementation summary:

- Added `codex-api` as an `AgentAdapterBackend` for the service-owned `codex-cli` package.
- Added `setCodexApiBackendClientForTests()` and a default HTTPS `/responses` client boundary for service-configured API execution.
- Kept launch envelopes secret-free: they expose `COMATH_CODEX_API_KEY_REF`, configured flags, model metadata, and `proof_authority=none`, but not the API key value.
- Executed Codex API backend runs through AgentRun lifecycle (`startAgentRun()`/`submitAgentRunReport()`), `.tmp/comath/<ARUN>/logs`, audit events, and non-authoritative report wrapping.
- Added Pi `codex-api` backend selection for packaged adapter prepare/execute tools and `/cm:agent prepare-package|execute-package --backend codex-api`.

Boundary notes:

Phase 51 is not a proof-authority backend and not a production account/network validation claim. The API response is untrusted AgentRun material with `proof_authority=none`; it cannot certify claims, apply GraphPatch, select proof candidates as authoritative, or replace Lean replay/static audit. Real production API credential validation, streaming API UX, retry/backoff policy, and provider-specific quota/error observability remain future hardening work.

Residual risks:

- No live production OpenAI account/network call was run in this phase; tests use an injected Responses-compatible client.
- Streaming Responses API handling, credential-rotation UX, and production quota dashboards remain deferred.
- OS-enforced adapter isolation and production installed Codex CLI validation remain deferred.

## Phase 50 Bounded Multi-Event AgentRun Log Session Review Log

Scope: Phase 50 extends the Phase 46/47 log surfaces from single cursor reads and one-frame SSE snapshots to a bounded multi-event SSE response. The service emits multiple `agent_run.log_chunk` frames by advancing stdout/stderr cursors through `streamAgentRunLogs()`, stops at `max_events`, terminal completion, or no cursor progress, and records `agent_run.logs_sse_session`. Pi exposes the read-only surface as `comath.agent.logSession` and `/cm:agent log-session` through `getText()`.

TDD RED evidence:

```text
node services/comathd/tests/unit/phase50-agent-log-session.test.mjs
Result: exit 1; `formatAgentRunLogSseSession` was not exported before implementation.

node extensions/comath-pi/tests/phase50-agent-log-session-tools.test.mjs
Result: exit 1; `comath.agent.logSession` was not registered before implementation.
```

Focused GREEN evidence:

```text
node services/comathd/tests/unit/phase50-agent-log-session.test.mjs
Result: exit 0; bounded multi-event SSE log-session formatting, route handling, max-event limiting, completion/no-progress termination, audit events, and `proof_authority=none` payloads passed.

node extensions/comath-pi/tests/phase50-agent-log-session-tools.test.mjs
Result: exit 0; Pi tool schema, text GET routing, runtime registration, `/cm:agent log-session`, and operator notification output passed.
```

Implementation summary:

- Added `formatAgentRunLogSseSession()` in AgentRun observability on top of cursor-bounded `streamAgentRunLogs()`.
- Added `GET /agent/run/:id/log-session` returning `text/event-stream` and service status capability `agent_run_log_session_sse`.
- Added Pi `comath.agent.logSession` and `/cm:agent log-session` as read-only text-client surfaces.
- Wired Phase 50 focused tests into the default `@comath/comathd` and `@comath/pi-extension` test chains.

Boundary notes:

Phase 50 is a bounded multi-event SSE response, not an indefinite browser-held WebSocket/SSE operator session, terminal emulator, cross-process scheduler channel, or proof-authority path. Log-session frames remain observability artifacts with `proof_authority=none`; they cannot certify claims, apply GraphPatch, promote candidate correctness, or replace Lean replay/static audit.

Residual risks:

- Indefinite WebSocket/SSE sessions and richer browser/operator UX remain deferred.
- Cross-process scheduler recovery and cancellation remain deferred.
- Production Codex CLI/API validation and OS-enforced adapter isolation remain deferred.

## Phase 49 Scheduler-Backed AgentRun Operator Cancellation Review Log

Scope: Phase 49 turns the Phase 48 operator panel's cancellation placeholder into a real same-process control path. The service now keeps an active scheduler registry for launched AgentRuns, exposes `cancelAgentRunFromOperator()` plus `POST /agent/run/:id/cancel`, and enables panel cancellation only while the active registry can prove that the run is cancellable. Pi exposes the control as a host-confirmed mutation via `comath.agent.cancelRun` and `/cm:agent cancel`.

TDD RED evidence:

```text
node services/comathd/tests/unit/phase49-agent-operator-cancel.test.mjs
Result: exit 1; `cancelAgentRunFromOperator` was not exported before implementation.

node extensions/comath-pi/tests/phase49-agent-operator-cancel-tools.test.mjs
Result: exit 1; `comath.agent.cancelRun` was not registered before implementation.
```

Focused GREEN evidence:

```text
node services/comathd/tests/unit/phase49-agent-operator-cancel.test.mjs
Result: exit 0; long-running adapter execution became cancellable through the active scheduler registry, `POST /agent/run/:id/cancel` returned `proof_authority=none`, persisted the run as `cancelled`, emitted audit events, and panel cancellation disabled after terminal state.

node extensions/comath-pi/tests/phase49-agent-operator-cancel-tools.test.mjs
Result: exit 0; Pi cancel tool schema, required host confirmation, POST route payload, runtime registration, `/cm:agent cancel`, and operator notification output passed.
```

Implementation summary:

- Added an active scheduler registry in `agent-run-scheduler.ts` keyed by project root, project id, and AgentRun id.
- Added `isAgentRunCancellableByOperator()` and `cancelAgentRunFromOperator()` with fail-closed terminal/non-registry rejection.
- Added `POST /agent/run/:id/cancel` and service status capability `agent_run_operator_cancel`.
- Updated operator panels so `cancel.enabled=true` only for same-process active registry runs.
- Added Pi `comath.agent.cancelRun` and `/cm:agent cancel` behind host confirmation.
- Wired Phase 49 focused tests into the default `@comath/comathd` and `@comath/pi-extension` test chains.

Boundary notes:

Phase 49 is not cross-process cancellation, a persistent operator session, a terminal emulator, or a proof-authority path. Cancellation requires the active scheduler registry in the current `comathd` process; stale, terminal, or non-registry AgentRuns fail closed. Cancellation results remain runtime control metadata with `proof_authority=none` and cannot certify claims, apply GraphPatch, or replace Lean replay/static audit.

Residual risks:

- Cross-process cancellation and durable scheduler recovery remain deferred.
- Persistent multi-event WebSocket/SSE operator sessions remain deferred.
- Production Codex CLI/API validation and OS-enforced adapter isolation remain deferred.
## Phase 48 AgentRun Operator Panel Review Log

Scope: Phase 48 adds a service-owned AgentRun operator panel read model on top of Phase 46/47 log observability. The panel aggregates AgentRun status, cursor log stream metadata, SSE subscription snapshot metadata, endpoint hints, and action availability while keeping `proof_authority=none`. Cancellation is explicitly reported as unavailable unless a future real scheduler registry can prove live cancellability; this phase does not fake cross-process cancellation.

TDD RED evidence:

```text
node services/comathd/tests/unit/phase48-agent-operator-panel.test.mjs
Result: exit 1; `readAgentRunOperatorPanel` was not exported before implementation.

node extensions/comath-pi/tests/phase48-agent-operator-panel-tools.test.mjs
Result: exit 1; `comath.agent.operatorPanel` was not registered before implementation.
```

Focused GREEN evidence:

```text
node services/comathd/tests/unit/phase48-agent-operator-panel.test.mjs
Result: exit 0; service operator panel aggregation, route handling, disabled-cancel semantics, audit event, endpoint metadata, and `proof_authority=none` passed.

node extensions/comath-pi/tests/phase48-agent-operator-panel-tools.test.mjs
Result: exit 0; Pi tool schema, JSON GET route payload, runtime registration, `/cm:agent panel`, and operator notification output passed.
```

Implementation summary:

- Added `readAgentRunOperatorPanel()` in AgentRun observability.
- Added `GET /agent/run/:id/operator-panel`, audit event `agent_run.operator_panel_read`, and service status capability `agent_run_operator_panel`.
- Added Pi `comath.agent.operatorPanel` and `/cm:agent panel` as read-only operator surfaces.
- Wired Phase 48 focused tests into the default `@comath/comathd` and `@comath/pi-extension` test chains.

Boundary notes:

Phase 48 is a read-only operator control panel, not a live terminal, not an indefinite browser-held SSE/WebSocket session, and not a scheduler-registry-backed cancellation API. Operator panel payloads remain observability metadata with `proof_authority=none`; they cannot certify claims, apply GraphPatch, mutate `.comath/` directly from Pi, or replace final Lean replay/static audit.

Residual risks:

- True scheduler-backed live cancellation remains deferred until a service-owned active scheduler registry exists.
- Persistent multi-event WebSocket/SSE sessions remain deferred.
- Production Codex CLI/API validation and OS-enforced adapter isolation remain deferred.
# REVIEW

## Phase 47 SSE-Style AgentRun Log Subscription Review Log

### Scope

Phase 47 adds an SSE-compatible AgentRun log subscription snapshot on top of Phase 46 cursor polling. The service exposes `formatAgentRunLogSseSnapshot()` and `GET /agent/run/:id/log-subscription`, returning `text/event-stream` frames with `retry`, `event: agent_run.log_chunk`, an event id bound to the run and next cursors, JSON `data`, audit events, and `proof_authority=none`. Pi exposes the same read-only surface through `comath.agent.subscribeLogs`, `createComathClient().getText()`, and `/cm:agent subscribe-logs`.

### TDD Evidence

Initial service RED result:

```text
node services/comathd/tests/unit/phase47-agent-log-subscription.test.mjs
Result: exit 1; `formatAgentRunLogSseSnapshot` was not exported before implementation.
```

Initial Pi RED result:

```text
node extensions/comath-pi/tests/phase47-agent-log-subscription-tools.test.mjs
Result: exit 1; `comath.agent.subscribeLogs` was not registered before implementation.
```

Focused validation:

```text
node services/comathd/tests/unit/phase47-agent-log-subscription.test.mjs
Result: exit 0; SSE-compatible service log snapshot formatting, route headers/body, audit event emission, and non-authoritative metadata passed.

node extensions/comath-pi/tests/phase47-agent-log-subscription-tools.test.mjs
Result: exit 0; Pi text client, tool schema, text route payload, runtime registration, `/cm:agent subscribe-logs`, and operator notification output passed.
```

### Implementation Notes

- Added `formatAgentRunLogSseSnapshot()` to `services/comathd/src/agents/agent-run-observability.ts`.
- Added `GET /agent/run/:id/log-subscription`, `text/event-stream` response support in the local server wrapper, audit event `agent_run.logs_sse_snapshot`, and service status capability `agent_run_log_subscription_sse`.
- Added Pi `ComathClient.getText()`, `comath.agent.subscribeLogs`, and `/cm:agent subscribe-logs`.
- Wired Phase 47 focused tests into the default `@comath/comathd` and `@comath/pi-extension` test chains.

### Boundary Statement

Phase 47 is an SSE-compatible snapshot frame, not an indefinite server loop, browser UI, or terminal session. It gives operators a real `text/event-stream` surface that can be polled or composed by a host, while all frame payloads remain untrusted observability material with `proof_authority=none`.

### Residual Risks

- Persistent multi-event WebSocket/SSE sessions and richer operator controls remain deferred.
- Production Codex API/backend validation and installed production Codex CLI validation remain deferred.
- OS-level process isolation and network-denial enforcement remain deferred.

## Phase 46 Cursor-Based AgentRun Log Stream Review Log

### Scope

Phase 46 adds service-owned cursor polling for AgentRun stdout/stderr logs. It exposes `streamAgentRunLogs()` and `GET /agent/run/:id/log-stream` with independent stdout/stderr byte cursors, bounded chunks, next cursors, terminal completion detection, audit events, and `proof_authority=none`. Pi exposes the same read-only path through `comath.agent.streamLogs` and `/cm:agent stream`.

### TDD Evidence

Initial service RED result:

```text
node services/comathd/tests/unit/phase46-agent-log-stream.test.mjs
Result: exit 1; `streamAgentRunLogs` was not exported before implementation.
```

Initial Pi RED result:

```text
node extensions/comath-pi/tests/phase46-agent-log-stream-tools.test.mjs
Result: exit 1; `comath.agent.streamLogs` was not registered before implementation.
```

Focused validation:

```text
node services/comathd/tests/unit/phase46-agent-log-stream.test.mjs
Result: exit 0; cursor-based service log streaming, route handling, invalid-cursor rejection, audit event emission, and non-authoritative metadata passed.

node extensions/comath-pi/tests/phase46-agent-log-stream-tools.test.mjs
Result: exit 0; Pi tool schema, GET route payload, runtime registration, `/cm:agent stream`, and operator notification output passed.
```

### Implementation Notes

- Added `streamAgentRunLogs()` to `services/comathd/src/agents/agent-run-observability.ts`.
- Added `GET /agent/run/:id/log-stream` and service status capability `agent_run_log_stream_cursor`.
- Added Pi `comath.agent.streamLogs` and `/cm:agent stream` as read-only operator polling surfaces.
- Wired Phase 46 focused tests into the default `@comath/comathd` and `@comath/pi-extension` test chains.

### Boundary Statement

Phase 46 is cursor-based polling, not WebSocket/SSE subscription and not an interactive terminal. It improves operator observability beyond one-shot capped reads, but streamed log chunks remain untrusted runtime artifacts with `proof_authority=none`; they cannot promote claims, certify proofs, apply GraphPatch, or replace proof-kernel replay.

### Residual Risks

- Continuous subscription transport, richer operator controls, and production Codex CLI/API validation remain deferred.
- OS-level process isolation and network-denial enforcement remain deferred.
- Cursor values are byte offsets into UTF-8 log files; callers should treat chunk text as display material, not a proof artifact.

## Phase 45 Pi/comathd Install-Session E2E Review Log

### Scope

Phase 45 adds a root-level local install-session e2e that crosses the package boundary: it starts a real `comathd` HTTP server, imports the built Pi extension from `extensions/comath-pi/package.json` `pi.extensions[0]`, registers the extension into a fake Pi host, and drives campaign/agent command flows through `createComathClient({ baseUrl })` rather than mocked client calls.

### TDD Evidence

Initial RED/debugging results:

```text
node tests/e2e/phase45-pi-comathd-install-session.test.mjs
Result: exit 1; the test initially assumed a nonexistent `details.project.project_id` field, exposing the real `/campaign/start` return shape.

node tests/e2e/phase45-pi-comathd-install-session.test.mjs
Result: exit 1; the install-session command used invalid run id `ARUN-PHASE45`, and comathd correctly rejected it against the stable-id regex.
```

Final focused validation:

```text
node tests/e2e/phase45-pi-comathd-install-session.test.mjs
Result: exit 0; real HTTP comathd server, built Pi entrypoint import, fake Pi host registration, live client wiring, host confirmation, campaign start/status/tick, agent package listing, packaged adapter prepare-launch, project status, and resources discovery passed.
```

### Implementation Notes

- Added `tests/e2e/phase45-pi-comathd-install-session.test.mjs`.
- Wired the Phase 45 e2e into root `corepack pnpm test` after workspace package tests and before Phase 17 evaluation.
- Verified the installed-session path preserves `rpm=4`, `comathd_only` trusted-state access, Pi host confirmation for mutating tools/commands, operator notifications, and non-authoritative packaged adapter launch visibility.

### Boundary Statement

Phase 45 is an automated local install-session e2e, not a full manual real-host Pi UX certification. It proves the built extension and local service can run through a realistic HTTP session with host-confirmed mutations. Richer operator UI, service lifecycle management, and real Pi host manual install walkthrough remain separate GA hardening targets.

## Phase 44 Codex CLI External Adapter Invocation Review Log

### Scope

Phase 44 upgrades the service-owned `codex-cli` package from bundled-launcher-only execution to an optional external Codex-compatible CLI backend. The external backend is enabled only by service environment configuration (`COMATH_CODEX_CLI_PROGRAM`, plus optional JSON `COMATH_CODEX_CLI_PREFIX_ARGS`), then selected by package prepare/execute inputs with `backend: "external"`. Pi can select the backend but cannot provide arbitrary external program paths.

### TDD Evidence

Initial service RED result:

```text
node services/comathd/tests/unit/phase44-codex-cli-external-invocation.test.mjs
Result: exit 1; COMATH_CODEX_ADAPTER_BACKEND was undefined in the prepared package launch envelope.
```

Initial Pi RED result:

```text
node extensions/comath-pi/tests/phase44-agent-adapter-external-tools.test.mjs
Result: exit 1; prepareAdapterPackage tool schema did not expose a backend enum.
```

### Implementation Notes

- Added `backend?: "bundled" | "external"` to package prepare/execute inputs and route payloads.
- Added service-side external CLI resolution from `COMATH_CODEX_CLI_PROGRAM`, requiring an absolute existing path and recording the realpath in the launcher environment.
- Added optional `COMATH_CODEX_CLI_PREFIX_ARGS` as a JSON string array for fixed service-owned prefix args, used by tests to execute a fake `.mjs` CLI through the current Node runtime without exposing arbitrary shell strings.
- Extended the bundled `codex-cli-adapter.mjs` to invoke the external program with `spawnSync`, `shell:false`, AgentRun-scoped cwd, bounded output capture, fixed argv (`--profile`, `--role`, `--goal-file`, `--context`, `--prompt-file`), and `COMATH_PROOF_AUTHORITY=none`.
- Wrapped external stdout/stderr as untrusted AgentRun report material under `external_output_untrusted: true`; the report still states no claim promotion, no GraphPatch authority, and no proof authority.
- Added Pi `backend` enum schema and `/cm:agent prepare-package|execute-package --backend external` passthrough while preserving host confirmation for mutating operations.
- Added `codex_cli_external_adapter_invocation` to service status and wired Phase 44 tests into default package test chains.

### Boundary Statement

The external backend is runtime orchestration only. It can produce draft agent material through a service-configured Codex-compatible CLI, but it cannot promote claims, certify proofs, apply GraphPatch, mutate trusted state directly, or replace Lean-backed final replay. Missing external CLI configuration fails closed as a durable failed AgentRun.

### Residual Risks

- Phase 44 validates against a fake Codex-compatible CLI, not an installed production Codex CLI or a real Codex API backend.
- Streaming/subscription log UX, richer operator controls, and OS-enforced adapter isolation remain deferred.
- External CLI network denial is not OS-enforced by this phase; the current boundary is fixed argv, scoped cwd, scheduler timeout/cancellation, rpm=4, and non-authoritative wrapping.

### Focused Validation

Fresh focused validation completed on 2026-05-28:

```text
node services/comathd/tests/unit/phase43-agent-adapter-package.test.mjs
Result: exit 0; bundled package lifecycle remains compatible after the v2 launcher health version update.

node services/comathd/tests/unit/phase44-codex-cli-external-invocation.test.mjs
Result: exit 0; external CLI backend invokes fixed service-configured argv, wraps output as untrusted, and fails closed when unconfigured.

node extensions/comath-pi/tests/phase43-agent-adapter-package-tools.test.mjs
Result: exit 0; default packaged adapter Pi tools still omit backend when unspecified.

node extensions/comath-pi/tests/phase44-agent-adapter-external-tools.test.mjs
Result: exit 0; Pi tools and `/cm:agent` commands pass `backend: external` without exposing program paths.
```

## Phase 0 Review Log

### Scope

Bootstrap only. No claim registry, verification gate, memory backend, MathProve bridge, compute runner, workstream lifecycle, or Pi runtime integration has been implemented.

### Runtime Assumptions

- Node detected locally before bootstrap: `v22.22.0`.
- npm detected locally before bootstrap: `10.9.4`.
- standalone `pnpm.cmd` was not on PATH.
- Corepack is available and reported `pnpm 11.3.0`.
- Pi ecosystem package versions checked before bootstrap included `@earendil-works/pi-agent-core@0.75.5`, `@earendil-works/pi-coding-agent@0.75.5`, and `@earendil-works/pi-tui@0.75.5`.
- TriviumDB registry check reported `triviumdb@0.7.1`.

### External Boundary Notes

- Pi official docs are normative for extension APIs. `buyixian/pi-ecosystem-docs` is useful taxonomy but may drift.
- TriviumDB is alpha/native and remains optional behind an adapter.
- AI co-mathematician arXiv:2605.06651 v2 is workflow inspiration only; no DeepMind performance or discovery claims are reproduced.
- MathProve-Skill is treated as an evidence producer and gate runner.

### Validation Commands

Phase 0 validation completed on 2026-05-25:

```text
corepack pnpm install
Result: exit 0; installed TypeScript 5.9.3; generated pnpm-lock.yaml.

corepack pnpm build
Result: exit 0; @comath/comathd tsc build completed.

corepack pnpm typecheck
Result: exit 0; @comath/comathd tsc --noEmit completed.

corepack pnpm test
Result: exit 0; root Phase 0 smoke check passed for 19 required entries and 5 invariants; comathd Phase 0 smoke test passed.
```

### Risks

- Pi permission and subagent APIs must be revalidated before Phase 6; current docs support permission-gate patterns, not necessarily a separate stable permission subsystem.
- TriviumDB native loading must be probed on the target platform before any backend is enabled by default.
- Future agents must not edit `D:\MATH _Studio\math_studio` for this project.

### Phase 0 Changed Files

Created root documentation, workspace package files, ADRs, integration notes, skeleton extension/schema/test directories, `services/comathd` TypeScript package skeleton, root smoke test, Phase 0 handoff, and `pnpm-lock.yaml`.

### Next Phase Readiness

Ready for Phase 1 only: contracts, IDs, schemas, statement normalization/hash, and GraphPatch contract. Do not start service routes, memory backends, gates, or Pi runtime registration in Phase 1.

## Design Documentation Review Log

### Scope

Completed the whole project design and target goal documentation. This is a design/documentation deliverable, not Phase 1 implementation.

### Added Design Artifacts

- `COMATH_PI_LAB_DEV_PLAN.md`: complete target architecture, phase roadmap, milestones, and design completion criteria.
- `CODEX_GOAL_RUNBOOK.md`: Phase 0-17 goal templates, constraints, validation, stop rules, agent matrix, and anti-patterns.
- `docs/architecture/end-state-blueprint.md`: final system behavior and data/control flow.
- `docs/architecture/acceptance-matrix.md`: evidence required for design, phase, milestone, security, and mathematical-integrity acceptance.
- `docs/architecture/risk-register.md`: risk register for Pi API drift, TriviumDB native dependency, MathProve overclaiming, unsafe shell execution, paper overclaiming, workstream graph pollution, and context overflow.
- `docs/architecture/agent-operating-model.md`: subagent roles, write scopes, output contracts, and conflict rules.
- `docs/progress/design-handoff.md`: current state and next action for future sessions.
- `docs/superpowers/plans/2026-05-25-full-design-documentation.md`: implementation plan for completing the design documentation goal.

### Validation Commands

Design documentation validation completed on 2026-05-25:

```text
corepack pnpm build
Result: exit 0; @comath/comathd tsc build completed.

corepack pnpm typecheck
Result: exit 0; @comath/comathd tsc --noEmit completed.

corepack pnpm test
Result: exit 0; Phase 0/design smoke check passed for 25 required entries and 15 invariants; comathd Phase 0 smoke test passed.
```

The first sandboxed validation attempt failed because pnpm tried to `lstat C:\Users\derst`; the same commands passed after using the approved `corepack pnpm` execution path.

### Required Follow-Up

Phase 1 should still be treated as a separate implementation goal. Do not infer from complete design docs that contracts or schemas are already implemented.

## Concurrency Policy Update

The user explicitly allowed high concurrency: `rpm=1000`, reasoning effort `high`.

Superseded on 2026-05-27: the active GA goal uses global `rpm=4` with reasoning effort `high`. Current coordination docs (`AGENTS.md`, `CODEX_GOAL_RUNBOOK.md`, `docs/architecture/agent-operating-model.md`, `docs/architecture/risk-register.md`, and `docs/progress/design-handoff.md`) now treat `rpm=4` as authoritative for Phase 18 and later work.

This has been written into:

- `CODEX_GOAL_RUNBOOK.md`
- `docs/architecture/agent-operating-model.md`
- `docs/architecture/risk-register.md`
- `docs/progress/design-handoff.md`

Operational interpretation: use high fan-out for read-only reviews and disjoint write scopes; do not let subagents edit the same public schema, route, path policy, claim gate, migration, GraphPatch apply contract, or root package file.

## Phase 1 Review Log

### Scope

Implemented contracts, IDs, schemas, statement normalization/hash, JSON schema files, and GraphPatch non-promotion constraints. No service routes, memory adapters, claim gates, Pi runtime integration, or MathProve bridge were implemented.

### Validation Commands

Phase 1 validation completed on 2026-05-25 and rerun after integrity hardening:

```text
corepack pnpm --filter @comath/comathd test
Result: exit 0; comathd Phase 0 smoke test passed; Phase 1 contract/schema tests passed.

corepack pnpm build
Result: exit 0; @comath/comathd tsc build completed.

corepack pnpm typecheck
Result: exit 0; @comath/comathd tsc --noEmit completed.

corepack pnpm test
Result: exit 0; Phase 0/design smoke check passed; comathd Phase 0 smoke test passed; Phase 1 contract/schema tests passed.
```

### Changed Files

- Added TypeScript/Zod contracts in `services/comathd/src/types/`.
- Added ID and statement hash utilities in `services/comathd/src/utils/`.
- Added StableIdMap placeholder type in `services/comathd/src/db/stable-id-map.ts`.
- Added root JSON schema files under `schemas/`.
- Added Phase 1 contract/schema tests.
- Hardened `claimSchema` and `graphPatchSchema` so GraphPatch cannot directly mutate protected claim promotion fields and privileged claim statuses require gate metadata.

### Remaining Risk

JSON schema files are currently manually aligned with Zod schemas. A later phase should add schema generation or a drift check before treating them as generated artifacts.

Phase 4 must still implement service-level promotion transitions. Schema-level checks are necessary but not sufficient as the only enforcement layer.

## Subagent Reports Incorporated

Read-only reports received and incorporated into boundary planning:

- security-auditor: Phase 2-4 path policy, artifact import, runner envelope, gate, `.comath/` ownership, and TriviumDB native-risk requirements were written into `SECURITY_REVIEW.md`.
- math-integrity-auditor: GraphPatch and privileged claim status hardening were implemented and written into `MATH_INTEGRITY_REVIEW.md`.
- service-engineer/repo-architect: Phase 2 implementation checklist will guide path-policy, runtime, project lifecycle, and server-route work.
- memory-db-engineer: Phase 5 will use `ResearchMemoryDB`, in-memory first, TriviumDB unavailable shim until Phase 13, and route edits remain out of memory engineer scope.
- pi-extension-engineer: Phase 6 will keep Pi extensions as a thin client over `comathd` and will not write `.comath/` or mutate claim status directly.

## Phase 2 Review Log

### Scope

Implemented `comathd` foundation and path policy only. Added semantic path-policy checks, runtime tree creation, idempotent project initialization, project open/status, config loading with `allowShell=false`, a no-op logger, and a Node built-in HTTP/JSON server with injectable route tests.

No artifact import, audit JSONL, claim registry, gate, memory backend, Pi runtime integration, MathProve bridge, compute runner, paper export, or snapshot/replay implementation was added.

### Validation Commands

Phase 2 validation completed on 2026-05-25:

```text
corepack pnpm --filter @comath/comathd test
Result: exit 0; Phase 0 smoke, Phase 1 contract/schema, Phase 2 path policy, Phase 2 project runtime, and Phase 2 service route tests passed.

corepack pnpm build
Result: exit 0; @comath/comathd tsc build completed.

corepack pnpm typecheck
Result: exit 0; @comath/comathd tsc --noEmit completed.

corepack pnpm test
Result: exit 0; root Phase 0/design smoke passed; comathd Phase 0/1/2 tests passed.
```

Additional check:

```text
Repository root .comath check
Result: NO_ROOT_COMATH
```

### Changed Files

- Added `services/comathd/src/security/path-policy.ts`.
- Added `services/comathd/src/project/runtime-layout.ts`.
- Added `services/comathd/src/project/project-store.ts`.
- Added `services/comathd/src/config/config.ts`.
- Added `services/comathd/src/api/server.ts`.
- Added `services/comathd/src/errors.ts` and `services/comathd/src/logger.ts`.
- Exported Phase 2 APIs from `services/comathd/src/index.ts`.
- Added Phase 2 path-policy, project-runtime, and service-route tests.

### Residual Risks

Phase 2 path policy is conservative and denies suspicious path forms, but Phase 3 artifact import must still treat external files as untrusted and copy by content hash. Symlink escape checks are covered when `resolveRealpath=true` and the target exists; future write paths should keep using runtime-write policy plus realpath checks where applicable.

## Phase 3 Planning Input

Read-only artifact/paper audit recommends Phase 3 remain limited to content-addressed artifact store plus append-only audit writer. Paper export, margin provenance, full snapshot/replay, restore, and secret-clean replay semantics remain deferred to Phases 12 and 16.

## Phase 3 Review Log

### Scope

Implemented artifact and audit kernel only. Added file hashing, content-addressed artifact import, artifact metadata JSONL, append-only audit JSONL, secret scan stub, and snapshot manifest stub.

No paper export, BibTeX integration, claim registry, promotion gate, memory backend, MathProve bridge, compute runner, full snapshot/replay, restore, or Pi runtime extension was implemented.

### Validation Commands

Phase 3 validation completed on 2026-05-25:

```text
corepack pnpm --filter @comath/comathd test
Result: exit 0; Phase 0/1/2 tests and Phase 3 artifact/audit tests passed.

corepack pnpm build
Result: exit 0; @comath/comathd tsc build completed.

corepack pnpm typecheck
Result: exit 0; @comath/comathd tsc --noEmit completed.

corepack pnpm test
Result: exit 0; root Phase 0/design smoke passed; comathd Phase 0/1/2/3 tests passed.
```

Additional check:

```text
Repository root .comath check
Result: NO_ROOT_COMATH
```

### Changed Files

- Added `services/comathd/src/artifacts/hash.ts`.
- Added `services/comathd/src/artifacts/store.ts`.
- Added `services/comathd/src/artifacts/snapshot-manifest.ts`.
- Added `services/comathd/src/audit/jsonl-writer.ts`.
- Added `services/comathd/src/security/secret-scan.ts`.
- Exported Phase 3 APIs from `services/comathd/src/index.ts`.
- Added `services/comathd/tests/unit/phase3-artifacts-audit.test.mjs`.
- Added `audit/` to runtime layout documentation and runtime directory list.

### Residual Risks

The secret scan is intentionally a stub and must become a real gate before snapshot/replay export. The snapshot manifest is a stub and explicitly cannot restore or replay. Artifact import uses content-addressed paths and sanitized audit payloads, but future Phase 11/12 literature and paper systems must still validate citations and overclaim wording.

## Phase 4 Review Log

### Scope

Implemented claim registry and fail-closed promotion gate. Added claim JSONL persistence, claim link JSONL, markdown rendering, gate result JSONL, direct status escalation rejection, fail-closed promotion decisions, and minimal claim HTTP routes.

No memory backend, GraphPatch apply lifecycle, MathProve bridge execution, compute runner, Pi extension runtime, paper export, or full snapshot/replay implementation was added.

### Validation Commands

Phase 4 validation completed on 2026-05-25:

```text
corepack pnpm --filter @comath/comathd test
Result: exit 0; Phase 0/1/2/3 tests and Phase 4 claim/gate tests passed.

corepack pnpm build
Result: exit 0; @comath/comathd tsc build completed.

corepack pnpm typecheck
Result: exit 0; @comath/comathd tsc --noEmit completed.

corepack pnpm test
Result: exit 0; root Phase 0/design smoke passed; comathd Phase 0/1/2/3/4 tests passed.
```

Additional check:

```text
Repository root .comath check
Result: NO_ROOT_COMATH
```

### Changed Files

- Added `services/comathd/src/claim/claim-store.ts`.
- Added `services/comathd/src/claim/markdown.ts`.
- Added `services/comathd/src/verification/gate.ts`.
- Added claim route handling in `services/comathd/src/api/server.ts`.
- Exported Phase 4 APIs from `services/comathd/src/index.ts`.
- Added `services/comathd/tests/unit/phase4-claim-gate.test.mjs`.

### Residual Risks

The Phase 4 gate is deliberately fail-closed and minimal. It records vetoes and blocks direct escalation, but later phases must wire real literature/computation/symbolic/Lean evidence producers. `formally_checked` remains impossible without kernel/audit/dependency/proof artifact metadata, and future MathProve integration must remain an evidence producer rather than a status authority.

## Phase 5 Review Log

### Scope

Implemented memory adapter and StableIdMap. Added `ResearchMemoryDB`, deterministic in-memory node/edge/search/context backend, GraphPatch begin/apply lifecycle, in-memory StableIdMap conflict checks, TriviumDB unavailable shim, and a static native-import guard.

No real TriviumDB native dependency, route integration, Pi runtime code, workstream scheduler, MathProve bridge, compute runner, paper export, or full snapshot/replay implementation was added.

### Validation Commands

Phase 5 validation completed on 2026-05-25:

```text
corepack pnpm --filter @comath/comathd test
Result: exit 0; Phase 0/1/2/3/4 tests and Phase 5 memory DB tests passed.

corepack pnpm build
Result: exit 0; @comath/comathd tsc build completed.

corepack pnpm typecheck
Result: exit 0; @comath/comathd tsc --noEmit completed.

corepack pnpm test
Result: exit 0; root Phase 0/design smoke passed; comathd Phase 0/1/2/3/4/5 tests passed.
```

Additional check:

```text
Repository root .comath check
Result: NO_ROOT_COMATH
```

### Changed Files

- Replaced `services/comathd/src/db/stable-id-map.ts` placeholder with `StableIdMap` interface and in-memory implementation.
- Added `services/comathd/src/memory/research-memory-db.ts`.
- Added `services/comathd/src/memory/in-memory-research-memory-db.ts`.
- Added `services/comathd/src/memory/trivium-shim.ts`.
- Added `services/comathd/src/memory/index.ts`.
- Exported Phase 5 APIs from `services/comathd/src/index.ts`.
- Added `services/comathd/tests/unit/phase5-memory-db.test.mjs`.

### Residual Risks

The memory backend is intentionally in-memory and deterministic. It is suitable for Research Alpha tests, not persistence. TriviumDB remains unavailable before Phase 13 and is not imported directly. Route-level memory APIs are intentionally deferred so service-engineer route ownership stays serialized.

## Dependency Repair Log

### Scope

Repaired workspace package-manager drift found after Phase 6. The root package is pinned to `pnpm@11.3.0`, but nested scripts and a bare user-level `pnpm` had recreated `node_modules` with pnpm v10 store links.

### Fixes

- Root, `@comath/comathd`, and `@comath/pi-extension` scripts now call `corepack pnpm` instead of bare `pnpm`.
- `@comath/comathd` pins `zod` exactly to `4.1.12` because `zod@4.4.3` lacked `zod/v4/core/json-schema.js` in the installed ESM file surface.
- `corepack pnpm install --force --store-dir ".pnpm-store"` rebuilt the workspace under the project-local pnpm v11 store.
- `corepack pnpm list zod --depth 0 --filter @comath/comathd` reported `zod@4.1.12`.

### Validation Commands

Dependency repair validation completed on 2026-05-25:

```text
corepack pnpm build
Result: exit 0; comathd and Pi extension TypeScript builds completed.

corepack pnpm typecheck
Result: exit 0; comathd and Pi extension no-emit checks completed.

corepack pnpm test
Result: exit 0; root smoke, comathd Phase 0-5 tests, and Phase 6 extension tests passed.
```

### Residual Risks

Do not use bare `pnpm` in this repository. Continue to use `corepack pnpm ...` so package-manager major version and store layout remain stable.

## Phase 6 Review Log

### Scope

Implemented Pi extension layer as a thin client and metadata surface. Added command parsing, comathd HTTP/JSON client, tool descriptors, permission confirmation stubs, resource discovery, text dashboard fallback, and static boundary tests.

No Pi runtime registration, direct `.comath/` writes, TriviumDB access, service-internal imports, or claim-status mutation bypass was implemented.

### Validation Commands

Phase 6 validation completed on 2026-05-25:

```text
corepack pnpm --filter @comath/pi-extension test
Result: exit 0; Phase 6 extension tests passed.

corepack pnpm build
Result: exit 0; comathd and Pi extension TypeScript builds completed.

corepack pnpm typecheck
Result: exit 0; comathd and Pi extension no-emit checks completed.

corepack pnpm test
Result: exit 0; root smoke, comathd Phase 0-5 tests, and Phase 6 extension tests passed.
```

### Changed Files

- Added `extensions/comath-pi/src/index.ts`.
- Added `extensions/comath-pi/tests/phase6-extension.test.mjs`.
- Added `extensions/comath-pi/package.json` and TypeScript config.
- Updated workspace package scripts to use Corepack-pinned pnpm.

### Residual Risks

Installed Pi runtime API assumptions still need revalidation before production registration. Domain packs are still only resource metadata and become a first-class Phase 8/14 concern.

## Phase 7 Review Log

### Scope

Implemented workstreams and GraphPatch lifecycle as a service-owned file/runtime layer. Workstreams create `WS-XXXX` directories containing `spec.yaml`, `status.json`, `report.md`, and `graph_patch.json`. GraphPatch review requires `proposed -> under_review -> accepted`; accepted patches still do not mutate trusted graph until explicit apply.

No MathProve bridge, compute runner, literature system, paper export, real TriviumDB adapter, or production dashboard was implemented.

### Validation Commands

Phase 7 validation completed on 2026-05-25:

```text
corepack pnpm --filter @comath/comathd test
Result: exit 0; Phase 0-5 tests, Phase 7 workstream/GraphPatch tests, and Phase 7 route tests passed.

corepack pnpm build
Result: exit 0; comathd and Pi extension TypeScript builds completed.

corepack pnpm typecheck
Result: exit 0; comathd and Pi extension no-emit checks completed.

corepack pnpm test
Result: exit 0; root smoke, Phase 6 extension tests, and comathd Phase 0-7 tests passed.
```

### Changed Files

- Added `services/comathd/src/workstream/workstream-store.ts`.
- Added `services/comathd/src/workstream/index.ts`.
- Added `services/comathd/src/memory/builder.ts`.
- Added `services/comathd/src/memory/graph-patch.ts`.
- Added Phase 7 routes in `services/comathd/src/api/server.ts`.
- Updated `services/comathd/src/errors.ts` so schema validation errors return `400 VALIDATION_ERROR`.
- Added `services/comathd/tests/unit/phase7-workstream-graphpatch.test.mjs`.
- Added `services/comathd/tests/integration/phase7-workstream-routes.test.mjs`.

### Residual Risks

The route-level memory DB is still in-memory and process-local. That is acceptable before Phase 13 but not durable. GraphPatch `updated_nodes` remains rejected at schema/policy level for protected claim fields, and claim status promotion must continue to use `/claim/promote`.

## Phase 8 Review Log

### Scope

Implemented Codex/Pi subagent scaffolding. Added static `.pi` agent definitions and prompts, Pi extension subagent registry helpers, assignment validation for own-workstream writes, first-class domain-pack and subagent resource discovery, and workstream model documentation.

No real Pi subagent runtime, MathProve bridge, compute runner, literature system, paper export, real TriviumDB adapter, or production dashboard was implemented.

### Validation Commands

Phase 8 validation completed on 2026-05-25:

```text
corepack pnpm --filter @comath/pi-extension test
Result: exit 0; Phase 6 extension tests and Phase 8 subagent scaffold tests passed.

corepack pnpm build
Result: exit 0; comathd and Pi extension TypeScript builds completed.

corepack pnpm typecheck
Result: exit 0; comathd and Pi extension no-emit checks completed.

corepack pnpm test
Result: exit 0; root smoke, Phase 6/8 extension tests, and comathd Phase 0-7 tests passed.
```

### Changed Files

- Added `.pi/agents/*.md` role definitions.
- Added `.pi/prompts/*.md` workflow prompts.
- Added `extensions/comath-pi/src/subagents.ts`.
- Updated `extensions/comath-pi/src/index.ts` for subagent registry and resource discovery.
- Added `extensions/comath-pi/tests/phase8-subagents.test.mjs`.
- Added `docs/workstream-model.md`.

### Residual Risks

Phase 8 is static scaffolding and assignment validation only. It does not launch real Pi subagents. Runtime creation of `.comath/workstreams` remains owned by `comathd`; `.pi` files only constrain future orchestration behavior.

## Phase 9 Review Log

### Scope

Implemented the MathProve bridge mock as a fail-closed evidence producer and gate input. Added a Python CLI mock for `plan`, `route`, and `final_audit`, a TypeScript adapter that validates bridge output, archives bridge reports under service-owned evidence paths, imports the report through the artifact store as `runner_output`, registers audit evidence, and feeds bridge vetoes into the existing claim promotion gate.

No real MathProve proof execution, Lean kernel invocation, compute runner, paper export, real TriviumDB adapter, production dashboard, or snapshot/replay implementation was added.

### Validation Commands

Phase 9 target validation completed on 2026-05-25:

```text
corepack pnpm --filter @comath/comathd build; if ($LASTEXITCODE -eq 0) { node services/comathd/tests/unit/phase9-mathprove-bridge.test.mjs }
Result: exit 0; TypeScript build completed and Phase 9 MathProve bridge tests passed.
```

Full Phase 9 boundary validation completed on 2026-05-25:

```text
corepack pnpm --filter @comath/comathd test
Result: exit 0; Phase 0/1/2/3/4/5/7/9 comathd tests passed.

corepack pnpm build
Result: exit 0; comathd and Pi extension TypeScript builds completed.

corepack pnpm typecheck
Result: exit 0; comathd and Pi extension no-emit checks completed.

corepack pnpm test
Result: exit 0; root smoke, Phase 6/8 extension tests, and comathd Phase 0/1/2/3/4/5/7/9 tests passed.

Repository root .comath check
Result: false; no repository-root .comath directory exists.
```

### Changed Files

- Added `python/mathprove_bridge.py`.
- Added `services/comathd/src/verification/mathprove.ts`.
- Updated `services/comathd/src/verification/gate.ts` to consume external vetoes/warnings.
- Exported the bridge adapter from `services/comathd/src/index.ts`.
- Added `services/comathd/tests/unit/phase9-mathprove-bridge.test.mjs`.
- Added the Phase 9 test to `services/comathd/package.json`.
- Updated `TODO.md`, `AGENTS.md`, and `docs/progress/design-handoff.md`.

### Residual Risks

Phase 9 intentionally proves the bridge boundary, not mathematical correctness. The mock always fails closed. `formally_checked` still requires future durable kernel-checked proof artifacts, dependency-closure audit, and claim-level formal audit; `symbolically_checked` still cannot come from float-only computation; `literature_supported` still requires exact citation artifacts and condition matching in later phases. MathProve remains an evidence producer and veto source, never a claim status authority.

## Phase 10 Review Log

### Scope

Implemented bounded compute runners as artifact/evidence/audit producers. Added a fixed runner registry with no user-supplied command execution surface, shared evidence JSONL store, exact SymPy runner, deterministic counterexample search runner, Sage/SAT fail-closed placeholders, runner report archival, content-addressed artifact import, and runner audit events.

No literature system, paper export, real TriviumDB adapter, production dashboard, snapshot/replay implementation, or direct claim status mutation from runner output was added.

### Validation Commands

Phase 10 target validation completed on 2026-05-25:

```text
corepack pnpm --filter @comath/comathd build; if ($LASTEXITCODE -eq 0) { node services/comathd/tests/unit/phase10-compute-runners.test.mjs }
Result: exit 0; TypeScript build completed and Phase 10 compute runner tests passed.
```

Full Phase 10 boundary validation completed on 2026-05-25:

```text
corepack pnpm --filter @comath/comathd test
Result: exit 0; Phase 0/1/2/3/4/5/7/9/10 comathd tests passed.

corepack pnpm build
Result: exit 0; comathd and Pi extension TypeScript builds completed.

corepack pnpm typecheck
Result: exit 0; comathd and Pi extension no-emit checks completed.

corepack pnpm test
Result: exit 0; root smoke, Phase 6/8 extension tests, and comathd Phase 0/1/2/3/4/5/7/9/10 tests passed.

Repository root .comath check
Result: false; no repository-root .comath directory exists.
```

### Changed Files

- Added `python/exact_compute.py`.
- Added `python/counterexample_search.py`.
- Added `services/comathd/src/evidence/store.ts`.
- Added `services/comathd/src/verification/runner-contracts.ts`.
- Added `services/comathd/src/verification/sympy.ts`.
- Added `services/comathd/src/verification/sage.ts`.
- Added `services/comathd/src/verification/sat.ts`.
- Updated `services/comathd/src/verification/mathprove.ts` to use the shared evidence store.
- Exported evidence and runner APIs from `services/comathd/src/index.ts`.
- Added `services/comathd/tests/unit/phase10-compute-runners.test.mjs`.
- Added the Phase 10 test to `services/comathd/package.json`.
- Added Phase 10/13 boundary progress notes under `docs/progress/`.

### Residual Risks

The SymPy runner is intentionally exact and narrow; it rejects unsafe syntax and decimal/float contamination rather than attempting broad Python evaluation. Counterexample search is deterministic numeric/search evidence and carries a `numeric_search_not_symbolic` veto. Sage and SAT are structured placeholders that fail closed. Future phases must add richer runner coverage, replay manifests, dependency fingerprints, and snapshot/replay integration before treating computation as replay-complete.

## Phase 11 Review Log

### Scope

Implemented the literature system as an auditable evidence producer. Added BibTeX parsing, BibTeX/PDF artifact import, citation records with locator and artifact linkage, conservative citation-condition matching, literature evidence registration, audit events, literature HTTP routes, and adapter interface descriptors for arXiv/OpenAlex/Semantic Scholar/Zotero.

No working paper generation, real network literature adapters, real TriviumDB adapter, production dashboard, or snapshot/replay implementation was added.

### Validation Commands

Phase 11 target validation completed on 2026-05-25:

```text
corepack pnpm --filter @comath/comathd build
Result: exit 0; TypeScript build completed.

node services/comathd/tests/unit/phase11-literature.test.mjs
Result: exit 0; Phase 11 literature system tests passed.

corepack pnpm --filter @comath/comathd test
Result: exit 0; Phase 0/1/2/3/4/5/7/9/10/11 comathd tests passed.
```

### Changed Files

- Added `services/comathd/src/literature/store.ts`.
- Added `services/comathd/src/literature/index.ts`.
- Added `python/citation_check.py`.
- Added `services/comathd/tests/unit/phase11-literature.test.mjs`.
- Exported literature APIs from `services/comathd/src/index.ts`.
- Added literature routes in `services/comathd/src/api/server.ts`.
- Updated `services/comathd/src/verification/gate.ts` so `literature_supported` requires a successful citation-condition match.
- Added the Phase 11 test to `services/comathd/package.json`.
- Updated `TODO.md`, `AGENTS.md`, and `docs/progress/design-handoff.md`.

### Boundary And Integrity Notes

`literature_supported` now fails closed unless the promotion request references evidence and artifacts produced by a successful condition match for the same project and claim. LLM memory, summaries, and agent reports are rejected as citation evidence. Citation existence alone is insufficient. Malformed or hand-written citation-condition JSONL rows are not trusted as evidence.

### Residual Risks

Condition matching is conservative string normalization, not semantic theorem matching. Network literature adapters are interface descriptors only. Phase 12 must consume the literature evidence without upgrading paper wording beyond claim status and must preserve blockers in margin provenance.

## Phase 12 Review Log

### Scope

Implemented the working paper as live, auditable project state. Added synchronized Markdown, TeX, BibTeX, manifest, sections, and margin-note files under service-owned `.comath/artifacts/papers`; claim block rendering with margin provenance; paper checks for overclaiming and stale provenance; content-addressed paper export; HTTP routes; and Pi extension paper tool descriptors.

No claim status promotion, gate mutation, real TriviumDB adapter, production dashboard, full snapshot/replay, or production Pi runtime registration was implemented.

### Validation Commands

Phase 12 target validation completed on 2026-05-25:

```text
corepack pnpm --filter @comath/pi-extension test
Result: exit 0; Phase 6 extension tests, Phase 8 subagent scaffold tests, and Phase 12 Pi extension paper tool tests passed.

corepack pnpm --filter @comath/comathd test
Result: exit 0; Phase 0/1/2/3/4/5/7/9/10/11/12 comathd tests passed.

corepack pnpm --filter @comath/comathd typecheck
Result: exit 0; comathd no-emit check completed.

corepack pnpm --filter @comath/pi-extension typecheck
Result: exit 0; Pi extension no-emit check completed.
```

### Changed Files

- Added `services/comathd/src/artifacts/bibtex.ts`.
- Added `services/comathd/src/artifacts/paper.ts`.
- Added `services/comathd/tests/unit/phase12-working-paper.test.mjs`.
- Added paper routes in `services/comathd/src/api/server.ts`.
- Exported paper APIs from `services/comathd/src/index.ts`.
- Added `/cm:paper` parsing and paper tool descriptors in `extensions/comath-pi/src/index.ts`.
- Added `extensions/comath-pi/tests/phase12-paper-tools.test.mjs`.
- Added the Phase 12 tests to the comathd and Pi extension package scripts.
- Updated `TODO.md`, `AGENTS.md`, and `docs/progress/design-handoff.md`.

### Boundary And Integrity Notes

Paper generation and export are not proof authority. The working paper preserves claim IDs, statement hashes, evidence IDs, workstreams, warnings, and blockers, then fails closed on theorem-like overclaiming, missing margin provenance, hidden blockers, stale claim statements, missing evidence, invalid margin-note files, and missing citation-condition support for `literature_supported` claims.

Pi extension paper tools are metadata/thin-client descriptors only. They do not import service internals or write `.comath/`; mutating tools require confirmation. `comath.paper.check` is explicitly read-only and cannot promote claims.

### Residual Risks

The TeX renderer is intentionally conservative escaping and is not a full LaTeX authoring engine. The paper system verifies provenance and overclaim boundaries, not mathematical truth. A future dashboard can render margin provenance more ergonomically, but must preserve the fail-closed paper checks as the authority. Phase 13 must keep TriviumDB native loading optional so this working paper path continues to run without native dependencies.

## Phase 13 Review Log

### Scope

Implemented TriviumDB as an optional native backend behind `ResearchMemoryDB`. Added capability probing, fallback policy, a `TriviumResearchMemoryDB` adapter, a memory DB factory, default-safe tests, and optional native test gating.

No ordinary dependency on `triviumdb`, eager native import, service-route default switch, production dashboard, snapshot/replay, or claim promotion behavior was added.

### External Package Check

The npm registry metadata checked on 2026-05-25 reported:

```text
triviumdb version: 0.7.1
description: AI-native embedded database: Vector + Graph + Relational in one file
main: index.js
types: triviumdb.d.ts
```

This metadata was used only to shape the optional capability boundary. The package was not installed into the workspace dependency graph.

### Validation Commands

Phase 13 target validation completed on 2026-05-25:

```text
corepack pnpm --filter @comath/comathd build
Result: exit 0; TypeScript build completed.

node tests/unit/phase13-trivium-capability.test.mjs
Result: exit 0; Phase 13 TriviumDB capability tests passed.

corepack pnpm --filter @comath/comathd test
Result: exit 0; Phase 0/1/2/3/4/5/7/9/10/11/12/13 comathd tests passed.

corepack pnpm --filter @comath/comathd test:trivium
Result: exit 0; optional native TriviumDB tests skipped because COMATH_ENABLE_TRIVIUM_TESTS was not set.
```

### Changed Files

- Added `services/comathd/src/memory/trivium-capability.ts`.
- Added `services/comathd/src/memory/trivium-db.ts`.
- Added `services/comathd/tests/unit/phase13-trivium-capability.test.mjs`.
- Added `services/comathd/tests/optional/phase13-trivium-db.test.mjs`.
- Updated `services/comathd/src/memory/research-memory-db.ts` to accept the `trivium` backend selector.
- Exported Phase 13 memory APIs from `services/comathd/src/memory/index.ts`.
- Updated `services/comathd/tests/unit/phase5-memory-db.test.mjs` so it forbids top-level/static native imports while allowing Phase 13 function-scoped dynamic import inside adapter boundaries.
- Updated `services/comathd/package.json` with the Phase 13 default test and `test:trivium` script.
- Updated `TODO.md`, `AGENTS.md`, and `docs/progress/design-handoff.md`.

### Boundary And Integrity Notes

`probeTriviumCapability()` returns diagnostics instead of throwing in default paths. `createResearchMemoryDB()` defaults to in-memory, falls back to in-memory with warnings when TriviumDB is requested but unavailable, and throws only when native TriviumDB is explicitly required. `triviumdb` is not an ordinary dependency and is not imported at module top level.

`TriviumResearchMemoryDB` preserves stable string IDs at the `ResearchMemoryDB` boundary. Native numeric IDs are assigned and looked up through `StableIdMap`; `MemoryNode.id`, `MemoryEdge.source_id`, `MemoryEdge.target_id`, and `GraphPatch.patch_id` remain stable business strings. GraphPatch schema protections still block direct privileged claim status injection.

### Residual Risks

The adapter can run its public semantics without the native package, and optional native coverage is gated. Real native persistence/search behavior still requires running `COMATH_ENABLE_TRIVIUM_TESTS=1 corepack pnpm --filter @comath/comathd test:trivium` on a machine with `triviumdb` installed or otherwise resolvable. The default service routes still use in-memory DB; switching runtime backend should remain explicit and audited.

## Phase 14 Review Log

### Scope

Implemented the braid statistics and parastatistics domain pack as pure domain scaffolding. Added a typed ontology, computation protocol descriptors, benchmark claim templates, Lean formalization map, literature prompts, a reviewable GraphPatch proposal builder, Python exact/combinatorial checks, and domain skill/prompt documentation.

No HTTP route, claim promotion path, gate mutation, GraphPatch apply bypass, real Lean proof, production dashboard, or snapshot/replay feature was added.

### Validation Commands

Phase 14 target validation completed on 2026-05-25:

```text
corepack pnpm --filter @comath/comathd build
Result: exit 0; TypeScript build completed.

node tests/unit/phase14-braid-domain-pack.test.mjs
Result: exit 0; Phase 14 braid statistics domain pack tests passed.

corepack pnpm --filter @comath/comathd test
Result: exit 0; Phase 0/1/2/3/4/5/7/9/10/11/12/13/14 comathd tests passed.

corepack pnpm --filter @comath/comathd typecheck
Result: exit 0; comathd no-emit check completed.
```

### Changed Files

- Added `services/comathd/src/domain/braid-statistics/index.ts`.
- Added `services/comathd/tests/unit/phase14-braid-domain-pack.test.mjs`.
- Added `python/braid/check_braid.py`.
- Added `skills/braid-statistics/SKILL.md`.
- Added `prompts/domain-braid-statistics.md`.
- Exported the domain pack from `services/comathd/src/index.ts`.
- Added the Phase 14 test to `services/comathd/package.json`.
- Updated `TODO.md`, `AGENTS.md`, and `docs/progress/design-handoff.md`.

### Boundary And Integrity Notes

The domain pack is an evidence/task/proposal producer only. It preserves assumptions, blockers, risk flags, notation conventions, category level, q/root-of-unity status, semisimplicity assumptions, and physical-interpretation boundaries. Benchmark claims are `conjectural` only and cannot preload privileged claim states. GraphPatch proposals remain `proposed` and carry apply preconditions requiring review.

The Python braid script rejects float-contaminated YBE inputs and reports exact/combinatorial or exact/symbolic checks as computational evidence only. It explicitly carries a `not_symbolic_proof` veto so runner results cannot be mistaken for proof authority.

### Residual Risks

The braid relation checker is intentionally small and combinatorial. The YBE script currently checks exactness/shape boundary rather than full matrix tensor equality. Lean map entries are skeleton/translation targets, not kernel-checked proofs. Future work can deepen the domain pack, but must keep the claim gate, literature condition matching, and paper overclaim checks authoritative.

## Phase 15 Review Log

### Scope

Implemented the Pi extension TUI dashboard as a read-only presentation layer. Added extension-local dashboard state types, a `comathd` client aggregator that calls read routes only, pure text and TUI renderers, blocker summarization, degraded read-model flags, and a review-queue helper.

No service-internal import, `.comath/` direct read/write, claim promotion, state repair, persistent dashboard snapshot, replay file, or Phase 16 snapshot/replay implementation was added.

### Validation Commands

Phase 15 target validation completed on 2026-05-25:

```text
corepack pnpm --filter @comath/pi-extension test
Result: exit 0; Phase 6 extension tests, Phase 8 subagent scaffold tests, Phase 12 paper tool tests, and Phase 15 dashboard tests passed.
```

Full Phase 15 boundary validation completed on 2026-05-25:

```text
corepack pnpm build
Result: exit 0; comathd and Pi extension TypeScript builds completed.

corepack pnpm typecheck
Result: exit 0; comathd and Pi extension no-emit checks completed.

corepack pnpm test
Result: exit 0; root smoke, Phase 6/8/12/15 extension tests, and comathd Phase 0/1/2/3/4/5/7/9/10/11/12/13/14 tests passed.

Repository root .comath check
Result: false; no repository-root .comath directory exists.
```

### Changed Files

- Added `extensions/comath-pi/src/widgets.ts`.
- Added `extensions/comath-pi/src/renderers.ts`.
- Added `extensions/comath-pi/src/tools/review.ts`.
- Updated `extensions/comath-pi/src/index.ts` to export dashboard widgets, renderers, and review helpers.
- Added `extensions/comath-pi/tests/phase15-dashboard.test.mjs`.
- Updated `extensions/comath-pi/package.json` with the Phase 15 dashboard test.
- Updated `TODO.md` and `AGENTS.md`.

### Boundary And Integrity Notes

Dashboard aggregation uses the Pi extension client boundary and calls only `/project/status`, `/workstream/list`, `/paper/state`, and `/paper/check`. Since the service does not yet expose claim, evidence, or gate-result list APIs, the dashboard derives a conservative read model from paper margin provenance and reports `claim_list_unavailable`, `evidence_list_unavailable`, and `gate_result_list_unavailable` as degraded limitations rather than bypassing service ownership.

Renderers are pure presentation functions. Blockers include paper vetoes, margin-note blockers, blocked workstreams, and degraded read-model limitations. The dashboard cannot repair state, apply GraphPatch, promote claims, or export snapshots.

### Residual Risks

The dashboard currently has a text/TUI data model rather than a bound production Pi UI runtime. Claim/evidence boards are conservative because dedicated list routes do not yet exist. Phase 16 must keep persistent snapshots service-owned and must not reuse dashboard snapshots as integrity artifacts.

## Phase 16 Review Log

### Scope

Implemented service-owned snapshot and replay infrastructure. Added a real secret scanner, canonical snapshot export, snapshot verification, restore smoke support, replay manifest extraction from runner reports, stale-runner detection, and negative tamper tests.

The Phase 3 `createSnapshotManifestStub()` and `scanForSecretsStub()` remain exported for compatibility, but Phase 16 code uses `exportSnapshot()`, `verifySnapshot()`, `restoreSnapshot()`, `createReplayManifest()`, and `scanForSecrets()`.

### Validation Commands

Phase 16 target validation completed on 2026-05-25:

```text
corepack pnpm --filter @comath/comathd build
Result: exit 0; TypeScript build completed.

node tests/unit/phase16-snapshot-replay.test.mjs
Result: exit 0; Phase 16 snapshot/replay tests passed.

corepack pnpm --filter @comath/comathd test
Result: exit 0; Phase 0/1/2/3/4/5/7/9/10/11/12/13/14/16 comathd tests passed.
```

### Changed Files

- Added `services/comathd/src/artifacts/snapshots.ts`.
- Added `services/comathd/src/artifacts/replay.ts`.
- Updated `services/comathd/src/security/secret-scan.ts` with real Phase 16 scanning while preserving the Phase 3 stub.
- Added `comathd` snapshot export/verify/restore and replay-manifest verification routes.
- Added Pi extension `/cm:snapshot`, `/cm:replay`, snapshot/replay tool descriptors, and artifact descriptor resources.
- Wired artifact import to the real secret scan gate while keeping the Phase 3 stub exported for compatibility tests.
- Exported snapshot/replay APIs from `services/comathd/src/index.ts`.
- Added `services/comathd/tests/unit/phase16-snapshot-replay.test.mjs`.
- Added the Phase 16 test to `services/comathd/package.json`.
- Updated `TODO.md`, `AGENTS.md`, and `docs/progress/design-handoff.md`.

### Boundary And Integrity Notes

Snapshot export writes under `.comath/snapshots/SNAP-XXXX/` and excludes nested snapshots from capture. Manifest entries are sorted, relative, and copied into snapshot-local `files/` paths. Integrity covers entries, replay manifest, manifest material, artifact blobs, claims, evidence, audit logs, paper state, workstreams, and runner reports when present.

Replay manifests preserve runner IDs, versions, seed, timeout, input/script/output hashes, status, unreplayable reasons, environment, and dependency metadata. Host absolute script paths in `replay_argv` are scrubbed. Runner report verification recalculates `result_sha256` and flags stale runner output.

Verification fails closed on manifest-integrity tamper, entry hash mismatch, missing entries, path traversal, replay-manifest mismatch, secret hits, unreadable runner reports, and stale runner output. Restore verifies before copying into a separate target root and does not mutate the source snapshot.

### Residual Risks

Secret scanning is pattern-based and intentionally conservative; it is a fail-closed Research Alpha import/export gate, not a comprehensive DLP engine. Replay manifests record deterministic envelopes and stale-output checks, but they do not yet re-execute runner commands. The Phase 17 gaps around evidence/artifact binding, failed-runner promotion, and paper export on failed checks were closed in the Phase 17 remediation; remaining Research Beta risks are real runner re-execution and Lean/kernel proof checking.

## Post-Phase 17 Review Remediation

### Scope

Reviewed the Research Alpha implementation against the initial development plan and runbook with subagent assistance. Closed the remaining exposure/documentation gaps that made the system look narrower or less externally usable than the code intended.

### Findings Addressed

- Added `comathd` HTTP routes for snapshot export, snapshot verification, snapshot restore, and replay-manifest verification so Phase 16 is reachable through the service boundary rather than only library calls.
- Added Pi extension `/cm:snapshot` and `/cm:replay` command parsing, tool descriptors, mutability flags, and snapshot/replay artifact resources while preserving the no direct `.comath/` write rule.
- Replaced artifact import's non-blocking `scanForSecretsStub()` use with real `scanForSecrets()` fail-closed behavior and a durable `artifact.import_blocked` audit event.
- Updated extension READMEs, TODO, acceptance matrix, and audit wording to reflect Research Alpha reality without claiming production Pi runtime registration, native TriviumDB validation, full DLP, Lean proof checking, or runner re-execution replay.

### Validation Commands

Targeted remediation validation completed on 2026-05-25:

```text
corepack pnpm --filter @comath/comathd build
Result: exit 0; TypeScript build completed.

node tests/unit/phase3-artifacts-audit.test.mjs
Result: exit 0; Phase 3 artifact/audit tests passed, including secret import blocking.

node tests/unit/phase16-snapshot-replay.test.mjs
Result: exit 0; Phase 16 snapshot/replay tests passed, including service routes and route-level secret-scan blocking.

corepack pnpm --filter @comath/pi-extension build
Result: exit 0; TypeScript build completed.

node tests/phase6-extension.test.mjs
Result: exit 0; Phase 6 extension tests passed, including snapshot/replay command and descriptor registration.
```

### Current Verdict

At Phase 16, CoMath Pi Lab was a working Research Alpha local mathematical workbench prototype with service-mediated mutation, auditable artifacts, gates, paper provenance, snapshot verification, and Pi thin-client descriptors. It was not yet a production mathematical workbench or proof authority: Lean/MathProve kernel execution, production Pi runtime registration, native TriviumDB target validation, OS/network sandboxing, multi-process locks, and runner re-execution replay remained Research Beta work.

## Phase 17 Review Log

### Scope

Implemented the final Research Alpha evaluation and audit phase. Added a Phase 17 evaluation suite, retrieval benchmark fixture, gate evidence/artifact binding hardening, runner-report success checks for promotion, paper export fail-closed behavior, block-bound paper margin provenance, runner result-hash normalization, runner metadata path scrubbing, snapshot symlink/reparse traversal hardening, replay internal-hash verification, truncated-secret fail-closed scanning, security audit updates, mathematical-integrity audit updates, and a Research Alpha retrospective.

No real MathProve/Lean kernel execution, production Pi runtime registration, native TriviumDB requirement, or runner re-execution replay was added.

### Validation Commands

Phase 17 target validation completed on 2026-05-25:

```text
corepack pnpm --filter @comath/comathd build
Result: exit 0; TypeScript build completed.

node tests/evaluation/phase17-integrity-evaluation.test.mjs
Result: exit 0; Phase 17 integrity evaluation tests passed.

corepack pnpm --filter @comath/comathd test
Result: exit 0; Phase 0/1/2/3/4/5/7/9/10/11/12/13/14/16 comathd tests passed after Phase 17 hardening.
```

Final root validation completed on 2026-05-25 after final review and documentation remediation:

```text
corepack pnpm build
Result: exit 0; root recursive build passed for extensions/comath-pi and services/comathd.

corepack pnpm typecheck
Result: exit 0; root recursive typecheck passed for extensions/comath-pi and services/comathd.

corepack pnpm test
Result: exit 0; Phase 0 smoke, all workspace tests, and Phase 17 integrity evaluation passed.

Test-Path -LiteralPath 'D:\MATH _Studio\comath-pi-lab\.comath'
Result: False; no repository-root runtime state was left behind.
```
## Phase 42 AgentRun Observability Review Log

### Scope

Added a bounded runtime-inspection slice for live profile adapters. Phase 42 exposes capped AgentRun stdout/stderr reads and adapter health probes through `comathd` and Pi, without turning logs, adapter success, or health JSON into mathematical authority.

### TDD Evidence

```text
node services/comathd/tests/unit/phase42-agent-run-observability.test.mjs
Initial RED result: exit 1; `../../dist/index.js` did not export `probeAgentAdapterHealth`.

node extensions/comath-pi/tests/phase42-agent-observability-tools.test.mjs
Initial RED result: exit 1; `comath.agent.logs` was not registered.

corepack pnpm --filter @comath/comathd build
Result: exit 0; TypeScript build completed after service implementation.

corepack pnpm --filter @comath/pi-extension build
Result: exit 0; TypeScript build completed after Pi implementation.

node services/comathd/tests/unit/phase42-agent-run-observability.test.mjs
Result: exit 0; Phase 42 AgentRun observability tests passed.

node extensions/comath-pi/tests/phase42-agent-observability-tools.test.mjs
Result: exit 0; Phase 42 Pi agent observability tool tests passed.
```

### Changed Surfaces

- Added `services/comathd/src/agents/agent-run-observability.ts` with `readAgentRunLogs()` and `probeAgentAdapterHealth()`.
- Added `GET /agent/run/:id/logs` and `POST /agent/adapter/health` routes.
- Added Pi runtime tools `comath.agent.logs` and `comath.agent.health` plus `/cm:agent logs` and `/cm:agent health` command paths.
- Added `agent_run_observability` to service status and wired Phase 42 tests into default package test chains.
- Updated README, TODO, acceptance matrix, security, math-integrity, and handoff notes.

### Boundary And Integrity Notes

AgentRun logs are read only from scheduler-derived `.tmp/comath/<ARUN>/logs/stdout.log` and `stderr.log` paths after resolving the owning run. Health probes require an absolute existing program, run with `shell:false`, bounded timeout/output, minimal environment inheritance, and `COMATH_PROOF_AUTHORITY=none`. Pi health probes are treated as mutating because they execute a process and therefore require host confirmation.

Logs and health responses carry `proof_authority: none`. They cannot promote claims, apply GraphPatch, certify candidate correctness, or replace static audit and final Lean replay.

### Residual Risks

- Phase 42 is capped readback plus bounded health probes, not a streaming/subscription log UI.
- Production Codex CLI/API adapter packaging and richer interactive operator controls remain deferred.
- OS-level process sandboxing and network-denial enforcement remain deferred.
- Global GA remains blocked by the deferred items in `TODO.md`.

## Phase 43 Agent Adapter Package Registry Review Log

### Scope

Added a service-owned packaged adapter lifecycle for the first built-in `codex-cli` adapter. Phase 43 reduces the production adapter packaging blocker by replacing model/user-supplied arbitrary fixture paths with a comathd-resolved package registry, bundled launcher script, package prepare/execute routes, and Pi package commands.

### TDD Evidence

```text
node services/comathd/tests/unit/phase43-agent-adapter-package.test.mjs
Initial RED result: exit 1; `../../dist/index.js` did not export `buildAgentAdapterPackageLaunch`.

node extensions/comath-pi/tests/phase43-agent-adapter-package-tools.test.mjs
Initial RED result: exit 1; `comath.agent.adapterPackageList` was not registered.

corepack pnpm --filter @comath/comathd build
Result: exit 0; TypeScript build and bundled adapter copy completed after service implementation.

corepack pnpm --filter @comath/pi-extension build
Result: exit 0; TypeScript build completed after Pi implementation.

node services/comathd/tests/unit/phase43-agent-adapter-package.test.mjs
Result: exit 0; Phase 43 Agent adapter package tests passed.

node extensions/comath-pi/tests/phase43-agent-adapter-package-tools.test.mjs
Result: exit 0; Phase 43 Pi agent adapter package tool tests passed.
```

### Changed Surfaces

- Added `services/comathd/src/agents/agent-adapter-packages.ts`.
- Added bundled launcher `services/comathd/src/agents/adapters/codex-cli-adapter.mjs` and build-time copy script `services/comathd/scripts/copy-agent-adapters.mjs`.
- Added `GET /agent/adapter/package/list`, `POST /agent/adapter/package/prepare-launch`, and `POST /agent/adapter/package/execute`.
- Added Pi tools `comath.agent.adapterPackageList`, `comath.agent.prepareAdapterPackage`, and `comath.agent.executeAdapterPackage` plus `/cm:agent packages`, `/cm:agent prepare-package`, and `/cm:agent execute-package`.
- Added `agent_adapter_package_registry` to service status and wired Phase 43 tests into default package test chains.
- Updated README, TODO, acceptance matrix, security, math-integrity, and handoff notes.

### Boundary And Integrity Notes

The packaged adapter registry is service-owned. The current `codex-cli` package resolves to `process.execPath` plus a bundled launcher script copied into `dist`, applies package prefix args before the profile launch args, caps rpm at 4, and injects `COMATH_ADAPTER_PACKAGE_ID`, `COMATH_ADAPTER_PACKAGE_KIND`, and `COMATH_PROOF_AUTHORITY=none`. Pi package prepare/execute tools are mutating and require host confirmation.

The built-in launcher emits a structured AgentRun report but does not call an external Codex CLI/API backend yet. Package selection, health, and successful execution are runtime orchestration only; they cannot promote claims, apply GraphPatch, certify proof candidates, or replace final Lean replay.

### Residual Risks

- Real external Codex CLI/API invocation remains deferred behind the package contract.
- Streaming/subscription log UI and richer interactive operator controls remain deferred.
- OS-level process sandboxing and network-denial enforcement remain deferred.
- Global GA remains blocked by the deferred items in `TODO.md`.

### Final Phase 43 Validation

Fresh Phase 43 validation completed on 2026-05-28:

```text
corepack pnpm --filter @comath/comathd test
Result: exit 0; comathd Phase 0-43 package tests passed.

corepack pnpm --filter @comath/pi-extension test
Result: exit 0; Pi extension tests passed with Phase 43 wired into the default test chain.

corepack pnpm typecheck
Result: exit 0; root recursive no-emit typecheck passed.

corepack pnpm test
Result: exit 0; root smoke, workspace tests, Phase 43 tests, and Phase 17 integrity evaluation passed.

git diff --check
Result: exit 0; no whitespace errors. Git reported Windows LF-to-CRLF normalization warnings only.

Test-Path -LiteralPath 'D:\MATH _Studio\comath-pi-lab\.comath'
Result: False; no repository-root runtime state was left behind.
```
### Final Phase 42 Validation

Fresh Phase 42 validation completed on 2026-05-28:

```text
corepack pnpm --filter @comath/comathd test
Result: exit 0; comathd Phase 0-42 package tests passed.

corepack pnpm --filter @comath/pi-extension test
Result: exit 0; Pi extension tests passed with Phase 42 wired into the default test chain.

corepack pnpm typecheck
Result: exit 0; root recursive no-emit typecheck passed.

corepack pnpm test
Result: exit 0; root smoke, workspace tests, Phase 42 tests, and Phase 17 integrity evaluation passed.

git diff --check
Result: exit 0; no whitespace errors. Git reported Windows LF-to-CRLF normalization warnings only.

Test-Path -LiteralPath 'D:\MATH _Studio\comath-pi-lab\.comath'
Result: False; no repository-root runtime state was left behind.
```

### Changed Files

- Added `tests/evaluation/phase17-integrity-evaluation.test.mjs`.
- Added `tests/evaluation/fixtures/retrieval-benchmark.json`.
- Added `docs/progress/research-alpha-retrospective.md`.
- Updated `services/comathd/src/verification/gate.ts`.
- Updated `services/comathd/src/artifacts/paper.ts`.
- Updated `services/comathd/src/artifacts/snapshots.ts`.
- Updated `services/comathd/src/artifacts/replay.ts`.
- Updated `services/comathd/src/security/secret-scan.ts`.
- Updated `services/comathd/src/verification/runner-contracts.ts`.
- Updated `services/comathd/tests/unit/phase12-working-paper.test.mjs`.
- Updated `services/comathd/tests/unit/phase16-snapshot-replay.test.mjs`.
- Updated root `package.json` so `corepack pnpm test` runs Phase 17 evaluation.
- Updated `TODO.md`, `AGENTS.md`, `SECURITY_REVIEW.md`, `MATH_INTEGRITY_REVIEW.md`, and `docs/progress/design-handoff.md`.

### Boundary And Integrity Notes

The promotion gate now validates that evidence and artifact IDs exist, belong to the same project, bind to the requested claim, link to each other, and satisfy stored artifact hash/size checks. Target statuses require appropriate evidence kinds and, for runner-backed states, successful runner reports bound through the requested evidence/artifacts: `symbolically_checked` requires `ok=true`, `supports_status=symbolically_checked`, `exactness=exact_symbolic`, and no runner vetoes; `computationally_supported` requires a successful computation runner output. Failed symbolic/computation attempts remain durable evidence but cannot promote claims.

Paper export is blocked if `checkPaper()` returns vetoes and records `paper.export_rejected`. Claim blocks now include `margin_note:<PMN-id>`, and paper checks bind each block to that exact margin note instead of accepting claim-global provenance. Runner metadata no longer stores host absolute Python script paths, runner result hashes use one canonical envelope for success, failure, and placeholders, and snapshot verification rejects copied runner reports that contain host-path leaks. Snapshot export/verification/restore reject symlink/reparse traversal, stale runner outputs, replay `runs_sha256` tamper, secret hits, missing entries, and tampered hashes. Secret scans now fail closed on truncated files.

The Phase 17 evaluation suite covers mathematical safety, failed-runner promotion rejection, paper correctness, block-bound provenance, dashboard read-only behavior, snapshot/replay tamper checks, placeholder replay integrity, secret scanning, stale runner output, and in-memory retrieval/context-pack behavior.

### Residual Risks

At Phase 17, Research Alpha remained an auditable local prototype. Real Lean kernel proof checking, production Pi runtime registration, native TriviumDB performance evaluation, full DLP-grade secret scanning, and runner re-execution replay were Research Beta candidates rather than completed Phase 17 capabilities.

## Phase 18 GA Proof-Kernel Vertical Slice Review Log

### Scope

Implemented a native CoMath proof-kernel GA vertical slice under `services/comathd/src/proof-kernel`, rather than treating the MathProve bridge as proof authority. Phase 18 adds service-owned `ResearchCampaign` state, proof-kernel campaign routes, 8-candidate ensemble artifacts, Lean clean replay gates, statement-drift rejection, exact refutation, snapshot restore/replay coverage, and Pi extension campaign tools.

This historical Phase 18 note upgraded the earlier "real Lean kernel checking is not implemented" limitation in a narrow but executable sense: the repository gained a tested Lean proof-kernel path for the elementary `Nat.add_zero` vertical slice and a tested counterexample path for `n + 1 = n`. At that phase it did not implement arbitrary theorem proving, broad Lean proof synthesis, production Pi runtime registration, real MathProve execution, or a persistent child-agent scheduler; later Phase 26 and Phase 28 notes record the bounded Pi registration and AgentRun scheduler slices.

### Implementation Checkpoints

```text
6fe58fe Add GA proof kernel campaign gates
a4319f1 Expose GA research campaign tools in Pi extension
5e3af2f Add GA refutation and snapshot replay slices
ab32780 Persist GA candidate audit artifacts
```

### Changed Surfaces

- Added proof-kernel campaign orchestration in `services/comathd/src/proof-kernel/campaign/`.
- Added candidate ensemble generation, decision filtering, and failure aggregation in `services/comathd/src/proof-kernel/ensemble/`.
- Added Lean project generation, static cheat scan, statement equivalence, dependency closure, axiom profile, and clean replay in `services/comathd/src/proof-kernel/lean/`.
- Added campaign routes in `services/comathd/src/api/server.ts` and exported proof-kernel APIs from `services/comathd/src/index.ts`.
- Hardened `services/comathd/src/verification/gate.ts` so `formally_checked` requires a passed proof-kernel `final_replay_manifest.json` artifact for the requested claim.
- Extended `services/comathd/src/types/schemas.ts` with campaign, candidate, decision, and final Lean replay schemas.
- Added Pi extension `/cm:research`, `/cm:campaign`, `executeComathTool()`, and six campaign tool descriptors in `extensions/comath-pi/src/index.ts`.
- Added Phase 18 comathd and Pi extension tests.

### Targeted Coverage

- `services/comathd/tests/integration/phase18-ga-campaign-vertical-slice.test.mjs`: starts a campaign for `n + 0 = n`, locks the problem, runs 8 candidates, persists candidate audit artifacts, performs final Lean replay, promotes the claim to `formally_checked`, and calls the replay route.
- `services/comathd/tests/unit/phase18-ga-proof-kernel-gates.test.mjs`: rejects fake/preloaded formal metadata without proof-kernel replay, detects `sorry` and `axiom`, and rejects a high-scoring statement-drift candidate.
- `services/comathd/tests/integration/phase18-ga-refutation-path.test.mjs`: keeps the locked statement `n + 1 = n`, records exact counterexample `n=0`, marks the claim `refuted`, and terminates as `completed_refutation`.
- `services/comathd/tests/integration/phase18-ga-snapshot-replay.test.mjs`: exports a snapshot after proof verification, restores it into a fresh root, removes replay byproducts, and verifies proof-kernel replay passes from restored state.
- `extensions/comath-pi/tests/phase18-research-campaign-tools.test.mjs`: verifies campaign tool descriptors, mutability flags, required inputs, and `comathd` route mapping.

### Boundary And Integrity Notes

`formally_checked` is now evidence-level 5 only when the normal claim promotion gate sees bound Lean evidence, proof artifacts, kernel metadata, dependency closure, audit pass, and a passed proof-kernel replay manifest matching the claim. A Lean source file, reviewer approval, agent consensus, MathProve bridge output, preloaded metadata, or candidate score is not enough.

Candidate selection filters hard vetoes and requires `candidate_statement_hash === locked_statement_hash` before score ranking. Voting or reviewer preference cannot promote a drifted theorem. Failed candidates are retained as route memory and candidate artifacts rather than being discarded.

Pi remains a thin client. Campaign tools call `comathd` routes and mutating descriptors require confirmation; the extension still does not write `.comath/` directly or import service internals.

### Residual Risks

- The positive proof path is intentionally narrow and currently generated by `createNatAddZeroLeanProject()`.
- Statement equivalence and axiom/dependency trust profiles are conservative file/output checks, not a full Lean AST equivalence engine.
- The 8-candidate ensemble was implemented for the Phase 18 vertical slice; broad proof-route scheduling and production child-agent profile integration remain deferred beyond the bounded Phase 28 scheduler slice.
- MathProve is still a fail-closed bridge mock outside this native proof-kernel slice.
- Snapshot replay reruns the Lean proof-kernel replay for the campaign proof; Phase 24 later added deterministic compute runner re-execution, while OS/network sandboxing remains deferred.

### Final Root Validation

Fresh Phase 18 documentation-boundary validation completed on 2026-05-27:

```text
corepack pnpm build
Result: exit 0; root recursive build passed for extensions/comath-pi and services/comathd.

corepack pnpm typecheck
Result: exit 0; root recursive no-emit typecheck passed for extensions/comath-pi and services/comathd.

corepack pnpm test
Result: exit 0; Phase 0/design smoke, all workspace tests, Phase 18 comathd proof-kernel tests, Phase 18 Pi campaign tool tests, and Phase 17 integrity evaluation passed.

Test-Path -LiteralPath 'D:\MATH _Studio\comath-pi-lab\.comath'
Result: False; no repository-root runtime state was left behind.
```

## Phase 26 Pi Runtime Registration Review Log

### Scope

Added a Pi 0.75.5-compatible runtime registration path for `@comath/pi-extension`. Phase 26 upgrades the extension from descriptor/test-only metadata to an installed Pi loader-compatible package with a default export runtime factory, package manifest entrypoints, a structured `runtime_registration` contract, and a narrow executable runtime surface for the already implemented research/campaign vertical slices.

This phase does not make a Pi session mathematical authority. Trusted state, proof authority, final audit, and global replay remain owned by `comathd`; MathProve remains a non-authoritative evidence runner.

### TDD Evidence

```text
node extensions/comath-pi/tests/phase26-pi-runtime-registration.test.mjs
Initial RED result: exit 1; Phase 26 runtime registration contract, package manifest, and default export runtime factory were missing.

Review-fix RED result: exit 1; runtime schemas exposed model-supplied `confirmation_id`, runtime commands did not dispatch to `comathd`, runtime registration declared commands that the default export did not register, `/cm:audit final` was parsed as a campaign id, and `--flag value` arguments could be mistaken for missing positional campaign ids.

node extensions/comath-pi/tests/phase26-pi-runtime-registration.test.mjs
Result: exit 0; Phase 26 runtime registration tests passed after host-side confirmation injection, command dispatch, and registration drift guards were added.
```

### Changed Surfaces

- Added `extensions/comath-pi/src/runtime-registration.ts` with `createPiRuntimeRegistration()` and `validatePiRuntimeRegistration()`.
- Updated `extensions/comath-pi/package.json` so `@comath/pi-extension` is package-loadable through `main`, `exports`, `files`, and `pi.extensions`.
- Added a default export runtime factory in `extensions/comath-pi/src/index.ts`.
- Registered only executable runtime tools in the production Pi runtime factory: `comath.research.startCampaign`, `comath.research.runCampaignLoop`, `comath.campaign.status`, `comath.campaign.tick`, `comath.campaign.nextActions`, `comath.campaign.finalAudit`, and `comath.campaign.replay`.
- Kept descriptor-only tools available through `createComathTools()` but unregistered from the production Pi runtime factory until executable handlers exist.
- Added host-side confirmation gating for runtime mutating tools and commands. Model parameters cannot supply `confirmation_id`; the runtime strips it from Pi schemas and injects a host-generated confirmation only after `ctx.ui.confirm()` approves the mutation.
- Added `extensions/comath-pi/tests/phase26-pi-runtime-registration.test.mjs` and wired it into the default `@comath/pi-extension` test chain.
- Updated README, TODO, acceptance matrix, Pi runtime assumptions, risk, handoff, security, math-integrity, and smoke/status docs so Phase 26 is no longer described as deferred.

### Boundary And Integrity Notes

The Pi runtime package exposes a loader-compatible default export and a structured registration contract, but all trusted mutations still cross the `comathd` client boundary. The extension does not write `.comath/`, does not import service internals, and does not inspect Lean proof artifacts directly.

The `runtime_registration` contract records `global_rpm=4`, `trusted_state_access=comathd_only`, `extension_writes_runtime_state=false`, and `pi_session_is_math_authority=false`. Mutating runtime tools are sequential, require Pi host-side confirmation, and delegate to `comathd` campaign routes.

### Residual Risks

- Full interactive Pi/comathd install-session e2e remains deferred beyond the installed-loader smoke.
- Runtime permission UX is currently the minimal `ctx.ui.confirm()` path, not a richer permission policy UI.
- At Phase 22, persistent child-agent scheduling remained deferred; `/cm:research` was a bounded campaign-loop client over `comathd`, not an always-on scheduler. Phase 28 later added bounded service-side process scheduling, while production Pi/Codex child-agent profile integration remains deferred.
- Broad proof planning/theorem synthesis beyond the registered elementary theorem families remains deferred.
- Broad MathProve proof search/final-audit semantics remain deferred; MathProve evidence cannot set `formally_checked`.
- Native TriviumDB performance/persistence validation, stronger OS/network sandboxing, dependency-lock capture, cross-machine replay, richer Lean parser/statement equivalence, and trust profiles remain global GA blockers.

### Final Root Validation

Fresh Phase 26 validation completed on 2026-05-27:

```text
pi --version
Result: exit 0; installed Pi CLI reported 0.75.5.

node --input-type=module -e "<installed @earendil-works/pi-coding-agent discoverAndLoadExtensions smoke>"
Result: exit 0; installed Pi 0.75.5 loader returned errors=[], extensionCount=1, 7 executable research/campaign tools, and commands cm:audit, cm:campaign, cm:replay, cm:research.

corepack pnpm --filter @comath/pi-extension test
Result: exit 0; Pi extension tests passed, including Phase 26 runtime registration, host-confirmation, command dispatch, and drift guards.

corepack pnpm build
Result: exit 0; root recursive build passed for extensions/comath-pi and services/comathd.

corepack pnpm typecheck
Result: exit 0; root recursive no-emit typecheck passed for extensions/comath-pi and services/comathd.

corepack pnpm test
Result: exit 0; Phase 0/design smoke, all workspace tests, Phase 26 Pi runtime registration tests, comathd Phase 0-25 tests, proof-kernel integrations, and Phase 17 integrity evaluation passed.

git diff --check
Result: exit 0; no whitespace errors found.

Test-Path -LiteralPath 'D:\MATH _Studio\comath-pi-lab\.comath'
Result: False; no repository-root runtime state was left behind.
```

## Phase 27 AgentRun Runtime Boundary Review Log

### Scope

Added the service-side AgentRun runtime contract needed before a real child-agent launcher can be trusted: persisted run records, explicit lifecycle transitions, scoped write permissions, structured report validation, GraphPatch producer/reviewer separation, and failed-route memory recording.

This phase does not launch model processes, schedule persistent agents, enforce OS process isolation, stream logs, or rate-limit real Pi/Codex child-agent execution. It creates the auditable boundary those later launchers must use.

### TDD Evidence

```text
node services/comathd/tests/unit/phase27-agent-run-runtime.test.mjs
Initial RED result: exit 1; `../../dist/index.js` did not export `assertAgentRunWriteAllowed`, `createAgentRun`, `getAgentRun`, `listAgentRuns`, `recordAgentRunFailureToMemory`, `startAgentRun`, or `submitAgentRunReport`.

corepack pnpm --filter @comath/comathd build
Result: exit 0; TypeScript build completed after adding AgentRun schemas, store exports, runtime layout, and GraphPatch self-review rejection.

node services/comathd/tests/unit/phase27-agent-run-runtime.test.mjs
Result: exit 0; Phase 27 AgentRun runtime tests passed.

Code-review hardening RED result: exit 1; scoped AgentRun writer allowed a `.tmp/comath/<ARUN>/escape` junction/symlink to redirect an allowed lexical path outside the project root.

Code-review hardening RED result: exit 1; `graph_patch_path` and `artifact_manifest_path` report metadata were persisted without AgentRun scope validation or project-relative enforcement.

Code-review hardening RED result: exit 1; recording the same failed AgentRun twice created a second `FailureRoute` node instead of returning the existing failure memory record.

node services/comathd/tests/unit/phase27-agent-run-runtime.test.mjs
Result: exit 0; Phase 27 tests passed after adding existing-ancestor realpath checks, metadata path validation, invalid run-id rejection, and idempotent failed-run memory recording.
```

### Changed Surfaces

- Added `services/comathd/src/agents/agent-run-store.ts` and `services/comathd/src/agents/index.ts`.
- Added `agentRoleSchema`, `agentRunStatusSchema`, `agentRunSchema`, and AgentRun TypeScript exports.
- Added `.comath/agents` to the service runtime layout.
- Exported AgentRun APIs from `services/comathd/src/index.ts`.
- Hardened `reviewGraphPatch()` so a producer cannot review its own GraphPatch.
- Hardened AgentRun scoped writes against symlink/junction realpath escapes through the nearest existing ancestor.
- Validated submitted `graph_patch_path` and `artifact_manifest_path` as project-relative paths within the run's allowed write scope.
- Made `recordAgentRunFailureToMemory()` idempotent for the same failed AgentRun.
- Added `services/comathd/tests/unit/phase27-agent-run-runtime.test.mjs` and wired it into the default `@comath/comathd` test chain.
- Added `agent_run_runtime_boundary` to `getComathdStatus()`.
- Updated README, TODO, acceptance matrix, risk, security, mathematical-integrity, and handoff documentation.

### Boundary And Integrity Notes

AgentRun write authorization is narrower than the global service path policy: a run may write only under its owning `.comath/workstreams/<WS>/` directory and `.tmp/comath/<ARUN>/`. The global `runtime-write` policy remains `.comath`-only; `.tmp` is allowed only by the AgentRun scoped writer. The scoped writer checks both lexical containment and nearest-existing-ancestor realpath containment, so symlink/junction escapes are rejected before a future launcher can write.

AgentRun reports are artifacts, not proof authority. A successful report cannot promote a claim, apply a GraphPatch, or certify a proof. GraphPatch proposals still require independent review and explicit apply through `ResearchMemoryDB`; failed AgentRuns are preserved as `FailureRoute` memory nodes.

### Residual Risks

- Real child-agent process launching, scheduling, cancellation, log streaming, and rate limiting remain deferred.
- Multi-process writer locks/session semantics remain deferred; current tests exercise single-process service behavior.
- AgentRun report schema is heading-based Markdown validation, not yet a typed artifact-manifest parser or model-output verifier.
- Producer/reviewer identity comparison is exact string equality; richer actor/run alias canonicalization remains a future identity-model task.
- Global GA remains blocked by the deferred items in `TODO.md`; Phase 27 validates the child-agent audit boundary, not autonomous proof research.

### Final Root Validation

Fresh Phase 27 validation completed on 2026-05-27 after code-review hardening:

```text
corepack pnpm --filter @comath/comathd test
Result: exit 0; comathd Phase 0-27 package tests passed, including AgentRun realpath/scope hardening, metadata path validation, idempotent failed-run memory, proof-kernel integrations, and theorem-family integrity coverage.

corepack pnpm build
Result: exit 0; root recursive build passed for extensions/comath-pi and services/comathd.

corepack pnpm typecheck
Result: exit 0; root recursive no-emit typecheck passed for extensions/comath-pi and services/comathd.

corepack pnpm test
Result: exit 0; Phase 0/design smoke, Pi extension tests, comathd Phase 0-27 tests, proof-kernel integrations, and Phase 17 integrity evaluation passed.
```

## Phase 28 AgentRun Process Scheduler Review Log

### Scope

Added the service-side AgentRun process scheduler on top of the Phase 27 runtime boundary. Phase 28 can launch real allowlisted child processes, serialize them under `max_concurrent`, enforce rpm reservations before enqueue, capture scoped logs, persist scheduler reports through AgentRun state, and handle success, nonzero exit, invalid report, timeout, running cancellation, and queued cancellation.

This phase does not make child processes mathematical authorities. Scheduler completion cannot promote claims, apply GraphPatch, certify proof status, or bypass CoMath proof-kernel replay and gate checks. Production Pi/Codex child-agent profile adapters, network-denial sandboxing, and multi-process writer locks remain deferred GA blockers.

### TDD Evidence

```text
node services/comathd/tests/unit/phase28-agent-run-scheduler.test.mjs
Initial RED result: exit 1; `createAgentRunScheduler` was not exported.

node services/comathd/tests/unit/phase28-agent-run-scheduler.test.mjs
Result: exit 0; first scheduler slice passed after adding real child-process launch, serial scheduling, rpm rejection, timeout, cancellation, logs, and report persistence.

Security hardening RED result: exit 1; child process exit 0 with invalid stdout caused `submitAgentRunReport()` to throw, leaving the run without a durable failed report.

Security hardening RED result: exit 1; scheduler inherited parent `process.env`, accepted sensitive `input.command.env`, and allowed queued launches to enter the queue before rpm reservation.

Security hardening RED result: exit 1; relative executable names were rejected only as non-allowlisted rather than fail-closed as non-absolute command paths.

Security hardening RED result: exit 1; queued cancellation returned `false` and left queued AgentRuns runnable.

Security hardening RED result: exit 1; successful child stdout could become the AgentRun report without a scheduler envelope declaring `proof_authority: none` and `supports_claim_status: none`.

Security hardening RED result: exit 1; large stdout was accumulated then sliced without a durable `COMATH_OUTPUT_TRUNCATED` marker.

node services/comathd/tests/unit/phase28-agent-run-scheduler.test.mjs
Result: exit 0; Phase 28 AgentRun scheduler tests passed after hardening absolute realpath allowlists, minimal environment inheritance, sensitive env rejection, rpm reservation, invalid-report fail-closed persistence, queued cancellation, non-authoritative scheduler envelopes, output byte caps, and timeout/cancel process-tree termination.

Post-review hardening RED/GREEN: added guard coverage for non-Windows `SIGTERM` escalation to `SIGKILL` and canonical-realpath execution after allowlist validation; `node tests/unit/phase28-agent-run-scheduler.test.mjs` passed from `services/comathd`.

corepack pnpm --filter @comath/comathd test
Result: exit 0; comathd Phase 0-28 package tests passed, including AgentRun scheduler hardening, AgentRun runtime-boundary tests, proof-kernel integrations, and theorem-family integrity coverage.
```

### Changed Surfaces

- Added `services/comathd/src/agents/agent-run-scheduler.ts` with `createAgentRunScheduler()` and `AgentRunScheduler`.
- Added `cancelQueuedAgentRun()` to `services/comathd/src/agents/agent-run-store.ts` for durable queued-run cancellation with structured report and audit event.
- Exported scheduler APIs from `services/comathd/src/agents/index.ts`.
- Added `services/comathd/tests/unit/phase28-agent-run-scheduler.test.mjs` and wired it into the default `@comath/comathd` test chain.
- Added `agent_run_process_scheduler` to `getComathdStatus()`.
- Updated README, TODO, acceptance matrix, risk register, security review, mathematical-integrity review, smoke check, and handoff documentation.

### Boundary And Integrity Notes

Scheduler programs are deny-by-default and must match configured absolute realpaths; relative executable names such as `node` are rejected before PATH resolution. Processes are launched with `shell:false`, scoped cwd under `.tmp/comath/<ARUN>/`, minimal inherited environment, explicit `COMATH_*` runtime variables, and sensitive environment-variable name rejection.

Child stdout/stderr are scoped AgentRun artifacts, not proof evidence. Successful child stdout must still contain the required AgentRun report headings; the scheduler wraps it in a non-authoritative envelope with `proof_authority: none`, `supports_claim_status: none`, and `child_stdout_untrusted: true`. Invalid child reports fail closed as `exit_reason=invalid_report`.

Timeout and running cancellation attempt process-tree termination (`taskkill /T /F` on Windows, process-group termination on non-Windows, then `child.kill()` fallback). Output capture is byte-capped and writes `COMATH_OUTPUT_TRUNCATED` into persisted logs when truncated.

### Residual Risks

- Production Pi/Codex child-agent profile adapters remain unimplemented; Phase 28 uses allowlisted fixture commands and a service API, not a full Pi goal-mode worker pool.
- OS-level sandboxing and enforced network denial remain deferred. Phase 28 hardens command shape, environment, cwd, timeout/cancel, and process-tree termination, but it is not a container/job-object policy sandbox.
- Multi-process writer locks/session semantics remain deferred; current tests exercise single-process service behavior.
- Log streaming APIs remain deferred; Phase 28 persists bounded stdout/stderr logs after process completion.
- AgentRun report schema is still heading-based Markdown validation, not a typed artifact-manifest parser or model-output verifier.

## Phase 29 Agent Profile Service Integration Review Log

### Scope

Added service-owned GA agent profiles on top of the Phase 27 AgentRun runtime boundary and Phase 28 process scheduler. Phase 29 exposes validated profile metadata, profile-backed AgentRun creation, and scheduler launch-envelope preparation through `comathd`, so the child-agent orchestration surface is no longer only an internal TypeScript helper.

This phase does not make profiles, child processes, or AgentRun reports mathematical authorities. Every profile is constrained to `may_mutate_trusted_state=false`, `proof_authority=none`, scoped workstream/tmp write templates, `rpm<=4`, and forbidden direct-promotion/trusted-write tools. Live Pi/Codex adapter execution, richer profile UI, OS/network sandboxing, multi-process writer locks, and log streaming remain deferred.

### TDD Evidence

```text
corepack pnpm --filter @comath/comathd exec node tests/unit/phase29-agent-profile-integration.test.mjs
Initial RED result: exit 1; `dist/index.js` did not provide `buildAgentProfileLaunch`.

corepack pnpm --filter @comath/comathd exec node tests/unit/phase29-agent-profile-integration.test.mjs
Route RED result: exit 1; `/agent/profile/list?global_rpm=4` returned 404 before the service routes existed.

corepack pnpm --filter @comath/comathd exec node tests/unit/phase29-agent-profile-integration.test.mjs
Route-order RED result: exit 1; dynamic `/agent/profile/:id` treated `/agent/profile/list` as an unknown profile id.

corepack pnpm --filter @comath/comathd exec node tests/unit/phase29-agent-profile-integration.test.mjs
Status RED result: exit 1; `/health` did not yet report `agent_profile_service_api`.

corepack pnpm --filter @comath/comathd exec node tests/unit/phase29-agent-profile-integration.test.mjs
Result: exit 0; Phase 29 Agent profile integration tests passed.
```

### Changed Surfaces

- Added `services/comathd/src/agents/agent-profiles.ts`.
- Exported profile APIs from `services/comathd/src/agents/index.ts`.
- Added `GET /agent/profile/list`, `GET /agent/profile/:id`, `POST /agent/run/profile`, and `POST /agent/run/profile/prepare-launch` to `services/comathd/src/api/server.ts`.
- Added `services/comathd/tests/unit/phase29-agent-profile-integration.test.mjs` and wired it into the default `@comath/comathd` test chain.
- Added `agent_profile_service_api` to `getComathdStatus()`.
- Updated README, TODO, AGENTS, acceptance matrix, and handoff documentation.

### Boundary And Integrity Notes

Profile validation fails closed on duplicate IDs, trusted-state mutation authority, proof authority, profile-local rpm above the global budget, forbidden tools also present in allowed tools, and missing write-scope templates. Unknown profile IDs return `AGENT_PROFILE_UNKNOWN`.

Profile-backed AgentRuns inherit the profile role/model/tool profile but still use the ordinary AgentRun scoped write policy. Launch envelopes only prepare scheduler-compatible command metadata and profile environment variables; they exclude secret-like env keys and do not run processes by themselves.

### Residual Risks

- Live Pi/Codex agent adapter execution remains deferred; Phase 29 provides the service contract, not an end-to-end remote model worker pool.
- OS-level sandboxing and enforced network denial remain deferred beyond the Phase 28 process-shape controls.
- Rich profile UI remains deferred beyond the Phase 30 `/cm:agent` command/tool harness.
- Multi-process writer locks/session semantics and log streaming APIs remain deferred.

## Phase 33 Proof Obligation DAG Planning Review Log

### Scope

Added native planning-stage proof-obligation artifacts to the service-owned proof kernel. Phase 33 writes a campaign-scoped lemma DAG, line map, obligation YAML, `Skeleton.lean`, and skeleton report during the public `planning` campaign state before candidate generation. This internalizes another MathProve v8 proof-factory concept without treating skeletons, DAGs, or line maps as proof authority.

### TDD And Review Evidence

```text
node scripts/phase0-smoke.mjs
Initial audit result: exit 1 before fix; root smoke still required README Phase 18-32 after README had moved to Phase 18-33.

corepack pnpm --filter @comath/comathd build
Result: exit 0; TypeScript build completed before Phase 33 regression hardening.

node services/comathd/tests/unit/phase33-proof-obligation-dag.test.mjs
Multi-obligation RED result: exit 1; a root -> lemma -> sublemma DAG marked the intermediate obligation as `leaf` instead of `intermediate`, exposing incomplete open-obligation closure semantics.

corepack pnpm --filter @comath/comathd build
Result: exit 0; TypeScript build completed after adding campaign-scoped proof-planning artifacts and DAG validation.

node services/comathd/tests/unit/phase33-proof-obligation-dag.test.mjs
Result: exit 0; Phase 33 proof obligation DAG tests passed after DAG kind, multi-obligation skeleton, and skeleton-report closure fixes.

node services/comathd/tests/unit/phase33-proof-obligation-dag.test.mjs
Unsupported-relation RED result: exit 1; `validateProofObligationDag()` accepted a non-`decomposes_to` edge relation.

corepack pnpm --filter @comath/comathd build
Result: exit 0; TypeScript build completed after adding unsupported-relation rejection.

node services/comathd/tests/unit/phase33-proof-obligation-dag.test.mjs
Result: exit 0; Phase 33 proof obligation DAG tests passed with duplicate-node, unknown-endpoint, unsupported-relation, cycle, multi-obligation closure, stage-run, and campaign-isolation coverage.

node scripts/phase0-smoke.mjs
Result: exit 0; root smoke now checks Phase 18-33 and Phase 33 acceptance while retaining Phase 32 statement-signature acceptance and mathematical-integrity guards.

corepack pnpm --filter @comath/comathd test
Result: exit 0; comathd Phase 0-33 package tests passed with Phase 32 and Phase 33 wired into the default test chain.

corepack pnpm build
Result: exit 0; root recursive build passed for extensions/comath-pi and services/comathd.

corepack pnpm typecheck
Result: exit 0; root recursive no-emit typecheck passed for extensions/comath-pi and services/comathd.

corepack pnpm test
Result: exit 0; root smoke, Pi extension tests, comathd tests through Phase 33, and Phase 17 integrity evaluation passed.

Test-Path -LiteralPath 'D:\MATH _Studio\comath-pi-lab\.comath'
Result: False; no repository-root runtime state was left behind.
```

### Changed Surfaces

- Added `services/comathd/src/proof-kernel/stages/proof-obligation-dag.ts`.
- Added `validateProofObligationDag()` with duplicate-node, unknown-edge-endpoint, unsupported-relation, and cycle rejection.
- Wrote proof-planning artifacts under `.comath/campaign/<CAM>/proof/` instead of global `.comath/proof/`.
- Added `Skeleton.lean` with proof-obligation-tagged planning-stage `sorry` placeholders for all open obligations and a skeleton report that explicitly denies proof authority.
- Recorded Phase 33 artifact paths in the campaign `planning` stage run.
- Added `services/comathd/tests/unit/phase33-proof-obligation-dag.test.mjs` and wired it into `@comath/comathd` default tests.
- Added `proof_obligation_dag_planning` to runtime status and smoke requirements.
- Updated README, TODO, acceptance matrix, handoff, AGENTS, security review, and mathematical-integrity review.

### Boundary And Integrity Notes

Phase 33 does not implement broad lemma decomposition or arbitrary theorem synthesis. The DAG is validated and campaign-scoped, and its planning artifacts now cover the current open-obligation closure rather than only the root obligation. `Skeleton.lean` may contain named `sorry` placeholders only as skeleton material; final proof authority still requires the existing static audit, statement-equivalence gate, axiom profile, dependency closure, clean Lean replay, and claim promotion gate.

### Residual Risks

- Broad proof planning beyond registered theorem families remains deferred.
- Rich line-map provenance over multi-line informal derivations, citations, and computations remains deferred.
- Generic theorem synthesis and production proof-route agent execution remain deferred.
- Skeleton artifacts are not built as final Lean targets; they are auditable planning outputs whose placeholders must be discharged later.

## Phase 41 Live Agent Adapter Execution Review Log

### Scope

Added a live profile-backed adapter execution slice. `executeProfileAgentRun()` creates a validated profile-bound AgentRun, prepares the launch envelope, executes a real allowlisted adapter process through the Phase 28/40 scheduler, and returns run/result/audit material. `POST /agent/run/profile/execute`, Pi `comath.agent.executeProfile`, and `/cm:agent execute` expose the same path with host confirmation on Pi.

This is a real local adapter execution path, not just a launch-envelope scaffold. It still does not package a production Codex CLI/API adapter, log streaming UI, adapter health checks, or OS-level sandboxing.

### TDD Evidence

```text
node services/comathd/tests/unit/phase41-live-agent-adapter-execution.test.mjs
Initial RED result: exit 1; `../../dist/index.js` did not export `executeProfileAgentRun`.

node services/comathd/tests/unit/phase41-live-agent-adapter-execution.test.mjs
Integration RED result after first implementation: exit 1; scheduler rejected `COMATH_PROOF_AUTHORITY` as sensitive env, exposing a profile/scheduler boundary mismatch.

node services/comathd/tests/unit/phase41-live-agent-adapter-execution.test.mjs
Fixture RED result: exit 1; adapter fixture script had invalid generated JavaScript string escaping, then a too-narrow report assertion.

node services/comathd/tests/unit/phase41-live-agent-adapter-execution.test.mjs
Result: exit 0; live profile-backed adapter execution tests passed.

node extensions/comath-pi/tests/phase41-agent-execute-tool.test.mjs
Initial RED result: exit 1; `comath.agent.executeProfile` was not registered.

node extensions/comath-pi/tests/phase41-agent-execute-tool.test.mjs
Result: exit 0; Pi profile execution tool and `/cm:agent execute` tests passed.
```

### Changed Surfaces

- Added `executeProfileAgentRun()` to `services/comathd/src/agents/agent-profiles.ts`.
- Added `POST /agent/run/profile/execute` to `services/comathd/src/api/server.ts`.
- Allowed the explicit non-secret `COMATH_PROOF_AUTHORITY=none` scheduler environment metadata while retaining sensitive env rejection.
- Added `services/comathd/tests/unit/phase41-live-agent-adapter-execution.test.mjs` and wired it into the default `@comath/comathd` test chain.
- Added Pi `comath.agent.executeProfile` and `/cm:agent execute` in `extensions/comath-pi/src/index.ts`.
- Added `extensions/comath-pi/tests/phase41-agent-execute-tool.test.mjs` and wired it into the default `@comath/pi-extension` test chain.
- Added `live_agent_adapter_execution` to service status and updated README, TODO, acceptance matrix, smoke checks, security, math-integrity, and handoff notes.

### Boundary And Integrity Notes

The adapter executes through the same scheduler controls as other AgentRuns: absolute allowlisted program, `shell:false`, scoped cwd/log writes, rpm/concurrency controls, writer-lock acquisition, timeout/cancel behavior, and non-authoritative scheduler report wrapping. Child stdout is still marked untrusted; successful adapter exit cannot promote claims, apply GraphPatch directly, or replace proof-kernel replay.

### Residual Risks

- Production Codex CLI/API adapter packaging remains deferred.
- Live log streaming, adapter health checks, and richer interactive operator controls remain deferred.
- OS-level sandboxing and enforced network denial remain deferred.

### Final Root Validation

Fresh Phase 41 validation completed on 2026-05-28:

```text
node scripts/phase0-smoke.mjs
Result: exit 0; Phase 0/design smoke check passed for 25 required entries and 28 invariants.

node services/comathd/tests/phase0-smoke.test.mjs
Result: exit 0; comathd Research Alpha smoke accepted `live_agent_adapter_execution`.

node services/comathd/tests/unit/phase41-live-agent-adapter-execution.test.mjs
Result: exit 0; Phase 41 live agent adapter execution tests passed.

node extensions/comath-pi/tests/phase41-agent-execute-tool.test.mjs
Result: exit 0; Phase 41 Pi agent execute tool tests passed.

corepack pnpm --filter @comath/comathd test
Result: exit 0; comathd Phase 0-41 package tests passed with Phase 41 wired into the default test chain.

corepack pnpm --filter @comath/pi-extension test
Result: exit 0; Pi extension tests passed with Phase 41 wired into the default test chain.

corepack pnpm typecheck
Result: exit 0; root recursive no-emit typecheck passed for extensions/comath-pi and services/comathd.

corepack pnpm test
Result: exit 0; root smoke, Pi extension tests, comathd tests through Phase 41, and Phase 17 integrity evaluation passed.
```

## Phase 40 AgentRun Scheduler Writer Lock Integration Review Log

### Scope

Wired the service-side AgentRun process scheduler through the Phase 39 project writer session lock. A scheduled process run now acquires a project writer lock before starting run-state/log/report mutation, rejects launch while another active writer owns the project, preserves the queued run on blocked launch, and releases the scheduler-owned lock after terminal report handling.

This still does not provide OS-level process sandboxing, enforced network denial, or mandatory external-process locks.

### TDD Evidence

```text
node services/comathd/tests/unit/phase40-agent-scheduler-session-lock.test.mjs
Initial RED result: exit 1; missing expected rejection because the scheduler ignored an existing active writer lock and launched the child process.

corepack pnpm --filter @comath/comathd build
Result: exit 0; TypeScript build completed after adding scheduler acquire/release integration.

node services/comathd/tests/unit/phase40-agent-scheduler-session-lock.test.mjs
Result: exit 0; Phase 40 scheduler writer-lock integration tests passed.

node tests/unit/phase28-agent-run-scheduler.test.mjs
Result: exit 0 from `services/comathd`; Phase 28 scheduler regression tests remained compatible with writer-lock integration.
```

### Changed Surfaces

- Updated `services/comathd/src/agents/agent-run-scheduler.ts` so `execute()` acquires/releases project writer sessions.
- Added scheduler audit events `agent_run.writer_lock_blocked`, `agent_run.writer_lock_acquired`, and `agent_run.writer_lock_released`.
- Added `services/comathd/tests/unit/phase40-agent-scheduler-session-lock.test.mjs` and wired it into the default `@comath/comathd` test chain.
- Added `agent_run_scheduler_writer_lock_integration` to service status and removed the narrower lock-integration residual risk.
- Updated README, TODO, acceptance, smoke, security, mathematical-integrity, and handoff notes.

### Boundary And Security Notes

Blocked launches fail before `startAgentRun()` and before child process spawn, preserving the queued AgentRun and avoiding log/report side effects. Allowed launches hold the session through terminal report submission and release in a `finally` path so success, failure, timeout, cancellation, and invalid-report handling all relinquish the scheduler-owned lock.

The lock is still a CoMath-owned coordination file, not an OS mandatory lock. External processes that bypass `comathd` remain outside the guarantee.

### Residual Risks

- OS-level process sandboxing and network-denial enforcement remain deferred.
- Live Pi/Codex adapter execution remains deferred.
- Mandatory cross-process filesystem locks for arbitrary external writers remain outside Phase 40.

### Final Root Validation

Fresh Phase 40 validation completed on 2026-05-28:

```text
node scripts/phase0-smoke.mjs
Result: exit 0; Phase 0/design smoke check passed for 25 required entries and 28 invariants.

node services/comathd/tests/phase0-smoke.test.mjs
Result: exit 0; comathd Research Alpha smoke accepted `agent_run_scheduler_writer_lock_integration`.

node services/comathd/tests/unit/phase40-agent-scheduler-session-lock.test.mjs
Result: exit 0; Phase 40 AgentRun scheduler session-lock tests passed.

corepack pnpm --filter @comath/comathd test
Result: exit 0; comathd Phase 0-40 package tests passed with Phase 40 wired into the default test chain.

corepack pnpm typecheck
Result: exit 0; root recursive no-emit typecheck passed for extensions/comath-pi and services/comathd.

corepack pnpm test
Result: exit 0; root smoke, Pi extension tests, comathd tests through Phase 40, and Phase 17 integrity evaluation passed.
```

## Phase 39 Project Writer Session Lock Review Log

### Scope

Added a service-owned project writer session lock primitive under `.comath/sessions/writer.lock.json`. Phase 39 gives `comathd` and future scheduled AgentRun writers an auditable single-writer coordination object with token-gated release, stale-lock takeover, and fail-closed malformed-lock behavior.

This is not OS-level process sandboxing and does not yet wire every AgentRun scheduler launch or mutation route through the lock. It retires only the lock primitive portion of the broader scheduled-process isolation blocker.

### TDD Evidence

```text
node services/comathd/tests/unit/phase39-project-session-lock.test.mjs
Initial RED result: exit 1; `../../dist/index.js` did not export `acquireProjectSessionLock`.

corepack pnpm --filter @comath/comathd build
Result: exit 0; TypeScript build completed after adding the session-lock module and export.

node services/comathd/tests/unit/phase39-project-session-lock.test.mjs
Result: exit 0; Phase 39 lock tests passed for acquisition, active-lock rejection, token-gated release, and stale takeover.

node services/comathd/tests/unit/phase39-project-session-lock.test.mjs
Reviewer-strengthened RED result: exit 1; malformed lock input surfaced a raw `SyntaxError` instead of the required fail-closed unreadable-lock error.

node services/comathd/tests/unit/phase39-project-session-lock.test.mjs
Result: exit 0; malformed locks now fail closed with `active writer session lock is unreadable` and are not overwritten.
```

### Changed Surfaces

- Added `services/comathd/src/project/session-lock.ts` with `acquireProjectSessionLock()`, `releaseProjectSessionLock()`, and `readProjectSessionLock()`.
- Exported the lock API from `services/comathd/src/index.ts`.
- Added `services/comathd/tests/unit/phase39-project-session-lock.test.mjs` and wired it into the default `@comath/comathd` test chain.
- Added `project_writer_session_lock` to `getComathdStatus()` and `agent_process_multi_process_lock_integration_deferred` as an explicit residual risk.
- Updated README, TODO, acceptance matrix, smoke checks, and coordination notes for Phase 39.

### Boundary And Security Notes

The lock path is resolved through the existing runtime-write path policy and lives under `.comath/sessions/`. Initial acquisition uses exclusive-create semantics, active locks reject contenders, release requires the current session token, stale takeover records the replaced session id, and malformed lock JSON is treated as an active fail-closed condition rather than silently repaired.

The session lock is coordination metadata only. It does not prove mathematical artifacts, does not grant claim-promotion authority, does not sandbox child processes, and does not yet enforce single-writer behavior across every AgentRun scheduler path.

### Residual Risks

- AgentRun scheduler integration with this writer lock remains deferred.
- OS-level process sandboxing and network-denial enforcement remain deferred.
- The primitive is file-lock-shaped coordination, not an operating-system advisory/mandatory lock across arbitrary external processes.

### Final Root Validation

Fresh Phase 39 validation completed on 2026-05-28:

```text
node scripts/phase0-smoke.mjs
Result: exit 0; Phase 0/design smoke check passed for 25 required entries and 28 invariants.

node services/comathd/tests/phase0-smoke.test.mjs
Result: exit 0; comathd Research Alpha smoke accepted `project_writer_session_lock` and the deferred AgentRun lock-integration residual risk.

node services/comathd/tests/unit/phase39-project-session-lock.test.mjs
Result: exit 0; Phase 39 project session lock tests passed.

corepack pnpm --filter @comath/comathd test
Result: exit 0; comathd Phase 0-39 package tests passed with Phase 39 wired into the default test chain.

corepack pnpm typecheck
Result: exit 0; root recursive no-emit typecheck passed for extensions/comath-pi and services/comathd.

corepack pnpm test
Result: exit 0; root smoke, Pi extension tests, comathd tests through Phase 39, and Phase 17 integrity evaluation passed.
```

## Phase 38 Native TriviumDB Target-Platform Evaluation Review Log

### Scope

Added an explicit native TriviumDB target-platform evaluation harness. Phase 38 retires the previous "native TriviumDB performance/persistence validation" blocker for this Windows x64 workstation by installing `triviumdb@0.7.1` as a root optional dependency, adapting the CoMath Trivium adapter to the actual Node export/API shape, and recording fail-closed capability, persistence, search-quality, and timing evidence.

This does not make TriviumDB the default backend. Native memory remains optional, dynamically loaded, and selected only through the adapter/factory path.

### TDD Evidence

```text
node services/comathd/tests/unit/phase38-trivium-native-evaluation.test.mjs
Initial RED result: exit 1; `evaluateTriviumTargetPlatform` was not exported.

corepack pnpm --filter @comath/comathd build
Result: exit 0; TypeScript build completed after adding the Trivium target-evaluation module and export.

node services/comathd/tests/unit/phase38-trivium-native-evaluation.test.mjs
Result: exit 0; evaluation contract passed for fail-closed native-unavailable reports and fake-native available reports.
```

### Real Native Evidence

```text
corepack pnpm --store-dir .pnpm-store add -w -O triviumdb@0.7.1
Result: exit 0; root optional dependency `triviumdb@0.7.1` installed without adding it to `services/comathd` ordinary dependencies.

$env:COMATH_ENABLE_TRIVIUM_TESTS='1'; corepack pnpm --filter @comath/comathd test:trivium
Initial native result: exit 1; target package exported `default.TriviumDB`, not `Database`, then exposed vector-API and lock/reopen behavior that required adapter support.

$env:COMATH_ENABLE_TRIVIUM_TESTS='1'; corepack pnpm --filter @comath/comathd test:trivium
Result: exit 0; real native adapter smoke passed for `triviumdb@0.7.1` after supporting `default.TriviumDB`, vector insert/search calls, lock cleanup, and idempotent restore/update.

corepack pnpm --filter @comath/comathd eval:trivium
Result: exit 0; real Windows x64 target evaluation passed with `backend=trivium`, `sample_size=64`, `search_top_hit_ratio=1`, `persistence_reopen.result=pass`, `upsert_ms_per_node=0.12635156250000001`, and no hard vetoes.
```

### Changed Surfaces

- Added `services/comathd/src/memory/trivium-evaluation.ts` with `evaluateTriviumTargetPlatform()`.
- Added `services/comathd/tests/unit/phase38-trivium-native-evaluation.test.mjs` and wired it into the default `@comath/comathd` test chain.
- Added `services/comathd/scripts/run-trivium-target-evaluation.mjs` and `corepack pnpm --filter @comath/comathd eval:trivium`.
- Added root optional dependency `triviumdb@0.7.1`; `services/comathd/package.json` still has no `triviumdb` dependency.
- Extended Trivium capability probing and adapter construction for the actual Node export shape `default.TriviumDB`.
- Adapted native insert/search calls to the vector API while keeping CoMath's stable string IDs and in-process search semantics intact.
- Added native close/reopen lock cleanup for the adapter-owned `.comath/db/research-memory.tdb.lock` path.
- Made restore idempotent against already-persisted native nodes by updating payload after native "already exists" errors.
- Added `trivium_target_platform_evaluation` to runtime status and smoke requirements.
- Updated README, TODO, acceptance matrix, handoff, AGENTS, security review, and mathematical-integrity review.

### Boundary And Integrity Notes

The native package is optional at the workspace root so target-platform evaluation can load it without making `services/comathd` depend on native code in ordinary package metadata. Default tests still exercise fallback and adapter semantics. Native validation is explicit: `eval:trivium` must pass before claiming target native persistence/performance readiness.

TriviumDB evidence remains memory-system evidence only. It does not promote claims, certify proofs, replace Lean replay, or authorize MathProve output.

### Residual Risks

- Broader multi-platform native benchmarking remains future work.
- Production default-backend selection policy remains explicit configuration work; Phase 38 keeps the default backend as memory.
- TriviumDB native lock behavior is handled for the adapter-owned evaluation path, but multi-process writer/session locks remain a separate AgentRun/comathd blocker.

### Final Root Validation

Fresh Phase 38 validation completed on 2026-05-28:

```text
node scripts/phase0-smoke.mjs
Result: exit 0; Phase 0/design smoke check passed for 25 required entries and 28 invariants.

node services/comathd/tests/phase0-smoke.test.mjs
Result: exit 0; comathd smoke accepted `trivium_target_platform_evaluation` and no longer lists `native_trivium_performance_evaluation_deferred` as a residual risk.

node services/comathd/tests/unit/phase38-trivium-native-evaluation.test.mjs
Result: exit 0; Phase 38 TriviumDB native evaluation contract tests passed.

$env:COMATH_ENABLE_TRIVIUM_TESTS='1'; corepack pnpm --filter @comath/comathd test:trivium
Result: exit 0; real `triviumdb@0.7.1` optional native smoke passed on Windows x64.

corepack pnpm --filter @comath/comathd eval:trivium
Result: exit 0; real target evaluation passed with `backend=trivium`, `sample_size=64`, `search_top_hit_ratio=1`, `persistence_reopen.result=pass`, `upsert_ms_per_node=0.08118437500000031`, and no hard vetoes.

corepack pnpm --filter @comath/comathd test
Result: exit 0; comathd Phase 0-38 package tests passed with Phase 38 wired into the default test chain.

corepack pnpm typecheck
Result: exit 0; root recursive no-emit typecheck passed for extensions/comath-pi and services/comathd.

corepack pnpm test
Result: exit 0; root smoke, Pi extension tests, comathd tests through Phase 38, and Phase 17 integrity evaluation passed.
```

## Phase 37 Registered Lean Statement Alias Equivalence Review Log

### Scope

Added a conservative registered-alias path to Lean statement equivalence. Phase 37 permits a target theorem signature to differ from the locked formal spec only when an explicit `allowed_definitional_aliases` entry maps the formal spec statement to the exact extracted target signature and records a witness. It does not claim full Lean parser integration, arbitrary definitional equality, transitive semantic equivalence, or proof-producing logical equivalence.

### TDD Evidence

```text
node services/comathd/tests/unit/phase37-lean-statement-alias-equivalence.test.mjs
Initial RED result: exit 1; alias output `MathResearch.C0001 (n : Nat) : Nat.add n 0 = n` failed because statement equivalence only accepted exact normalized target-signature equality.

corepack pnpm --filter @comath/comathd build
Result: exit 0; TypeScript build completed after adding registered alias support and status capability wiring.

node services/comathd/tests/unit/phase32-lean-statement-signature.test.mjs
Result: exit 0; Phase 32 target-signature equality and missing/ambiguous/mismatch regressions remained valid.

node services/comathd/tests/unit/phase37-lean-statement-alias-equivalence.test.mjs
Result: exit 0; registered alias equivalence passed for Lean notation expansion, while missing, ambiguous, and non-registered mismatched target output failed closed.
```

### Changed Surfaces

- Added `StatementDefinitionalAlias` and optional `allowed_definitional_aliases` input to `services/comathd/src/proof-kernel/lean/statement-equivalence.ts`.
- Added `equivalence_witness` output for accepted registered definitional aliases.
- Preserved existing exact-match status and hard vetoes for missing target output, ambiguous target output, and mismatched signatures.
- Added `services/comathd/tests/unit/phase37-lean-statement-alias-equivalence.test.mjs` and wired it into the default `@comath/comathd` test chain.
- Added `lean_statement_alias_equivalence` and `lean_parser_logical_equivalence_deferred` to runtime status and smoke requirements.
- Updated README, TODO, acceptance matrix, handoff, AGENTS, security review, and mathematical-integrity review.

### Boundary And Integrity Notes

Registered aliases are allowlist entries, not inferred theorem equivalence. The implementation normalizes whitespace only, compares the locked formal statement and extracted target signature exactly after normalization, and records the alias justification as evidence metadata. A target theorem with the wrong operand order, missing `#check` output, or multiple target outputs is still rejected.

This keeps statement equivalence target-bound after Phase 32 while allowing narrowly audited notation expansion cases such as `n + 0 = n` versus `Nat.add n 0 = n`.

### Residual Risks

- Lean parser integration remains deferred.
- Proof-producing definitional/logical equivalence classes remain deferred.
- Transitive dependency semantics and broader mathematical-domain trust profiles remain deferred.

### Final Root Validation

Fresh Phase 37 validation completed on 2026-05-28:

```text
node services/comathd/tests/phase0-smoke.test.mjs
Result: exit 0; comathd Research Alpha smoke accepted `lean_statement_alias_equivalence` and the deferred Lean parser/logical-equivalence residual risk.

node services/comathd/tests/unit/phase32-lean-statement-signature.test.mjs
Result: exit 0; Phase 32 exact target-signature binding regressions remained green.

node services/comathd/tests/unit/phase37-lean-statement-alias-equivalence.test.mjs
Result: exit 0; Phase 37 registered statement-alias equivalence tests passed.

node scripts/phase0-smoke.mjs
Result: exit 0; Phase 0/design smoke check passed for 25 required entries and 28 invariants.

corepack pnpm --filter @comath/comathd test
Result: exit 0; comathd Phase 0-37 package tests passed with Phase 37 wired into the default test chain.

corepack pnpm test
Result: exit 0; root smoke, Pi extension tests, comathd tests through Phase 37, and Phase 17 integrity evaluation passed.

corepack pnpm typecheck
Result: exit 0; root recursive no-emit typecheck passed for extensions/comath-pi and services/comathd.
```

## Phase 36 Runner Replay Sandbox And Dependency Provenance Review Log

### Scope

Added explicit sandbox-policy and dependency-lock provenance to compute-runner reports and replay manifests. Phase 36 reduces the runner replay hardening blocker by making provenance auditable and fail-closed; it does not claim OS-level isolation, enforced network denial, cross-machine replay validation, or arbitrary runner-family lockfile coverage.

### TDD Evidence

```text
node services/comathd/tests/unit/phase36-runner-replay-provenance.test.mjs
Initial RED result: exit 1; `metadata.sandbox_policy` was undefined in persisted runner reports.

corepack pnpm --filter @comath/comathd build
Result: exit 0; TypeScript build completed after adding runner provenance metadata and replay-manifest propagation.

node services/comathd/tests/phase0-smoke.test.mjs
Result: exit 0; comathd smoke status accepted `runner_replay_sandbox_dependency_provenance` and the updated residual replay-sandbox risk.

node services/comathd/tests/unit/phase36-runner-replay-provenance.test.mjs
Result: exit 0; runner reports and replay manifests carried sandbox/dependency provenance, and missing provenance failed closed.

node services/comathd/tests/unit/phase16-snapshot-replay.test.mjs
Result: exit 0; snapshot/replay tests passed after preserving dependency-lock script-hash drift in the existing script-drift fixture.

corepack pnpm --filter @comath/comathd test
Result: exit 0; comathd Phase 0-36 package tests passed with Phase 36 wired into the default test chain.

corepack pnpm test
Result: exit 0; root smoke, Pi extension tests, comathd tests through Phase 36, and Phase 17 integrity evaluation passed.

corepack pnpm typecheck
Result: exit 0; root recursive no-emit typecheck passed for extensions/comath-pi and services/comathd.

git diff --check
Result: exit 0; no whitespace errors reported.

Test-Path -LiteralPath 'D:\MATH _Studio\comath-pi-lab\.comath'
Result: False; no repository-root runtime state was left behind.
```

### Changed Surfaces

- Added `sandbox_policy` and `dependency_lock` to compute runner metadata in `services/comathd/src/verification/runner-contracts.ts`.
- Preserved sandbox/dependency provenance in `ReplayRunManifest` entries from `services/comathd/src/artifacts/replay.ts`.
- Added replay-integrity vetoes `runner_sandbox_policy_missing` and `runner_dependency_lock_missing`.
- Added `services/comathd/tests/unit/phase36-runner-replay-provenance.test.mjs` and wired it into the default `@comath/comathd` test chain.
- Added `runner_replay_sandbox_dependency_provenance` to runtime status and smoke requirements.
- Updated README, TODO, acceptance matrix, handoff, AGENTS, security review, and mathematical-integrity review.

### Boundary And Integrity Notes

The recorded sandbox policy is an auditable contract for the current runner execution path: `shell:false`, project-root cwd policy, fixed executable class, and `network: denied_by_contract`. It is not an OS-level sandbox. The dependency lock binds runner id/version, script hash, and Python package presence into replay artifacts so future replay checks can distinguish missing provenance from valid replayable material.

### Residual Risks

- OS-level runner isolation and enforced network denial remain deferred.
- Cross-machine replay validation remains deferred.
- Broader runner-family lockfiles beyond the implemented Python compute runners remain deferred.

## Phase 35 Claim-Scoped Final Replay Artifact Paths Review Log

### Scope

Removed the last hardcoded `C-0001` final replay stage-run artifact pointers from the supported proof-kernel campaign path. Phase 35 fixes a concrete audit-trail bug after Phase 34: supported campaigns could be ensemble-isolated but still report final replay artifact paths under the first claim id when the active root claim was a later claim.

### TDD And Review Evidence

```text
node services/comathd/tests/integration/phase35-final-replay-artifact-paths.test.mjs
Initial RED result: exit 1; the second supported campaign's final replay stage run still pointed at `.comath/evidence/C-0001/lean/...` while `FinalLeanReplay.claim_id` was `C-0002`.

node services/comathd/tests/integration/phase35-final-replay-artifact-paths.test.mjs
Result: exit 0; final replay stage-run artifact paths used the active second-campaign claim id.
```

### Changed Surfaces

- Updated `tickCampaign()` final replay stage-run artifact path generation to use `claim.id`.
- Added `services/comathd/tests/integration/phase35-final-replay-artifact-paths.test.mjs` and wired it into `@comath/comathd` default tests.
- Added `claim_scoped_final_replay_artifacts` to runtime status and smoke requirements.
- Updated README, TODO, acceptance matrix, handoff, AGENTS, security review, and mathematical-integrity review.

### Boundary And Integrity Notes

Phase 35 changes audit-pointer correctness only. It does not alter final replay proof authority, candidate selection, static audit semantics, theorem-family scope, or claim promotion gates. The claim remains formally checked only when the service-owned final replay manifest for that same claim passes the existing gate path.

### Final Boundary Validation

Fresh Phase 35 validation completed on 2026-05-28:

```text
corepack pnpm --filter @comath/comathd build
Result: exit 0; TypeScript build completed after the Phase 35 code and documentation updates.

node services/comathd/tests/integration/phase35-final-replay-artifact-paths.test.mjs
Result: exit 0; Phase 35 final replay artifact path regression passed.

node scripts/phase0-smoke.mjs
Result: exit 0; root smoke checked 25 required entries and 26 invariants.

corepack pnpm --filter @comath/comathd test
Result: exit 0; comathd Phase 0-35 package tests passed with Phase 35 wired into the default test chain.

corepack pnpm test
Result: exit 0; root smoke, Pi extension tests, comathd tests through Phase 35, and Phase 17 integrity evaluation passed.

corepack pnpm typecheck
Result: exit 0; root recursive no-emit typecheck passed for extensions/comath-pi and services/comathd.

git diff --check
Result: exit 0; no whitespace errors reported.

Test-Path -LiteralPath 'D:\MATH _Studio\comath-pi-lab\.comath'
Result: False; no repository-root runtime state was left behind.
```

### Residual Risks

- Claim-scoped paths are covered for registered theorem-family proof campaigns, not arbitrary theorem synthesis.
- Release-bundle provenance is still minimal; richer cross-artifact traceability remains deferred.
- Full interactive Pi/comathd install-session e2e and live Pi/Codex agent adapter execution remain deferred.

## Phase 34 Campaign-Scoped Ensemble Artifacts Review Log

### Scope

Moved proof-kernel ensemble candidate and arbitration artifacts into campaign-scoped runtime paths. Phase 34 fixes a concrete multi-campaign isolation bug left after Phase 33: planning artifacts were campaign-scoped, but supported proof campaigns still shared `.comath/ensembles/lemma_sprint/PO-0001/` for candidates and decisions.

### TDD And Review Evidence

```text
corepack pnpm --filter @comath/comathd build
Result: exit 0; TypeScript build completed before writing the Phase 34 isolation regression.

node services/comathd/tests/integration/phase34-campaign-ensemble-isolation.test.mjs
RED result: exit 1; campaign A read campaign B candidate runs after interleaved candidate-generation ticks.

corepack pnpm --filter @comath/comathd build
Result: exit 0; TypeScript build completed after adding campaign-scoped ensemble paths.

node services/comathd/tests/integration/phase34-campaign-ensemble-isolation.test.mjs
Result: exit 0; interleaved `Nat.add_zero` and `Nat.mul_zero` campaigns kept candidate workspaces, candidate batch indexes, and decisions in campaign-scoped paths.

node services/comathd/tests/integration/phase18-ga-campaign-vertical-slice.test.mjs
Result: exit 0; Phase 18 vertical slice passed with campaign-scoped candidate manifest paths.

node services/comathd/tests/unit/phase19-ga-ensemble-recovery.test.mjs
Result: exit 0; Phase 19 ensemble recovery passed with campaign-scoped candidate workspace and decision artifacts.

node services/comathd/tests/integration/phase23-ga-theorem-family-generalization.test.mjs
Result: exit 0; Phase 23 theorem-family generalization passed with campaign-scoped candidate manifest paths.

corepack pnpm --filter @comath/comathd test
Result: exit 0; comathd Phase 0-34 package tests passed with Phase 34 wired into the default test chain.

corepack pnpm test
Result: exit 0; root smoke, Pi extension tests, comathd tests through Phase 34, and Phase 17 integrity evaluation passed.

corepack pnpm typecheck
Result: exit 0; root recursive no-emit typecheck passed for extensions/comath-pi and services/comathd.
```

### Changed Surfaces

- Added `services/comathd/src/proof-kernel/ensemble/paths.ts`.
- Updated `runTheoremFamilyCandidates()` to write candidate workspaces under `.comath/campaign/<CAM>/ensembles/lemma_sprint/<PO>/candidates/<variant>/`.
- Updated `decideCandidate()` to write `decision.json` under the active campaign's ensemble root.
- Updated campaign tick candidate verification, arbitration, integration, adversarial review, and final replay return paths to read `candidates.json` and `decision.json` from the active campaign.
- Added `services/comathd/tests/integration/phase34-campaign-ensemble-isolation.test.mjs` and wired it into `@comath/comathd` default tests.
- Updated Phase 18, Phase 19, and Phase 23 tests for the new campaign-scoped artifact paths.
- Added `campaign_scoped_ensemble_artifacts` to runtime status and smoke requirements.
- Updated README, TODO, acceptance matrix, handoff, AGENTS, security review, and mathematical-integrity review.

### Boundary And Integrity Notes

Phase 34 does not change candidate scoring or proof authority. It preserves the existing evidence-weighted arbitration semantics, but prevents a selected candidate or decision artifact from being read across campaign boundaries when campaigns reuse local `PO-0001` and `CAND-0001` identifiers.

### Residual Risks

- Candidate IDs remain campaign-local (`CAND-0001` etc.); this is acceptable only because artifacts are now campaign-scoped.
- Live child-agent candidate execution remains deferred; current candidates are deterministic theorem-family slices.
- OS-level sandboxing for untrusted candidate code remains deferred.

## Phase 32 Lean Statement Signature Binding Review Log

### Scope

Hardened statement equivalence by requiring a unique target theorem signature from Lean `#check` output. Phase 32 removes the previous substring-only acceptance path and adds explicit fail-closed vetoes for missing, ambiguous, and mismatched target signatures.

This is not full Lean parser integration and does not prove definitional or logical equivalence across non-identical statements. It is a conservative binding improvement for the current final replay evidence path.

### TDD Evidence

```text
corepack pnpm --filter @comath/comathd exec node tests/unit/phase32-lean-statement-signature.test.mjs
Initial RED result: exit 1; `checkStatementEquivalence()` returned no `target_signature` and still relied on substring matching.

corepack pnpm --filter @comath/comathd exec node tests/unit/phase32-lean-statement-signature.test.mjs
Result: exit 0; Phase 32 Lean statement signature tests passed.
```

### Changed Surfaces

- Added `services/comathd/src/proof-kernel/lean/statement-signature.ts`.
- Updated `services/comathd/src/proof-kernel/lean/statement-equivalence.ts` to require a unique target theorem signature and emit `missing_target_check_output`, `ambiguous_target_check_output`, or `statement_signature_mismatch` vetoes.
- Exported the signature helper from `services/comathd/src/index.ts`.
- Added `services/comathd/tests/unit/phase32-lean-statement-signature.test.mjs`.
- Added Phase 32 to the default `@comath/comathd` test chain and phase tracking documents.

### Boundary And Integrity Notes

Statement equivalence now ignores target theorem text embedded inside arbitrary log lines. A passing report requires exactly one line beginning with the requested theorem name and matching the normalized formal spec signature.

### Residual Risks

- Definitional equivalence and registered-lemma logical equivalence still need Lean/parser-level support.
- The signature parser is conservative and line-oriented; it may block valid pretty-printer formats until those formats are explicitly supported.
- Broad proof planning and theorem synthesis beyond registered theorem families remain unresolved GA blockers.

## Phase 31 Lean Trust Profile Hardening Review Log

### Scope

Hardened Lean final-proof authority around configurable axiom trust profiles and skeleton-only placeholder policy. Phase 31 does not broaden theorem synthesis, add a Lean parser, or complete transitive Lake dependency semantics; it makes the existing final replay gate more explicit and more fail-closed.

### TDD Evidence

```text
corepack pnpm --filter @comath/comathd exec node tests/unit/phase31-lean-trust-profile.test.mjs
Initial RED result: exit 1; `checkAxiomProfile()` did not return or enforce a project-level `trust_profile`.

corepack pnpm --filter @comath/comathd exec node tests/unit/phase31-lean-trust-profile.test.mjs
Second RED result: exit 1; missing target-theorem `#print axioms` output did not produce `missing_target_axiom_report`.

corepack pnpm --filter @comath/comathd exec node tests/unit/phase31-lean-trust-profile.test.mjs
Result: exit 0; Phase 31 Lean trust profile tests passed.
```

### Changed Surfaces

- Added `services/comathd/tests/unit/phase31-lean-trust-profile.test.mjs`.
- Extended `services/comathd/src/proof-kernel/lean/axiom-profile.ts` with configurable `LeanTrustProfile`, target-theorem axiom-report detection, and fail-closed `missing_target_axiom_report`.
- Extended `services/comathd/src/proof-kernel/lean/static-cheat-scan.ts` with explicit skeleton allowlisting for `sorry`.
- Added Phase 31 to the default `@comath/comathd` test chain and phase tracking documents.

### Boundary And Integrity Notes

Trust profiles only govern which Lean axioms may pass the axiom-profile gate. They do not certify statement equivalence, dependency closure, static proof integrity, clean replay, or claim promotion.

Skeleton `sorry` allowlisting is opt-in per relative Lean file. Final proof files remain fail-closed on `sorry`, `admit`, unauthorized `axiom`, unauthorized `constant`, `unsafe`, and `opaque`.

### Residual Risks

- Statement equivalence still needs theorem-signature extraction rather than stdout substring matching.
- Axiom-profile extraction still parses Lean text output; it is target-bound but not yet a Lean environment object.
- Dependency closure is still local-file/import-hash oriented and not a full transitive Lake/mathlib trust proof.
- Broad proof planning and theorem synthesis beyond registered theorem families remain unresolved GA blockers.

## Phase 30 Pi Agent Profile Runtime UX Review Log

### Scope

Added a Pi runtime-facing agent profile UX over the Phase 29 `comathd` profile API. Phase 30 exposes `comath.agent.profileList`, `comath.agent.profileGet`, `comath.agent.runForProfile`, `comath.agent.prepareLaunch`, and `/cm:agent` command dispatch while keeping Pi as a thin client.

This phase does not execute a live Pi/Codex remote worker pool and does not make agent profiles proof authorities. Mutating profile actions still require Pi host confirmation and route through `comathd`; the extension still does not read or write `.comath/` directly.

### TDD Evidence

```text
corepack pnpm --filter @comath/pi-extension exec node tests/phase30-agent-profile-tools.test.mjs
Initial RED result: exit 1; `comath.agent.profileList` was not registered.

corepack pnpm --filter @comath/pi-extension exec node tests/phase30-agent-profile-tools.test.mjs
Parser RED result: exit 1; `/cm:agent profile proof-route` was parsed as the default `profiles` action until `agent` joined the subcommand-aware command list.

corepack pnpm --filter @comath/pi-extension exec node tests/phase30-agent-profile-tools.test.mjs
UX RED result: exit 1; missing `workstream_id` prompted for mutation confirmation before local argument validation.

corepack pnpm --filter @comath/pi-extension exec node tests/phase30-agent-profile-tools.test.mjs
Result: exit 0; Phase 30 Pi agent profile tool tests passed.

corepack pnpm --filter @comath/pi-extension test
Result: exit 0; Pi extension tests passed with Phase 30 wired into the default package test chain.
```

### Changed Surfaces

- Added `extensions/comath-pi/tests/phase30-agent-profile-tools.test.mjs`.
- Added agent profile tool descriptors and `executeComathTool()` routing in `extensions/comath-pi/src/index.ts`.
- Added `/cm:agent` runtime command handling in `extensions/comath-pi/src/index.ts`.
- Added `/cm:agent` metadata in `extensions/comath-pi/src/runtime-registration.ts`.
- Updated `extensions/comath-pi/package.json` and Phase 26 registration tests so Phase 30 is part of the default Pi extension verification chain.

### Boundary And Integrity Notes

Read-only profile actions call `GET /agent/profile/list` and `GET /agent/profile/:id`. Mutating actions call `POST /agent/run/profile` and `POST /agent/run/profile/prepare-launch` only after Pi host confirmation. Runtime schemas continue to hide `confirmation_id` from model-supplied parameters.

Local command parsing validates required `project_id`, `workstream_id`, `run_id`, `program`, `goal`, and `context_path` before asking the host to confirm a mutation.

### Residual Risks

- Live Pi/Codex agent adapter execution remains deferred; Phase 30 provides product-facing controls for service-owned profile/run/launch contracts.
- Rich widgets/status UI and a full interactive Pi/comathd install-session e2e remain deferred.
- OS-level process sandboxing, network denial, multi-process writer locks, and log streaming APIs remain deferred.

## Phase 25 Real MathProve External Bridge Review Log

### Scope

Added a service-owned external MathProve evidence-runner bridge for `MathProve-Skill` `verify_sympy.py`. Phase 25 upgrades the earlier mock-only MathProve boundary in a narrow executable sense: CoMath can now invoke the sibling MathProve skill package, archive the result, and feed the resulting vetoes into the normal gate.

This is not broad MathProve proof search and not a MathProve proof-authority path. `formally_checked` still requires CoMath proof-kernel replay evidence and the ordinary promotion gate.

### TDD Evidence

```text
node services/comathd/tests/unit/phase25-real-mathprove-bridge.test.mjs
Initial RED result: exit 1; `runMathProveBridgeExternal` was not exported.

corepack pnpm --filter @comath/comathd build
Result: exit 0; TypeScript build completed after adding the external bridge.

node services/comathd/tests/unit/phase25-real-mathprove-bridge.test.mjs
Debugging RED result: exit 1; external MathProve invocation failed because `verify_sympy.py` wrote a relative `logs/tool_calls.log` path without the log directory existing.

python <MathProve-Skill>/scripts/verify_sympy.py --workspace-dir <temp> --run-dir run --log <temp>/logs/tool_calls.log --timeout 5 --code "x=symbols('x'); emit({'ok': bool(expand((x+1)**2) == x**2 + 2*x + 1)})"
Result: exit 0; MathProve-Skill `verify_sympy.py` returned `status=success` and `output.ok=true` when given a controlled absolute log path.

node services/comathd/tests/unit/phase25-real-mathprove-bridge.test.mjs
Result: exit 0; Phase 25 real MathProve bridge tests passed.

Code-review hardening RED result: exit 1; `scrubHostPaths()` only removed the drive-prefix portion of Windows paths containing spaces, leaving a host-specific suffix.

Code-review hardening RED result: exit 1; arbitrary `mathprove_root` overrides were treated as unavailable runners rather than rejected as untrusted command roots before invocation.

node services/comathd/tests/unit/phase25-real-mathprove-bridge.test.mjs
Result: exit 0; Phase 25 tests passed after pinning the external root, improving Windows path scrubbing, and rejecting MathProve authority escalation.
```

### Changed Surfaces

- Added `runMathProveBridgeExternal()` and `phase25-external-v1` result metadata to `services/comathd/src/verification/mathprove.ts`.
- Refactored MathProve bridge report archival so mock and external backends both persist reports under `.comath/evidence/<claim>/mathprove`, import them as `runner_output`, record audit evidence, and append `mathprove.bridge_ran`.
- Added external-run metadata: runner id/version, MathProve root, script path/hash, controlled workspace, fixed argv template, timeout, network flag, exit code, stdout/stderr/result hashes, and replay input hash.
- Added fail-closed external paths for missing runner and claim statement-hash mismatch before invocation.
- Pinned `mathprove_root` overrides to the realpath-equivalent sibling `MathProve-Skill` root and reject untrusted roots before Python invocation.
- Scrubbed host paths from persisted external MathProve metadata and nested stdout/stderr/result payloads.
- Extended `promoteClaimWithMathProveBridge()` with `{ backend: "external" }` while preserving the mock default.
- Added `services/comathd/tests/unit/phase25-real-mathprove-bridge.test.mjs` and wired it into the default `@comath/comathd` test chain.
- Added `mathprove_external_evidence_runner` to `getComathdStatus()` and smoke coverage.

### Boundary And Integrity Notes

The external bridge invokes only `MathProve-Skill` `scripts/verify_sympy.py` through `execFile` with a fixed argv shape and `shell:false`. CoMath owns the workspace under `.comath/evidence/<claim>/mathprove/external-workspace`, pre-creates the log directory, and hashes stdout, stderr, parsed result, script, and replay input.

The SymPy check is a deterministic external-runner smoke and carries the current claim id plus statement hash as binding metadata. It is not a proof of the claim statement. Even when MathProve returns `status=success` and `output.ok=true`, the bridge result keeps `gate_result=failed` and emits vetoes such as `mathprove_external_not_claim_proof`, `mathprove_external_not_formal_authority`, and `missing_kernel_checked_artifact`.

### Residual Risks

- Phase 25 covers only the external `verify_sympy.py` runner path, not MathProve `final_audit.py`, Lean checking through MathProve, route synthesis, or broad proof search.
- The external bridge records `network=false` intent and uses fixed argv/timeouts, but it is not yet an OS-enforced sandbox or dependency-locked replay environment.
- External root overrides are accepted only when they resolve to the realpath-equivalent sibling `MathProve-Skill` root; broader MathProve runner configuration remains deferred.
- At this historical Phase 25 checkpoint, broad proof planning, production Pi runtime registration, native TriviumDB validation, persistent child-agent scheduling, and richer statement equivalence remained global GA blockers; the current blocker set is superseded by `TODO.md` and the Phase 28 review log.

### Final Root Validation

Fresh Phase 25 validation completed on 2026-05-27:

```text
corepack pnpm --filter @comath/comathd test
Result: exit 0; comathd Phase 0-25 package tests passed, including the real MathProve bridge, authority-boundary, host-path scrub, and theorem-family integration coverage.

corepack pnpm --filter @comath/pi-extension test
Result: exit 0; Pi extension tests passed after Phase 25 status/doc updates.

corepack pnpm build
Result: exit 0; root recursive build passed for extensions/comath-pi and services/comathd.

corepack pnpm typecheck
Result: exit 0; root recursive no-emit typecheck passed for extensions/comath-pi and services/comathd.

corepack pnpm test
Result: exit 0; Phase 0/design smoke, workspace package tests, Phase 25 comathd bridge tests, proof-kernel integrations, Pi extension regressions, and Phase 17 integrity evaluation passed.
```

## Phase 24 Runner Re-Execution Replay Review Log

### Scope

Added service-owned deterministic re-execution for replayable compute runner reports. Phase 24 strengthens `/replay/verify-manifest` so it no longer relies only on snapshot/replay manifest integrity: `sympy-exact` and `counterexample-search` reports are rerun from stored canonical input, while placeholder runners remain explicitly skipped.

This is not a full OS-level sandbox or cross-machine reproducibility layer. Stronger network-denial enforcement, dependency lock capture, and cross-machine replay validation remain deferred.

### TDD Evidence

```text
node services/comathd/tests/unit/phase10-compute-runners.test.mjs
Initial RED result: exit 1; runner reports did not contain `metadata.replay_input_json`, so canonical replay input could not be reconstructed.

corepack pnpm --filter @comath/comathd build
Result: exit 0; TypeScript build completed after adding canonical replay input metadata.

node services/comathd/tests/unit/phase10-compute-runners.test.mjs
Result: exit 0; compute runner reports now persist canonical replay input JSON and matching input hashes.

node services/comathd/tests/unit/phase16-snapshot-replay.test.mjs
Initial RED result: exit 1; strict replay route still returned `ok=true` after a snapshot-local runner report's script hash was forged.

node services/comathd/tests/unit/phase16-snapshot-replay.test.mjs
Review-strengthened RED result: exit 1; `/replay/verify-manifest` returned no per-runner `runner_reexecution` summaries.

node services/comathd/tests/unit/phase16-snapshot-replay.test.mjs
Review-strengthened RED result: exit 1; replay manifest/report drift with recomputed manifest hashes was not rebound to the actual runner report fields.

node services/comathd/tests/unit/phase16-snapshot-replay.test.mjs
Review-strengthened RED result: exit 1; snapshot entry hash mismatch still allowed the test to reach runner-level re-execution checks.

node services/comathd/tests/unit/phase16-snapshot-replay.test.mjs
Review-strengthened RED result: exit 1; a replay report with an oversized `timeout_ms` still passed strict replay after manifest hashes were recomputed.

node services/comathd/tests/unit/phase16-snapshot-replay.test.mjs
Review-strengthened RED result: exit 1; report-local `stdout_sha256` metadata could be forged alongside replay manifest hashes without a static stdio self-consistency veto.

corepack pnpm --filter @comath/comathd build
Result: exit 0; TypeScript build completed after adding strict runner re-execution and replay summaries.

node services/comathd/tests/unit/phase16-snapshot-replay.test.mjs
Result: exit 0; strict replay route re-executes `sympy-exact` and `counterexample-search`, skips placeholders, and fails closed on replay/report drift, static snapshot vetoes, script hash drift, canonical input hash drift, oversized replay timeout, report-local stdio hash drift, and untrusted replay argv.
```

### Changed Surfaces

- Added `replay_input_json` and `replay_input_sha256` to compute runner metadata in `services/comathd/src/verification/runner-contracts.ts`.
- Added `verifyRunnerReportReexecution()` in `services/comathd/src/artifacts/replay.ts`.
- Added `VerifySnapshotOptions.reexecuteRunners` and per-runner `runner_reexecution` summaries in `services/comathd/src/artifacts/snapshots.ts`.
- Added replay/report binding vetoes (`replay_run_duplicate`, `replay_run_report_missing`, `replay_run_missing`, `replay_run_report_mismatch`) so replay runs must match the actual snapshot runner report fields before Python execution is considered.
- Changed `/replay/verify-manifest` to call `verifySnapshot(..., { reexecuteRunners: true })` while ordinary `/snapshot/verify` and restore remain static snapshot-integrity checks.
- Added Phase 24 coverage to `phase10-compute-runners.test.mjs` and `phase16-snapshot-replay.test.mjs`.
- Added `runner_reexecution_replay` to `getComathdStatus()` and replaced the old residual risk with `stronger_runner_reexecution_sandbox_deferred`.

### Boundary And Integrity Notes

Strict runner replay reconstructs command shape from the fixed service runner registry. It does not trust report-local absolute paths, manifest replay descriptors, or arbitrary argv. The stored canonical input must hash back to the recorded input hash, report-local stdio fields must match their metadata hashes when untruncated, oversized report-supplied replay timeouts are rejected, and the current runner script hash must match the recorded script hash before re-execution can pass.

Runner reports do not currently carry a report-local `self_hash` or host `report_path`. Snapshot binding is instead represented by snapshot entry `relative_path`, `sha256`, and `size_bytes`, plus replay manifest `report_relative_path` and runner-field matching. This avoids host path leakage while still rebinding replay runs to the actual copied runner report.

Replay success is an integrity signal for prior compute evidence, not a claim-promotion authority. Symbolic/computational promotion still goes through the existing evidence/artifact/audit gate, and formal proof authority still belongs to service-owned Lean replay artifacts.

### Residual Risks

- Strict replay currently covers the implemented Python compute runners only: `sympy-exact` and `counterexample-search`.
- It relies on the local Python/SymPy environment and script hash checks, not a captured dependency lockfile or container image.
- It uses `execFile` with `shell:false`, timeouts, fixed scripts, and fixed argv shape, but it is not yet an OS-level sandbox with enforced network denial.
- Cross-machine replay validation, dependency-version capture, richer runner families, and external signed snapshot verification remain future work.

## Phase 23 Proof-Kernel Theorem-Family Registry Review Log

### Scope

Generalized the native proof-kernel proof campaign from a single hardcoded `Nat.add_zero` proof slice into an explicit registered theorem-family layer. Phase 23 adds the second true elementary Nat theorem family, `Nat.mul_zero`, while preserving the existing `Nat.add_zero` proof path, exact `n + 1 = n` refutation path, 8-candidate ensemble shape, `C0001` Lean target, `PO-0001` obligation contract, and v3 public campaign states.

This is not arbitrary theorem proving. Only registered theorem families can produce proof candidates or clean replay projects; unsupported goals still fail closed.

### TDD And Review Evidence

```text
corepack pnpm --filter @comath/comathd exec node tests/integration/phase23-ga-theorem-family-generalization.test.mjs
Initial RED result: exit 1; `n * 0 = 0 for natural numbers` was incorrectly locked as `n + 0 = n` because `classifyLockedProblem()` used `natural` as an add-zero fallback.

corepack pnpm --filter @comath/comathd build
Result: exit 0; TypeScript build completed after introducing theorem-family registry, Lean project generation, replay command parameterization, and candidate-runner parameterization.

corepack pnpm --filter @comath/comathd exec node tests/integration/phase23-ga-theorem-family-generalization.test.mjs
Result: exit 0; `Nat.mul_zero` campaign locks `n * 0 = 0`, generates family-specific candidates, writes Lean/FormalSpec/Audit files, passes clean replay, promotes through the gate, and passes replay route.

corepack pnpm --filter @comath/comathd exec node tests/integration/phase23-ga-integrity-boundaries.test.mjs
Review-strengthened RED result: exit 1; unsupported campaigns could return stale ensemble data from a prior supported campaign in the same project root.

corepack pnpm --filter @comath/comathd exec node tests/integration/phase23-ga-integrity-boundaries.test.mjs
Result: exit 0; integrity-boundary regressions now cover stale ensemble prevention, theorem-family/proposition mismatch blocking, and completed-refutation replay immutability.
```

### Changed Surfaces

- Added `services/comathd/src/proof-kernel/lean/theorem-family.ts` with registered `nat_add_zero` and `nat_mul_zero` family definitions.
- Added `createLeanProjectForTheorem()` while keeping `createNatAddZeroLeanProject()` as a compatibility wrapper.
- Parameterized clean Lean replay commands over the generated Lean project instead of hardcoding only the add-zero theorem body.
- Added `runTheoremFamilyCandidates()` while keeping `runTrivialNatAddZeroCandidates()` as a compatibility wrapper.
- Added theorem-family metadata to candidate manifests and final replay manifests: family id, canonical proposition, primary dependency, normalized statement, and locked statement hash.
- Hardened promotion so `formally_checked` requires a passed proof-kernel replay manifest whose locked statement hash matches the claim statement hash.
- Hardened campaign replay so completed refutation campaigns return a read-only blocker instead of mutating `completed_refutation` into a blocked proof-replay state.
- Hardened unsupported campaign blocking so no stale ensemble decision is returned and unsupported goals fail closed before theorem-family candidates are fabricated.
- Added `phase23-ga-theorem-family-generalization.test.mjs` and `phase23-ga-integrity-boundaries.test.mjs` to the default `@comath/comathd` test chain.
- Added `proof_kernel_theorem_family_registry` to `getComathdStatus()`.

### Boundary And Integrity Notes

The theorem-family id is advisory only unless it matches the locked proposition, locked natural-language statement, and Lean target. A mismatched obligation is blocked before candidate generation. Final replay evidence is now bound to the promoted claim through the claim statement hash, reducing the risk that a replay of one registered theorem is attached to a different claim.

The registered families still share the public `MathResearch.C0001` target for compatibility with the existing Phase 18/19/20 contracts, but the replay manifest carries the family id, canonical proposition, normalized statement, primary dependency, and locked statement hash so audit consumers do not have to infer the proved proposition from the theorem name alone.

### Residual Risks

- The proof-kernel supports registered elementary Nat families only: `Nat.add_zero` and `Nat.mul_zero`, plus exact refutation of `n + 1 = n`.
- There is still no broad theorem synthesis, Lean parser integration, semantic statement equivalence, or real MathProve proof search.
- Candidate artifact paths still use the Phase 18 `PO-0001`/`C0001` layout; multi-obligation and multi-theorem campaigns remain future work.
- At this historical Phase 24 checkpoint, production Pi runtime registration, real persistent child-agent scheduling, native TriviumDB target validation, and stronger OS/network runner replay sandboxing remained deferred; the current blocker set is superseded by `TODO.md` and the Phase 28 review log.

### Final Root Validation

Fresh Phase 23 validation completed on 2026-05-27:

```text
corepack pnpm --filter @comath/comathd test
Result: exit 0; comathd Phase 0-23 package tests passed, including theorem-family generalization and integrity-boundary coverage.

corepack pnpm --filter @comath/pi-extension test
Result: exit 0; Pi extension tests passed after comathd manifest/schema hardening.

corepack pnpm build
Result: exit 0; root recursive build passed for extensions/comath-pi and services/comathd.

corepack pnpm typecheck
Result: exit 0; root recursive no-emit typecheck passed for extensions/comath-pi and services/comathd.

corepack pnpm test
Result: exit 0; Phase 0/design smoke, workspace package tests, Phase 23 comathd tests, Pi extension regressions, and Phase 17 integrity evaluation passed.
```

## Phase 22 Pi Research Campaign Loop Review Log

### Scope

Added a Pi-side one-command research campaign loop so `/cm:research "<goal>" --goal --strict` and `comath.research.runCampaignLoop` can start a service-owned campaign, advance bounded ticks through `comathd`, and return a service-backed dashboard snapshot. Phase 22 moves the Pi layer beyond descriptor-only campaign tools, while keeping proof authority, promotion gates, artifacts, and runtime state ownership in `comathd`.

### TDD And Review Evidence

```text
corepack pnpm --filter @comath/pi-extension build; corepack pnpm --filter @comath/pi-extension exec node tests/phase22-research-loop.test.mjs
Initial RED result: exit 1; `../dist/index.js` did not provide `buildResearchCampaignLoopInput`.

corepack pnpm --filter @comath/pi-extension build; corepack pnpm --filter @comath/pi-extension exec node tests/phase22-research-loop.test.mjs
Reviewer-strengthened RED result: exit 1; `../dist/index.js` did not provide `issueCampaignLoopCapability`, exposing that the loop helper was not yet tied to confirmation/capability issuance.

corepack pnpm --filter @comath/pi-extension build; corepack pnpm --filter @comath/pi-extension exec node tests/phase22-research-loop.test.mjs
Parser/capability RED result: exit 1; `/cm:research start --goal "n + 0 = n"` incorrectly set `strict_mode=true` because `--goal` was treated as both value flag and strict marker.

corepack pnpm --filter @comath/pi-extension build; corepack pnpm --filter @comath/pi-extension exec node tests/phase22-research-loop.test.mjs
Result: exit 0; Phase 22 research loop tests passed for quote-aware command parsing, target-scoped capability issuance, command-loop execution, tool-loop execution, bounded tick budget, and dashboard return.
```

### Changed Surfaces

- Added `extensions/comath-pi/src/research-loop.ts`.
- Added `extensions/comath-pi/tests/phase22-research-loop.test.mjs` and wired it into the default `@comath/pi-extension` test chain.
- Made `/cm:*` parsing quote-aware, with escaped quotes and unterminated quote rejection.
- Added `issueCampaignLoopCapability()` so campaign-loop capability issuance requires a positive mutation confirmation for `/cm:research` or `comath.research.runCampaignLoop`.
- Added `runResearchCampaignLoop()` for bounded `campaign/start -> campaign/tick* -> dashboard` orchestration through the existing client boundary.
- Added `runComathResearchCommand()` and the mutating `comath.research.runCampaignLoop` tool descriptor/handler.
- Added `pi_research_campaign_loop` to `getComathdStatus()` and updated README, TODO, acceptance, risk, handoff, extension, and math-integrity notes.

### Boundary And Integrity Notes

The loop does not read or write `.comath/` directly and does not import service internals. It only calls `comathd` through the extension client. A campaign-loop capability is scoped by project root, actor, confirmation ID, target, and tick budget; denied confirmations and unrelated confirmation targets fail closed.

The loop can start and tick a campaign, but it cannot promote a claim by itself. Formal proof authority remains the service-owned proof-kernel replay plus gate-mediated promotion path.

### Residual Risks

- At this historical Phase 22 checkpoint, production Pi runtime registration was still not validated against the installed Pi API.
- The loop was a thin-client orchestration path, not a real persistent child-agent scheduler; Phase 28 later added bounded service-side process scheduling.
- Generic proof planning, real MathProve execution, native TriviumDB target validation, runner re-execution replay, and richer statement equivalence remained global GA blockers at that point; the current blocker set is superseded by `TODO.md` and the Phase 28 review log.

### Final Root Validation

Fresh Phase 22 validation completed on 2026-05-27:

```text
corepack pnpm --filter @comath/pi-extension test
Result: exit 0; Pi extension tests passed, including Phase 22 command/tool campaign-loop coverage and previous extension regressions.

corepack pnpm --filter @comath/comathd test
Result: exit 0; comathd Phase 0-21 package tests passed after adding the Phase 22 status capability.

corepack pnpm test
Result: exit 0; Phase 0/design smoke, workspace package tests, Phase 22 research loop, Phase 21 read-model routes, proof-kernel campaign regressions, and Phase 17 integrity evaluation passed.
```

## Phase 21 Service Read-Model Dashboard Review Log

### Scope

Added service-owned read-only list routes for claim, evidence, and gate-result state, then moved the Pi dashboard aggregator from degraded paper-derived placeholders to those routes. Phase 21 improves product inspection and dashboard fidelity; it does not change proof authority, promotion rules, or mathematical gate semantics.

### TDD Evidence

```text
node services/comathd/tests/integration/phase21-read-model-routes.test.mjs
Initial RED result: exit 1; route injection returned 404 for missing `/claim/list`, `/evidence/list`, and `/gate/list`.

corepack pnpm --filter @comath/comathd build
Result: exit 0; TypeScript build completed after adding read-model routes.

node services/comathd/tests/integration/phase21-read-model-routes.test.mjs
Result: exit 0; Phase 21 read-model route tests passed for claim/evidence/gate boards and claim-filtered gate results.

corepack pnpm --filter @comath/pi-extension build; corepack pnpm --filter @comath/pi-extension exec node tests/phase15-dashboard.test.mjs
Initial RED result after review: exit 1; paper-only margin provenance still appeared in the claim/evidence board without a degraded marker.

corepack pnpm --filter @comath/pi-extension build; corepack pnpm --filter @comath/pi-extension exec node tests/phase15-dashboard.test.mjs
Result: exit 0; dashboard board aggregation now treats `/claim/list`, `/evidence/list`, and `/gate/list` as the sole claim/evidence/gate board sources while retaining paper margin provenance only in paper/blocker sections.

corepack pnpm --filter @comath/pi-extension test
Result: exit 0; Pi extension tests passed, including dashboard aggregation over `/claim/list`, `/evidence/list`, and `/gate/list`.
```

### Changed Surfaces

- Added `GET /claim/list`, `GET /evidence/list`, and `GET /gate/list` to `services/comathd/src/api/server.ts`.
- Added `services/comathd/tests/integration/phase21-read-model-routes.test.mjs` and wired it into the default `@comath/comathd` test chain.
- Updated `extensions/comath-pi/src/renderers.ts` so dashboard aggregation reads claim, evidence, and gate boards through `comathd` routes.
- Added `GateBoardItem` and gate blockers to `extensions/comath-pi/src/widgets.ts` and dashboard renderers.
- Updated Phase 15 dashboard tests so `claim_list_unavailable`, `evidence_list_unavailable`, and `gate_result_list_unavailable` are no longer expected for the implemented service read models.
- Added a regression guard that paper-only margin claims/evidence cannot silently populate the claim/evidence board.
- Added `claim_evidence_gate_read_models` to `getComathdStatus()`.

### Boundary And Integrity Notes

The new routes are inspection surfaces only. They call existing store readers and expose persisted claim, evidence, and gate-result records; they do not promote claims, apply GraphPatch, repair state, export snapshots, or write dashboard artifacts.

The Pi dashboard remains a thin client over `comathd` read routes. It still avoids service-internal imports and direct `.comath/` filesystem reads/writes. Failed gate vetoes can now appear as dashboard blockers, but those blockers are explanatory UI state, not proof authority.

Paper margin provenance remains visible in the Paper and Blockers sections. It is no longer used as a hidden fallback to create claim/evidence board rows after service read models exist.

### Residual Risks

- The dashboard still has text/TUI renderers rather than validated production Pi runtime registration.
- Route responses are service-owned JSON read models, not a richer query/index layer over native TriviumDB.
- At this historical Phase 21 checkpoint, global GA remained blocked by generic proof planning, real MathProve execution, real child-agent scheduling, native TriviumDB validation, sandboxed runner re-execution, production Pi registration, and richer statement equivalence; the current blocker set is superseded by `TODO.md` and the Phase 28 review log.

### Final Root Validation

Fresh Phase 21 validation completed on 2026-05-27:

```text
corepack pnpm --filter @comath/comathd test
Result: exit 0; comathd Phase 0-20 tests plus Phase 21 read-model route tests passed.

corepack pnpm --filter @comath/pi-extension test
Result: exit 0; Pi extension tests passed, including the Phase 15 dashboard service-read-model regression.

corepack pnpm test
Result: exit 0; Phase 0/design smoke, workspace package tests, Phase 21 read-model routes, dashboard tests, and Phase 17 integrity evaluation passed.
```

## Goal 3 Task 93 Notation Gate Formal-Spec-Derived Review Log

### Scope

Removed the remaining Nat-specific notation wording from the native campaign `notation_gate` artifacts. The change does not add theorem synthesis or proof authority; it makes notation provenance explicit and non-promotional.

### TDD Evidence

```text
corepack pnpm --filter @comath/comathd build
Result: exit 0.

node services/comathd/tests/unit/goal3-task93-notation-gate-formal-spec-derived.test.mjs
Initial RED result: exit 1; `Definitions.lean` contained `Lean Nat notation`.

node services/comathd/tests/unit/goal3-task93-notation-gate-formal-spec-derived.test.mjs
Second RED result: exit 1; `createProofObligationFromFormalSpecLock()` dropped `notation_conventions`.

node services/comathd/tests/unit/goal3-task93-notation-gate-formal-spec-derived.test.mjs
Result: exit 0; notation gate no longer emits default Nat wording, records non-authoritative provenance, and preserves FormalSpecLock notation conventions.

corepack pnpm --filter @comath/comathd typecheck
Result: exit 0.

corepack pnpm --filter @comath/comathd test
Result: exit 0; full comathd chain passed with Task93 wired into the default script.
```

### Changed Surfaces

- `services/comathd/src/proof-kernel/campaign/formal-spec-lock.ts` now carries `FormalSpecLock.notation_conventions` into `ProofObligation.locked_statement_structured`.
- `services/comathd/src/proof-kernel/campaign/campaign-tick.ts` now renders notation from FormalSpecLock conventions when present and otherwise falls back to `.comath/lock/notation.md`.
- `notation_gate.json` now records `notation_source`, `notation_lock_path`, `notation_conventions`, `locked_statement_hash`, `default_notation_injected: false`, `proof_authority: "none"`, and `can_promote_claim: false`.
- Added `services/comathd/tests/unit/goal3-task93-notation-gate-formal-spec-derived.test.mjs` and wired it into the default `@comath/comathd` test chain.

### Boundary And Integrity Notes

The notation gate remains a stage artifact, not proof authority. It does not infer theorem-domain notation, inject `n : Nat`, or promote claims. The only promotion-grade mathematical authority remains final Lean/mathlib clean replay plus the existing integrity gates.

### Residual Risks

Task93 does not execute a real Lean/mathlib clean replay and does not broaden proof synthesis. Generic campaigns still fail closed at broad theorem planning/final replay boundaries. The workstation still needs a configured Lean toolchain before live replay blockers can be retired.

## Phase 20 GA Campaign State-Machine Vertical-Slice Review Log

### Scope

Aligned the public `ResearchCampaign` state machine with the v3 goal-instruction state set while preserving the existing proof-kernel artifact stage names internally. Phase 20 changes API-visible campaign stages and terminal states; it does not broaden theorem synthesis or replace the Phase 18-19 proof/refutation slices.

### TDD Evidence

```text
node services/comathd/tests/unit/phase20-ga-campaign-state-machine.test.mjs
Initial RED result: exit 1; `campaignStageSchema` rejected required v3 state `problem_locked` and still accepted old public stages.

corepack pnpm --filter @comath/comathd build
Result: exit 0; TypeScript build completed after schema/stage split and campaign tick migration.

node services/comathd/tests/unit/phase20-ga-campaign-state-machine.test.mjs
Result: exit 0; Phase 20 GA campaign state-machine tests passed. The expanded test asserts terminal-state invariants, the complete proof path order, the exact-refutation shortcut boundary, and an unsupported-goal blocker instead of false proof completion.

node services/comathd/tests/integration/phase18-ga-campaign-vertical-slice.test.mjs
Result: exit 0; positive proof vertical slice still passes with canonical public states.

node services/comathd/tests/integration/phase18-ga-refutation-path.test.mjs
Result: exit 0; refutation slice now terminates as `completed_refutation`.

node services/comathd/tests/integration/phase18-ga-snapshot-replay.test.mjs
Result: exit 0; snapshot restore and proof replay still pass with `completed_formal_proof`.

corepack pnpm --filter @comath/comathd test
Result: exit 0; comathd package tests passed with Phase 20 included in the default chain.
```

### Changed Surfaces

- Updated `campaignStageSchema` to the v3 public state set and `campaignTerminalStateSchema` to `completed_formal_proof`, `completed_refutation`, `blocked_with_replayable_reason`, and `cancelled_by_user`.
- Added `proofKernelStageSchema` so internal candidate/gate artifacts can still use proof-stage names such as `lemma_sprint` and `final_global_lean_replay`.
- Split `tickCampaign()` into bounded public states: `problem_locked`, `context_built`, `planning`, `candidate_generation`, `candidate_verification`, `candidate_arbitration`, `integration`, `adversarial_review`, `final_static_audit`, `final_global_replay`, and canonical terminal states.
- Added service-owned context, plan, verification, integration, adversarial-review, and final-audit plan artifacts under `.comath/campaign/<id>/`.
- Blocked unsupported theorem targets at `final_global_replay` with `blocked_with_replayable_reason` instead of generating the hardcoded `Nat.add_zero` replay for unrelated goals.
- Added `services/comathd/tests/unit/phase20-ga-campaign-state-machine.test.mjs` and wired it into the default comathd test chain.
- Updated Phase 18/19 tests to use canonical public campaign states while retaining internal `lemma_sprint` artifact path checks.
- Added `campaign_state_machine_v3` to `getComathdStatus()`.

### Boundary And Integrity Notes

Public campaign state is now owned by `comathd` and uses the v3 vocabulary required by the goal instruction. Old names such as `problem_lock`, `lemma_sprint`, `final_global_lean_replay`, and `terminal` are rejected as public campaign stages. They remain available only where they describe proof-kernel artifacts or candidate/gate stages.

No campaign completes because a report was written or because agents agree. The formal-proof terminal state still requires the final replay/promotion gate path; the refutation terminal state still requires the exact counterexample path.

### Residual Risks

- The state machine was canonical for the implemented proof and refutation slices, but generic proof planning and real agent scheduling remained deferred at that historical checkpoint.
- The context and planning artifacts are deterministic service-owned capsules, not full Trivium-backed active retrieval or production Pi/Codex child-agent profile integration.
- Global GA remains blocked by the deferred items in `TODO.md`; Phase 20 validates public campaign state semantics, not autonomous research completion.

One Phase 17 evaluation assertion was updated after root-cause analysis: dashboard-only files still forbid `client.post`, filesystem writes, service-internal imports, and direct `.comath` access, while the extension entrypoint is checked separately so Phase 18 thin-client mutating campaign tools may call `comathd` without direct runtime-file writes.

## Phase 19 GA Ensemble Recovery Review Log

### Scope

Implemented the v3 16.4 ensemble recovery regression for the existing elementary proof-kernel slice. Phase 19 does not broaden theorem synthesis; it makes the current 8-candidate path preserve the required seven-failures-plus-one-Lean-pass evidence shape and turns V8 dialectical stress into a typed artifact.

### TDD Evidence

```text
node services/comathd/tests/unit/phase19-ga-ensemble-recovery.test.mjs
Initial RED result: exit 1; failed on missing V8 dialectical_stress.json existence assertion.

corepack pnpm --filter @comath/comathd build
Result: exit 0; TypeScript build completed after implementation.

node services/comathd/tests/unit/phase19-ga-ensemble-recovery.test.mjs
Result: exit 0; Phase 19 GA ensemble recovery tests passed.
```

### Changed Surfaces

- Added `services/comathd/tests/unit/phase19-ga-ensemble-recovery.test.mjs`.
- Added `dialecticalStressSchema` and `DialecticalStress` to `services/comathd/src/types/schemas.ts`.
- Added V8 `dialectical_stress.json` writing in `services/comathd/src/proof-kernel/ensemble/candidate-runner.ts`.
- Added the Phase 19 unit test to `@comath/comathd` default test chain.
- Added `proof_kernel_ensemble_recovery` to `getComathdStatus()`.
- Updated README, TODO, acceptance matrix, math integrity notes, risk register, and handoff documentation.

### Boundary And Integrity Notes

The recovery test verifies that eight candidates are generated, exactly seven are failed routes, the Lean-valid candidate is selected, and every failed route is preserved in proof memory. The V8 artifact records `P`, `not_P`, `Q`, `not_Q`, `R`, `U`, `proof_authority: none`, and downstream authorities `Lean`, `exact computation`, and `citation gate`.

V8 remains a heuristic stress/revision artifact. It can generate objections, repairs, and assumption audits, but it cannot promote a claim, certify a proof, or override final Lean replay.

### Residual Risks

- Ensemble recovery is covered for the implemented elementary `Nat.add_zero` slice, not arbitrary proof domains.
- The V8 artifact is currently deterministic template output from the native runner, not a real child-agent prompt execution result.
- General proof-route scheduling, real MathProve execution, production Pi runtime registration, native TriviumDB target validation, stronger OS/network runner replay sandboxing, and richer statement equivalence remain deferred.

### Final Root Validation

Fresh Phase 19 validation completed on 2026-05-27:

```text
corepack pnpm typecheck
Result: exit 0; root recursive no-emit typecheck passed for extensions/comath-pi and services/comathd.

corepack pnpm --filter @comath/comathd test
Result: exit 0; comathd Phase 0-18 tests plus Phase 19 ensemble recovery test passed.

corepack pnpm build
Result: exit 0; root recursive build passed for extensions/comath-pi and services/comathd.

corepack pnpm test
Result: exit 0; Phase 0/design smoke, all workspace tests, Phase 19 comathd test, Phase 18 Pi campaign tool tests, and Phase 17 integrity evaluation passed.

Test-Path -LiteralPath 'D:\MATH _Studio\comath-pi-lab\.comath'
Result: False; no repository-root runtime state was left behind.
```
