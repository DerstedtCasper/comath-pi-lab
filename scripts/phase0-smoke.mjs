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

if (!readme.includes("Phase 18-29")) {
  invariantFailures.push("README must describe the current Phase 18-29 GA vertical-slice evidence");
}

if (!acceptanceMatrix.includes("29 Agent profile service integration")) {
  invariantFailures.push("acceptance matrix must include Phase 29 Agent profile service integration acceptance");
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

console.log(`Phase 0/design smoke check passed (${required.length} required entries and ${5 + requiredSections.length} invariants).`);
