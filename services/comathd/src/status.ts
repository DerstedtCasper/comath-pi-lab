export const comathdPhase = "research-alpha";

export type ComathdRuntimeStatus = {
  phase: typeof comathdPhase;
  implementsRuntimeBehavior: true;
  capabilities: string[];
  residualRisks: string[];
};

export function getComathdStatus(): ComathdRuntimeStatus {
  return {
    phase: comathdPhase,
    implementsRuntimeBehavior: true,
    capabilities: [
      "project_lifecycle",
      "claim_registry",
      "fail_closed_promotion_gate",
      "artifact_audit_kernel",
      "in_memory_research_memory",
      "optional_trivium_adapter_boundary",
      "workstreams_graphpatch",
      "mathprove_bridge_mock",
      "compute_runners",
      "literature_condition_matching",
      "working_paper",
      "braid_statistics_domain_pack",
      "pi_extension_thin_client",
      "pi_extension_installable_package",
      "external_cli_control",
      "read_only_dashboard",
      "snapshot_replay",
      "phase17_integrity_evaluation"
    ],
    residualRisks: [
      "real_lean_kernel_execution_deferred",
      "installed_pi_runtime_validation_deferred",
      "native_trivium_performance_evaluation_deferred",
      "runner_reexecution_replay_deferred",
      "secret_scan_not_full_dlp"
    ]
  };
}

export const getBootstrapStatus = getComathdStatus;
