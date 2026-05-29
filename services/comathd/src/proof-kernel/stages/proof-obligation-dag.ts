import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { ComathError } from "../../errors.js";
import { assertPathAllowed } from "../../security/path-policy.js";
import type { ProofObligation, ResearchCampaign } from "../../types/schemas.js";

export type ProofPlanningArtifacts = {
  lemma_dag_path: string;
  line_map_path: string;
  obligation_yaml_path: string;
  obligation_yaml_paths: string[];
  skeleton_lean_path: string;
  skeleton_report_path: string;
};

export type ProofObligationDagNode = {
  obligation_id: string;
  claim_id: string;
  theorem_family: string;
  locked_statement_hash: string;
  lean_target: string | null;
  status: ProofObligation["status"];
  kind: "root" | "intermediate" | "leaf";
};

export type ProofObligationDagEdge = {
  from_obligation_id: string;
  to_obligation_id: string;
  relation: "decomposes_to";
};

export type ProofObligationDag = {
  generated_by: "native_stage_gate";
  campaign_id: string;
  root_claim_id: string;
  root_obligation_id: string;
  acyclic: true;
  nodes: ProofObligationDagNode[];
  edges: ProofObligationDagEdge[];
  leaf_obligation_ids: string[];
  next_gate: "candidate_generation";
};

function writeRuntimeFile(projectRoot: string, rel: string, content: string): string {
  const path = assertPathAllowed(projectRoot, rel, { purpose: "runtime-write" });
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, content, "utf8");
  return rel.replace(/\\/g, "/");
}

function yamlString(value: string): string {
  return JSON.stringify(value);
}

function theoremFamilyId(obligation: ProofObligation): string {
  return typeof obligation.locked_statement_structured.theorem_family === "string"
    ? obligation.locked_statement_structured.theorem_family
    : "unregistered";
}

function campaignProofRel(campaign: ResearchCampaign, rel: string): string {
  return join(".comath", "campaign", campaign.campaign_id, "proof", rel);
}

function buildDag(campaign: ResearchCampaign, obligation: ProofObligation): ProofObligationDag {
  const obligations = campaign.open_obligations.length > 0 ? campaign.open_obligations : [obligation];
  const edges: ProofObligationDagEdge[] = obligations
    .filter((item) => item.parent_obligation_id)
    .map((item) => ({
      from_obligation_id: item.parent_obligation_id as string,
      to_obligation_id: item.obligation_id,
      relation: "decomposes_to"
    }));
  const parentIds = new Set(edges.map((edge) => edge.from_obligation_id));
  const nodes: ProofObligationDagNode[] = obligations.map((item) => ({
    obligation_id: item.obligation_id,
    claim_id: item.claim_id,
    theorem_family: theoremFamilyId(item),
    locked_statement_hash: item.statement_hash,
    lean_target: item.lean_target ?? null,
    status: item.status,
    kind: item.obligation_id === obligation.obligation_id ? "root" : parentIds.has(item.obligation_id) ? "intermediate" : "leaf"
  }));
  const dag: ProofObligationDag = {
    generated_by: "native_stage_gate",
    campaign_id: campaign.campaign_id,
    root_claim_id: campaign.root_claim_id,
    root_obligation_id: obligation.obligation_id,
    acyclic: true,
    nodes,
    edges,
    leaf_obligation_ids: nodes
      .map((node) => node.obligation_id)
      .filter((obligationId) => !parentIds.has(obligationId)),
    next_gate: "candidate_generation"
  };
  validateProofObligationDag(dag);
  return dag;
}

export function validateProofObligationDag(dag: Pick<ProofObligationDag, "nodes" | "edges">): void {
  const nodeIds = new Set<string>();
  for (const node of dag.nodes) {
    if (nodeIds.has(node.obligation_id)) {
      throw new ComathError(`duplicate proof obligation DAG node: ${node.obligation_id}`, {
        code: "PROOF_OBLIGATION_DAG_INVALID"
      });
    }
    nodeIds.add(node.obligation_id);
  }

  const adjacency = new Map<string, string[]>();
  for (const nodeId of nodeIds) {
    adjacency.set(nodeId, []);
  }
  for (const edge of dag.edges) {
    if (edge.relation !== "decomposes_to") {
      throw new ComathError("proof obligation DAG edge has an unsupported relation", {
        code: "PROOF_OBLIGATION_DAG_INVALID"
      });
    }
    if (!nodeIds.has(edge.from_obligation_id) || !nodeIds.has(edge.to_obligation_id)) {
      throw new ComathError("proof obligation DAG edge references an unknown obligation", {
        code: "PROOF_OBLIGATION_DAG_INVALID"
      });
    }
    adjacency.get(edge.from_obligation_id)?.push(edge.to_obligation_id);
  }

  const visiting = new Set<string>();
  const visited = new Set<string>();
  const visit = (nodeId: string) => {
    if (visiting.has(nodeId)) {
      throw new ComathError(`proof obligation DAG cycle detected at ${nodeId}`, {
        code: "PROOF_OBLIGATION_DAG_INVALID"
      });
    }
    if (visited.has(nodeId)) {
      return;
    }
    visiting.add(nodeId);
    for (const next of adjacency.get(nodeId) ?? []) {
      visit(next);
    }
    visiting.delete(nodeId);
    visited.add(nodeId);
  };

  for (const nodeId of nodeIds) {
    visit(nodeId);
  }
}

function obligationYaml(obligation: ProofObligation): string {
  const theoremFamily = theoremFamilyId(obligation);
  return [
    `obligation_id: ${obligation.obligation_id}`,
    `claim_id: ${obligation.claim_id}`,
    `theorem_family: ${theoremFamily}`,
    `locked_statement_hash: ${obligation.statement_hash}`,
    `locked_statement_nl: ${yamlString(obligation.locked_statement_nl)}`,
    `lean_target: ${yamlString(obligation.lean_target ?? "unresolved")}`,
    `status: ${obligation.status}`,
    "assumptions:",
    ...obligation.assumptions.map((assumption) => `  - ${yamlString(assumption)}`),
    "dependencies:",
    ...obligation.dependencies.map((dependency) => `  - ${yamlString(dependency)}`),
    ""
  ].join("\n");
}

function skeletonSection(obligation: ProofObligation): string[] {
  const target = obligation.lean_target;
  if (!target) {
    return [
      `-- proof_obligation: ${obligation.obligation_id}`,
      "-- No Lean target is locked for this obligation yet; the notation gate must resolve one before candidate generation.",
      ""
    ];
  }
  return [
    `-- proof_obligation: ${obligation.obligation_id}`,
    `${target} := by`,
    `  -- proof_obligation: ${obligation.obligation_id}`,
    "  sorry",
    ""
  ];
}

function skeletonLean(obligations: ProofObligation[]): string {
  return [
    "-- CoMath planning skeleton; not proof authority.",
    "-- Every sorry placeholder below is planning-stage material and must be discharged by final clean replay.",
    "namespace MathResearch",
    "",
    ...obligations.flatMap((obligation) => skeletonSection(obligation)),
    "end MathResearch",
    ""
  ].join("\n");
}

export function writeProofPlanningArtifacts(input: {
  projectRoot: string;
  campaign: ResearchCampaign;
  obligation: ProofObligation;
}): ProofPlanningArtifacts {
  const theoremFamily = theoremFamilyId(input.obligation);
  const obligations = input.campaign.open_obligations.length > 0 ? input.campaign.open_obligations : [input.obligation];
  const lemmaDag = buildDag(input.campaign, input.obligation);

  const lineMap = {
    generated_by: "native_stage_gate",
    campaign_id: input.campaign.campaign_id,
    root_obligation_id: input.obligation.obligation_id,
    lines: obligations.map((item, index) => ({
      line_id: `LM-${String(index + 1).padStart(4, "0")}`,
      source: item.obligation_id === input.obligation.obligation_id ? "problem_lock" : "lemma_decomposition",
      obligation_id: item.obligation_id,
      informal_statement: item.locked_statement_nl,
      formal_target: item.lean_target ?? "unresolved",
      assumptions_used: item.assumptions,
      dependencies: item.dependencies,
      expected_evidence: ["Lean", "static_audit", "statement_equivalence", "dependency_closure", "axiom_profile"]
    }))
  };

  const skeletonReport = [
    "# Skeleton Gate Report",
    "",
    `campaign_id: ${input.campaign.campaign_id}`,
    `root_obligation_id: ${input.obligation.obligation_id}`,
    `theorem_family: ${theoremFamily}`,
    `lemma_dag: .comath/campaign/${input.campaign.campaign_id}/proof/lemma_dag.json`,
    `line_map: .comath/campaign/${input.campaign.campaign_id}/proof/line_map.json`,
    `skeleton_lean: .comath/campaign/${input.campaign.campaign_id}/proof/Skeleton.lean`,
    "",
    "## Placeholder Obligations",
    "",
    ...obligations.map(
      (item) => `- ${item.obligation_id}: planning-stage sorry placeholder in Skeleton.lean; not proof authority.`
    ),
    "",
    "No final proof authority is granted at the skeleton gate. Any placeholder obligations must be discharged by Lean clean replay before promotion.",
    ""
  ].join("\n");

  const obligationYamlPaths = obligations.map((item) =>
    writeRuntimeFile(
      input.projectRoot,
      campaignProofRel(input.campaign, join("obligations", `${item.obligation_id}.yaml`)),
      obligationYaml(item)
    )
  );

  return {
    lemma_dag_path: writeRuntimeFile(
      input.projectRoot,
      campaignProofRel(input.campaign, "lemma_dag.json"),
      `${JSON.stringify(lemmaDag, null, 2)}\n`
    ),
    line_map_path: writeRuntimeFile(
      input.projectRoot,
      campaignProofRel(input.campaign, "line_map.json"),
      `${JSON.stringify(lineMap, null, 2)}\n`
    ),
    obligation_yaml_path: obligationYamlPaths[0] ?? "",
    obligation_yaml_paths: obligationYamlPaths,
    skeleton_lean_path: writeRuntimeFile(input.projectRoot, campaignProofRel(input.campaign, "Skeleton.lean"), skeletonLean(obligations)),
    skeleton_report_path: writeRuntimeFile(
      input.projectRoot,
      campaignProofRel(input.campaign, "skeleton_report.md"),
      skeletonReport
    )
  };
}
