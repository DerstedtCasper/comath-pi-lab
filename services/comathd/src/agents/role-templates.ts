import { getAgentProfile, listAgentProfiles, type AgentProfileId } from "./agent-profiles.js";
import type { AgentRole } from "../types/schemas.js";

export type RoleTemplate = { id: AgentProfileId; role: AgentRole; model_policy_default: string; tool_policy_default: string;
  allowed_tools: string[]; forbidden_tools: string[]; write_scope_templates: string[]; output_requirements: string[];
  may_mutate_trusted_state: false; proof_authority: "none" };
export function getRoleTemplate(id: AgentProfileId): RoleTemplate {
  const profile = getAgentProfile(id);
  return { id: profile.id, role: profile.role, model_policy_default: profile.model_profile, tool_policy_default: profile.tool_profile,
    allowed_tools: [...profile.allowed_tools], forbidden_tools: [...profile.forbidden_tools], write_scope_templates: [...profile.write_scope_templates],
    output_requirements: ["Record explicit scope and assumptions", "Submit a structured checkpoint and artifact references", "Keep all research output proof_authority=none"],
    may_mutate_trusted_state: false, proof_authority: "none" };
}
export function listRoleTemplates(): RoleTemplate[] { return listAgentProfiles().map(profile => getRoleTemplate(profile.id)); }
