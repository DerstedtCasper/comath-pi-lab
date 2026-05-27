import { listSubagentDefinitions, type SubagentDefinition } from "./subagents.js";
import { createPiRuntimeRegistration } from "./runtime-registration.js";
import {
  buildResearchCampaignLoopInput,
  issueCampaignLoopCapability,
  runResearchCampaignLoop
} from "./research-loop.js";

export * from "./subagents.js";
export * from "./widgets.js";
export * from "./renderers.js";
export * from "./research-loop.js";
export * from "./runtime-registration.js";
export * from "./tools/review.js";

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

export type ComathClient = {
  get(path: string): Promise<any>;
  post(path: string, body: unknown): Promise<any>;
};

type PiExtensionApi = {
  registerTool(tool: {
    name: string;
    label: string;
    description: string;
    parameters: Record<string, unknown>;
    executionMode?: "sequential" | "parallel";
    execute(
      toolCallId: string,
      params: Record<string, unknown>,
      signal?: AbortSignal,
      onUpdate?: unknown,
      ctx?: unknown
    ): Promise<{
      content: Array<{ type: "text"; text: string }>;
      details: unknown;
      isError?: boolean;
    }>;
  }): void;
  registerCommand(name: string, options: {
    description?: string;
    handler(args: string, ctx: unknown): Promise<void> | void;
  }): void;
  on(event: "resources_discover", handler: (event: unknown, ctx: unknown) => unknown): void;
};

type PiRuntimeContext = {
  ui?: {
    confirm?(title: string, body?: string): Promise<boolean> | boolean;
    notify?(message: string, level?: "info" | "warning" | "error"): Promise<void> | void;
  };
};

type RegisterComathPiRuntimeOptions = {
  client?: ComathClient;
  actor?: string;
  project_root?: string;
  project_name?: string;
  max_ticks?: number;
};

export type ToolDescriptor = {
  name: string;
  description: string;
  mutates: boolean;
  input_schema: {
    type: "object";
    required?: string[];
    properties: Record<string, unknown>;
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

const DEFAULT_COMATHD_BASE_URL = "http://127.0.0.1:3867";

const PI_RUNTIME_EXECUTABLE_TOOL_NAMES = new Set([
  "comath.research.startCampaign",
  "comath.research.runCampaignLoop",
  "comath.campaign.status",
  "comath.campaign.tick",
  "comath.campaign.nextActions",
  "comath.campaign.finalAudit",
  "comath.campaign.replay"
]);

const COMATH_EXTENSION_COMMANDS = [
  "/cm:init",
  "/cm:open",
  "/cm:status",
  "/cm:claim",
  "/cm:evidence",
  "/cm:graph",
  "/cm:paper",
  "/cm:research",
  "/cm:campaign",
  "/cm:audit",
  "/cm:snapshot",
  "/cm:replay",
  "/cm:dashboard"
];

const PI_RUNTIME_COMMANDS = [
  "/cm:research",
  "/cm:campaign",
  "/cm:audit",
  "/cm:replay"
];

function splitCommand(input: string): string[] {
  const parts: string[] = [];
  let current = "";
  let quote: '"' | "'" | null = null;
  let escaped = false;

  for (const char of input.trim()) {
    if (escaped) {
      current += char;
      escaped = false;
      continue;
    }
    if (char === "\\") {
      escaped = true;
      continue;
    }
    if ((char === '"' || char === "'") && !quote) {
      quote = char;
      continue;
    }
    if (quote && char === quote) {
      quote = null;
      continue;
    }
    if (!quote && /\s/.test(char)) {
      if (current.length > 0) {
        parts.push(current);
        current = "";
      }
      continue;
    }
    current += char;
  }

  if (escaped) {
    current += "\\";
  }
  if (quote) {
    throw new Error(`unterminated quote: ${quote}`);
  }
  if (current.length > 0) {
    parts.push(current);
  }
  return parts;
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
    action === "replay" ||
    action === "audit" ||
    action === "research" ||
    action === "campaign"
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

function readString(payload: Record<string, unknown>, field: string): string;
function readString(payload: Record<string, unknown>, field: string, options: { optional: true }): string | undefined;
function readString(payload: Record<string, unknown>, field: string, options?: { optional?: boolean }): string | undefined {
  const value = payload[field];
  if (typeof value === "string" && value.length > 0) {
    return value;
  }
  if (options?.optional && value === undefined) {
    return undefined;
  }
  throw new Error(`${field} is required`);
}

function encodeQuery(value: string): string {
  return encodeURIComponent(value);
}

function readNumber(payload: Record<string, unknown>, field: string): number | undefined {
  const value = payload[field];
  if (value === undefined) {
    return undefined;
  }
  if (typeof value === "number" && Number.isFinite(value) && value >= 0) {
    return value;
  }
  throw new Error(`${field} must be a non-negative number`);
}

function campaignPath(campaignId: string, suffix: string): string {
  return `/campaign/${encodeURIComponent(campaignId)}${suffix}`;
}

function withoutConfirmationSchema(schema: ToolDescriptor["input_schema"]): ToolDescriptor["input_schema"] {
  if (!schema.required?.includes("confirmation_id") && !Object.hasOwn(schema.properties, "confirmation_id")) {
    return schema;
  }
  const { confirmation_id: _confirmationId, ...properties } = schema.properties;
  return {
    ...schema,
    required: schema.required?.filter((field) => field !== "confirmation_id"),
    properties
  };
}

function isMutatingTool(name: string): boolean {
  return createComathTools().some((tool) => tool.name === name && tool.mutates);
}

function requireToolExecutionConfirmation(name: string, input: Record<string, unknown>): void {
  if (!isMutatingTool(name)) {
    return;
  }
  const confirmationId = readString(input, "confirmation_id", { optional: true });
  if (!confirmationId) {
    throw new Error(`confirmed mutation permission is required for ${name}`);
  }
}

export async function executeComathTool(client: ComathClient, name: string, input: Record<string, unknown>): Promise<any> {
  requireToolExecutionConfirmation(name, input);

  if (name === "comath.research.startCampaign") {
    return client.post("/campaign/start", {
      project_root: readString(input, "project_root"),
      project_name: readString(input, "project_name", { optional: true }),
      user_goal: readString(input, "user_goal"),
      domain: readString(input, "domain", { optional: true }),
      strict_mode: input.strict_mode === undefined ? true : input.strict_mode === true,
      actor: readString(input, "actor")
    });
  }

  if (name === "comath.research.runCampaignLoop") {
    const projectRoot = readString(input, "project_root");
    const actor = readString(input, "actor");
    const maxTicks = readNumber(input, "max_ticks");
    const capability = issueCampaignLoopCapability({
      project_root: projectRoot,
      actor,
      max_ticks: maxTicks,
      confirmation: {
        kind: "mutation_confirmation",
        target: "comath.research.runCampaignLoop",
        allowed: true,
        confirmation_id: readString(input, "confirmation_id")
      }
    });
    return runResearchCampaignLoop(client, {
      project_root: projectRoot,
      project_name: readString(input, "project_name", { optional: true }),
      user_goal: readString(input, "user_goal"),
      domain: readString(input, "domain", { optional: true }),
      strict_mode: input.strict_mode === undefined ? undefined : input.strict_mode === true,
      actor,
      max_ticks: maxTicks,
      capability
    });
  }

  if (name === "comath.campaign.status") {
    const projectRoot = readString(input, "project_root");
    const campaignId = readString(input, "campaign_id");
    return client.get(`${campaignPath(campaignId, "/status")}?project_root=${encodeQuery(projectRoot)}`);
  }

  if (name === "comath.campaign.tick") {
    const campaignId = readString(input, "campaign_id");
    return client.post(campaignPath(campaignId, "/tick"), {
      project_root: readString(input, "project_root"),
      actor: readString(input, "actor")
    });
  }

  if (name === "comath.campaign.nextActions") {
    const projectRoot = readString(input, "project_root");
    const campaignId = readString(input, "campaign_id");
    return client.get(`${campaignPath(campaignId, "/next-actions")}?project_root=${encodeQuery(projectRoot)}`);
  }

  if (name === "comath.campaign.finalAudit") {
    const campaignId = readString(input, "campaign_id");
    return client.post(campaignPath(campaignId, "/final-audit"), {
      project_root: readString(input, "project_root"),
      actor: readString(input, "actor")
    });
  }

  if (name === "comath.campaign.replay") {
    const campaignId = readString(input, "campaign_id");
    return client.post(campaignPath(campaignId, "/replay"), {
      project_root: readString(input, "project_root"),
      actor: readString(input, "actor")
    });
  }

  throw new Error(`unsupported comath tool: ${name}`);
}

function objectSchema(required: string[], properties: Record<string, unknown>): ToolDescriptor["input_schema"] {
  return {
    type: "object",
    required,
    properties
  };
}

function requireConfirmationSchema(schema: ToolDescriptor["input_schema"]): ToolDescriptor["input_schema"] {
  return {
    ...schema,
    required: [...new Set([...(schema.required ?? []), "confirmation_id"])],
    properties: {
      ...schema.properties,
      confirmation_id: { type: "string" }
    }
  };
}

function objectParameterSchema(schema: ToolDescriptor["input_schema"]): Record<string, unknown> {
  return {
    type: "object",
    required: schema.required ?? [],
    properties: schema.properties,
    additionalProperties: false
  };
}

function piRuntimeParameterSchema(tool: ToolDescriptor): Record<string, unknown> {
  return objectParameterSchema(tool.mutates ? withoutConfirmationSchema(tool.input_schema) : tool.input_schema);
}

function toolLabel(name: string): string {
  return name
    .split(".")
    .slice(1)
    .join(" ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export function createComathTools(): ToolDescriptor[] {
  const stringProp = { type: "string" };
  const stringArrayProp = { type: "array", items: stringProp };
  return [
    {
      name: "comath.project.open",
      description: "Open an initialized CoMath project through comathd.",
      mutates: false,
      input_schema: objectSchema(["root_path"], { root_path: stringProp })
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
      name: "comath.claim.requestPromotion",
      description: "Request a fail-closed promotion gate decision through comathd.",
      mutates: true,
      input_schema: objectSchema(["project_root", "project_id", "claim_id", "target_status"], {
        project_root: stringProp,
        project_id: stringProp,
        claim_id: stringProp,
        target_status: stringProp,
        evidence_ids: stringArrayProp,
        artifact_ids: stringArrayProp
      })
    },
    {
      name: "comath.evidence.attach",
      description: "Attach evidence through comathd when evidence routes become available.",
      mutates: true,
      input_schema: objectSchema(["project_root", "project_id", "kind", "summary"], {
        project_root: stringProp,
        project_id: stringProp,
        claim_id: stringProp,
        kind: stringProp,
        summary: stringProp,
        artifact_ids: stringArrayProp
      })
    },
    {
      name: "comath.graph.proposePatch",
      description: "Propose a graph patch for later review.",
      mutates: true,
      input_schema: objectSchema(["project_id", "new_nodes", "new_edges"], {
        project_id: stringProp,
        source_workstream_id: stringProp,
        new_nodes: { type: "array" },
        new_edges: { type: "array" }
      })
    },
    {
      name: "comath.status.snapshot",
      description: "Render a status snapshot through comathd or local extension state.",
      mutates: false,
      input_schema: objectSchema(["project_id"], { project_id: stringProp })
    },
    {
      name: "comath.research.startCampaign",
      description: "Start a bounded ResearchCampaign through comathd's native proof-kernel path.",
      mutates: true,
      input_schema: objectSchema(["project_root", "user_goal", "actor"], {
        project_root: stringProp,
        project_name: stringProp,
        user_goal: stringProp,
        domain: stringProp,
        strict_mode: { type: "boolean" },
        actor: stringProp
      })
    },
    {
      name: "comath.research.runCampaignLoop",
      description: "Run a bounded one-command ResearchCampaign loop through comathd and return dashboard state.",
      mutates: true,
      input_schema: objectSchema(["project_root", "user_goal", "actor", "confirmation_id"], {
        project_root: stringProp,
        project_name: stringProp,
        user_goal: stringProp,
        domain: stringProp,
        strict_mode: { type: "boolean" },
        actor: stringProp,
        max_ticks: { type: "number", minimum: 0 },
        confirmation_id: stringProp
      })
    },
    {
      name: "comath.campaign.status",
      description: "Read ResearchCampaign status through comathd.",
      mutates: false,
      input_schema: objectSchema(["project_root", "campaign_id"], {
        project_root: stringProp,
        campaign_id: stringProp
      })
    },
    {
      name: "comath.campaign.tick",
      description: "Advance one bounded ResearchCampaign tick through comathd.",
      mutates: true,
      input_schema: objectSchema(["project_root", "campaign_id", "actor"], {
        project_root: stringProp,
        campaign_id: stringProp,
        actor: stringProp
      })
    },
    {
      name: "comath.campaign.nextActions",
      description: "Read campaign next actions without mutating trusted state.",
      mutates: false,
      input_schema: objectSchema(["project_root", "campaign_id"], {
        project_root: stringProp,
        campaign_id: stringProp
      })
    },
    {
      name: "comath.campaign.finalAudit",
      description: "Run the final proof-kernel audit route through comathd.",
      mutates: true,
      input_schema: objectSchema(["project_root", "campaign_id", "actor"], {
        project_root: stringProp,
        campaign_id: stringProp,
        actor: stringProp
      })
    },
    {
      name: "comath.campaign.replay",
      description: "Replay the campaign final Lean proof through comathd.",
      mutates: true,
      input_schema: objectSchema(["project_root", "campaign_id", "actor"], {
        project_root: stringProp,
        campaign_id: stringProp,
        actor: stringProp
      })
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
        wording: { type: "string", enum: ["theorem", "lemma", "proposition", "conjecture", "claim", "remark"] },
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
        format: { type: "string", enum: ["md", "tex"] },
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
  ].map((tool) =>
    tool.mutates
      ? {
          ...tool,
          input_schema: requireConfirmationSchema(tool.input_schema)
        }
      : tool
  );
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

export async function runComathResearchCommand(
  client: ComathClient,
  command: string,
  defaults: {
    project_root: string;
    project_name?: string;
    actor: string;
    confirmation_id: string;
    max_ticks?: number;
  }
) {
  const parsed = parseComathCommand(command);
  if (!parsed || parsed.action !== "research") {
    throw new Error("research command is required");
  }
  const capability = issueCampaignLoopCapability({
    project_root: defaults.project_root,
    actor: defaults.actor,
    max_ticks: defaults.max_ticks,
    confirmation: {
      kind: "mutation_confirmation",
      target: "/cm:research",
      allowed: true,
      confirmation_id: defaults.confirmation_id
    }
  });
  return runResearchCampaignLoop(
    client,
    buildResearchCampaignLoopInput(parsed, {
      project_root: defaults.project_root,
      project_name: defaults.project_name,
      actor: defaults.actor,
      max_ticks: defaults.max_ticks,
      capability
    })
  );
}

function optionValue(args: string[], name: string): string | undefined {
  const index = args.indexOf(name);
  if (index === -1) {
    return undefined;
  }
  const value = args[index + 1];
  return value && !value.startsWith("--") ? value : undefined;
}

function numberOptionValue(args: string[], name: string): number | undefined {
  const value = optionValue(args, name);
  if (value === undefined) {
    return undefined;
  }
  const parsed = Number(value);
  if (Number.isFinite(parsed) && parsed >= 0) {
    return parsed;
  }
  throw new Error(`${name} must be a non-negative number`);
}

function firstPositional(args: string[]): string | undefined {
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg.startsWith("--")) {
      const next = args[index + 1];
      if (next && !next.startsWith("--")) {
        index += 1;
      }
      continue;
    }
    return arg;
  }
  return undefined;
}

function runtimeCtx(ctx: unknown): PiRuntimeContext {
  return ctx && typeof ctx === "object" ? ctx as PiRuntimeContext : {};
}

async function requirePiHostConfirmation(
  ctx: unknown,
  target: string,
  params: Record<string, unknown>
): Promise<string> {
  const confirm = runtimeCtx(ctx).ui?.confirm;
  if (!confirm) {
    throw new Error(`Pi host confirmation is required for ${target}`);
  }
  const allowed = await confirm(
    "Confirm CoMath mutation",
    `Allow ${target} to mutate trusted CoMath state through comathd? ${JSON.stringify(params)}`
  );
  if (allowed !== true) {
    throw new Error(`mutation rejected by Pi host confirmation for ${target}`);
  }
  return `pi-host-confirmed:${target}`;
}

function actorFrom(options: RegisterComathPiRuntimeOptions, args: string[]): string {
  return optionValue(args, "--actor") ?? options.actor ?? "pi-runtime";
}

function projectRootFrom(options: RegisterComathPiRuntimeOptions, args: string[]): string {
  const projectRoot = optionValue(args, "--project-root") ?? options.project_root;
  if (!projectRoot) {
    throw new Error("--project-root is required");
  }
  return projectRoot;
}

async function notifyRuntimeResult(ctx: unknown, result: unknown): Promise<void> {
  const notify = runtimeCtx(ctx).ui?.notify;
  if (notify) {
    await notify(JSON.stringify(result), "info");
  }
}

async function executeRuntimeToolWithHostConfirmation(
  client: ComathClient,
  tool: ToolDescriptor,
  params: Record<string, unknown>,
  ctx?: unknown
): Promise<any> {
  const sanitized = { ...params };
  delete sanitized.confirmation_id;
  const executionInput = tool.mutates
    ? {
        ...sanitized,
        confirmation_id: await requirePiHostConfirmation(ctx, tool.name, sanitized)
      }
    : sanitized;
  return executeComathTool(client, tool.name, executionInput);
}

async function handleCampaignCommand(
  client: ComathClient,
  options: RegisterComathPiRuntimeOptions,
  args: string,
  ctx: unknown
): Promise<void> {
  const parsed = parseComathCommand(`/cm:campaign ${args}`.trim());
  if (!parsed || parsed.action !== "campaign") {
    throw new Error("campaign command is required");
  }
  const subcommand = parsed.subcommand ?? "status";
  const campaignId = optionValue(parsed.args, "--campaign-id") ?? firstPositional(parsed.args);
  if (!campaignId) {
    throw new Error("campaign_id is required");
  }
  const base = {
    project_root: projectRootFrom(options, parsed.args),
    campaign_id: campaignId
  };
  if (subcommand === "status") {
    await notifyRuntimeResult(ctx, await executeComathTool(client, "comath.campaign.status", base));
    return;
  }
  if (subcommand === "tick") {
    const tool = createComathTools().find((descriptor) => descriptor.name === "comath.campaign.tick");
    if (!tool) {
      throw new Error("campaign tick tool is not registered");
    }
    await notifyRuntimeResult(
      ctx,
      await executeRuntimeToolWithHostConfirmation(
        client,
        tool,
        {
          ...base,
          actor: actorFrom(options, parsed.args)
        },
        ctx
      )
    );
    return;
  }
  if (subcommand === "next-actions") {
    await notifyRuntimeResult(ctx, await executeComathTool(client, "comath.campaign.nextActions", base));
    return;
  }
  throw new Error(`unsupported campaign command: ${subcommand}`);
}

async function handleResearchCommand(
  client: ComathClient,
  options: RegisterComathPiRuntimeOptions,
  args: string,
  ctx: unknown
): Promise<void> {
  const parsed = parseComathCommand(`/cm:research ${args}`.trim());
  if (!parsed || parsed.action !== "research") {
    throw new Error("research command is required");
  }
  const projectRoot = projectRootFrom(options, parsed.args);
  const actor = actorFrom(options, parsed.args);
  const confirmationId = await requirePiHostConfirmation(ctx, "/cm:research", {
    project_root: projectRoot,
    actor,
    args: parsed.args,
    subcommand: parsed.subcommand
  });
  await notifyRuntimeResult(
    ctx,
    await runComathResearchCommand(client, `/cm:research ${args}`.trim(), {
      project_root: projectRoot,
      project_name: optionValue(parsed.args, "--project-name") ?? options.project_name,
      actor,
      confirmation_id: confirmationId,
      max_ticks: numberOptionValue(parsed.args, "--max-ticks") ?? options.max_ticks
    })
  );
}

async function handleAuditCommand(
  client: ComathClient,
  options: RegisterComathPiRuntimeOptions,
  args: string,
  ctx: unknown
): Promise<void> {
  const parsed = parseComathCommand(`/cm:audit ${args}`.trim());
  if (!parsed || parsed.action !== "audit") {
    throw new Error("audit command is required");
  }
  const campaignId = optionValue(parsed.args, "--campaign-id") ?? firstPositional(parsed.args);
  if (!campaignId) {
    throw new Error("campaign_id is required");
  }
  const tool = createComathTools().find((descriptor) => descriptor.name === "comath.campaign.finalAudit");
  if (!tool) {
    throw new Error("campaign final audit tool is not registered");
  }
  await notifyRuntimeResult(
    ctx,
    await executeRuntimeToolWithHostConfirmation(
      client,
      tool,
      {
        project_root: projectRootFrom(options, parsed.args),
        campaign_id: campaignId,
        actor: actorFrom(options, parsed.args)
      },
      ctx
    )
  );
}

async function handleReplayCommand(
  client: ComathClient,
  options: RegisterComathPiRuntimeOptions,
  args: string,
  ctx: unknown
): Promise<void> {
  const parsed = parseComathCommand(`/cm:replay ${args}`.trim());
  if (!parsed || parsed.action !== "replay") {
    throw new Error("replay command is required");
  }
  const campaignId = optionValue(parsed.args, "--campaign-id") ?? firstPositional(parsed.args);
  if (!campaignId) {
    throw new Error("campaign_id is required");
  }
  const tool = createComathTools().find((descriptor) => descriptor.name === "comath.campaign.replay");
  if (!tool) {
    throw new Error("campaign replay tool is not registered");
  }
  await notifyRuntimeResult(
    ctx,
    await executeRuntimeToolWithHostConfirmation(
      client,
      tool,
      {
        project_root: projectRootFrom(options, parsed.args),
        campaign_id: campaignId,
        actor: actorFrom(options, parsed.args)
      },
      ctx
    )
  );
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

function defaultComathResources(subagents: SubagentDefinition[]): ComathResource[] {
  return discoverComathResources({
    skills: ["math-research", "mathprove-adapter"],
    prompts: ["coordinator", "reviewer", "formalization", "parallel-workstream"],
    domainPacks: ["braid-statistics"],
    subagents: subagents.map((definition) => definition.id),
    artifacts: ["snapshot-manifest", "replay-manifest"]
  });
}

function defaultRuntimeRegistration(subagents: SubagentDefinition[]) {
  return createPiRuntimeRegistration(
    {
      name: "coMath-pi-lab",
      commands: PI_RUNTIME_COMMANDS,
      tools: createComathTools(),
      resources: defaultComathResources(subagents),
      subagents
    },
    {
      package_name: "@comath/pi-extension",
      package_version: "0.0.0",
      entrypoint: "./dist/index.js",
      detected_pi_runtime: {
        source: "local_probe",
        version: "unknown",
        confidence: "unverified"
      },
      rate_limit: {
        global_rpm: 4
      }
    }
  );
}

export const runtime_registration = defaultRuntimeRegistration(listSubagentDefinitions());

export function createDefaultComathClient(): ComathClient {
  return createComathClient({
    baseUrl: globalThis.process?.env?.COMATHD_BASE_URL ?? DEFAULT_COMATHD_BASE_URL
  });
}

export default function registerComathPiRuntime(pi: PiExtensionApi, options: RegisterComathPiRuntimeOptions = {}): void {
  const client = options.client ?? createDefaultComathClient();

  for (const tool of createComathTools().filter((descriptor) => PI_RUNTIME_EXECUTABLE_TOOL_NAMES.has(descriptor.name))) {
    pi.registerTool({
      name: tool.name,
      label: toolLabel(tool.name),
      description: tool.description,
      parameters: piRuntimeParameterSchema(tool),
      executionMode: tool.mutates ? "sequential" : "parallel",
      async execute(_toolCallId, params, _signal, _onUpdate, ctx) {
        try {
          const result = await executeRuntimeToolWithHostConfirmation(client, tool, params, ctx);
          return {
            content: [{ type: "text", text: JSON.stringify(result) }],
            details: result
          };
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          return {
            content: [{ type: "text", text: message }],
            details: { error: message },
            isError: true
          };
        }
      }
    });
  }

  pi.registerCommand("cm:research", {
    description: "Start or continue a bounded CoMath ResearchCampaign through comathd.",
    handler: async (args, ctx) => {
      await handleResearchCommand(client, options, args, ctx);
    }
  });

  pi.registerCommand("cm:campaign", {
    description: "Inspect or tick a CoMath ResearchCampaign through comathd.",
    handler: async (args, ctx) => {
      await handleCampaignCommand(client, options, args, ctx);
    }
  });

  pi.registerCommand("cm:audit", {
    description: "Run CoMath final audit routes through comathd.",
    handler: async (args, ctx) => {
      await handleAuditCommand(client, options, args, ctx);
    }
  });

  pi.registerCommand("cm:replay", {
    description: "Run CoMath replay routes through comathd.",
    handler: async (args, ctx) => {
      await handleReplayCommand(client, options, args, ctx);
    }
  });

  pi.on("resources_discover", () => ({
    skillPaths: ["skills"],
    promptPaths: ["prompts"]
  }));
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
  const resources = defaultComathResources(subagents);
  return {
    name: "coMath-pi-lab",
    commands: COMATH_EXTENSION_COMMANDS,
    tools: createComathTools(),
    resources,
    subagents,
    client: options.client,
    runtime_registration: defaultRuntimeRegistration(subagents)
  };
}
