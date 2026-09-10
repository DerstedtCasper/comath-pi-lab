import { ComathError } from "../../errors.js";
import type { ProofObligation, ResearchCampaign } from "../../types/schemas.js";
import { validateProofObligationDag } from "../stages/proof-obligation-dag.js";

/** Decomposition describes structure; only explicit dependencies govern readiness. */
export function validateObligationGraphs(all: readonly ProofObligation[]): void {
  validateProofObligationDag({
    nodes: all.map(item => ({ obligation_id: item.obligation_id, claim_id: item.claim_id,
      theorem_family: typeof item.locked_statement_structured.theorem_family === "string" ? item.locked_statement_structured.theorem_family : "unregistered",
      locked_statement_hash: item.statement_hash, lean_target: item.lean_target ?? null, status: item.status, kind: "leaf" as const })),
    edges: all.filter(item => item.parent_obligation_id !== undefined).map(item => ({
      from_obligation_id: item.parent_obligation_id!, to_obligation_id: item.obligation_id, relation: "decomposes_to" as const })),
    dependency_edges: all.flatMap(item => item.dependencies.map(dependency => ({
      from_obligation_id: item.obligation_id, to_obligation_id: dependency, relation: "depends_on" as const })))
  });
}

export function replaceObligationById(all: readonly ProofObligation[], next: ProofObligation): ProofObligation[] {
  validateObligationGraphs(all);
  const index = all.findIndex(item => item.obligation_id === next.obligation_id);
  if (index < 0) throw new ComathError("Cannot replace an unknown proof obligation", { statusCode: 409, code: "ACTIVE_OBLIGATION_UNKNOWN" });
  const replaced = [...all]; replaced[index] = next;
  validateObligationGraphs(replaced);
  return replaced;
}

function dependenciesIntegrated(item: ProofObligation, byId: Map<string, ProofObligation>): boolean {
  return item.dependencies.every(dependency => byId.get(dependency)?.status === "integrated");
}

function ready(all: readonly ProofObligation[]): ProofObligation | null {
  const byId = new Map(all.map(item => [item.obligation_id, item]));
  return all.filter(item => item.status === "queued" && dependenciesIntegrated(item, byId))
    .sort((a, b) => a.obligation_id < b.obligation_id ? -1 : a.obligation_id > b.obligation_id ? 1 : 0)[0] ?? null;
}

export function selectReadyObligation(all: readonly ProofObligation[]): ProofObligation | null {
  validateObligationGraphs(all);
  return ready(all);
}

export function resolveActiveObligation(campaign: Pick<ResearchCampaign, "open_obligations" | "active_obligation_id">): ProofObligation | null {
  const all = campaign.open_obligations;
  validateObligationGraphs(all);
  const explicit = campaign.active_obligation_id !== undefined;
  const current = explicit ? all.find(item => item.obligation_id === campaign.active_obligation_id) : all.length === 1 ? all[0] : undefined;
  if (explicit && !current) throw new ComathError("Active proof obligation does not exist", { statusCode: 409, code: "ACTIVE_OBLIGATION_UNKNOWN" });
  if (!current) return ready(all);
  if (!dependenciesIntegrated(current, new Map(all.map(item => [item.obligation_id, item])))) {
    throw new ComathError("Active proof obligation has unmet integration prerequisites", { statusCode: 409, code: "ACTIVE_OBLIGATION_DEPENDENCIES_UNMET" });
  }
  // A completed active obligation is never executed again. The caller owns
  // clearing the active binding and advancing; blocked work remains repairable.
  return current.status === "integrated" ? null : current;
}
