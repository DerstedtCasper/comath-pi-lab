import type { ProjectRuntime } from "./project-runtime.js";
import type { CampaignTickInput, CampaignTickResult } from "../proof-kernel/campaign/campaign-tick.js";

export type ProofWorkflowBridge = {
  requestAdvance(input: CampaignTickInput): Promise<CampaignTickResult>;
  requestReplay(input: CampaignTickInput): Promise<CampaignTickResult>;
  cancel(campaignId: string, actor?: string): Promise<void>;
};
const bridges = new WeakMap<ProjectRuntime, ProofWorkflowBridge>();
export function registerProofWorkflowBridge(runtime: ProjectRuntime, bridge: ProofWorkflowBridge): () => void {
  if (bridges.has(runtime)) throw new Error("Project already has a proof workflow owner");
  bridges.set(runtime, bridge);
  return () => { if (bridges.get(runtime) === bridge) bridges.delete(runtime); };
}
export function getProofWorkflowBridge(runtime: ProjectRuntime): ProofWorkflowBridge | undefined { return bridges.get(runtime); }
