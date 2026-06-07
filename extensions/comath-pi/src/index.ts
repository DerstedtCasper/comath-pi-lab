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
    headers?: { get(name: string): string | null };
    json(): Promise<unknown>;
    text?(): Promise<string>;
  }>;
};

export type ComathClient = {
  get(path: string): Promise<any>;
  getText(path: string): Promise<{ ok: boolean; status?: number; content_type: string; body: string }>;
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
  "comath.campaign.resume",
  "comath.campaign.cancel",
  "comath.campaign.export",
  "comath.campaign.finalAudit",
  "comath.campaign.replay",
  "comath.snapshot.export",
  "comath.snapshot.verify",
  "comath.snapshot.restore",
  "comath.replay.verifyManifest",
  "comath.release.sourceReviewPublicArchive",
  "comath.release.publicArchiveReview",
  "comath.release.piCodexLifecycleReview",
  "comath.release.piCodexApiProbe",
  "comath.release.piRealPiRuntimeProbe",
  "comath.release.piCodexLifecycleWalkthrough",
  "comath.release.piCodexLifecycleControl",
  "comath.release.piCodexLifecycleSession",
  "comath.release.piCodexLifecycleOperatorSession",
  "comath.release.piCodexLifecycleOperatorTransportRecovery",
  "comath.release.piCodexLifecycleOperatorTransportLease",
  "comath.release.piCodexLifecycleOperatorTransportHeartbeat",
  "comath.release.piCodexLifecycleGuidedRealPiExecution",
  "comath.release.piCodexLifecycleOperatorServiceTransportContract",
  "comath.release.piCodexLifecycleOperatorServiceTransportContinuity",
  "comath.release.piCodexLifecycleAutomaticRealPiExecution",
  "comath.release.piCodexLifecycleInteractiveRealPi",
  "comath.release.piCodexLifecycleUnattendedRealHostHandoffReview",
  "comath.release.piCodexLifecycleUnattendedRealHostOperatorApproval",
  "comath.release.piCodexLifecycleUnattendedRealHostExecutionReadiness",
  "comath.release.agentAdapterOsIsolationProbe",
  "comath.release.agentAdapterOsIsolationSandboxExecutionProbe",
  "comath.release.agentAdapterOsIsolationProviderHostCapabilityProbe",
  "comath.release.agentAdapterOsIsolationProviderHelperHostValidation",
  "comath.agent.profileList",
  "comath.agent.profileGet",
  "comath.agent.runForProfile",
  "comath.agent.prepareLaunch",
  "comath.agent.executeProfile",
  "comath.agent.logs",
  "comath.agent.streamLogs",
  "comath.agent.subscribeLogs",
  "comath.agent.logSession",
  "comath.agent.operatorPanel",
  "comath.agent.cancelRun",
  "comath.agent.health",
  "comath.agent.adapterPackageList",
  "comath.agent.prepareAdapterPackage",
  "comath.agent.executeAdapterPackage"
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
  "/cm:agent",
  "/cm:audit",
  "/cm:snapshot",
  "/cm:replay",
  "/cm:release",
  "/cm:dashboard"
];

const PI_RUNTIME_COMMANDS = [
  "/cm:research",
  "/cm:campaign",
  "/cm:agent",
  "/cm:audit",
  "/cm:snapshot",
  "/cm:replay",
  "/cm:release"
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
    action === "campaign" ||
    action === "agent" ||
    action === "release"
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
    async getText(path: string): Promise<{ ok: boolean; status?: number; content_type: string; body: string }> {
      const response = await fetchImpl(joinUrl(options.baseUrl, path), {
        method: "GET",
        headers: {
          accept: "text/event-stream"
        }
      });
      const payload = response.text ? await response.text() : JSON.stringify(await response.json());
      if (!response.ok) {
        throw new Error(`comathd text request failed (${response.status})${payload ? `: ${payload}` : ""}`);
      }
      return {
        ok: true,
        status: response.status,
        content_type: response.headers?.get("content-type") ?? "text/plain; charset=utf-8",
        body: payload
      };
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

function optionalProjectRoot(input: Record<string, unknown>): { project_root?: string } {
  const projectRoot = readString(input, "project_root", { optional: true });
  return projectRoot ? { project_root: projectRoot } : {};
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

function agentProfilePath(profileId: string): string {
  return `/agent/profile/${encodeURIComponent(profileId)}`;
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

const privilegedProofAuthorityPattern =
  /\b(?:clean_replay_passed|completed_formal_proof|formally_checked|proven|formal_proof_verified|formal_replay_passed|lean_kernel_clean_replay|verified_final_authority_evidence|proof_success|kernel_checked)\b/gi;
const publicTransportOverclaimPattern =
  /\b(?:long[- ]lived\s+(?:websocket|sse)|indefinite\s+sse|terminal transport recovered live|durable transport provided|live transport open|direct[- ]Pi[- ]write allowed)\b/gi;
const publicUnattendedOverclaimPattern =
  /\b(?:production unattended executor|operator[- ]free execution completed|unattended real[- ]host execution completed|unattended execution authorized|operator confirmation bypassed|operator approval recorded|operator approved|service[- ]owned evidence created|handoff can execute|GA certified|GA certification|can certify GA)\b/gi;

const hostPathEchoPattern = /(?:[A-Za-z]:[\\/][^\r\n<>"']*|\\\\\?\\[^\r\n<>"']*|\\\\[^\\\r\n<>"']+[\\/][^\r\n<>"']*)/g;
const posixHostPathEchoPattern =
  /(^|[\s"'=:(])\/(?:home|root|Users|tmp|var|mnt|media|srv|opt|etc|usr\/local|workspace|private|Volumes)\/[^\s<>"']*/g;
const trustedRuntimePathEchoPattern = new RegExp(
  `(^|[\\s"'=:(])${["", "comath"].join("\\.")}[\\\\/][^\\s<>"']*`,
  "gi"
);
const encodedTrustedRuntimePathEchoPattern = new RegExp(
  `(^|[\\s"'=:(])${["%2e", "comath"].join("")}(?:%2f|%5c)[^\\s<>"']*`,
  "gi"
);
const secretEchoPattern =
  /\b(?:COMATH_CODEX_API_KEY|OPENAI_API_KEY|api[_-]?key|token)\s*[:=]\s*[A-Za-z0-9._-]+|Authorization:\s*Bearer\s*[A-Za-z0-9._-]+|\bsk-[A-Za-z0-9._-]+\b/gi;
const secretObjectKeyPattern = /^(?:COMATH_CODEX_API_KEY|OPENAI_API_KEY|api[_-]?key|token|authorization)$/i;
const publicProofAuthorityKeyPattern = /^(?:proof_authority|proofAuthority)$/i;
const publicFalseAuthorityKeyPattern =
  /^(?:can_promote_claim|canPromoteClaim|can_certify_ga|canCertifyGa|durable_transport_provided|durableTransportProvided|live_transport_open|liveTransportOpen|indefinite_stream_open|indefiniteStreamOpen|long_lived_websocket_provided|longLivedWebsocketProvided|long_lived_sse_provided|longLivedSseProvided|pi_direct_write_allowed|piDirectWriteAllowed|direct_trusted_state_mutation|directTrustedStateMutation|os_enforced|osEnforced|operator_approved|operatorApproved|operatorApproval|unattended_execution_authorized|unattendedExecutionAuthorized|unattended_real_host_execution_completed|unattendedRealHostExecutionCompleted|operator_confirmation_bypassed|operatorConfirmationBypassed|service_owned_evidence_created|serviceOwnedEvidenceCreated|handoff_can_execute|handoffCanExecute)$/i;

function sanitizePublicProofAuthorityValue(value: unknown): unknown {
  if (typeof value === "string") {
    return value
      .replace(privilegedProofAuthorityPattern, "unverified_formal_status")
      .replace(publicTransportOverclaimPattern, "bounded_transport_checkpoint_only")
      .replace(publicUnattendedOverclaimPattern, "prepared_checkpoint_handoff_only")
      .replace(hostPathEchoPattern, "[redacted_host_path]")
      .replace(posixHostPathEchoPattern, "$1[redacted_host_path]")
      .replace(secretEchoPattern, "[redacted_secret]");
  }
  if (Array.isArray(value)) {
    return value.map((item) => sanitizePublicProofAuthorityValue(item));
  }
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, item]) =>
        secretObjectKeyPattern.test(key)
          ? ["[redacted_secret_key]", "[redacted_secret]"]
          : publicProofAuthorityKeyPattern.test(key)
            ? [key, "none"]
          : publicFalseAuthorityKeyPattern.test(key)
            ? [key, false]
          : [sanitizePublicProofAuthorityValue(key) as string, sanitizePublicProofAuthorityValue(item)]
      )
    );
  }
  return value;
}

function sanitizeTrustedRuntimePathValue(value: unknown): unknown {
  if (typeof value === "string") {
    return value
      .replace(trustedRuntimePathEchoPattern, "$1[redacted_trusted_runtime_path]")
      .replace(encodedTrustedRuntimePathEchoPattern, "$1[redacted_trusted_runtime_path]");
  }
  if (Array.isArray(value)) {
    return value.map((item) => sanitizeTrustedRuntimePathValue(item));
  }
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, item]) => [
        key,
        sanitizeTrustedRuntimePathValue(item)
      ])
    );
  }
  return value;
}

function sanitizePublicDisplayValue(value: unknown): unknown {
  return sanitizeTrustedRuntimePathValue(sanitizePublicProofAuthorityValue(value));
}

function shouldSanitizePublicToolResult(name: string): boolean {
  return (
    name === "comath.snapshot.export" ||
    name === "comath.snapshot.verify" ||
    name === "comath.snapshot.restore" ||
    name === "comath.replay.verifyManifest" ||
    name === "comath.release.sourceReviewPublicArchive" ||
    name === "comath.release.publicArchiveReview" ||
    name === "comath.release.piCodexLifecycleReview" ||
    name === "comath.release.piCodexApiProbe" ||
    name === "comath.release.piRealPiRuntimeProbe" ||
    name === "comath.release.piCodexLifecycleWalkthrough" ||
    name === "comath.release.piCodexLifecycleControl" ||
    name === "comath.release.piCodexLifecycleSession" ||
    name === "comath.release.piCodexLifecycleOperatorSession" ||
    name === "comath.release.piCodexLifecycleOperatorTransportRecovery" ||
    name === "comath.release.piCodexLifecycleOperatorTransportLease" ||
    name === "comath.release.piCodexLifecycleOperatorTransportHeartbeat" ||
    name === "comath.release.piCodexLifecycleGuidedRealPiExecution" ||
    name === "comath.release.piCodexLifecycleOperatorServiceTransportContract" ||
    name === "comath.release.piCodexLifecycleOperatorServiceTransportContinuity" ||
    name === "comath.release.piCodexLifecycleAutomaticRealPiExecution" ||
    name === "comath.release.piCodexLifecycleInteractiveRealPi" ||
    name === "comath.release.piCodexLifecycleUnattendedRealHostHandoffReview" ||
    name === "comath.release.piCodexLifecycleUnattendedRealHostOperatorApproval" ||
    name === "comath.release.piCodexLifecycleUnattendedRealHostExecutionReadiness" ||
    name === "comath.release.agentAdapterOsIsolationProbe" ||
    name === "comath.release.agentAdapterOsIsolationSandboxExecutionProbe" ||
    name === "comath.release.agentAdapterOsIsolationProviderHostCapabilityProbe" ||
    name === "comath.release.agentAdapterOsIsolationProviderHelperHostValidation" ||
    name === "comath.campaign.export" ||
    name === "comath.campaign.replay"
  );
}

async function publicToolResult(name: string, result: Promise<any>): Promise<any> {
  const value = await result;
  return shouldSanitizePublicToolResult(name) ? sanitizePublicDisplayValue(value) : value;
}

const PI_LIFECYCLE_WALKTHROUGH_SESSION_KINDS = [
  "real_pi_host_manual_install",
  "real_pi_host_automated_install"
] as const;

const PI_LIFECYCLE_CONTROL_PLAN_ACTIONS = ["plan", "status"] as const;
const PI_LIFECYCLE_SESSION_ACTIONS = ["plan", "status", "resume-plan"] as const;
const PI_LIFECYCLE_SESSION_STEP_IDS = [
  "run-real-pi-runtime-probe",
  "run-codex-api-probe",
  "review"
] as const;
const PI_LIFECYCLE_INTERACTIVE_REAL_PI_ACTIONS = [
  "plan",
  "status",
  "resume-plan",
  "unattended-handoff",
  "operator-review-checklist"
] as const;
const PI_LIFECYCLE_INTERACTIVE_REAL_PI_STEPS = [
  "run-real-pi-runtime-probe",
  "lifecycle-operator-session",
  "lifecycle-operator-transport-recovery",
  "lifecycle-operator-transport-lease",
  "lifecycle-operator-transport-heartbeat",
  "lifecycle-guided-real-pi-execution",
  "lifecycle-operator-service-transport-contract",
  "lifecycle-automatic-real-pi-execution",
  "lifecycle-operator-service-transport-continuity",
  "lifecycle-unattended-real-host-handoff-review",
  "lifecycle-unattended-real-host-operator-approval",
  "lifecycle-unattended-real-host-execution-readiness",
  "run-codex-api-probe",
  "review"
] as const;
const PI_LIFECYCLE_OPERATOR_SESSION_STATUSES = [
  "recoverable_operator_session",
  "blocked_operator_session",
  "completed_operator_session"
] as const;
const PI_LIFECYCLE_OPERATOR_SESSION_STEPS = [
  "real_pi_install_runtime_probe",
  "durable_service_lifecycle_probe",
  "codex_api_account_network_probe",
  "lifecycle_evidence_intake",
  "readiness_review"
] as const;
const PI_LIFECYCLE_OPERATOR_TRANSPORT_KINDS = [
  "operator_polling_checkpoint",
  "bounded_sse_snapshot",
  "manual_terminal_resume",
  "unknown"
] as const;
const PI_LIFECYCLE_OPERATOR_TRANSPORT_LEASE_KINDS = [
  "bounded_live_polling_lease",
  "bounded_live_sse_lease",
  "manual_terminal_polling_lease",
  "unknown"
] as const;
const AGENT_ADAPTER_OS_ISOLATION_PROVIDERS = [
  "oci_container",
  "nix_sandbox",
  "firejail",
  "windows_appcontainer",
  "macos_sandbox_exec",
  "service_process_boundary",
  "unknown"
] as const;

function publicOperatorText(value: string): string {
  return sanitizePublicProofAuthorityValue(value) as string;
}

function serviceArtifactPathText(value: string): string {
  return value
    .replace(privilegedProofAuthorityPattern, "unverified_formal_status")
    .replace(publicTransportOverclaimPattern, "bounded_transport_checkpoint_only")
    .replace(publicUnattendedOverclaimPattern, "prepared_checkpoint_handoff_only")
    .replace(hostPathEchoPattern, "[redacted_host_path]")
    .replace(posixHostPathEchoPattern, "$1[redacted_host_path]")
    .replace(secretEchoPattern, "[redacted_secret]");
}

const publicPiLifecycleArtifactPathPattern =
  /^service-owned-pi-lifecycle\/([A-Za-z0-9_.:-]+)\/([A-Za-z0-9_.:-]+\.json)$/;
const trustedRuntimeRootName = ["", "comath"].join(".");

function piLifecycleCanonicalArtifactPathText(value: string): string {
  const sanitized = serviceArtifactPathText(value).trim();
  const match = sanitized.match(publicPiLifecycleArtifactPathPattern);
  if (!match) {
    return sanitized;
  }
  return `${trustedRuntimeRootName}/release/pi-codex-lifecycle/${match[1]}/${match[2]}`;
}

function publicDiagnosticEnvironment(value: unknown): Record<string, string> | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return undefined;
  }
  const source = value as Record<string, unknown>;
  const environment: Record<string, string> = {};
  if (typeof source.platform === "string") {
    environment.platform = publicOperatorText(source.platform);
  }
  if (typeof source.notes === "string") {
    environment.notes = publicOperatorText(source.notes);
  }
  return Object.keys(environment).length > 0 ? environment : undefined;
}

function optionalPublicOperatorText(input: Record<string, unknown>, field: string, fallback: string): string {
  return publicOperatorText(readString(input, field, { optional: true }) ?? fallback);
}

const trustedRuntimeStateRootPattern = new RegExp(`(^|[\\\\/])${["", "comath"].join("\\.")}([\\\\/]|$)`, "i");
const encodedTrustedRuntimeStateRootPattern = /(?:^|%2f|%5c)%2ecomath(?:%2f|%5c|$)/i;
const plannerTokenPathPattern = /[\\/]|%2f|%5c/i;
const plannerSafeTokenPattern = /^[A-Za-z0-9][A-Za-z0-9_.:-]{0,127}$/;

function matchesPublicPattern(pattern: RegExp, value: string): boolean {
  pattern.lastIndex = 0;
  const result = pattern.test(value);
  pattern.lastIndex = 0;
  return result;
}

function decodePlannerFragment(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function hasUnsafePlannerFragment(value: string): boolean {
  const decoded = decodePlannerFragment(value);
  return [value, decoded].some(
    (candidate) =>
      trustedRuntimeStateRootPattern.test(candidate) ||
      encodedTrustedRuntimeStateRootPattern.test(candidate) ||
      plannerTokenPathPattern.test(candidate) ||
      matchesPublicPattern(hostPathEchoPattern, candidate) ||
      matchesPublicPattern(posixHostPathEchoPattern, candidate) ||
      matchesPublicPattern(secretEchoPattern, candidate)
  );
}

function publicPlannerToken(value: string, fallback: string): string {
  const sanitized = publicOperatorText(value).trim();
  if (
    !sanitized ||
    !plannerSafeTokenPattern.test(sanitized) ||
    hasUnsafePlannerFragment(value) ||
    hasUnsafePlannerFragment(sanitized)
  ) {
    return fallback;
  }
  return sanitized;
}

function optionalPublicPlannerToken(input: Record<string, unknown>, field: string, fallback: string): string {
  return publicPlannerToken(readString(input, field, { optional: true }) ?? fallback, fallback);
}

function optionalPublicPlannerPath(input: Record<string, unknown>, field: string, fallback: string): string {
  const raw = readString(input, field, { optional: true });
  if (!raw || hasUnsafePlannerFragment(raw)) {
    return fallback;
  }
  const sanitized = publicOperatorText(raw);
  return hasUnsafePlannerFragment(sanitized) ? fallback : sanitized;
}

const serviceOwnedPreparedCheckpointPathPattern =
  /^service-owned-pi-lifecycle\/[A-Za-z0-9_.:-]+\/[A-Za-z0-9_.:-]+\.json$/;
const plannerSha256Pattern = /^[a-f0-9]{64}$/i;

function optionalPublicPreparedCheckpointPath(input: Record<string, unknown>, field: string): string | undefined {
  const raw = readString(input, field, { optional: true });
  if (!raw) {
    return undefined;
  }
  const sanitized = publicOperatorText(raw).trim();
  if (sanitized !== raw.trim() || !serviceOwnedPreparedCheckpointPathPattern.test(sanitized)) {
    return undefined;
  }
  return sanitized;
}

function optionalPublicPreparedCheckpointSha256(input: Record<string, unknown>, field: string): string | undefined {
  const raw = readString(input, field, { optional: true });
  if (!raw) {
    return undefined;
  }
  const sanitized = publicPlannerToken(raw, "");
  return plannerSha256Pattern.test(sanitized) ? sanitized.toLowerCase() : undefined;
}

const PI_LIFECYCLE_PREPARED_UNATTENDED_CHECKPOINTS = [
  ["runtime_probe", "real-Pi runtime probe"],
  ["operator_session", "operator session manifest"],
  ["transport_recovery", "operator transport recovery checkpoint"],
  ["transport_lease", "operator transport lease checkpoint"],
  ["transport_heartbeat", "operator transport heartbeat checkpoint"],
  ["guided_execution", "guided real-Pi execution artifact"],
  ["terminal_review", "terminal execution review"],
  ["transport_contract", "operator/service transport contract"],
  ["automatic_orchestration", "automatic real-Pi orchestration manifest"],
  ["transport_continuity", "operator/service transport continuity checkpoint"]
] as const;

function buildPreparedUnattendedRealPiHandoff(input: Record<string, unknown>): Record<string, unknown> {
  const missing: string[] = [];
  const preparedCheckpoints = PI_LIFECYCLE_PREPARED_UNATTENDED_CHECKPOINTS.map(([checkpointId, label], index) => {
    const pathField = `${checkpointId}_path`;
    const shaField = `${checkpointId}_sha256`;
    const path = optionalPublicPreparedCheckpointPath(input, pathField);
    const sha256 = optionalPublicPreparedCheckpointSha256(input, shaField);
    if (!path) {
      missing.push(pathField);
    }
    if (!sha256) {
      missing.push(shaField);
    }
    return {
      order: index + 1,
      checkpoint_id: checkpointId,
      label,
      path: path ?? "missing_service_owned_checkpoint_path",
      sha256: sha256 ?? "missing_service_owned_checkpoint_hash",
      prepared: path !== undefined && sha256 !== undefined,
      proof_authority: "none",
      can_promote_claim: false,
      can_certify_ga: false,
      service_owned_evidence_created: false,
      handoff_can_execute: false
    };
  });
  const handoffReady = missing.length === 0;
  return {
    schema_version: "comath.pi.lifecycle.prepared_unattended_real_pi_handoff.v1",
    handoff_ready: handoffReady,
    handoff_status: handoffReady ? "prepared_checkpoint_handoff_ready" : "prepared_checkpoint_refs_missing",
    proof_authority: "none",
    can_promote_claim: false,
    can_certify_ga: false,
    durable_transport_provided: false,
    live_transport_open: false,
    indefinite_stream_open: false,
    long_lived_sse_provided: false,
    long_lived_websocket_provided: false,
    pi_direct_write_allowed: false,
    direct_trusted_state_mutation: false,
    missing_prepared_checkpoint_refs: missing,
    prepared_checkpoints: preparedCheckpoints,
    cursors: {
      operator_event_cursor: optionalPublicOperatorText(input, "operator_event_cursor", "not_provided"),
      stdout_cursor: optionalPublicOperatorText(input, "stdout_cursor", "not_provided"),
      stderr_cursor: optionalPublicOperatorText(input, "stderr_cursor", "not_provided")
    },
    last_result_summary: optionalPublicOperatorText(input, "last_result_summary", "not_provided"),
    unattended_policy: {
      pi_tool_readonly: true,
      writes_comath_state: false,
      calls_comathd: false,
      executes_lifecycle_actions: false,
      auto_executes: false,
      service_owned_checkpoint_hashes_required: true,
      host_confirmation_required_for_any_mutation: true,
      unattended_execution_authorized: false,
      unattended_real_host_execution_completed: false,
      operator_confirmation_bypassed: false,
      service_owned_evidence_created: false,
      handoff_can_execute: false,
      proof_authority: "none"
    },
    operator_handoff: {
      status: handoffReady ? "ready_for_operator_review" : "blocked_missing_prepared_checkpoint_refs",
      review_command:
        "/cm:release lifecycle-interactive-real-pi resume-plan " +
        "--completed-step run-real-pi-runtime-probe " +
        "--completed-step lifecycle-operator-session " +
        "--completed-step lifecycle-operator-transport-recovery " +
        "--completed-step lifecycle-operator-transport-lease " +
        "--completed-step lifecycle-operator-transport-heartbeat " +
        "--completed-step lifecycle-guided-real-pi-execution " +
        "--completed-step lifecycle-operator-service-transport-contract " +
        "--completed-step lifecycle-automatic-real-pi-execution " +
        "--completed-step lifecycle-operator-service-transport-continuity",
      requires_host_confirmation_for_mutation: true,
      auto_executes: false,
      proof_authority: "none"
    },
    boundary_notes: [
      "This handoff is a read-only Pi planner view over prepared service-owned checkpoint references.",
      "It does not call comathd, write trusted runtime state, execute lifecycle actions, or open durable transport.",
      "Any later mutation still requires the existing host-confirmed service command."
    ]
  };
}

function recordValue(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function recordArrayValue(value: unknown): Record<string, unknown>[] {
  return Array.isArray(value) ? value.map(recordValue) : [];
}

function stringArrayValue(value: unknown): string[] {
  return Array.isArray(value) ? value.map(String) : [];
}

function buildPreparedHandoffOperatorReviewItem(
  order: number,
  reviewId: string,
  label: string,
  passed: boolean,
  evidence: Record<string, unknown>
): Record<string, unknown> {
  return {
    order,
    review_id: reviewId,
    label,
    passed,
    review_required: true,
    vetoes_release_if_failed: true,
    proof_authority: "none",
    can_promote_claim: false,
    can_certify_ga: false,
    ...evidence
  };
}

function buildPreparedHandoffOperatorReviewChecklist(handoff: Record<string, unknown>): Record<string, unknown> {
  const missingRefs = stringArrayValue(handoff.missing_prepared_checkpoint_refs);
  const preparedCheckpoints = recordArrayValue(handoff.prepared_checkpoints);
  const handoffReady = handoff.handoff_ready === true && missingRefs.length === 0;
  const unattendedPolicy = recordValue(handoff.unattended_policy);
  const operatorHandoff = recordValue(handoff.operator_handoff);
  const preparedCheckpointRefsPresent =
    handoffReady &&
    preparedCheckpoints.length === PI_LIFECYCLE_PREPARED_UNATTENDED_CHECKPOINTS.length &&
    preparedCheckpoints.every((checkpoint) => checkpoint.prepared === true);

  const reviewItems = [
    buildPreparedHandoffOperatorReviewItem(
      1,
      "prepared_checkpoint_refs_present",
      "Prepared service-owned checkpoint refs are supplied",
      preparedCheckpointRefsPresent,
      {
        prepared_checkpoint_count: preparedCheckpoints.filter((checkpoint) => checkpoint.prepared === true).length,
        required_checkpoint_count: PI_LIFECYCLE_PREPARED_UNATTENDED_CHECKPOINTS.length,
        missing_prepared_checkpoint_refs: missingRefs
      }
    ),
    buildPreparedHandoffOperatorReviewItem(2, "pi_planner_readonly", "Pi checklist remains read-only", true, {
      pi_tool_readonly: unattendedPolicy.pi_tool_readonly === true,
      writes_comath_state: false,
      calls_comathd: false
    }),
    buildPreparedHandoffOperatorReviewItem(
      3,
      "host_confirmation_required_for_mutation",
      "Any later mutation still requires host confirmation",
      unattendedPolicy.host_confirmation_required_for_any_mutation === true,
      {
        requires_host_confirmation_for_mutation: true
      }
    ),
    buildPreparedHandoffOperatorReviewItem(
      4,
      "no_automatic_execution",
      "Checklist does not execute lifecycle actions",
      unattendedPolicy.executes_lifecycle_actions === false && unattendedPolicy.auto_executes === false,
      {
        executes_lifecycle_actions: false,
        auto_executes: false,
        operator_handoff_auto_executes: operatorHandoff.auto_executes === false
      }
    ),
    buildPreparedHandoffOperatorReviewItem(
      5,
      "no_service_evidence_creation",
      "Checklist creates no service evidence",
      unattendedPolicy.service_owned_evidence_created === false,
      {
        service_owned_evidence_created: false
      }
    ),
    buildPreparedHandoffOperatorReviewItem(6, "no_proof_or_ga_authority", "Checklist has no proof or GA authority", true, {
      proof_authority: "none",
      can_promote_claim: false,
      can_certify_ga: false
    }),
    buildPreparedHandoffOperatorReviewItem(7, "no_durable_live_transport", "Checklist opens no durable live transport", true, {
      durable_transport_provided: false,
      live_transport_open: false,
      long_lived_sse_provided: false,
      long_lived_websocket_provided: false
    }),
    buildPreparedHandoffOperatorReviewItem(
      8,
      "operator_manual_review_required",
      "Operator must manually review checkpoint refs before any host-confirmed command",
      true,
      {
        operator_present_required: true,
        operator_manual_review_required: true
      }
    )
  ];
  const blockingReviewItems = [
    ...missingRefs.map((field) => `missing_prepared_checkpoint_ref:${field}`),
    ...reviewItems
      .filter((item) => item.passed !== true && item.review_id !== "prepared_checkpoint_refs_present")
      .map((item) => String(item.review_id))
  ];
  const checklistReady = reviewItems.every((item) => item.passed === true);

  return {
    schema_version: "comath.pi.lifecycle.prepared_handoff_operator_review_checklist.v1",
    checklist_ready: checklistReady,
    review_status: checklistReady
      ? "ready_for_operator_checkpoint_review"
      : "blocked_missing_prepared_checkpoint_refs",
    proof_authority: "none",
    can_promote_claim: false,
    can_certify_ga: false,
    durable_transport_provided: false,
    live_transport_open: false,
    long_lived_sse_provided: false,
    long_lived_websocket_provided: false,
    pi_direct_write_allowed: false,
    direct_trusted_state_mutation: false,
    service_owned_evidence_created: false,
    handoff_can_execute: false,
    auto_executes: false,
    calls_comathd: false,
    writes_comath_state: false,
    requires_host_confirmation_for_mutation: true,
    operator_present_required: true,
    operator_manual_review_required: true,
    operator_review_items: reviewItems,
    blocking_review_items: blockingReviewItems,
    operator_next_review_command: String(recordValue(handoff.operator_handoff).review_command ?? "not_available"),
    production_unattended_real_host_ux: {
      operator_present_required: true,
      operator_manual_review_required: true,
      host_confirmation_required_for_any_mutation: true,
      unattended_execution_authorized: false,
      unattended_real_host_execution_completed: false,
      operator_confirmation_bypassed: false,
      service_owned_evidence_created: false,
      handoff_can_execute: false,
      proof_authority: "none"
    },
    boundary_notes: [
      "This checklist is a read-only Pi review view over prepared checkpoint refs.",
      "It validates ref shape and missing fields only, not artifact freshness or service-chain truth.",
      "Host-confirmed service commands remain required for any later mutation."
    ]
  };
}

function readLifecycleWalkthroughSessionKind(input: Record<string, unknown>): typeof PI_LIFECYCLE_WALKTHROUGH_SESSION_KINDS[number] {
  const value = readString(input, "session_kind", { optional: true }) ?? "real_pi_host_manual_install";
  if ((PI_LIFECYCLE_WALKTHROUGH_SESSION_KINDS as readonly string[]).includes(value)) {
    return value as typeof PI_LIFECYCLE_WALKTHROUGH_SESSION_KINDS[number];
  }
  throw new Error("session_kind must be real_pi_host_manual_install or real_pi_host_automated_install");
}

function buildPiCodexLifecycleWalkthrough(input: Record<string, unknown>): Record<string, unknown> {
  const projectId = publicOperatorText(readString(input, "project_id"));
  const actor = publicOperatorText(readString(input, "actor"));
  const piHostLabel = publicOperatorText(readString(input, "pi_host_label"));
  const sessionKind = readLifecycleWalkthroughSessionKind(input);
  const probeId = optionalPublicOperatorText(input, "probe_id", `${projectId}-REAL-PI-RUNTIME`);
  const validationId = optionalPublicOperatorText(input, "validation_id", `${projectId}-CODEX-API`);
  const reviewId = optionalPublicOperatorText(input, "review_id", `${projectId}-LIFECYCLE-REVIEW`);

  return {
    schema_version: "comath.pi.lifecycle.operator_walkthrough.v1",
    project_id: projectId,
    actor,
    pi_host_label: piHostLabel,
    session_kind: sessionKind,
    probe_id: probeId,
    validation_id: validationId,
    review_id: reviewId,
    proof_authority: "none",
    can_promote_claim: false,
    can_certify_ga: false,
    direct_trusted_state_mutation: false,
    service_authority: "comathd_only",
    boundary_notes: [
      "This walkthrough only renders operator steps and command templates.",
      "Lifecycle reports are release-readiness evidence, not GA certification.",
      "Lean4/mathlib kernel replay remains the only mathematical authority."
    ],
    operator_steps: [
      {
        order: 1,
        code: "confirm_real_pi_host",
        title: "Confirm the operator is using a real Pi host session.",
        checks: [
          "Use a real Pi host label; fake Pi or local-only sessions remain blockers.",
          "Keep Codex credentials in service-owned environment or config, never in Pi command text."
        ]
      },
      {
        order: 2,
        code: "collect_real_pi_runtime_probe",
        title: "Collect real-Pi install and runtime-registration evidence.",
        command_subcommand: "real-pi-runtime-probe",
        expected_artifact_kinds: ["pi_install_transcript", "runtime_registration_snapshot"]
      },
      {
        order: 3,
        code: "collect_codex_api_probe",
        title: "Collect production Codex API account and network evidence through service-owned config.",
        command_subcommand: "codex-api-probe",
        expected_artifact_kinds: ["codex_validation_report"]
      },
      {
        order: 4,
        code: "run_lifecycle_review",
        title: "Review the lifecycle evidence with fail-closed non-authority semantics.",
        command_subcommand: "pi-codex-lifecycle",
        expected_artifact_kinds: ["pi_codex_lifecycle_readiness_review"]
      }
    ],
    service_evidence_sources: [
      {
        source: "durable_service_lifecycle_probe",
        service_route: "/release/pi-codex-lifecycle/service-probe",
        ownership: "service_owned_allowlisted_command_config",
        pi_side_action: "Use the resulting durable service lifecycle report as evidence for the lifecycle review."
      }
    ],
    command_templates: [
      {
        order: 1,
        subcommand: "real-pi-runtime-probe",
        command:
          `/cm:release real-pi-runtime-probe --project-id ${projectId} --probe-id ${probeId} ` +
          `--pi-host-label ${piHostLabel} --session-kind ${sessionKind} ` +
          "--install-program <absolute-install-program> --install-arg <operator-install-arg> " +
          "--runtime-registration-program <absolute-runtime-registration-program> " +
          "--runtime-registration-arg <operator-runtime-registration-arg> " +
          "--host-confirmation-program <absolute-host-confirmation-program> " +
          "--host-confirmation-arg <operator-host-confirmation-arg>"
      },
      {
        order: 2,
        subcommand: "codex-api-probe",
        command: `/cm:release codex-api-probe --project-id ${projectId} --validation-id ${validationId}`
      },
      {
        order: 3,
        subcommand: "pi-codex-lifecycle",
        command:
          `/cm:release pi-codex-lifecycle --project-id ${projectId} --review-id ${reviewId} ` +
          `--session-kind ${sessionKind} --pi-host-kind real_pi_host ` +
          "--runtime-entrypoint-imported true --runtime-registered true --host-confirmation-observed true " +
          "--comathd-server-kind durable_service --service-start-observed true --service-stop-observed true " +
          "--service-restart-observed true --installed-cli-validation-ok true " +
          "--installed-cli-probe-source service_owned_process --codex-api-account-network-validation passed"
      }
    ]
  };
}

function readLifecycleControlPlanAction(input: Record<string, unknown>): typeof PI_LIFECYCLE_CONTROL_PLAN_ACTIONS[number] {
  const value = readString(input, "action");
  if ((PI_LIFECYCLE_CONTROL_PLAN_ACTIONS as readonly string[]).includes(value)) {
    return value as typeof PI_LIFECYCLE_CONTROL_PLAN_ACTIONS[number];
  }
  throw new Error("action must be plan or status");
}

function readLifecycleSessionAction(input: Record<string, unknown>): typeof PI_LIFECYCLE_SESSION_ACTIONS[number] {
  const value = readString(input, "action");
  if ((PI_LIFECYCLE_SESSION_ACTIONS as readonly string[]).includes(value)) {
    return value as typeof PI_LIFECYCLE_SESSION_ACTIONS[number];
  }
  throw new Error("action must be plan, status, or resume-plan");
}

function readLifecycleSessionSteps(input: Record<string, unknown>): Array<typeof PI_LIFECYCLE_SESSION_STEP_IDS[number]> {
  const value = input.completed_steps;
  if (value === undefined) {
    return [];
  }
  if (!Array.isArray(value)) {
    throw new Error("completed_steps must be an array");
  }
  const steps = value.map(String);
  const allowed = new Set<string>(PI_LIFECYCLE_SESSION_STEP_IDS);
  for (const step of steps) {
    if (!allowed.has(step)) {
      throw new Error(`unsupported completed lifecycle session step: ${step}`);
    }
  }
  return [...new Set(steps)] as Array<typeof PI_LIFECYCLE_SESSION_STEP_IDS[number]>;
}

function readInteractiveRealPiAction(input: Record<string, unknown>): typeof PI_LIFECYCLE_INTERACTIVE_REAL_PI_ACTIONS[number] {
  const value = readString(input, "action");
  if ((PI_LIFECYCLE_INTERACTIVE_REAL_PI_ACTIONS as readonly string[]).includes(value)) {
    return value as typeof PI_LIFECYCLE_INTERACTIVE_REAL_PI_ACTIONS[number];
  }
  throw new Error("action must be plan, status, resume-plan, unattended-handoff, or operator-review-checklist");
}

function readInteractiveRealPiSteps(input: Record<string, unknown>): Array<typeof PI_LIFECYCLE_INTERACTIVE_REAL_PI_STEPS[number]> {
  const value = input.completed_steps;
  if (value === undefined) {
    return [];
  }
  if (!Array.isArray(value)) {
    throw new Error("completed_steps must be an array");
  }
  const allowed = new Set<string>(PI_LIFECYCLE_INTERACTIVE_REAL_PI_STEPS);
  const steps = value.map(String);
  for (const step of steps) {
    if (!allowed.has(step)) {
      throw new Error(`unsupported interactive real-Pi checkpoint step: ${step}`);
    }
  }
  return [...new Set(steps)] as Array<typeof PI_LIFECYCLE_INTERACTIVE_REAL_PI_STEPS[number]>;
}

function sanitizeLifecycleOperatorSessionArtifacts(value: unknown): Record<string, string>[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.map((artifact) => {
    if (!artifact || typeof artifact !== "object" || Array.isArray(artifact)) {
      throw new Error("operator-session artifact_paths must be objects");
    }
    const record = artifact as Record<string, unknown>;
    return {
      kind: publicOperatorText(readString(record, "kind")),
      path: publicOperatorText(readString(record, "path"))
    };
  });
}

function buildPiCodexLifecycleInteractiveRealPi(input: Record<string, unknown>): Record<string, unknown> {
  const projectId = publicPlannerToken(readString(input, "project_id"), "PROJECT");
  const actor = publicPlannerToken(readString(input, "actor"), "operator");
  const piHostLabel = publicPlannerToken(readString(input, "pi_host_label"), "real-pi-host");
  const sessionId = publicPlannerToken(readString(input, "session_id"), "LIFECYCLE-SESSION");
  const action = readInteractiveRealPiAction(input);
  const sessionKind = readLifecycleWalkthroughSessionKind(input);
  const completedSteps = readInteractiveRealPiSteps(input);
  const completed = new Set<string>(completedSteps);
  const unattendedHandoff = buildPreparedUnattendedRealPiHandoff(input);
  const probeId = optionalPublicPlannerToken(input, "probe_id", `${projectId}-REAL-PI-RUNTIME`);
  const validationId = optionalPublicPlannerToken(input, "validation_id", `${projectId}-CODEX-API`);
  const reviewId = optionalPublicPlannerToken(input, "review_id", `${projectId}-LIFECYCLE-REVIEW`);
  const transportRecoveryId = optionalPublicPlannerToken(
    input,
    "transport_recovery_id",
    `${sessionId}-TRANSPORT-RECOVERY`
  );
  const transportLeaseId = optionalPublicPlannerToken(input, "transport_lease_id", `${sessionId}-TRANSPORT-LEASE`);
  const transportHeartbeatId = optionalPublicPlannerToken(
    input,
    "transport_heartbeat_id",
    `${sessionId}-TRANSPORT-HEARTBEAT`
  );
  const executionId = optionalPublicPlannerToken(input, "execution_id", `${sessionId}-GUIDED-EXECUTION`);
  const terminalReviewId = optionalPublicPlannerToken(input, "terminal_review_id", `${sessionId}-TERMINAL-REVIEW`);
  const transportContractId = optionalPublicPlannerToken(
    input,
    "transport_contract_id",
    `${sessionId}-TRANSPORT-CONTRACT`
  );
  const transportContractPath = optionalPublicPlannerPath(
    input,
    "transport_contract_path",
    `service-owned-pi-lifecycle/${transportContractId}/operator-service-transport-contract.json`
  );
  const transportContractSha256 = optionalPublicPlannerToken(input, "transport_contract_sha256", "CONTRACT-SHA256");
  const orchestrationId = optionalPublicPlannerToken(
    input,
    "orchestration_id",
    `${sessionId}-AUTOMATIC-REAL-PI`
  );
  const handoffReviewId = optionalPublicPlannerToken(input, "handoff_review_id", `${sessionId}-HANDOFF-REVIEW`);
  const approvalId = optionalPublicPlannerToken(input, "approval_id", `${sessionId}-OPERATOR-APPROVAL`);
  const readinessId = optionalPublicPlannerToken(
    input,
    "readiness_id",
    `${sessionId}-EXECUTION-READINESS`
  );
  const continuityId = optionalPublicPlannerToken(
    input,
    "continuity_id",
    `${sessionId}-TRANSPORT-CONTINUITY`
  );
  const automaticOrchestrationPath = optionalPublicPlannerPath(
    input,
    "automatic_orchestration_path",
    `service-owned-pi-lifecycle/${orchestrationId}/automatic-real-pi-execution.json`
  );
  const automaticOrchestrationSha256 = optionalPublicPlannerToken(
    input,
    "automatic_orchestration_sha256",
    "AUTOMATIC-ORCHESTRATION-SHA256"
  );
  const transportContinuityPath = optionalPublicPlannerPath(
    input,
    "transport_continuity_path",
    `service-owned-pi-lifecycle/${continuityId}/operator-service-transport-continuity.json`
  );
  const transportContinuitySha256 = optionalPublicPlannerToken(
    input,
    "transport_continuity_sha256",
    "TRANSPORT-CONTINUITY-SHA256"
  );
  const handoffReviewPath = optionalPublicPlannerPath(
    input,
    "handoff_review_path",
    `service-owned-pi-lifecycle/${handoffReviewId}/unattended-real-host-handoff-review.json`
  );
  const handoffReviewSha256 = optionalPublicPlannerToken(input, "handoff_review_sha256", "HANDOFF-REVIEW-SHA256");
  const approvalPath = optionalPublicPlannerPath(
    input,
    "approval_path",
    `service-owned-pi-lifecycle/${approvalId}/unattended-real-host-operator-approval.json`
  );
  const approvalSha256 = optionalPublicPlannerToken(input, "approval_sha256", "OPERATOR-APPROVAL-SHA256");
  const sessionManifestPath = optionalPublicPlannerPath(
    input,
    "session_manifest_path",
    `service-owned-pi-lifecycle/${sessionId}/operator-session-manifest.json`
  );
  const transportRecoveryPath = optionalPublicPlannerPath(
    input,
    "transport_recovery_path",
    `service-owned-pi-lifecycle/${transportRecoveryId}/operator-transport-recovery.json`
  );
  const transportLeasePath = optionalPublicPlannerPath(
    input,
    "transport_lease_path",
    `service-owned-pi-lifecycle/${transportLeaseId}/operator-transport-lease.json`
  );
  const piInstallTranscriptPath = optionalPublicPlannerPath(
    input,
    "pi_install_transcript_path",
    `service-owned-pi-lifecycle/${probeId}/pi-install-transcript.md`
  );
  const runtimeRegistrationSnapshotPath = optionalPublicPlannerPath(
    input,
    "runtime_registration_snapshot_path",
    `service-owned-pi-lifecycle/${probeId}/runtime-registration-snapshot.json`
  );
  const terminalReviewPath = optionalPublicPlannerPath(
    input,
    "terminal_review_path",
    `service-owned-pi-lifecycle/${terminalReviewId}/terminal-execution-review.json`
  );

  const commandByStep: Record<typeof PI_LIFECYCLE_INTERACTIVE_REAL_PI_STEPS[number], string> = {
    "run-real-pi-runtime-probe":
      `/cm:release lifecycle-control run-real-pi-runtime-probe --project-id ${projectId} --probe-id ${probeId} ` +
      `--pi-host-label ${piHostLabel} --session-kind ${sessionKind}`,
    "lifecycle-operator-session":
      `/cm:release lifecycle-operator-session --project-id ${projectId} --session-id ${sessionId} ` +
      `--pi-host-label ${piHostLabel} --session-status recoverable_operator_session --session-kind ${sessionKind}`,
    "lifecycle-operator-transport-recovery":
      `/cm:release lifecycle-operator-transport-recovery --project-id ${projectId} --session-id ${sessionId} ` +
      `--transport-recovery-id ${transportRecoveryId} --session-manifest-path ${sessionManifestPath}`,
    "lifecycle-operator-transport-lease":
      `/cm:release lifecycle-operator-transport-lease --project-id ${projectId} --session-id ${sessionId} ` +
      `--transport-recovery-id ${transportRecoveryId} --transport-lease-id ${transportLeaseId} ` +
      `--session-manifest-path ${sessionManifestPath} --transport-recovery-path ${transportRecoveryPath}`,
    "lifecycle-operator-transport-heartbeat":
      `/cm:release lifecycle-operator-transport-heartbeat --project-id ${projectId} --session-id ${sessionId} ` +
      `--transport-recovery-id ${transportRecoveryId} --transport-lease-id ${transportLeaseId} ` +
      `--transport-heartbeat-id ${transportHeartbeatId} --session-manifest-path ${sessionManifestPath} ` +
      `--transport-recovery-path ${transportRecoveryPath} --transport-lease-path ${transportLeasePath}`,
    "lifecycle-guided-real-pi-execution":
      `/cm:release lifecycle-guided-real-pi-execution --project-id ${projectId} --execution-id ${executionId} ` +
      `--real-pi-runtime-probe-id ${probeId} --pi-install-transcript-path ${piInstallTranscriptPath} ` +
      `--runtime-registration-snapshot-path ${runtimeRegistrationSnapshotPath} --session-id ${sessionId} ` +
      `--session-manifest-path ${sessionManifestPath} --transport-recovery-id ${transportRecoveryId} ` +
      `--transport-recovery-path ${transportRecoveryPath} --transport-lease-id ${transportLeaseId} ` +
      `--transport-lease-path ${transportLeasePath} --pi-host-label ${piHostLabel}`,
    "lifecycle-operator-service-transport-contract":
      `/cm:release lifecycle-operator-service-transport-contract --project-id ${projectId} ` +
      `--transport-contract-id ${transportContractId} --terminal-review-id ${terminalReviewId} ` +
      `--terminal-review-path ${terminalReviewPath}`,
    "lifecycle-automatic-real-pi-execution":
      `/cm:release lifecycle-automatic-real-pi-execution --project-id ${projectId} ` +
      `--orchestration-id ${orchestrationId} --runtime-probe-json '<runtime-probe-json>' ` +
      `--operator-session-json '<operator-session-json>' --transport-recovery-json '<transport-recovery-json>' ` +
      `--transport-lease-json '<transport-lease-json>' --transport-heartbeat-json '<transport-heartbeat-json>' ` +
      `--guided-execution-json '<guided-execution-json>' --terminal-review-json '<terminal-review-json>' ` +
      `--transport-contract-json '<transport-contract-json>'`,
    "lifecycle-operator-service-transport-continuity":
      `/cm:release lifecycle-operator-service-transport-continuity --project-id ${projectId} ` +
      `--continuity-id ${continuityId} --transport-contract-id ${transportContractId} ` +
      `--transport-contract-path ${transportContractPath} --transport-contract-sha256 ${transportContractSha256}`,
    "lifecycle-unattended-real-host-handoff-review":
      `/cm:release lifecycle-unattended-real-host-handoff-review --project-id ${projectId} ` +
      `--handoff-review-id ${handoffReviewId} --automatic-orchestration-id ${orchestrationId} ` +
      `--automatic-orchestration-path ${automaticOrchestrationPath} ` +
      `--automatic-orchestration-sha256 ${automaticOrchestrationSha256} ` +
      `--transport-continuity-id ${continuityId} --transport-continuity-path ${transportContinuityPath} ` +
      `--transport-continuity-sha256 ${transportContinuitySha256}`,
    "lifecycle-unattended-real-host-operator-approval":
      `/cm:release lifecycle-unattended-real-host-operator-approval --project-id ${projectId} ` +
      `--approval-id ${approvalId} --handoff-review-id ${handoffReviewId} ` +
      `--handoff-review-path ${handoffReviewPath} --handoff-review-sha256 ${handoffReviewSha256}`,
    "lifecycle-unattended-real-host-execution-readiness":
      `/cm:release lifecycle-unattended-real-host-execution-readiness --project-id ${projectId} ` +
      `--readiness-id ${readinessId} --handoff-review-id ${handoffReviewId} ` +
      `--handoff-review-path ${handoffReviewPath} --handoff-review-sha256 ${handoffReviewSha256} ` +
      `--operator-approval-id ${approvalId} --operator-approval-path ${approvalPath} ` +
      `--operator-approval-sha256 ${approvalSha256}`,
    "run-codex-api-probe":
      `/cm:release lifecycle-control run-codex-api-probe --project-id ${projectId} --validation-id ${validationId}`,
    review: `/cm:release lifecycle-control review --project-id ${projectId} --review-id ${reviewId}`
  };
  const nextStep =
    PI_LIFECYCLE_INTERACTIVE_REAL_PI_STEPS.find((step) => !completed.has(step)) ??
    PI_LIFECYCLE_INTERACTIVE_REAL_PI_STEPS[PI_LIFECYCLE_INTERACTIVE_REAL_PI_STEPS.length - 1];

  return {
    schema_version: "comath.pi.lifecycle.interactive_real_pi_checkpoint_ux.v1",
    project_id: projectId,
    actor,
    pi_host_label: piHostLabel,
    session_id: sessionId,
    action,
    session_kind: sessionKind,
    proof_authority: "none",
    can_promote_claim: false,
    can_certify_ga: false,
    direct_trusted_state_mutation: false,
    durable_transport_provided: false,
    long_lived_sse_provided: false,
    long_lived_websocket_provided: false,
    interactive_policy: {
      pi_tool_readonly: true,
      writes_comath_state: false,
      calls_comathd: false,
      executes_lifecycle_actions: false,
      mutating_steps_require_host_confirmation: true
    },
    unattended_handoff: unattendedHandoff,
    operator_review_checklist: buildPreparedHandoffOperatorReviewChecklist(unattendedHandoff),
    checkpoint_inputs: {
      probe_id: probeId,
      validation_id: validationId,
      review_id: reviewId,
      session_manifest_path: sessionManifestPath,
      transport_recovery_id: transportRecoveryId,
      transport_recovery_path: transportRecoveryPath,
      transport_lease_id: transportLeaseId,
      transport_lease_path: transportLeasePath,
      transport_heartbeat_id: transportHeartbeatId,
      execution_id: executionId,
      terminal_review_id: terminalReviewId,
      terminal_review_path: terminalReviewPath,
      transport_contract_id: transportContractId,
      transport_contract_path: transportContractPath,
      transport_contract_sha256: transportContractSha256,
      orchestration_id: orchestrationId,
      handoff_review_id: handoffReviewId,
      readiness_id: readinessId,
      automatic_orchestration_path: automaticOrchestrationPath,
      automatic_orchestration_sha256: automaticOrchestrationSha256,
      continuity_id: continuityId,
      transport_continuity_path: transportContinuityPath,
      transport_continuity_sha256: transportContinuitySha256,
      handoff_review_path: handoffReviewPath,
      handoff_review_sha256: handoffReviewSha256,
      pi_install_transcript_path: piInstallTranscriptPath,
      runtime_registration_snapshot_path: runtimeRegistrationSnapshotPath
    },
    cursors: {
      operator_event_cursor: optionalPublicOperatorText(input, "operator_event_cursor", "not_provided"),
      stdout_cursor: optionalPublicOperatorText(input, "stdout_cursor", "not_provided"),
      stderr_cursor: optionalPublicOperatorText(input, "stderr_cursor", "not_provided")
    },
    last_result_summary: optionalPublicOperatorText(input, "last_result_summary", "not_provided"),
    completed_steps: completedSteps,
    ordered_steps: PI_LIFECYCLE_INTERACTIVE_REAL_PI_STEPS.map((step, index) => ({
      order: index + 1,
      action_id: step,
      command: publicOperatorText(commandByStep[step]),
      requires_host_confirmation: true,
      auto_executes: false,
      proof_authority: "none"
    })),
    next_action: {
      action_id: nextStep,
      command: publicOperatorText(commandByStep[nextStep]),
      requires_host_confirmation: true,
      auto_executes: false,
      proof_authority: "none"
    },
    boundary_notes: [
      "This Pi UX surface is a read-only checkpoint planner.",
      "It does not call comathd, write trusted runtime state, execute lifecycle actions, or open durable transport.",
      "Host-confirmed lifecycle commands remain the only way to produce service-owned evidence."
    ]
  };
}

function buildPiCodexLifecycleSession(input: Record<string, unknown>): Record<string, unknown> {
  const projectId = publicOperatorText(readString(input, "project_id"));
  const actor = publicOperatorText(readString(input, "actor"));
  const piHostLabel = publicOperatorText(readString(input, "pi_host_label"));
  const sessionId = publicOperatorText(readString(input, "session_id"));
  const action = readLifecycleSessionAction(input);
  const sessionKind = readLifecycleWalkthroughSessionKind(input);
  const probeId = optionalPublicOperatorText(input, "probe_id", `${projectId}-REAL-PI-RUNTIME`);
  const validationId = optionalPublicOperatorText(input, "validation_id", `${projectId}-CODEX-API`);
  const reviewId = optionalPublicOperatorText(input, "review_id", `${projectId}-LIFECYCLE-REVIEW`);
  const completedSteps = readLifecycleSessionSteps(input);
  const completed = new Set<string>(completedSteps);
  const nextStep =
    PI_LIFECYCLE_SESSION_STEP_IDS.find((step) => !completed.has(step)) ??
    PI_LIFECYCLE_SESSION_STEP_IDS[PI_LIFECYCLE_SESSION_STEP_IDS.length - 1];
  const walkthrough = buildPiCodexLifecycleWalkthrough({
    project_id: projectId,
    actor,
    pi_host_label: piHostLabel,
    session_kind: sessionKind,
    probe_id: probeId,
    validation_id: validationId,
    review_id: reviewId
  });
  const control = buildPiCodexLifecycleControl({
    project_id: projectId,
    actor,
    pi_host_label: piHostLabel,
    action: "plan",
    session_kind: sessionKind,
    probe_id: probeId,
    validation_id: validationId,
    review_id: reviewId
  });
  const commandTemplates = new Map(
    (walkthrough.command_templates as Array<Record<string, unknown>>).map((template) => [
      String(template.subcommand),
      String(template.command)
    ])
  );
  const controlActions = new Map(
    (control.control_actions as Array<Record<string, unknown>>).map((controlAction) => [
      String(controlAction.action_id),
      controlAction
    ])
  );
  const nextCommandByAction: Record<typeof PI_LIFECYCLE_SESSION_STEP_IDS[number], string> = {
    "run-real-pi-runtime-probe":
      commandTemplates
        .get("real-pi-runtime-probe")
        ?.replace("/cm:release real-pi-runtime-probe", "/cm:release lifecycle-control run-real-pi-runtime-probe") ??
      `/cm:release lifecycle-control run-real-pi-runtime-probe --project-id ${projectId}`,
    "run-codex-api-probe":
      `/cm:release lifecycle-control run-codex-api-probe --project-id ${projectId} --validation-id ${validationId}`,
    review:
      commandTemplates.get("pi-codex-lifecycle")?.replace("/cm:release pi-codex-lifecycle", "/cm:release lifecycle-control review") ??
      `/cm:release lifecycle-control review --project-id ${projectId} --review-id ${reviewId}`
  };
  const nextControlAction = controlActions.get(nextStep);

  return {
    schema_version: "comath.pi.lifecycle.operator_session.v1",
    project_id: projectId,
    actor,
    pi_host_label: piHostLabel,
    session_id: sessionId,
    action,
    session_kind: sessionKind,
    probe_id: probeId,
    validation_id: validationId,
    review_id: reviewId,
    proof_authority: "none",
    can_promote_claim: false,
    can_certify_ga: false,
    direct_trusted_state_mutation: false,
    service_authority: "comathd_only",
    session_recovery_policy: {
      pi_tool_readonly: true,
      writes_comath_state: false,
      calls_comathd: false,
      long_lived_transport_claimed: false,
      executes_lifecycle_actions: false,
      executing_actions_requires_lifecycle_control_confirmation: true
    },
    cursors: {
      stdout_cursor: optionalPublicOperatorText(input, "stdout_cursor", "not_provided"),
      stderr_cursor: optionalPublicOperatorText(input, "stderr_cursor", "not_provided")
    },
    completed_steps: completedSteps,
    current_step: optionalPublicOperatorText(input, "current_step", nextStep),
    last_result_summary: optionalPublicOperatorText(input, "last_result_summary", "not_provided"),
    recovery_plan: {
      next_action: {
        action_id: nextStep,
        label: publicOperatorText(String(nextControlAction?.label ?? nextStep)),
        command: publicOperatorText(nextCommandByAction[nextStep]),
        requires_host_confirmation: true,
        auto_executes: false
      },
      command_templates: publicOperatorText(JSON.stringify(walkthrough.command_templates)),
      boundary_notes: [
        "This session object is local Pi recovery guidance, not a durable service session.",
        "It does not open an indefinite WebSocket, SSE stream, or terminal transport.",
        "Use lifecycle-control to execute any lifecycle action through Pi host confirmation."
      ]
    }
  };
}

function buildPiCodexLifecycleControl(input: Record<string, unknown>): Record<string, unknown> {
  const projectId = publicOperatorText(readString(input, "project_id"));
  const actor = publicOperatorText(readString(input, "actor"));
  const piHostLabel = publicOperatorText(readString(input, "pi_host_label"));
  const action = readLifecycleControlPlanAction(input);
  const sessionKind = readLifecycleWalkthroughSessionKind(input);
  const probeId = optionalPublicOperatorText(input, "probe_id", `${projectId}-REAL-PI-RUNTIME`);
  const validationId = optionalPublicOperatorText(input, "validation_id", `${projectId}-CODEX-API`);
  const reviewId = optionalPublicOperatorText(input, "review_id", `${projectId}-LIFECYCLE-REVIEW`);
  const walkthrough = buildPiCodexLifecycleWalkthrough({
    project_id: projectId,
    actor,
    pi_host_label: piHostLabel,
    session_kind: sessionKind,
    probe_id: probeId,
    validation_id: validationId,
    review_id: reviewId
  });

  return {
    schema_version: "comath.pi.lifecycle.operator_control.v1",
    project_id: projectId,
    actor,
    pi_host_label: piHostLabel,
    action,
    session_kind: sessionKind,
    proof_authority: "none",
    can_promote_claim: false,
    can_certify_ga: false,
    direct_trusted_state_mutation: false,
    service_authority: "comathd_only",
    control_policy: {
      plan_status_readonly: true,
      executing_actions_requires_pi_host_confirmation: true,
      trusted_state_owner: "comathd"
    },
    control_actions: [
      {
        action_id: "run-real-pi-runtime-probe",
        label: "Run real Pi runtime probe",
        command_subcommand: "lifecycle-control run-real-pi-runtime-probe",
        requires_host_confirmation: true,
        forwards_to_tool: "comath.release.piRealPiRuntimeProbe",
        expected_inputs: ["project_id", "probe_id", "pi_host_label", "session_kind", "install/runtime/confirmation commands"]
      },
      {
        action_id: "run-codex-api-probe",
        label: "Run Codex API probe",
        command_subcommand: "lifecycle-control run-codex-api-probe",
        requires_host_confirmation: true,
        forwards_to_tool: "comath.release.piCodexApiProbe",
        expected_inputs: ["project_id", "validation_id"]
      },
      {
        action_id: "review",
        label: "Review Pi/Codex lifecycle evidence",
        command_subcommand: "lifecycle-control review",
        requires_host_confirmation: true,
        forwards_to_tool: "comath.release.piCodexLifecycleReview",
        expected_inputs: ["project_id", "review_id", "install_session_evidence", "codex_evidence"]
      }
    ],
    walkthrough_summary: {
      schema_version: walkthrough.schema_version,
      probe_id: walkthrough.probe_id,
      validation_id: walkthrough.validation_id,
      review_id: walkthrough.review_id,
      command_templates: walkthrough.command_templates
    }
  };
}

export async function executeComathTool(client: ComathClient, name: string, input: Record<string, unknown>): Promise<any> {
  requireToolExecutionConfirmation(name, input);

  if (name === "comath.project.open") {
    return client.post("/project/open", {
      root_path: readString(input, "root_path")
    });
  }

  if (name === "comath.claim.register") {
    return client.post("/claim/register", {
      project_root: readString(input, "project_root"),
      project_id: readString(input, "project_id"),
      statement: readString(input, "statement"),
      assumptions: Array.isArray(input.assumptions) ? input.assumptions.map(String) : [],
      domain: readString(input, "domain"),
      actor: readString(input, "actor", { optional: true })
    });
  }

  if (name === "comath.claim.get") {
    const projectRoot = readString(input, "project_root");
    const projectId = readString(input, "project_id");
    const claimId = readString(input, "claim_id");
    return client.get(
      `/claim/get?project_root=${encodeQuery(projectRoot)}&project_id=${encodeQuery(projectId)}&claim_id=${encodeQuery(claimId)}`
    );
  }

  if (name === "comath.claim.requestPromotion") {
    return client.post("/claim/promote", {
      project_root: readString(input, "project_root"),
      project_id: readString(input, "project_id"),
      claim_id: readString(input, "claim_id"),
      target_status: readString(input, "target_status"),
      evidence_ids: Array.isArray(input.evidence_ids) ? input.evidence_ids.map(String) : [],
      artifact_ids: Array.isArray(input.artifact_ids) ? input.artifact_ids.map(String) : [],
      actor: readString(input, "actor", { optional: true })
    });
  }

  if (name === "comath.graph.proposePatch") {
    return client.post("/graph-patch/propose", {
      project_root: readString(input, "project_root"),
      project_id: readString(input, "project_id"),
      workstream_id: readString(input, "workstream_id"),
      source_workstream_id: readString(input, "source_workstream_id", { optional: true }),
      new_nodes: Array.isArray(input.new_nodes) ? input.new_nodes : [],
      new_edges: Array.isArray(input.new_edges) ? input.new_edges : [],
      updated_nodes: Array.isArray(input.updated_nodes) ? input.updated_nodes : undefined,
      candidate_conflicts: Array.isArray(input.candidate_conflicts) ? input.candidate_conflicts : undefined,
      warnings: Array.isArray(input.warnings) ? input.warnings.map(String) : undefined,
      actor: readString(input, "actor", { optional: true })
    });
  }

  if (name === "comath.research.startCampaign") {
    const mode = readString(input, "mode", { optional: true });
    const paperPaths = Array.isArray(input.paper_paths) ? input.paper_paths.map(String) : undefined;
    const attachments = Array.isArray(input.attachments) ? input.attachments.map(String) : undefined;
    const workspaceRefs = Array.isArray(input.workspace_refs) ? input.workspace_refs.map(String) : undefined;
    const budget = readString(input, "budget", { optional: true });
    return client.post("/campaign/start", {
      project_root: readString(input, "project_root"),
      project_name: readString(input, "project_name", { optional: true }),
      user_goal: readString(input, "user_goal"),
      domain: readString(input, "domain", { optional: true }),
      strict_mode: input.strict_mode === undefined ? true : input.strict_mode === true,
      actor: readString(input, "actor"),
      ...(mode === undefined ? {} : { mode }),
      ...(paperPaths === undefined ? {} : { paper_paths: paperPaths }),
      ...(attachments === undefined ? {} : { attachments }),
      ...(workspaceRefs === undefined ? {} : { workspace_refs: workspaceRefs }),
      ...(budget === undefined ? {} : { budget })
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
      mode: (readString(input, "mode", { optional: true }) as "goal" | "bounded" | undefined) ?? "goal",
      paper_paths: Array.isArray(input.paper_paths) ? input.paper_paths.map(String) : [],
      attachments: Array.isArray(input.attachments) ? input.attachments.map(String) : [],
      workspace_refs: Array.isArray(input.workspace_refs) ? input.workspace_refs.map(String) : [],
      budget: readString(input, "budget", { optional: true }),
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

  if (name === "comath.campaign.resume") {
    const campaignId = readString(input, "campaign_id");
    return client.post(campaignPath(campaignId, "/resume"), {
      project_root: readString(input, "project_root"),
      actor: readString(input, "actor")
    });
  }

  if (name === "comath.campaign.cancel") {
    const campaignId = readString(input, "campaign_id");
    return client.post(campaignPath(campaignId, "/cancel"), {
      project_root: readString(input, "project_root"),
      actor: readString(input, "actor")
    });
  }

  if (name === "comath.campaign.export") {
    const projectRoot = readString(input, "project_root");
    const campaignId = readString(input, "campaign_id");
    return publicToolResult(name, client.get(`${campaignPath(campaignId, "/export")}?project_root=${encodeQuery(projectRoot)}`));
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
    return publicToolResult(
      name,
      client.post(campaignPath(campaignId, "/replay"), {
        project_root: readString(input, "project_root"),
        actor: readString(input, "actor")
      })
    );
  }

  if (name === "comath.agent.profileList") {
    const globalRpm = readNumber(input, "global_rpm") ?? 4;
    return client.get(`/agent/profile/list?global_rpm=${encodeURIComponent(String(globalRpm))}`);
  }

  if (name === "comath.agent.profileGet") {
    return client.get(agentProfilePath(readString(input, "profile_id")));
  }

  if (name === "comath.agent.runForProfile") {
    return client.post("/agent/run/profile", {
      project_root: readString(input, "project_root"),
      project_id: readString(input, "project_id"),
      campaign_id: readString(input, "campaign_id", { optional: true }),
      workstream_id: readString(input, "workstream_id"),
      profile_id: readString(input, "profile_id"),
      actor: readString(input, "actor")
    });
  }

  if (name === "comath.agent.prepareLaunch") {
    return client.post("/agent/run/profile/prepare-launch", {
      project_root: readString(input, "project_root"),
      project_id: readString(input, "project_id"),
      run_id: readString(input, "run_id"),
      profile_id: readString(input, "profile_id"),
      program: readString(input, "program"),
      goal: readString(input, "goal"),
      context_path: readString(input, "context_path"),
      actor: readString(input, "actor")
    });
  }

  if (name === "comath.agent.executeProfile") {
    return client.post("/agent/run/profile/execute", {
      project_root: readString(input, "project_root"),
      project_id: readString(input, "project_id"),
      campaign_id: readString(input, "campaign_id", { optional: true }),
      workstream_id: readString(input, "workstream_id"),
      profile_id: readString(input, "profile_id"),
      program: readString(input, "program"),
      adapter_args: Array.isArray(input.adapter_args) ? input.adapter_args.map(String) : undefined,
      goal: readString(input, "goal"),
      context_path: readString(input, "context_path"),
      actor: readString(input, "actor")
    });
  }

  if (name === "comath.agent.logs") {
    const projectRoot = readString(input, "project_root");
    const projectId = readString(input, "project_id");
    const runId = readString(input, "run_id");
    const maxBytes = readNumber(input, "max_bytes");
    const maxBytesQuery = maxBytes === undefined ? "" : `&max_bytes=${encodeURIComponent(String(maxBytes))}`;
    return client.get(
      `/agent/run/${encodeURIComponent(runId)}/logs?project_root=${encodeQuery(projectRoot)}&project_id=${encodeQuery(projectId)}${maxBytesQuery}`
    );
  }

  if (name === "comath.agent.streamLogs") {
    const projectRoot = readString(input, "project_root");
    const projectId = readString(input, "project_id");
    const runId = readString(input, "run_id");
    const stdoutCursor = readNumber(input, "stdout_cursor") ?? 0;
    const stderrCursor = readNumber(input, "stderr_cursor") ?? 0;
    const maxBytes = readNumber(input, "max_bytes");
    const actor = readString(input, "actor", { optional: true });
    const maxBytesQuery = maxBytes === undefined ? "" : `&max_bytes=${encodeURIComponent(String(maxBytes))}`;
    const actorQuery = actor === undefined ? "" : `&actor=${encodeQuery(actor)}`;
    return client.get(
      `/agent/run/${encodeURIComponent(runId)}/log-stream?project_root=${encodeQuery(projectRoot)}&project_id=${encodeQuery(projectId)}&stdout_cursor=${encodeURIComponent(String(stdoutCursor))}&stderr_cursor=${encodeURIComponent(String(stderrCursor))}${maxBytesQuery}${actorQuery}`
    );
  }

  if (name === "comath.agent.subscribeLogs") {
    const projectRoot = readString(input, "project_root");
    const projectId = readString(input, "project_id");
    const runId = readString(input, "run_id");
    const stdoutCursor = readNumber(input, "stdout_cursor") ?? 0;
    const stderrCursor = readNumber(input, "stderr_cursor") ?? 0;
    const maxBytes = readNumber(input, "max_bytes");
    const retryMs = readNumber(input, "retry_ms");
    const actor = readString(input, "actor", { optional: true });
    const maxBytesQuery = maxBytes === undefined ? "" : `&max_bytes=${encodeURIComponent(String(maxBytes))}`;
    const retryQuery = retryMs === undefined ? "" : `&retry_ms=${encodeURIComponent(String(retryMs))}`;
    const actorQuery = actor === undefined ? "" : `&actor=${encodeQuery(actor)}`;
    return client.getText(
      `/agent/run/${encodeURIComponent(runId)}/log-subscription?project_root=${encodeQuery(projectRoot)}&project_id=${encodeQuery(projectId)}&stdout_cursor=${encodeURIComponent(String(stdoutCursor))}&stderr_cursor=${encodeURIComponent(String(stderrCursor))}${maxBytesQuery}${retryQuery}${actorQuery}`
    );
  }

  if (name === "comath.agent.logSession") {
    const projectRoot = readString(input, "project_root");
    const projectId = readString(input, "project_id");
    const runId = readString(input, "run_id");
    const stdoutCursor = readNumber(input, "stdout_cursor") ?? 0;
    const stderrCursor = readNumber(input, "stderr_cursor") ?? 0;
    const maxBytes = readNumber(input, "max_bytes");
    const maxEvents = readNumber(input, "max_events");
    const retryMs = readNumber(input, "retry_ms");
    const actor = readString(input, "actor", { optional: true });
    const maxBytesQuery = maxBytes === undefined ? "" : `&max_bytes=${encodeURIComponent(String(maxBytes))}`;
    const maxEventsQuery = maxEvents === undefined ? "" : `&max_events=${encodeURIComponent(String(maxEvents))}`;
    const retryQuery = retryMs === undefined ? "" : `&retry_ms=${encodeURIComponent(String(retryMs))}`;
    const actorQuery = actor === undefined ? "" : `&actor=${encodeQuery(actor)}`;
    return client.getText(
      `/agent/run/${encodeURIComponent(runId)}/log-session?project_root=${encodeQuery(projectRoot)}&project_id=${encodeQuery(projectId)}&stdout_cursor=${encodeURIComponent(String(stdoutCursor))}&stderr_cursor=${encodeURIComponent(String(stderrCursor))}${maxBytesQuery}${maxEventsQuery}${retryQuery}${actorQuery}`
    );
  }

  if (name === "comath.agent.operatorPanel") {
    const projectRoot = readString(input, "project_root");
    const projectId = readString(input, "project_id");
    const runId = readString(input, "run_id");
    const stdoutCursor = readNumber(input, "stdout_cursor") ?? 0;
    const stderrCursor = readNumber(input, "stderr_cursor") ?? 0;
    const maxBytes = readNumber(input, "max_bytes");
    const actor = readString(input, "actor", { optional: true });
    const maxBytesQuery = maxBytes === undefined ? "" : `&max_bytes=${encodeURIComponent(String(maxBytes))}`;
    const actorQuery = actor === undefined ? "" : `&actor=${encodeQuery(actor)}`;
    return client.get(
      `/agent/run/${encodeURIComponent(runId)}/operator-panel?project_root=${encodeQuery(projectRoot)}&project_id=${encodeQuery(projectId)}&stdout_cursor=${encodeURIComponent(String(stdoutCursor))}&stderr_cursor=${encodeURIComponent(String(stderrCursor))}${maxBytesQuery}${actorQuery}`
    );
  }

  if (name === "comath.agent.cancelRun") {
    const runId = readString(input, "run_id");
    return client.post(`/agent/run/${encodeURIComponent(runId)}/cancel`, {
      project_root: readString(input, "project_root"),
      project_id: readString(input, "project_id"),
      actor: readString(input, "actor")
    });
  }

  if (name === "comath.agent.health") {
    const timeoutMs = readNumber(input, "timeout_ms");
    return client.post("/agent/adapter/health", {
      project_root: readString(input, "project_root"),
      project_id: readString(input, "project_id"),
      profile_id: readString(input, "profile_id"),
      program: readString(input, "program"),
      adapter_args: Array.isArray(input.adapter_args) ? input.adapter_args.map(String) : undefined,
      ...(timeoutMs === undefined ? {} : { timeout_ms: timeoutMs }),
      actor: readString(input, "actor")
    });
  }

  if (name === "comath.agent.adapterPackageList") {
    return client.get("/agent/adapter/package/list");
  }

  if (name === "comath.agent.prepareAdapterPackage") {
    return client.post("/agent/adapter/package/prepare-launch", {
      project_root: readString(input, "project_root"),
      project_id: readString(input, "project_id"),
      run_id: readString(input, "run_id"),
      profile_id: readString(input, "profile_id"),
      adapter_id: readString(input, "adapter_id"),
      ...(readString(input, "backend", { optional: true }) === undefined
        ? {}
        : { backend: readString(input, "backend", { optional: true }) }),
      goal: readString(input, "goal"),
      context_path: readString(input, "context_path"),
      actor: readString(input, "actor")
    });
  }

  if (name === "comath.agent.executeAdapterPackage") {
    return client.post("/agent/adapter/package/execute", {
      project_root: readString(input, "project_root"),
      project_id: readString(input, "project_id"),
      campaign_id: readString(input, "campaign_id", { optional: true }),
      workstream_id: readString(input, "workstream_id"),
      profile_id: readString(input, "profile_id"),
      adapter_id: readString(input, "adapter_id"),
      ...(readString(input, "backend", { optional: true }) === undefined
        ? {}
        : { backend: readString(input, "backend", { optional: true }) }),
      goal: readString(input, "goal"),
      context_path: readString(input, "context_path"),
      actor: readString(input, "actor")
    });
  }

  if (name === "comath.paper.init") {
    return client.post("/paper/init", {
      project_root: readString(input, "project_root"),
      project_id: readString(input, "project_id"),
      title: readString(input, "title", { optional: true }),
      actor: readString(input, "actor")
    });
  }

  if (name === "comath.paper.state") {
    const projectRoot = readString(input, "project_root");
    const projectId = readString(input, "project_id");
    return client.get(`/paper/state?project_root=${encodeQuery(projectRoot)}&project_id=${encodeQuery(projectId)}`);
  }

  if (name === "comath.paper.updateSection") {
    return client.post("/paper/update-section", {
      project_root: readString(input, "project_root"),
      project_id: readString(input, "project_id"),
      section_id: readString(input, "section_id"),
      title: readString(input, "title"),
      markdown: readString(input, "markdown"),
      actor: readString(input, "actor")
    });
  }

  if (name === "comath.paper.renderClaim") {
    return client.post("/paper/render-claim", {
      project_root: readString(input, "project_root"),
      project_id: readString(input, "project_id"),
      claim_id: readString(input, "claim_id"),
      wording: readString(input, "wording"),
      evidence_ids: Array.isArray(input.evidence_ids) ? input.evidence_ids.map(String) : undefined,
      source_workstreams: Array.isArray(input.source_workstreams) ? input.source_workstreams.map(String) : undefined,
      warnings: Array.isArray(input.warnings) ? input.warnings.map(String) : undefined,
      blockers: Array.isArray(input.blockers) ? input.blockers.map(String) : undefined,
      actor: readString(input, "actor")
    });
  }

  if (name === "comath.paper.check") {
    const projectRoot = readString(input, "project_root");
    const projectId = readString(input, "project_id");
    return client.get(`/paper/check?project_root=${encodeQuery(projectRoot)}&project_id=${encodeQuery(projectId)}`);
  }

  if (name === "comath.paper.export") {
    return client.post("/paper/export", {
      project_root: readString(input, "project_root"),
      project_id: readString(input, "project_id"),
      format: readString(input, "format"),
      actor: readString(input, "actor")
    });
  }

  if (name === "comath.snapshot.export") {
    return publicToolResult(
      name,
      client.post("/snapshot/export", {
        project_root: readString(input, "project_root"),
        project_id: readString(input, "project_id"),
        actor: readString(input, "actor")
      })
    );
  }

  if (name === "comath.snapshot.verify") {
    return publicToolResult(
      name,
      client.post("/snapshot/verify", {
        ...optionalProjectRoot(input),
        manifest_path: readString(input, "manifest_path")
      })
    );
  }

  if (name === "comath.snapshot.restore") {
    return publicToolResult(
      name,
      client.post("/snapshot/restore", {
        ...optionalProjectRoot(input),
        manifest_path: readString(input, "manifest_path"),
        target_root: readString(input, "target_root"),
        actor: readString(input, "actor")
      })
    );
  }

  if (name === "comath.replay.verifyManifest") {
    return publicToolResult(
      name,
      client.post("/replay/verify-manifest", {
        ...optionalProjectRoot(input),
        manifest_path: readString(input, "manifest_path")
      })
    );
  }

  if (name === "comath.release.sourceReviewPublicArchive") {
    return publicToolResult(
      name,
      client.post("/release/source-review/public-archive", {
        project_root: readString(input, "project_root"),
        project_id: readString(input, "project_id"),
        actor: readString(input, "actor"),
        ...(readString(input, "archive_id", { optional: true }) === undefined
          ? {}
          : { archive_id: readString(input, "archive_id", { optional: true }) }),
        reports: Array.isArray(input.reports) ? input.reports : []
      })
    );
  }

  if (name === "comath.release.publicArchiveReview") {
    return publicToolResult(
      name,
      client.post("/release/public-archive/review", {
        project_root: readString(input, "project_root"),
        project_id: readString(input, "project_id"),
        actor: readString(input, "actor"),
        ...(readString(input, "review_id", { optional: true }) === undefined
          ? {}
          : { review_id: readString(input, "review_id", { optional: true }) }),
        surfaces: Array.isArray(input.surfaces) ? input.surfaces : []
      })
    );
  }

  if (name === "comath.release.piCodexLifecycleReview") {
    return publicToolResult(
      name,
      client.post("/release/pi-codex-lifecycle/review", {
        project_root: readString(input, "project_root"),
        project_id: readString(input, "project_id"),
        actor: readString(input, "actor"),
        ...(readString(input, "review_id", { optional: true }) === undefined
          ? {}
          : { review_id: readString(input, "review_id", { optional: true }) }),
        install_session_evidence: readRecord(input, "install_session_evidence"),
        codex_evidence: readRecord(input, "codex_evidence")
      })
    );
  }

  if (name === "comath.release.piCodexApiProbe") {
    return publicToolResult(
      name,
      client.post("/release/pi-codex-lifecycle/codex-api-probe", {
        project_root: readString(input, "project_root"),
        project_id: readString(input, "project_id"),
        actor: readString(input, "actor"),
        ...(readString(input, "validation_id", { optional: true }) === undefined
          ? {}
          : { validation_id: readString(input, "validation_id", { optional: true }) })
      })
    );
  }

  if (name === "comath.release.piRealPiRuntimeProbe") {
    const probeId = readString(input, "probe_id", { optional: true });
    const piHostKind = readString(input, "pi_host_kind", { optional: true });
    const timeoutMs = readNumber(input, "timeout_ms");
    return publicToolResult(
      name,
      client.post("/release/pi-codex-lifecycle/real-pi-runtime-probe", {
        project_root: readString(input, "project_root"),
        project_id: readString(input, "project_id"),
        actor: readString(input, "actor"),
        ...(probeId === undefined ? {} : { probe_id: probeId }),
        pi_host_label: readString(input, "pi_host_label"),
        ...(piHostKind === undefined ? {} : { pi_host_kind: piHostKind }),
        session_kind: readString(input, "session_kind"),
        ...(timeoutMs === undefined ? {} : { timeout_ms: timeoutMs }),
        commands: readRecord(input, "commands")
      })
    );
  }

  if (name === "comath.release.piCodexLifecycleWalkthrough") {
    return publicToolResult(name, Promise.resolve(buildPiCodexLifecycleWalkthrough(input)));
  }

  if (name === "comath.release.piCodexLifecycleControl") {
    return publicToolResult(name, Promise.resolve(buildPiCodexLifecycleControl(input)));
  }

  if (name === "comath.release.piCodexLifecycleSession") {
    return publicToolResult(name, Promise.resolve(buildPiCodexLifecycleSession(input)));
  }

  if (name === "comath.release.piCodexLifecycleInteractiveRealPi") {
    return publicToolResult(name, Promise.resolve(buildPiCodexLifecycleInteractiveRealPi(input)));
  }

  if (name === "comath.release.piCodexLifecycleOperatorSession") {
    const sessionKind = readString(input, "session_kind", { optional: true });
    const operatorCursor = readString(input, "operator_cursor", { optional: true });
    return publicToolResult(
      name,
      client.post("/release/pi-codex-lifecycle/operator-session", {
        project_root: readString(input, "project_root"),
        project_id: readString(input, "project_id"),
        actor: publicOperatorText(readString(input, "actor")),
        session_id: readString(input, "session_id"),
        pi_host_label: readString(input, "pi_host_label"),
        session_status: readString(input, "session_status"),
        ...(sessionKind === undefined ? {} : { session_kind: sessionKind }),
        ...(operatorCursor === undefined ? {} : { operator_cursor: publicOperatorText(operatorCursor) }),
        ...(Array.isArray(input.completed_steps) ? { completed_steps: input.completed_steps.map(String) } : {}),
        ...(Array.isArray(input.artifact_paths) ? { artifact_paths: sanitizeLifecycleOperatorSessionArtifacts(input.artifact_paths) } : {}),
        ...(input.last_result_summary === undefined
          ? {}
          : { last_result_summary: sanitizePublicProofAuthorityValue(input.last_result_summary) })
      })
    );
  }

  if (name === "comath.release.piCodexLifecycleOperatorTransportRecovery") {
    const sessionManifestPath = readString(input, "session_manifest_path", { optional: true });
    const observedRoute = readString(input, "observed_route", { optional: true });
    const transportKind = readString(input, "transport_kind", { optional: true });
    const lastSeenEventId = readString(input, "last_seen_event_id", { optional: true });
    const reconnectReason = readString(input, "reconnect_reason", { optional: true });
    const clientEpoch = readNumber(input, "client_epoch");
    return publicToolResult(
      name,
      client.post("/release/pi-codex-lifecycle/operator-transport-recovery", {
        project_root: readString(input, "project_root"),
        project_id: readString(input, "project_id"),
        actor: publicOperatorText(readString(input, "actor")),
        session_id: readString(input, "session_id"),
        transport_recovery_id: readString(input, "transport_recovery_id"),
        ...(sessionManifestPath === undefined ? {} : { session_manifest_path: publicOperatorText(sessionManifestPath) }),
        ...(observedRoute === undefined ? {} : { observed_route: publicOperatorText(observedRoute) }),
        ...(transportKind === undefined ? {} : { transport_kind: transportKind }),
        ...(input.requested_cursor === undefined
          ? {}
          : { requested_cursor: sanitizePublicProofAuthorityValue(input.requested_cursor) }),
        ...(clientEpoch === undefined ? {} : { client_epoch: clientEpoch }),
        ...(lastSeenEventId === undefined ? {} : { last_seen_event_id: publicOperatorText(lastSeenEventId) }),
        ...(reconnectReason === undefined ? {} : { reconnect_reason: publicOperatorText(reconnectReason) })
      })
    );
  }

  if (name === "comath.release.piCodexLifecycleOperatorTransportLease") {
    const sessionManifestPath = readString(input, "session_manifest_path", { optional: true });
    const transportRecoveryPath = readString(input, "transport_recovery_path", { optional: true });
    const leaseRoute = readString(input, "lease_route", { optional: true });
    const transportKind = readString(input, "transport_kind", { optional: true });
    const lastSeenEventId = readString(input, "last_seen_event_id", { optional: true });
    const openReason = readString(input, "open_reason", { optional: true });
    const clientEpoch = readNumber(input, "client_epoch");
    const heartbeatIntervalMs = readNumber(input, "heartbeat_interval_ms");
    const leaseTtlMs = readNumber(input, "lease_ttl_ms");
    return publicToolResult(
      name,
      client.post("/release/pi-codex-lifecycle/operator-transport-lease", {
        project_root: readString(input, "project_root"),
        project_id: readString(input, "project_id"),
        actor: publicOperatorText(readString(input, "actor")),
        session_id: readString(input, "session_id"),
        transport_recovery_id: readString(input, "transport_recovery_id"),
        transport_lease_id: readString(input, "transport_lease_id"),
        ...(sessionManifestPath === undefined ? {} : { session_manifest_path: publicOperatorText(sessionManifestPath) }),
        ...(transportRecoveryPath === undefined ? {} : { transport_recovery_path: publicOperatorText(transportRecoveryPath) }),
        ...(leaseRoute === undefined ? {} : { lease_route: publicOperatorText(leaseRoute) }),
        ...(transportKind === undefined ? {} : { transport_kind: transportKind }),
        ...(input.requested_cursor === undefined
          ? {}
          : { requested_cursor: sanitizePublicProofAuthorityValue(input.requested_cursor) }),
        ...(clientEpoch === undefined ? {} : { client_epoch: clientEpoch }),
        ...(heartbeatIntervalMs === undefined ? {} : { heartbeat_interval_ms: heartbeatIntervalMs }),
        ...(leaseTtlMs === undefined ? {} : { lease_ttl_ms: leaseTtlMs }),
        ...(lastSeenEventId === undefined ? {} : { last_seen_event_id: publicOperatorText(lastSeenEventId) }),
        ...(openReason === undefined ? {} : { open_reason: publicOperatorText(openReason) })
      })
    );
  }

  if (name === "comath.release.piCodexLifecycleOperatorTransportHeartbeat") {
    const sessionManifestPath = readString(input, "session_manifest_path", { optional: true });
    const transportRecoveryPath = readString(input, "transport_recovery_path", { optional: true });
    const transportLeasePath = readString(input, "transport_lease_path", { optional: true });
    const lastSeenEventId = readString(input, "last_seen_event_id", { optional: true });
    const heartbeatReason = readString(input, "heartbeat_reason", { optional: true });
    const clientEpoch = readNumber(input, "client_epoch");
    return publicToolResult(
      name,
      client.post("/release/pi-codex-lifecycle/operator-transport-heartbeat", {
        project_root: readString(input, "project_root"),
        project_id: readString(input, "project_id"),
        actor: publicOperatorText(readString(input, "actor")),
        session_id: readString(input, "session_id"),
        transport_recovery_id: readString(input, "transport_recovery_id"),
        transport_lease_id: readString(input, "transport_lease_id"),
        transport_heartbeat_id: readString(input, "transport_heartbeat_id"),
        ...(sessionManifestPath === undefined ? {} : { session_manifest_path: publicOperatorText(sessionManifestPath) }),
        ...(transportRecoveryPath === undefined ? {} : { transport_recovery_path: publicOperatorText(transportRecoveryPath) }),
        ...(transportLeasePath === undefined ? {} : { transport_lease_path: publicOperatorText(transportLeasePath) }),
        ...(input.requested_cursor === undefined
          ? {}
          : { requested_cursor: sanitizePublicProofAuthorityValue(input.requested_cursor) }),
        ...(clientEpoch === undefined ? {} : { client_epoch: clientEpoch }),
        ...(lastSeenEventId === undefined ? {} : { last_seen_event_id: publicOperatorText(lastSeenEventId) }),
        ...(heartbeatReason === undefined ? {} : { heartbeat_reason: publicOperatorText(heartbeatReason) })
      })
    );
  }

  if (name === "comath.release.piCodexLifecycleOperatorServiceTransportContract") {
    const transportContractId = readString(input, "transport_contract_id", { optional: true });
    const terminalReviewPath = readString(input, "terminal_review_path", { optional: true });
    const maxBytes = readNumber(input, "max_bytes");
    const maxEvents = readNumber(input, "max_events");
    const retryMs = readNumber(input, "retry_ms");
    const serviceTransportPrimitive = readString(input, "service_transport_primitive", { optional: true });
    const clientTransportPrimitive = readString(input, "client_transport_primitive", { optional: true });
    return publicToolResult(
      name,
      client.post("/release/pi-codex-lifecycle/operator-service-transport-contract", {
        project_root: readString(input, "project_root"),
        project_id: readString(input, "project_id"),
        actor: publicOperatorText(readString(input, "actor")),
        ...(transportContractId === undefined ? {} : { transport_contract_id: transportContractId }),
        terminal_review_id: readString(input, "terminal_review_id"),
        ...(terminalReviewPath === undefined ? {} : { terminal_review_path: publicOperatorText(terminalReviewPath) }),
        ...(maxBytes === undefined ? {} : { max_bytes: maxBytes }),
        ...(maxEvents === undefined ? {} : { max_events: maxEvents }),
        ...(retryMs === undefined ? {} : { retry_ms: retryMs }),
        ...(serviceTransportPrimitive === undefined ? {} : { service_transport_primitive: serviceTransportPrimitive }),
        ...(clientTransportPrimitive === undefined ? {} : { client_transport_primitive: clientTransportPrimitive })
      })
    );
  }

  if (name === "comath.release.piCodexLifecycleOperatorServiceTransportContinuity") {
    const continuityId = readString(input, "continuity_id", { optional: true });
    const transportContractPath = readString(input, "transport_contract_path", { optional: true });
    const maxBytes = readNumber(input, "max_bytes");
    const maxEvents = readNumber(input, "max_events");
    const retryMs = readNumber(input, "retry_ms");
    const serviceTransportPrimitive = readString(input, "service_transport_primitive", { optional: true });
    const clientTransportPrimitive = readString(input, "client_transport_primitive", { optional: true });
    return publicToolResult(
      name,
      client.post("/release/pi-codex-lifecycle/operator-service-transport-continuity", {
        project_root: readString(input, "project_root"),
        project_id: readString(input, "project_id"),
        actor: publicOperatorText(readString(input, "actor")),
        ...(continuityId === undefined ? {} : { continuity_id: continuityId }),
        transport_contract_id: readString(input, "transport_contract_id"),
        ...(transportContractPath === undefined ? {} : { transport_contract_path: serviceArtifactPathText(transportContractPath) }),
        transport_contract_sha256: readString(input, "transport_contract_sha256"),
        ...(maxBytes === undefined ? {} : { max_bytes: maxBytes }),
        ...(maxEvents === undefined ? {} : { max_events: maxEvents }),
        ...(retryMs === undefined ? {} : { retry_ms: retryMs }),
        ...(serviceTransportPrimitive === undefined ? {} : { service_transport_primitive: serviceTransportPrimitive }),
        ...(clientTransportPrimitive === undefined ? {} : { client_transport_primitive: clientTransportPrimitive })
      })
    );
  }

  if (name === "comath.release.piCodexLifecycleAutomaticRealPiExecution") {
    const orchestrationId = readString(input, "orchestration_id", { optional: true });
    const terminalReview = readOptionalRecord(input, "terminal_review");
    return publicToolResult(
      name,
      client.post("/release/pi-codex-lifecycle/automatic-real-pi-execution", {
        project_root: readString(input, "project_root"),
        project_id: readString(input, "project_id"),
        ...(orchestrationId === undefined ? {} : { orchestration_id: publicOperatorText(orchestrationId) }),
        actor: publicOperatorText(readString(input, "actor")),
        runtime_probe: sanitizeAutomaticRealPiRuntimeProbeInput(readRecord(input, "runtime_probe")),
        operator_session: sanitizeAutomaticRealPiOperatorSessionInput(readRecord(input, "operator_session")),
        transport_recovery: sanitizeAutomaticRealPiTransportRecoveryInput(readRecord(input, "transport_recovery")),
        transport_lease: sanitizeAutomaticRealPiTransportLeaseInput(readRecord(input, "transport_lease")),
        transport_heartbeat: sanitizeAutomaticRealPiTransportHeartbeatInput(readRecord(input, "transport_heartbeat")),
        guided_execution: sanitizeAutomaticRealPiGuidedExecutionInput(readRecord(input, "guided_execution")),
        ...(terminalReview === undefined ? {} : { terminal_review: sanitizeAutomaticRealPiTerminalReviewInput(terminalReview) }),
        transport_contract: sanitizeAutomaticRealPiTransportContractInput(readRecord(input, "transport_contract"))
      })
    );
  }

  if (name === "comath.release.piCodexLifecycleUnattendedRealHostHandoffReview") {
    const handoffReviewId = readString(input, "handoff_review_id", { optional: true });
    return publicToolResult(
      name,
      client.post("/release/pi-codex-lifecycle/unattended-real-host-handoff-review", {
        project_root: readString(input, "project_root"),
        project_id: readString(input, "project_id"),
        actor: publicOperatorText(readString(input, "actor")),
        ...(handoffReviewId === undefined ? {} : { handoff_review_id: publicOperatorText(handoffReviewId) }),
        automatic_orchestration_id: readString(input, "automatic_orchestration_id"),
        automatic_orchestration_path: serviceArtifactPathText(readString(input, "automatic_orchestration_path")),
        automatic_orchestration_sha256: readString(input, "automatic_orchestration_sha256"),
        transport_continuity_id: readString(input, "transport_continuity_id"),
        transport_continuity_path: serviceArtifactPathText(readString(input, "transport_continuity_path")),
        transport_continuity_sha256: readString(input, "transport_continuity_sha256")
      })
    );
  }

  if (name === "comath.release.piCodexLifecycleUnattendedRealHostOperatorApproval") {
    const approvalId = readString(input, "approval_id", { optional: true });
    const operatorApprovalMode =
      readString(input, "operator_approval_mode", { optional: true }) ?? "manual_operator_approval";
    const approvalNote = readString(input, "approval_note", { optional: true });
    return publicToolResult(
      name,
      client.post("/release/pi-codex-lifecycle/unattended-real-host-operator-approval", {
        project_root: readString(input, "project_root"),
        project_id: readString(input, "project_id"),
        actor: publicOperatorText(readString(input, "actor")),
        ...(approvalId === undefined ? {} : { approval_id: publicOperatorText(approvalId) }),
        handoff_review_id: readString(input, "handoff_review_id"),
        handoff_review_path: piLifecycleCanonicalArtifactPathText(readString(input, "handoff_review_path")),
        handoff_review_sha256: readString(input, "handoff_review_sha256"),
        operator_approval_mode: operatorApprovalMode,
        ...(approvalNote === undefined ? {} : { approval_note: publicOperatorText(approvalNote) })
      })
    );
  }

  if (name === "comath.release.piCodexLifecycleUnattendedRealHostExecutionReadiness") {
    const readinessId = readString(input, "readiness_id", { optional: true });
    const requestedExecutionMode =
      readString(input, "requested_execution_mode", { optional: true }) ?? "production_unattended_real_host";
    const operatorApprovalId = readString(input, "operator_approval_id", { optional: true });
    const operatorApprovalPath = readString(input, "operator_approval_path", { optional: true });
    const operatorApprovalSha256 = readString(input, "operator_approval_sha256", { optional: true });
    const hasOperatorApprovalBinding =
      operatorApprovalId !== undefined || operatorApprovalPath !== undefined || operatorApprovalSha256 !== undefined;
    return publicToolResult(
      name,
      client.post("/release/pi-codex-lifecycle/unattended-real-host-execution-readiness", {
        project_root: readString(input, "project_root"),
        project_id: readString(input, "project_id"),
        actor: publicOperatorText(readString(input, "actor")),
        ...(readinessId === undefined ? {} : { readiness_id: publicOperatorText(readinessId) }),
        handoff_review_id: readString(input, "handoff_review_id"),
        handoff_review_path: piLifecycleCanonicalArtifactPathText(readString(input, "handoff_review_path")),
        handoff_review_sha256: readString(input, "handoff_review_sha256"),
        ...(hasOperatorApprovalBinding
          ? {
              operator_approval_id: requiredOption(operatorApprovalId, "operator_approval_id"),
              operator_approval_path: piLifecycleCanonicalArtifactPathText(
                requiredOption(operatorApprovalPath, "operator_approval_path")
              ),
              operator_approval_sha256: requiredOption(operatorApprovalSha256, "operator_approval_sha256")
            }
          : {}),
        requested_execution_mode: requestedExecutionMode
      })
    );
  }

  if (name === "comath.release.piCodexLifecycleGuidedRealPiExecution") {
    const sessionManifestPath = readString(input, "session_manifest_path", { optional: true });
    const transportRecoveryPath = readString(input, "transport_recovery_path", { optional: true });
    const transportLeasePath = readString(input, "transport_lease_path", { optional: true });
    const piHostLabel = readString(input, "pi_host_label", { optional: true });
    const operatorCommandSummary = readString(input, "operator_command_summary", { optional: true });
    const executionOutcome = readString(input, "execution_outcome", { optional: true });
    const nextRecommendedRoute = readString(input, "next_recommended_route", { optional: true });
    return publicToolResult(
      name,
      client.post("/release/pi-codex-lifecycle/guided-real-pi-execution", {
        project_root: readString(input, "project_root"),
        project_id: readString(input, "project_id"),
        actor: publicOperatorText(readString(input, "actor")),
        execution_id: readString(input, "execution_id"),
        real_pi_runtime_probe_id: readString(input, "real_pi_runtime_probe_id"),
        pi_install_transcript_path: publicOperatorText(readString(input, "pi_install_transcript_path")),
        runtime_registration_snapshot_path: publicOperatorText(
          readString(input, "runtime_registration_snapshot_path")
        ),
        session_id: readString(input, "session_id"),
        transport_recovery_id: readString(input, "transport_recovery_id"),
        transport_lease_id: readString(input, "transport_lease_id"),
        ...(sessionManifestPath === undefined ? {} : { session_manifest_path: publicOperatorText(sessionManifestPath) }),
        ...(transportRecoveryPath === undefined ? {} : { transport_recovery_path: publicOperatorText(transportRecoveryPath) }),
        ...(transportLeasePath === undefined ? {} : { transport_lease_path: publicOperatorText(transportLeasePath) }),
        ...(piHostLabel === undefined ? {} : { pi_host_label: publicOperatorText(piHostLabel) }),
        ...(Array.isArray(input.observed_routes)
          ? { observed_routes: input.observed_routes.map((route) => publicOperatorText(String(route))) }
          : {}),
        ...(operatorCommandSummary === undefined
          ? {}
          : { operator_command_summary: publicOperatorText(operatorCommandSummary) }),
        ...(input.final_operator_cursor === undefined
          ? {}
          : { final_operator_cursor: sanitizePublicProofAuthorityValue(input.final_operator_cursor) }),
        ...(executionOutcome === undefined ? {} : { execution_outcome: executionOutcome }),
        ...(nextRecommendedRoute === undefined ? {} : { next_recommended_route: publicOperatorText(nextRecommendedRoute) })
      })
    );
  }

  if (name === "comath.release.agentAdapterOsIsolationProbe") {
    const requestedProvider = readString(input, "requested_provider", { optional: true });
    return publicToolResult(
      name,
      client.post("/agent/adapter/package/os-isolation-probe", {
        project_root: readString(input, "project_root"),
        project_id: readString(input, "project_id"),
        actor: publicOperatorText(readString(input, "actor")),
        probe_id: readString(input, "probe_id"),
        adapter_id: readString(input, "adapter_id"),
        backend: readString(input, "backend"),
        ...(requestedProvider === undefined ? {} : { requested_provider: requestedProvider }),
        ...(input.probe_environment === undefined
          ? {}
          : { probe_environment: sanitizePublicProofAuthorityValue(input.probe_environment) })
      })
    );
  }

  if (name === "comath.release.agentAdapterOsIsolationSandboxExecutionProbe") {
    const requestedProvider = readString(input, "requested_provider", { optional: true });
    return publicToolResult(
      name,
      client.post("/agent/adapter/package/os-isolation-sandbox-execution", {
        project_root: readString(input, "project_root"),
        project_id: readString(input, "project_id"),
        actor: publicOperatorText(readString(input, "actor")),
        execution_id: readString(input, "execution_id"),
        launch_id: readString(input, "launch_id"),
        adapter_id: readString(input, "adapter_id"),
        backend: readString(input, "backend"),
        ...(requestedProvider === undefined ? {} : { requested_provider: requestedProvider }),
        ...(input.execution_environment === undefined
          ? {}
          : { execution_environment: sanitizePublicProofAuthorityValue(input.execution_environment) })
      })
    );
  }

  if (name === "comath.release.agentAdapterOsIsolationProviderHostCapabilityProbe") {
    const requestedProvider = readString(input, "requested_provider", { optional: true });
    const hostCapabilityEnvironment = publicDiagnosticEnvironment(input.host_capability_environment);
    return publicToolResult(
      name,
      client.post("/agent/adapter/package/os-isolation-provider-host-capability-probe", {
        project_root: readString(input, "project_root"),
        project_id: readString(input, "project_id"),
        actor: publicOperatorText(readString(input, "actor")),
        host_capability_probe_id: readString(input, "host_capability_probe_id"),
        adapter_id: readString(input, "adapter_id"),
        backend: readString(input, "backend"),
        ...(requestedProvider === undefined ? {} : { requested_provider: requestedProvider }),
        ...(hostCapabilityEnvironment === undefined ? {} : { host_capability_environment: hostCapabilityEnvironment })
      })
    );
  }

  if (name === "comath.release.agentAdapterOsIsolationProviderHelperHostValidation") {
    const requestedProvider = readString(input, "requested_provider", { optional: true });
    const hostEnvironment = publicDiagnosticEnvironment(input.host_environment);
    return publicToolResult(
      name,
      client.post("/agent/adapter/package/os-isolation-provider-helper-host-validation", {
        project_root: readString(input, "project_root"),
        project_id: readString(input, "project_id"),
        actor: publicOperatorText(readString(input, "actor")),
        host_validation_id: readString(input, "host_validation_id"),
        host_capability_probe_id: readString(input, "host_capability_probe_id"),
        runner_id: readString(input, "runner_id"),
        launch_id: readString(input, "launch_id"),
        adapter_id: readString(input, "adapter_id"),
        backend: readString(input, "backend"),
        ...(requestedProvider === undefined ? {} : { requested_provider: requestedProvider }),
        ...(hostEnvironment === undefined ? {} : { host_environment: hostEnvironment })
      })
    );
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
  const numberProp = { type: "number" };
  const agentAdapterBackendProp = { type: "string", enum: ["bundled", "external", "codex-api"] };
  const realPiRuntimeProbeCommandProp = {
    type: "object",
    required: ["program"],
    properties: {
      program: stringProp,
      args: stringArrayProp,
      expected_exit_code: numberProp,
      timeout_ms: numberProp
    }
  };
  const automaticRealPiRuntimeProbeProp = {
    type: "object",
    required: ["pi_host_label", "session_kind", "commands"],
    properties: {
      probe_id: stringProp,
      actor: stringProp,
      pi_host_label: stringProp,
      pi_host_kind: { type: "string", enum: ["real_pi_host"] },
      session_kind: { type: "string", enum: [...PI_LIFECYCLE_WALKTHROUGH_SESSION_KINDS] },
      timeout_ms: numberProp,
      commands: {
        type: "object",
        required: ["install", "runtime_registration", "host_confirmation"],
        properties: {
          install: realPiRuntimeProbeCommandProp,
          runtime_registration: realPiRuntimeProbeCommandProp,
          host_confirmation: realPiRuntimeProbeCommandProp
        }
      }
    }
  };
  const automaticRealPiCursorProp = {
    type: "object",
    properties: {
      operator_event_cursor: stringProp,
      stdout_cursor: stringProp,
      stderr_cursor: stringProp
    }
  };
  const automaticRealPiOperatorSessionProp = {
    type: "object",
    required: ["session_id", "session_status"],
    properties: {
      session_id: stringProp,
      actor: stringProp,
      session_status: { type: "string", enum: [...PI_LIFECYCLE_OPERATOR_SESSION_STATUSES] },
      operator_cursor: stringProp,
      completed_steps: {
        type: "array",
        items: { type: "string", enum: [...PI_LIFECYCLE_OPERATOR_SESSION_STEPS] }
      },
      last_result_summary: { type: "object" }
    }
  };
  const automaticRealPiTransportRecoveryProp = {
    type: "object",
    required: ["transport_recovery_id"],
    properties: {
      transport_recovery_id: stringProp,
      actor: stringProp,
      transport_kind: { type: "string", enum: [...PI_LIFECYCLE_OPERATOR_TRANSPORT_KINDS] },
      observed_route: stringProp,
      requested_cursor: automaticRealPiCursorProp,
      client_epoch: numberProp,
      last_seen_event_id: stringProp,
      reconnect_reason: stringProp
    }
  };
  const automaticRealPiTransportLeaseProp = {
    type: "object",
    required: ["transport_lease_id"],
    properties: {
      transport_lease_id: stringProp,
      actor: stringProp,
      transport_kind: { type: "string", enum: [...PI_LIFECYCLE_OPERATOR_TRANSPORT_LEASE_KINDS] },
      lease_route: stringProp,
      requested_cursor: automaticRealPiCursorProp,
      client_epoch: numberProp,
      heartbeat_interval_ms: numberProp,
      lease_ttl_ms: numberProp,
      last_seen_event_id: stringProp,
      open_reason: stringProp
    }
  };
  const automaticRealPiTransportHeartbeatProp = {
    type: "object",
    required: ["transport_heartbeat_id"],
    properties: {
      transport_heartbeat_id: stringProp,
      actor: stringProp,
      requested_cursor: automaticRealPiCursorProp,
      client_epoch: numberProp,
      last_seen_event_id: stringProp,
      heartbeat_reason: stringProp
    }
  };
  const automaticRealPiGuidedExecutionProp = {
    type: "object",
    required: ["execution_id"],
    properties: {
      execution_id: stringProp,
      actor: stringProp,
      observed_routes: stringArrayProp,
      operator_command_summary: stringProp,
      final_operator_cursor: automaticRealPiCursorProp,
      execution_outcome: {
        type: "string",
        enum: ["operator_guided_run_observed", "replayable_release_blocker_recorded"]
      },
      next_recommended_route: stringProp
    }
  };
  const automaticRealPiTerminalReviewProp = {
    type: "object",
    properties: {
      review_id: stringProp,
      actor: stringProp
    }
  };
  const automaticRealPiTransportContractProp = {
    type: "object",
    required: ["service_transport_primitive", "client_transport_primitive"],
    properties: {
      transport_contract_id: stringProp,
      actor: stringProp,
      max_bytes: numberProp,
      max_events: numberProp,
      retry_ms: numberProp,
      service_transport_primitive: {
        type: "string",
        enum: ["node_http_agent_run_log_session_route"]
      },
      client_transport_primitive: {
        type: "string",
        enum: ["pi_fetch_get_text"]
      }
    }
  };
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
      input_schema: objectSchema(["project_root", "project_id", "workstream_id", "new_nodes", "new_edges"], {
        project_root: stringProp,
        project_id: stringProp,
        workstream_id: stringProp,
        source_workstream_id: stringProp,
        new_nodes: { type: "array" },
        new_edges: { type: "array" },
        updated_nodes: { type: "array" },
        candidate_conflicts: { type: "array" },
        warnings: stringArrayProp,
        actor: stringProp
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
      description: "Start a goal-mode ResearchCampaign through comathd's native proof-kernel path.",
      mutates: true,
      input_schema: objectSchema(["project_root", "user_goal", "actor"], {
        project_root: stringProp,
        project_name: stringProp,
        user_goal: stringProp,
        domain: stringProp,
        strict_mode: { type: "boolean" },
        mode: { type: "string", enum: ["goal", "bounded"] },
        paper_paths: stringArrayProp,
        attachments: stringArrayProp,
        workspace_refs: stringArrayProp,
        budget: stringProp,
        actor: stringProp
      })
    },
    {
      name: "comath.research.runCampaignLoop",
      description: "Run a goal-mode ResearchCampaign loop through comathd and return dashboard state.",
      mutates: true,
      input_schema: objectSchema(["project_root", "user_goal", "actor", "confirmation_id"], {
        project_root: stringProp,
        project_name: stringProp,
        user_goal: stringProp,
        domain: stringProp,
        strict_mode: { type: "boolean" },
        mode: { type: "string", enum: ["goal", "bounded"] },
        paper_paths: stringArrayProp,
        attachments: stringArrayProp,
        workspace_refs: stringArrayProp,
        budget: stringProp,
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
      name: "comath.campaign.resume",
      description: "Resume a paused goal-mode campaign through comathd without Pi writing trusted proof state.",
      mutates: true,
      input_schema: objectSchema(["project_root", "campaign_id", "actor"], {
        project_root: stringProp,
        campaign_id: stringProp,
        actor: stringProp
      })
    },
    {
      name: "comath.campaign.cancel",
      description: "Cancel a goal-mode campaign through comathd without Pi writing trusted proof state.",
      mutates: true,
      input_schema: objectSchema(["project_root", "campaign_id", "actor"], {
        project_root: stringProp,
        campaign_id: stringProp,
        actor: stringProp
      })
    },
    {
      name: "comath.campaign.export",
      description: "Read a non-authoritative campaign export descriptor and evidence-pack pointers through comathd.",
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
      name: "comath.agent.profileList",
      description: "List validated CoMath GA agent profiles through comathd.",
      mutates: false,
      input_schema: objectSchema(["global_rpm"], {
        global_rpm: { type: "number", minimum: 1 }
      })
    },
    {
      name: "comath.agent.profileGet",
      description: "Read one CoMath GA agent profile through comathd.",
      mutates: false,
      input_schema: objectSchema(["profile_id"], {
        profile_id: stringProp
      })
    },
    {
      name: "comath.agent.runForProfile",
      description: "Create an AgentRun bound to a validated CoMath agent profile through comathd.",
      mutates: true,
      input_schema: objectSchema(["project_root", "project_id", "workstream_id", "profile_id", "actor"], {
        project_root: stringProp,
        project_id: stringProp,
        campaign_id: stringProp,
        workstream_id: stringProp,
        profile_id: stringProp,
        actor: stringProp
      })
    },
    {
      name: "comath.agent.prepareLaunch",
      description: "Prepare a scheduler launch envelope for a profile-bound AgentRun through comathd.",
      mutates: true,
      input_schema: objectSchema(
        ["project_root", "project_id", "run_id", "profile_id", "program", "goal", "context_path", "actor"],
        {
          project_root: stringProp,
          project_id: stringProp,
          run_id: stringProp,
          profile_id: stringProp,
          program: stringProp,
          goal: stringProp,
          context_path: stringProp,
          actor: stringProp
        }
      )
    },
    {
      name: "comath.agent.executeProfile",
      description: "Create and execute a profile-bound AgentRun through the comathd scheduler.",
      mutates: true,
      input_schema: objectSchema(
        ["project_root", "project_id", "workstream_id", "profile_id", "program", "goal", "context_path", "actor"],
        {
          project_root: stringProp,
          project_id: stringProp,
          campaign_id: stringProp,
          workstream_id: stringProp,
          profile_id: stringProp,
          program: stringProp,
          adapter_args: stringArrayProp,
          goal: stringProp,
          context_path: stringProp,
          actor: stringProp
        }
      )
    },
    {
      name: "comath.agent.logs",
      description: "Read capped stdout/stderr logs for an AgentRun through comathd.",
      mutates: false,
      input_schema: objectSchema(["project_root", "project_id", "run_id"], {
        project_root: stringProp,
        project_id: stringProp,
        run_id: stringProp,
        max_bytes: { type: "number", minimum: 1 }
      })
    },
    {
      name: "comath.agent.streamLogs",
      description: "Read incremental cursor-based stdout/stderr chunks for an AgentRun through comathd.",
      mutates: false,
      input_schema: objectSchema(["project_root", "project_id", "run_id"], {
        project_root: stringProp,
        project_id: stringProp,
        run_id: stringProp,
        stdout_cursor: { type: "number", minimum: 0 },
        stderr_cursor: { type: "number", minimum: 0 },
        max_bytes: { type: "number", minimum: 1 },
        actor: stringProp
      })
    },
    {
      name: "comath.agent.subscribeLogs",
      description: "Open a read-only SSE-style AgentRun stdout/stderr subscription snapshot through comathd.",
      mutates: false,
      input_schema: objectSchema(["project_root", "project_id", "run_id"], {
        project_root: stringProp,
        project_id: stringProp,
        run_id: stringProp,
        stdout_cursor: { type: "number", minimum: 0 },
        stderr_cursor: { type: "number", minimum: 0 },
        max_bytes: { type: "number", minimum: 1 },
        retry_ms: { type: "number", minimum: 0 },
        actor: stringProp
      })
    },
    {
      name: "comath.agent.logSession",
      description: "Open a bounded multi-event SSE-style AgentRun stdout/stderr log session through comathd.",
      mutates: false,
      input_schema: objectSchema(["project_root", "project_id", "run_id"], {
        project_root: stringProp,
        project_id: stringProp,
        run_id: stringProp,
        stdout_cursor: { type: "number", minimum: 0 },
        stderr_cursor: { type: "number", minimum: 0 },
        max_bytes: { type: "number", minimum: 1 },
        max_events: { type: "number", minimum: 1 },
        retry_ms: { type: "number", minimum: 0 },
        actor: stringProp
      })
    },
    {
      name: "comath.agent.operatorPanel",
      description: "Read a service-owned AgentRun operator panel with status, log cursors, subscription metadata, and allowed actions.",
      mutates: false,
      input_schema: objectSchema(["project_root", "project_id", "run_id"], {
        project_root: stringProp,
        project_id: stringProp,
        run_id: stringProp,
        stdout_cursor: { type: "number", minimum: 0 },
        stderr_cursor: { type: "number", minimum: 0 },
        max_bytes: { type: "number", minimum: 1 },
        actor: stringProp
      })
    },
    {
      name: "comath.agent.cancelRun",
      description: "Request scheduler-backed cancellation for an active AgentRun through comathd.",
      mutates: true,
      input_schema: objectSchema(["project_root", "project_id", "run_id", "actor", "confirmation_id"], {
        project_root: stringProp,
        project_id: stringProp,
        run_id: stringProp,
        actor: stringProp,
        confirmation_id: stringProp
      })
    },
    {
      name: "comath.agent.health",
      description: "Run a bounded non-authoritative health probe for an allowlisted agent adapter through comathd.",
      mutates: true,
      input_schema: objectSchema(["project_root", "project_id", "profile_id", "program", "actor"], {
        project_root: stringProp,
        project_id: stringProp,
        profile_id: stringProp,
        program: stringProp,
        adapter_args: stringArrayProp,
        timeout_ms: { type: "number", minimum: 1 },
        actor: stringProp
      })
    },
    {
      name: "comath.agent.adapterPackageList",
      description: "List service-owned packaged agent adapters through comathd.",
      mutates: false,
      input_schema: objectSchema([], {})
    },
    {
      name: "comath.agent.prepareAdapterPackage",
      description: "Prepare a launch envelope for a service-owned packaged agent adapter.",
      mutates: true,
      input_schema: objectSchema(
        ["project_root", "project_id", "run_id", "profile_id", "adapter_id", "goal", "context_path", "actor"],
        {
          project_root: stringProp,
          project_id: stringProp,
          run_id: stringProp,
          profile_id: stringProp,
          adapter_id: stringProp,
          backend: agentAdapterBackendProp,
          goal: stringProp,
          context_path: stringProp,
          actor: stringProp
        }
      )
    },
    {
      name: "comath.agent.executeAdapterPackage",
      description: "Create and execute a service-owned packaged agent adapter through comathd.",
      mutates: true,
      input_schema: objectSchema(
        ["project_root", "project_id", "workstream_id", "profile_id", "adapter_id", "goal", "context_path", "actor"],
        {
          project_root: stringProp,
          project_id: stringProp,
          campaign_id: stringProp,
          workstream_id: stringProp,
          profile_id: stringProp,
          adapter_id: stringProp,
          backend: agentAdapterBackendProp,
          goal: stringProp,
          context_path: stringProp,
          actor: stringProp
        }
      )
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
      description: "Verify a service-owned runtime snapshot manifest through comathd, including project-relative public manifest paths.",
      mutates: false,
      input_schema: objectSchema(["manifest_path"], {
        project_root: stringProp,
        manifest_path: stringProp
      })
    },
    {
      name: "comath.snapshot.restore",
      description: "Restore a verified service-owned runtime snapshot into a target root through comathd, including project-relative public manifest paths.",
      mutates: true,
      input_schema: objectSchema(["manifest_path", "target_root", "actor"], {
        project_root: stringProp,
        manifest_path: stringProp,
        target_root: stringProp,
        actor: stringProp
      })
    },
    {
      name: "comath.replay.verifyManifest",
      description: "Verify replay manifest metadata embedded in a service-owned snapshot, including project-relative public manifest paths.",
      mutates: false,
      input_schema: objectSchema(["manifest_path"], {
        project_root: stringProp,
        manifest_path: stringProp
      })
    },
    {
      name: "comath.release.sourceReviewPublicArchive",
      description: "Assemble a sanitized non-authoritative source-review public diagnostic archive through comathd.",
      mutates: true,
      input_schema: objectSchema(["project_root", "project_id", "actor", "reports"], {
        project_root: stringProp,
        project_id: stringProp,
        actor: stringProp,
        archive_id: stringProp,
        reports: {
          type: "array",
          items: {
            type: "object",
            required: ["format", "path"],
            properties: {
              format: { type: "string", enum: ["markdown", "html", "json"] },
              path: stringProp
            }
          }
        }
      })
    },
    {
      name: "comath.release.publicArchiveReview",
      description: "Review public release/archive surfaces through the service-owned Goal 3 public archive review gate.",
      mutates: true,
      input_schema: objectSchema(["project_root", "project_id", "actor", "surfaces"], {
        project_root: stringProp,
        project_id: stringProp,
        actor: stringProp,
        review_id: stringProp,
        surfaces: {
          type: "array",
          items: {
            type: "object",
            required: ["surface_id", "surface_kind"],
            properties: {
              surface_id: stringProp,
              surface_kind: {
                type: "string",
                enum: ["source_review_public_archive", "public_route_payload", "public_review_manifest"]
              },
              manifest_path: stringProp,
              payload: { type: "object" }
            }
          }
        }
      })
    },
    {
      name: "comath.release.piCodexLifecycleReview",
      description: "Review real-host Pi/Codex lifecycle readiness through the service-owned non-authoritative release gate.",
      mutates: true,
      input_schema: objectSchema(["project_root", "project_id", "actor", "install_session_evidence", "codex_evidence"], {
        project_root: stringProp,
        project_id: stringProp,
        actor: stringProp,
        review_id: stringProp,
        install_session_evidence: {
          type: "object",
          required: [
            "session_kind",
            "pi_host_kind",
            "runtime_entrypoint_imported",
            "runtime_registered",
            "host_confirmation_observed",
            "comathd_server_kind",
            "service_start_observed",
            "service_stop_observed",
            "service_restart_observed"
          ],
          properties: {
            session_kind: {
              type: "string",
              enum: ["phase45_local_fake_pi_http_e2e", "real_pi_host_manual_install", "real_pi_host_automated_install", "unknown"]
            },
            pi_host_kind: { type: "string", enum: ["fake_pi_host", "real_pi_host", "unknown"] },
            runtime_entrypoint_imported: { type: "boolean" },
            runtime_registered: { type: "boolean" },
            host_confirmation_observed: { type: "boolean" },
            comathd_server_kind: {
              type: "string",
              enum: ["ephemeral_test_http_server", "durable_service", "manual_shell", "unknown"]
            },
            service_start_observed: { type: "boolean" },
            service_stop_observed: { type: "boolean" },
            service_restart_observed: { type: "boolean" }
          }
        },
        codex_evidence: {
          type: "object",
          required: ["installed_cli_validation_ok", "installed_cli_probe_source", "codex_api_account_network_validation"],
          properties: {
            installed_cli_validation_ok: { type: "boolean" },
            installed_cli_probe_source: { type: "string", enum: ["service_owned_process", "injected_fake_cli", "not_run"] },
            codex_api_account_network_validation: {
              type: "string",
              enum: ["passed", "not_run", "injected_fake", "blocked_missing_credentials"]
            }
          }
        }
      })
    },
    {
      name: "comath.release.piCodexApiProbe",
      description:
        "Run the service-owned production Codex API account/network validation probe for Pi/Codex lifecycle readiness.",
      mutates: true,
      input_schema: objectSchema(["project_root", "project_id", "actor"], {
        project_root: stringProp,
        project_id: stringProp,
        actor: stringProp,
        validation_id: stringProp
      })
    },
    {
      name: "comath.release.piRealPiRuntimeProbe",
      description:
        "Run the service-owned real-Pi install/runtime-registration probe for Pi/Codex lifecycle readiness.",
      mutates: true,
      input_schema: objectSchema(["project_root", "project_id", "actor", "pi_host_label", "session_kind", "commands"], {
        project_root: stringProp,
        project_id: stringProp,
        actor: stringProp,
        probe_id: stringProp,
        pi_host_label: stringProp,
        pi_host_kind: { type: "string", enum: ["real_pi_host"] },
        session_kind: { type: "string", enum: ["real_pi_host_manual_install", "real_pi_host_automated_install"] },
        timeout_ms: numberProp,
        commands: {
          type: "object",
          required: ["install", "runtime_registration", "host_confirmation"],
          properties: {
            install: realPiRuntimeProbeCommandProp,
            runtime_registration: realPiRuntimeProbeCommandProp,
            host_confirmation: realPiRuntimeProbeCommandProp
          }
        }
      })
    },
    {
      name: "comath.release.piCodexLifecycleWalkthrough",
      description:
        "Render a read-only operator walkthrough for the Pi/Codex lifecycle evidence and readiness-review chain.",
      mutates: false,
      input_schema: objectSchema(["project_id", "actor", "pi_host_label"], {
        project_id: stringProp,
        actor: stringProp,
        pi_host_label: stringProp,
        session_kind: { type: "string", enum: [...PI_LIFECYCLE_WALKTHROUGH_SESSION_KINDS] },
        probe_id: stringProp,
        validation_id: stringProp,
        review_id: stringProp
      })
    },
    {
      name: "comath.release.piCodexLifecycleControl",
      description:
        "Render read-only Pi lifecycle operator controls and status, with executable actions routed through host-confirmed lifecycle tools.",
      mutates: false,
      input_schema: objectSchema(["project_id", "actor", "pi_host_label", "action"], {
        project_id: stringProp,
        actor: stringProp,
        pi_host_label: stringProp,
        action: { type: "string", enum: [...PI_LIFECYCLE_CONTROL_PLAN_ACTIONS] },
        session_kind: { type: "string", enum: [...PI_LIFECYCLE_WALKTHROUGH_SESSION_KINDS] },
        probe_id: stringProp,
        validation_id: stringProp,
        review_id: stringProp
      })
    },
    {
      name: "comath.release.piCodexLifecycleSession",
      description:
        "Render read-only Pi lifecycle operator session recovery plans without claiming durable transport or trusted-state mutation.",
      mutates: false,
      input_schema: objectSchema(["project_id", "actor", "pi_host_label", "session_id", "action"], {
        project_id: stringProp,
        actor: stringProp,
        pi_host_label: stringProp,
        session_id: stringProp,
        action: { type: "string", enum: [...PI_LIFECYCLE_SESSION_ACTIONS] },
        session_kind: { type: "string", enum: [...PI_LIFECYCLE_WALKTHROUGH_SESSION_KINDS] },
        probe_id: stringProp,
        validation_id: stringProp,
        review_id: stringProp,
        current_step: stringProp,
        completed_steps: {
          type: "array",
          items: { type: "string", enum: [...PI_LIFECYCLE_SESSION_STEP_IDS] }
        },
        stdout_cursor: stringProp,
        stderr_cursor: stringProp,
        last_result_summary: stringProp
      })
    },
    {
      name: "comath.release.piCodexLifecycleOperatorSession",
      description:
        "Persist a service-owned Pi/Codex lifecycle operator-session manifest through comathd without Pi direct writes.",
      mutates: true,
      input_schema: objectSchema(["project_root", "project_id", "actor", "session_id", "pi_host_label", "session_status"], {
        project_root: stringProp,
        project_id: stringProp,
        actor: stringProp,
        session_id: stringProp,
        pi_host_label: stringProp,
        session_status: { type: "string", enum: [...PI_LIFECYCLE_OPERATOR_SESSION_STATUSES] },
        session_kind: { type: "string", enum: [...PI_LIFECYCLE_WALKTHROUGH_SESSION_KINDS] },
        operator_cursor: stringProp,
        completed_steps: {
          type: "array",
          items: { type: "string", enum: [...PI_LIFECYCLE_OPERATOR_SESSION_STEPS] }
        },
        artifact_paths: {
          type: "array",
          items: {
            type: "object",
            required: ["kind", "path"],
            properties: {
              kind: stringProp,
              path: stringProp
            }
          }
        },
        last_result_summary: { type: "object" }
      })
    },
    {
      name: "comath.release.piCodexLifecycleOperatorTransportRecovery",
      description:
        "Persist a service-owned Pi/Codex lifecycle operator transport recovery checkpoint through comathd without Pi direct writes.",
      mutates: true,
      input_schema: objectSchema(["project_root", "project_id", "actor", "session_id", "transport_recovery_id"], {
        project_root: stringProp,
        project_id: stringProp,
        actor: stringProp,
        session_id: stringProp,
        transport_recovery_id: stringProp,
        session_manifest_path: stringProp,
        observed_route: stringProp,
        transport_kind: { type: "string", enum: [...PI_LIFECYCLE_OPERATOR_TRANSPORT_KINDS] },
        requested_cursor: {
          type: "object",
          properties: {
            operator_event_cursor: stringProp,
            stdout_cursor: stringProp,
            stderr_cursor: stringProp
          }
        },
        last_seen_event_id: stringProp,
        reconnect_reason: stringProp
      })
    },
    {
      name: "comath.release.piCodexLifecycleOperatorTransportLease",
      description:
        "Open a service-owned bounded Pi/Codex lifecycle operator transport lease through comathd without Pi direct writes or long-lived transport claims.",
      mutates: true,
      input_schema: objectSchema(
        ["project_root", "project_id", "actor", "session_id", "transport_recovery_id", "transport_lease_id"],
        {
          project_root: stringProp,
          project_id: stringProp,
          actor: stringProp,
          session_id: stringProp,
          transport_recovery_id: stringProp,
          transport_lease_id: stringProp,
          session_manifest_path: stringProp,
          transport_recovery_path: stringProp,
          lease_route: stringProp,
          transport_kind: { type: "string", enum: [...PI_LIFECYCLE_OPERATOR_TRANSPORT_LEASE_KINDS] },
          requested_cursor: {
            type: "object",
            properties: {
              operator_event_cursor: stringProp,
              stdout_cursor: stringProp,
              stderr_cursor: stringProp
            }
          },
          heartbeat_interval_ms: { type: "number", minimum: 0 },
          lease_ttl_ms: { type: "number", minimum: 0 },
          last_seen_event_id: stringProp,
          open_reason: stringProp
        }
      )
    },
    {
      name: "comath.release.piCodexLifecycleOperatorTransportHeartbeat",
      description:
        "Append a service-owned bounded Pi/Codex lifecycle operator transport heartbeat/rebind checkpoint through comathd without Pi direct writes or long-lived transport claims.",
      mutates: true,
      input_schema: objectSchema(
        [
          "project_root",
          "project_id",
          "actor",
          "session_id",
          "transport_recovery_id",
          "transport_lease_id",
          "transport_heartbeat_id"
        ],
        {
          project_root: stringProp,
          project_id: stringProp,
          actor: stringProp,
          session_id: stringProp,
          transport_recovery_id: stringProp,
          transport_lease_id: stringProp,
          transport_heartbeat_id: stringProp,
          session_manifest_path: stringProp,
          transport_recovery_path: stringProp,
          transport_lease_path: stringProp,
          requested_cursor: {
            type: "object",
            properties: {
              operator_event_cursor: stringProp,
              stdout_cursor: stringProp,
              stderr_cursor: stringProp
            }
          },
          client_epoch: { type: "number", minimum: 0 },
          last_seen_event_id: stringProp,
          heartbeat_reason: stringProp
        }
      )
    },
    {
      name: "comath.release.piCodexLifecycleOperatorServiceTransportContract",
      description:
        "Record a service-owned Pi/Codex operator/service maintained transport contract through comathd, binding an existing terminal review to maintained Node HTTP and Pi fetch primitives without durable transport claims.",
      mutates: true,
      input_schema: objectSchema(["project_root", "project_id", "actor", "terminal_review_id"], {
        project_root: stringProp,
        project_id: stringProp,
        actor: stringProp,
        transport_contract_id: stringProp,
        terminal_review_id: stringProp,
        terminal_review_path: stringProp,
        max_bytes: { type: "number", minimum: 0 },
        max_events: { type: "number", minimum: 0 },
        retry_ms: { type: "number", minimum: 0 },
        service_transport_primitive: {
          type: "string",
          enum: ["node_http_agent_run_log_session_route"]
        },
        client_transport_primitive: {
          type: "string",
          enum: ["pi_fetch_get_text"]
        }
      })
    },
    {
      name: "comath.release.piCodexLifecycleOperatorServiceTransportContinuity",
      description:
        "Record a service-owned Pi/Codex operator/service transport continuity checkpoint through comathd, consuming a Task225 contract hash and bounded log-session resume without durable transport claims.",
      mutates: true,
      input_schema: objectSchema(["project_root", "project_id", "actor", "transport_contract_id", "transport_contract_sha256"], {
        project_root: stringProp,
        project_id: stringProp,
        actor: stringProp,
        continuity_id: stringProp,
        transport_contract_id: stringProp,
        transport_contract_path: stringProp,
        transport_contract_sha256: stringProp,
        max_bytes: { type: "number", minimum: 0 },
        max_events: { type: "number", minimum: 0 },
        retry_ms: { type: "number", minimum: 0 },
        service_transport_primitive: {
          type: "string",
          enum: ["node_http_agent_run_log_session_route"]
        },
        client_transport_primitive: {
          type: "string",
          enum: ["pi_fetch_get_text"]
        }
      })
    },
    {
      name: "comath.release.piCodexLifecycleAutomaticRealPiExecution",
      description:
        "Run the service-owned automatic real-Pi lifecycle checkpoint-chain orchestrator through comathd without Pi direct writes, proof authority, GA certification, or durable transport claims.",
      mutates: true,
      input_schema: objectSchema(
        [
          "project_root",
          "project_id",
          "actor",
          "runtime_probe",
          "operator_session",
          "transport_recovery",
          "transport_lease",
          "transport_heartbeat",
          "guided_execution",
          "transport_contract"
        ],
        {
          project_root: stringProp,
          project_id: stringProp,
          actor: stringProp,
          orchestration_id: stringProp,
          runtime_probe: automaticRealPiRuntimeProbeProp,
          operator_session: automaticRealPiOperatorSessionProp,
          transport_recovery: automaticRealPiTransportRecoveryProp,
          transport_lease: automaticRealPiTransportLeaseProp,
          transport_heartbeat: automaticRealPiTransportHeartbeatProp,
          guided_execution: automaticRealPiGuidedExecutionProp,
          terminal_review: automaticRealPiTerminalReviewProp,
          transport_contract: automaticRealPiTransportContractProp
        }
      )
    },
    {
      name: "comath.release.piCodexLifecycleUnattendedRealHostHandoffReview",
      description:
        "Record a service-owned unattended real-host handoff review through comathd, binding prepared automatic-orchestration and transport-continuity checkpoint hashes without execution, approval, proof authority, GA certification, or durable transport claims.",
      mutates: true,
      input_schema: requireConfirmationSchema(
        objectSchema(
          [
            "project_root",
            "project_id",
            "actor",
            "automatic_orchestration_id",
            "automatic_orchestration_path",
            "automatic_orchestration_sha256",
            "transport_continuity_id",
            "transport_continuity_path",
            "transport_continuity_sha256"
          ],
          {
            project_root: stringProp,
            project_id: stringProp,
            actor: stringProp,
            handoff_review_id: stringProp,
            automatic_orchestration_id: stringProp,
            automatic_orchestration_path: stringProp,
            automatic_orchestration_sha256: stringProp,
            transport_continuity_id: stringProp,
            transport_continuity_path: stringProp,
            transport_continuity_sha256: stringProp
          }
        )
      )
    },
    {
      name: "comath.release.piCodexLifecycleUnattendedRealHostOperatorApproval",
      description:
        "Record a service-owned manual unattended real-host operator approval checkpoint through comathd without execution authorization, proof authority, GA certification, direct Pi mutation, or durable transport claims.",
      mutates: true,
      input_schema: requireConfirmationSchema(
        objectSchema(
          [
            "project_root",
            "project_id",
            "actor",
            "handoff_review_id",
            "handoff_review_path",
            "handoff_review_sha256"
          ],
          {
            project_root: stringProp,
            project_id: stringProp,
            actor: stringProp,
            approval_id: stringProp,
            handoff_review_id: stringProp,
            handoff_review_path: stringProp,
            handoff_review_sha256: stringProp,
            operator_approval_mode: {
              type: "string",
              enum: ["manual_operator_approval"]
            },
            approval_note: stringProp
          }
        )
      )
    },
    {
      name: "comath.release.piCodexLifecycleUnattendedRealHostExecutionReadiness",
      description:
        "Record a service-owned unattended real-host execution readiness blocker through comathd, consuming a Task239 handoff-review hash without approval, execution, proof authority, GA certification, or durable transport claims.",
      mutates: true,
      input_schema: requireConfirmationSchema(
        objectSchema(
          [
            "project_root",
            "project_id",
            "actor",
            "handoff_review_id",
            "handoff_review_path",
            "handoff_review_sha256"
          ],
          {
            project_root: stringProp,
            project_id: stringProp,
            actor: stringProp,
            readiness_id: stringProp,
            handoff_review_id: stringProp,
            handoff_review_path: stringProp,
            handoff_review_sha256: stringProp,
            operator_approval_id: stringProp,
            operator_approval_path: stringProp,
            operator_approval_sha256: stringProp,
            requested_execution_mode: {
              type: "string",
              enum: ["production_unattended_real_host"]
            }
          }
        )
      )
    },
    {
      name: "comath.release.piCodexLifecycleGuidedRealPiExecution",
      description:
        "Record service-owned guided real-Pi execution evidence through comathd without Pi direct writes, proof authority, GA certification, or long-lived transport claims.",
      mutates: true,
      input_schema: objectSchema(
        [
          "project_root",
          "project_id",
          "actor",
          "execution_id",
          "real_pi_runtime_probe_id",
          "pi_install_transcript_path",
          "runtime_registration_snapshot_path",
          "session_id",
          "transport_recovery_id",
          "transport_lease_id"
        ],
        {
          project_root: stringProp,
          project_id: stringProp,
          actor: stringProp,
          execution_id: stringProp,
          real_pi_runtime_probe_id: stringProp,
          pi_install_transcript_path: stringProp,
          runtime_registration_snapshot_path: stringProp,
          session_id: stringProp,
          session_manifest_path: stringProp,
          transport_recovery_id: stringProp,
          transport_recovery_path: stringProp,
          transport_lease_id: stringProp,
          transport_lease_path: stringProp,
          pi_host_label: stringProp,
          observed_routes: stringArrayProp,
          operator_command_summary: stringProp,
          final_operator_cursor: {
            type: "object",
            properties: {
              operator_event_cursor: stringProp,
              stdout_cursor: stringProp,
              stderr_cursor: stringProp
            }
          },
          execution_outcome: {
            type: "string",
            enum: ["operator_guided_run_observed", "replayable_release_blocker_recorded"]
          },
          next_recommended_route: stringProp
        }
      )
    },
    {
      name: "comath.release.piCodexLifecycleInteractiveRealPi",
      description:
        "Render a read-only interactive real-Pi checkpoint UX over existing lifecycle evidence commands without calling comathd, mutating trusted state, proof authority, GA certification, or durable transport claims.",
      mutates: false,
      input_schema: objectSchema(["project_id", "actor", "pi_host_label", "session_id", "action"], {
        project_id: stringProp,
        actor: stringProp,
        pi_host_label: stringProp,
        session_id: stringProp,
        action: { type: "string", enum: [...PI_LIFECYCLE_INTERACTIVE_REAL_PI_ACTIONS] },
        session_kind: { type: "string", enum: [...PI_LIFECYCLE_WALKTHROUGH_SESSION_KINDS] },
        completed_steps: {
          type: "array",
          items: { type: "string", enum: [...PI_LIFECYCLE_INTERACTIVE_REAL_PI_STEPS] }
        },
        probe_id: stringProp,
        runtime_probe_path: stringProp,
        runtime_probe_sha256: stringProp,
        validation_id: stringProp,
        review_id: stringProp,
        operator_session_path: stringProp,
        operator_session_sha256: stringProp,
        session_manifest_path: stringProp,
        transport_recovery_id: stringProp,
        transport_recovery_path: stringProp,
        transport_recovery_sha256: stringProp,
        transport_lease_id: stringProp,
        transport_lease_path: stringProp,
        transport_lease_sha256: stringProp,
        transport_heartbeat_id: stringProp,
        transport_heartbeat_path: stringProp,
        transport_heartbeat_sha256: stringProp,
        execution_id: stringProp,
        guided_execution_path: stringProp,
        guided_execution_sha256: stringProp,
        terminal_review_id: stringProp,
        terminal_review_path: stringProp,
        terminal_review_sha256: stringProp,
        transport_contract_id: stringProp,
        transport_contract_path: stringProp,
        transport_contract_sha256: stringProp,
        orchestration_id: stringProp,
        automatic_orchestration_path: stringProp,
        automatic_orchestration_sha256: stringProp,
        continuity_id: stringProp,
        transport_continuity_path: stringProp,
        transport_continuity_sha256: stringProp,
        readiness_id: stringProp,
        handoff_review_path: stringProp,
        handoff_review_sha256: stringProp,
        pi_install_transcript_path: stringProp,
        runtime_registration_snapshot_path: stringProp,
        operator_event_cursor: stringProp,
        stdout_cursor: stringProp,
        stderr_cursor: stringProp,
        last_result_summary: stringProp
      })
    },
    {
      name: "comath.release.agentAdapterOsIsolationProbe",
      description:
        "Record service-owned agent adapter OS-isolation probe evidence through comathd without Pi direct writes, proof authority, GA certification, or sandbox enforcement claims.",
      mutates: true,
      input_schema: objectSchema(
        ["project_root", "project_id", "actor", "probe_id", "adapter_id", "backend"],
        {
          project_root: stringProp,
          project_id: stringProp,
          actor: stringProp,
          probe_id: stringProp,
          adapter_id: stringProp,
          backend: agentAdapterBackendProp,
          requested_provider: {
            type: "string",
            enum: [...AGENT_ADAPTER_OS_ISOLATION_PROVIDERS]
          },
          probe_environment: {
            type: "object",
            properties: {
              provider_available: { type: "boolean" },
              platform: stringProp,
              notes: stringProp
            }
          }
        }
      )
    },
    {
      name: "comath.release.agentAdapterOsIsolationSandboxExecutionProbe",
      description:
        "Record service-owned agent adapter OS-isolation sandbox execution probe evidence through comathd without Pi direct writes, proof authority, GA certification, or caller-certified sandbox enforcement.",
      mutates: true,
      input_schema: objectSchema(
        ["project_root", "project_id", "actor", "execution_id", "launch_id", "adapter_id", "backend"],
        {
          project_root: stringProp,
          project_id: stringProp,
          actor: stringProp,
          execution_id: stringProp,
          launch_id: stringProp,
          adapter_id: stringProp,
          backend: agentAdapterBackendProp,
          requested_provider: {
            type: "string",
            enum: [...AGENT_ADAPTER_OS_ISOLATION_PROVIDERS]
          },
          execution_environment: {
            type: "object",
            properties: {
              platform: stringProp,
              notes: stringProp,
              process_isolation_enforced: { type: "boolean" },
              filesystem_scope_enforced: { type: "boolean" },
              network_isolation_enforced: { type: "boolean" },
              no_new_privileges: { type: "boolean" },
              escape_prevention: { type: "boolean" },
              adapter_process_exit_code: numberProp,
              stdout_sha256: stringProp,
              stderr_sha256: stringProp,
              transcript_sha256: stringProp
            }
          }
        }
      )
    },
    {
      name: "comath.release.agentAdapterOsIsolationProviderHostCapabilityProbe",
      description:
        "Record service-owned provider host capability diagnostics through comathd without Pi direct writes, helper readiness, proof authority, OS-enforcement evidence, real-Pi evidence, or GA certification.",
      mutates: true,
      input_schema: objectSchema(
        ["project_root", "project_id", "actor", "host_capability_probe_id", "adapter_id", "backend"],
        {
          project_root: stringProp,
          project_id: stringProp,
          actor: stringProp,
          host_capability_probe_id: stringProp,
          adapter_id: stringProp,
          backend: agentAdapterBackendProp,
          requested_provider: {
            type: "string",
            enum: [...AGENT_ADAPTER_OS_ISOLATION_PROVIDERS]
          },
          host_capability_environment: {
            type: "object",
            properties: {
              platform: stringProp,
              notes: stringProp
            }
          }
        }
      )
    },
    {
      name: "comath.release.agentAdapterOsIsolationProviderHelperHostValidation",
      description:
        "Record service-owned provider-helper host validation diagnostics through comathd without Pi direct writes, readiness-review evidence, proof authority, OS-enforcement evidence, real-Pi evidence, or GA certification.",
      mutates: true,
      input_schema: objectSchema(
        [
          "project_root",
          "project_id",
          "actor",
          "host_validation_id",
          "host_capability_probe_id",
          "runner_id",
          "launch_id",
          "adapter_id",
          "backend"
        ],
        {
          project_root: stringProp,
          project_id: stringProp,
          actor: stringProp,
          host_validation_id: stringProp,
          host_capability_probe_id: stringProp,
          runner_id: stringProp,
          launch_id: stringProp,
          adapter_id: stringProp,
          backend: agentAdapterBackendProp,
          requested_provider: {
            type: "string",
            enum: [...AGENT_ADAPTER_OS_ISOLATION_PROVIDERS]
          },
          host_environment: {
            type: "object",
            properties: {
              platform: stringProp,
              notes: stringProp
            }
          }
        }
      )
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

function booleanOptionValue(args: string[], name: string): boolean | undefined {
  const value = optionValue(args, name);
  if (value === undefined) {
    return undefined;
  }
  if (value === "true") {
    return true;
  }
  if (value === "false") {
    return false;
  }
  throw new Error(`${name} must be true or false`);
}

function requiredBooleanOption(args: string[], name: string, field: string): boolean {
  const value = booleanOptionValue(args, name);
  if (value !== undefined) {
    return value;
  }
  throw new Error(`${field} is required`);
}

function optionValues(args: string[], name: string): string[] {
  const values: string[] = [];
  for (let index = 0; index < args.length; index += 1) {
    if (args[index] !== name) {
      continue;
    }
    const value = args[index + 1];
    if (value && !value.startsWith("--")) {
      values.push(value);
      index += 1;
    }
  }
  return values;
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

function positionalArgs(args: string[]): string[] {
  const values: string[] = [];
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg.startsWith("--")) {
      const next = args[index + 1];
      if (next && !next.startsWith("--")) {
        index += 1;
      }
      continue;
    }
    values.push(arg);
  }
  return values;
}

function parseReportSpec(value: string): { format: string; path: string } {
  const separator = value.indexOf(":");
  if (separator <= 0 || separator === value.length - 1) {
    throw new Error("report must use format:path");
  }
  return {
    format: value.slice(0, separator),
    path: value.slice(separator + 1)
  };
}

function readRecord(payload: Record<string, unknown>, field: string): Record<string, unknown> {
  const value = payload[field];
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  throw new Error(`${field} is required`);
}

function readOptionalRecord(payload: Record<string, unknown>, field: string): Record<string, unknown> | undefined {
  const value = payload[field];
  if (value === undefined) {
    return undefined;
  }
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  throw new Error(`${field} must be an object`);
}

function compactRecord(record: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(Object.entries(record).filter((entry) => entry[1] !== undefined));
}

function optionalRecordString(record: Record<string, unknown>, field: string): string | undefined {
  const value = readString(record, field, { optional: true });
  return value === undefined ? undefined : publicOperatorText(value);
}

function optionalRecordNumber(record: Record<string, unknown>, field: string): number | undefined {
  const value = record[field];
  if (value === undefined) {
    return undefined;
  }
  if (typeof value === "number" && Number.isFinite(value) && value >= 0) {
    return value;
  }
  throw new Error(`${field} must be a non-negative number`);
}

function optionalRecordStringArray(record: Record<string, unknown>, field: string): string[] | undefined {
  const value = record[field];
  if (value === undefined) {
    return undefined;
  }
  if (Array.isArray(value)) {
    return value.map((item) => publicOperatorText(String(item)));
  }
  throw new Error(`${field} must be an array`);
}

function optionalRawStringArray(record: Record<string, unknown>, field: string): string[] | undefined {
  const value = record[field];
  if (value === undefined) {
    return undefined;
  }
  if (Array.isArray(value)) {
    return value.map(String);
  }
  throw new Error(`${field} must be an array`);
}

function optionalSanitizedRecord(record: Record<string, unknown>, field: string): Record<string, unknown> | undefined {
  const value = readOptionalRecord(record, field);
  return value === undefined ? undefined : sanitizePublicProofAuthorityValue(value) as Record<string, unknown>;
}

function parseJsonRecord(value: string, field: string): Record<string, unknown> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(value);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`${field} must be a JSON object: ${message}`);
  }
  if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
    return parsed as Record<string, unknown>;
  }
  throw new Error(`${field} must be a JSON object`);
}

function requiredJsonRecordOption(args: string[], optionName: string, field: string): Record<string, unknown> {
  return parseJsonRecord(requiredOption(optionValue(args, optionName), field), field);
}

function optionalJsonRecordOption(args: string[], optionName: string, field: string): Record<string, unknown> | undefined {
  const value = optionValue(args, optionName);
  return value === undefined ? undefined : parseJsonRecord(value, field);
}

function sanitizeAutomaticRealPiRuntimeProbeCommand(record: Record<string, unknown>): Record<string, unknown> {
  return compactRecord({
    program: publicOperatorText(readString(record, "program")),
    args: optionalRawStringArray(record, "args")?.map((arg) => publicOperatorText(arg)),
    expected_exit_code: optionalRecordNumber(record, "expected_exit_code"),
    timeout_ms: optionalRecordNumber(record, "timeout_ms")
  });
}

function sanitizeAutomaticRealPiRuntimeProbeCommands(record: Record<string, unknown>): Record<string, unknown> {
  return {
    install: sanitizeAutomaticRealPiRuntimeProbeCommand(readRecord(record, "install")),
    runtime_registration: sanitizeAutomaticRealPiRuntimeProbeCommand(readRecord(record, "runtime_registration")),
    host_confirmation: sanitizeAutomaticRealPiRuntimeProbeCommand(readRecord(record, "host_confirmation"))
  };
}

function sanitizeAutomaticRealPiRuntimeProbeInput(record: Record<string, unknown>): Record<string, unknown> {
  return compactRecord({
    probe_id: optionalRecordString(record, "probe_id"),
    actor: optionalRecordString(record, "actor"),
    pi_host_label: optionalRecordString(record, "pi_host_label"),
    pi_host_kind: optionalRecordString(record, "pi_host_kind"),
    session_kind: optionalRecordString(record, "session_kind"),
    timeout_ms: optionalRecordNumber(record, "timeout_ms"),
    commands: sanitizeAutomaticRealPiRuntimeProbeCommands(readRecord(record, "commands"))
  });
}

function sanitizeAutomaticRealPiOperatorSessionInput(record: Record<string, unknown>): Record<string, unknown> {
  return compactRecord({
    session_id: optionalRecordString(record, "session_id"),
    actor: optionalRecordString(record, "actor"),
    session_status: optionalRecordString(record, "session_status"),
    operator_cursor: optionalRecordString(record, "operator_cursor"),
    completed_steps: optionalRecordStringArray(record, "completed_steps"),
    last_result_summary: optionalSanitizedRecord(record, "last_result_summary")
  });
}

function sanitizeAutomaticRealPiTransportRecoveryInput(record: Record<string, unknown>): Record<string, unknown> {
  return compactRecord({
    transport_recovery_id: optionalRecordString(record, "transport_recovery_id"),
    actor: optionalRecordString(record, "actor"),
    transport_kind: optionalRecordString(record, "transport_kind"),
    observed_route: optionalRecordString(record, "observed_route"),
    requested_cursor: optionalSanitizedRecord(record, "requested_cursor"),
    client_epoch: optionalRecordNumber(record, "client_epoch"),
    last_seen_event_id: optionalRecordString(record, "last_seen_event_id"),
    reconnect_reason: optionalRecordString(record, "reconnect_reason")
  });
}

function sanitizeAutomaticRealPiTransportLeaseInput(record: Record<string, unknown>): Record<string, unknown> {
  return compactRecord({
    transport_lease_id: optionalRecordString(record, "transport_lease_id"),
    actor: optionalRecordString(record, "actor"),
    transport_kind: optionalRecordString(record, "transport_kind"),
    lease_route: optionalRecordString(record, "lease_route"),
    requested_cursor: optionalSanitizedRecord(record, "requested_cursor"),
    client_epoch: optionalRecordNumber(record, "client_epoch"),
    heartbeat_interval_ms: optionalRecordNumber(record, "heartbeat_interval_ms"),
    lease_ttl_ms: optionalRecordNumber(record, "lease_ttl_ms"),
    last_seen_event_id: optionalRecordString(record, "last_seen_event_id"),
    open_reason: optionalRecordString(record, "open_reason")
  });
}

function sanitizeAutomaticRealPiTransportHeartbeatInput(record: Record<string, unknown>): Record<string, unknown> {
  return compactRecord({
    transport_heartbeat_id: optionalRecordString(record, "transport_heartbeat_id"),
    actor: optionalRecordString(record, "actor"),
    requested_cursor: optionalSanitizedRecord(record, "requested_cursor"),
    client_epoch: optionalRecordNumber(record, "client_epoch"),
    last_seen_event_id: optionalRecordString(record, "last_seen_event_id"),
    heartbeat_reason: optionalRecordString(record, "heartbeat_reason")
  });
}

function sanitizeAutomaticRealPiGuidedExecutionInput(record: Record<string, unknown>): Record<string, unknown> {
  return compactRecord({
    execution_id: optionalRecordString(record, "execution_id"),
    actor: optionalRecordString(record, "actor"),
    observed_routes: optionalRecordStringArray(record, "observed_routes"),
    operator_command_summary: optionalRecordString(record, "operator_command_summary"),
    final_operator_cursor: optionalSanitizedRecord(record, "final_operator_cursor"),
    execution_outcome: optionalRecordString(record, "execution_outcome"),
    next_recommended_route: optionalRecordString(record, "next_recommended_route")
  });
}

function sanitizeAutomaticRealPiTerminalReviewInput(record: Record<string, unknown>): Record<string, unknown> {
  return compactRecord({
    review_id: optionalRecordString(record, "review_id"),
    actor: optionalRecordString(record, "actor")
  });
}

function sanitizeAutomaticRealPiTransportContractInput(record: Record<string, unknown>): Record<string, unknown> {
  return compactRecord({
    transport_contract_id: optionalRecordString(record, "transport_contract_id"),
    actor: optionalRecordString(record, "actor"),
    max_bytes: optionalRecordNumber(record, "max_bytes"),
    max_events: optionalRecordNumber(record, "max_events"),
    retry_ms: optionalRecordNumber(record, "retry_ms"),
    service_transport_primitive: optionalRecordString(record, "service_transport_primitive"),
    client_transport_primitive: optionalRecordString(record, "client_transport_primitive")
  });
}

function parseSurfaceSpec(value: string): Record<string, unknown> {
  const parts = value.split(":");
  if (parts.length < 2) {
    throw new Error("surface must use surface_id:surface_kind[:manifest_path]");
  }
  const [surfaceId, surfaceKind, ...pathParts] = parts;
  const manifestPath = pathParts.join(":");
  return {
    surface_id: requiredOption(surfaceId, "surface_id"),
    surface_kind: requiredOption(surfaceKind, "surface_kind"),
    ...(manifestPath ? { manifest_path: manifestPath } : {})
  };
}

function parseLifecycleOperatorSessionArtifact(value: string): Record<string, unknown> {
  const separator = value.indexOf("=");
  if (separator <= 0 || separator === value.length - 1) {
    throw new Error("operator-session artifact must use kind=path");
  }
  return {
    kind: requiredOption(value.slice(0, separator), "artifact_kind"),
    path: requiredOption(value.slice(separator + 1), "artifact_path")
  };
}

function parseLifecycleOperatorTransportCursor(args: string[]): Record<string, unknown> | undefined {
  const operatorEventCursor = optionValue(args, "--operator-event-cursor");
  const stdoutCursor = optionValue(args, "--stdout-cursor");
  const stderrCursor = optionValue(args, "--stderr-cursor");
  if (operatorEventCursor === undefined && stdoutCursor === undefined && stderrCursor === undefined) {
    return undefined;
  }
  return {
    ...(operatorEventCursor === undefined ? {} : { operator_event_cursor: operatorEventCursor }),
    ...(stdoutCursor === undefined ? {} : { stdout_cursor: stdoutCursor }),
    ...(stderrCursor === undefined ? {} : { stderr_cursor: stderrCursor })
  };
}

function parsePiCodexLifecycleInstallSessionEvidence(args: string[]): Record<string, unknown> {
  return {
    session_kind: requiredOption(optionValue(args, "--session-kind"), "session_kind"),
    pi_host_kind: requiredOption(optionValue(args, "--pi-host-kind"), "pi_host_kind"),
    runtime_entrypoint_imported: requiredBooleanOption(args, "--runtime-entrypoint-imported", "runtime_entrypoint_imported"),
    runtime_registered: requiredBooleanOption(args, "--runtime-registered", "runtime_registered"),
    host_confirmation_observed: requiredBooleanOption(args, "--host-confirmation-observed", "host_confirmation_observed"),
    comathd_server_kind: requiredOption(optionValue(args, "--comathd-server-kind"), "comathd_server_kind"),
    service_start_observed: requiredBooleanOption(args, "--service-start-observed", "service_start_observed"),
    service_stop_observed: requiredBooleanOption(args, "--service-stop-observed", "service_stop_observed"),
    service_restart_observed: requiredBooleanOption(args, "--service-restart-observed", "service_restart_observed")
  };
}

function parsePiCodexLifecycleCodexEvidence(args: string[]): Record<string, unknown> {
  return {
    installed_cli_validation_ok: requiredBooleanOption(args, "--installed-cli-validation-ok", "installed_cli_validation_ok"),
    installed_cli_probe_source: requiredOption(optionValue(args, "--installed-cli-probe-source"), "installed_cli_probe_source"),
    codex_api_account_network_validation: requiredOption(
      optionValue(args, "--codex-api-account-network-validation"),
      "codex_api_account_network_validation"
    )
  };
}

function parsePiRealPiRuntimeProbeCommand(
  args: string[],
  optionPrefix: "install" | "runtime-registration" | "host-confirmation",
  fieldPrefix: string
): Record<string, unknown> {
  const expectedExitCode = numberOptionValue(args, `--${optionPrefix}-expected-exit-code`);
  const timeoutMs = numberOptionValue(args, `--${optionPrefix}-timeout-ms`);
  return {
    program: requiredOption(optionValue(args, `--${optionPrefix}-program`), `${fieldPrefix}_program`),
    args: optionValues(args, `--${optionPrefix}-arg`),
    ...(expectedExitCode === undefined ? {} : { expected_exit_code: expectedExitCode }),
    ...(timeoutMs === undefined ? {} : { timeout_ms: timeoutMs })
  };
}

function parsePiRealPiRuntimeProbeCommands(args: string[]): Record<string, unknown> {
  return {
    install: parsePiRealPiRuntimeProbeCommand(args, "install", "install"),
    runtime_registration: parsePiRealPiRuntimeProbeCommand(
      args,
      "runtime-registration",
      "runtime_registration"
    ),
    host_confirmation: parsePiRealPiRuntimeProbeCommand(args, "host-confirmation", "host_confirmation")
  };
}

function requiredOption(value: string | undefined, field: string): string {
  if (value) {
    return value;
  }
  throw new Error(`${field} is required`);
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
    `Allow ${target} to mutate trusted CoMath state through comathd? ${JSON.stringify(sanitizePublicDisplayValue(params))}`
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
    await notify(JSON.stringify(sanitizePublicDisplayValue(result)), "info");
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
  if (subcommand === "resume") {
    const tool = createComathTools().find((descriptor) => descriptor.name === "comath.campaign.resume");
    if (!tool) {
      throw new Error("campaign resume tool is not registered");
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
  if (subcommand === "cancel") {
    const tool = createComathTools().find((descriptor) => descriptor.name === "comath.campaign.cancel");
    if (!tool) {
      throw new Error("campaign cancel tool is not registered");
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
  if (subcommand === "export") {
    await notifyRuntimeResult(ctx, await executeComathTool(client, "comath.campaign.export", base));
    return;
  }
  if (subcommand === "final-audit") {
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
          ...base,
          actor: actorFrom(options, parsed.args)
        },
        ctx
      )
    );
    return;
  }
  if (subcommand === "replay") {
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
          ...base,
          actor: actorFrom(options, parsed.args)
        },
        ctx
      )
    );
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

async function handleAgentCommand(
  client: ComathClient,
  options: RegisterComathPiRuntimeOptions,
  args: string,
  ctx: unknown
): Promise<void> {
  const parsed = parseComathCommand(`/cm:agent ${args}`.trim());
  if (!parsed || parsed.action !== "agent") {
    throw new Error("agent command is required");
  }
  const subcommand = parsed.subcommand ?? "profiles";
  if (subcommand === "profiles") {
    const globalRpm = numberOptionValue(parsed.args, "--global-rpm") ?? 4;
    await notifyRuntimeResult(ctx, await executeComathTool(client, "comath.agent.profileList", { global_rpm: globalRpm }));
    return;
  }
  if (subcommand === "packages") {
    await notifyRuntimeResult(ctx, await executeComathTool(client, "comath.agent.adapterPackageList", {}));
    return;
  }
  if (subcommand === "profile") {
    const profileId = optionValue(parsed.args, "--profile") ?? firstPositional(parsed.args);
    if (!profileId) {
      throw new Error("profile_id is required");
    }
    await notifyRuntimeResult(ctx, await executeComathTool(client, "comath.agent.profileGet", { profile_id: profileId }));
    return;
  }
  if (subcommand === "prepare-package") {
    const adapterId = requiredOption(optionValue(parsed.args, "--adapter") ?? firstPositional(parsed.args), "adapter_id");
    const profileId = requiredOption(optionValue(parsed.args, "--profile"), "profile_id");
    const projectId = requiredOption(optionValue(parsed.args, "--project-id"), "project_id");
    const runId = requiredOption(optionValue(parsed.args, "--run-id"), "run_id");
    const goal = requiredOption(optionValue(parsed.args, "--goal"), "goal");
    const contextPath = requiredOption(optionValue(parsed.args, "--context"), "context_path");
    const tool = createComathTools().find((descriptor) => descriptor.name === "comath.agent.prepareAdapterPackage");
    if (!tool) {
      throw new Error("agent adapter package prepare tool is not registered");
    }
    await notifyRuntimeResult(
      ctx,
      await executeRuntimeToolWithHostConfirmation(
        client,
        tool,
        {
          project_root: projectRootFrom(options, parsed.args),
          project_id: projectId,
          run_id: runId,
          profile_id: profileId,
          adapter_id: adapterId,
          backend: optionValue(parsed.args, "--backend"),
          goal,
          context_path: contextPath,
          actor: actorFrom(options, parsed.args)
        },
        ctx
      )
    );
    return;
  }
  if (subcommand === "execute-package") {
    const adapterId = requiredOption(optionValue(parsed.args, "--adapter") ?? firstPositional(parsed.args), "adapter_id");
    const profileId = requiredOption(optionValue(parsed.args, "--profile"), "profile_id");
    const projectId = requiredOption(optionValue(parsed.args, "--project-id"), "project_id");
    const workstreamId = requiredOption(optionValue(parsed.args, "--workstream-id"), "workstream_id");
    const goal = requiredOption(optionValue(parsed.args, "--goal"), "goal");
    const contextPath = requiredOption(optionValue(parsed.args, "--context"), "context_path");
    const tool = createComathTools().find((descriptor) => descriptor.name === "comath.agent.executeAdapterPackage");
    if (!tool) {
      throw new Error("agent adapter package execute tool is not registered");
    }
    await notifyRuntimeResult(
      ctx,
      await executeRuntimeToolWithHostConfirmation(
        client,
        tool,
        {
          project_root: projectRootFrom(options, parsed.args),
          project_id: projectId,
          campaign_id: optionValue(parsed.args, "--campaign-id"),
          workstream_id: workstreamId,
          profile_id: profileId,
          adapter_id: adapterId,
          backend: optionValue(parsed.args, "--backend"),
          goal,
          context_path: contextPath,
          actor: actorFrom(options, parsed.args)
        },
        ctx
      )
    );
    return;
  }
  if (subcommand === "run") {
    const profileId = requiredOption(optionValue(parsed.args, "--profile") ?? firstPositional(parsed.args), "profile_id");
    const projectId = requiredOption(optionValue(parsed.args, "--project-id"), "project_id");
    const workstreamId = requiredOption(optionValue(parsed.args, "--workstream-id"), "workstream_id");
    const tool = createComathTools().find((descriptor) => descriptor.name === "comath.agent.runForProfile");
    if (!tool) {
      throw new Error("agent profile run tool is not registered");
    }
    await notifyRuntimeResult(
      ctx,
      await executeRuntimeToolWithHostConfirmation(
        client,
        tool,
        {
          project_root: projectRootFrom(options, parsed.args),
          project_id: projectId,
          campaign_id: optionValue(parsed.args, "--campaign-id"),
          workstream_id: workstreamId,
          profile_id: profileId,
          actor: actorFrom(options, parsed.args)
        },
        ctx
      )
    );
    return;
  }
  if (subcommand === "prepare-launch") {
    const profileId = requiredOption(optionValue(parsed.args, "--profile") ?? firstPositional(parsed.args), "profile_id");
    const projectId = requiredOption(optionValue(parsed.args, "--project-id"), "project_id");
    const runId = requiredOption(optionValue(parsed.args, "--run-id"), "run_id");
    const program = requiredOption(optionValue(parsed.args, "--program"), "program");
    const goal = requiredOption(optionValue(parsed.args, "--goal"), "goal");
    const contextPath = requiredOption(optionValue(parsed.args, "--context"), "context_path");
    const tool = createComathTools().find((descriptor) => descriptor.name === "comath.agent.prepareLaunch");
    if (!tool) {
      throw new Error("agent profile launch tool is not registered");
    }
    await notifyRuntimeResult(
      ctx,
      await executeRuntimeToolWithHostConfirmation(
        client,
        tool,
        {
          project_root: projectRootFrom(options, parsed.args),
          project_id: projectId,
          run_id: runId,
          profile_id: profileId,
          program,
          goal,
          context_path: contextPath,
          actor: actorFrom(options, parsed.args)
        },
        ctx
      )
    );
    return;
  }
  if (subcommand === "execute") {
    const profileId = requiredOption(optionValue(parsed.args, "--profile") ?? firstPositional(parsed.args), "profile_id");
    const projectId = requiredOption(optionValue(parsed.args, "--project-id"), "project_id");
    const workstreamId = requiredOption(optionValue(parsed.args, "--workstream-id"), "workstream_id");
    const program = requiredOption(optionValue(parsed.args, "--program"), "program");
    const goal = requiredOption(optionValue(parsed.args, "--goal"), "goal");
    const contextPath = requiredOption(optionValue(parsed.args, "--context"), "context_path");
    const tool = createComathTools().find((descriptor) => descriptor.name === "comath.agent.executeProfile");
    if (!tool) {
      throw new Error("agent profile execute tool is not registered");
    }
    await notifyRuntimeResult(
      ctx,
      await executeRuntimeToolWithHostConfirmation(
        client,
        tool,
        {
          project_root: projectRootFrom(options, parsed.args),
          project_id: projectId,
          campaign_id: optionValue(parsed.args, "--campaign-id"),
          workstream_id: workstreamId,
          profile_id: profileId,
          program,
          adapter_args: optionValues(parsed.args, "--adapter-arg"),
          goal,
          context_path: contextPath,
          actor: actorFrom(options, parsed.args)
        },
        ctx
      )
    );
    return;
  }
  if (subcommand === "logs") {
    const projectId = requiredOption(optionValue(parsed.args, "--project-id"), "project_id");
    const runId = requiredOption(optionValue(parsed.args, "--run-id") ?? firstPositional(parsed.args), "run_id");
    await notifyRuntimeResult(
      ctx,
      await executeComathTool(client, "comath.agent.logs", {
        project_root: projectRootFrom(options, parsed.args),
        project_id: projectId,
        run_id: runId,
        max_bytes: numberOptionValue(parsed.args, "--max-bytes")
      })
    );
    return;
  }
  if (subcommand === "stream") {
    const projectId = requiredOption(optionValue(parsed.args, "--project-id"), "project_id");
    const runId = requiredOption(optionValue(parsed.args, "--run-id") ?? firstPositional(parsed.args), "run_id");
    await notifyRuntimeResult(
      ctx,
      await executeComathTool(client, "comath.agent.streamLogs", {
        project_root: projectRootFrom(options, parsed.args),
        project_id: projectId,
        run_id: runId,
        stdout_cursor: numberOptionValue(parsed.args, "--stdout-cursor"),
        stderr_cursor: numberOptionValue(parsed.args, "--stderr-cursor"),
        max_bytes: numberOptionValue(parsed.args, "--max-bytes"),
        actor: actorFrom(options, parsed.args)
      })
    );
    return;
  }
  if (subcommand === "subscribe-logs") {
    const projectId = requiredOption(optionValue(parsed.args, "--project-id"), "project_id");
    const runId = requiredOption(optionValue(parsed.args, "--run-id") ?? firstPositional(parsed.args), "run_id");
    await notifyRuntimeResult(
      ctx,
      await executeComathTool(client, "comath.agent.subscribeLogs", {
        project_root: projectRootFrom(options, parsed.args),
        project_id: projectId,
        run_id: runId,
        stdout_cursor: numberOptionValue(parsed.args, "--stdout-cursor"),
        stderr_cursor: numberOptionValue(parsed.args, "--stderr-cursor"),
        max_bytes: numberOptionValue(parsed.args, "--max-bytes"),
        retry_ms: numberOptionValue(parsed.args, "--retry-ms"),
        actor: actorFrom(options, parsed.args)
      })
    );
    return;
  }
  if (subcommand === "log-session") {
    const projectId = requiredOption(optionValue(parsed.args, "--project-id"), "project_id");
    const runId = requiredOption(optionValue(parsed.args, "--run-id") ?? firstPositional(parsed.args), "run_id");
    await notifyRuntimeResult(
      ctx,
      await executeComathTool(client, "comath.agent.logSession", {
        project_root: projectRootFrom(options, parsed.args),
        project_id: projectId,
        run_id: runId,
        stdout_cursor: numberOptionValue(parsed.args, "--stdout-cursor"),
        stderr_cursor: numberOptionValue(parsed.args, "--stderr-cursor"),
        max_bytes: numberOptionValue(parsed.args, "--max-bytes"),
        max_events: numberOptionValue(parsed.args, "--max-events"),
        retry_ms: numberOptionValue(parsed.args, "--retry-ms"),
        actor: actorFrom(options, parsed.args)
      })
    );
    return;
  }
  if (subcommand === "panel") {
    const projectId = requiredOption(optionValue(parsed.args, "--project-id"), "project_id");
    const runId = requiredOption(optionValue(parsed.args, "--run-id") ?? firstPositional(parsed.args), "run_id");
    await notifyRuntimeResult(
      ctx,
      await executeComathTool(client, "comath.agent.operatorPanel", {
        project_root: projectRootFrom(options, parsed.args),
        project_id: projectId,
        run_id: runId,
        stdout_cursor: numberOptionValue(parsed.args, "--stdout-cursor"),
        stderr_cursor: numberOptionValue(parsed.args, "--stderr-cursor"),
        max_bytes: numberOptionValue(parsed.args, "--max-bytes"),
        actor: actorFrom(options, parsed.args)
      })
    );
    return;
  }
  if (subcommand === "cancel") {
    const projectId = requiredOption(optionValue(parsed.args, "--project-id"), "project_id");
    const runId = requiredOption(optionValue(parsed.args, "--run-id") ?? firstPositional(parsed.args), "run_id");
    const tool = createComathTools().find((descriptor) => descriptor.name === "comath.agent.cancelRun");
    if (!tool) {
      throw new Error("agent cancel tool is not registered");
    }
    await notifyRuntimeResult(
      ctx,
      await executeRuntimeToolWithHostConfirmation(
        client,
        tool,
        {
          project_root: projectRootFrom(options, parsed.args),
          project_id: projectId,
          run_id: runId,
          actor: actorFrom(options, parsed.args)
        },
        ctx
      )
    );
    return;
  }
  if (subcommand === "health") {
    const profileId = requiredOption(optionValue(parsed.args, "--profile") ?? firstPositional(parsed.args), "profile_id");
    const projectId = requiredOption(optionValue(parsed.args, "--project-id"), "project_id");
    const program = requiredOption(optionValue(parsed.args, "--program"), "program");
    const tool = createComathTools().find((descriptor) => descriptor.name === "comath.agent.health");
    if (!tool) {
      throw new Error("agent health tool is not registered");
    }
    await notifyRuntimeResult(
      ctx,
      await executeRuntimeToolWithHostConfirmation(
        client,
        tool,
        {
          project_root: projectRootFrom(options, parsed.args),
          project_id: projectId,
          profile_id: profileId,
          program,
          adapter_args: optionValues(parsed.args, "--adapter-arg"),
          timeout_ms: numberOptionValue(parsed.args, "--timeout-ms"),
          actor: actorFrom(options, parsed.args)
        },
        ctx
      )
    );
    return;
  }
  throw new Error(`unsupported agent command: ${subcommand}`);
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

async function handleSnapshotCommand(
  client: ComathClient,
  options: RegisterComathPiRuntimeOptions,
  args: string,
  ctx: unknown
): Promise<void> {
  const parsed = parseComathCommand(`/cm:snapshot ${args}`.trim());
  if (!parsed || parsed.action !== "snapshot") {
    throw new Error("snapshot command is required");
  }
  const subcommand = parsed.subcommand ?? "verify";
  const positionals = positionalArgs(parsed.args);
  if (subcommand === "export") {
    const tool = createComathTools().find((descriptor) => descriptor.name === "comath.snapshot.export");
    if (!tool) {
      throw new Error("snapshot export tool is not registered");
    }
    const projectRoot = optionValue(parsed.args, "--project-root") ?? positionals[0] ?? options.project_root;
    if (!projectRoot) {
      throw new Error("project_root is required");
    }
    await notifyRuntimeResult(
      ctx,
      await executeRuntimeToolWithHostConfirmation(
        client,
        tool,
        {
          project_root: projectRoot,
          project_id: requiredOption(optionValue(parsed.args, "--project-id"), "project_id"),
          actor: actorFrom(options, parsed.args)
        },
        ctx
      )
    );
    return;
  }
  if (subcommand === "verify") {
    const manifestPath = optionValue(parsed.args, "--manifest-path") ?? positionals[0];
    const projectRoot = optionValue(parsed.args, "--project-root") ?? options.project_root;
    await notifyRuntimeResult(
      ctx,
      await executeComathTool(client, "comath.snapshot.verify", {
        ...(projectRoot ? { project_root: projectRoot } : {}),
        manifest_path: requiredOption(manifestPath, "manifest_path")
      })
    );
    return;
  }
  if (subcommand === "restore") {
    const tool = createComathTools().find((descriptor) => descriptor.name === "comath.snapshot.restore");
    if (!tool) {
      throw new Error("snapshot restore tool is not registered");
    }
    const manifestPath = optionValue(parsed.args, "--manifest-path") ?? positionals[0];
    const targetRoot = optionValue(parsed.args, "--target-root") ?? positionals[1];
    const projectRoot = optionValue(parsed.args, "--project-root") ?? options.project_root;
    await notifyRuntimeResult(
      ctx,
      await executeRuntimeToolWithHostConfirmation(
        client,
        tool,
        {
          ...(projectRoot ? { project_root: projectRoot } : {}),
          manifest_path: requiredOption(manifestPath, "manifest_path"),
          target_root: requiredOption(targetRoot, "target_root"),
          actor: actorFrom(options, parsed.args)
        },
        ctx
      )
    );
    return;
  }
  if (subcommand === "verify-manifest") {
    const manifestPath = optionValue(parsed.args, "--manifest-path") ?? positionals[0];
    const projectRoot = optionValue(parsed.args, "--project-root") ?? options.project_root;
    await notifyRuntimeResult(
      ctx,
      await executeComathTool(client, "comath.replay.verifyManifest", {
        ...(projectRoot ? { project_root: projectRoot } : {}),
        manifest_path: requiredOption(manifestPath, "manifest_path")
      })
    );
    return;
  }
  throw new Error(`unsupported snapshot command: ${subcommand}`);
}

async function handleReleaseCommand(
  client: ComathClient,
  options: RegisterComathPiRuntimeOptions,
  args: string,
  ctx: unknown
): Promise<void> {
  const parsed = parseComathCommand(`/cm:release ${args}`.trim());
  if (!parsed || parsed.action !== "release") {
    throw new Error("release command is required");
  }
  const subcommand = parsed.subcommand ?? "review";
  if (subcommand === "source-review") {
    const tool = createComathTools().find((descriptor) => descriptor.name === "comath.release.sourceReviewPublicArchive");
    if (!tool) {
      throw new Error("source-review public archive tool is not registered");
    }
    const reports = optionValues(parsed.args, "--report").map(parseReportSpec);
    await notifyRuntimeResult(
      ctx,
      await executeRuntimeToolWithHostConfirmation(
        client,
        tool,
        {
          project_root: projectRootFrom(options, parsed.args),
          project_id: requiredOption(optionValue(parsed.args, "--project-id"), "project_id"),
          actor: actorFrom(options, parsed.args),
          archive_id: optionValue(parsed.args, "--archive-id"),
          reports
        },
        ctx
      )
    );
    return;
  }
  if (subcommand === "review") {
    const tool = createComathTools().find((descriptor) => descriptor.name === "comath.release.publicArchiveReview");
    if (!tool) {
      throw new Error("public archive review tool is not registered");
    }
    const surfaces = optionValues(parsed.args, "--surface").map(parseSurfaceSpec);
    await notifyRuntimeResult(
      ctx,
      await executeRuntimeToolWithHostConfirmation(
        client,
        tool,
        {
          project_root: projectRootFrom(options, parsed.args),
          project_id: requiredOption(optionValue(parsed.args, "--project-id"), "project_id"),
          actor: actorFrom(options, parsed.args),
          review_id: optionValue(parsed.args, "--review-id"),
          surfaces
        },
        ctx
      )
    );
    return;
  }
  if (subcommand === "pi-codex-lifecycle") {
    const tool = createComathTools().find((descriptor) => descriptor.name === "comath.release.piCodexLifecycleReview");
    if (!tool) {
      throw new Error("Pi/Codex lifecycle review tool is not registered");
    }
    await notifyRuntimeResult(
      ctx,
      await executeRuntimeToolWithHostConfirmation(
        client,
        tool,
        {
          project_root: projectRootFrom(options, parsed.args),
          project_id: requiredOption(optionValue(parsed.args, "--project-id"), "project_id"),
          actor: actorFrom(options, parsed.args),
          review_id: optionValue(parsed.args, "--review-id"),
          install_session_evidence: parsePiCodexLifecycleInstallSessionEvidence(parsed.args),
          codex_evidence: parsePiCodexLifecycleCodexEvidence(parsed.args)
        },
        ctx
      )
    );
    return;
  }
  if (subcommand === "codex-api-probe") {
    const tool = createComathTools().find((descriptor) => descriptor.name === "comath.release.piCodexApiProbe");
    if (!tool) {
      throw new Error("Pi/Codex Codex API probe tool is not registered");
    }
    await notifyRuntimeResult(
      ctx,
      await executeRuntimeToolWithHostConfirmation(
        client,
        tool,
        {
          project_root: projectRootFrom(options, parsed.args),
          project_id: requiredOption(optionValue(parsed.args, "--project-id"), "project_id"),
          actor: actorFrom(options, parsed.args),
          validation_id: optionValue(parsed.args, "--validation-id")
        },
        ctx
      )
    );
    return;
  }
  if (subcommand === "real-pi-runtime-probe") {
    const tool = createComathTools().find((descriptor) => descriptor.name === "comath.release.piRealPiRuntimeProbe");
    if (!tool) {
      throw new Error("Pi/Codex real-Pi runtime probe tool is not registered");
    }
    await notifyRuntimeResult(
      ctx,
      await executeRuntimeToolWithHostConfirmation(
        client,
        tool,
        {
          project_root: projectRootFrom(options, parsed.args),
          project_id: requiredOption(optionValue(parsed.args, "--project-id"), "project_id"),
          actor: actorFrom(options, parsed.args),
          probe_id: optionValue(parsed.args, "--probe-id"),
          pi_host_label: requiredOption(optionValue(parsed.args, "--pi-host-label"), "pi_host_label"),
          pi_host_kind: optionValue(parsed.args, "--pi-host-kind") ?? "real_pi_host",
          session_kind: requiredOption(optionValue(parsed.args, "--session-kind"), "session_kind"),
          timeout_ms: numberOptionValue(parsed.args, "--timeout-ms"),
          commands: parsePiRealPiRuntimeProbeCommands(parsed.args)
        },
        ctx
      )
    );
    return;
  }
  if (subcommand === "lifecycle-control") {
    const action = requiredOption(optionValue(parsed.args, "--action") ?? firstPositional(parsed.args), "action");
    if (action === "plan" || action === "status") {
      await notifyRuntimeResult(
        ctx,
        await executeComathTool(client, "comath.release.piCodexLifecycleControl", {
          project_id: requiredOption(optionValue(parsed.args, "--project-id"), "project_id"),
          actor: actorFrom(options, parsed.args),
          pi_host_label: requiredOption(optionValue(parsed.args, "--pi-host-label"), "pi_host_label"),
          action,
          session_kind: optionValue(parsed.args, "--session-kind"),
          probe_id: optionValue(parsed.args, "--probe-id"),
          validation_id: optionValue(parsed.args, "--validation-id"),
          review_id: optionValue(parsed.args, "--review-id")
        })
      );
      return;
    }
    if (action === "run-real-pi-runtime-probe") {
      const tool = createComathTools().find((descriptor) => descriptor.name === "comath.release.piRealPiRuntimeProbe");
      if (!tool) {
        throw new Error("Pi/Codex real-Pi runtime probe tool is not registered");
      }
      await notifyRuntimeResult(
        ctx,
        await executeRuntimeToolWithHostConfirmation(
          client,
          tool,
          {
            project_root: projectRootFrom(options, parsed.args),
            project_id: requiredOption(optionValue(parsed.args, "--project-id"), "project_id"),
            actor: actorFrom(options, parsed.args),
            probe_id: optionValue(parsed.args, "--probe-id"),
            pi_host_label: requiredOption(optionValue(parsed.args, "--pi-host-label"), "pi_host_label"),
            pi_host_kind: optionValue(parsed.args, "--pi-host-kind") ?? "real_pi_host",
            session_kind: requiredOption(optionValue(parsed.args, "--session-kind"), "session_kind"),
            timeout_ms: numberOptionValue(parsed.args, "--timeout-ms"),
            commands: parsePiRealPiRuntimeProbeCommands(parsed.args)
          },
          ctx
        )
      );
      return;
    }
    if (action === "run-codex-api-probe") {
      const tool = createComathTools().find((descriptor) => descriptor.name === "comath.release.piCodexApiProbe");
      if (!tool) {
        throw new Error("Pi/Codex Codex API probe tool is not registered");
      }
      await notifyRuntimeResult(
        ctx,
        await executeRuntimeToolWithHostConfirmation(
          client,
          tool,
          {
            project_root: projectRootFrom(options, parsed.args),
            project_id: requiredOption(optionValue(parsed.args, "--project-id"), "project_id"),
            actor: actorFrom(options, parsed.args),
            validation_id: optionValue(parsed.args, "--validation-id")
          },
          ctx
        )
      );
      return;
    }
    if (action === "review") {
      const tool = createComathTools().find((descriptor) => descriptor.name === "comath.release.piCodexLifecycleReview");
      if (!tool) {
        throw new Error("Pi/Codex lifecycle review tool is not registered");
      }
      await notifyRuntimeResult(
        ctx,
        await executeRuntimeToolWithHostConfirmation(
          client,
          tool,
          {
            project_root: projectRootFrom(options, parsed.args),
            project_id: requiredOption(optionValue(parsed.args, "--project-id"), "project_id"),
            actor: actorFrom(options, parsed.args),
            review_id: optionValue(parsed.args, "--review-id"),
            install_session_evidence: parsePiCodexLifecycleInstallSessionEvidence(parsed.args),
            codex_evidence: parsePiCodexLifecycleCodexEvidence(parsed.args)
          },
          ctx
        )
      );
      return;
    }
    throw new Error(`unsupported lifecycle-control action: ${action}`);
  }
  if (subcommand === "lifecycle-session") {
    const action = requiredOption(optionValue(parsed.args, "--action") ?? firstPositional(parsed.args), "action");
    await notifyRuntimeResult(
      ctx,
      await executeComathTool(client, "comath.release.piCodexLifecycleSession", {
        project_id: requiredOption(optionValue(parsed.args, "--project-id"), "project_id"),
        actor: actorFrom(options, parsed.args),
        pi_host_label: requiredOption(optionValue(parsed.args, "--pi-host-label"), "pi_host_label"),
        session_id: requiredOption(optionValue(parsed.args, "--session-id"), "session_id"),
        action,
        session_kind: optionValue(parsed.args, "--session-kind"),
        probe_id: optionValue(parsed.args, "--probe-id"),
        validation_id: optionValue(parsed.args, "--validation-id"),
        review_id: optionValue(parsed.args, "--review-id"),
        current_step: optionValue(parsed.args, "--current-step"),
        completed_steps: optionValues(parsed.args, "--completed-step"),
        stdout_cursor: optionValue(parsed.args, "--stdout-cursor"),
        stderr_cursor: optionValue(parsed.args, "--stderr-cursor"),
        last_result_summary: optionValue(parsed.args, "--last-result-summary")
      })
    );
    return;
  }
  if (subcommand === "lifecycle-interactive-real-pi") {
    const action = requiredOption(optionValue(parsed.args, "--action") ?? firstPositional(parsed.args), "action");
    await notifyRuntimeResult(
      ctx,
      await executeComathTool(client, "comath.release.piCodexLifecycleInteractiveRealPi", {
        project_id: requiredOption(optionValue(parsed.args, "--project-id"), "project_id"),
        actor: actorFrom(options, parsed.args),
        pi_host_label: requiredOption(optionValue(parsed.args, "--pi-host-label"), "pi_host_label"),
        session_id: requiredOption(optionValue(parsed.args, "--session-id"), "session_id"),
        action,
        session_kind: optionValue(parsed.args, "--session-kind"),
        completed_steps: optionValues(parsed.args, "--completed-step"),
        probe_id: optionValue(parsed.args, "--probe-id"),
        runtime_probe_path: optionValue(parsed.args, "--runtime-probe-path"),
        runtime_probe_sha256: optionValue(parsed.args, "--runtime-probe-sha256"),
        validation_id: optionValue(parsed.args, "--validation-id"),
        review_id: optionValue(parsed.args, "--review-id"),
        operator_session_path: optionValue(parsed.args, "--operator-session-path"),
        operator_session_sha256: optionValue(parsed.args, "--operator-session-sha256"),
        session_manifest_path: optionValue(parsed.args, "--session-manifest-path"),
        transport_recovery_id: optionValue(parsed.args, "--transport-recovery-id"),
        transport_recovery_path: optionValue(parsed.args, "--transport-recovery-path"),
        transport_recovery_sha256: optionValue(parsed.args, "--transport-recovery-sha256"),
        transport_lease_id: optionValue(parsed.args, "--transport-lease-id"),
        transport_lease_path: optionValue(parsed.args, "--transport-lease-path"),
        transport_lease_sha256: optionValue(parsed.args, "--transport-lease-sha256"),
        transport_heartbeat_id: optionValue(parsed.args, "--transport-heartbeat-id"),
        transport_heartbeat_path: optionValue(parsed.args, "--transport-heartbeat-path"),
        transport_heartbeat_sha256: optionValue(parsed.args, "--transport-heartbeat-sha256"),
        execution_id: optionValue(parsed.args, "--execution-id"),
        guided_execution_path: optionValue(parsed.args, "--guided-execution-path"),
        guided_execution_sha256: optionValue(parsed.args, "--guided-execution-sha256"),
        terminal_review_id: optionValue(parsed.args, "--terminal-review-id"),
        terminal_review_path: optionValue(parsed.args, "--terminal-review-path"),
        terminal_review_sha256: optionValue(parsed.args, "--terminal-review-sha256"),
        transport_contract_id: optionValue(parsed.args, "--transport-contract-id"),
        transport_contract_path: optionValue(parsed.args, "--transport-contract-path"),
        transport_contract_sha256: optionValue(parsed.args, "--transport-contract-sha256"),
        orchestration_id: optionValue(parsed.args, "--orchestration-id"),
        automatic_orchestration_path: optionValue(parsed.args, "--automatic-orchestration-path"),
        automatic_orchestration_sha256: optionValue(parsed.args, "--automatic-orchestration-sha256"),
        continuity_id: optionValue(parsed.args, "--continuity-id"),
        transport_continuity_path: optionValue(parsed.args, "--transport-continuity-path"),
        transport_continuity_sha256: optionValue(parsed.args, "--transport-continuity-sha256"),
        pi_install_transcript_path: optionValue(parsed.args, "--pi-install-transcript-path"),
        runtime_registration_snapshot_path: optionValue(parsed.args, "--runtime-registration-snapshot-path"),
        operator_event_cursor: optionValue(parsed.args, "--operator-event-cursor"),
        stdout_cursor: optionValue(parsed.args, "--stdout-cursor"),
        stderr_cursor: optionValue(parsed.args, "--stderr-cursor"),
        last_result_summary: optionValue(parsed.args, "--last-result-summary")
      })
    );
    return;
  }
  if (subcommand === "lifecycle-operator-session") {
    const tool = createComathTools().find((descriptor) => descriptor.name === "comath.release.piCodexLifecycleOperatorSession");
    if (!tool) {
      throw new Error("Pi/Codex lifecycle operator-session persistence tool is not registered");
    }
    await notifyRuntimeResult(
      ctx,
      await executeRuntimeToolWithHostConfirmation(
        client,
        tool,
        {
          project_root: projectRootFrom(options, parsed.args),
          project_id: requiredOption(optionValue(parsed.args, "--project-id"), "project_id"),
          actor: actorFrom(options, parsed.args),
          session_id: requiredOption(optionValue(parsed.args, "--session-id"), "session_id"),
          pi_host_label: requiredOption(optionValue(parsed.args, "--pi-host-label"), "pi_host_label"),
          session_status: requiredOption(optionValue(parsed.args, "--session-status"), "session_status"),
          session_kind: optionValue(parsed.args, "--session-kind"),
          operator_cursor: optionValue(parsed.args, "--operator-cursor"),
          completed_steps: optionValues(parsed.args, "--completed-step"),
          artifact_paths: optionValues(parsed.args, "--artifact").map(parseLifecycleOperatorSessionArtifact),
          last_result_summary:
            optionValue(parsed.args, "--last-result-summary") === undefined
              ? undefined
              : { summary: optionValue(parsed.args, "--last-result-summary") }
        },
        ctx
      )
    );
    return;
  }
  if (subcommand === "lifecycle-operator-transport-recovery") {
    const tool = createComathTools().find(
      (descriptor) => descriptor.name === "comath.release.piCodexLifecycleOperatorTransportRecovery"
    );
    if (!tool) {
      throw new Error("Pi/Codex lifecycle operator transport recovery tool is not registered");
    }
    await notifyRuntimeResult(
      ctx,
      await executeRuntimeToolWithHostConfirmation(
        client,
        tool,
        {
          project_root: projectRootFrom(options, parsed.args),
          project_id: requiredOption(optionValue(parsed.args, "--project-id"), "project_id"),
          actor: actorFrom(options, parsed.args),
          session_id: requiredOption(optionValue(parsed.args, "--session-id"), "session_id"),
          transport_recovery_id: requiredOption(
            optionValue(parsed.args, "--transport-recovery-id"),
            "transport_recovery_id"
          ),
          session_manifest_path: optionValue(parsed.args, "--session-manifest-path"),
          observed_route: optionValue(parsed.args, "--observed-route"),
          requested_cursor: parseLifecycleOperatorTransportCursor(parsed.args),
          client_epoch: numberOptionValue(parsed.args, "--client-epoch"),
          last_seen_event_id: optionValue(parsed.args, "--last-seen-event-id"),
          reconnect_reason: optionValue(parsed.args, "--reconnect-reason"),
          transport_kind: optionValue(parsed.args, "--transport-kind")
        },
        ctx
      )
    );
    return;
  }
  if (subcommand === "lifecycle-operator-transport-lease") {
    const tool = createComathTools().find((descriptor) => descriptor.name === "comath.release.piCodexLifecycleOperatorTransportLease");
    if (!tool) {
      throw new Error("Pi/Codex lifecycle operator transport lease tool is not registered");
    }
    await notifyRuntimeResult(
      ctx,
      await executeRuntimeToolWithHostConfirmation(
        client,
        tool,
        {
          project_root: projectRootFrom(options, parsed.args),
          project_id: requiredOption(optionValue(parsed.args, "--project-id"), "project_id"),
          actor: actorFrom(options, parsed.args),
          session_id: requiredOption(optionValue(parsed.args, "--session-id"), "session_id"),
          transport_recovery_id: requiredOption(
            optionValue(parsed.args, "--transport-recovery-id"),
            "transport_recovery_id"
          ),
          transport_lease_id: requiredOption(optionValue(parsed.args, "--transport-lease-id"), "transport_lease_id"),
          session_manifest_path: optionValue(parsed.args, "--session-manifest-path"),
          transport_recovery_path: optionValue(parsed.args, "--transport-recovery-path"),
          lease_route: optionValue(parsed.args, "--lease-route"),
          requested_cursor: parseLifecycleOperatorTransportCursor(parsed.args),
          client_epoch: numberOptionValue(parsed.args, "--client-epoch"),
          heartbeat_interval_ms: numberOptionValue(parsed.args, "--heartbeat-interval-ms"),
          lease_ttl_ms: numberOptionValue(parsed.args, "--lease-ttl-ms"),
          last_seen_event_id: optionValue(parsed.args, "--last-seen-event-id"),
          open_reason: optionValue(parsed.args, "--open-reason"),
          transport_kind: optionValue(parsed.args, "--transport-kind")
        },
        ctx
      )
    );
    return;
  }
  if (subcommand === "lifecycle-operator-transport-heartbeat") {
    const tool = createComathTools().find(
      (descriptor) => descriptor.name === "comath.release.piCodexLifecycleOperatorTransportHeartbeat"
    );
    if (!tool) {
      throw new Error("Pi/Codex lifecycle operator transport heartbeat tool is not registered");
    }
    await notifyRuntimeResult(
      ctx,
      await executeRuntimeToolWithHostConfirmation(
        client,
        tool,
        {
          project_root: projectRootFrom(options, parsed.args),
          project_id: requiredOption(optionValue(parsed.args, "--project-id"), "project_id"),
          actor: actorFrom(options, parsed.args),
          session_id: requiredOption(optionValue(parsed.args, "--session-id"), "session_id"),
          transport_recovery_id: requiredOption(
            optionValue(parsed.args, "--transport-recovery-id"),
            "transport_recovery_id"
          ),
          transport_lease_id: requiredOption(optionValue(parsed.args, "--transport-lease-id"), "transport_lease_id"),
          transport_heartbeat_id: requiredOption(
            optionValue(parsed.args, "--transport-heartbeat-id"),
            "transport_heartbeat_id"
          ),
          session_manifest_path: optionValue(parsed.args, "--session-manifest-path"),
          transport_recovery_path: optionValue(parsed.args, "--transport-recovery-path"),
          transport_lease_path: optionValue(parsed.args, "--transport-lease-path"),
          requested_cursor: parseLifecycleOperatorTransportCursor(parsed.args),
          client_epoch: numberOptionValue(parsed.args, "--client-epoch"),
          last_seen_event_id: optionValue(parsed.args, "--last-seen-event-id"),
          heartbeat_reason: optionValue(parsed.args, "--heartbeat-reason")
        },
        ctx
      )
    );
    return;
  }
  if (subcommand === "lifecycle-guided-real-pi-execution") {
    const tool = createComathTools().find(
      (descriptor) => descriptor.name === "comath.release.piCodexLifecycleGuidedRealPiExecution"
    );
    if (!tool) {
      throw new Error("Pi/Codex lifecycle guided real-Pi execution tool is not registered");
    }
    await notifyRuntimeResult(
      ctx,
      await executeRuntimeToolWithHostConfirmation(
        client,
        tool,
        {
          project_root: projectRootFrom(options, parsed.args),
          project_id: requiredOption(optionValue(parsed.args, "--project-id"), "project_id"),
          actor: actorFrom(options, parsed.args),
          execution_id: requiredOption(optionValue(parsed.args, "--execution-id"), "execution_id"),
          real_pi_runtime_probe_id: requiredOption(
            optionValue(parsed.args, "--real-pi-runtime-probe-id"),
            "real_pi_runtime_probe_id"
          ),
          pi_install_transcript_path: requiredOption(
            optionValue(parsed.args, "--pi-install-transcript-path"),
            "pi_install_transcript_path"
          ),
          runtime_registration_snapshot_path: requiredOption(
            optionValue(parsed.args, "--runtime-registration-snapshot-path"),
            "runtime_registration_snapshot_path"
          ),
          session_id: requiredOption(optionValue(parsed.args, "--session-id"), "session_id"),
          session_manifest_path: optionValue(parsed.args, "--session-manifest-path"),
          transport_recovery_id: requiredOption(
            optionValue(parsed.args, "--transport-recovery-id"),
            "transport_recovery_id"
          ),
          transport_recovery_path: optionValue(parsed.args, "--transport-recovery-path"),
          transport_lease_id: requiredOption(optionValue(parsed.args, "--transport-lease-id"), "transport_lease_id"),
          transport_lease_path: optionValue(parsed.args, "--transport-lease-path"),
          pi_host_label: optionValue(parsed.args, "--pi-host-label"),
          observed_routes: optionValues(parsed.args, "--observed-route"),
          operator_command_summary: optionValue(parsed.args, "--operator-command-summary"),
          final_operator_cursor: parseLifecycleOperatorTransportCursor(parsed.args),
          execution_outcome: optionValue(parsed.args, "--execution-outcome"),
          next_recommended_route: optionValue(parsed.args, "--next-recommended-route")
        },
        ctx
      )
    );
    return;
  }
  if (subcommand === "lifecycle-operator-service-transport-contract") {
    const tool = createComathTools().find(
      (descriptor) => descriptor.name === "comath.release.piCodexLifecycleOperatorServiceTransportContract"
    );
    if (!tool) {
      throw new Error("Pi/Codex lifecycle operator/service transport contract tool is not registered");
    }
    await notifyRuntimeResult(
      ctx,
      await executeRuntimeToolWithHostConfirmation(
        client,
        tool,
        {
          project_root: projectRootFrom(options, parsed.args),
          project_id: requiredOption(optionValue(parsed.args, "--project-id"), "project_id"),
          actor: actorFrom(options, parsed.args),
          transport_contract_id: optionValue(parsed.args, "--transport-contract-id"),
          terminal_review_id: requiredOption(optionValue(parsed.args, "--terminal-review-id"), "terminal_review_id"),
          terminal_review_path: optionValue(parsed.args, "--terminal-review-path"),
          max_bytes: numberOptionValue(parsed.args, "--max-bytes"),
          max_events: numberOptionValue(parsed.args, "--max-events"),
          retry_ms: numberOptionValue(parsed.args, "--retry-ms"),
          service_transport_primitive: optionValue(parsed.args, "--service-transport-primitive"),
          client_transport_primitive: optionValue(parsed.args, "--client-transport-primitive")
        },
        ctx
      )
    );
    return;
  }
  if (subcommand === "lifecycle-automatic-real-pi-execution") {
    const tool = createComathTools().find(
      (descriptor) => descriptor.name === "comath.release.piCodexLifecycleAutomaticRealPiExecution"
    );
    if (!tool) {
      throw new Error("Pi/Codex lifecycle automatic real-Pi execution tool is not registered");
    }
    const terminalReview = optionalJsonRecordOption(parsed.args, "--terminal-review-json", "terminal_review");
    await notifyRuntimeResult(
      ctx,
      await executeRuntimeToolWithHostConfirmation(
        client,
        tool,
        {
          project_root: projectRootFrom(options, parsed.args),
          project_id: requiredOption(optionValue(parsed.args, "--project-id"), "project_id"),
          actor: actorFrom(options, parsed.args),
          orchestration_id: optionValue(parsed.args, "--orchestration-id"),
          runtime_probe: requiredJsonRecordOption(parsed.args, "--runtime-probe-json", "runtime_probe"),
          operator_session: requiredJsonRecordOption(parsed.args, "--operator-session-json", "operator_session"),
          transport_recovery: requiredJsonRecordOption(parsed.args, "--transport-recovery-json", "transport_recovery"),
          transport_lease: requiredJsonRecordOption(parsed.args, "--transport-lease-json", "transport_lease"),
          transport_heartbeat: requiredJsonRecordOption(
            parsed.args,
            "--transport-heartbeat-json",
            "transport_heartbeat"
          ),
          guided_execution: requiredJsonRecordOption(parsed.args, "--guided-execution-json", "guided_execution"),
          ...(terminalReview === undefined ? {} : { terminal_review: terminalReview }),
          transport_contract: requiredJsonRecordOption(parsed.args, "--transport-contract-json", "transport_contract")
        },
        ctx
      )
    );
    return;
  }
  if (subcommand === "lifecycle-operator-service-transport-continuity") {
    const tool = createComathTools().find(
      (descriptor) => descriptor.name === "comath.release.piCodexLifecycleOperatorServiceTransportContinuity"
    );
    if (!tool) {
      throw new Error("Pi/Codex lifecycle operator/service transport continuity tool is not registered");
    }
    await notifyRuntimeResult(
      ctx,
      await executeRuntimeToolWithHostConfirmation(
        client,
        tool,
        {
          project_root: projectRootFrom(options, parsed.args),
          project_id: requiredOption(optionValue(parsed.args, "--project-id"), "project_id"),
          actor: actorFrom(options, parsed.args),
          continuity_id: optionValue(parsed.args, "--continuity-id"),
          transport_contract_id: requiredOption(
            optionValue(parsed.args, "--transport-contract-id"),
            "transport_contract_id"
          ),
          transport_contract_path: optionValue(parsed.args, "--transport-contract-path"),
          transport_contract_sha256: requiredOption(
            optionValue(parsed.args, "--transport-contract-sha256"),
            "transport_contract_sha256"
          ),
          max_bytes: numberOptionValue(parsed.args, "--max-bytes"),
          max_events: numberOptionValue(parsed.args, "--max-events"),
          retry_ms: numberOptionValue(parsed.args, "--retry-ms"),
          service_transport_primitive: optionValue(parsed.args, "--service-transport-primitive"),
          client_transport_primitive: optionValue(parsed.args, "--client-transport-primitive")
        },
        ctx
      )
    );
    return;
  }
  if (subcommand === "lifecycle-unattended-real-host-handoff-review") {
    const tool = createComathTools().find(
      (descriptor) => descriptor.name === "comath.release.piCodexLifecycleUnattendedRealHostHandoffReview"
    );
    if (!tool) {
      throw new Error("Pi/Codex lifecycle unattended real-host handoff review tool is not registered");
    }
    await notifyRuntimeResult(
      ctx,
      await executeRuntimeToolWithHostConfirmation(
        client,
        tool,
        {
          project_root: projectRootFrom(options, parsed.args),
          project_id: requiredOption(optionValue(parsed.args, "--project-id"), "project_id"),
          actor: actorFrom(options, parsed.args),
          handoff_review_id: optionValue(parsed.args, "--handoff-review-id"),
          automatic_orchestration_id: requiredOption(
            optionValue(parsed.args, "--automatic-orchestration-id"),
            "automatic_orchestration_id"
          ),
          automatic_orchestration_path: requiredOption(
            optionValue(parsed.args, "--automatic-orchestration-path"),
            "automatic_orchestration_path"
          ),
          automatic_orchestration_sha256: requiredOption(
            optionValue(parsed.args, "--automatic-orchestration-sha256"),
            "automatic_orchestration_sha256"
          ),
          transport_continuity_id: requiredOption(
            optionValue(parsed.args, "--transport-continuity-id"),
            "transport_continuity_id"
          ),
          transport_continuity_path: requiredOption(
            optionValue(parsed.args, "--transport-continuity-path"),
            "transport_continuity_path"
          ),
          transport_continuity_sha256: requiredOption(
            optionValue(parsed.args, "--transport-continuity-sha256"),
            "transport_continuity_sha256"
          )
        },
        ctx
      )
    );
    return;
  }
  if (subcommand === "lifecycle-unattended-real-host-operator-approval") {
    const tool = createComathTools().find(
      (descriptor) => descriptor.name === "comath.release.piCodexLifecycleUnattendedRealHostOperatorApproval"
    );
    if (!tool) {
      throw new Error("Pi/Codex lifecycle unattended real-host operator approval tool is not registered");
    }
    await notifyRuntimeResult(
      ctx,
      await executeRuntimeToolWithHostConfirmation(
        client,
        tool,
        {
          project_root: projectRootFrom(options, parsed.args),
          project_id: requiredOption(optionValue(parsed.args, "--project-id"), "project_id"),
          actor: actorFrom(options, parsed.args),
          approval_id: optionValue(parsed.args, "--approval-id"),
          handoff_review_id: requiredOption(optionValue(parsed.args, "--handoff-review-id"), "handoff_review_id"),
          handoff_review_path: requiredOption(optionValue(parsed.args, "--handoff-review-path"), "handoff_review_path"),
          handoff_review_sha256: requiredOption(
            optionValue(parsed.args, "--handoff-review-sha256"),
            "handoff_review_sha256"
          ),
          operator_approval_mode: optionValue(parsed.args, "--operator-approval-mode") ?? "manual_operator_approval",
          approval_note: optionValue(parsed.args, "--approval-note")
        },
        ctx
      )
    );
    return;
  }
  if (subcommand === "lifecycle-unattended-real-host-execution-readiness") {
    const tool = createComathTools().find(
      (descriptor) => descriptor.name === "comath.release.piCodexLifecycleUnattendedRealHostExecutionReadiness"
    );
    if (!tool) {
      throw new Error("Pi/Codex lifecycle unattended real-host execution readiness tool is not registered");
    }
    await notifyRuntimeResult(
      ctx,
      await executeRuntimeToolWithHostConfirmation(
        client,
        tool,
        {
          project_root: projectRootFrom(options, parsed.args),
          project_id: requiredOption(optionValue(parsed.args, "--project-id"), "project_id"),
          actor: actorFrom(options, parsed.args),
          readiness_id: optionValue(parsed.args, "--readiness-id"),
          handoff_review_id: requiredOption(optionValue(parsed.args, "--handoff-review-id"), "handoff_review_id"),
          handoff_review_path: requiredOption(optionValue(parsed.args, "--handoff-review-path"), "handoff_review_path"),
          handoff_review_sha256: requiredOption(
            optionValue(parsed.args, "--handoff-review-sha256"),
            "handoff_review_sha256"
          ),
          operator_approval_id: optionValue(parsed.args, "--operator-approval-id"),
          operator_approval_path: optionValue(parsed.args, "--operator-approval-path"),
          operator_approval_sha256: optionValue(parsed.args, "--operator-approval-sha256"),
          requested_execution_mode:
            optionValue(parsed.args, "--requested-execution-mode") ?? "production_unattended_real_host"
        },
        ctx
      )
    );
    return;
  }
  if (subcommand === "agent-adapter-os-isolation-probe") {
    const tool = createComathTools().find((descriptor) => descriptor.name === "comath.release.agentAdapterOsIsolationProbe");
    if (!tool) {
      throw new Error("agent adapter OS-isolation probe tool is not registered");
    }
    await notifyRuntimeResult(
      ctx,
      await executeRuntimeToolWithHostConfirmation(
        client,
        tool,
        {
          project_root: projectRootFrom(options, parsed.args),
          project_id: requiredOption(optionValue(parsed.args, "--project-id"), "project_id"),
          actor: actorFrom(options, parsed.args),
          probe_id: requiredOption(optionValue(parsed.args, "--probe-id"), "probe_id"),
          adapter_id: requiredOption(optionValue(parsed.args, "--adapter-id") ?? optionValue(parsed.args, "--adapter"), "adapter_id"),
          backend: requiredOption(optionValue(parsed.args, "--backend"), "backend"),
          requested_provider: optionValue(parsed.args, "--requested-provider"),
          probe_environment: {
            provider_available: booleanOptionValue(parsed.args, "--provider-available"),
            platform: optionValue(parsed.args, "--platform"),
            notes: optionValue(parsed.args, "--probe-note")
          }
        },
        ctx
      )
    );
    return;
  }
  if (subcommand === "agent-adapter-os-isolation-sandbox-execution") {
    const tool = createComathTools().find(
      (descriptor) => descriptor.name === "comath.release.agentAdapterOsIsolationSandboxExecutionProbe"
    );
    if (!tool) {
      throw new Error("agent adapter OS-isolation sandbox execution probe tool is not registered");
    }
    await notifyRuntimeResult(
      ctx,
      await executeRuntimeToolWithHostConfirmation(
        client,
        tool,
        {
          project_root: projectRootFrom(options, parsed.args),
          project_id: requiredOption(optionValue(parsed.args, "--project-id"), "project_id"),
          actor: actorFrom(options, parsed.args),
          execution_id: requiredOption(optionValue(parsed.args, "--execution-id"), "execution_id"),
          launch_id: requiredOption(optionValue(parsed.args, "--launch-id"), "launch_id"),
          adapter_id: requiredOption(optionValue(parsed.args, "--adapter-id") ?? optionValue(parsed.args, "--adapter"), "adapter_id"),
          backend: requiredOption(optionValue(parsed.args, "--backend"), "backend"),
          requested_provider: optionValue(parsed.args, "--requested-provider"),
          execution_environment: {
            platform: optionValue(parsed.args, "--platform"),
            notes: optionValue(parsed.args, "--execution-note"),
            process_isolation_enforced: booleanOptionValue(parsed.args, "--process-isolation-enforced"),
            filesystem_scope_enforced: booleanOptionValue(parsed.args, "--filesystem-scope-enforced"),
            network_isolation_enforced: booleanOptionValue(parsed.args, "--network-isolation-enforced"),
            no_new_privileges: booleanOptionValue(parsed.args, "--no-new-privileges"),
            escape_prevention: booleanOptionValue(parsed.args, "--escape-prevention"),
            adapter_process_exit_code: numberOptionValue(parsed.args, "--adapter-process-exit-code"),
            stdout_sha256: optionValue(parsed.args, "--stdout-sha256"),
            stderr_sha256: optionValue(parsed.args, "--stderr-sha256"),
            transcript_sha256: optionValue(parsed.args, "--transcript-sha256")
          }
        },
        ctx
      )
    );
    return;
  }
  if (subcommand === "agent-adapter-os-isolation-provider-host-capability-probe") {
    const tool = createComathTools().find(
      (descriptor) => descriptor.name === "comath.release.agentAdapterOsIsolationProviderHostCapabilityProbe"
    );
    if (!tool) {
      throw new Error("agent adapter OS-isolation provider host capability probe tool is not registered");
    }
    await notifyRuntimeResult(
      ctx,
      await executeRuntimeToolWithHostConfirmation(
        client,
        tool,
        {
          project_root: projectRootFrom(options, parsed.args),
          project_id: requiredOption(optionValue(parsed.args, "--project-id"), "project_id"),
          actor: actorFrom(options, parsed.args),
          host_capability_probe_id: requiredOption(
            optionValue(parsed.args, "--host-capability-probe-id"),
            "host_capability_probe_id"
          ),
          adapter_id: requiredOption(optionValue(parsed.args, "--adapter-id") ?? optionValue(parsed.args, "--adapter"), "adapter_id"),
          backend: requiredOption(optionValue(parsed.args, "--backend"), "backend"),
          requested_provider: optionValue(parsed.args, "--requested-provider"),
          host_capability_environment: {
            platform: optionValue(parsed.args, "--platform"),
            notes: optionValue(parsed.args, "--host-capability-note")
          }
        },
        ctx
      )
    );
    return;
  }
  if (subcommand === "agent-adapter-os-isolation-provider-helper-host-validation") {
    const tool = createComathTools().find(
      (descriptor) => descriptor.name === "comath.release.agentAdapterOsIsolationProviderHelperHostValidation"
    );
    if (!tool) {
      throw new Error("agent adapter OS-isolation provider-helper host validation tool is not registered");
    }
    await notifyRuntimeResult(
      ctx,
      await executeRuntimeToolWithHostConfirmation(
        client,
        tool,
        {
          project_root: projectRootFrom(options, parsed.args),
          project_id: requiredOption(optionValue(parsed.args, "--project-id"), "project_id"),
          actor: actorFrom(options, parsed.args),
          host_validation_id: requiredOption(optionValue(parsed.args, "--host-validation-id"), "host_validation_id"),
          host_capability_probe_id: requiredOption(
            optionValue(parsed.args, "--host-capability-probe-id"),
            "host_capability_probe_id"
          ),
          runner_id: requiredOption(optionValue(parsed.args, "--runner-id"), "runner_id"),
          launch_id: requiredOption(optionValue(parsed.args, "--launch-id"), "launch_id"),
          adapter_id: requiredOption(optionValue(parsed.args, "--adapter-id") ?? optionValue(parsed.args, "--adapter"), "adapter_id"),
          backend: requiredOption(optionValue(parsed.args, "--backend"), "backend"),
          requested_provider: optionValue(parsed.args, "--requested-provider"),
          host_environment: {
            platform: optionValue(parsed.args, "--platform"),
            notes: optionValue(parsed.args, "--host-validation-note")
          }
        },
        ctx
      )
    );
    return;
  }
  if (subcommand === "lifecycle-walkthrough") {
    await notifyRuntimeResult(
      ctx,
      await executeComathTool(client, "comath.release.piCodexLifecycleWalkthrough", {
        project_id: requiredOption(optionValue(parsed.args, "--project-id"), "project_id"),
        actor: actorFrom(options, parsed.args),
        pi_host_label: requiredOption(optionValue(parsed.args, "--pi-host-label"), "pi_host_label"),
        session_kind: optionValue(parsed.args, "--session-kind"),
        probe_id: optionValue(parsed.args, "--probe-id"),
        validation_id: optionValue(parsed.args, "--validation-id"),
        review_id: optionValue(parsed.args, "--review-id")
      })
    );
    return;
  }
  throw new Error(`unsupported release command: ${subcommand}`);
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
    description: "Start or continue a goal-mode CoMath ResearchCampaign through comathd.",
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

  pi.registerCommand("cm:agent", {
    description: "Inspect CoMath agent profiles and prepare profile-bound AgentRuns through comathd.",
    handler: async (args, ctx) => {
      await handleAgentCommand(client, options, args, ctx);
    }
  });

  pi.registerCommand("cm:audit", {
    description: "Run CoMath final audit routes through comathd.",
    handler: async (args, ctx) => {
      await handleAuditCommand(client, options, args, ctx);
    }
  });

  pi.registerCommand("cm:snapshot", {
    description: "Export, verify, or restore CoMath runtime snapshots through comathd.",
    handler: async (args, ctx) => {
      await handleSnapshotCommand(client, options, args, ctx);
    }
  });

  pi.registerCommand("cm:replay", {
    description: "Run CoMath replay routes through comathd.",
    handler: async (args, ctx) => {
      await handleReplayCommand(client, options, args, ctx);
    }
  });

  pi.registerCommand("cm:release", {
    description: "Assemble and review public release archives through comathd.",
    handler: async (args, ctx) => {
      await handleReleaseCommand(client, options, args, ctx);
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
  const claims = (input.claims ?? []).map((claim) => `${claim.id} [${publicDashboardStatus(claim.status)}] ${claim.statement ?? ""}`);
  const workstreams = (input.workstreams ?? []).map(
    (workstream) => `${workstream.id} [${publicDashboardStatus(workstream.status)}] ${workstream.goal ?? ""}`
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

function publicDashboardStatus(value: string): string {
  return /^(?:formally_checked|proven|formal_proof_verified|formal_replay_passed|lean_kernel_clean_replay|verified_final_authority_evidence)$/i.test(value)
    ? "unverified_formal_status"
    : value;
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
