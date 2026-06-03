import { existsSync, readdirSync, readFileSync } from "node:fs";
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
  "docs/architecture/ga-release-criteria.md",
  "docs/architecture/threat-model.md",
  "docs/architecture/adapter-contracts.md",
  "docs/architecture/external-lean-supply-chain.md",
  "docs/architecture/evidence-pack-policy.md",
  "docs/adr/0001-single-mutation-gateway.md",
  "docs/integrations/pi-runtime-assumptions.md",
  "docs/examples/README.md",
  "docs/progress/design-handoff.md",
  "docs/superpowers/plans/2026-05-25-full-design-documentation.md",
  "config/README.md",
  "config/comath.sample.json",
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
const review = readFileSync(join(root, "REVIEW.md"), "utf8");
const acceptanceMatrix = readFileSync(join(root, "docs/architecture/acceptance-matrix.md"), "utf8");
const riskRegister = readFileSync(join(root, "docs/architecture/risk-register.md"), "utf8");
const agentModel = readFileSync(join(root, "docs/architecture/agent-operating-model.md"), "utf8");
const gaReleaseCriteria = readFileSync(join(root, "docs/architecture/ga-release-criteria.md"), "utf8");
const threatModel = readFileSync(join(root, "docs/architecture/threat-model.md"), "utf8");
const adapterContracts = readFileSync(join(root, "docs/architecture/adapter-contracts.md"), "utf8");
const leanSupplyChain = readFileSync(join(root, "docs/architecture/external-lean-supply-chain.md"), "utf8");
const evidencePackPolicy = readFileSync(join(root, "docs/architecture/evidence-pack-policy.md"), "utf8");
const productReadinessMatrix = readFileSync(join(root, "docs/progress/product-readiness-matrix.md"), "utf8");
const goal3FinalGaAudit = readFileSync(join(root, "docs/progress/goal-3-final-ga-audit.md"), "utf8");
const goal3TasksPath = join(root, "goal-3/tasks.md");
const goal3Tasks = existsSync(goal3TasksPath) ? readFileSync(goal3TasksPath, "utf8") : "";
const sampleConfig = readFileSync(join(root, "config/comath.sample.json"), "utf8");
const configReadme = readFileSync(join(root, "config/README.md"), "utf8");
const moduleBoundaries = readFileSync(join(root, "docs/architecture/module-boundaries.md"), "utf8");
const securityReview = readFileSync(join(root, "SECURITY_REVIEW.md"), "utf8");
const mathIntegrityReview = readFileSync(join(root, "MATH_INTEGRITY_REVIEW.md"), "utf8");
const contributing = readFileSync(join(root, "CONTRIBUTING.md"), "utf8");
const examplesReadme = readFileSync(join(root, "docs/examples/README.md"), "utf8");

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

if (!readme.includes("Goal 3")) {
  invariantFailures.push("README must describe the current Goal 3 GA-refactor state");
}

if (!readme.includes("Lean4/mathlib")) {
  invariantFailures.push("README must name Lean4/mathlib as the final proof authority boundary");
}

if (/final Task 20 audit/i.test(readme)) {
  invariantFailures.push("README must not describe current Goal 3 GA completion in terms of stale final Task 20 audit wording");
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
  ["75 bounded final clean replay promotion", "phase75-bounded-final-clean-replay.test.mjs"],
  ["76 registered Nat linear identity targets", "phase76-registered-nat-linear-targets.test.mjs"],
  ["77 Runner network sandbox policy", "phase77-runner-network-sandbox-policy.test.mjs"],
  ["78 registered transitive statement-equivalence witnesses", "phase78-lean-transitive-equivalence.test.mjs"],
  ["79 statement-equivalence proof-search plan artifacts", "phase79-lean-equivalence-search-plan.test.mjs"],
  ["80 bounded equivalence-search witness materialization", "phase80-bounded-equivalence-witness-materialization.test.mjs"]
];

for (const [marker, testName] of goal2AcceptanceMarkers) {
  if (!acceptanceMatrix.includes(marker)) {
    invariantFailures.push(`acceptance matrix must include ${marker}`);
  }
  if (!acceptanceMatrix.includes(testName)) {
    invariantFailures.push(`acceptance matrix must include ${testName}`);
  }
}

const historicalNatSliceRequired = [
  ["18", "old `Nat.add_zero` campaign fixture"],
  ["23", "old `Nat.mul_zero` theorem-family fixture"],
  ["57", "phase57-ga-theorem-template-instantiation.test.mjs"],
  ["67", "phase67-v3-formal-campaign-slice.test.mjs"],
  ["72", "theorem_specific_lean_project.json"],
  ["73", "bounded_proof_body_synthesis.json"],
  ["74", "bounded_authority_report_preparation.json"],
  ["75", "final_replay_manifest.json"],
  ["76", "registered Nat linear identity targets"]
];

for (const [phase, marker] of historicalNatSliceRequired) {
  const row = acceptanceMatrix
    .split(/\r?\n/)
    .find((line) => line.includes(marker));
  if (!row) {
    invariantFailures.push(`acceptance matrix must retain Phase ${phase} Nat/formal replay historical marker: ${marker}`);
    continue;
  }
  if (!/Historical fixture coverage only|not current production|quarantined/i.test(row)) {
    invariantFailures.push(
      `acceptance matrix Phase ${phase} legacy Nat/formal replay row must be marked historical/quarantined, not current production proof path`
    );
  }
}

for (const [content, label, pattern, guard] of [
  [
    devPlan,
    "COMATH_PI_LAB_DEV_PLAN.md",
    /registered Nat linear identity target table|Phase 72-76|final clean replay\/promotion paths/i,
    /historical|quarantined|not current production proof path/i
  ],
  [
    runbook,
    "CODEX_GOAL_RUNBOOK.md",
    /positive `Nat\.add_zero` campaign reaches `formal_proof_verified`|gate-mediated `formally_checked`/i,
    /historical|quarantined|not current production proof path/i
  ]
]) {
  if (pattern.test(content) && !guard.test(content)) {
    invariantFailures.push(`${label} legacy Nat/formal replay wording must be explicitly historical/quarantined`);
  }
}

function requireGuardedLines(content, label, patterns, guard) {
  const lines = content.split(/\r?\n/);
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    if (!patterns.some((pattern) => pattern.test(line))) {
      continue;
    }
    const context = [
      lines[index - 1] ?? "",
      line,
      lines[index + 1] ?? ""
    ].join("\n");
    if (!guard.test(context)) {
      invariantFailures.push(`${label}:${index + 1} legacy release/proof-authority wording must be guarded as historical/quarantined`);
    }
  }
}

requireGuardedLines(
  productReadinessMatrix,
  "docs/progress/product-readiness-matrix.md",
  [
    /Native proof-kernel is the GA proof authority/i,
    /Implemented for registered elementary Nat theorem-family slices/i,
    /Phase 67 positive slice|Phase 72-76|clean replay, promotion/i
  ],
  /historical|quarantined|not current production proof path|not current release authority/i
);

requireGuardedLines(
  devPlan,
  "COMATH_PI_LAB_DEV_PLAN.md",
  [
    /clean Lean replay for the registered/i,
    /positive `Nat\.add_zero` formal proof vertical slice/i,
    /The GA vertical slice is complete when/i,
    /one Lean theorem replay passes from a clean workspace/i,
    /snapshot restore followed by proof replay passes/i
  ],
  /historical|quarantined|not current production proof path|not current release criteria/i
);

const evidenceLabelSection = evidencePackPolicy.match(/## Evidence Labels[\s\S]*?(?:\n## |$)/)?.[0] ?? "";
if (
  evidenceLabelSection.includes("`proven`") &&
  !/FinalAuthorityPackagingV3|source report|generic Lean Authority v3 packaging/i.test(evidenceLabelSection)
) {
  invariantFailures.push("evidence pack policy proven label must require Lean Authority v3 source-report/package evidence");
}

if (
  gaReleaseCriteria.includes("formally_checked") &&
  !/FinalAuthorityPackagingV3|source report|generic Lean Authority v3 packaging/i.test(gaReleaseCriteria)
) {
  invariantFailures.push("GA release criteria must bind formally_checked release claims to Lean Authority v3 source-report/package evidence");
}

const releaseHardeningFocusedSuites = [
  "goal3-task167-agent-adapter-os-isolation-readiness.test.mjs",
  "goal3-task168-agent-adapter-os-isolation-probe.test.mjs",
  "goal3-task170-agent-adapter-os-isolation-host-collection.test.mjs",
  "goal3-task171-agent-adapter-os-isolation-sandbox-launch.test.mjs",
  "goal3-task172-agent-adapter-os-isolation-sandbox-execution.test.mjs",
  "goal3-task173-pi-agent-adapter-os-isolation-sandbox-execution-consumer.test.mjs",
  "goal3-task175-agent-adapter-os-isolation-provider-runner.test.mjs",
  "goal3-task176-agent-adapter-os-isolation-provider-helper-execution.test.mjs",
  "goal3-task177-agent-adapter-os-isolation-provider-helper-collection.test.mjs",
  "goal3-task178-agent-adapter-os-isolation-provider-helper-host-validation.test.mjs",
  "goal3-task179-agent-adapter-os-isolation-provider-helper-execution-host-validation-binding.test.mjs",
  "goal3-task181-agent-adapter-os-isolation-configured-provider-helper-asset.test.mjs",
  "goal3-task182-agent-adapter-os-isolation-configured-helper-execution-collection.test.mjs",
  "goal3-task184-agent-adapter-os-isolation-cross-provider-helper-assets.test.mjs",
  "goal3-task185-agent-adapter-os-isolation-helper-self-test-contract.test.mjs",
  "goal3-task186-agent-adapter-os-isolation-self-test-binding.test.mjs",
  "goal3-task187-agent-adapter-os-isolation-helper-runtime-attestation.test.mjs",
  "goal3-task188-agent-adapter-os-isolation-bundled-helper-asset.test.mjs",
  "goal3-task189-agent-adapter-os-isolation-provider-helper-chain-check-debug.test.mjs",
  "goal3-task190-agent-adapter-os-isolation-provider-host-capability-probe-contract.test.mjs",
  "goal3-task191-agent-adapter-os-isolation-provider-host-capability-helper-validation-binding.test.mjs",
  "goal3-task192-pi-provider-helper-host-capability-consumer.test.mjs",
  "goal3-task193-agent-adapter-os-isolation-default-provider-host-capability-probe.test.mjs",
  "phase43-agent-adapter-package.test.mjs",
  "phase44-codex-cli-external-invocation.test.mjs"
];

for (const testName of releaseHardeningFocusedSuites) {
  if (!gaReleaseCriteria.includes(testName)) {
    invariantFailures.push(`GA release criteria must list release-hardening focused suite ${testName}`);
  }
}

const publicReadinessWordingDocs = [
  [readme, "README.md"],
  [adapterContracts, "docs/architecture/adapter-contracts.md"],
  [readFileSync(join(root, "AGENTS.md"), "utf8"), "AGENTS.md"]
];

for (const [content, label] of publicReadinessWordingDocs) {
  if (/consumer outputs?.{0,80}(?:can feed|release-readiness evidence)/is.test(content)) {
    invariantFailures.push(`${label} must not imply Pi consumer outputs can feed readiness/release gates directly`);
  }
  if (/bridge and consumer are release-readiness evidence/i.test(content)) {
    invariantFailures.push(`${label} must distinguish bridge manifests and Pi consumers from canonical service-owned readiness evidence`);
  }
}

for (const envName of [
  "COMATH_AGENT_ADAPTER_OSISO_OCI_HELPER",
  "COMATH_AGENT_ADAPTER_OSISO_OCI_HELPER_ARGS_JSON",
  "COMATH_AGENT_ADAPTER_OSISO_NIX_HELPER",
  "COMATH_AGENT_ADAPTER_OSISO_NIX_HELPER_ARGS_JSON",
  "COMATH_AGENT_ADAPTER_OSISO_FIREJAIL_HELPER",
  "COMATH_AGENT_ADAPTER_OSISO_FIREJAIL_HELPER_ARGS_JSON",
  "COMATH_AGENT_ADAPTER_OSISO_WINDOWS_APPCONTAINER_HELPER",
  "COMATH_AGENT_ADAPTER_OSISO_WINDOWS_APPCONTAINER_HELPER_ARGS_JSON",
  "COMATH_AGENT_ADAPTER_OSISO_MACOS_SANDBOX_EXEC_HELPER",
  "COMATH_AGENT_ADAPTER_OSISO_MACOS_SANDBOX_EXEC_HELPER_ARGS_JSON",
  "COMATH_AGENT_ADAPTER_OSISO_PROVIDER_HELPER",
  "COMATH_AGENT_ADAPTER_OSISO_PROVIDER_HELPER_ARGS_JSON"
]) {
  if (!sampleConfig.includes(envName)) {
    invariantFailures.push(`sample config must expose ${envName} as a host-only configuration handle`);
  }
  if (!configReadme.includes(envName)) {
    invariantFailures.push(`config README must explain ${envName} host-only helper configuration semantics`);
  }
}

if (!sampleConfig.includes('"hostValidationSelfTestRequired": true')) {
  invariantFailures.push("sample config must mark configured provider helpers as requiring the host-validation self-test contract");
}
if (!configReadme.includes("provider-helper self-test")) {
  invariantFailures.push("config README must explain the configured helper host-validation self-test contract");
}

const publicArchiveContractDocs = [
  [readme, "README.md"],
  [review, "REVIEW.md"],
  [runbook, "CODEX_GOAL_RUNBOOK.md"],
  [gaReleaseCriteria, "docs/architecture/ga-release-criteria.md"],
  [evidencePackPolicy, "docs/architecture/evidence-pack-policy.md"]
];

for (const [content, label] of publicArchiveContractDocs) {
  const hasPublicDiagnosticArchive =
    /source-review|source review|public diagnostic|public archive/i.test(content) &&
    /proof_authority:?\s*["`']?none|non-authoritative|not proof authority|public_archive_is_proof_authority/i.test(content);
  const hasPublicSnapshotDownload =
    /public_download/.test(content) &&
    /can_restore\s*=\s*false|can_restore["`]?:\s*false|non-restorable|not a restore source|cannot be restored/i.test(content);
  const hasInternalRestore =
    /internal_restore/.test(content) &&
    /byte-for-byte|runtime fidelity|restore-fidelity|restore source/i.test(content);
  const hasLeanAuthorityBoundary =
    /FinalAuthorityPackagingV3|comath\.final_authority_packaging\.v3|Lean Authority v3 source-report/i.test(content);

  if (!hasPublicDiagnosticArchive || !hasPublicSnapshotDownload || !hasInternalRestore || !hasLeanAuthorityBoundary) {
    invariantFailures.push(
      `${label} must distinguish public diagnostic/source-review archives, public_download non-restorable snapshots, internal_restore restore-fidelity snapshots, and Lean Authority v3 evidence`
    );
  }
}

if (
  /Task\s+(?:2[1-9]|[3-9]\d|1\d\d)/.test(goal3Tasks) &&
  /final Task 20 review of the current/i.test(goal3FinalGaAudit) &&
  !/historical snapshot|superseded by later Goal 3 tasks|audited commit/i.test(goal3FinalGaAudit)
) {
  invariantFailures.push("goal-3-final-ga-audit.md must be marked as a historical snapshot once later Goal 3 tasks exist");
}

const terminalStateSection = examplesReadme.match(/## Terminal States[\s\S]*?(?:\n## |$)/)?.[0] ?? "";
if (
  terminalStateSection.includes("formal_replay_passed") &&
  !/FinalReplayManifest|promotion gate|final replay packaging/i.test(terminalStateSection)
) {
  invariantFailures.push("docs/examples/README.md formal_replay_passed terminal state must mention FinalReplayManifest/promotion-gate packaging");
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

if (!acceptanceMatrix.includes("lean_registered_transitive_logical_equivalence_witnesses")) {
  invariantFailures.push("acceptance matrix must include Phase 78 lean_registered_transitive_logical_equivalence_witnesses capability language");
}

if (!acceptanceMatrix.includes("lean_equivalence_search_plan_artifacts")) {
  invariantFailures.push("acceptance matrix must include Phase 79 lean_equivalence_search_plan_artifacts capability language");
}

if (!acceptanceMatrix.includes("equivalence_search_plan.json")) {
  invariantFailures.push("acceptance matrix must include Phase 79 equivalence_search_plan artifact language");
}

if (!acceptanceMatrix.includes("lean_equivalence_witness_materialization")) {
  invariantFailures.push("acceptance matrix must include Phase 80 lean_equivalence_witness_materialization capability language");
}

if (!acceptanceMatrix.includes("equivalence_witness_materialized.json")) {
  invariantFailures.push("acceptance matrix must include Phase 80 equivalence_witness_materialized artifact language");
}

if (!acceptanceMatrix.includes("Registered transitive logical equivalence requires closed kernel-witness chains")) {
  invariantFailures.push("acceptance matrix must include Phase 78 registered transitive logical-equivalence security acceptance");
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
  [agentModel, "## Merge Protocol", "agent model must define merge protocol"],
  [gaReleaseCriteria, "## Hard GA Blockers", "GA release criteria must define hard blockers"],
  [threatModel, "## Primary Threats", "threat model must define primary threats"],
  [adapterContracts, "## Common Adapter Envelope", "adapter contracts must define common adapter envelope"],
  [leanSupplyChain, "trusted_replay_dependency", "external Lean supply chain must define trusted replay dependency"],
  [evidencePackPolicy, "## Required For Promoted Proofs", "evidence pack policy must define promoted-proof contents"]
];

for (const [content, marker, message] of requiredSections) {
  if (!content.includes(marker)) {
    invariantFailures.push(`${message}: missing ${marker}`);
  }
}

if (!gaReleaseCriteria.includes("CoMath is an open-source agentic formal mathematics workbench built around Lean4/mathlib")) {
  invariantFailures.push("GA release criteria must include required public positioning wording");
}

if (!threatModel.includes("document text as quoted data")) {
  invariantFailures.push("threat model must document literature/RAG prompt-injection boundary");
}

if (!adapterContracts.includes('proof_authority: "none"')) {
  invariantFailures.push("adapter contracts must keep adapter outputs proof_authority=none");
}

if (!leanSupplyChain.includes("planning_reference") || !leanSupplyChain.includes("candidate_dependency") || !leanSupplyChain.includes("approved_dependency")) {
  invariantFailures.push("external Lean supply-chain doc must include dependency state machine");
}

if (!evidencePackPolicy.includes("FinalReplayManifest")) {
  invariantFailures.push("evidence pack policy must require FinalReplayManifest");
}

if (!sampleConfig.includes("lean4_mathlib_clean_replay") || !sampleConfig.includes("trusted_replay_dependency")) {
  invariantFailures.push("sample config must preserve Lean authority and trusted replay dependency policy");
}

if (!moduleBoundaries.includes("docs/architecture/ga-release-criteria.md") || !moduleBoundaries.includes(".pi/agents")) {
  invariantFailures.push("module boundaries must include Goal 3 release-hardening docs and prompt ownership");
}

if (!riskRegister.includes("Documentation overclaims Goal 3 readiness") || !riskRegister.includes("Agent prompt edits weaken proof-authority invariants")) {
  invariantFailures.push("risk register must include Goal 3 release-hardening and prompt-invariant risks");
}

if (!agentModel.includes("## Goal 3 Agent Invariants") || !agentModel.includes("one coordinator plus eight specialists")) {
  invariantFailures.push("agent operating model must document Goal 3 1+8 agent invariants");
}

if (!securityReview.includes("Goal 3 Task 19 release-hardening note")) {
  invariantFailures.push("security review must include Goal 3 Task 19 release-hardening note");
}

if (!mathIntegrityReview.includes("Goal 3 Task 19 integrity warning")) {
  invariantFailures.push("math integrity review must include Goal 3 Task 19 integrity warning");
}

if (!contributing.includes("Lean4/mathlib clean replay is the only final proof authority")) {
  invariantFailures.push("CONTRIBUTING must preserve Lean-authority contribution invariant");
}

if (!examplesReadme.includes("These examples describe expected public campaign shapes") || !examplesReadme.includes("proof_authority=none")) {
  invariantFailures.push("example campaigns must remain non-proof artifacts and mark adapter hints as proof_authority=none");
}

const agentDir = join(root, ".pi/agents");
const promptDir = join(root, ".pi/prompts");
const agentFiles = readdirSync(agentDir).filter((entry) => entry.endsWith(".md"));
const promptFiles = readdirSync(promptDir).filter((entry) => entry.endsWith(".md"));

for (const file of agentFiles) {
  const content = readFileSync(join(agentDir, file), "utf8");
  const checks = [
    ["proof_authority: none", "frontmatter proof_authority must be none"],
    ["proof_authority=none", "body must state proof_authority=none"],
    ["may_mutate_trusted_state=false", "body must state may_mutate_trusted_state=false"],
    ["locked statement hash", "body must require locked statement hash preservation"],
    ["strict JSON", "body must require strict JSON or schema output"],
    ["blocker", "body must require blocker reporting"]
  ];
  for (const [needle, message] of checks) {
    if (!content.includes(needle)) {
      invariantFailures.push(`.pi/agents/${file}: ${message}`);
    }
  }
  if (!/vote|literature|CAS|SAT|SMT|reviewer|MathProve/.test(content)) {
    invariantFailures.push(`.pi/agents/${file}: must reject non-Lean proof authorities`);
  }
}

for (const file of promptFiles) {
  const content = readFileSync(join(promptDir, file), "utf8");
  const checks = [
    ["proof_authority=none", "prompt must state proof_authority=none"],
    ["may_mutate_trusted_state=false", "prompt must state may_mutate_trusted_state=false"],
    ["locked statement hash", "prompt must require locked statement hash preservation"],
    ["strict JSON", "prompt must require strict JSON or schema output"],
    ["not proof authority", "prompt must reject non-Lean proof authorities"]
  ];
  for (const [needle, message] of checks) {
    if (!content.includes(needle)) {
      invariantFailures.push(`.pi/prompts/${file}: ${message}`);
    }
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
