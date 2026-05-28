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
      "proof_kernel_theorem_template_instantiation",
      "campaign_pause_tick_guard",
      "candidate_manifest_v3_contract",
      "failure_route_aggregate_memory",
      "evidence_weighted_decision_forest",
      "native_stage_gate_artifact_guard",
      "lean_authority_v2_final_gate_hash_binding",
      "proof_memory_failed_route_retrieval",
      "v3_negative_ga_slice_runner",
      "stage_gate_repair_resume",
      "theorem_specific_lean_target_package",
      "bounded_theorem_specific_proof_body_synthesis",
      "bounded_lean_authority_report_preparation",
      "bounded_final_clean_replay_promotion",
      "registered_nat_linear_identity_targets",
      "controlled_nat_linear_identity_synthesis",
      "runner_reexecution_replay",
      "mathprove_external_evidence_runner",
      "mathprove_final_audit_external_runner",
      "pi_runtime_registration_v0755",
      "agent_run_runtime_boundary",
      "agent_run_process_scheduler",
      "agent_profile_service_api",
      "lean_trust_profile_hardening",
      "lean_statement_signature_binding",
      "lean_statement_alias_equivalence",
      "lean_declaration_parser_signature_fallback",
      "lean_registered_logical_equivalence_witnesses",
      "lean_registered_transitive_logical_equivalence_witnesses",
      "lean_equivalence_search_plan_artifacts",
      "lean_equivalence_witness_materialization",
      "proof_obligation_dag_planning",
      "campaign_scoped_ensemble_artifacts",
      "claim_scoped_final_replay_artifacts",
      "runner_replay_sandbox_dependency_provenance",
      "runner_network_denial_process_env_policy",
      "runner_cross_machine_replay_environment_gate",
      "trivium_target_platform_evaluation",
      "project_writer_session_lock",
      "agent_run_scheduler_writer_lock_integration",
      "live_agent_adapter_execution",
      "agent_run_observability",
      "agent_run_log_stream_cursor",
      "agent_run_log_subscription_sse",
      "agent_run_log_session_sse",
      "agent_run_operator_panel",
      "agent_run_operator_cancel",
      "agent_adapter_package_registry",
      "codex_cli_external_adapter_invocation",
      "codex_api_adapter_backend",
      "codex_api_retry_telemetry",
      "installed_codex_cli_validation"
    ],
    residualRisks: [
      "generic_proof_planning_deferred",
      "broad_mathprove_proof_search_deferred",
      "full_interactive_pi_e2e_install_flow_deferred",
      "runner_os_level_network_sandbox_enforcement_deferred",
      "agent_process_os_sandbox_deferred",
      "lean_equivalence_proof_execution_beyond_registered_materialization_deferred",
      "secret_scan_not_full_dlp"
    ]
  };
}

export const getBootstrapStatus = getComathdStatus;
