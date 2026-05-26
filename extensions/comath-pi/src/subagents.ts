export type SubagentRole =
  | "coordinator"
  | "librarian"
  | "computation"
  | "proof_route"
  | "formalization"
  | "reviewer"
  | "graph_builder"
  | "security_auditor"
  | "math_integrity_auditor";

export type SubagentOutputContract = "child_agent_report" | "graph_patch_proposal" | "audit_report";

export type SubagentDefinition = {
  id: string;
  role: SubagentRole;
  description: string;
  prompt_uri: string;
  allowed_write_roots: string[];
  forbidden_write_roots: string[];
  may_mutate_trusted_state: false;
  output_contract: SubagentOutputContract;
};

export type SubagentAssignmentInput = {
  agent_id: string;
  workstream_id: string;
  requested_write_paths: string[];
};

export type SubagentAssignmentDecision = {
  allowed: boolean;
  reasons: string[];
};

const globalForbiddenWriteRoots = [
  "services/comathd/src/types",
  "services/comathd/src/api/server.ts",
  "services/comathd/src/security/path-policy.ts",
  "services/comathd/src/verification/gate.ts",
  "services/comathd/src/memory/in-memory-research-memory-db.ts",
  "services/comathd/src/memory/graph-patch.ts",
  "services/comathd/src/memory/builder.ts",
  "package.json",
  "pnpm-lock.yaml"
];

const workstreamWriteRoot = ".comath/workstreams/${WS_ID}";

const definitions: SubagentDefinition[] = [
  {
    id: "coordinator",
    role: "coordinator",
    description: "Plans workstream decomposition, assigns non-overlapping scopes, and performs parent merge review.",
    prompt_uri: ".pi/prompts/parallel-workstream.md",
    allowed_write_roots: [workstreamWriteRoot],
    forbidden_write_roots: globalForbiddenWriteRoots,
    may_mutate_trusted_state: false,
    output_contract: "child_agent_report"
  },
  {
    id: "librarian",
    role: "librarian",
    description: "Collects literature and citation leads as reports without claiming literature support.",
    prompt_uri: ".pi/prompts/child-agent-report.md",
    allowed_write_roots: [workstreamWriteRoot],
    forbidden_write_roots: globalForbiddenWriteRoots,
    may_mutate_trusted_state: false,
    output_contract: "child_agent_report"
  },
  {
    id: "computation",
    role: "computation",
    description: "Prepares exact-computation plans and runner inputs as workstream artifacts.",
    prompt_uri: ".pi/prompts/parallel-workstream.md",
    allowed_write_roots: [workstreamWriteRoot],
    forbidden_write_roots: globalForbiddenWriteRoots,
    may_mutate_trusted_state: false,
    output_contract: "child_agent_report"
  },
  {
    id: "proof-route",
    role: "proof_route",
    description: "Explores proof routes, blockers, and lemma chains without upgrading claim status.",
    prompt_uri: ".pi/prompts/parallel-workstream.md",
    allowed_write_roots: [workstreamWriteRoot],
    forbidden_write_roots: globalForbiddenWriteRoots,
    may_mutate_trusted_state: false,
    output_contract: "child_agent_report"
  },
  {
    id: "formalization",
    role: "formalization",
    description: "Drafts formalization skeletons and records missing kernel checks.",
    prompt_uri: ".pi/prompts/parallel-workstream.md",
    allowed_write_roots: [workstreamWriteRoot],
    forbidden_write_roots: globalForbiddenWriteRoots,
    may_mutate_trusted_state: false,
    output_contract: "child_agent_report"
  },
  {
    id: "reviewer",
    role: "reviewer",
    description: "Reviews workstream outputs and recommends accept, reject, or revise.",
    prompt_uri: ".pi/prompts/merge-review.md",
    allowed_write_roots: [workstreamWriteRoot],
    forbidden_write_roots: globalForbiddenWriteRoots,
    may_mutate_trusted_state: false,
    output_contract: "audit_report"
  },
  {
    id: "graph-builder",
    role: "graph_builder",
    description: "Builds GraphPatch proposal only files from reviewed workstream reports.",
    prompt_uri: ".pi/prompts/graph-patch-proposal.md",
    allowed_write_roots: [workstreamWriteRoot],
    forbidden_write_roots: globalForbiddenWriteRoots,
    may_mutate_trusted_state: false,
    output_contract: "graph_patch_proposal"
  },
  {
    id: "security-auditor",
    role: "security_auditor",
    description: "Audits path, shell, native dependency, and secret-handling boundaries.",
    prompt_uri: ".pi/prompts/child-agent-report.md",
    allowed_write_roots: [workstreamWriteRoot],
    forbidden_write_roots: globalForbiddenWriteRoots,
    may_mutate_trusted_state: false,
    output_contract: "audit_report"
  },
  {
    id: "math-integrity-auditor",
    role: "math_integrity_auditor",
    description: "Audits proof status, evidence status, overclaiming, and failure preservation.",
    prompt_uri: ".pi/prompts/child-agent-report.md",
    allowed_write_roots: [workstreamWriteRoot],
    forbidden_write_roots: globalForbiddenWriteRoots,
    may_mutate_trusted_state: false,
    output_contract: "audit_report"
  }
];

function normalizePath(input: string): string {
  return input.replace(/\\/g, "/").replace(/^\.\//, "");
}

function rootForWorkstream(workstreamId: string): string {
  return workstreamWriteRoot.replace("${WS_ID}", workstreamId);
}

function isInsideRoot(path: string, root: string): boolean {
  const normalizedPath = normalizePath(path);
  const normalizedRoot = normalizePath(root);
  return normalizedPath === normalizedRoot || normalizedPath.startsWith(`${normalizedRoot}/`);
}

export function listSubagentDefinitions(): SubagentDefinition[] {
  return definitions.map((definition) => ({
    ...definition,
    allowed_write_roots: [...definition.allowed_write_roots],
    forbidden_write_roots: [...definition.forbidden_write_roots]
  }));
}

export function getSubagentDefinition(id: string): SubagentDefinition | undefined {
  return listSubagentDefinitions().find((definition) => definition.id === id);
}

export function validateSubagentAssignment(input: SubagentAssignmentInput): SubagentAssignmentDecision {
  const definition = getSubagentDefinition(input.agent_id);
  if (!definition) {
    return { allowed: false, reasons: [`unknown subagent: ${input.agent_id}`] };
  }

  const reasons: string[] = [];
  const ownWorkstreamRoot = rootForWorkstream(input.workstream_id);
  for (const requested of input.requested_write_paths.map(normalizePath)) {
    if (definition.forbidden_write_roots.some((root) => isInsideRoot(requested, root))) {
      reasons.push(`${requested} is in a forbidden write root`);
      continue;
    }

    if (requested.startsWith(".comath/workstreams/") && !isInsideRoot(requested, ownWorkstreamRoot)) {
      reasons.push(`${requested} is outside the agent own workstream directory ${ownWorkstreamRoot}`);
      continue;
    }

    const explicitlyAllowed = definition.allowed_write_roots.some((root) => {
      const resolvedRoot = root.includes("${WS_ID}") ? rootForWorkstream(input.workstream_id) : root;
      return isInsideRoot(requested, resolvedRoot);
    });
    if (!explicitlyAllowed) {
      reasons.push(`${requested} is not covered by allowed write roots`);
    }
  }

  return {
    allowed: reasons.length === 0,
    reasons
  };
}
