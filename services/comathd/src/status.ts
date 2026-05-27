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
      "read_only_dashboard",
      "snapshot_replay",
      "phase17_integrity_evaluation",
      "proof_kernel_ga_vertical_slice",
      "proof_kernel_ensemble_recovery",
      "campaign_state_machine_v3",
      "claim_evidence_gate_read_models",
      "pi_research_campaign_loop",
      "proof_kernel_theorem_family_registry",
      "runner_reexecution_replay",
      "mathprove_external_evidence_runner",
      "pi_runtime_registration_v0755",
      "agent_run_runtime_boundary",
      "agent_run_process_scheduler",
      "agent_profile_service_api",
      "lean_trust_profile_hardening",
      "lean_statement_signature_binding",
      "lean_statement_alias_equivalence",
      "proof_obligation_dag_planning",
      "campaign_scoped_ensemble_artifacts",
      "claim_scoped_final_replay_artifacts",
      "runner_replay_sandbox_dependency_provenance",
      "trivium_target_platform_evaluation",
      "project_writer_session_lock",
      "agent_run_scheduler_writer_lock_integration",
      "live_agent_adapter_execution",
      "agent_run_observability",
      "agent_run_log_stream_cursor",
      "agent_run_log_subscription_sse",
      "agent_run_operator_panel",
      "agent_run_operator_cancel",
      "agent_adapter_package_registry",
      "codex_cli_external_adapter_invocation"
    ],
    residualRisks: [
      "generic_proof_planning_deferred",
      "broad_mathprove_proof_search_deferred",
      "full_interactive_pi_e2e_install_flow_deferred",
      "runner_os_network_sandbox_enforcement_deferred",
      "agent_process_os_sandbox_deferred",
      "lean_parser_logical_equivalence_deferred",
      "secret_scan_not_full_dlp"
    ]
  };
}

export const getBootstrapStatus = getComathdStatus;
