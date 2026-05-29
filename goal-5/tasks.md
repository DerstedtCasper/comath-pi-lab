# Goal 5 Tasks

Status legend:

- `[ ]` not started
- `[~]` in progress
- `[x]` complete
- `[!]` blocked or needs explicit continuation handling

Every task has reserved fields:

- Work done:
- Verification:
- Remaining risk:
- Next:

## Task 1: Live Repository and Source-Document Audit

Status: [x]

Goal: establish the current live implementation state before modifying production code.

Steps:

- Read `goal-5/input.md`, `goal-5/plan.md`, and this file.
- Read the two v2 source docs and the prompt pack enough to extract task-relevant mandatory requirements.
- Inspect repo structure, git status, package manager, scripts, current tests, Lean/lake/toolchain files, and existing worktrees.
- Locate existing implementations or stubs for theorem families, campaign tick/goal flow, candidate runner, Lean runner, final replay, dependency closure, axiom profile, integrity scanner, agent prompts, Pi goal mode, and adapter registry.
- Produce an audit map in this task entry: relevant files, current trust path, existing tests, and likely first P0 removal targets.
- Run only non-mutating checks that are cheap and safe, such as package script listing or focused static searches.

Verification:

- Evidence must include exact commands used for repo inspection and at least one source-doc requirement map.
- No code edits in this task unless absolutely required to unblock reading, which should not happen.

Work done:

- Read the goal control files:
  - `Get-Content -LiteralPath 'D:\MATH _Studio\comath-pi-lab\goal-5\input.md' -Raw`
  - `Get-Content -LiteralPath 'D:\MATH _Studio\comath-pi-lab\goal-5\plan.md' -Raw`
  - `Get-Content -LiteralPath 'D:\MATH _Studio\comath-pi-lab\goal-5\tasks.md' -Raw`
- Read task-relevant sections of the external source docs and prompt pack:
  - `rg -n "^(#|##|###)|CoMath =|FormalSpecLock|AssumptionLedger|StatementDiffGate|Lean Authority|DependencyClosure|Integrity|Axiom|No-Cheat|Statement Drift|toy|Nat-only|n : Nat|synthetic|agent vote|External|registry|Pi goal|MathProve|acceptance|Threat|P0|Phase 0|Phase 1|Phase 2|Phase 3|Phase 4|Phase 5|Phase 6|Phase 7" 'D:\MATH _Studio\comath-lab开发文档区\CoMath_No_Reinvent_GA_Audit_v2_2026-05-29.md'`
  - `rg -n "^(#|##|###)|No-Reinvent|Lean Authority|External Tool|Fail-Closed|Open Reproducibility|FormalSpecLock|AssumptionLedger|StatementDiffGate|LeanRunManifest|FinalReplayManifest|DependencyLock|DependencyClosure|Integrity|Axiom|No-Cheat|Default team|Coordinator|Specialist|Voting|8-variant|Pi goal|GoalMode|Literature|Logic-toy|acceptance|Threat|M0|M1|M2|M3|M4|M5|M6|M7|M8|README required|forbidden" 'D:\MATH _Studio\comath-lab开发文档区\CoMath_Open_Formal_Workbench_GA_Design_v2_2026-05-29.md'`
  - `rg -n "^(#|##|###)|Coordinator|A[1-8]|agent|prompt|Hard veto|Lean|FormalSpecLock|AssumptionLedger|Statement|vote|schema|output|Red-Team|Literature|Blueprint|S0|S1|S2|S3|S4|S5|S6|S7|S8|S9|S10" 'D:\MATH _Studio\comath-lab开发文档区\COMATH_AGENT_TEAM_AND_PROMPTS_V2_20260526.md'`
- Current source-doc requirement map:
  - Audit doc lines 21, 39, 44-45: CoMath is a Lean4/mathlib plus external-tool workbench, not a theorem validator; current state is Research Alpha / trust-core vertical slice with P0 trusted-path drift.
  - Audit doc lines 216-219 and 245: must provide `FormalSpecLock`, `AssumptionLedger`, external adapter registry, and must not default-inject `n : Nat`.
  - Audit doc lines 279-417: named P0 targets are `theorem-family.ts`, `campaign-tick.ts`, Nat linear synthesis, `candidate-runner.ts`, and bounded tick loop.
  - Audit doc lines 456-636: P1 targets are fail-closed Lean fallback, non-GA final replay, weak dependency closure, regex-only cheat scan, raw stdout axiom profile, and statement equivalence that must default exact.
  - Design doc lines 247-261: trust boundary makes `FormalSpecLock`, `AssumptionLedger`, `StructuredLeanAudit`, and `FinalReplayManifest` trusted only under service ownership and LeanAuthority conditions.
  - Design doc lines 620, 935-978, 1055-1103: no proof search before `FormalSpecLock`; `LeanRunManifest` is service-owned; `FinalReplayManifest` plus hermetic replay and append-only registry are required.
  - Design doc lines 1105-1168 and 1194-1243: default architecture is A0 coordinator plus A1-A8 specialists, with advisory-only voting and stage-local eight-variant strategy.
  - Design doc lines 1253-1323 and 1477-1559: Pi goal-mode UX and GA acceptance/evidence-pack criteria must be implemented and tested.
  - Prompt pack lines 17-25, 38-65, 83-267, 277-423, 435-502, 516-599: every agent prompt must preserve evidence authority boundaries; coordinator plus eight agents and eight variants are specified; majority vote may only break ties among already valid evidence-backed candidates; final static/replay auditors and candidate manifest template must be preserved.
- Live repo/worktree audit:
  - `git status -sb` shows current branch `main` with pre-existing dirty changes in `services/comathd/src/proof-kernel/campaign/campaign-tick.ts`, `services/comathd/src/proof-kernel/ensemble/candidate-runner.ts`, `services/comathd/src/proof-kernel/ensemble/decision-forest.ts`, `services/comathd/src/proof-kernel/lean/theorem-family.ts`, several tests, plus untracked `goal-3/`, `goal-5/`, and `services/comathd/tests/unit/phase82-controlled-equivalence-proof-execution.test.mjs`.
  - `git worktree list` shows root `D:/MATH _Studio/comath-pi-lab` on `main`, plus `.worktrees/pi-github-release`, `.worktrees/production-formal-workbench`, and `.worktrees/public-main-runtime`.
  - Root package scripts: `build`, `typecheck`, `test`; package manager `pnpm@11.3.0`, Node engine `>=22.19.0`.
  - `@comath/comathd` scripts: `build`, `typecheck`, long `test` chain covering phases 0-81; current chain still includes bounded Nat theorem-family / Nat-linear tests such as Phase 76 and Phase 81.
  - No repo-root tracked `lean-toolchain`, `lakefile.lean`, `lake-manifest.json`, or `.lean` files were found by `rg --files | rg "(lean-toolchain|lakefile|lake-manifest|\.lean$)"`; Lean projects appear generated at runtime under `.comath`.
- Current trust-path map:
  - API route owner: `services/comathd/src/api/server.ts` imports/uses `startCampaign`.
  - Campaign state machine: `services/comathd/src/proof-kernel/campaign/campaign-tick.ts`.
    - Current dirty file no longer writes default `n : Nat` in `createProblemLock`, `createObligation`, or `startCampaign`; `assumptions` are currently `[]`.
    - It still imports `findTheoremFamilyForObligation`, uses theorem-family support checks, and still contains `registeredNatLinearIdentityTargets`, `extractNatLinearIdentityRequest`, controlled Nat-linear parsing/synthesis, and final replay/promotion branches for theorem-family or bounded Nat-linear targets.
  - Theorem family registry: `services/comathd/src/proof-kernel/lean/theorem-family.ts`.
    - Still contains `nat_add_zero`, `nat_mul_zero`, `nat_zero_add` registry data.
    - Current dirty code makes `findTheoremFamilyForGoal(goal)` return `undefined`, which quarantines direct user-goal classification, but `findTheoremFamilyForObligation()` still recognizes Nat theorem-family obligations.
  - Candidate runner: `services/comathd/src/proof-kernel/ensemble/candidate-runner.ts`.
    - Current dirty code makes `runTheoremFamilyCandidates()` generate eight `candidate_blocked` fixture outputs with hard veto `business_layer_theorem_prover_forbidden`, no replay command, no Lean files, no proof-grade evidence, and score `-100`.
    - `runTrivialNatAddZeroCandidates()` still exists as a helper around theorem-family fixture output.
  - Decision forest: `services/comathd/src/proof-kernel/ensemble/decision-forest.ts`.
    - Reads/validates candidate manifests, rejects statement drift, hard vetoes, unapproved assumptions, and missing service-owned Lean replay evidence; advisory scoring remains secondary to eligibility.
  - Lean final replay: `services/comathd/src/proof-kernel/lean/clean-replay.ts`.
    - Creates a clean runtime workspace, copies generated Lake/Lean/FormalSpec files, runs `lake env lean`, `lake build`, and audit commands, writes `final_replay_manifest.json`, and combines static audit, dependency closure, statement equivalence, and axiom profile.
    - Still called "Lean Authority v2" in docs/code surfaces and lacks the full v3 append-only registry / `LeanRunManifest` per-candidate model.
  - Dependency closure: `services/comathd/src/proof-kernel/lean/dependency-closure.ts`.
    - Hashes local generated Lean project files and import lines; result passes if local file hash set is non-empty. This matches the external audit's warning that closure is currently too weak for GA.
  - Static cheat scan: `services/comathd/src/proof-kernel/lean/static-cheat-scan.ts`.
    - Regex scans `sorry`, `admit`, `axiom`, `constant`, `unsafe`, `opaque`; useful precheck, not yet GA structured No-Cheat gate.
  - Axiom profile: `services/comathd/src/proof-kernel/lean/axiom-profile.ts`.
    - Parses raw output for `#print axioms`-style text and allowed axioms; matches audit warning that raw stdout parsing is not enough for GA.
  - Statement equivalence: `services/comathd/src/proof-kernel/lean/statement-equivalence.ts`.
    - Implements exact/signature/witness checks and bounded equivalence-search metadata, but `StatementDiffGate` is not yet a distinct GA lock-bound gate.
  - Agent profiles: `services/comathd/src/agents/agent-profiles.ts`.
    - Has nine profiles: coordinator plus librarian, computation, proof-route, formalization, reviewer, graph-builder, security-auditor, math-integrity-auditor.
    - Profiles carry `proof_authority: "none"` and `may_mutate_trusted_state: false`; names do not yet match the A1-A8 prompt-pack roles exactly.
  - Stage-local variants: `services/comathd/src/proof-kernel/ensemble/variant-registry.ts`.
    - Defines V1-V8 variants matching the prompt-pack variant roles, but current candidate generation is fixture/blocker-oriented, not real per-agent candidate execution.
  - Pi goal surface: `extensions/comath-pi/src/research-loop.ts`, `extensions/comath-pi/src/runtime-registration.ts`, and `extensions/comath-pi/src/index.ts`.
    - Current Pi loop is bounded tick orchestration via `/campaign/start` and `/campaign/:id/tick`, with `max_ticks` default 8 and `comathd` mutation ownership.
    - External v3 terminal vocabulary projection exists in `services/comathd/src/proof-kernel/campaign/external-terminal-vocabulary.ts` and is covered by Phase 69 tests, but full GA Pi goal-mode as specified by the 2026-05-29 design is not implemented.
  - Adapter surfaces:
    - Existing adapter work is mainly AgentRun/profile/Codex package execution and older literature/compute runner descriptors.
    - There is no single GA `External Wheel Registry` abstraction with explicit theorem-search, retrieval/ingestion, proof-search backend, computation, and external Lean repo adapter families.
- Existing test map:
  - P0 negative/future guard material already exists at `services/comathd/tests/unit/goal4-p0-no-reinvent-violations.test.mjs`.
  - Relevant existing tests include Phase 18 proof-kernel gates, Phase 19 ensemble recovery, Phase 20 campaign state, Phase 31 trust profile, Phase 32 statement signature, Phase 33 proof-obligation DAG, Phase 56/78/79/80/82 equivalence machinery, Phase 61/62 candidate/decision contract, Phase 64 Lean Authority v2 final gate, Phase 67/68 v3 slices, Phase 69 terminal vocabulary, Phase 71 repair/resume, Phase 75/76/81 Nat-linear paths.
  - Pi tests include `extensions/comath-pi/tests/phase22-research-loop.test.mjs`, `phase26-pi-runtime-registration.test.mjs`, `phase66-goal-compatible-campaign-ux.test.mjs`, and agent/profile adapter tests.
- Likely first P0 removal targets for Task 2/3:
  1. Promote or port `goal4-p0-no-reinvent-violations.test.mjs` into the default `@comath/comathd` test chain if it is not already included.
  2. Add/strengthen failing tests that Nat-linear synthesis cannot reach `completed_formal_proof` / `formally_checked` from production campaign flow.
  3. Remove production use of `findTheoremFamilyForObligation()` from campaign final-replay selection, or strictly quarantine theorem-family paths as smoke-only.
  4. Remove `registeredNatLinearIdentityTargets` and `extractNatLinearIdentityRequest()` from production promotion path; keep `by omega` only as agent/LeanRunner-generated candidate material once per-candidate replay exists.
  5. Keep current candidate-runner hard-veto behavior and decision-forest replay-evidence requirement, then test it as the regression boundary.

Verification:

- Non-mutating commands run:
  - `git status -sb`
  - `git worktree list`
  - `Get-ChildItem -LiteralPath 'D:\MATH _Studio\comath-pi-lab' -Force | Select-Object Mode,Length,Name`
  - `Get-Content -LiteralPath 'D:\MATH _Studio\comath-pi-lab\package.json' -Raw`
  - `Get-Content -LiteralPath 'D:\MATH _Studio\comath-pi-lab\services\comathd\package.json' -Raw`
  - `rg --files services/comathd/src/proof-kernel services/comathd/tests | rg "(theorem-family|campaign-tick|candidate-runner|decision-forest|lean|replay|dependency|axiom|integrity|spec|assumption|statement|adapter|agent|goal|phase(18|19|20|61|62|64|67|68|69|76|81|82))"`
  - `rg -n "n : Nat|Nat\.add|Nat\.mul|Nat\.zero|registeredNatLinear|Nat linear|linear synthesis|synthetic|synthetic winner|theorem-family|TheoremFamily|createProblemLock|createObligation|startCampaign|assumptions:\s*\[|FormalSpecLock|AssumptionLedger|StatementDiffGate|LeanRunManifest|FinalReplayManifest|DependencyClosure|AxiomProfile|IntegrityScanner|No-Cheat|vote|promoted|proven" services/comathd/src services/comathd/tests`
  - `git diff --stat -- services/comathd/src/proof-kernel/campaign/campaign-tick.ts services/comathd/src/proof-kernel/ensemble/candidate-runner.ts services/comathd/src/proof-kernel/ensemble/decision-forest.ts services/comathd/src/proof-kernel/lean/theorem-family.ts services/comathd/tests/integration/phase18-ga-campaign-vertical-slice.test.mjs services/comathd/tests/integration/phase81-controlled-nat-linear-synthesis.test.mjs services/comathd/tests/unit/phase19-ga-ensemble-recovery.test.mjs services/comathd/tests/unit/phase61-v3-candidate-contract.test.mjs services/comathd/tests/unit/phase62-v3-decision-forest.test.mjs services/comathd/tests/unit/phase65-proof-memory-retrieval.test.mjs`
  - `rg --files | rg "(lean-toolchain|lakefile|lake-manifest|\.lean$)"`
  - `rg -n "FormalSpecLock|formal spec|formal_spec|AssumptionLedger|assumption ledger|assumption_delta|StatementDiffGate|statement diff|statement_equivalence|statement_hash|locked_statement|InitialAssumptionLedger|DependencyLock|LeanRunManifest|FinalReplayManifest|External Wheel|adapter registry|TheoremSearchAdapter|RetrievalAdapter|ProofSearchBackendAdapter|ComputationAdapter|GoalMode|goal-mode|goal mode|ResearchCampaign Coordinator|A1|A8|stage-local|variant" services/comathd/src services/comathd/tests prompts docs schemas`
  - `rg -n "Pi|pi|goal-mode|goal mode|GoalMode|campaign/start|startCampaign|terminal_state|formal_proof_verified|verified_counterexample|replayable_environment_blocker|user_cancelled|blocked_with_replayable|completed_formal_proof|completed_refutation|CLI|command" services/comathd/src services/comathd/tests docs README.md TODO.md REVIEW.md .pi extensions scripts`
  - `rg -n "adapter|registry|external wheel|wheel|LeanSearch|Loogle|Moogle|LeanDojo|arXiv|Semantic Scholar|OpenAlex|Crossref|Unpaywall|Jina|AnySearch|CAS|SMT|SAT|retrieval|ingestion" services/comathd/src services/comathd/tests docs README.md TODO.md REVIEW.md`
- Task 1 was read-only with respect to product code. The only mutation in this turn is this Task 1 audit entry in `goal-5/tasks.md`, as required by goal-mode bookkeeping.
- No tests were run because Task 1 explicitly limited execution to cheap non-mutating inspection; focused failing tests begin in Task 2.

Remaining risk:

- The worktree is dirty before this agent's implementation work. Several dirty files already contain partial P0 remediation. Future tasks must preserve user/pre-existing edits and not reset them.
- `input.md` displays mojibake when read through the current PowerShell output path, but the active goal objective and `plan.md`/`tasks.md` preserve the needed semantics. Do not rewrite user input unless explicitly asked.
- The repo has substantial existing vertical-slice implementation, but current evidence contradicts GA completion: P0/P1 audit targets remain in production-adjacent paths, and the 2026-05-29 GA design requires broader lock/ledger/diff, v3 replay manifests, adapter registry, real agent workflow, and Pi goal-mode work.
- Local Lean availability was not tested in Task 1. Treat Lean replay capability as unverified until a later task runs the relevant replay/test command.

Next:

- Task 2: add or promote failing P0 trust-boundary tests for no default `n : Nat`, no production Nat-linear proof promotion, no theorem-family recognizer promotion, and no synthetic candidate winner/arbitration pass without service-owned replay evidence.

## Task 2: Add Failing P0 Trust-Boundary Tests

Status: [x]

Goal: encode the first P0 failures before changing implementation.

Steps:

- Add focused tests proving that unknown goals do not receive default `n : Nat`.
- Add tests proving Nat linear synthesis or theorem-family recognizers cannot promote or support production proof claims.
- Add tests proving synthetic candidate winners are not accepted as real multi-agent evidence.
- Keep any existing LeanRunner Nat examples only as explicit smoke fixtures.

Verification:

- Run the focused tests and record failing output.
- Confirm failures correspond to P0 audit findings, not broken test setup.

Work done:

- Re-read `goal-5/input.md`, `goal-5/plan.md`, and `goal-5/tasks.md` at session start.
- Confirmed current dirty worktree and package script baseline:
  - `git status -sb`
  - `Get-Content -LiteralPath 'D:\MATH _Studio\comath-pi-lab\services\comathd\package.json' -Raw`
  - `rg -n "goal4-p0-no-reinvent|phase81-controlled-nat-linear|phase23-ga-theorem-family|phase76-registered-nat-linear|phase18-ga-campaign-vertical" services/comathd/package.json services/comathd/tests README.md docs TODO.md REVIEW.md`
- Promoted the existing P0 negative test into the default `@comath/comathd` test chain:
  - Modified `services/comathd/package.json` so `node tests/unit/goal4-p0-no-reinvent-violations.test.mjs` runs before the older proof-kernel gate tests.
- Strengthened `services/comathd/tests/unit/goal4-p0-no-reinvent-violations.test.mjs`:
  - Added import of `findTheoremFamilyForObligation`.
  - Added assertion `obligation-level theorem-family recognizer must not support production proof claims`.
  - The new assertion builds a Nat `nat_add_zero` obligation fixture and expects `findTheoremFamilyForObligation(...)` to return `undefined`, because the 2026-05-29 audit requires theorem-family recognition to be quarantined from production proof support.
- Kept existing P0 checks in the same test file for:
  - no production user-goal theorem-family recognizer;
  - no default `n : Nat` for unknown goals;
  - no Nat-linear business-layer synthesis promotion;
  - no synthetic V1 winner;
  - no synthetic arbitration pass before service-owned replay evidence.

Verification:

- Build command:
  - `corepack pnpm --filter @comath/comathd build`
  - Result: exit 0; output included `tsc -p tsconfig.json && node scripts/copy-agent-adapters.mjs`.
- Focused red test command:
  - `node services/comathd/tests/unit/goal4-p0-no-reinvent-violations.test.mjs`
  - Result: exit 1 as expected for Task 2.
  - Expected failure:
    - `Goal 4 P0 no-reinvent violations still present`
    - `obligation-level theorem-family recognizer must not support production proof claims: production code still supports Nat proof claims through obligation matching`
    - Actual value was the `nat_add_zero` theorem-family object; expected value was `undefined`.
- This is the intended TDD red state for Task 3. The failure maps directly to the audit finding that `theorem-family.ts` / `campaign-tick.ts` still provide Nat theorem-family support in production-adjacent proof paths.
- Diff review:
  - `git diff -- services/comathd/package.json services/comathd/tests/unit/goal4-p0-no-reinvent-violations.test.mjs`
  - Confirmed the only product-tree edits from this task are the P0 test-chain insertion and the new obligation-level theorem-family negative assertion.

Remaining risk:

- The default `@comath/comathd test` chain now intentionally hits the P0 red test until Task 3 removes/quarantines the production theorem-family support path.
- Older positive tests and docs still mention Phase 23/76/81 theorem-family and Nat-linear promotion slices; Task 3 must decide whether to remove, quarantine, or rewrite them as smoke/non-promotional tests.
- The broader dirty worktree still contains pre-existing source/test edits from earlier work. This task did not revert or normalize those changes.
- `package.json` was edited only to insert the P0 test in the default chain; PowerShell briefly introduced BOM/noise, then it was cleaned by patch. Current diff shows only the script-line insertion.

Next:

- Task 3: remove or quarantine production theorem-family/Nat-linear support so the new P0 test passes, then update or retire conflicting Phase 23/76/81 positive-promotion tests without losing LeanRunner smoke coverage.

## Task 3: Remove or Quarantine Toy/Nat/Synthetic Production Paths

Status: [x]

Goal: eliminate the trusted production path dependency on toy theorem recognition, Nat synthesis, synthetic winners, and default assumptions.

Steps:

- Remove default `n : Nat` injection from campaign/problem/obligation creation.
- Remove Nat linear expression parsing/synthesis from production proof support.
- Replace synthetic V1 winner behavior with fail-closed candidate requirements.
- Preserve explicit smoke tests where they only call Lean and cannot become authority.
- Update tests from Task 2 until they pass.

Verification:

- Run focused P0 tests.
- Run typecheck or equivalent package checks.
- Review static search output for remaining default `n : Nat`, Nat synthesis, and synthetic winner production references.
- Commit code changes if any.

Work done:

- Re-read `goal-5/input.md`, `goal-5/plan.md`, and `goal-5/tasks.md` at session start.
- Refreshed current worktree state with `git status --short`, `git diff --name-only`, `git diff --cached --name-only`, and `git diff --stat`.
- Removed or quarantined immediate P0 trust-path hazards:
  - `services/comathd/src/proof-kernel/campaign/campaign-tick.ts`
    - removed default `n : Nat` assumption injection from problem lock, root claim, and proof obligation creation;
    - removed user-goal theorem-family classification from `classifyLockedProblem`;
    - made theorem-specific/Nat-linear target generation fail closed;
    - deleted the now-unreachable Nat-linear registry/parser/synthesizer helpers from the production campaign file.
  - `services/comathd/src/proof-kernel/lean/theorem-family.ts`
    - kept theorem-family fixture data, but made both production recognizers return `undefined`.
  - `services/comathd/src/proof-kernel/ensemble/candidate-runner.ts`
    - changed theorem-family candidate generation into eight hard-vetoed `candidate_blocked` fixture outputs;
    - removed synthetic V1 winner state, winner score, replay command, dependency, Lean file, and proof-grade evidence from fixture candidates.
  - `services/comathd/src/proof-kernel/ensemble/decision-forest.ts`
    - added a service-owned replay-evidence requirement before any `candidate_kernel_checked` candidate can be selected.
- Updated affected tests so former toy/Nat positive paths now assert fail-closed behavior:
  - `services/comathd/tests/integration/phase18-ga-campaign-vertical-slice.test.mjs`
  - `services/comathd/tests/integration/phase81-controlled-nat-linear-synthesis.test.mjs`
  - `services/comathd/tests/unit/phase19-ga-ensemble-recovery.test.mjs`
  - `services/comathd/tests/unit/phase61-v3-candidate-contract.test.mjs`
  - `services/comathd/tests/unit/phase62-v3-decision-forest.test.mjs`
  - `services/comathd/tests/unit/phase65-proof-memory-retrieval.test.mjs`
- Preserved explicit smoke/fixture material where it cannot become proof authority:
  - `getTheoremFamilyById()` and `runTrivialNatAddZeroCandidates()` remain for fixture tests, but their outputs are blocked and non-promotional.
  - `lean-project.ts` can still materialize theorem-family Lean fixture files, but production recognizers no longer route user goals or obligations into that path.

Verification:

- Build and typecheck:
  - `corepack pnpm --filter @comath/comathd build`
  - Result: exit 0, output `tsc -p tsconfig.json && node scripts/copy-agent-adapters.mjs`.
  - `corepack pnpm --filter @comath/comathd typecheck`
  - Result: exit 0, output `tsc -p tsconfig.json --noEmit`.
- Focused P0 and affected tests:
  - `node services/comathd/tests/unit/goal4-p0-no-reinvent-violations.test.mjs`
  - Result: exit 0, `Goal 4 P0 no-reinvent negative tests passed.`
  - `node services/comathd/tests/unit/phase19-ga-ensemble-recovery.test.mjs`
  - Result: exit 0, `Phase 19 GA ensemble recovery tests passed.`
  - `node services/comathd/tests/unit/phase61-v3-candidate-contract.test.mjs`
  - Result: exit 0, `Phase 61 v3 candidate manifest and failure aggregate tests passed.`
  - `node services/comathd/tests/unit/phase62-v3-decision-forest.test.mjs`
  - Result: exit 0, `Phase 62 v3 evidence-weighted decision forest tests passed.`
  - `node services/comathd/tests/unit/phase65-proof-memory-retrieval.test.mjs`
  - Result: exit 0, `Phase 65 proof-memory retrieval tests passed.`
  - `node services/comathd/tests/integration/phase18-ga-campaign-vertical-slice.test.mjs`
  - Result: exit 0, `Phase 18 GA campaign vertical slice tests passed.`
  - `node services/comathd/tests/integration/phase81-controlled-nat-linear-synthesis.test.mjs`
  - Result: exit 0, `Phase 81 controlled Nat linear synthesis tests passed.`
- Static scans:
  - `rg -n -F -- 'registeredNatLinearIdentityTarget' services/comathd/src/proof-kernel ...`
  - Result: exit 1 with no output, meaning no matches in the scanned Task 3 scope.
  - `rg -n -F -- '15_500' services/comathd/src/proof-kernel ...`
  - Result: exit 1 with no output, meaning no synthetic winner score remains in the scanned Task 3 scope.
  - `rg -n -F -- '- n : Nat' services/comathd/src/proof-kernel services/comathd/src/claim services/comathd/src/verification ...`
  - Result: exit 1 with no output, meaning no default assumption bullet remains in the scanned Task 3 scope.
- Diff hygiene:
  - `git diff --check`
  - Result: exit 0; Git printed only CRLF conversion warnings for existing working-copy line-ending settings.

Remaining risk:

- Full `@comath/comathd test` was not run in this task. Several later legacy integration tests still encode older theorem-family/Nat-template positive promotion expectations and must be retired, quarantined, or rewritten during the next comprehensive check or a dedicated follow-up.
- `findTheoremFamilyForObligation()` call sites still exist in campaign/planning code, but the function now returns `undefined`; later FormalSpecLock/adapter/replay work should delete or replace these dead branches.
- The theorem-family fixture data and Lean fixture materializer still live under production source paths. They are non-recognized and non-promotional after this task, but should eventually move under an explicit fixture/smoke namespace.
- This task does not implement FormalSpecLock, AssumptionLedger, StatementDiffGate, Lean Authority v3, or the external wheel registry.

Next:

- Comprehensive Check A: run the required after-Task-3 requirement drift, static, build/test, docs-overclaim, and rollback-point audit before starting Task 4.

## Comprehensive Check A: After Tasks 1-3

Status: [ ]

Goal: catch regressions after removing P0 trust-path hazards.

Checklist:

- Requirement drift check against both source documents.
- Static scan for default assumptions, Nat-only support matrix, synthetic winners, and vote-as-proof.
- Typecheck/build/test focused on touched packages.
- Confirm docs do not overclaim GA from partial completion.
- Record rollback point/commit.

Work done:

Verification:

Remaining risk:

Next:

## Task 4: Implement FormalSpecLock Schema and Lock Lifecycle

Status: [ ]

Goal: require explicit locked statement boundaries before proof search or promotion.

Steps:

- Add/harden `FormalSpecLock` type/schema.
- Include original goal, normalized statement, variables, hypotheses, conclusion, notation, allowed dependencies, source anchors, lock hash, and status.
- Ensure only trusted service code creates or mutates locks.
- Add tests for missing lock and immutable lock behavior.

Verification:

- Focused unit/schema tests.
- Typecheck.
- Diff review for trusted ownership boundary.
- Commit code changes if any.

Work done:

Verification:

Remaining risk:

Next:

## Task 5: Implement AssumptionLedger

Status: [ ]

Goal: make every assumption sourceful, approved or rejected, and auditable.

Steps:

- Add/harden `AssumptionLedger` schema.
- Track assumption id, normalized text, source, evidence anchor, approval state, scope, and hash.
- Block hidden or unapproved assumptions from candidate promotion.
- Add tests for hidden assumption injection and paper/agent-proposed assumption approval flow.

Verification:

- Focused ledger tests.
- Typecheck.
- Commit code changes if any.

Work done:

Verification:

Remaining risk:

Next:

## Task 6: Implement StatementDiffGate

Status: [ ]

Goal: fail closed on statement drift, metadata-only equivalence, variable changes, and conclusion weakening.

Steps:

- Add exact/default statement diff semantics.
- Require explicit trusted approval for any non-exact equivalence mode.
- Add red-team fixtures for variable drift, hidden hypothesis, weakened conclusion, notation ambiguity, and metadata-only equivalence.
- Wire gate into proof-search start and candidate promotion.

Verification:

- Focused StatementDiffGate negative and positive tests.
- Typecheck.
- Commit code changes if any.

Work done:

Verification:

Remaining risk:

Next:

## Comprehensive Check B: After Tasks 4-6

Status: [ ]

Goal: verify statement-boundary machinery before adding broader adapters and agents.

Checklist:

- Requirement drift check against source docs.
- Test missing lock, unapproved assumption, statement drift, and exact match.
- Static scan for code paths that bypass lock/ledger/gate.
- Build/typecheck.
- Update task log with known gaps.

Work done:

Verification:

Remaining risk:

Next:

## Task 7: Implement External Wheel Registry Interfaces

Status: [ ]

Goal: provide adapter-first extension points for external maintained tools.

Steps:

- Add registry and common adapter metadata model.
- Add interfaces for theorem search, literature retrieval/ingestion, proof-search backends, computation tools, and external Lean repo references.
- Model authority class so all non-Lean tools are hint/evidence/refutation only.
- Add deterministic test adapters.

Verification:

- Adapter contract tests.
- Typecheck.
- Commit code changes if any.

Work done:

Verification:

Remaining risk:

Next:

## Task 8: Implement Retrieval and Ingestion Adapter Contracts

Status: [ ]

Goal: support arXiv/Semantic Scholar/OpenAlex/Crossref/Unpaywall/Jina/AnySearch style retrieval without trusting retrieved text.

Steps:

- Add retrieval result schema with source URL/id, license/terms note, content hash, prompt-injection scan status, and citation metadata.
- Add PDF/TeX/Markdown ingestion interface.
- Use deterministic local fixtures for tests.
- Block retrieved content from directly mutating FormalSpecLock without approval.

Verification:

- Retrieval/ingestion contract tests.
- Prompt-injection boundary test.
- Typecheck.
- Commit code changes if any.

Work done:

Verification:

Remaining risk:

Next:

## Task 9: Implement Theorem Search and Computation Adapter Contracts

Status: [ ]

Goal: support Loogle/LeanSearch/Moogle/LeanDojo/CAS/SMT/SAT style hints without proof-authority leakage.

Steps:

- Add theorem search adapter result schema with provenance and authority class.
- Add computation adapter result schema for CAS/SMT/SAT/refutation outputs.
- Ensure adapter outputs can attach to candidate evidence but cannot mark proven.
- Add tests for vote/search/CAS-only proof rejection.

Verification:

- Adapter authority negative tests.
- Typecheck.
- Commit code changes if any.

Work done:

Verification:

Remaining risk:

Next:

## Comprehensive Check C: After Tasks 7-9

Status: [ ]

Goal: ensure external wheels are reusable hints, not hidden proof engines.

Checklist:

- Contract tests for all adapter families.
- Static scan for external output marking proof status directly.
- Config sample review for fail-closed defaults.
- Build/typecheck.
- Update task log.

Work done:

Verification:

Remaining risk:

Next:

## Task 10: Implement LeanRunManifest and Trusted Lean Runner Provenance

Status: [ ]

Goal: make every Lean invocation auditable and reject forged logs.

Steps:

- Add `LeanRunManifest` with command, cwd, env policy, toolchain hash, input artifact hashes, output hashes, exit code, timestamps, and trusted runner signature/source.
- Ensure manifests are written by trusted runner service, not agents.
- Add fake-log rejection tests.

Verification:

- Lean runner manifest tests.
- Fake stdout/stderr negative test.
- Typecheck.
- Commit code changes if any.

Work done:

Verification:

Remaining risk:

Next:

## Task 11: Implement Per-Candidate Replay and Promotion Gate

Status: [ ]

Goal: require each candidate proof artifact to replay before entering any promotable status.

Steps:

- Wire candidate packs to Lean replay requests.
- Require FormalSpecLock hash, AssumptionLedger hash, dependency lock, artifact hash, and LeanRunManifest.
- Prevent `candidate`, `draft`, or `hypothesis` from being mislabeled `proven`.
- Add tests for missing replay and mismatched hashes.

Verification:

- Candidate replay tests.
- Status-transition tests.
- Typecheck.
- Commit code changes if any.

Work done:

Verification:

Remaining risk:

Next:

## Task 12: Implement Final Hermetic Replay and Append-Only Registry

Status: [ ]

Goal: make final proof promotion depend on clean workspace replay and append-only evidence.

Steps:

- Add `FinalReplayManifest`.
- Add append-only replay registry.
- Run final replay in clean/hermetic workspace where feasible.
- Bind replay manifest to audit event and artifact pack.
- Add mutation/rewrite rejection tests for replay registry.

Verification:

- Final replay manifest tests.
- Append-only registry tests.
- Lean smoke replay if local Lean is available.
- Typecheck.
- Commit code changes if any.

Work done:

Verification:

Remaining risk:

Next:

## Comprehensive Check D: After Tasks 10-12

Status: [ ]

Goal: verify Lean Authority v3 core before adding integrity scanners and workflow expansion.

Checklist:

- Fake log rejection.
- Missing manifest/hash rejection.
- Candidate replay status-transition tests.
- Final replay append-only tests.
- Clean Lean smoke replay or recorded environment blocker.
- Build/typecheck.

Work done:

Verification:

Remaining risk:

Next:

## Task 13: Implement DependencyClosureV2

Status: [ ]

Goal: replace file-exists dependency checks with reproducible dependency closure evidence.

Steps:

- Add dependency lock model with Lean/toolchain/mathlib/external repo pins.
- Compute closure over imported Lean modules/artifacts where feasible.
- Record dependency hashes and source metadata.
- Add tests for missing/unpinned/polluted dependencies.

Verification:

- Dependency closure tests.
- Typecheck.
- Commit code changes if any.

Work done:

Verification:

Remaining risk:

Next:

## Task 14: Implement LeanIntegrityScannerV2 and No-Cheat Gate

Status: [ ]

Goal: catch forbidden Lean constructs, suspicious trust escapes, and dependency pollution before replay/promotion.

Steps:

- Add scanner for forbidden constructs such as `sorry`, `admit`, unauthorized axioms, unsafe imports, local shadowing, and proof log spoofing markers.
- Make scanner a precondition for candidate promotion and final replay.
- Keep regex as early warning only; trusted decision must combine parsed/structured checks where possible.
- Add red-team fixtures.

Verification:

- No-Cheat negative tests.
- Typecheck.
- Commit code changes if any.

Work done:

Verification:

Remaining risk:

Next:

## Task 15: Implement AxiomProfileV2

Status: [ ]

Goal: make theorem axiom usage explicit and machine-audited.

Steps:

- Add structured axiom profile report.
- Prefer Lean-generated checks over raw stdout parsing where feasible.
- Record allowed/disallowed axiom sets in dependency/spec context.
- Add tests for unauthorized axiom detection.

Verification:

- Axiom profile tests.
- Lean smoke check or environment blocker.
- Typecheck.
- Commit code changes if any.

Work done:

Verification:

Remaining risk:

Next:

## Comprehensive Check E: After Tasks 13-15

Status: [ ]

Goal: verify dependency, integrity, and axiom gates jointly.

Checklist:

- Dependency pollution negative test.
- No-Cheat red-team fixtures.
- Axiom profile tests.
- Final replay still works or remains fail-closed.
- Build/typecheck.

Work done:

Verification:

Remaining risk:

Next:

## Task 16: Implement MathProve-Native Stage Machine S0-S10

Status: [ ]

Goal: encode the GA design stage machine as native CoMath workflow rather than external skill dependency.

Steps:

- Add stage enum/state model for S0 input_intake through S10 proof_memory_update.
- Define required inputs/outputs/gates per stage.
- Ensure stage transitions fail closed on missing lock, missing manifest, or failed integrity gate.
- Add deterministic workflow tests.

Verification:

- Stage transition tests.
- Typecheck.
- Commit code changes if any.

Work done:

Verification:

Remaining risk:

Next:

## Task 17: Implement Coordinator and Eight Specialist Agent Prompt Pack

Status: [ ]

Goal: replace synthetic swarm with real task/candidate/evidence records for 1 coordinator + 8 specialists.

Steps:

- Add coordinator prompt and eight specialist prompt definitions from source docs/prompt pack.
- Add specialist output schema.
- Add task card, workspace, logs, candidate pack, and evidence records.
- Ensure agent outputs cannot mutate trusted locks/manifests directly.
- Add schema tests.

Verification:

- Prompt/schema tests.
- Trusted-state mutation negative tests.
- Typecheck.
- Commit code changes if any.

Work done:

Verification:

Remaining risk:

Next:

## Task 18: Implement Stage-Local Eight-Variant Candidate Strategy

Status: [ ]

Goal: support multi-candidate generation, review, vote, elimination, failure memory, and hard veto semantics.

Steps:

- Add stage-local variant generation model.
- Add review/voting records.
- Add elimination and failure-memory records.
- Ensure hard veto beats vote and Lean failure cannot be overridden.
- Add tests for advisory-only voting.

Verification:

- Multi-variant workflow tests.
- Vote-only proof rejection tests.
- Typecheck.
- Commit code changes if any.

Work done:

Verification:

Remaining risk:

Next:

## Comprehensive Check F: After Tasks 16-18

Status: [ ]

Goal: verify real workflow and agent architecture before exposing Pi goal mode.

Checklist:

- Stage machine tests.
- Agent schema tests.
- Advisory vote negative tests.
- Static scan for synthetic winners.
- Build/typecheck.

Work done:

Verification:

Remaining risk:

Next:

## Task 19: Implement Pi Goal-Mode Workspace Creation and Intake

Status: [ ]

Goal: let users submit research goals and attachments/paper paths through Pi goal-mode and get a reproducible workspace.

Steps:

- Add/upgrade Pi command interface.
- Capture research goal, attachments, policies, budget, and allowed tools.
- Create workspace with input snapshot, FormalSpecLock draft, AssumptionLedger draft, and retrieval plan.
- Add CLI/Pi tests or fixtures.

Verification:

- Pi intake tests.
- Workspace artifact tests.
- Typecheck.
- Commit code changes if any.

Work done:

Verification:

Remaining risk:

Next:

## Task 20: Implement End-to-End Proof Research Workflow

Status: [ ]

Goal: run from user goal through knowledge pack, lemma plan, Lean skeleton, replay, repair, red-team, and terminal state.

Steps:

- Wire S0-S10 stages into Pi goal-mode.
- Use adapters and deterministic fake agents for acceptance test.
- Generate Lean skeleton and run Lean on a small theorem.
- Attempt repair loop within budget.
- Terminate only at allowed terminal states.

Verification:

- End-to-end acceptance test with a small replayable theorem.
- Blocker/counterexample terminal test.
- Typecheck/build.
- Commit code changes if any.

Work done:

Verification:

Remaining risk:

Next:

## Task 21: Implement Replayable Blocker and Counterexample Terminal Artifacts

Status: [ ]

Goal: make non-proof terminal states useful, reproducible, and clearly non-proven.

Steps:

- Add terminal artifacts for replayable environment blocker, formal counterexample, theorem repair required, budget exhausted with resume state, and user cancellation.
- Ensure none can be mislabeled as proof.
- Add tests for status display and artifact schema.

Verification:

- Terminal artifact tests.
- Typecheck.
- Commit code changes if any.

Work done:

Verification:

Remaining risk:

Next:

## Comprehensive Check G: After Tasks 19-21

Status: [ ]

Goal: verify Pi goal-mode UX and terminal semantics.

Checklist:

- Pi/CLI workflow tests.
- End-to-end proof test.
- Replayable blocker test.
- User-visible terminal vocabulary compatibility.
- Build/typecheck.

Work done:

Verification:

Remaining risk:

Next:

## Task 22: Update README and Architecture Docs

Status: [ ]

Goal: align public claims with the no-reinvent and Lean-authority doctrines.

Steps:

- Add required README wording from the GA design.
- Remove or rephrase forbidden claims such as agent vote certification.
- Update architecture docs for trust boundary, external wheel registry, Lean Authority v3, and Pi goal-mode.
- Keep alpha/GA claims honest until acceptance evidence is complete.

Verification:

- Static doc scan for required and forbidden wording.
- Link/path check where feasible.
- Commit doc changes if any.

Work done:

Verification:

Remaining risk:

Next:

## Task 23: Update Config Samples, Agent Prompts, Threat Model, and GA Acceptance Tests

Status: [ ]

Goal: make release-facing artifacts match the implemented product boundary.

Steps:

- Update config samples for external adapters and fail-closed defaults.
- Update native agent prompts with hard vetoes and output schema.
- Add or update threat model for prompt injection, fake evidence, dependency pollution, copyright/terms, and trusted-state mutation.
- Add GA acceptance tests for trust-core negatives and positive replay.

Verification:

- Config validation tests.
- Prompt schema/static tests.
- Threat model checklist present.
- GA acceptance tests run or documented blockers.
- Commit code/docs changes if any.

Work done:

Verification:

Remaining risk:

Next:

## Task 24: Final Comprehensive GA Review, Repair, and Completion Gate

Status: [ ]

Goal: perform the largest final review and mark the goal complete only if evidence meets the user's completion standard.

Steps:

- Run full CI/test/typecheck/build entrypoint.
- Run clean Lean replay/evidence-pack replay for promoted proof artifacts.
- Audit C-end/CLI/Pi UX, code, security, data consistency, permissions, error handling, tests, build, docs, rollback.
- Repair any known high-risk issues discovered by final review.
- Confirm every promoted proof claim is bound to FormalSpecLock, dependency lock, toolchain hash, artifact hash, replay manifest, and provenance audit event.
- If and only if all completion standards pass, mark the client goal complete.

Verification:

- Full command evidence.
- Final replay manifest evidence.
- Static scans for forbidden claims/paths.
- Final task log summary.

Work done:

Verification:

Remaining risk:

Next:
