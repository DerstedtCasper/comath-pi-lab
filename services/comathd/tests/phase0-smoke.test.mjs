import { getBootstrapStatus } from "../dist/index.js";

const status = getBootstrapStatus();

if (status.phase !== "research-alpha") {
  throw new Error(`Unexpected comathd phase: ${status.phase}`);
}

if (status.implementsRuntimeBehavior !== true) {
  throw new Error("Research Alpha comathd must report implemented runtime behavior.");
}

const requiredCapabilities = [
  "project_lifecycle",
  "claim_registry",
  "fail_closed_promotion_gate",
  "artifact_audit_kernel",
  "in_memory_research_memory",
  "mathprove_bridge_mock",
  "compute_runners",
  "literature_condition_matching",
  "working_paper",
  "pi_extension_installable_package",
  "external_cli_control",
  "snapshot_replay"
];

for (const capability of requiredCapabilities) {
  if (!status.capabilities?.includes(capability)) {
    throw new Error(`Research Alpha status missing capability: ${capability}`);
  }
}

const requiredResidualRisks = [
  "real_lean_kernel_execution_deferred",
  "installed_pi_runtime_validation_deferred",
  "runner_reexecution_replay_deferred"
];

for (const risk of requiredResidualRisks) {
  if (!status.residualRisks?.includes(risk)) {
    throw new Error(`Research Alpha status missing residual risk: ${risk}`);
  }
}

console.log("comathd Research Alpha smoke test passed.");
