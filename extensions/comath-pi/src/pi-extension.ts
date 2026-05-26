import {
  createComathClient,
  createComathPiExtension,
  type ToolDescriptor
} from "./index.js";
import { toPiSafeToolName } from "./tool-names.js";

type PiRegisterFn = (registration: unknown) => unknown;
type PiRegisterCommandFn = (name: string, options: unknown) => unknown;
type FetchLike = NonNullable<Parameters<typeof createComathClient>[0]["fetch"]>;

type ToolExecutionContext = {
  fetch?: FetchLike;
};

type CommandExecutionContext = {
  hasUI?: boolean;
  ui?: {
    notify?: (message: string, type?: "info" | "warning" | "error") => void;
    confirm?: (title: string, message: string) => Promise<boolean> | boolean;
  };
};

type PiToolCallEvent = {
  toolName?: string;
  input?: unknown;
};

type PiToolCallContext = {
  hasUI?: boolean;
  ui?: {
    confirm?: (title: string, message: string) => Promise<boolean> | boolean;
  };
};

type LegacyToolExecutionContext = {
  fetch?: FetchLike;
  tools?: {
    execute?: (
      name: string,
      params: Record<string, unknown>,
      options: { toolCallId: string; signal?: AbortSignal }
    ) => unknown | Promise<unknown>;
  };
};

type PiRuntime = {
  on?: (event: "tool_call", handler: (event: PiToolCallEvent, ctx: PiToolCallContext) => unknown | Promise<unknown>) => void;
  registerTool?: PiRegisterFn;
  tools?: {
    register?: PiRegisterFn;
  };
  registerCommand?: PiRegisterCommandFn;
  commands?: {
    register?: PiRegisterCommandFn;
  };
  sendUserMessage?: (content: string, options?: { deliverAs?: "steer" | "followUp" }) => void | Promise<void>;
};

export type PiExtensionInstallResult = {
  ok: boolean;
  name: string;
  registeredTools: number;
  registeredCommands: number;
  reason?: string;
};

type ComathRoute = {
  method: "GET" | "POST";
  path: string;
  body?: unknown;
};

function getRegisterFn(primary: unknown, nested: unknown): PiRegisterFn | undefined {
  if (typeof primary === "function") {
    return primary as PiRegisterFn;
  }

  if (typeof nested === "function") {
    return nested as PiRegisterFn;
  }

  return undefined;
}

function getCommandRegisterFn(primary: unknown, nested: unknown): PiRegisterCommandFn | undefined {
  if (typeof primary === "function") {
    return primary as PiRegisterCommandFn;
  }

  if (typeof nested === "function") {
    return nested as PiRegisterCommandFn;
  }

  return undefined;
}

function readEnvironmentBaseUrl(): string | undefined {
  if (typeof process === "undefined") {
    return undefined;
  }
  return process.env.COMATHD_BASE_URL ?? process.env.COMATH_LAB_BASE_URL;
}

function normalizeBaseUrl(baseUrl: string): string {
  return baseUrl.replace(/\/+$/, "");
}

function encodeQuery(params: Record<string, string | undefined>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined) {
      search.set(key, value);
    }
  }
  const query = search.toString();
  return query ? `?${query}` : "";
}

async function requestComathd(baseUrl: string, fetchImpl: FetchLike, route: ComathRoute): Promise<any> {
  const response = await fetchImpl(`${normalizeBaseUrl(baseUrl)}${route.path}`, {
    method: route.method,
    headers: {
      "content-type": "application/json"
    },
    body: route.body === undefined ? undefined : JSON.stringify(route.body)
  });
  const payload = await response.json();
  if (!response.ok) {
    const detail =
      payload && typeof payload === "object" && "error" in payload ? String((payload as { error: unknown }).error) : "";
    throw new Error(`comathd request failed (${response.status})${detail ? `: ${detail}` : ""}`);
  }
  return payload;
}

function asPiToolResult(name: string, payload: unknown) {
  return {
    content: [
      {
        type: "text",
        text: `${name} completed through comathd.`
      }
    ],
    details: payload
  };
}

async function startResearchWorkflow(
  baseUrl: string,
  fetchImpl: FetchLike,
  payload: Record<string, unknown>
): Promise<any> {
  const project = await requestComathd(baseUrl, fetchImpl, {
    method: "POST",
    path: "/project/init",
    body: {
      root_path: payload.root_path,
      name: payload.name
    }
  });
  const projectId = String(payload.project_id ?? project.project?.project_id ?? "");
  if (!projectId) {
    throw new Error("comath.research.start could not resolve project_id from comathd project init response");
  }
  const actor = String(payload.actor ?? "pi-sdk");
  const workstream = await requestComathd(baseUrl, fetchImpl, {
    method: "POST",
    path: "/workstream/spawn",
    body: {
      project_root: payload.root_path,
      project_id: projectId,
      kind: String(payload.kind ?? "proof_route"),
      goal: payload.goal,
      actor,
      created_by: actor
    }
  });

  return {
    ok: true,
    headless: payload.headless === true,
    project: project.project,
    runtime_root: project.runtime_root,
    workstream: workstream.workstream
  };
}

function normalizeGraphPatchToolPayload(payload: Record<string, unknown>): Record<string, unknown> {
  return {
    ...payload,
    workstream_id: payload.workstream_id ?? payload.source_workstream_id,
    created_by: payload.created_by ?? payload.actor ?? "pi-extension"
  };
}

function routeForTool(name: string, payload: Record<string, unknown>): ComathRoute {
  switch (name) {
    case "comath.service.health":
      return { method: "GET", path: "/health" };
    case "comath.research.start":
      throw new Error("comath.research.start uses the two-step research workflow executor");
    case "comath.project.init":
      return { method: "POST", path: "/project/init", body: { root_path: payload.root_path, name: payload.name } };
    case "comath.project.open":
      return { method: "POST", path: "/project/open", body: { root_path: payload.root_path } };
    case "comath.project.status":
      return {
        method: "GET",
        path: `/project/status${encodeQuery({
          project_root: String(payload.project_root ?? "")
        })}`
      };
    case "comath.claim.register":
      return { method: "POST", path: "/claim/register", body: payload };
    case "comath.claim.get":
      return {
        method: "GET",
        path: `/claim/get${encodeQuery({
          project_root: String(payload.project_root ?? ""),
          project_id: String(payload.project_id ?? ""),
          claim_id: String(payload.claim_id ?? "")
        })}`
      };
    case "comath.claim.update":
      return { method: "POST", path: "/claim/update", body: payload };
    case "comath.claim.link":
      return { method: "POST", path: "/claim/link", body: payload };
    case "comath.claim.requestPromotion":
      return { method: "POST", path: "/claim/promote", body: payload };
    case "comath.evidence.attach":
      return { method: "POST", path: "/evidence/attach", body: payload };
    case "comath.artifact.import":
      return { method: "POST", path: "/artifact/import", body: payload };
    case "comath.artifact.list":
      return {
        method: "GET",
        path: `/artifact/list${encodeQuery({
          project_root: String(payload.project_root ?? ""),
          project_id: String(payload.project_id ?? "")
        })}`
      };
    case "comath.workstream.spawn":
      return { method: "POST", path: "/workstream/spawn", body: payload };
    case "comath.workstream.status":
      return {
        method: "GET",
        path: `/workstream/status${encodeQuery({
          project_root: String(payload.project_root ?? ""),
          project_id: String(payload.project_id ?? ""),
          workstream_id: String(payload.workstream_id ?? "")
        })}`
      };
    case "comath.workstream.list":
      return {
        method: "GET",
        path: `/workstream/list${encodeQuery({
          project_root: String(payload.project_root ?? ""),
          project_id: String(payload.project_id ?? "")
        })}`
      };
    case "comath.workstream.bundle":
      return {
        method: "GET",
        path: `/workstream/bundle${encodeQuery({
          project_root: String(payload.project_root ?? ""),
          project_id: String(payload.project_id ?? ""),
          workstream_id: String(payload.workstream_id ?? "")
        })}`
      };
    case "comath.workstream.report":
      return { method: "POST", path: "/workstream/report", body: payload };
    case "comath.workstream.transition":
      return { method: "POST", path: "/workstream/transition", body: payload };
    case "comath.graph.proposePatch":
      return { method: "POST", path: "/graph-patch/propose", body: normalizeGraphPatchToolPayload(payload) };
    case "comath.graph.reviewPatch":
      return { method: "POST", path: "/graph-patch/review", body: payload };
    case "comath.graph.applyPatch":
      return { method: "POST", path: "/graph-patch/apply", body: payload };
    case "comath.memory.health":
      return {
        method: "GET",
        path: `/memory/health${encodeQuery({
          project_root: String(payload.project_root ?? ""),
          project_id: String(payload.project_id ?? "")
        })}`
      };
    case "comath.memory.rebuild":
      return { method: "POST", path: "/memory/rebuild", body: payload };
    case "comath.memory.search":
      return { method: "POST", path: "/memory/search", body: payload };
    case "comath.memory.contextPack":
      return { method: "POST", path: "/memory/context-pack", body: payload };
    case "comath.literature.importBibTeX":
      return { method: "POST", path: "/literature/import-bibtex", body: payload };
    case "comath.literature.importPdf":
      return { method: "POST", path: "/literature/import-pdf", body: payload };
    case "comath.literature.registerCitation":
      return { method: "POST", path: "/literature/register-citation", body: payload };
    case "comath.literature.checkCondition":
      return { method: "POST", path: "/literature/check-condition", body: payload };
    case "comath.literature.list":
      return {
        method: "GET",
        path: `/literature/list${encodeQuery({
          project_root: String(payload.project_root ?? ""),
          project_id: String(payload.project_id ?? "")
        })}`
      };
    case "comath.status.snapshot":
      return {
        method: "GET",
        path: `/status/snapshot${encodeQuery({
          project_root: String(payload.project_root ?? ""),
          project_id: String(payload.project_id ?? "")
        })}`
      };
    case "comath.paper.init":
      return { method: "POST", path: "/paper/init", body: payload };
    case "comath.paper.state":
      return {
        method: "GET",
        path: `/paper/state${encodeQuery({
          project_root: String(payload.project_root ?? ""),
          project_id: String(payload.project_id ?? "")
        })}`
      };
    case "comath.paper.updateSection":
      return { method: "POST", path: "/paper/update-section", body: payload };
    case "comath.paper.renderClaim":
      return { method: "POST", path: "/paper/render-claim", body: payload };
    case "comath.paper.check":
      return {
        method: "GET",
        path: `/paper/check${encodeQuery({
          project_root: String(payload.project_root ?? ""),
          project_id: String(payload.project_id ?? "")
        })}`
      };
    case "comath.paper.export":
      return { method: "POST", path: "/paper/export", body: payload };
    case "comath.snapshot.export":
      return { method: "POST", path: "/snapshot/export", body: payload };
    case "comath.snapshot.verify":
      return { method: "POST", path: "/snapshot/verify", body: payload };
    case "comath.snapshot.restore":
      return { method: "POST", path: "/snapshot/restore", body: payload };
    case "comath.replay.verifyManifest":
      return { method: "POST", path: "/replay/verify-manifest", body: payload };
    default:
      throw new Error(`no comathd route mapping for Pi tool: ${name}`);
  }
}

function validateToolParams(tool: ToolDescriptor, params: unknown): Record<string, unknown> {
  if (!params || typeof params !== "object" || Array.isArray(params)) {
    throw new Error("CoMath Pi tool params must be a plain object");
  }
  for (const field of tool.input_schema.required ?? []) {
    if (!Object.prototype.hasOwnProperty.call(params, field)) {
      throw new Error(`CoMath Pi tool params missing required parameter: ${field}`);
    }
  }
  return params as Record<string, unknown>;
}

function createComathToolRegistration(tool: ToolDescriptor, baseUrl: string) {
  const safeName = toPiSafeToolName(tool.name);
  return {
    name: safeName,
    label: tool.name,
    description: tool.description,
    mutates: tool.mutates,
    confirmation_required: tool.mutates,
    parameters: tool.input_schema,
    async execute(
      toolCallId: string,
      params: Record<string, unknown>,
      signal?: AbortSignal,
      onUpdate?: (update: { toolCallId: string; name: string; status: "started" }) => unknown | Promise<unknown>,
      ctx?: ToolExecutionContext
    ) {
      if (signal?.aborted) {
        throw new Error("CoMath Pi tool call aborted before start");
      }
      const parsedParams = validateToolParams(tool, params);
      await onUpdate?.({ toolCallId, name: safeName, status: "started" });
      const legacyCtx = ctx as ToolExecutionContext & LegacyToolExecutionContext;
      if (legacyCtx?.tools?.execute) {
        const payload = await legacyCtx.tools.execute(tool.name, parsedParams, { toolCallId, signal });
        return asPiToolResult(tool.name, payload);
      }
      const fetchImpl = ctx?.fetch ?? globalThis.fetch;
      if (!fetchImpl) {
        throw new Error("No fetch implementation available for CoMath Pi tool execution");
      }
      const payload =
        tool.name === "comath.research.start"
          ? await startResearchWorkflow(baseUrl, fetchImpl, parsedParams)
          : await requestComathd(baseUrl, fetchImpl, routeForTool(tool.name, parsedParams));
      return asPiToolResult(tool.name, payload);
    }
  };
}

function createCommandRegistration(
  name: string,
  sendUserMessage?: PiRuntime["sendUserMessage"]
) {
  return {
    description: `Run the ${name} CoMath command.`,
    async handler(args: string, ctx?: CommandExecutionContext) {
      const message = `${name}${args ? ` ${args}` : ""}`;
      if (sendUserMessage) {
        await sendUserMessage(message);
        return;
      }
      if (ctx?.hasUI !== false && ctx?.ui?.notify) {
        ctx.ui.notify(`Queued ${message} for the Pi conversation.`, "info");
      }
    }
  };
}

function installMutationConfirmationGate(pi: PiRuntime, tools: ToolDescriptor[]): void {
  if (typeof pi.on !== "function") {
    return;
  }
  const mutatingToolsBySafeName = new Map(
    tools.filter((tool) => tool.mutates).map((tool) => [toPiSafeToolName(tool.name), tool.name])
  );
  pi.on("tool_call", async (event, ctx) => {
    const safeToolName = event.toolName;
    const canonicalToolName = safeToolName ? mutatingToolsBySafeName.get(safeToolName) : undefined;
    if (!canonicalToolName) {
      return undefined;
    }
    if (ctx.hasUI === false || !ctx.ui?.confirm) {
      return { block: true, reason: `CoMath mutating tool ${canonicalToolName} requires confirmation` };
    }
    const allowed = await ctx.ui.confirm("CoMath mutation", `${canonicalToolName} will mutate trusted CoMath state through comathd. Allow?`);
    if (!allowed) {
      return { block: true, reason: `CoMath mutating tool ${canonicalToolName} was blocked by user` };
    }
    return undefined;
  });
}

export default async function installComathPiExtension(pi: PiRuntime = {}): Promise<PiExtensionInstallResult> {
  const baseUrl = normalizeBaseUrl(readEnvironmentBaseUrl() ?? "http://127.0.0.1:48731");
  const extension = createComathPiExtension({
    client: createComathClient({
      baseUrl
    })
  });

  const registerTool = getRegisterFn(pi.registerTool, pi.tools?.register);
  const registerCommand = getCommandRegisterFn(pi.registerCommand, pi.commands?.register);

  if (!registerTool && !registerCommand) {
    return {
      ok: false,
      name: extension.name,
      registeredTools: 0,
      registeredCommands: 0,
      reason: "No compatible Pi registration API found"
    };
  }

  let registeredTools = 0;
  if (registerTool) {
    for (const tool of extension.tools as ToolDescriptor[]) {
      registerTool(createComathToolRegistration(tool, baseUrl));
      registeredTools += 1;
    }
  }
  installMutationConfirmationGate(pi, extension.tools as ToolDescriptor[]);

  let registeredCommands = 0;
  if (registerCommand) {
    for (const command of extension.commands) {
      registerCommand(command.replace(/^\/+/, ""), createCommandRegistration(command, pi.sendUserMessage));
      registeredCommands += 1;
    }
  }

  return {
    ok: true,
    name: extension.name,
    registeredTools,
    registeredCommands
  };
}
