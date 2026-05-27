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
  "snapshot_replay",
  "proof_kernel_ga_vertical_slice",
  "runner_reexecution_replay",
  "mathprove_external_evidence_runner",
  "pi_runtime_registration_v0755",
  "proof_obligation_dag_planning",
  "campaign_scoped_ensemble_artifacts",
  "claim_scoped_final_replay_artifacts",
  "runner_replay_sandbox_dependency_provenance"
];

for (const capability of requiredCapabilities) {
  if (!status.capabilities?.includes(capability)) {
    throw new Error(`Research Alpha status missing capability: ${capability}`);
  }
}

const requiredResidualRisks = [
  "generic_proof_planning_deferred",
  "broad_mathprove_proof_search_deferred",
  "full_interactive_pi_e2e_install_flow_deferred",
  "runner_os_network_sandbox_enforcement_deferred"
];

for (const risk of requiredResidualRisks) {
  if (!status.residualRisks?.includes(risk)) {
    throw new Error(`Research Alpha status missing residual risk: ${risk}`);
  }
}

console.log("comathd Research Alpha smoke test passed.");
