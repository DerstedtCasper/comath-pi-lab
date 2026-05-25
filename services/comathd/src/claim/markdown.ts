import type { Claim } from "../types/schemas.js";

export function claimToMarkdown(claim: Claim): string {
  const assumptions = claim.assumptions.length ? claim.assumptions.map((item) => `- ${item}`).join("\n") : "- none";
  return [
    `# ${claim.id}`,
    "",
    `Status: ${claim.status}`,
    `Evidence level: ${claim.evidence_level}`,
    `Domain: ${claim.domain}`,
    `Statement hash: ${claim.statement_hash}`,
    "",
    "## Statement",
    "",
    claim.statement,
    "",
    "## Assumptions",
    "",
    assumptions,
    "",
    "## Gate",
    "",
    `Gate result: ${claim.gate_result_id ?? "none"}`,
    `Formalization: ${claim.formalization_status}`,
    `Dependency closure: ${claim.dependency_closure_status}`,
    `Audit: ${claim.audit_state}`
  ].join("\n");
}
