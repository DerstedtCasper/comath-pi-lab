import type { ToolDescriptor } from "./index.js";

export type OfficialPiToolUpdate = {
  toolCallId: string;
  name: string;
  status: "started";
};

export type OfficialPiToolContext = {
  hasUI?: boolean;
  tools?: {
    execute?: (
      name: string,
      params: Record<string, unknown>,
      options: { toolCallId: string; signal?: AbortSignal }
    ) => unknown | Promise<unknown>;
  };
};

export type OfficialPiToolRegistration = {
  name: string;
  label: string;
  description: string;
  parameters: ToolDescriptor["input_schema"];
  execute(
    toolCallId: string,
    params: Record<string, unknown>,
    signal?: AbortSignal,
    onUpdate?: (update: OfficialPiToolUpdate) => unknown | Promise<unknown>,
    ctx?: OfficialPiToolContext
  ): Promise<unknown>;
};

export type OfficialPiManifest = {
  extensions?: unknown[];
  skills?: unknown[];
  prompts?: unknown[];
  themes?: unknown[];
};

const OFFICIAL_MANIFEST_KEYS = new Set(["extensions", "skills", "prompts", "themes"]);

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function validateToolParams(tool: ToolDescriptor, params: unknown): Record<string, unknown> {
  if (!isPlainObject(params)) {
    throw new Error("official Pi tool params must be a plain object");
  }

  for (const field of tool.input_schema.required ?? []) {
    if (!Object.prototype.hasOwnProperty.call(params, field)) {
      throw new Error(`official Pi tool params missing required parameter: ${field}`);
    }
  }

  return params;
}

export function createOfficialPiToolRegistrations(tools: ToolDescriptor[]): OfficialPiToolRegistration[] {
  return tools.map((tool) => ({
    name: tool.name,
    label: tool.name,
    description: tool.description,
    parameters: tool.input_schema,
    async execute(toolCallId, params, signal, onUpdate, ctx) {
      if (signal?.aborted) {
        throw new Error("official Pi tool call aborted before start");
      }
      const parsedParams = validateToolParams(tool, params);
      if (!ctx?.tools?.execute) {
        throw new Error("official Pi tool executor is unavailable");
      }

      await onUpdate?.({
        toolCallId,
        name: tool.name,
        status: "started"
      });

      return ctx.tools.execute(tool.name, parsedParams, { toolCallId, signal });
    }
  }));
}

export function validateOfficialPiManifest(manifest: unknown): OfficialPiManifest {
  if (!manifest || typeof manifest !== "object" || Array.isArray(manifest)) {
    throw new Error("official Pi manifest must be an object");
  }

  for (const key of Object.keys(manifest)) {
    if (!OFFICIAL_MANIFEST_KEYS.has(key)) {
      throw new Error("official Pi manifest only allows extensions, skills, prompts, and themes");
    }
  }

  return manifest as OfficialPiManifest;
}

export function createOfficialPiManifest(manifest: OfficialPiManifest): OfficialPiManifest {
  return validateOfficialPiManifest({
    extensions: manifest.extensions ?? [],
    skills: manifest.skills ?? [],
    prompts: manifest.prompts ?? [],
    themes: manifest.themes ?? []
  });
}
