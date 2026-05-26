import {
  createComathClient,
  createComathPiExtension,
  type ToolDescriptor
} from "./index.js";

type PiRegisterFn = (registration: unknown) => unknown;
type FetchLike = NonNullable<Parameters<typeof createComathClient>[0]["fetch"]>;

type ToolExecutionContext = {
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
  registerTool?: PiRegisterFn;
  tools?: {
    register?: PiRegisterFn;
  };
  registerCommand?: PiRegisterFn;
  commands?: {
    register?: PiRegisterFn;
  };
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

function normalizeGraphPatchToolPayload(payload: Record<string, unknown>): Record<string, unknown> {
  return {
    ...payload,
    workstream_id: payload.workstream_id ?? payload.source_workstream_id,
    created_by: payload.created_by ?? payload.actor ?? "pi-extension"
  };
}

function routeForTool(name: string, payload: Record<string, unknown>): ComathRoute {
  switch (name) {
    case "comath.project.open":
      return { method: "POST", path: "/project/open", body: { root_path: payload.root_path } };
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
    case "comath.claim.requestPromotion":
      return { method: "POST", path: "/claim/promote", body: payload };
    case "comath.evidence.attach":
      return { method: "POST", path: "/evidence/attach", body: payload };
    case "comath.graph.proposePatch":
      return { method: "POST", path: "/graph-patch/propose", body: normalizeGraphPatchToolPayload(payload) };
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
  return {
    name: tool.name,
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
      await onUpdate?.({ toolCallId, name: tool.name, status: "started" });
      if (ctx?.tools?.execute) {
        return ctx.tools.execute(tool.name, parsedParams, { toolCallId, signal });
      }
      const fetchImpl = ctx?.fetch ?? globalThis.fetch;
      if (!fetchImpl) {
        throw new Error("No fetch implementation available for CoMath Pi tool execution");
      }
      return requestComathd(baseUrl, fetchImpl, routeForTool(tool.name, parsedParams));
    }
  };
}

function createCommandRegistration(name: string) {
  return {
    name,
    label: name,
    description: `Run the ${name} CoMath command.`,
    async execute() {
      return {
        ok: false,
        command: name,
        reason: "CoMath slash command execution requires a host Pi command dispatcher"
      };
    }
  };
}

export default async function installComathPiExtension(pi: PiRuntime = {}): Promise<PiExtensionInstallResult> {
  const baseUrl = normalizeBaseUrl(readEnvironmentBaseUrl() ?? "http://127.0.0.1:48731");
  const extension = createComathPiExtension({
    client: createComathClient({
      baseUrl
    })
  });

  const registerTool = getRegisterFn(pi.registerTool, pi.tools?.register);
  const registerCommand = getRegisterFn(pi.registerCommand, pi.commands?.register);

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

  let registeredCommands = 0;
  if (registerCommand) {
    for (const command of extension.commands) {
      registerCommand(createCommandRegistration(command));
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
