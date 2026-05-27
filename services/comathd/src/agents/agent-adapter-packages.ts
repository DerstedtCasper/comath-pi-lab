import { existsSync, mkdirSync, readFileSync, realpathSync, writeFileSync } from "node:fs";
import { dirname, isAbsolute, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { appendAuditEvent } from "../audit/jsonl-writer.js";
import { ComathError } from "../errors.js";
import type { AgentRun } from "../types/schemas.js";
import { assertAgentRunWriteAllowed, startAgentRun, submitAgentRunReport } from "./agent-run-store.js";
import { createAgentRunScheduler, type AgentRunProcessResult, type AgentRunProcessStatus } from "./agent-run-scheduler.js";
import {
  buildAgentProfileLaunch,
  createAgentRunForProfile,
  getAgentProfile,
  type AgentProfile,
  type AgentProfileId,
  type AgentProfileLaunch
} from "./agent-profiles.js";

export type AgentAdapterPackageId = "codex-cli";

export type AgentAdapterPackageKind = "codex_cli";

export type AgentAdapterPackage = {
  id: AgentAdapterPackageId;
  kind: AgentAdapterPackageKind;
  label: string;
  version: string;
  program: string;
  adapter_script: string;
  default_rpm: number;
  supported_profiles: AgentProfileId[];
  proof_authority: "none";
  lifecycle: {
    health_args: string[];
    launch_prefix_args: string[];
  };
};

export type AgentAdapterBackend = "bundled" | "external" | "codex-api";

export type BuildAgentAdapterPackageLaunchInput = {
  project_id: string;
  run_id: string;
  profile_id: AgentProfileId;
  adapter_id: AgentAdapterPackageId;
  backend?: AgentAdapterBackend;
  goal: string;
  context_path: string;
  actor: string;
};

export type AgentAdapterPackageLaunch = {
  package: AgentAdapterPackage;
  profile: AgentProfile;
  launch: AgentProfileLaunch;
};

export type ExecuteAgentAdapterPackageInput = {
  project_id: string;
  campaign_id?: string;
  workstream_id: string;
  profile_id: AgentProfileId;
  adapter_id: AgentAdapterPackageId;
  backend?: AgentAdapterBackend;
  goal: string;
  context_path: string;
  actor: string;
};

export type ExecuteAgentAdapterPackageResult = {
  package: AgentAdapterPackage;
  profile: AgentProfile;
  run: AgentRun;
  launch: AgentProfileLaunch;
  result: AgentRunProcessResult;
};

const moduleDir = dirname(fileURLToPath(import.meta.url));

export type CodexApiBackendRequest = {
  url: string;
  headers: {
    authorization: string;
    "content-type": "application/json";
  };
  body: {
    model: string;
    input: string;
    metadata: Record<string, string>;
  };
};

export type CodexApiBackendResponse = {
  status: number;
  headers?: Record<string, string>;
  json: unknown;
};

export type CodexApiBackendClient = (request: CodexApiBackendRequest) => Promise<CodexApiBackendResponse>;

let codexApiBackendClientForTests: CodexApiBackendClient | undefined;

export function setCodexApiBackendClientForTests(client: CodexApiBackendClient | undefined): void {
  codexApiBackendClientForTests = client;
}

function adapterScriptPath(): string {
  const distCandidate = join(moduleDir, "adapters", "codex-cli-adapter.mjs");
  if (existsSync(distCandidate)) {
    return distCandidate;
  }
  return join(moduleDir, "..", "src", "agents", "adapters", "codex-cli-adapter.mjs");
}

function packageRegistry(): AgentAdapterPackage[] {
  return [
    {
      id: "codex-cli",
      kind: "codex_cli",
      label: "Codex CLI Adapter",
      version: "phase43-codex-adapter-v1",
      program: process.execPath,
      adapter_script: adapterScriptPath(),
      default_rpm: 4,
      supported_profiles: [
        "coordinator",
        "librarian",
        "computation",
        "proof-route",
        "formalization",
        "reviewer",
        "graph-builder",
        "security-auditor",
        "math-integrity-auditor"
      ],
      proof_authority: "none",
      lifecycle: {
        health_args: ["--adapter-package", "codex-cli", "--health"],
        launch_prefix_args: ["--adapter-package", "codex-cli"]
      }
    }
  ];
}

function clonePackage(pkg: AgentAdapterPackage): AgentAdapterPackage {
  return {
    ...pkg,
    supported_profiles: [...pkg.supported_profiles],
    lifecycle: {
      health_args: [...pkg.lifecycle.health_args],
      launch_prefix_args: [...pkg.lifecycle.launch_prefix_args]
    }
  };
}

export function listAgentAdapterPackages(): AgentAdapterPackage[] {
  return packageRegistry().map(clonePackage);
}

export function getAgentAdapterPackage(adapterId: string): AgentAdapterPackage {
  const pkg = listAgentAdapterPackages().find((entry) => entry.id === adapterId);
  if (!pkg) {
    throw new ComathError(`unknown agent adapter package: ${adapterId}`, {
      statusCode: 400,
      code: "AGENT_ADAPTER_PACKAGE_UNKNOWN"
    });
  }
  if (!existsSync(pkg.adapter_script)) {
    throw new ComathError(`agent adapter package script is missing: ${adapterId}`, {
      statusCode: 500,
      code: "AGENT_ADAPTER_PACKAGE_SCRIPT_MISSING"
    });
  }
  return pkg;
}

function assertProfileSupported(pkg: AgentAdapterPackage, profileId: AgentProfileId): void {
  if (pkg.supported_profiles.includes(profileId)) {
    return;
  }
  throw new ComathError(`adapter package ${pkg.id} does not support profile ${profileId}`, {
    statusCode: 400,
    code: "AGENT_ADAPTER_PACKAGE_PROFILE_UNSUPPORTED"
  });
}

function parseExternalPrefixArgs(rawValue: string | undefined): string[] {
  if (!rawValue) {
    return [];
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(rawValue);
  } catch {
    throw new ComathError("COMATH_CODEX_CLI_PREFIX_ARGS must be a JSON string array", {
      statusCode: 500,
      code: "AGENT_ADAPTER_PACKAGE_EXTERNAL_PREFIX_ARGS_INVALID"
    });
  }
  if (!Array.isArray(parsed) || parsed.some((entry) => typeof entry !== "string" || entry.length === 0)) {
    throw new ComathError("COMATH_CODEX_CLI_PREFIX_ARGS must be a JSON string array", {
      statusCode: 500,
      code: "AGENT_ADAPTER_PACKAGE_EXTERNAL_PREFIX_ARGS_INVALID"
    });
  }
  if (parsed.some((entry) => entry.includes("\u0000"))) {
    throw new ComathError("COMATH_CODEX_CLI_PREFIX_ARGS contains an invalid argument", {
      statusCode: 500,
      code: "AGENT_ADAPTER_PACKAGE_EXTERNAL_PREFIX_ARGS_INVALID"
    });
  }
  return parsed;
}

function resolveExternalCodexProgram(): { program: string; prefixArgs: string[] } | undefined {
  const configuredProgram = process.env.COMATH_CODEX_CLI_PROGRAM;
  if (!configuredProgram) {
    return undefined;
  }
  if (!isAbsolute(configuredProgram)) {
    throw new ComathError("COMATH_CODEX_CLI_PROGRAM must be an absolute path", {
      statusCode: 500,
      code: "AGENT_ADAPTER_PACKAGE_EXTERNAL_PROGRAM_INVALID"
    });
  }
  const absoluteProgram = resolve(configuredProgram);
  if (!existsSync(absoluteProgram)) {
    throw new ComathError("COMATH_CODEX_CLI_PROGRAM does not exist", {
      statusCode: 500,
      code: "AGENT_ADAPTER_PACKAGE_EXTERNAL_PROGRAM_MISSING"
    });
  }
  return {
    program: realpathSync.native(absoluteProgram),
    prefixArgs: parseExternalPrefixArgs(process.env.COMATH_CODEX_CLI_PREFIX_ARGS)
  };
}

function normalizeCodexApiBaseUrl(rawValue: string | undefined): string {
  const value = rawValue ?? "https://api.openai.com/v1";
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    throw new ComathError("COMATH_CODEX_API_BASE_URL must be a valid https URL", {
      statusCode: 500,
      code: "AGENT_ADAPTER_PACKAGE_CODEX_API_BASE_URL_INVALID"
    });
  }
  if (parsed.protocol !== "https:") {
    throw new ComathError("COMATH_CODEX_API_BASE_URL must use https", {
      statusCode: 500,
      code: "AGENT_ADAPTER_PACKAGE_CODEX_API_BASE_URL_INVALID"
    });
  }
  return value.replace(/\/+$/, "");
}

function codexApiModel(): string {
  return process.env.COMATH_CODEX_API_MODEL ?? "gpt-5-codex";
}

function codexApiKeyConfigured(): boolean {
  return Boolean(process.env.COMATH_CODEX_API_KEY);
}

function assertCodexApiConfigured(): { apiKey: string; baseUrl: string; model: string } {
  const apiKey = process.env.COMATH_CODEX_API_KEY;
  if (!apiKey) {
    throw new ComathError("Codex API key is not configured", {
      statusCode: 500,
      code: "AGENT_ADAPTER_PACKAGE_CODEX_API_KEY_MISSING"
    });
  }
  if (apiKey.includes("\u0000")) {
    throw new ComathError("Codex API key is invalid", {
      statusCode: 500,
      code: "AGENT_ADAPTER_PACKAGE_CODEX_API_KEY_INVALID"
    });
  }
  return {
    apiKey,
    baseUrl: normalizeCodexApiBaseUrl(process.env.COMATH_CODEX_API_BASE_URL),
    model: codexApiModel()
  };
}

function extractCodexApiOutputText(json: unknown): { responseId: string; text: string } {
  if (!json || typeof json !== "object") {
    return { responseId: "<unknown>", text: "" };
  }
  const record = json as Record<string, unknown>;
  const responseId = typeof record.id === "string" ? record.id : "<unknown>";
  if (typeof record.output_text === "string") {
    return { responseId, text: record.output_text };
  }
  const output = record.output;
  if (Array.isArray(output)) {
    const text = output
      .flatMap((entry) => {
        if (!entry || typeof entry !== "object") {
          return [];
        }
        const content = (entry as Record<string, unknown>).content;
        if (!Array.isArray(content)) {
          return [];
        }
        return content.flatMap((contentEntry) => {
          if (!contentEntry || typeof contentEntry !== "object") {
            return [];
          }
          const textValue = (contentEntry as Record<string, unknown>).text;
          return typeof textValue === "string" ? [textValue] : [];
        });
      })
      .join("\n");
    return { responseId, text };
  }
  return { responseId, text: "" };
}

async function defaultCodexApiBackendClient(request: CodexApiBackendRequest): Promise<CodexApiBackendResponse> {
  const response = await fetch(request.url, {
    method: "POST",
    headers: request.headers,
    body: JSON.stringify(request.body)
  });
  let json: unknown;
  try {
    json = await response.json();
  } catch {
    json = { error: { message: "Codex API returned non-JSON response" } };
  }
  return { status: response.status, headers: Object.fromEntries(response.headers.entries()), json };
}

function codexApiMaxAttempts(): number {
  const rawValue = process.env.COMATH_CODEX_API_MAX_ATTEMPTS;
  if (!rawValue) {
    return 2;
  }
  const parsed = Number(rawValue);
  if (Number.isInteger(parsed) && parsed >= 1 && parsed <= 5) {
    return parsed;
  }
  throw new ComathError("COMATH_CODEX_API_MAX_ATTEMPTS must be an integer between 1 and 5", {
    statusCode: 500,
    code: "AGENT_ADAPTER_PACKAGE_CODEX_API_ATTEMPTS_INVALID"
  });
}

function isCodexApiRetryableStatus(status: number): boolean {
  return status === 429 || (status >= 500 && status <= 599);
}

function parseRetryAfterMs(headers: Record<string, string> | undefined): number {
  if (!headers) {
    return 0;
  }
  const rawValue = headers["retry-after"] ?? headers["Retry-After"];
  if (!rawValue) {
    return 0;
  }
  const seconds = Number(rawValue);
  if (Number.isFinite(seconds) && seconds >= 0) {
    return Math.min(seconds * 1000, 2_000);
  }
  const dateMs = Date.parse(rawValue);
  if (Number.isFinite(dateMs)) {
    return Math.min(Math.max(dateMs - Date.now(), 0), 2_000);
  }
  return 0;
}

async function sleep(ms: number): Promise<void> {
  if (ms <= 0) {
    return;
  }
  await new Promise((resolveSleep) => setTimeout(resolveSleep, ms));
}

type CodexApiAttemptResult = {
  response: CodexApiBackendResponse;
  attempts: number;
  statuses: number[];
  rateLimited: boolean;
};

async function invokeCodexApiWithRetry(client: CodexApiBackendClient, request: CodexApiBackendRequest): Promise<CodexApiAttemptResult> {
  const maxAttempts = codexApiMaxAttempts();
  const statuses: number[] = [];
  let rateLimited = false;
  let response: CodexApiBackendResponse | undefined;
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    response = await client(request);
    statuses.push(response.status);
    if (response.status === 429) {
      rateLimited = true;
    }
    if (response.status >= 200 && response.status < 300) {
      return { response, attempts: attempt, statuses, rateLimited };
    }
    if (attempt >= maxAttempts || !isCodexApiRetryableStatus(response.status)) {
      return { response, attempts: attempt, statuses, rateLimited };
    }
    await sleep(parseRetryAfterMs(response.headers));
  }
  if (!response) {
    throw new ComathError("Codex API backend produced no response", {
      statusCode: 500,
      code: "AGENT_ADAPTER_PACKAGE_CODEX_API_EMPTY_RESPONSE"
    });
  }
  return { response, attempts: maxAttempts, statuses, rateLimited };
}

function renderCodexApiPrompt(input: ExecuteAgentAdapterPackageInput, run: AgentRun, profile: AgentProfile): string {
  return [
    "# CoMath Pi Lab Codex API Adapter Request",
    "",
    `profile: ${profile.id}`,
    `role: ${profile.role}`,
    `project_id: ${input.project_id}`,
    `agent_run_id: ${run.id}`,
    `workstream_id: ${input.workstream_id}`,
    `context_path: ${input.context_path}`,
    "proof_authority: none",
    "",
    "The Codex API backend may draft research or implementation notes only.",
    "It must not claim proof authority, mutate trusted state directly, or promote claims.",
    "",
    "## Goal",
    input.goal
  ].join("\n");
}

function renderCodexApiReport(
  input: ExecuteAgentAdapterPackageInput,
  run: AgentRun,
  profile: AgentProfile,
  responseId: string,
  outputText: string,
  telemetry?: { attempts: number; rateLimited: boolean; statuses: number[] }
): string {
  return [
    "# Agent Report",
    "",
    "## Input Context",
    "adapter_package: codex-cli",
    "adapter_backend: codex-api",
    `profile: ${profile.id}`,
    `role: ${profile.role}`,
    `context_path: ${input.context_path}`,
    `codex_api_response_id: ${responseId}`,
    telemetry ? `codex_api_attempts: ${telemetry.attempts}` : undefined,
    telemetry ? `codex_api_rate_limited: ${telemetry.rateLimited}` : undefined,
    telemetry ? `codex_api_statuses: ${telemetry.statuses.join(",")}` : undefined,
    "external_prompt_file: <none>",
    "external_program: <none>",
    "",
    "## Actions Taken",
    "Service-configured Codex API backend produced a bounded non-authoritative AgentRun draft.",
    "",
    "## Claims Proposed",
    "No trusted claim promotion.",
    "proof_authority: none",
    "supports_claim_status: none",
    "",
    "## Evidence Produced",
    "codex_api_output_untrusted: true",
    outputText.trimEnd() ? "" : undefined,
    outputText.trimEnd() || undefined,
    "",
    "## Graph Patch",
    "No GraphPatch authority.",
    "",
    "## Blockers",
    "None reported by Codex API backend.",
    "",
    "## Failed Routes",
    "No proof route certified by this adapter.",
    "",
    "## Self-Review",
    "The Codex API backend is service-configured runtime output and does not claim proof authority.",
    "",
    "## Next Actions",
    "Route any useful output through independent review and Lean-backed proof-kernel gates.",
    ""
  ]
    .filter((line) => line !== undefined)
    .join("\n");
}

function processResultForApiRun(
  run: AgentRun,
  status: AgentRunProcessStatus,
  startedAtMs: number,
  stdoutPath: string,
  stderrPath: string,
  reportPath?: string
): AgentRunProcessResult {
  return {
    run_id: run.id,
    project_id: run.project_id,
    status,
    exit_code: status === "succeeded" ? 0 : 1,
    signal: null,
    timed_out: false,
    cancelled: false,
    started_at_ms: startedAtMs,
    completed_at_ms: Date.now(),
    stdout_path: stdoutPath,
    stderr_path: stderrPath,
    ...(reportPath ? { report_path: reportPath } : {})
  };
}

async function executeCodexApiAdapterPackage(
  projectRoot: string,
  input: ExecuteAgentAdapterPackageInput,
  pkg: AgentAdapterPackage,
  profile: AgentProfile,
  run: AgentRun
): Promise<ExecuteAgentAdapterPackageResult> {
  const startedAtMs = Date.now();
  const running = startAgentRun(projectRoot, { project_id: input.project_id, run_id: run.id, actor: input.actor });
  const logsDir = `.tmp/comath/${run.id}/logs`;
  mkdirSync(assertAgentRunWriteAllowed(projectRoot, running, logsDir), { recursive: true });
  const stdoutPath = `${logsDir}/stdout.log`;
  const stderrPath = `${logsDir}/stderr.log`;
  const absoluteStdoutPath = assertAgentRunWriteAllowed(projectRoot, running, stdoutPath);
  const absoluteStderrPath = assertAgentRunWriteAllowed(projectRoot, running, stderrPath);
  try {
    const config = assertCodexApiConfigured();
    const request: CodexApiBackendRequest = {
      url: `${config.baseUrl}/responses`,
      headers: {
        authorization: `Bearer ${config.apiKey}`,
        "content-type": "application/json"
      },
      body: {
        model: config.model,
        input: renderCodexApiPrompt(input, running, profile),
        metadata: {
          project_id: input.project_id,
          agent_run_id: run.id,
          workstream_id: input.workstream_id,
          profile_id: profile.id,
          proof_authority: "none"
        }
      }
    };
    const client = codexApiBackendClientForTests ?? defaultCodexApiBackendClient;
    const attemptResult = await invokeCodexApiWithRetry(client, request);
    const response = attemptResult.response;
    if (response.status < 200 || response.status >= 300) {
      writeFileSync(absoluteStdoutPath, "", "utf8");
      writeFileSync(
        absoluteStderrPath,
        `Codex API backend failed after ${attemptResult.attempts} attempts; last_status=${response.status}\n`,
        "utf8"
      );
      const failed = submitAgentRunReport(projectRoot, {
        project_id: input.project_id,
        run_id: run.id,
        status: "failed",
        report_markdown: renderCodexApiReport(input, running, profile, "<failed>", "", {
          attempts: attemptResult.attempts,
          rateLimited: attemptResult.rateLimited,
          statuses: attemptResult.statuses
        }),
        exit_reason: "codex_api_backend_failed",
        actor: input.actor
      });
      appendAuditEvent(projectRoot, {
        project_id: input.project_id,
        event_type: "agent_adapter.codex_api_failed",
        actor: input.actor,
        target_id: run.id,
        payload: {
          adapter_id: pkg.id,
          profile_id: profile.id,
          model: config.model,
          attempts: attemptResult.attempts,
          statuses: attemptResult.statuses,
          last_status: response.status,
          rate_limited: attemptResult.rateLimited,
          proof_authority: "none"
        }
      });
      return {
        package: clonePackage(pkg),
        profile,
        run: failed,
        launch: buildAgentAdapterPackageLaunch(projectRoot, {
          project_id: input.project_id,
          run_id: run.id,
          profile_id: input.profile_id,
          adapter_id: input.adapter_id,
          backend: input.backend,
          goal: input.goal,
          context_path: input.context_path,
          actor: input.actor
        }).launch,
        result: processResultForApiRun(failed, "failed", startedAtMs, stdoutPath, stderrPath, failed.report_path)
      };
    }
    const extracted = extractCodexApiOutputText(response.json);
    const report = renderCodexApiReport(input, running, profile, extracted.responseId, extracted.text, {
      attempts: attemptResult.attempts,
      rateLimited: attemptResult.rateLimited,
      statuses: attemptResult.statuses
    });
    writeFileSync(absoluteStdoutPath, `${report.trimEnd()}\n`, "utf8");
    writeFileSync(absoluteStderrPath, "", "utf8");
    const submitted = submitAgentRunReport(projectRoot, {
      project_id: input.project_id,
      run_id: run.id,
      status: "succeeded",
      report_markdown: report,
      actor: input.actor
    });
    appendAuditEvent(projectRoot, {
      project_id: input.project_id,
      event_type: "agent_adapter.codex_api_invoked",
      actor: input.actor,
      target_id: run.id,
      payload: {
        adapter_id: pkg.id,
        profile_id: profile.id,
        model: config.model,
        base_url_configured: true,
        response_id: extracted.responseId,
        attempts: attemptResult.attempts,
        statuses: attemptResult.statuses,
        status: response.status,
        rate_limited: attemptResult.rateLimited,
        proof_authority: "none"
      }
    });
    return {
      package: clonePackage(pkg),
      profile,
      run: submitted,
      launch: buildAgentAdapterPackageLaunch(projectRoot, {
        project_id: input.project_id,
        run_id: run.id,
        profile_id: input.profile_id,
        adapter_id: input.adapter_id,
        backend: input.backend,
        goal: input.goal,
        context_path: input.context_path,
        actor: input.actor
      }).launch,
      result: processResultForApiRun(submitted, "succeeded", startedAtMs, stdoutPath, stderrPath, submitted.report_path)
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    writeFileSync(absoluteStdoutPath, "", "utf8");
    writeFileSync(absoluteStderrPath, `${message}\n`, "utf8");
    const failed = submitAgentRunReport(projectRoot, {
      project_id: input.project_id,
      run_id: run.id,
      status: "failed",
      report_markdown: renderCodexApiReport(input, running, profile, "<failed>", ""),
      exit_reason: "codex_api_backend_failed",
      actor: input.actor
    });
    return {
      package: clonePackage(pkg),
      profile,
      run: failed,
      launch: buildAgentAdapterPackageLaunch(projectRoot, {
        project_id: input.project_id,
        run_id: run.id,
        profile_id: input.profile_id,
        adapter_id: input.adapter_id,
        backend: input.backend,
        goal: input.goal,
        context_path: input.context_path,
        actor: input.actor
      }).launch,
      result: processResultForApiRun(failed, "failed", startedAtMs, stdoutPath, stderrPath, failed.report_path)
    };
  }
}

export function buildAgentAdapterPackageLaunch(
  projectRoot: string,
  input: BuildAgentAdapterPackageLaunchInput
): AgentAdapterPackageLaunch {
  const pkg = getAgentAdapterPackage(input.adapter_id);
  const backend = input.backend ?? "bundled";
  if (!(["bundled", "external", "codex-api"] as const).includes(backend)) {
    throw new ComathError(`unsupported adapter backend: ${backend}`, {
      statusCode: 400,
      code: "AGENT_ADAPTER_PACKAGE_BACKEND_UNSUPPORTED"
    });
  }
  const profile = getAgentProfile(input.profile_id);
  assertProfileSupported(pkg, profile.id);
  const externalCodex = backend === "external" ? resolveExternalCodexProgram() : undefined;
  const codexApiConfigured = backend === "codex-api" ? codexApiKeyConfigured() : false;
  const launch = buildAgentProfileLaunch(projectRoot, {
    project_id: input.project_id,
    run_id: input.run_id,
    profile_id: input.profile_id,
    program: pkg.program,
    goal: input.goal,
    context_path: input.context_path,
    actor: input.actor
  });
  launch.scheduler_options.rpm = Math.min(launch.scheduler_options.rpm, pkg.default_rpm);
  launch.launch_input.command.args = [
    pkg.adapter_script,
    ...pkg.lifecycle.launch_prefix_args,
    ...(launch.launch_input.command.args ?? [])
  ];
  launch.launch_input.command.env = {
    ...launch.launch_input.command.env,
    COMATH_ADAPTER_PACKAGE_ID: pkg.id,
    COMATH_ADAPTER_PACKAGE_KIND: pkg.kind,
    COMATH_CODEX_ADAPTER_BACKEND: backend,
    COMATH_PROOF_AUTHORITY: "none"
  };
  if (backend === "external" && externalCodex) {
    launch.launch_input.command.env.COMATH_CODEX_EXTERNAL_PROGRAM = externalCodex.program;
    if (externalCodex.prefixArgs.length > 0) {
      launch.launch_input.command.env.COMATH_CODEX_EXTERNAL_PREFIX_ARGS = JSON.stringify(externalCodex.prefixArgs);
    }
  }
  if (backend === "codex-api") {
    launch.launch_input.command.env.COMATH_CODEX_API_KEY_REF = "COMATH_CODEX_API_KEY";
    launch.launch_input.command.env.COMATH_CODEX_API_BASE_URL_CONFIGURED = String(Boolean(process.env.COMATH_CODEX_API_BASE_URL));
    launch.launch_input.command.env.COMATH_CODEX_API_MODEL = codexApiModel();
  }
  appendAuditEvent(projectRoot, {
    project_id: input.project_id,
    event_type: "agent_adapter.package_launch_prepared",
    actor: input.actor,
    target_id: input.run_id,
    payload: {
      adapter_id: pkg.id,
      profile_id: profile.id,
      backend,
      program: pkg.program,
      adapter_script: pkg.adapter_script,
      external_program_configured: Boolean(externalCodex),
      codex_api_configured: codexApiConfigured,
      rpm: launch.scheduler_options.rpm,
      proof_authority: pkg.proof_authority
    }
  });
  return { package: clonePackage(pkg), profile, launch };
}

export async function executeAgentAdapterPackage(
  projectRoot: string,
  input: ExecuteAgentAdapterPackageInput
): Promise<ExecuteAgentAdapterPackageResult> {
  const run = createAgentRunForProfile(projectRoot, {
    project_id: input.project_id,
    campaign_id: input.campaign_id,
    workstream_id: input.workstream_id,
    profile_id: input.profile_id,
    actor: input.actor
  });
  if ((input.backend ?? "bundled") === "codex-api") {
    const pkg = getAgentAdapterPackage(input.adapter_id);
    const profile = getAgentProfile(input.profile_id);
    assertProfileSupported(pkg, profile.id);
    return executeCodexApiAdapterPackage(projectRoot, input, pkg, profile, run);
  }
  const prepared = buildAgentAdapterPackageLaunch(projectRoot, {
    project_id: input.project_id,
    run_id: run.id,
    profile_id: input.profile_id,
    adapter_id: input.adapter_id,
    backend: input.backend,
    goal: input.goal,
    context_path: input.context_path,
    actor: input.actor
  });
  const scheduler = createAgentRunScheduler(prepared.launch.scheduler_options);
  const result = await scheduler.launch(projectRoot, prepared.launch.launch_input);
  appendAuditEvent(projectRoot, {
    project_id: input.project_id,
    event_type: "agent_adapter.package_executed",
    actor: input.actor,
    target_id: run.id,
    payload: {
      adapter_id: prepared.package.id,
      profile_id: prepared.profile.id,
      status: result.status,
      exit_code: result.exit_code,
      report_path: result.report_path,
      proof_authority: prepared.package.proof_authority
    }
  });
  return {
    package: prepared.package,
    profile: prepared.profile,
    run: {
      ...run,
      status: result.status,
      report_path: result.report_path
    },
    launch: prepared.launch,
    result
  };
}
