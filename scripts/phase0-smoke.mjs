import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const required = [
  "COMATH_PI_LAB_DEV_PLAN.md",
  "CODEX_GOAL_RUNBOOK.md",
  "README.md",
  "TODO.md",
  "REVIEW.md",
  "AGENTS.md",
  "SECURITY_REVIEW.md",
  "MATH_INTEGRITY_REVIEW.md",
  "package.json",
  "pnpm-workspace.yaml",
  "tsconfig.json",
  "docs/architecture/module-boundaries.md",
  "docs/architecture/end-state-blueprint.md",
  "docs/architecture/acceptance-matrix.md",
  "docs/architecture/risk-register.md",
  "docs/architecture/agent-operating-model.md",
  "docs/adr/0001-single-mutation-gateway.md",
  "docs/integrations/pi-runtime-assumptions.md",
  "docs/progress/design-handoff.md",
  "docs/superpowers/plans/2026-05-25-full-design-documentation.md",
  "extensions/README.md",
  "schemas/README.md",
  "services/comathd/package.json",
  "services/comathd/src/index.ts",
  "tests/README.md"
];

const root = process.cwd();
const missing = required.filter((entry) => !existsSync(join(root, entry)));

if (missing.length > 0) {
  console.error("Phase 0 smoke check failed. Missing:");
  for (const entry of missing) {
    console.error(`- ${entry}`);
  }
  process.exit(1);
}

const packageJson = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
const gitignore = readFileSync(join(root, ".gitignore"), "utf8");
const npmrc = readFileSync(join(root, ".npmrc"), "utf8");
const devPlan = readFileSync(join(root, "COMATH_PI_LAB_DEV_PLAN.md"), "utf8");
const runbook = readFileSync(join(root, "CODEX_GOAL_RUNBOOK.md"), "utf8");
const readme = readFileSync(join(root, "README.md"), "utf8");
const acceptanceMatrix = readFileSync(join(root, "docs/architecture/acceptance-matrix.md"), "utf8");
const riskRegister = readFileSync(join(root, "docs/architecture/risk-register.md"), "utf8");
const agentModel = readFileSync(join(root, "docs/architecture/agent-operating-model.md"), "utf8");

const invariantFailures = [];

if (packageJson.packageManager !== "pnpm@11.3.0") {
  invariantFailures.push("package.json must pin packageManager to pnpm@11.3.0");
}

if (packageJson.engines?.node !== ">=22.19.0") {
  invariantFailures.push("package.json must set engines.node to >=22.19.0");
}

if (!gitignore.split(/\r?\n/).includes(".comath/")) {
  invariantFailures.push(".gitignore must ignore .comath/");
}

if (!npmrc.split(/\r?\n/).includes("engine-strict=true")) {
  invariantFailures.push(".npmrc must set engine-strict=true");
}

if (existsSync(join(root, ".comath"))) {
  invariantFailures.push("Phase 0 must not create runtime .comath/ state");
}

if (!readme.includes("Research Alpha")) {
  invariantFailures.push("README must describe the current Research Alpha state");
}

if (!readme.includes("Phase 18-75")) {
  invariantFailures.push("README must describe the current Phase 18-75 GA/v3 vertical-slice evidence");
}

if (!acceptanceMatrix.includes("33 Proof obligation DAG planning")) {
  invariantFailures.push("acceptance matrix must include Phase 33 proof obligation DAG planning acceptance");
}

if (!acceptanceMatrix.includes("34 Campaign-scoped ensemble artifacts")) {
  invariantFailures.push("acceptance matrix must include Phase 34 campaign-scoped ensemble artifact acceptance");
}

if (!acceptanceMatrix.includes("35 Claim-scoped final replay artifact paths")) {
  invariantFailures.push("acceptance matrix must include Phase 35 claim-scoped final replay artifact path acceptance");
}

if (!acceptanceMatrix.includes("Runner replay sandbox/dependency provenance")) {
  invariantFailures.push("acceptance matrix must include Phase 36 runner replay provenance acceptance");
}

if (!acceptanceMatrix.includes("37 Registered Lean statement alias equivalence")) {
  invariantFailures.push("acceptance matrix must include Phase 37 registered Lean statement alias equivalence acceptance");
}

if (!acceptanceMatrix.includes("38 Native TriviumDB target-platform evaluation")) {
  invariantFailures.push("acceptance matrix must include Phase 38 native TriviumDB target-platform evaluation acceptance");
}

if (!acceptanceMatrix.includes("39 Project writer session lock")) {
  invariantFailures.push("acceptance matrix must include Phase 39 project writer session lock acceptance");
}

if (!acceptanceMatrix.includes("40 AgentRun scheduler writer lock integration")) {
  invariantFailures.push("acceptance matrix must include Phase 40 AgentRun scheduler writer lock integration acceptance");
}

if (!acceptanceMatrix.includes("41 Live agent adapter execution")) {
  invariantFailures.push("acceptance matrix must include Phase 41 live agent adapter execution acceptance");
}

if (!acceptanceMatrix.includes("42 AgentRun observability")) {
  invariantFailures.push("acceptance matrix must include Phase 42 AgentRun observability acceptance");
}

if (!acceptanceMatrix.includes("43 Agent adapter package registry")) {
  invariantFailures.push("acceptance matrix must include Phase 43 agent adapter package registry acceptance");
}

if (!acceptanceMatrix.includes("44 Codex CLI external adapter invocation")) {
  invariantFailures.push("acceptance matrix must include Phase 44 external Codex adapter acceptance");
}

if (!acceptanceMatrix.includes("45 Pi/comathd install-session e2e")) {
  invariantFailures.push("acceptance matrix must include Phase 45 Pi/comathd install-session acceptance");
}

if (!acceptanceMatrix.includes("46 Cursor-based AgentRun log stream")) {
  invariantFailures.push("acceptance matrix must include Phase 46 cursor-based AgentRun log-stream acceptance");
}

if (!acceptanceMatrix.includes("47 SSE-style AgentRun log subscription")) {
  invariantFailures.push("acceptance matrix must include Phase 47 SSE-style AgentRun log-subscription acceptance");
}

if (!acceptanceMatrix.includes("48 AgentRun operator panel")) {
  invariantFailures.push("acceptance matrix must include Phase 48 AgentRun operator-panel acceptance");
}

if (!acceptanceMatrix.includes("49 Scheduler-backed AgentRun operator cancellation")) {
  invariantFailures.push("acceptance matrix must include Phase 49 AgentRun operator-cancel acceptance");
}

if (!acceptanceMatrix.includes("50 Multi-event AgentRun log session")) {
  invariantFailures.push("acceptance matrix must include Phase 50 multi-event AgentRun log-session acceptance");
}

if (!acceptanceMatrix.includes("51 Service-configured Codex API backend")) {
  invariantFailures.push("acceptance matrix must include Phase 51 service-configured Codex API backend acceptance");
}

if (!acceptanceMatrix.includes("52 Codex API retry and rate-limit telemetry")) {
  invariantFailures.push("acceptance matrix must include Phase 52 Codex API retry and rate-limit telemetry acceptance");
}

if (!acceptanceMatrix.includes("53 Installed Codex CLI validation")) {
  invariantFailures.push("acceptance matrix must include Phase 53 installed Codex CLI validation acceptance");
}

if (!acceptanceMatrix.includes("54 Lean declaration parser signature fallback")) {
  invariantFailures.push("acceptance matrix must include Phase 54 Lean declaration parser signature fallback acceptance");
}

if (!acceptanceMatrix.includes("55 Runner cross-machine replay environment gate")) {
  invariantFailures.push("acceptance matrix must include Phase 55 runner cross-machine replay environment gate acceptance");
}

if (!acceptanceMatrix.includes("56 Registered Lean logical-equivalence witnesses")) {
  invariantFailures.push("acceptance matrix must include Phase 56 registered Lean logical-equivalence witness acceptance");
}

if (!acceptanceMatrix.includes("57 Lean theorem template instantiation")) {
  invariantFailures.push("acceptance matrix must include Phase 57 Lean theorem template instantiation acceptance");
}

if (!acceptanceMatrix.includes("58 MathProve final-audit external runner")) {
  invariantFailures.push("acceptance matrix must include Phase 58 MathProve final-audit external runner acceptance");
}

const goal2AcceptanceMarkers = [
  ["60 v3 campaign pause/tick contract", "phase60-v3-campaign-pause-resume.test.mjs"],
  ["61 v3 candidate manifest and failure aggregate", "phase61-v3-candidate-contract.test.mjs"],
  ["62 v3 evidence-weighted decision forest", "phase62-v3-decision-forest.test.mjs"],
  ["63 v3 native stage-gate artifact coverage", "phase63-v3-stage-gate-artifact-coverage.test.mjs"],
  ["64 Lean Authority v2 final gate hash binding", "phase64-lean-authority-v2-final-gate.test.mjs"],
  ["65 failed-route proof-memory retrieval", "phase65-proof-memory-retrieval.test.mjs"],
  ["66 Pi goal-compatible campaign UX", "phase66-goal-compatible-campaign-ux.test.mjs"],
  ["67 v3 end-to-end formal campaign slice", "phase67-v3-formal-campaign-slice.test.mjs"],
  ["68 v3 negative GA slice runner", "phase68-v3-negative-ga-slices.test.mjs"],
  ["69 v3 terminal vocabulary compatibility", "phase69-v3-terminal-vocabulary.test.mjs"],
  ["70 broad theorem planning slice", "phase70-broad-theorem-planning-slice.test.mjs"],
  ["71 stage-gate repair/resume", "phase71-stage-gate-repair-resume.test.mjs"],
  ["72 theorem-specific Lean target package", "phase72-theorem-specific-lean-generation.test.mjs"],
  ["73 bounded theorem-specific proof-body synthesis", "phase73-bounded-lean-proof-body-synthesis.test.mjs"],
  ["74 bounded Lean Authority report preparation", "phase74-bounded-authority-report-preparation.test.mjs"],
  ["75 bounded final clean replay promotion", "phase75-bounded-final-clean-replay.test.mjs"]
];

for (const [marker, testName] of goal2AcceptanceMarkers) {
  if (!acceptanceMatrix.includes(marker)) {
    invariantFailures.push(`acceptance matrix must include ${marker}`);
  }
  if (!acceptanceMatrix.includes(testName)) {
    invariantFailures.push(`acceptance matrix must include ${testName}`);
  }
}

if (!acceptanceMatrix.includes("67 v3 end-to-end formal campaign slice")) {
  invariantFailures.push("acceptance matrix must include Phase 67 v3 formal campaign slice acceptance");
}

if (!acceptanceMatrix.includes("phase67-v3-formal-campaign-slice.test.mjs")) {
  invariantFailures.push("acceptance matrix must include Phase 67 formal campaign slice test coverage language");
}

if (!acceptanceMatrix.includes("68 v3 negative GA slice runner")) {
  invariantFailures.push("acceptance matrix must include Phase 68 v3 negative GA slice runner acceptance");
}

if (!acceptanceMatrix.includes("phase68-v3-negative-ga-slices.test.mjs")) {
  invariantFailures.push("acceptance matrix must include Phase 68 negative GA slice test coverage language");
}

if (!acceptanceMatrix.includes("v3_negative_ga_slices.json")) {
  invariantFailures.push("acceptance matrix must include Phase 68 negative GA release artifact language");
}

if (!acceptanceMatrix.includes("external_v3_terminal_state")) {
  invariantFailures.push("acceptance matrix must include Phase 69 external terminal vocabulary projection language");
}

if (!acceptanceMatrix.includes("broad_synthesis_plan.json")) {
  invariantFailures.push("acceptance matrix must include Phase 70 broad theorem planning artifact language");
}

if (!acceptanceMatrix.includes("stage_gate_repair.json")) {
  invariantFailures.push("acceptance matrix must include Phase 71 stage-gate repair artifact language");
}

if (!acceptanceMatrix.includes("theorem_specific_lean_project.json")) {
  invariantFailures.push("acceptance matrix must include Phase 72 theorem-specific Lean target artifact language");
}

if (!acceptanceMatrix.includes("bounded_proof_body_synthesis.json")) {
  invariantFailures.push("acceptance matrix must include Phase 73 bounded proof-body synthesis artifact language");
}

if (!acceptanceMatrix.includes("bounded_authority_report_preparation.json")) {
  invariantFailures.push("acceptance matrix must include Phase 74 bounded authority report preparation artifact language");
}

if (!acceptanceMatrix.includes("final_replay_manifest.json")) {
  invariantFailures.push("acceptance matrix must include Phase 75 bounded final replay manifest language");
}

if (!acceptanceMatrix.includes("32 Lean statement signature binding")) {
  invariantFailures.push("acceptance matrix must retain Phase 32 Lean statement signature binding acceptance");
}

if (!acceptanceMatrix.includes("Statement equivalence is target-bound")) {
  invariantFailures.push("acceptance matrix must retain Phase 32 statement-equivalence mathematical-integrity acceptance");
}

if (!acceptanceMatrix.includes("Registered statement aliases require witnesses")) {
  invariantFailures.push("acceptance matrix must include Phase 37 registered-alias mathematical-integrity acceptance");
}

if (!acceptanceMatrix.includes("Native TriviumDB evaluation is explicit")) {
  invariantFailures.push("acceptance matrix must include Phase 38 native TriviumDB explicit-evaluation security acceptance");
}

if (!acceptanceMatrix.includes("Project writers are session-scoped")) {
  invariantFailures.push("acceptance matrix must include Phase 39 writer session security acceptance");
}

if (!acceptanceMatrix.includes("Scheduled AgentRuns respect writer locks")) {
  invariantFailures.push("acceptance matrix must include Phase 40 scheduler writer-lock security acceptance");
}

if (!acceptanceMatrix.includes("Live adapters remain allowlisted and scoped")) {
  invariantFailures.push("acceptance matrix must include Phase 41 live adapter security acceptance");
}

if (!acceptanceMatrix.includes("Agent adapter health probes remain non-authoritative")) {
  invariantFailures.push("acceptance matrix must include Phase 42 adapter-health security acceptance");
}

if (!acceptanceMatrix.includes("Packaged adapters remain service-owned and allowlisted")) {
  invariantFailures.push("acceptance matrix must include Phase 43 packaged-adapter security acceptance");
}

if (!acceptanceMatrix.includes("AgentRun log streams are cursor-bounded")) {
  invariantFailures.push("acceptance matrix must include Phase 46 cursor-bounded log-stream security acceptance");
}

if (!acceptanceMatrix.includes("AgentRun log subscriptions are SSE snapshots")) {
  invariantFailures.push("acceptance matrix must include Phase 47 SSE log-subscription security acceptance");
}

if (!acceptanceMatrix.includes("AgentRun operator panels are read-only")) {
  invariantFailures.push("acceptance matrix must include Phase 48 operator-panel security acceptance");
}

if (!acceptanceMatrix.includes("Operator cancellation is scheduler-backed")) {
  invariantFailures.push("acceptance matrix must include Phase 49 operator-cancel security acceptance");
}

if (!acceptanceMatrix.includes("AgentRun log sessions are bounded")) {
  invariantFailures.push("acceptance matrix must include Phase 50 bounded log-session security acceptance");
}

if (!acceptanceMatrix.includes("Codex API backend credentials stay service-owned")) {
  invariantFailures.push("acceptance matrix must include Phase 51 Codex API credential-boundary security acceptance");
}

if (!acceptanceMatrix.includes("Codex API retries are bounded and secret-free")) {
  invariantFailures.push("acceptance matrix must include Phase 52 Codex API retry security acceptance");
}

if (!acceptanceMatrix.includes("Installed Codex CLI validation is service-configured")) {
  invariantFailures.push("acceptance matrix must include Phase 53 installed Codex CLI validation security acceptance");
}

if (!acceptanceMatrix.includes("Lean declaration parsing is in-process and fail-closed")) {
  invariantFailures.push("acceptance matrix must include Phase 54 Lean declaration parser security acceptance");
}

if (!acceptanceMatrix.includes("Runner replay environment drift fails closed")) {
  invariantFailures.push("acceptance matrix must include Phase 55 runner replay environment security acceptance");
}

if (!acceptanceMatrix.includes("Registered logical equivalence requires kernel witness metadata")) {
  invariantFailures.push("acceptance matrix must include Phase 56 registered logical-equivalence security acceptance");
}

if (!acceptanceMatrix.includes("Theorem template instantiation remains registry-bound")) {
  invariantFailures.push("acceptance matrix must include Phase 57 theorem template instantiation security acceptance");
}

if (!acceptanceMatrix.includes("MathProve final audit remains fixed-argv and non-authoritative")) {
  invariantFailures.push("acceptance matrix must include Phase 58 final-audit runner security acceptance");
}

if (!acceptanceMatrix.includes("Native memory backend evidence is non-promotional")) {
  invariantFailures.push("acceptance matrix must include Phase 38 native memory mathematical-integrity boundary");
}

if (!acceptanceMatrix.includes("Writer locks are coordination, not proof")) {
  invariantFailures.push("acceptance matrix must include Phase 39 writer lock mathematical-integrity boundary");
}

if (!acceptanceMatrix.includes("Scheduler lock ownership is non-authoritative")) {
  invariantFailures.push("acceptance matrix must include Phase 40 scheduler lock mathematical-integrity boundary");
}

if (!acceptanceMatrix.includes("Live adapter execution is non-authoritative")) {
  invariantFailures.push("acceptance matrix must include Phase 41 live adapter mathematical-integrity boundary");
}

if (!acceptanceMatrix.includes("AgentRun logs are observability artifacts")) {
  invariantFailures.push("acceptance matrix must include Phase 42 log observability mathematical-integrity boundary");
}

if (!acceptanceMatrix.includes("Packaged adapters are not proof authority")) {
  invariantFailures.push("acceptance matrix must include Phase 43 packaged-adapter mathematical-integrity boundary");
}

if (!acceptanceMatrix.includes("Cursor log streams are observability artifacts")) {
  invariantFailures.push("acceptance matrix must include Phase 46 cursor log-stream mathematical-integrity boundary");
}

if (!acceptanceMatrix.includes("SSE log subscription frames are observability artifacts")) {
  invariantFailures.push("acceptance matrix must include Phase 47 SSE log-subscription mathematical-integrity boundary");
}

if (!acceptanceMatrix.includes("Operator panels are observability artifacts")) {
  invariantFailures.push("acceptance matrix must include Phase 48 operator-panel mathematical-integrity boundary");
}

if (!acceptanceMatrix.includes("Operator cancellation is not proof authority")) {
  invariantFailures.push("acceptance matrix must include Phase 49 operator-cancel mathematical-integrity boundary");
}

if (!acceptanceMatrix.includes("Log sessions are observability artifacts")) {
  invariantFailures.push("acceptance matrix must include Phase 50 log-session mathematical-integrity boundary");
}

if (!acceptanceMatrix.includes("Codex API output is not proof authority")) {
  invariantFailures.push("acceptance matrix must include Phase 51 Codex API mathematical-integrity boundary");
}

if (!acceptanceMatrix.includes("Codex API retry telemetry is not proof authority")) {
  invariantFailures.push("acceptance matrix must include Phase 52 Codex API retry telemetry mathematical-integrity boundary");
}

if (!acceptanceMatrix.includes("Installed CLI validation is not proof authority")) {
  invariantFailures.push("acceptance matrix must include Phase 53 installed CLI validation mathematical-integrity boundary");
}

if (!acceptanceMatrix.includes("Declaration parser output is not proof authority")) {
  invariantFailures.push("acceptance matrix must include Phase 54 declaration parser mathematical-integrity boundary");
}

if (!acceptanceMatrix.includes("Replay environment checks are not proof authority")) {
  invariantFailures.push("acceptance matrix must include Phase 55 replay environment mathematical-integrity boundary");
}

if (!acceptanceMatrix.includes("Registered logical equivalence is statement binding, not proof authority")) {
  invariantFailures.push("acceptance matrix must include Phase 56 registered logical-equivalence mathematical-integrity boundary");
}

if (!acceptanceMatrix.includes("Template-instantiated theorem families still require clean replay")) {
  invariantFailures.push("acceptance matrix must include Phase 57 theorem template mathematical-integrity boundary");
}

if (!acceptanceMatrix.includes("MathProve final-audit reports are runner evidence only")) {
  invariantFailures.push("acceptance matrix must include Phase 58 final-audit mathematical-integrity boundary");
}

if (!acceptanceMatrix.includes("Campaign ensemble state is campaign-scoped")) {
  invariantFailures.push("acceptance matrix must include Phase 34 campaign ensemble mathematical-integrity acceptance");
}

if (!acceptanceMatrix.includes("Final replay audit paths are claim-scoped")) {
  invariantFailures.push("acceptance matrix must include Phase 35 final replay audit-path mathematical-integrity acceptance");
}

if (!acceptanceMatrix.includes("sandbox-policy and dependency-lock material")) {
  invariantFailures.push("acceptance matrix must include Phase 36 replay provenance integrity language");
}

if (!acceptanceMatrix.includes("explicit alias acceptance")) {
  invariantFailures.push("acceptance matrix must include Phase 37 registered statement-alias coverage language");
}

if (!acceptanceMatrix.includes("real `triviumdb@0.7.1` loading")) {
  invariantFailures.push("acceptance matrix must include Phase 38 real TriviumDB loading coverage language");
}

if (!acceptanceMatrix.includes("malformed-lock fail-closed behavior")) {
  invariantFailures.push("acceptance matrix must include Phase 39 malformed-lock fail-closed coverage language");
}

if (!acceptanceMatrix.includes("active-lock launch rejection")) {
  invariantFailures.push("acceptance matrix must include Phase 40 active-lock launch rejection coverage language");
}

if (!acceptanceMatrix.includes("/cm:agent execute")) {
  invariantFailures.push("acceptance matrix must include Phase 41 Pi command execution coverage language");
}

if (!acceptanceMatrix.includes("/cm:agent logs") || !acceptanceMatrix.includes("/cm:agent health")) {
  invariantFailures.push("acceptance matrix must include Phase 42 Pi command observability coverage language");
}

if (!acceptanceMatrix.includes("/cm:agent stream")) {
  invariantFailures.push("acceptance matrix must include Phase 46 Pi command log-stream coverage language");
}

if (!acceptanceMatrix.includes("/cm:agent subscribe-logs")) {
  invariantFailures.push("acceptance matrix must include Phase 47 Pi command log-subscription coverage language");
}

if (!acceptanceMatrix.includes("/cm:agent panel")) {
  invariantFailures.push("acceptance matrix must include Phase 48 Pi command operator-panel coverage language");
}

if (!acceptanceMatrix.includes("/cm:agent cancel")) {
  invariantFailures.push("acceptance matrix must include Phase 49 Pi command operator-cancel coverage language");
}

if (!acceptanceMatrix.includes("/cm:agent log-session")) {
  invariantFailures.push("acceptance matrix must include Phase 50 Pi command log-session coverage language");
}

if (!acceptanceMatrix.includes("--backend codex-api")) {
  invariantFailures.push("acceptance matrix must include Phase 51 Pi codex-api backend coverage language");
}

if (!acceptanceMatrix.includes("codex_api_retry_telemetry")) {
  invariantFailures.push("acceptance matrix must include Phase 52 codex_api_retry_telemetry capability language");
}

if (!acceptanceMatrix.includes("installed_codex_cli_validation")) {
  invariantFailures.push("acceptance matrix must include Phase 53 installed_codex_cli_validation capability language");
}

if (!acceptanceMatrix.includes("lean_declaration_parser_signature_fallback")) {
  invariantFailures.push("acceptance matrix must include Phase 54 lean_declaration_parser_signature_fallback capability language");
}

if (!acceptanceMatrix.includes("runner_cross_machine_replay_environment_gate")) {
  invariantFailures.push("acceptance matrix must include Phase 55 runner_cross_machine_replay_environment_gate capability language");
}

if (!acceptanceMatrix.includes("lean_registered_logical_equivalence_witnesses")) {
  invariantFailures.push("acceptance matrix must include Phase 56 lean_registered_logical_equivalence_witnesses capability language");
}

if (!acceptanceMatrix.includes("proof_kernel_theorem_template_instantiation")) {
  invariantFailures.push("acceptance matrix must include Phase 57 proof_kernel_theorem_template_instantiation capability language");
}

if (!acceptanceMatrix.includes("mathprove_final_audit_external_runner")) {
  invariantFailures.push("acceptance matrix must include Phase 58 mathprove_final_audit_external_runner capability language");
}

if (!acceptanceMatrix.includes("phase58-mathprove-final-audit-runner.test.mjs")) {
  invariantFailures.push("acceptance matrix must include Phase 58 final-audit runner test coverage language");
}

if (!acceptanceMatrix.includes("/cm:agent prepare-package") || !acceptanceMatrix.includes("/cm:agent execute-package")) {
  invariantFailures.push("acceptance matrix must include Phase 43 Pi packaged-adapter command coverage language");
}

if (!acceptanceMatrix.includes("phase45-pi-comathd-install-session.test.mjs")) {
  invariantFailures.push("acceptance matrix must include Phase 45 install-session e2e test coverage language");
}

if (!acceptanceMatrix.includes("phase46-agent-log-stream.test.mjs")) {
  invariantFailures.push("acceptance matrix must include Phase 46 service log-stream test coverage language");
}

if (!acceptanceMatrix.includes("phase46-agent-log-stream-tools.test.mjs")) {
  invariantFailures.push("acceptance matrix must include Phase 46 Pi log-stream test coverage language");
}

if (!acceptanceMatrix.includes("phase47-agent-log-subscription.test.mjs")) {
  invariantFailures.push("acceptance matrix must include Phase 47 service log-subscription test coverage language");
}

if (!acceptanceMatrix.includes("phase47-agent-log-subscription-tools.test.mjs")) {
  invariantFailures.push("acceptance matrix must include Phase 47 Pi log-subscription test coverage language");
}

if (!acceptanceMatrix.includes("phase48-agent-operator-panel.test.mjs")) {
  invariantFailures.push("acceptance matrix must include Phase 48 service operator-panel test coverage language");
}

if (!acceptanceMatrix.includes("phase48-agent-operator-panel-tools.test.mjs")) {
  invariantFailures.push("acceptance matrix must include Phase 48 Pi operator-panel test coverage language");
}

if (!acceptanceMatrix.includes("phase49-agent-operator-cancel.test.mjs")) {
  invariantFailures.push("acceptance matrix must include Phase 49 service operator-cancel test coverage language");
}

if (!acceptanceMatrix.includes("phase49-agent-operator-cancel-tools.test.mjs")) {
  invariantFailures.push("acceptance matrix must include Phase 49 Pi operator-cancel test coverage language");
}

if (!acceptanceMatrix.includes("phase50-agent-log-session.test.mjs")) {
  invariantFailures.push("acceptance matrix must include Phase 50 service log-session test coverage language");
}

if (!acceptanceMatrix.includes("phase50-agent-log-session-tools.test.mjs")) {
  invariantFailures.push("acceptance matrix must include Phase 50 Pi log-session test coverage language");
}

if (!acceptanceMatrix.includes("phase51-codex-api-backend.test.mjs")) {
  invariantFailures.push("acceptance matrix must include Phase 51 service Codex API backend test coverage language");
}

if (!acceptanceMatrix.includes("phase51-codex-api-backend-tools.test.mjs")) {
  invariantFailures.push("acceptance matrix must include Phase 51 Pi Codex API backend test coverage language");
}

if (!acceptanceMatrix.includes("phase52-codex-api-retry-telemetry.test.mjs")) {
  invariantFailures.push("acceptance matrix must include Phase 52 Codex API retry telemetry test coverage language");
}

if (!acceptanceMatrix.includes("phase53-installed-codex-cli-validation.test.mjs")) {
  invariantFailures.push("acceptance matrix must include Phase 53 installed Codex CLI validation test coverage language");
}

if (!acceptanceMatrix.includes("phase54-lean-declaration-parser.test.mjs")) {
  invariantFailures.push("acceptance matrix must include Phase 54 Lean declaration parser test coverage language");
}

if (!acceptanceMatrix.includes("phase55-runner-cross-machine-replay.test.mjs")) {
  invariantFailures.push("acceptance matrix must include Phase 55 runner cross-machine replay test coverage language");
}

if (!acceptanceMatrix.includes("phase56-lean-registered-logical-equivalence.test.mjs")) {
  invariantFailures.push("acceptance matrix must include Phase 56 registered Lean logical-equivalence test coverage language");
}

if (!acceptanceMatrix.includes("phase57-ga-theorem-template-instantiation.test.mjs")) {
  invariantFailures.push("acceptance matrix must include Phase 57 theorem template instantiation test coverage language");
}

for (const [content, label] of [
  [readme, "README.md"],
  [devPlan, "COMATH_PI_LAB_DEV_PLAN.md"]
]) {
  if (/currently at Phase 0|Phase 0: bootstrap only|No runtime research behavior is implemented yet/i.test(content)) {
    invariantFailures.push(`${label} must not describe the current repository as Phase 0-only`);
  }
}

const requiredSections = [
  [devPlan, "## 2. Goals And Non-Goals", "development plan must define goals and non-goals"],
  [devPlan, "## 17. Development Roadmap", "development plan must define full roadmap"],
  [devPlan, "### Phase 17: Evaluation And Audits", "development plan must include Phase 17"],
  [devPlan, "## 19. Completion Criteria For The Design Goal", "development plan must define design completion criteria"],
  [runbook, "### Phase 17: Evaluation And Audits", "runbook must include Phase 17 goal"],
  [runbook, "## 6. Subagent Matrix", "runbook must include subagent matrix"],
  [acceptanceMatrix, "## Phase Acceptance", "acceptance matrix must define phase acceptance"],
  [acceptanceMatrix, "## Mathematical Integrity Acceptance", "acceptance matrix must define math integrity acceptance"],
  [riskRegister, "## Current Risk Posture", "risk register must define current risk posture"],
  [agentModel, "## Merge Protocol", "agent model must define merge protocol"]
];

for (const [content, marker, message] of requiredSections) {
  if (!content.includes(marker)) {
    invariantFailures.push(`${message}: missing ${marker}`);
  }
}

if (invariantFailures.length > 0) {
  console.error("Phase 0 invariant check failed:");
  for (const failure of invariantFailures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log(`Phase 0/design smoke check passed (${required.length} required entries and ${18 + requiredSections.length} invariants).`);
