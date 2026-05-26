import { Type } from "typebox";
import type { TObject, TProperties, TSchema } from "typebox";
import { listSubagentDefinitions, type SubagentDefinition } from "./subagents.js";
export { toPiSafeToolName } from "./tool-names.js";

export * from "./subagents.js";
export * from "./widgets.js";
export * from "./renderers.js";
export * from "./tools/review.js";
export * from "./pi-official-adapter.js";

export type ParsedComathCommand = {
  namespace: "cm";
  action: string;
  subcommand?: string;
  args: string[];
};

export type ComathClientOptions = {
  baseUrl: string;
  fetch?: (url: string, init?: Record<string, unknown>) => Promise<{
    ok: boolean;
    status: number;
    json(): Promise<unknown>;
  }>;
};

export type ToolDescriptor = {
  name: string;
  description: string;
  mutates: boolean;
  input_schema: TObject & {
    type: "object";
    required?: string[];
    properties: Record<string, TSchema>;
  };
};

export type ComathResource = {
  uri: string;
  kind: "skill" | "prompt" | "domain-pack" | "subagent" | "artifact";
};

export type PermissionRequest = {
  kind: "tool" | "command";
  name: string;
  mutates: boolean;
};

export type PermissionDecision = {
  allowed: boolean;
  confirmation_required: boolean;
  reason: string;
};

export type DashboardInput = {
  project?: {
    project_id: string;
    name?: string;
  };
  claims?: Array<{
    id: string;
    status: string;
    statement?: string;
  }>;
  workstreams?: Array<{
    id: string;
    status: string;
    goal?: string;
  }>;
  blockers?: string[];
};

function splitCommand(input: string): string[] {
  return input.trim().split(/\s+/).filter(Boolean);
}

export function parseComathCommand(input: string): ParsedComathCommand | null {
  const parts = splitCommand(input);
  const head = parts[0];
  if (!head?.startsWith("/cm:")) {
    return null;
  }

  const action = head.slice("/cm:".length);
  if (!action) {
    return null;
  }

  if (
    action === "claim" ||
    action === "evidence" ||
    action === "graph" ||
    action === "paper" ||
    action === "snapshot" ||
    action === "replay"
  ) {
    const [subcommand, ...args] = parts.slice(1);
    return {
      namespace: "cm",
      action,
      subcommand,
      args
    };
  }

  return {
    namespace: "cm",
    action,
    args: parts.slice(1)
  };
}

function joinUrl(baseUrl: string, path: string): string {
  const normalizedBase = baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl;
  return `${normalizedBase}${path.startsWith("/") ? path : `/${path}`}`;
}

export function createComathClient(options: ComathClientOptions) {
  const fetchImpl = options.fetch ?? globalThis.fetch;
  if (!fetchImpl) {
    throw new Error("No fetch implementation available for comath client");
  }

  async function request(method: "GET" | "POST", path: string, body?: unknown): Promise<any> {
    const response = await fetchImpl(joinUrl(options.baseUrl, path), {
      method,
      headers: {
        "content-type": "application/json"
      },
      body: body === undefined ? undefined : JSON.stringify(body)
    });
    const payload = await response.json();
    if (!response.ok) {
      const detail =
        payload && typeof payload === "object" && "error" in payload ? String((payload as { error: unknown }).error) : "";
      throw new Error(`comathd request failed (${response.status})${detail ? `: ${detail}` : ""}`);
    }
    return payload;
  }

  return {
    get(path: string): Promise<any> {
      return request("GET", path);
    },
    post(path: string, body: unknown): Promise<any> {
      return request("POST", path, body);
    }
  };
}

function enumString(values: string[]): TSchema {
  return Type.Unsafe({ type: "string", enum: values });
}

function optionalizeProperties(required: string[], properties: Record<string, TSchema>): TProperties {
  const requiredSet = new Set(required);
  const result: Record<string, TSchema> = {};
  for (const [key, value] of Object.entries(properties)) {
    result[key] = requiredSet.has(key) ? value : Type.Optional(value);
  }
  return result as unknown as TProperties;
}

function objectSchema(required: string[], properties: Record<string, TSchema>): ToolDescriptor["input_schema"] {
  return Type.Object(optionalizeProperties(required, properties)) as ToolDescriptor["input_schema"];
}

export function createComathTools(): ToolDescriptor[] {
  const stringProp = Type.String();
  const stringArrayProp = Type.Array(stringProp);
  const numberProp = Type.Number();
  const booleanProp = Type.Boolean();
  const arrayProp = Type.Array(Type.Any());
  const claimStatusProp = enumString([
      "draft",
      "conjectural",
      "literature_supported",
      "computationally_supported",
      "symbolically_checked",
      "lean_skeleton",
      "formally_checked",
      "refuted",
      "blocked",
      "retracted",
      "human_accepted"
    ]);
  const workstreamKindProp = enumString(["literature", "computation", "proof_route", "formalization", "review", "domain", "other"]);
  const workstreamStatusProp = enumString(["queued", "running", "reviewing", "accepted", "failed", "blocked", "archived"]);
  const graphPatchReviewStateProp = enumString(["under_review", "accepted", "rejected", "superseded"]);
  const artifactKindProp = enumString([
    "log",
    "paper",
    "tex",
    "bibtex",
    "pdf",
    "notebook",
    "code",
    "screenshot",
    "runner_output",
    "snapshot",
    "other"
  ]);
  const memoryNodeTypesProp = Type.Array(
    enumString([
      "Claim",
      "Definition",
      "Notation",
      "TheoremReference",
      "ProofStep",
      "Evidence",
      "Counterexample",
      "FailureRoute",
      "Workstream",
      "ReflectionReport",
      "Artifact",
      "Citation",
      "DomainObject"
    ])
  );
  const memoryEdgeLabelProp = enumString([
      "depends_on",
      "supports",
      "refutes",
      "contradicts",
      "cites",
      "proved_by",
      "blocked_by",
      "same_as",
      "supersedes",
      "retracts",
      "derived_from",
      "produced_by"
    ]);
  return [
    {
      name: "comath.service.health",
      description: "Read comathd health, phase, and runtime capability metadata.",
      mutates: false,
      input_schema: objectSchema([], {})
    },
    {
      name: "comath.research.start",
      description: "Initialize a CoMath project and spawn the first bounded research workstream through comathd.",
      mutates: true,
      input_schema: objectSchema(["root_path", "goal"], {
        root_path: stringProp,
        name: stringProp,
        project_id: stringProp,
        goal: stringProp,
        kind: workstreamKindProp,
        actor: stringProp,
        headless: booleanProp
      })
    },
    {
      name: "comath.project.init",
      description: "Initialize the trusted service-owned runtime tree for a project.",
      mutates: true,
      input_schema: objectSchema(["root_path"], {
        root_path: stringProp,
        name: stringProp
      })
    },
    {
      name: "comath.project.open",
      description: "Open an initialized CoMath project through comathd.",
      mutates: false,
      input_schema: objectSchema(["root_path"], { root_path: stringProp })
    },
    {
      name: "comath.project.status",
      description: "Read project initialization status through comathd.",
      mutates: false,
      input_schema: objectSchema(["project_root"], { project_root: stringProp })
    },
    {
      name: "comath.claim.register",
      description: "Register a draft mathematical claim through comathd.",
      mutates: true,
      input_schema: objectSchema(["project_root", "project_id", "statement", "domain"], {
        project_root: stringProp,
        project_id: stringProp,
        statement: stringProp,
        assumptions: stringArrayProp,
        domain: stringProp
      })
    },
    {
      name: "comath.claim.get",
      description: "Read one claim through comathd.",
      mutates: false,
      input_schema: objectSchema(["project_root", "project_id", "claim_id"], {
        project_root: stringProp,
        project_id: stringProp,
        claim_id: stringProp
      })
    },
    {
      name: "comath.claim.update",
      description: "Update a non-privileged claim patch through comathd.",
      mutates: true,
      input_schema: objectSchema(["project_root", "project_id", "claim_id", "patch", "actor"], {
        project_root: stringProp,
        project_id: stringProp,
        claim_id: stringProp,
        patch: objectSchema([], {
          statement: stringProp,
          assumptions: stringArrayProp,
          domain: stringProp,
          status: claimStatusProp,
          evidence_level: numberProp
        }),
        actor: stringProp
      })
    },
    {
      name: "comath.claim.link",
      description: "Link two claims with an auditable graph edge through comathd.",
      mutates: true,
      input_schema: objectSchema(["project_root", "project_id", "source_id", "target_id", "label", "actor"], {
        project_root: stringProp,
        project_id: stringProp,
        source_id: stringProp,
        target_id: stringProp,
        label: memoryEdgeLabelProp,
        actor: stringProp
      })
    },
    {
      name: "comath.claim.requestPromotion",
      description: "Request a fail-closed promotion gate decision through comathd.",
      mutates: true,
      input_schema: objectSchema(["project_root", "project_id", "claim_id", "target_status"], {
        project_root: stringProp,
        project_id: stringProp,
        claim_id: stringProp,
        target_status: claimStatusProp,
        evidence_ids: stringArrayProp,
        artifact_ids: stringArrayProp
      })
    },
    {
      name: "comath.evidence.attach",
      description: "Attach evidence through comathd.",
      mutates: true,
      input_schema: objectSchema(["project_root", "project_id", "kind", "summary", "actor"], {
        project_root: stringProp,
        project_id: stringProp,
        claim_id: stringProp,
        kind: stringProp,
        summary: stringProp,
        artifact_ids: stringArrayProp,
        actor: stringProp
      })
    },
    {
      name: "comath.lean.check",
      description: "Submit model-authored Lean source from this Pi tool call to comathd for service-owned Lean kernel checking.",
      mutates: true,
      input_schema: objectSchema(
        ["project_root", "project_id", "claim_id", "lean_source", "theorem_name", "dependency_hash", "model_id", "actor"],
        {
          project_root: stringProp,
          project_id: stringProp,
          claim_id: stringProp,
          lean_source: stringProp,
          theorem_name: stringProp,
          dependency_hash: stringProp,
          model_id: stringProp,
          model_response_id: stringProp,
          tool_call_id: stringProp,
          actor: stringProp,
          timeout_ms: numberProp
        }
      )
    },
    {
      name: "comath.artifact.import",
      description: "Import a policy-approved artifact through comathd with secret scanning and content hashing.",
      mutates: true,
      input_schema: objectSchema(["project_root", "project_id", "source_path", "kind", "actor"], {
        project_root: stringProp,
        project_id: stringProp,
        source_path: stringProp,
        kind: artifactKindProp,
        actor: stringProp
      })
    },
    {
      name: "comath.artifact.list",
      description: "List hashed artifact references recorded under the trusted service runtime.",
      mutates: false,
      input_schema: objectSchema(["project_root", "project_id"], {
        project_root: stringProp,
        project_id: stringProp
      })
    },
    {
      name: "comath.workstream.spawn",
      description: "Spawn a bounded research workstream through comathd.",
      mutates: true,
      input_schema: objectSchema(["project_root", "project_id", "kind", "goal"], {
        project_root: stringProp,
        project_id: stringProp,
        kind: workstreamKindProp,
        goal: stringProp,
        created_by: stringProp,
        actor: stringProp
      })
    },
    {
      name: "comath.workstream.status",
      description: "Read one workstream status through comathd.",
      mutates: false,
      input_schema: objectSchema(["project_root", "project_id", "workstream_id"], {
        project_root: stringProp,
        project_id: stringProp,
        workstream_id: stringProp
      })
    },
    {
      name: "comath.workstream.list",
      description: "List workstreams for a project through comathd.",
      mutates: false,
      input_schema: objectSchema(["project_root", "project_id"], {
        project_root: stringProp,
        project_id: stringProp
      })
    },
    {
      name: "comath.workstream.bundle",
      description: "Read a workstream status, spec, report, and GraphPatch bundle through comathd.",
      mutates: false,
      input_schema: objectSchema(["project_root", "project_id", "workstream_id"], {
        project_root: stringProp,
        project_id: stringProp,
        workstream_id: stringProp
      })
    },
    {
      name: "comath.workstream.report",
      description: "Write or update a workstream report through comathd.",
      mutates: true,
      input_schema: objectSchema(["project_root", "project_id", "workstream_id", "report_markdown"], {
        project_root: stringProp,
        project_id: stringProp,
        workstream_id: stringProp,
        report_markdown: stringProp,
        status: workstreamStatusProp,
        actor: stringProp
      })
    },
    {
      name: "comath.workstream.transition",
      description: "Transition a workstream status through comathd.",
      mutates: true,
      input_schema: objectSchema(["project_root", "project_id", "workstream_id", "next_status", "actor"], {
        project_root: stringProp,
        project_id: stringProp,
        workstream_id: stringProp,
        next_status: workstreamStatusProp,
        actor: stringProp,
        notes: stringProp
      })
    },
    {
      name: "comath.graph.proposePatch",
      description: "Propose a graph patch for later review.",
      mutates: true,
      input_schema: objectSchema(["project_root", "project_id", "workstream_id", "new_nodes", "new_edges"], {
        project_root: stringProp,
        project_id: stringProp,
        workstream_id: stringProp,
        source_workstream_id: stringProp,
        created_by: stringProp,
        new_nodes: arrayProp,
        new_edges: arrayProp,
        updated_nodes: arrayProp,
        candidate_conflicts: arrayProp,
        warnings: stringArrayProp,
        apply_preconditions: stringArrayProp
      })
    },
    {
      name: "comath.graph.reviewPatch",
      description: "Review, accept, reject, or supersede a proposed GraphPatch through comathd.",
      mutates: true,
      input_schema: objectSchema(["project_root", "project_id", "workstream_id", "next_state", "reviewer"], {
        project_root: stringProp,
        project_id: stringProp,
        workstream_id: stringProp,
        next_state: graphPatchReviewStateProp,
        reviewer: stringProp,
        notes: stringProp
      })
    },
    {
      name: "comath.graph.applyPatch",
      description: "Apply an accepted GraphPatch into the ResearchMemoryDB through comathd.",
      mutates: true,
      input_schema: objectSchema(["project_root", "project_id", "workstream_id", "reviewer"], {
        project_root: stringProp,
        project_id: stringProp,
        workstream_id: stringProp,
        reviewer: stringProp
      })
    },
    {
      name: "comath.memory.health",
      description: "Read MathGraphIndex health and derived-index status through comathd.",
      mutates: false,
      input_schema: objectSchema(["project_root", "project_id"], {
        project_root: stringProp,
        project_id: stringProp
      })
    },
    {
      name: "comath.memory.rebuild",
      description: "Rebuild the derived MathGraphIndex from provenance ledger events through comathd.",
      mutates: true,
      input_schema: objectSchema(["project_root", "project_id"], {
        project_root: stringProp,
        project_id: stringProp
      })
    },
    {
      name: "comath.memory.search",
      description: "Search ResearchMemoryDB nodes through comathd.",
      mutates: false,
      input_schema: objectSchema(["project_root", "project_id", "query"], {
        project_root: stringProp,
        project_id: stringProp,
        query: stringProp,
        limit: numberProp,
        node_types: memoryNodeTypesProp
      })
    },
    {
      name: "comath.memory.contextPack",
      description: "Build a bounded context pack from ResearchMemoryDB seed nodes through comathd.",
      mutates: false,
      input_schema: objectSchema(["project_root", "project_id", "seed_ids"], {
        project_root: stringProp,
        project_id: stringProp,
        seed_ids: stringArrayProp,
        depth: numberProp,
        limit: numberProp
      })
    },
    {
      name: "comath.literature.importBibTeX",
      description: "Import BibTeX literature records and artifact metadata through comathd.",
      mutates: true,
      input_schema: objectSchema(["project_root", "project_id", "bibtex", "actor"], {
        project_root: stringProp,
        project_id: stringProp,
        bibtex: stringProp,
        actor: stringProp
      })
    },
    {
      name: "comath.literature.importPdf",
      description: "Import a literature PDF as a hashed artifact through comathd.",
      mutates: true,
      input_schema: objectSchema(["project_root", "project_id", "source_path", "actor"], {
        project_root: stringProp,
        project_id: stringProp,
        source_path: stringProp,
        actor: stringProp
      })
    },
    {
      name: "comath.literature.registerCitation",
      description: "Register a citation record through comathd.",
      mutates: true,
      input_schema: objectSchema(["project_root", "project_id", "title", "actor"], {
        project_root: stringProp,
        project_id: stringProp,
        title: stringProp,
        authors: stringArrayProp,
        year: numberProp,
        venue: stringProp,
        doi: stringProp,
        arxiv_id: stringProp,
        url: stringProp,
        artifact_id: stringProp,
        actor: stringProp
      })
    },
    {
      name: "comath.literature.checkCondition",
      description: "Check a citation support condition through comathd.",
      mutates: true,
      input_schema: objectSchema(["project_root", "project_id", "citation_id", "claim_id", "condition", "actor"], {
        project_root: stringProp,
        project_id: stringProp,
        citation_id: stringProp,
        claim_id: stringProp,
        condition: stringProp,
        result: stringProp,
        notes: stringProp,
        actor: stringProp
      })
    },
    {
      name: "comath.literature.list",
      description: "List citations and citation-condition matches through comathd.",
      mutates: false,
      input_schema: objectSchema(["project_root", "project_id"], {
        project_root: stringProp,
        project_id: stringProp
      })
    },
    {
      name: "comath.status.snapshot",
      description: "Render an aggregate status snapshot through comathd.",
      mutates: false,
      input_schema: objectSchema(["project_root", "project_id"], { project_root: stringProp, project_id: stringProp })
    },
    {
      name: "comath.paper.init",
      description: "Initialize the working paper artifact set through comathd.",
      mutates: true,
      input_schema: objectSchema(["project_root", "project_id", "actor"], {
        project_root: stringProp,
        project_id: stringProp,
        title: stringProp,
        actor: stringProp
      })
    },
    {
      name: "comath.paper.state",
      description: "Read working paper markdown, TeX, bibliography, sections, and margin provenance through comathd.",
      mutates: false,
      input_schema: objectSchema(["project_root", "project_id"], {
        project_root: stringProp,
        project_id: stringProp
      })
    },
    {
      name: "comath.paper.updateSection",
      description: "Update a working paper section through comathd.",
      mutates: true,
      input_schema: objectSchema(["project_root", "project_id", "section_id", "title", "markdown", "actor"], {
        project_root: stringProp,
        project_id: stringProp,
        section_id: stringProp,
        title: stringProp,
        markdown: stringProp,
        actor: stringProp
      })
    },
    {
      name: "comath.paper.renderClaim",
      description: "Render a claim block with visible margin provenance through comathd.",
      mutates: true,
      input_schema: objectSchema(["project_root", "project_id", "claim_id", "wording", "actor"], {
        project_root: stringProp,
        project_id: stringProp,
        claim_id: stringProp,
        wording: enumString(["theorem", "lemma", "proposition", "conjecture", "claim", "remark"]),
        evidence_ids: stringArrayProp,
        source_workstreams: stringArrayProp,
        warnings: stringArrayProp,
        blockers: stringArrayProp,
        actor: stringProp
      })
    },
    {
      name: "comath.paper.check",
      description: "Check working paper provenance and overclaim rules without promoting claims.",
      mutates: false,
      input_schema: objectSchema(["project_root", "project_id"], {
        project_root: stringProp,
        project_id: stringProp
      })
    },
    {
      name: "comath.paper.export",
      description: "Export the checked working paper as a hashed artifact through comathd.",
      mutates: true,
      input_schema: objectSchema(["project_root", "project_id", "format", "actor"], {
        project_root: stringProp,
        project_id: stringProp,
        format: enumString(["md", "tex"]),
        actor: stringProp
      })
    },
    {
      name: "comath.snapshot.export",
      description: "Export a service-owned runtime snapshot and replay manifest through comathd.",
      mutates: true,
      input_schema: objectSchema(["project_root", "project_id", "actor"], {
        project_root: stringProp,
        project_id: stringProp,
        actor: stringProp
      })
    },
    {
      name: "comath.snapshot.verify",
      description: "Verify a service-owned runtime snapshot manifest through comathd.",
      mutates: false,
      input_schema: objectSchema(["manifest_path"], {
        manifest_path: stringProp
      })
    },
    {
      name: "comath.snapshot.restore",
      description: "Restore a verified service-owned runtime snapshot into a target root through comathd.",
      mutates: true,
      input_schema: objectSchema(["manifest_path", "target_root", "actor"], {
        manifest_path: stringProp,
        target_root: stringProp,
        actor: stringProp
      })
    },
    {
      name: "comath.replay.verifyManifest",
      description: "Verify replay manifest metadata embedded in a service-owned snapshot.",
      mutates: false,
      input_schema: objectSchema(["manifest_path"], {
        manifest_path: stringProp
      })
    }
  ];
}

export function requireMutationConfirmation(request: PermissionRequest): PermissionDecision {
  if (!request.mutates) {
    return {
      allowed: true,
      confirmation_required: false,
      reason: "read-only extension action"
    };
  }

  return {
    allowed: false,
    confirmation_required: true,
    reason: `${request.name} mutates trusted CoMath state through comathd and requires confirmation`
  };
}

export function discoverComathResources(input: {
  skills?: string[];
  prompts?: string[];
  domainPacks?: string[];
  subagents?: string[];
  artifacts?: string[];
}): ComathResource[] {
  return [
    ...(input.skills ?? []).map((name) => ({ uri: `skills/${name}`, kind: "skill" as const })),
    ...(input.prompts ?? []).map((name) => ({ uri: `prompts/${name}`, kind: "prompt" as const })),
    ...(input.domainPacks ?? []).map((name) => ({ uri: `domain-packs/${name}`, kind: "domain-pack" as const })),
    ...(input.subagents ?? []).map((name) => ({ uri: `.pi/agents/${name}.md`, kind: "subagent" as const })),
    ...(input.artifacts ?? []).map((name) => ({ uri: `artifacts/${name}`, kind: "artifact" as const }))
  ];
}

export function renderTextDashboard(input: DashboardInput): string {
  const projectLabel = input.project
    ? `${input.project.project_id}${input.project.name ? ` ${input.project.name}` : ""}`
    : "no project";
  const claims = (input.claims ?? []).map((claim) => `${claim.id} [${claim.status}] ${claim.statement ?? ""}`);
  const workstreams = (input.workstreams ?? []).map(
    (workstream) => `${workstream.id} [${workstream.status}] ${workstream.goal ?? ""}`
  );
  const blockers = input.blockers ?? [];

  return [
    `CoMath Pi Lab: ${projectLabel}`,
    "",
    "Claims",
    claims.length ? claims.join("\n") : "none",
    "",
    "Workstreams",
    workstreams.length ? workstreams.join("\n") : "none",
    "",
    "Blockers",
    blockers.length ? blockers.join("\n") : "none"
  ].join("\n");
}

export function createComathPiExtension(options: { client: ReturnType<typeof createComathClient> }) {
  const subagents: SubagentDefinition[] = listSubagentDefinitions();
  return {
    name: "coMath-pi-lab",
    commands: [
      "/cm:init",
      "/cm:open",
      "/cm:status",
      "/cm:claim",
      "/cm:evidence",
      "/cm:graph",
      "/cm:paper",
      "/cm:snapshot",
      "/cm:replay",
      "/cm:dashboard"
    ],
    tools: createComathTools(),
    resources: discoverComathResources({
      skills: ["math-research", "mathprove-adapter"],
      prompts: ["coordinator", "reviewer", "formalization", "parallel-workstream"],
      domainPacks: ["braid-statistics"],
      subagents: subagents.map((definition) => definition.id),
      artifacts: ["snapshot-manifest", "replay-manifest"]
    }),
    subagents,
    client: options.client
  };
}
