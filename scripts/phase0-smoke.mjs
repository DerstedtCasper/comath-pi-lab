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

if (!readme.includes("Phase 18-43")) {
  invariantFailures.push("README must describe the current Phase 18-43 GA vertical-slice evidence");
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

if (!acceptanceMatrix.includes("/cm:agent prepare-package") || !acceptanceMatrix.includes("/cm:agent execute-package")) {
  invariantFailures.push("acceptance matrix must include Phase 43 Pi packaged-adapter command coverage language");
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
