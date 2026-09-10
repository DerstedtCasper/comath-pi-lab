import type { ArtifactPointer, ScopeBinding, TaskBudget, Usage } from "../../research/research-schemas.js";
import type { WorkerEvent } from "./worker-event.js";

export type RuntimeCapabilities = { durable_provider_session: boolean; streaming_usage: boolean; exact_output_cap: boolean;
  exact_provider_request_quota: boolean; tool_events: boolean; steer: boolean; isolation: "oci" | "process_boundary_only" | "native_os_sandbox" };
export type StartWorkerInput = { attempt_key: string; lease_capability: string; context_pack: ArtifactPointer;
  approved_model_policy_id: string; approved_tool_policy_id: string; scope: ScopeBinding; budget: TaskBudget;
  workspace: { descriptor_id: string; workspace_path: string; context_path: string }; signal: AbortSignal };
export type ResumeWorkerInput = StartWorkerInput & { accepted_checkpoint: ArtifactPointer; previous_handle: WorkerHandle; usage_baseline: Usage };
export type WorkerHandle = { attempt_key: string; runtime_kind: string; owned_handle_id: string;
  provider_session?: { thread_id: string; turn_id?: string } };
export type UsageSnapshot = { attempt_key: string; source_key: string; thread_id?: string; total: Usage; observed_at: string };
/** Host adapters implement this interface; a capability declaration is not evidence of isolation. */
export interface AgentRuntimeAdapter {
  capabilities(): RuntimeCapabilities;
  start(input: StartWorkerInput): Promise<WorkerHandle>;
  resume(input: ResumeWorkerInput): Promise<WorkerHandle>;
  steer(handle: WorkerHandle, instruction: string): Promise<void>;
  cancel(handle: WorkerHandle, reason: string): Promise<void>;
  events(handle: WorkerHandle): AsyncIterable<WorkerEvent>;
  snapshotUsage(handle: WorkerHandle): Promise<UsageSnapshot | null>;
  close(): Promise<void>;
}
