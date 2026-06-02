import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { appendAuditEvent } from "../audit/jsonl-writer.js";
import { ComathError } from "../errors.js";
import { assertPathAllowed } from "../security/path-policy.js";
import { canonicalJson, scrubHostPaths, sha256Text } from "../verification/runner-contracts.js";
import { getAgentAdapterPackage, type AgentAdapterBackend, type AgentAdapterPackageId } from "./agent-adapter-packages.js";

export type AgentAdapterOsIsolationBoundary = "process_boundary_only" | "os_enforced";

export type AgentAdapterOsIsolationMetadata = {
  required_for_ga: true;
  os_enforced: boolean;
  current_boundary: AgentAdapterOsIsolationBoundary;
  evidence_required: true;
  proof_authority: "none";
};

export type AgentAdapterOsIsolationProvider =
  | "oci_container"
  | "nix_sandbox"
  | "firejail"
  | "windows_appcontainer"
  | "macos_sandbox_exec"
  | "service_process_boundary"
  | "unknown";

export type AgentAdapterOsIsolationEvidence = {
  schema_version?: string;
  kind?: "agent_adapter_os_isolation_evidence";
  adapter_id?: string;
  backend?: AgentAdapterBackend;
  provider?: AgentAdapterOsIsolationProvider;
  evidence_source?: "service_owned_probe" | "operator_attested" | "contract_only" | "unknown";
  probe_id?: string;
  probe_status?: AgentAdapterOsIsolationProbeStatus;
  process_isolation_enforced?: boolean;
  filesystem_scope_enforced?: boolean;
  network_isolation_enforced?: boolean;
  no_new_privileges?: boolean;
  escape_prevention?: boolean;
  host_path_leak_free?: boolean;
  secret_free?: boolean;
  notes?: string;
  collection_source?: "service_owned_os_probe";
  adapter_process_exit_code?: number;
  stdout_sha256?: string;
  stderr_sha256?: string;
  transcript_sha256?: string;
  proof_authority?: unknown;
  can_promote_claim?: unknown;
  can_certify_ga?: unknown;
};

export type AgentAdapterOsIsolationProbeCollection = {
  collection_source?: "service_owned_os_probe" | "operator_attested" | "unknown";
  process_isolation_enforced?: boolean;
  filesystem_scope_enforced?: boolean;
  network_isolation_enforced?: boolean;
  no_new_privileges?: boolean;
  escape_prevention?: boolean;
  adapter_process_exit_code?: number;
  stdout_sha256?: string;
  stderr_sha256?: string;
  transcript_sha256?: string;
  notes?: string;
};

export type AgentAdapterOsIsolationProbeEnvironment = {
  provider_available?: boolean;
  platform?: string;
  notes?: string;
};

export type AgentAdapterOsIsolationProbeCollectorInput = {
  project_root: string;
  project_id: string;
  probe_id: string;
  adapter_id: AgentAdapterPackageId;
  backend: AgentAdapterBackend;
  requested_provider: string;
  provider: AgentAdapterOsIsolationProvider | null;
  provider_available: boolean;
};

export type AgentAdapterOsIsolationProbeCollector = (
  input: AgentAdapterOsIsolationProbeCollectorInput
) => AgentAdapterOsIsolationProbeCollection | null | undefined;

export type AgentAdapterOsIsolationProbeOptions = {
  collector?: AgentAdapterOsIsolationProbeCollector;
};

export type AgentAdapterOsIsolationSandboxLaunchPreflightInput = {
  project_root: string;
  project_id: string;
  launch_id: string;
  adapter_id: AgentAdapterPackageId;
  backend: AgentAdapterBackend;
  requested_provider: string;
  provider: AgentAdapterOsIsolationProvider | null;
  platform?: string;
};

export type AgentAdapterOsIsolationSandboxLaunchPreflight = {
  probe_source?: "service_owned_launcher_preflight" | "operator_attested" | "unknown";
  provider_available?: boolean;
  launcher_binary_sha256?: string;
  launcher_version?: string;
  diagnostics?: string[];
};

export type AgentAdapterOsIsolationSandboxLaunchProbe = (
  input: AgentAdapterOsIsolationSandboxLaunchPreflightInput
) => AgentAdapterOsIsolationSandboxLaunchPreflight | null | undefined;

export type AgentAdapterOsIsolationSandboxLaunchOptions = {
  launcher_probe?: AgentAdapterOsIsolationSandboxLaunchProbe;
};

export type AgentAdapterOsIsolationSandboxLaunchStatus =
  | "ready_for_service_owned_os_sandbox_execution"
  | "blocked_sandbox_provider_unsupported"
  | "blocked_sandbox_provider_not_os_enforced"
  | "blocked_sandbox_launcher_preflight_missing";

export type AgentAdapterOsIsolationSandboxLaunchInput = {
  project_id: string;
  launch_id?: string;
  adapter_id: AgentAdapterPackageId;
  backend?: AgentAdapterBackend;
  actor: string;
  requested_provider?: string;
  launcher_environment?: {
    platform?: string;
    notes?: string;
    provider_available?: boolean;
    launcher_binary_sha256?: string;
    command_override?: string;
  };
};

export type AgentAdapterOsIsolationProbeStatus =
  | "os_isolation_probe_collected"
  | "blocked_os_isolation_provider_unsupported"
  | "blocked_os_isolation_provider_not_os_enforced"
  | "blocked_os_isolation_provider_unavailable"
  | "blocked_os_isolation_probe_not_collected";

export type AgentAdapterOsIsolationProbeInput = {
  project_id: string;
  probe_id?: string;
  adapter_id: AgentAdapterPackageId;
  backend?: AgentAdapterBackend;
  actor: string;
  requested_provider?: string;
  probe_environment?: AgentAdapterOsIsolationProbeEnvironment;
};

export type AgentAdapterOsIsolationReviewInput = {
  project_id: string;
  review_id?: string;
  adapter_id: AgentAdapterPackageId;
  backend?: AgentAdapterBackend;
  actor: string;
  evidence_path?: string;
};

export type AgentAdapterOsIsolationReviewVeto = {
  code: string;
  message: string;
};

export type AgentAdapterOsIsolationReviewCheck = {
  ok: boolean;
  required: true;
  observed: string | boolean | null;
};

export type AgentAdapterOsIsolationEvidenceArtifact = {
  kind: "agent_adapter_os_isolation_evidence";
  path: string;
  sha256: string;
  size_bytes: number;
};

export type AgentAdapterOsIsolationReview = {
  schema_version: "comath.agent_adapter_os_isolation_readiness.v1";
  review_id: string;
  project_id: string;
  adapter_id: AgentAdapterPackageId;
  backend: AgentAdapterBackend;
  created_at: string;
  ok: boolean;
  readiness_status:
    | "ready_for_os_isolation_release_review"
    | "blocked_missing_os_enforced_adapter_isolation";
  review_path: string;
  evidence_artifact: AgentAdapterOsIsolationEvidenceArtifact | null;
  checks: {
    evidence_artifact_bound: AgentAdapterOsIsolationReviewCheck;
    provider_os_enforced: AgentAdapterOsIsolationReviewCheck;
    process_isolation: AgentAdapterOsIsolationReviewCheck;
    filesystem_isolation: AgentAdapterOsIsolationReviewCheck;
    network_isolation: AgentAdapterOsIsolationReviewCheck;
    no_new_privileges: AgentAdapterOsIsolationReviewCheck;
    escape_prevention: AgentAdapterOsIsolationReviewCheck;
    adapter_binding: AgentAdapterOsIsolationReviewCheck;
    backend_binding: AgentAdapterOsIsolationReviewCheck;
    service_owned_probe: AgentAdapterOsIsolationReviewCheck;
    collected_probe_binding: AgentAdapterOsIsolationReviewCheck;
    host_path_secret_free: AgentAdapterOsIsolationReviewCheck;
    non_authority: AgentAdapterOsIsolationReviewCheck;
  };
  adapter_execution_isolation: {
    required_for_ga: true;
    current_boundary: AgentAdapterOsIsolationBoundary;
    os_enforced: boolean;
    provider: AgentAdapterOsIsolationProvider | null;
    claims_runtime_enforcement: false;
    proof_authority: "none";
  };
  vetoes: AgentAdapterOsIsolationReviewVeto[];
  proof_authority: "none";
  can_promote_claim: false;
  can_certify_ga: false;
};

export type AgentAdapterOsIsolationProbe = {
  schema_version: "comath.agent_adapter_os_isolation_probe.v1";
  probe_id: string;
  project_id: string;
  adapter_id: AgentAdapterPackageId;
  backend: AgentAdapterBackend;
  created_at: string;
  ok: boolean;
  probe_status: AgentAdapterOsIsolationProbeStatus;
  requested_provider: string;
  observed_provider: AgentAdapterOsIsolationProvider;
  provider_available: boolean;
  probe_path: string;
  evidence_path: string;
  evidence_artifact: AgentAdapterOsIsolationEvidenceArtifact;
  evidence: Required<Pick<AgentAdapterOsIsolationEvidence,
    | "schema_version"
    | "kind"
    | "adapter_id"
    | "backend"
    | "provider"
    | "evidence_source"
    | "process_isolation_enforced"
    | "filesystem_scope_enforced"
    | "network_isolation_enforced"
    | "no_new_privileges"
    | "escape_prevention"
    | "host_path_leak_free"
    | "secret_free"
    | "proof_authority"
    | "can_promote_claim"
    | "can_certify_ga"
  >> & {
    probe_id: string;
    probe_status: AgentAdapterOsIsolationProbeStatus;
    notes: string;
    collection_source?: "service_owned_os_probe";
    adapter_process_exit_code?: number;
    stdout_sha256?: string;
    stderr_sha256?: string;
    transcript_sha256?: string;
  };
  adapter_execution_isolation: {
    required_for_ga: true;
    current_boundary: AgentAdapterOsIsolationBoundary;
    os_enforced: boolean;
    provider: AgentAdapterOsIsolationProvider;
    claims_runtime_enforcement: false;
    proof_authority: "none";
  };
  blocker_certificate: {
    blocker_code: AgentAdapterOsIsolationProbeStatus;
    replayable_next_action: string;
    proof_authority: "none";
  } | null;
  proof_authority: "none";
  can_promote_claim: false;
  can_certify_ga: false;
};

export type AgentAdapterOsIsolationSandboxLaunch = {
  schema_version: "comath.agent_adapter_os_isolation_sandbox_launch.v1";
  launch_id: string;
  project_id: string;
  adapter_id: AgentAdapterPackageId;
  backend: AgentAdapterBackend;
  created_at: string;
  ok: boolean;
  launch_status: AgentAdapterOsIsolationSandboxLaunchStatus;
  requested_provider: string;
  provider: AgentAdapterOsIsolationProvider;
  sandbox_launch_ready: boolean;
  launch_path: string;
  provider_command_contract: {
    provider: AgentAdapterOsIsolationProvider;
    shell: false;
    network_policy: "disabled";
    no_new_privileges_required: true;
    command_override_allowed: false;
    caller_supplied_success_allowed: false;
    proof_authority: "none";
  };
  launcher_preflight: {
    probe_source: "service_owned_launcher_preflight" | "missing";
    provider_available: boolean;
    launcher_binary_sha256: string | null;
    launcher_version: string | null;
    diagnostics: string[];
  };
  adapter_execution_isolation: {
    required_for_ga: true;
    current_boundary: AgentAdapterOsIsolationBoundary;
    os_enforced: false;
    provider: AgentAdapterOsIsolationProvider;
    claims_runtime_enforcement: false;
    proof_authority: "none";
  };
  blocker_certificate: {
    blocker_code: AgentAdapterOsIsolationSandboxLaunchStatus;
    replayable_next_action: string;
    proof_authority: "none";
  } | null;
  proof_authority: "none";
  can_promote_claim: false;
  can_certify_ga: false;
};

const osEnforcedProviders = new Set<AgentAdapterOsIsolationProvider>([
  "oci_container",
  "nix_sandbox",
  "firejail",
  "windows_appcontainer",
  "macos_sandbox_exec"
]);

const allProviders = new Set<AgentAdapterOsIsolationProvider>([
  ...osEnforcedProviders,
  "service_process_boundary",
  "unknown"
]);

const supportedBackends = new Set<AgentAdapterBackend>(["bundled", "external", "codex-api"]);

const secretPattern = /(?:Authorization\s*:\s*Bearer\s+[^\s,;}"']+|(?:api[_-]?key|token|secret|password)\s*[=:]\s*[^\s,;}"']+)/i;
const secretScrubPattern = /(?:Authorization\s*:\s*Bearer\s+[^\s,;}"']+|(?:api[_-]?key|token|secret|password)\s*[=:]\s*[^\s,;}"']+)/gi;

function normalizeRelativePath(value: string): string {
  return value.replace(/\\/g, "/");
}

function assertReviewId(value: string | undefined): string {
  if (!value) {
    return `ADAPTER-OSISO-${Date.now()}`;
  }
  if (/^[A-Z0-9][A-Z0-9_-]{2,96}$/.test(value)) {
    return value;
  }
  throw new ComathError("invalid adapter OS-isolation review id", {
    statusCode: 400,
    code: "AGENT_ADAPTER_OS_ISOLATION_REVIEW_ID_INVALID"
  });
}

function assertProbeId(value: string | undefined): string {
  if (!value) {
    return `ADAPTER-OSISO-PROBE-${Date.now()}`;
  }
  if (/^[A-Z0-9][A-Z0-9_-]{2,96}$/.test(value)) {
    return value;
  }
  throw new ComathError("invalid adapter OS-isolation probe id", {
    statusCode: 400,
    code: "AGENT_ADAPTER_OS_ISOLATION_PROBE_ID_INVALID"
  });
}

function assertSandboxLaunchId(value: string | undefined): string {
  if (!value) {
    return `ADAPTER-OSISO-LAUNCH-${Date.now()}`;
  }
  if (/^[A-Z0-9][A-Z0-9_-]{2,96}$/.test(value)) {
    return value;
  }
  throw new ComathError("invalid adapter OS-isolation sandbox launch id", {
    statusCode: 400,
    code: "AGENT_ADAPTER_OS_ISOLATION_SANDBOX_LAUNCH_ID_INVALID"
  });
}

function assertBackend(value: AgentAdapterBackend | undefined): AgentAdapterBackend {
  const backend = value ?? "bundled";
  if (supportedBackends.has(backend)) {
    return backend;
  }
  throw new ComathError("unsupported adapter backend for OS-isolation probe", {
    statusCode: 400,
    code: "AGENT_ADAPTER_OS_ISOLATION_PROBE_BACKEND_UNSUPPORTED"
  });
}

function sanitizeReviewText(value: string): string {
  return scrubHostPaths(value).replace(secretScrubPattern, "<secret>");
}

function sanitizeProbeText(value: unknown): string {
  return sanitizeReviewText(typeof value === "string" ? value : "").slice(0, 2048);
}

function projectRelativePath(projectRoot: string, absolutePath: string): string {
  return normalizeRelativePath(relative(resolve(projectRoot), absolutePath));
}

function readEvidenceArtifact(
  projectRoot: string,
  path: string
): { artifact: AgentAdapterOsIsolationEvidenceArtifact; text: string; evidence: AgentAdapterOsIsolationEvidence } {
  const absolutePath = assertPathAllowed(projectRoot, path, { purpose: "read", resolveRealpath: true });
  if (!existsSync(absolutePath)) {
    throw new ComathError("adapter OS-isolation evidence artifact is missing", {
      statusCode: 400,
      code: "AGENT_ADAPTER_OS_ISOLATION_EVIDENCE_MISSING"
    });
  }
  if (!statSync(absolutePath).isFile()) {
    throw new ComathError("adapter OS-isolation evidence artifact is not a file", {
      statusCode: 400,
      code: "AGENT_ADAPTER_OS_ISOLATION_EVIDENCE_NOT_FILE"
    });
  }
  const bytes = readFileSync(absolutePath);
  const text = bytes.toString("utf8");
  let parsed: AgentAdapterOsIsolationEvidence;
  try {
    parsed = JSON.parse(text) as AgentAdapterOsIsolationEvidence;
  } catch {
    throw new ComathError("adapter OS-isolation evidence artifact must be JSON", {
      statusCode: 400,
      code: "AGENT_ADAPTER_OS_ISOLATION_EVIDENCE_INVALID_JSON"
    });
  }
  return {
    artifact: {
      kind: "agent_adapter_os_isolation_evidence",
      path: projectRelativePath(projectRoot, absolutePath),
      sha256: sha256Text(text),
      size_bytes: bytes.byteLength
    },
    text,
    evidence: parsed
  };
}

function check(ok: boolean, observed: string | boolean | null): AgentAdapterOsIsolationReviewCheck {
  return { ok, required: true, observed };
}

function evidenceOverclaimsAuthority(evidence: AgentAdapterOsIsolationEvidence): boolean {
  return (
    evidence.proof_authority !== undefined && evidence.proof_authority !== "none" ||
    evidence.can_promote_claim === true ||
    evidence.can_certify_ga === true
  );
}

function evidenceAdapterMatches(
  evidence: AgentAdapterOsIsolationEvidence | undefined,
  adapterId: AgentAdapterPackageId
): boolean {
  return Boolean(evidence && evidence.adapter_id === adapterId);
}

function evidenceBackendMatches(
  evidence: AgentAdapterOsIsolationEvidence | undefined,
  backend: AgentAdapterBackend
): boolean {
  return Boolean(evidence && evidence.backend === backend);
}

function evidenceIsServiceOwnedProbe(evidence: AgentAdapterOsIsolationEvidence | undefined): boolean {
  return Boolean(evidence && evidence.evidence_source === "service_owned_probe");
}

function evidenceHasCollectedProbeBinding(
  projectRoot: string,
  artifact: AgentAdapterOsIsolationEvidenceArtifact | undefined,
  evidence: AgentAdapterOsIsolationEvidence | undefined
): boolean {
  if (!artifact || !evidence || typeof evidence.probe_id !== "string") {
    return false;
  }
  if (
    evidence.probe_status !== "os_isolation_probe_collected" ||
    evidence.collection_source !== "service_owned_os_probe"
  ) {
    return false;
  }
  const expectedEvidencePath = probeEvidencePath(evidence.probe_id);
  if (artifact.path !== expectedEvidencePath) {
    return false;
  }
  const absoluteProbePath = assertPathAllowed(projectRoot, probePath(evidence.probe_id), {
    purpose: "read",
    resolveRealpath: true
  });
  if (!existsSync(absoluteProbePath) || !statSync(absoluteProbePath).isFile()) {
    return false;
  }
  try {
    const parsedProbe = JSON.parse(readFileSync(absoluteProbePath, "utf8")) as AgentAdapterOsIsolationProbe;
    return Boolean(
      parsedProbe.schema_version === "comath.agent_adapter_os_isolation_probe.v1" &&
        parsedProbe.probe_id === evidence.probe_id &&
        parsedProbe.ok === true &&
        parsedProbe.probe_status === "os_isolation_probe_collected" &&
        parsedProbe.evidence_path === expectedEvidencePath &&
        parsedProbe.evidence_artifact?.sha256 === artifact.sha256 &&
        parsedProbe.evidence?.probe_id === evidence.probe_id &&
        parsedProbe.evidence?.collection_source === "service_owned_os_probe" &&
        parsedProbe.evidence?.adapter_id === evidence.adapter_id &&
        parsedProbe.evidence?.backend === evidence.backend &&
        parsedProbe.evidence?.provider === evidence.provider &&
        parsedProbe.proof_authority === "none" &&
        parsedProbe.can_promote_claim === false &&
        parsedProbe.can_certify_ga === false
    );
  } catch {
    return false;
  }
}

function evidenceLeaksHostPathOrSecret(text: string, evidence: AgentAdapterOsIsolationEvidence): boolean {
  return (
    scrubHostPaths(text) !== text ||
    secretPattern.test(text) ||
    evidence.host_path_leak_free === false ||
    evidence.secret_free === false
  );
}

function buildVetoes(input: {
  evidencePresent: boolean;
  checks: AgentAdapterOsIsolationReview["checks"];
  evidence?: AgentAdapterOsIsolationEvidence;
  text?: string;
}): AgentAdapterOsIsolationReviewVeto[] {
  const vetoes: AgentAdapterOsIsolationReviewVeto[] = [];
  if (!input.evidencePresent) {
    vetoes.push({
      code: "adapter_os_isolation_evidence_missing",
      message: "OS-enforced adapter isolation evidence is required before this adapter can satisfy GA release readiness."
    });
  }
  if (!input.checks.provider_os_enforced.ok) {
    vetoes.push({
      code: "adapter_os_isolation_provider_not_os_enforced",
      message: "The recorded provider is not an OS-enforced isolation boundary."
    });
  }
  if (!input.checks.process_isolation.ok) {
    vetoes.push({ code: "adapter_os_process_isolation_missing", message: "Process isolation was not enforced." });
  }
  if (!input.checks.filesystem_isolation.ok) {
    vetoes.push({ code: "adapter_os_filesystem_isolation_missing", message: "Filesystem scope isolation was not enforced." });
  }
  if (!input.checks.network_isolation.ok) {
    vetoes.push({ code: "adapter_os_network_isolation_missing", message: "Network isolation was not enforced." });
  }
  if (!input.checks.no_new_privileges.ok) {
    vetoes.push({ code: "adapter_os_no_new_privileges_missing", message: "No-new-privileges isolation was not enforced." });
  }
  if (!input.checks.escape_prevention.ok) {
    vetoes.push({ code: "adapter_os_escape_prevention_missing", message: "Escape-prevention evidence was not present." });
  }
  if (!input.checks.adapter_binding.ok) {
    vetoes.push({
      code: "adapter_os_isolation_evidence_adapter_mismatch",
      message: "OS-isolation evidence was not bound to the reviewed adapter package."
    });
  }
  if (!input.checks.backend_binding.ok) {
    vetoes.push({
      code: "adapter_os_isolation_evidence_backend_mismatch",
      message: "OS-isolation evidence was not bound to the reviewed adapter backend."
    });
  }
  if (!input.checks.service_owned_probe.ok) {
    vetoes.push({
      code: "adapter_os_isolation_evidence_not_service_owned_probe",
      message: "OS-isolation release-readiness evidence must come from a service-owned probe."
    });
  }
  if (!input.checks.collected_probe_binding.ok) {
    vetoes.push({
      code: "adapter_os_isolation_collected_probe_binding_missing",
      message: "OS-isolation readiness evidence must bind to a service-owned collected probe manifest."
    });
  }
  if (!input.checks.host_path_secret_free.ok) {
    vetoes.push({
      code: "adapter_os_isolation_evidence_leaks_host_path_or_secret",
      message: "OS-isolation evidence leaked host paths or secret-like material."
    });
  }
  if (!input.checks.non_authority.ok) {
    vetoes.push({
      code: "adapter_os_isolation_evidence_overclaims_authority",
      message: "OS-isolation evidence attempted to claim proof authority, claim promotion, or GA certification."
    });
  }
  return vetoes;
}

function reviewPath(reviewId: string): string {
  return normalizeRelativePath(join(".comath", "release", "agent-adapter-os-isolation", reviewId, "review.json"));
}

function probePath(probeId: string): string {
  return normalizeRelativePath(join(".comath", "release", "agent-adapter-os-isolation", probeId, "probe.json"));
}

function probeEvidencePath(probeId: string): string {
  return normalizeRelativePath(join(".comath", "release", "agent-adapter-os-isolation", probeId, "evidence.json"));
}

function sandboxLaunchPath(launchId: string): string {
  return normalizeRelativePath(join(".comath", "release", "agent-adapter-os-isolation", launchId, "sandbox-launch.json"));
}

function normalizeRequestedProvider(value: string | undefined): {
  requestedProvider: string;
  knownProvider: AgentAdapterOsIsolationProvider | null;
} {
  const requestedProvider = value ?? "unknown";
  return {
    requestedProvider,
    knownProvider: allProviders.has(requestedProvider as AgentAdapterOsIsolationProvider)
      ? requestedProvider as AgentAdapterOsIsolationProvider
      : null
  };
}

function classifyProbe(input: {
  knownProvider: AgentAdapterOsIsolationProvider | null;
  providerAvailable: boolean;
}): { status: AgentAdapterOsIsolationProbeStatus; observedProvider: AgentAdapterOsIsolationProvider } {
  if (!input.knownProvider || input.knownProvider === "unknown") {
    return { status: "blocked_os_isolation_provider_unsupported", observedProvider: "unknown" };
  }
  if (!osEnforcedProviders.has(input.knownProvider)) {
    return { status: "blocked_os_isolation_provider_not_os_enforced", observedProvider: input.knownProvider };
  }
  if (!input.providerAvailable) {
    return { status: "blocked_os_isolation_provider_unavailable", observedProvider: "service_process_boundary" };
  }
  return { status: "blocked_os_isolation_probe_not_collected", observedProvider: input.knownProvider };
}

function isSha256(value: unknown): value is string {
  return typeof value === "string" && /^[a-f0-9]{64}$/i.test(value);
}

function isCollectedOsIsolationProbe(input: {
  knownProvider: AgentAdapterOsIsolationProvider | null;
  providerAvailable: boolean;
  collection: AgentAdapterOsIsolationProbeCollection | undefined;
}): boolean {
  const collection = input.collection;
  return Boolean(
    input.knownProvider &&
      osEnforcedProviders.has(input.knownProvider) &&
      input.providerAvailable &&
      collection?.collection_source === "service_owned_os_probe" &&
      collection.process_isolation_enforced === true &&
      collection.filesystem_scope_enforced === true &&
      collection.network_isolation_enforced === true &&
      collection.no_new_privileges === true &&
      collection.escape_prevention === true &&
      collection.adapter_process_exit_code === 0 &&
      isSha256(collection.stdout_sha256) &&
      isSha256(collection.stderr_sha256) &&
      isSha256(collection.transcript_sha256)
  );
}

function isServiceOwnedLauncherPreflight(input: {
  knownProvider: AgentAdapterOsIsolationProvider | null;
  preflight: AgentAdapterOsIsolationSandboxLaunchPreflight | undefined;
}): boolean {
  return Boolean(
    input.knownProvider &&
      osEnforcedProviders.has(input.knownProvider) &&
      input.preflight?.probe_source === "service_owned_launcher_preflight" &&
      input.preflight.provider_available === true &&
      isSha256(input.preflight.launcher_binary_sha256)
  );
}

function sanitizeDiagnostics(values: unknown): string[] {
  if (!Array.isArray(values)) {
    return [];
  }
  return values
    .filter((entry): entry is string => typeof entry === "string")
    .map((entry) => sanitizeProbeText(entry))
    .filter((entry) => entry.length > 0)
    .slice(0, 8);
}

function classifySandboxLaunch(input: {
  knownProvider: AgentAdapterOsIsolationProvider | null;
  ready: boolean;
}): { status: AgentAdapterOsIsolationSandboxLaunchStatus; provider: AgentAdapterOsIsolationProvider } {
  if (!input.knownProvider || input.knownProvider === "unknown") {
    return { status: "blocked_sandbox_provider_unsupported", provider: "unknown" };
  }
  if (!osEnforcedProviders.has(input.knownProvider)) {
    return { status: "blocked_sandbox_provider_not_os_enforced", provider: input.knownProvider };
  }
  if (!input.ready) {
    return { status: "blocked_sandbox_launcher_preflight_missing", provider: input.knownProvider };
  }
  return { status: "ready_for_service_owned_os_sandbox_execution", provider: input.knownProvider };
}

function collectionBoolean(
  collection: AgentAdapterOsIsolationProbeCollection | undefined,
  key:
    | "process_isolation_enforced"
    | "filesystem_scope_enforced"
    | "network_isolation_enforced"
    | "no_new_privileges"
    | "escape_prevention",
  collected: boolean
): boolean {
  return collected ? true : collection?.collection_source === "service_owned_os_probe" ? collection[key] === true : false;
}

function collectedEvidenceDetails(
  collection: AgentAdapterOsIsolationProbeCollection | undefined,
  collected: boolean
): Pick<AgentAdapterOsIsolationProbe["evidence"],
  | "collection_source"
  | "adapter_process_exit_code"
  | "stdout_sha256"
  | "stderr_sha256"
  | "transcript_sha256"
> {
  if (!collection || collection.collection_source !== "service_owned_os_probe") {
    return {};
  }
  return {
    collection_source: "service_owned_os_probe",
    adapter_process_exit_code: collected || typeof collection.adapter_process_exit_code === "number"
      ? collection.adapter_process_exit_code
      : undefined,
    stdout_sha256: isSha256(collection.stdout_sha256) ? collection.stdout_sha256.toLowerCase() : undefined,
    stderr_sha256: isSha256(collection.stderr_sha256) ? collection.stderr_sha256.toLowerCase() : undefined,
    transcript_sha256: isSha256(collection.transcript_sha256) ? collection.transcript_sha256.toLowerCase() : undefined
  };
}

export function defaultAgentAdapterOsIsolationMetadata(): AgentAdapterOsIsolationMetadata {
  return {
    required_for_ga: true,
    os_enforced: false,
    current_boundary: "process_boundary_only",
    evidence_required: true,
    proof_authority: "none"
  };
}

export function prepareAgentAdapterOsIsolationSandboxLaunch(
  projectRoot: string,
  input: AgentAdapterOsIsolationSandboxLaunchInput,
  options: AgentAdapterOsIsolationSandboxLaunchOptions = {}
): AgentAdapterOsIsolationSandboxLaunch {
  getAgentAdapterPackage(input.adapter_id);
  const launchId = assertSandboxLaunchId(input.launch_id);
  const backend = assertBackend(input.backend);
  const path = sandboxLaunchPath(launchId);
  const absoluteLaunchPath = assertPathAllowed(projectRoot, path, { purpose: "runtime-write" });
  if (existsSync(absoluteLaunchPath)) {
    throw new ComathError("adapter OS-isolation sandbox launch already exists", {
      statusCode: 409,
      code: "AGENT_ADAPTER_OS_ISOLATION_SANDBOX_LAUNCH_ALREADY_EXISTS"
    });
  }

  const { requestedProvider, knownProvider } = normalizeRequestedProvider(input.requested_provider);
  const preflight = options.launcher_probe?.({
    project_root: projectRoot,
    project_id: input.project_id,
    launch_id: launchId,
    adapter_id: input.adapter_id,
    backend,
    requested_provider: requestedProvider,
    provider: knownProvider,
    platform: input.launcher_environment?.platform
  }) ?? undefined;
  const ready = isServiceOwnedLauncherPreflight({ knownProvider, preflight });
  const classified = classifySandboxLaunch({ knownProvider, ready });
  const status = classified.status;
  const provider = classified.provider;
  const diagnostics = [
    input.launcher_environment?.platform ? `platform=${sanitizeProbeText(input.launcher_environment.platform)}` : undefined,
    input.launcher_environment?.notes ? sanitizeProbeText(input.launcher_environment.notes) : undefined,
    ...sanitizeDiagnostics(preflight?.diagnostics),
    ready
      ? "Service-owned provider launcher preflight is ready for a future OS-sandbox execution probe."
      : "No service-owned provider launcher preflight was accepted."
  ].filter((entry): entry is string => Boolean(entry));
  const launch: AgentAdapterOsIsolationSandboxLaunch = {
    schema_version: "comath.agent_adapter_os_isolation_sandbox_launch.v1",
    launch_id: launchId,
    project_id: input.project_id,
    adapter_id: input.adapter_id,
    backend,
    created_at: new Date().toISOString(),
    ok: ready,
    launch_status: status,
    requested_provider: sanitizeProbeText(requestedProvider) || "unknown",
    provider,
    sandbox_launch_ready: ready,
    launch_path: path,
    provider_command_contract: {
      provider,
      shell: false,
      network_policy: "disabled",
      no_new_privileges_required: true,
      command_override_allowed: false,
      caller_supplied_success_allowed: false,
      proof_authority: "none"
    },
    launcher_preflight: {
      probe_source: ready ? "service_owned_launcher_preflight" : "missing",
      provider_available: ready,
      launcher_binary_sha256: ready && isSha256(preflight?.launcher_binary_sha256)
        ? preflight.launcher_binary_sha256.toLowerCase()
        : null,
      launcher_version: ready && typeof preflight?.launcher_version === "string"
        ? sanitizeProbeText(preflight.launcher_version)
        : null,
      diagnostics
    },
    adapter_execution_isolation: {
      required_for_ga: true,
      current_boundary: "process_boundary_only",
      os_enforced: false,
      provider,
      claims_runtime_enforcement: false,
      proof_authority: "none"
    },
    blocker_certificate: ready
      ? null
      : {
          blocker_code: status,
          replayable_next_action: "Configure a supported OS sandbox provider and run a service-owned launcher preflight before collecting OS-enforced adapter execution evidence.",
          proof_authority: "none"
        },
    proof_authority: "none",
    can_promote_claim: false,
    can_certify_ga: false
  };

  mkdirSync(dirname(absoluteLaunchPath), { recursive: true });
  writeFileSync(absoluteLaunchPath, canonicalJson(launch), "utf8");
  appendAuditEvent(projectRoot, {
    project_id: input.project_id,
    event_type: "agent_adapter.os_isolation_sandbox_launch_preflighted",
    actor: sanitizeReviewText(input.actor),
    target_id: input.project_id,
    payload: {
      launch_id: launchId,
      adapter_id: input.adapter_id,
      backend,
      ok: ready,
      launch_status: status,
      provider,
      sandbox_launch_ready: ready,
      proof_authority: "none",
      can_promote_claim: false,
      can_certify_ga: false
    }
  });
  return launch;
}

export function probeAgentAdapterOsIsolation(
  projectRoot: string,
  input: AgentAdapterOsIsolationProbeInput,
  options: AgentAdapterOsIsolationProbeOptions = {}
): AgentAdapterOsIsolationProbe {
  getAgentAdapterPackage(input.adapter_id);
  const probeId = assertProbeId(input.probe_id);
  const backend = assertBackend(input.backend);
  const path = probePath(probeId);
  const evidencePath = probeEvidencePath(probeId);
  const absoluteProbePath = assertPathAllowed(projectRoot, path, { purpose: "runtime-write" });
  const absoluteEvidencePath = assertPathAllowed(projectRoot, evidencePath, { purpose: "runtime-write" });
  if (existsSync(absoluteProbePath) || existsSync(absoluteEvidencePath)) {
    throw new ComathError("adapter OS-isolation probe already exists", {
      statusCode: 409,
      code: "AGENT_ADAPTER_OS_ISOLATION_PROBE_ALREADY_EXISTS"
    });
  }

  const providerAvailable = input.probe_environment?.provider_available === true;
  const { requestedProvider, knownProvider } = normalizeRequestedProvider(input.requested_provider);
  const classified = classifyProbe({ knownProvider, providerAvailable });
  const collection = options.collector?.({
    project_root: projectRoot,
    project_id: input.project_id,
    probe_id: probeId,
    adapter_id: input.adapter_id,
    backend,
    requested_provider: requestedProvider,
    provider: knownProvider,
    provider_available: providerAvailable
  }) ?? undefined;
  const collected = isCollectedOsIsolationProbe({ knownProvider, providerAvailable, collection });
  const probeStatus: AgentAdapterOsIsolationProbeStatus = collected
    ? "os_isolation_probe_collected"
    : classified.status;
  const observedProvider = collected ? knownProvider as AgentAdapterOsIsolationProvider : classified.observedProvider;
  const notes = [
    input.probe_environment?.platform ? `platform=${sanitizeProbeText(input.probe_environment.platform)}` : undefined,
    input.probe_environment?.notes ? sanitizeProbeText(input.probe_environment.notes) : undefined,
    collection?.notes ? sanitizeProbeText(collection.notes) : undefined,
    collected
      ? "Service-owned OS-enforced adapter execution probe collection was recorded."
      : "No complete OS-enforced adapter execution probe collection was recorded."
  ]
    .filter((entry): entry is string => Boolean(entry))
    .join(" ");

  const evidence: AgentAdapterOsIsolationProbe["evidence"] = {
    schema_version: "comath.agent_adapter_os_isolation_evidence.v1",
    kind: "agent_adapter_os_isolation_evidence",
    probe_id: probeId,
    probe_status: probeStatus,
    adapter_id: input.adapter_id,
    backend,
    provider: observedProvider,
    evidence_source: "service_owned_probe",
    process_isolation_enforced: collectionBoolean(collection, "process_isolation_enforced", collected),
    filesystem_scope_enforced: collectionBoolean(collection, "filesystem_scope_enforced", collected),
    network_isolation_enforced: collectionBoolean(collection, "network_isolation_enforced", collected),
    no_new_privileges: collectionBoolean(collection, "no_new_privileges", collected),
    escape_prevention: collectionBoolean(collection, "escape_prevention", collected),
    host_path_leak_free: true,
    secret_free: true,
    notes,
    ...collectedEvidenceDetails(collection, collected),
    proof_authority: "none",
    can_promote_claim: false,
    can_certify_ga: false
  };
  const evidenceText = canonicalJson(evidence);
  const evidenceArtifact: AgentAdapterOsIsolationEvidenceArtifact = {
    kind: "agent_adapter_os_isolation_evidence",
    path: evidencePath,
    sha256: sha256Text(evidenceText),
    size_bytes: Buffer.byteLength(evidenceText, "utf8")
  };
  const probe: AgentAdapterOsIsolationProbe = {
    schema_version: "comath.agent_adapter_os_isolation_probe.v1",
    probe_id: probeId,
    project_id: input.project_id,
    adapter_id: input.adapter_id,
    backend,
    created_at: new Date().toISOString(),
    ok: collected,
    probe_status: probeStatus,
    requested_provider: sanitizeProbeText(requestedProvider) || "unknown",
    observed_provider: observedProvider,
    provider_available: providerAvailable,
    probe_path: path,
    evidence_path: evidencePath,
    evidence_artifact: evidenceArtifact,
    evidence,
    adapter_execution_isolation: {
      required_for_ga: true,
      current_boundary: collected ? "os_enforced" : "process_boundary_only",
      os_enforced: collected,
      provider: observedProvider,
      claims_runtime_enforcement: false,
      proof_authority: "none"
    },
    blocker_certificate: collected
      ? null
      : {
          blocker_code: probeStatus,
          replayable_next_action: "Run a service-owned OS-enforced adapter execution probe on a host with a configured sandbox provider, then submit the resulting evidence artifact to the readiness review gate.",
          proof_authority: "none"
        },
    proof_authority: "none",
    can_promote_claim: false,
    can_certify_ga: false
  };

  mkdirSync(dirname(absoluteEvidencePath), { recursive: true });
  writeFileSync(absoluteEvidencePath, evidenceText, "utf8");
  mkdirSync(dirname(absoluteProbePath), { recursive: true });
  writeFileSync(absoluteProbePath, canonicalJson(probe), "utf8");
  appendAuditEvent(projectRoot, {
    project_id: input.project_id,
    event_type: "agent_adapter.os_isolation_probed",
    actor: sanitizeReviewText(input.actor),
    target_id: input.project_id,
    payload: {
      probe_id: probeId,
      adapter_id: input.adapter_id,
      backend,
      ok: collected,
      probe_status: probeStatus,
      requested_provider: probe.requested_provider,
      observed_provider: observedProvider,
      provider_available: providerAvailable,
      evidence_path: evidencePath,
      proof_authority: "none",
      can_promote_claim: false,
      can_certify_ga: false
    }
  });
  return probe;
}

export function reviewAgentAdapterOsIsolationReadiness(
  projectRoot: string,
  input: AgentAdapterOsIsolationReviewInput
): AgentAdapterOsIsolationReview {
  getAgentAdapterPackage(input.adapter_id);
  const reviewId = assertReviewId(input.review_id);
  const backend = input.backend ?? "bundled";
  const path = reviewPath(reviewId);
  const absoluteReviewPath = assertPathAllowed(projectRoot, path, { purpose: "runtime-write" });
  if (existsSync(absoluteReviewPath)) {
    throw new ComathError("adapter OS-isolation readiness review already exists", {
      statusCode: 409,
      code: "AGENT_ADAPTER_OS_ISOLATION_REVIEW_ALREADY_EXISTS"
    });
  }
  const evidenceBundle = input.evidence_path ? readEvidenceArtifact(projectRoot, input.evidence_path) : undefined;
  const evidence = evidenceBundle?.evidence;
  const provider = evidence?.provider ?? null;
  const providerOsEnforced = provider ? osEnforcedProviders.has(provider) : false;
  const hostPathSecretFree = evidenceBundle ? !evidenceLeaksHostPathOrSecret(evidenceBundle.text, evidence as AgentAdapterOsIsolationEvidence) : false;
  const nonAuthority = evidence ? !evidenceOverclaimsAuthority(evidence) : false;
  const checks: AgentAdapterOsIsolationReview["checks"] = {
    evidence_artifact_bound: check(Boolean(evidenceBundle), evidenceBundle ? evidenceBundle.artifact.path : null),
    provider_os_enforced: check(providerOsEnforced, provider),
    process_isolation: check(evidence?.process_isolation_enforced === true, evidence?.process_isolation_enforced ?? null),
    filesystem_isolation: check(evidence?.filesystem_scope_enforced === true, evidence?.filesystem_scope_enforced ?? null),
    network_isolation: check(evidence?.network_isolation_enforced === true, evidence?.network_isolation_enforced ?? null),
    no_new_privileges: check(evidence?.no_new_privileges === true, evidence?.no_new_privileges ?? null),
    escape_prevention: check(evidence?.escape_prevention === true, evidence?.escape_prevention ?? null),
    adapter_binding: check(evidenceAdapterMatches(evidence, input.adapter_id), evidence?.adapter_id ?? null),
    backend_binding: check(evidenceBackendMatches(evidence, backend), evidence?.backend ?? null),
    service_owned_probe: check(evidenceIsServiceOwnedProbe(evidence), evidence?.evidence_source ?? null),
    collected_probe_binding: check(
      evidenceHasCollectedProbeBinding(projectRoot, evidenceBundle?.artifact, evidence),
      evidence?.probe_id ?? null
    ),
    host_path_secret_free: check(hostPathSecretFree, hostPathSecretFree),
    non_authority: check(nonAuthority, nonAuthority)
  };
  const vetoes = buildVetoes({ evidencePresent: Boolean(evidenceBundle), checks, evidence, text: evidenceBundle?.text });
  const ok = vetoes.length === 0;
  const review: AgentAdapterOsIsolationReview = {
    schema_version: "comath.agent_adapter_os_isolation_readiness.v1",
    review_id: reviewId,
    project_id: input.project_id,
    adapter_id: input.adapter_id,
    backend,
    created_at: new Date().toISOString(),
    ok,
    readiness_status: ok ? "ready_for_os_isolation_release_review" : "blocked_missing_os_enforced_adapter_isolation",
    review_path: path,
    evidence_artifact: evidenceBundle?.artifact ?? null,
    checks,
    adapter_execution_isolation: {
      required_for_ga: true,
      current_boundary: ok ? "os_enforced" : "process_boundary_only",
      os_enforced: ok,
      provider,
      claims_runtime_enforcement: false,
      proof_authority: "none"
    },
    vetoes,
    proof_authority: "none",
    can_promote_claim: false,
    can_certify_ga: false
  };
  mkdirSync(dirname(absoluteReviewPath), { recursive: true });
  writeFileSync(absoluteReviewPath, canonicalJson(review), "utf8");
  appendAuditEvent(projectRoot, {
    project_id: input.project_id,
    event_type: "agent_adapter.os_isolation_reviewed",
    actor: sanitizeReviewText(input.actor),
    target_id: input.project_id,
    payload: {
      review_id: reviewId,
      adapter_id: input.adapter_id,
      backend,
      ok,
      readiness_status: review.readiness_status,
      evidence_path: evidenceBundle?.artifact.path ?? null,
      provider,
      os_enforced: ok,
      veto_codes: vetoes.map((veto) => veto.code),
      proof_authority: "none",
      can_promote_claim: false,
      can_certify_ga: false
    }
  });
  return review;
}
