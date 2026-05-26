import { realpathSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

type ImportedModule = Record<string, any>;

type PiSdkModule = {
  AuthStorage: any;
  createAgentSession: (options?: Record<string, unknown>) => Promise<{ session: any }>;
  DefaultResourceLoader: new (options: Record<string, unknown>) => any;
  getAgentDir: () => string;
  ModelRegistry: any;
  SessionManager: any;
  SettingsManager?: any;
};

type PiAiModule = {
  fauxAssistantMessage?: (content: unknown, options?: Record<string, unknown>) => unknown;
  fauxText?: (text: string) => unknown;
  fauxToolCall?: (name: string, args: Record<string, unknown>, options?: { id?: string }) => unknown;
  registerFauxProvider?: (options?: Record<string, unknown>) => {
    getModel(modelId?: string): unknown;
    setResponses(responses: unknown[]): void;
    unregister(): void;
  };
};

export type PiSdkModulePaths = {
  codingAgent?: string;
  piAi?: string;
};

export type CoMathPiSdkRunnerOptions = {
  cwd: string;
  comathdBaseUrl?: string;
  extensionPath?: string;
  model?: unknown;
  authMode?: "pi-config" | "memory";
  thinkingLevel?: "off" | "minimal" | "low" | "medium" | "high" | "xhigh";
  prompt?: string;
  activeTools?: string[];
  modulePaths?: PiSdkModulePaths;
  allowMutations?: boolean;
  apiKey?: {
    provider: string;
    value: string;
  };
};

export type CoMathPiSdkRunnerResult = {
  ok: boolean;
  activeToolNames: string[];
  allToolNames: string[];
  toolResults: unknown[];
  leanToolResults: unknown[];
  assistantMessages: unknown[];
  events: unknown[];
  error?: string;
};

export type FakeLeanProofFlowInput = {
  cwd: string;
  projectRoot: string;
  projectId: string;
  claimId: string;
  theoremName: string;
  dependencyHash: string;
  leanSource: string;
  actor?: string;
  modelId?: string;
  modelResponseId?: string;
  toolCallId?: string;
  comathdBaseUrl?: string;
  extensionPath?: string;
  modulePaths?: PiSdkModulePaths;
};

const DEFAULT_PI_CODING_AGENT_PATH =
  "C:/Program Files/nodejs/node_global/node_modules/@earendil-works/pi-coding-agent/dist/index.js";
const DEFAULT_PI_AI_PATH =
  "C:/Program Files/nodejs/node_global/node_modules/@earendil-works/pi-coding-agent/node_modules/@earendil-works/pi-ai/dist/index.js";
const require = createRequire(import.meta.url);

function dynamicImport(specifier: string): Promise<ImportedModule> {
  const importer = new Function("specifier", "return import(specifier)") as (value: string) => Promise<ImportedModule>;
  return importer(specifier);
}

function normalizeImportTarget(target: string): string {
  if (/^[a-zA-Z]:[\\/]/.test(target)) {
    return pathToFileURL(target).href;
  }
  if (/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(target) || target.startsWith("@")) {
    return target;
  }
  return pathToFileURL(target).href;
}

function extensionPackageRoot(): string {
  return resolve(dirname(fileURLToPath(import.meta.url)), "..");
}

function localDependencyDistIndex(packageName: string): string {
  return resolve(extensionPackageRoot(), "node_modules", ...packageName.split("/"), "dist", "index.js");
}

function resolveImportTarget(target: string): string {
  if (target.startsWith("@")) {
    return realpathSync(require.resolve(target));
  }
  if (/^[a-zA-Z]:[\\/]/.test(target)) {
    return realpathSync(target);
  }
  if (target.startsWith("file:")) {
    return realpathSync(fileURLToPath(target));
  }
  return target;
}

async function importFirstAvailable(candidates: string[]): Promise<ImportedModule> {
  const errors: string[] = [];
  for (const candidate of candidates) {
    try {
      return await dynamicImport(normalizeImportTarget(candidate));
    } catch (error) {
      errors.push(`${candidate}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  throw new Error(`Unable to load Pi SDK module. Tried: ${errors.join("; ")}`);
}

async function importFirstAvailableWithTarget(candidates: string[]): Promise<{
  module: ImportedModule;
  target: string;
}> {
  const errors: string[] = [];
  for (const candidate of candidates) {
    try {
      return {
        module: await dynamicImport(normalizeImportTarget(candidate)),
        target: resolveImportTarget(candidate)
      };
    } catch (error) {
      errors.push(`${candidate}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  throw new Error(`Unable to load Pi SDK module. Tried: ${errors.join("; ")}`);
}

function localPiAiCandidateFromCodingAgent(target: string): string | undefined {
  const normalized = normalizeImportTarget(target);
  if (!normalized.startsWith("file:") || !normalized.endsWith("/dist/index.js")) {
    return undefined;
  }
  const codingAgentPackageRoot = resolve(dirname(fileURLToPath(normalized)), "..");
  return resolve(codingAgentPackageRoot, "..", "..", "@earendil-works", "pi-ai", "dist", "index.js");
}

export async function loadPiSdkModules(paths: PiSdkModulePaths = {}): Promise<{
  codingAgent: PiSdkModule;
  piAi: PiAiModule;
}> {
  const codingAgentImport = await importFirstAvailableWithTarget([
    paths.codingAgent ?? "",
    process.env.COMATH_PI_CODING_AGENT_MODULE ?? "",
    localDependencyDistIndex("@earendil-works/pi-coding-agent"),
    "@earendil-works/pi-coding-agent",
    DEFAULT_PI_CODING_AGENT_PATH
  ].filter(Boolean));
  const codingAgent = codingAgentImport.module as PiSdkModule;
  const localPiAiCandidate = localPiAiCandidateFromCodingAgent(codingAgentImport.target);

  const piAi = (await importFirstAvailable([
    paths.piAi ?? "",
    process.env.COMATH_PI_AI_MODULE ?? "",
    localPiAiCandidate ?? "",
    "@earendil-works/pi-ai",
    DEFAULT_PI_AI_PATH
  ].filter(Boolean))) as PiAiModule;

  return { codingAgent, piAi };
}

function createHeadlessUiContext(allowMutations: boolean) {
  return {
    select: async (_title: string, options: string[]) => options[0],
    confirm: async () => allowMutations,
    input: async () => undefined,
    notify: () => {},
    onTerminalInput: () => () => {},
    setStatus: () => {},
    setWorkingMessage: () => {},
    setWorkingVisible: () => {},
    setWorkingIndicator: () => {},
    setHiddenThinkingLabel: () => {},
    setWidget: () => {},
    setFooter: () => {},
    setHeader: () => {},
    setTitle: () => {},
    custom: async () => undefined,
    pasteToEditor: () => {},
    setEditorText: () => {},
    getEditorText: () => "",
    editor: async () => undefined,
    addAutocompleteProvider: () => {},
    setEditorComponent: () => {},
    getEditorComponent: () => undefined,
    theme: {},
    getAllThemes: () => [],
    getTheme: () => undefined,
    setTheme: () => ({ success: false, error: "headless CoMath SDK runner has no theme UI" }),
    getToolsExpanded: () => false,
    setToolsExpanded: () => {}
  };
}

function defaultPrompt(): string {
  return [
    "You are operating CoMath Pi Lab through Pi SDK tools.",
    "Generate Lean4 source yourself and submit it by calling comath_lean_check.",
    "Do not ask the host to translate a proof. Do not answer with JSON instead of a tool call.",
    "The tool result is the authority."
  ].join("\n");
}

function isLeanToolResult(result: unknown): boolean {
  if (!result || typeof result !== "object") {
    return false;
  }
  const candidate = result as Record<string, unknown>;
  return candidate.toolName === "comath_lean_check" || candidate.toolName === "comath.lean.check";
}

function pushUniqueMessage(messages: unknown[], message: unknown): void {
  if (!message || typeof message !== "object") {
    return;
  }
  if (!messages.includes(message)) {
    messages.push(message);
  }
}

export async function runCoMathPiSdkWorkflow(options: CoMathPiSdkRunnerOptions): Promise<CoMathPiSdkRunnerResult> {
  const previousBaseUrl = process.env.COMATHD_BASE_URL;
  const previousLabBaseUrl = process.env.COMATH_LAB_BASE_URL;
  if (options.comathdBaseUrl) {
    process.env.COMATHD_BASE_URL = options.comathdBaseUrl;
    process.env.COMATH_LAB_BASE_URL = options.comathdBaseUrl;
  }

  const events: unknown[] = [];
  const assistantMessages: unknown[] = [];
  const toolResults: unknown[] = [];
  let session: any;

  try {
    const { codingAgent } = await loadPiSdkModules(options.modulePaths);
    const usePiConfig = options.authMode !== "memory";
    const authStorage = usePiConfig ? codingAgent.AuthStorage.create() : codingAgent.AuthStorage.inMemory();
    if (options.apiKey?.value) {
      authStorage.setRuntimeApiKey(options.apiKey.provider, options.apiKey.value);
    }
    const modelRegistry = usePiConfig ? codingAgent.ModelRegistry.create(authStorage) : codingAgent.ModelRegistry.inMemory(authStorage);
    const agentDir = codingAgent.getAgentDir();
    const resourceLoader = new codingAgent.DefaultResourceLoader({
      cwd: options.cwd,
      agentDir,
      additionalExtensionPaths: options.extensionPath ? [options.extensionPath] : [],
      noSkills: true,
      noPromptTemplates: true,
      noThemes: true,
      systemPrompt: "You are a CoMath Pi Lab SDK controller. Use registered tools as the workflow contract."
    });
    await resourceLoader.reload();

    const settingsManager = codingAgent.SettingsManager?.inMemory
      ? codingAgent.SettingsManager.inMemory({
          compaction: { enabled: false },
          retry: { enabled: false, maxRetries: 0 }
        })
      : undefined;

    const created = await codingAgent.createAgentSession({
      cwd: options.cwd,
      model: options.model,
      thinkingLevel: options.thinkingLevel ?? "off",
      authStorage,
      modelRegistry,
      resourceLoader,
      sessionManager: codingAgent.SessionManager.inMemory(options.cwd),
      settingsManager,
      noTools: "builtin"
    });
    session = created.session;
    await session.bindExtensions({
      uiContext: createHeadlessUiContext(options.allowMutations ?? true)
    });

    const requestedTools = options.activeTools ?? ["comath_lean_check"];
    session.setActiveToolsByName(requestedTools);
    const activeToolNames = session.getActiveToolNames();
    const allToolNames = session.getAllTools().map((tool: { name: string }) => tool.name);

    session.subscribe((event: unknown) => {
      events.push(event);
      if (event && typeof event === "object") {
        const typed = event as Record<string, unknown>;
        if (typed.type === "turn_end") {
          const turnToolResults = Array.isArray(typed.toolResults) ? typed.toolResults : [];
          toolResults.push(...turnToolResults);
          if (typed.message) {
            pushUniqueMessage(assistantMessages, typed.message);
          }
        } else if (typed.type === "message_end" && typed.message && typeof typed.message === "object") {
          const message = typed.message as Record<string, unknown>;
          if (message.role === "assistant") {
            pushUniqueMessage(assistantMessages, message);
          }
        }
      }
    });

    await session.prompt(options.prompt ?? defaultPrompt(), {
      expandPromptTemplates: false,
      source: "sdk"
    });

    const leanToolResults = toolResults.filter(isLeanToolResult);
    return {
      ok: leanToolResults.length > 0,
      activeToolNames,
      allToolNames,
      toolResults,
      leanToolResults,
      assistantMessages,
      events
    };
  } catch (error) {
    return {
      ok: false,
      activeToolNames: session?.getActiveToolNames?.() ?? [],
      allToolNames: session?.getAllTools?.().map((tool: { name: string }) => tool.name) ?? [],
      toolResults,
      leanToolResults: toolResults.filter(isLeanToolResult),
      assistantMessages,
      events,
      error: error instanceof Error ? error.message : String(error)
    };
  } finally {
    session?.dispose?.();
    if (previousBaseUrl === undefined) {
      delete process.env.COMATHD_BASE_URL;
    } else {
      process.env.COMATHD_BASE_URL = previousBaseUrl;
    }
    if (previousLabBaseUrl === undefined) {
      delete process.env.COMATH_LAB_BASE_URL;
    } else {
      process.env.COMATH_LAB_BASE_URL = previousLabBaseUrl;
    }
  }
}

export async function runFakeModelLeanProofFlow(input: FakeLeanProofFlowInput): Promise<CoMathPiSdkRunnerResult> {
  const { piAi } = await loadPiSdkModules(input.modulePaths);
  if (!piAi.registerFauxProvider || !piAi.fauxAssistantMessage || !piAi.fauxToolCall || !piAi.fauxText) {
    throw new Error("Pi faux provider helpers are unavailable");
  }

  const modelId = input.modelId ?? "faux-comath-lean-prover";
  const modelResponseId = input.modelResponseId ?? "resp-faux-comath-lean";
  const toolCallId = input.toolCallId ?? "tool-call-faux-comath-lean";
  const registration = piAi.registerFauxProvider({
    models: [{ id: modelId, name: "Faux CoMath Lean Prover", reasoning: false }]
  });

  try {
    registration.setResponses([
      piAi.fauxAssistantMessage(
        [
          piAi.fauxToolCall(
            "comath_lean_check",
            {
              project_root: input.projectRoot,
              project_id: input.projectId,
              claim_id: input.claimId,
              theorem_name: input.theoremName,
              dependency_hash: input.dependencyHash,
              lean_source: input.leanSource,
              model_id: modelId,
              model_response_id: modelResponseId,
              actor: input.actor ?? "pi-sdk-faux-model"
            },
            { id: toolCallId }
          )
        ],
        { stopReason: "tool_call", responseId: modelResponseId }
      ),
      piAi.fauxAssistantMessage([piAi.fauxText("Lean check completed through CoMath.")], {
        responseId: `${modelResponseId}-final`
      })
    ]);

    return await runCoMathPiSdkWorkflow({
      cwd: input.cwd,
      comathdBaseUrl: input.comathdBaseUrl,
      extensionPath: input.extensionPath,
      model: registration.getModel(modelId),
      thinkingLevel: "off",
      activeTools: ["comath_lean_check"],
      modulePaths: input.modulePaths,
      allowMutations: true,
      authMode: "memory",
      prompt: [
        "Prove the requested theorem in Lean4.",
        "Submit the Lean source by calling comath_lean_check yourself.",
        `The theorem name is ${input.theoremName}.`
      ].join("\n"),
      apiKey: {
        provider: "faux",
        value: "faux-provider-test-key"
      }
    });
  } finally {
    registration.unregister();
  }
}
