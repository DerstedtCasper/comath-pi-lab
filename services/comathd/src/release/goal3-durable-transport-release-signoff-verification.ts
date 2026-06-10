import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { appendAuditEvent } from "../audit/jsonl-writer.js";
import { ComathError } from "../errors.js";
import { assertPathAllowed } from "../security/path-policy.js";

type ArtifactReference = {
  kind: string;
  path: string;
  sha256: string;
  size_bytes: number;
};

type DurableTransportPrerequisiteBody = {
  schema_version?: unknown;
  durable_transport_signoff_prerequisite_id?: unknown;
  project_id?: unknown;
  ok?: unknown;
  durable_transport_signoff_status?: unknown;
  blocker_reasons?: unknown;
  durable_transport_signoff_prerequisite_path?: unknown;
  requested_review_mode?: unknown;
  operational_readiness_review_artifact?: unknown;
  operational_readiness_review_current?: unknown;
  transport_closure_review_artifact?: unknown;
  transport_closure_review_current?: unknown;
  terminal_completion_certificate_artifact?: unknown;
  terminal_completion_certificate_current?: unknown;
  durable_transport_contract_artifact?: unknown;
  durable_transport_contract_current?: unknown;
  transport_continuity_artifact?: unknown;
  transport_continuity_current?: unknown;
  transport_contract_artifact?: unknown;
  transport_contract_current?: unknown;
  terminal_unattended_completion_certified?: unknown;
  completion_certificate_available?: unknown;
  unattended_real_host_execution_completed?: unknown;
  maintained_transport_primitive_bound?: unknown;
  service_route_bound?: unknown;
  client_fetch_contract_bound?: unknown;
  service_transport_primitive?: unknown;
  client_transport_primitive?: unknown;
  durable_transport_provided?: unknown;
  live_transport_open?: unknown;
  indefinite_stream_open?: unknown;
  long_lived_websocket_provided?: unknown;
  long_lived_sse_provided?: unknown;
  pi_direct_write_allowed?: unknown;
  direct_trusted_state_mutation?: unknown;
  proof_authority?: unknown;
  can_promote_claim?: unknown;
  can_certify_ga?: unknown;
  ga_certification_gate_separate?: unknown;
};

type ExternalDurableTransportEvidenceBody = {
  schema_version?: unknown;
  external_durable_transport_evidence_id?: unknown;
  project_id?: unknown;
  ok?: unknown;
  evidence_status?: unknown;
  evidence_path?: unknown;
  provider_id?: unknown;
  provider_kind?: unknown;
  transport_primitive?: unknown;
  maintenance_source?: unknown;
  daemon_identity_sha256?: unknown;
  daemon_policy_sha256?: unknown;
  session_policy_sha256?: unknown;
  provider_attestation_sha256?: unknown;
  operator_session_id?: unknown;
  agent_run_id?: unknown;
  service_route?: unknown;
  service_transport_primitive?: unknown;
  client_transport_primitive?: unknown;
  fresh_until?: unknown;
  freshness_window_seconds?: unknown;
  reconnect_policy?: unknown;
  external_durable_transport_primitive_bound?: unknown;
  durable_transport_provided?: unknown;
  live_transport_open?: unknown;
  co_math_transport_stack_built?: unknown;
  co_math_websocket_stack_built?: unknown;
  custom_transport_implementation?: unknown;
  indefinite_stream_open?: unknown;
  long_lived_websocket_provided?: unknown;
  long_lived_sse_provided?: unknown;
  pi_direct_write_allowed?: unknown;
  direct_trusted_state_mutation?: unknown;
  proof_authority?: unknown;
  can_promote_claim?: unknown;
  can_certify_ga?: unknown;
};

type ExternalEvidenceSummary = {
  artifact: ArtifactReference;
  evidenceId: string;
  providerId: string;
  providerKind: "maintained_external_operator_transport";
  transportPrimitive: "external_reconnectable_operator_session";
  daemonIdentitySha256: string;
  daemonPolicySha256: string;
  sessionPolicySha256: string;
  providerAttestationSha256: string;
  operatorSessionId: string;
  agentRunId: string;
  serviceRoute: string;
  freshUntil: string;
  freshnessWindowSeconds: number;
};

type Task317ChainCurrent = {
  operational: ArtifactReference;
  closure: ArtifactReference;
  terminalCertificate: ArtifactReference;
  durableContract: ArtifactReference;
  continuity: ArtifactReference;
  contract: ArtifactReference;
  serviceRoute: string;
};

export type Goal3DurableTransportReleaseSignoffVerificationInput = {
  project_id: string;
  durable_transport_signoff_verification_id?: string;
  actor?: string;
  durable_transport_signoff_prerequisite_id: string;
  durable_transport_signoff_prerequisite_path: string;
  durable_transport_signoff_prerequisite_sha256: string;
  external_durable_transport_evidence_id?: string;
  external_durable_transport_evidence_path?: string;
  external_durable_transport_evidence_sha256?: string;
  requested_verification_mode?: "open_formal_workbench_durable_transport_release_signoff_verification";
};

export type Goal3DurableTransportReleaseSignoffVerification = {
  schema_version: "comath.goal3_durable_transport_release_signoff_verification.v1";
  durable_transport_signoff_verification_id: string;
  project_id: string;
  actor: string;
  created_at: string;
  ok: boolean;
  durable_transport_signoff_verification_status:
    | "blocked_external_durable_transport_evidence_not_bound"
    | "verified_external_durable_transport_primitive_bound";
  blocker_reasons: string[];
  durable_transport_signoff_verification_path: string;
  requested_verification_mode: "open_formal_workbench_durable_transport_release_signoff_verification";
  durable_transport_signoff_prerequisite_id: string;
  durable_transport_signoff_prerequisite_path: string;
  durable_transport_signoff_prerequisite_artifact: ArtifactReference;
  durable_transport_signoff_prerequisite_current: true;
  durable_transport_signoff_status: "blocked_durable_long_lived_transport_not_provided";
  operational_readiness_review_artifact: ArtifactReference;
  operational_readiness_review_current: true;
  transport_closure_review_artifact: ArtifactReference;
  transport_closure_review_current: true;
  terminal_completion_certificate_artifact: ArtifactReference;
  terminal_completion_certificate_current: true;
  durable_transport_contract_artifact: ArtifactReference;
  durable_transport_contract_current: true;
  transport_continuity_artifact: ArtifactReference;
  transport_continuity_current: true;
  transport_contract_artifact: ArtifactReference;
  transport_contract_current: true;
  external_durable_transport_evidence_bound: boolean;
  external_durable_transport_evidence_id?: string;
  external_durable_transport_evidence_artifact?: ArtifactReference;
  external_durable_transport_evidence_current?: true;
  external_durable_transport_primitive_bound: boolean;
  provider_id?: string;
  provider_kind?: "maintained_external_operator_transport";
  transport_primitive?: "external_reconnectable_operator_session";
  daemon_identity_sha256?: string;
  daemon_policy_sha256?: string;
  session_policy_sha256?: string;
  provider_attestation_sha256?: string;
  operator_session_id?: string;
  agent_run_id?: string;
  service_route?: string;
  fresh_until?: string;
  freshness_window_seconds?: number;
  service_transport_primitive: "node_http_agent_run_log_session_route";
  client_transport_primitive: "pi_fetch_get_text";
  durable_transport_provided: boolean;
  live_transport_open: boolean;
  co_math_transport_stack_built: false;
  co_math_websocket_stack_built: false;
  custom_transport_implementation: false;
  indefinite_stream_open: false;
  long_lived_websocket_provided: false;
  long_lived_sse_provided: false;
  pi_direct_write_allowed: false;
  direct_trusted_state_mutation: false;
  ga_release_signoff_ready: false;
  proof_authority: "none";
  can_promote_claim: false;
  can_certify_ga: false;
  durable_transport_signoff_verification_artifact: ArtifactReference;
};

const invalidCode = "GOAL3_DURABLE_TRANSPORT_RELEASE_SIGNOFF_VERIFICATION_INVALID";
const staleCode = "GOAL3_DURABLE_TRANSPORT_RELEASE_SIGNOFF_VERIFICATION_STALE";
const allowedInputKeys = new Set([
  "project_id",
  "durable_transport_signoff_verification_id",
  "actor",
  "durable_transport_signoff_prerequisite_id",
  "durable_transport_signoff_prerequisite_path",
  "durable_transport_signoff_prerequisite_sha256",
  "external_durable_transport_evidence_id",
  "external_durable_transport_evidence_path",
  "external_durable_transport_evidence_sha256",
  "requested_verification_mode"
]);

function normalizeRelativePath(path: string): string {
  return path.replace(/\\/g, "/").replace(/^\.\/+/u, "");
}

function verificationPath(verificationId: string): string {
  return normalizeRelativePath(
    join(
      ".comath",
      "release",
      "goal3-durable-transport-release-signoff-verification",
      verificationId,
      "verification.json"
    )
  );
}

function prerequisitePath(prerequisiteId: string): string {
  return normalizeRelativePath(
    join(
      ".comath",
      "release",
      "goal3-durable-transport-release-signoff-prerequisite",
      prerequisiteId,
      "prerequisite.json"
    )
  );
}

function externalEvidencePath(evidenceId: string): string {
  return normalizeRelativePath(
    join(
      ".comath",
      "release",
      "goal3-external-durable-transport-evidence",
      evidenceId,
      "external-durable-transport-evidence.json"
    )
  );
}

function sha256Bytes(bytes: Buffer): string {
  return createHash("sha256").update(bytes).digest("hex");
}

function sha256Text(text: string): string {
  return createHash("sha256").update(text, "utf8").digest("hex");
}

function invalid(message: string): never {
  throw new ComathError(message, {
    statusCode: 400,
    code: invalidCode
  });
}

function stale(message: string): never {
  throw new ComathError(message, {
    statusCode: 400,
    code: staleCode
  });
}

function assertNoUnexpectedInputKeys(input: Goal3DurableTransportReleaseSignoffVerificationInput): void {
  for (const key of Object.keys(input as Record<string, unknown>)) {
    if (!allowedInputKeys.has(key)) {
      invalid(`Goal 3 durable transport release-signoff verification input field is not allowed: ${key}`);
    }
  }
}

function assertSafeId(value: string | undefined, label: string): string {
  const id = typeof value === "string" ? value.trim() : "";
  if (!/^[A-Za-z0-9][A-Za-z0-9._-]{2,180}$/u.test(id)) {
    invalid(`${label} is invalid`);
  }
  return id;
}

function assertSha256(value: string | undefined): string {
  const sha256 = typeof value === "string" ? value.trim().toLowerCase() : "";
  if (!/^[a-f0-9]{64}$/u.test(sha256)) {
    stale("Goal 3 durable transport release-signoff verification referenced material is stale");
  }
  return sha256;
}

function assertProjectRelativePath(path: string, label: string): string {
  const normalized = normalizeRelativePath(path);
  if (
    !normalized.startsWith(".comath/") ||
    normalized.startsWith("/") ||
    normalized.startsWith("../") ||
    normalized.includes("/../") ||
    /^[A-Za-z]:\//u.test(normalized) ||
    normalized.includes("//")
  ) {
    invalid(`Goal 3 durable transport release-signoff verification ${label} is not project-relative`);
  }
  return normalized;
}

function artifactReference(value: unknown, label: string, expectedKind: string, expectedPath?: string): ArtifactReference {
  const record = value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
  const path = typeof record.path === "string" ? normalizeRelativePath(record.path) : "";
  const sizeBytes = record.size_bytes;
  if (
    record.kind !== expectedKind ||
    (expectedPath !== undefined && path !== normalizeRelativePath(expectedPath)) ||
    !path.startsWith(".comath/") ||
    typeof record.sha256 !== "string" ||
    !/^[a-f0-9]{64}$/u.test(record.sha256) ||
    typeof sizeBytes !== "number" ||
    !Number.isSafeInteger(sizeBytes) ||
    sizeBytes <= 0
  ) {
    invalid(`Goal 3 durable transport release-signoff verification ${label} reference is invalid`);
  }
  return {
    kind: record.kind,
    path,
    sha256: record.sha256,
    size_bytes: sizeBytes
  };
}

function readJsonArtifact<T>(
  projectRoot: string,
  canonicalPath: string,
  expectedSha256: string,
  kind: string,
  expectedSizeBytes?: number
): { body: T; artifact: ArtifactReference } {
  const path = assertProjectRelativePath(canonicalPath, "artifact path");
  const absolutePath = assertPathAllowed(projectRoot, path, { purpose: "read", resolveRealpath: true });
  if (!existsSync(absolutePath) || !statSync(absolutePath).isFile()) {
    stale("Goal 3 durable transport release-signoff verification referenced artifact is stale");
  }
  const content = readFileSync(absolutePath);
  const actualSha256 = sha256Bytes(content);
  if (actualSha256 !== assertSha256(expectedSha256)) {
    stale("Goal 3 durable transport release-signoff verification referenced artifact hash is stale");
  }
  if (expectedSizeBytes !== undefined && content.byteLength !== expectedSizeBytes) {
    stale("Goal 3 durable transport release-signoff verification referenced artifact size is stale");
  }
  try {
    return {
      body: JSON.parse(content.toString("utf8")) as T,
      artifact: {
        kind,
        path,
        sha256: actualSha256,
        size_bytes: content.byteLength
      }
    };
  } catch {
    invalid("Goal 3 durable transport release-signoff verification referenced JSON is invalid");
  }
}

function readReferencedJsonArtifact<T>(
  projectRoot: string,
  reference: ArtifactReference,
  label: string
): { body: T; artifact: ArtifactReference } {
  return readJsonArtifact<T>(projectRoot, reference.path, reference.sha256, reference.kind, reference.size_bytes);
}

function sanitizeActor(value: string | undefined): string {
  return (value ?? "goal3-durable-transport-release-signoff-verification")
    .replace(/(?:[A-Za-z]:[\\/][^\s"']+|\\\\[^\s"']+)/gu, "[redacted-path]")
    .replace(/(?:Authorization:\s*Bearer\s+\S+|api_key=\S+|token=\S+|sk-[A-Za-z0-9_-]+)/giu, "[redacted-secret]")
    .replace(
      /\b(?:clean_replay_passed|completed_formal_proof|formally_checked|formal_proof_verified|formal_replay_passed|lean_kernel_clean_replay|kernel_checked|proof_success|GA certified|ga_release_signoff_ready\s*[:=]\s*(?:true|1)|can_certify_ga\s*[:=]\s*(?:true|1)|can_promote_claim\s*[:=]\s*(?:true|1))\b/giu,
      "[redacted-authority-claim]"
    )
    .replace(/\b(?:durable transport provided|live transport open)\b/giu, "[redacted-transport-claim]")
    .slice(0, 400);
}

function containsReleaseOrProofOverclaim(value: unknown): boolean {
  if (typeof value === "string") {
    return /\b(?:clean_replay_passed|completed_formal_proof|formally_checked|formal_proof_verified|formal_replay_passed|lean_kernel_clean_replay|kernel_checked|proof_success|proven|verified_final_authority_evidence|GA certified|durable transport provided|live transport open)\b/iu.test(value);
  }
  if (Array.isArray(value)) {
    return value.some((entry) => containsReleaseOrProofOverclaim(entry));
  }
  if (!value || typeof value !== "object") {
    return false;
  }
  for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
    const normalizedKey = key.toLowerCase();
    if (normalizedKey === "proof_authority" && entry !== "none") {
      return true;
    }
    if (
      (normalizedKey === "can_promote_claim" ||
        normalizedKey === "can_certify_ga" ||
        normalizedKey === "ga_certified" ||
        normalizedKey === "ga_release_signoff_ready" ||
        normalizedKey === "final_release_signoff_ready" ||
        normalizedKey === "result_can_be_used_as_proof" ||
        normalizedKey === "storage_is_proof_authority" ||
        normalizedKey === "attestation_is_proof_authority" ||
        normalizedKey === "provider_result_is_proof_authority" ||
        normalizedKey === "policy_result_is_proof_authority" ||
        normalizedKey === "verification_is_proof_authority" ||
        normalizedKey === "restore_source" ||
        normalizedKey === "can_restore" ||
        normalizedKey === "co_math_transport_stack_built" ||
        normalizedKey === "co_math_websocket_stack_built" ||
        normalizedKey === "custom_transport_implementation") &&
      entry === true
    ) {
      return true;
    }
    if (containsReleaseOrProofOverclaim(entry)) {
      return true;
    }
  }
  return false;
}

function assertNoReleaseOrProofOverclaim(value: unknown, label: string): void {
  if (containsReleaseOrProofOverclaim(value)) {
    invalid(`Goal 3 durable transport release-signoff verification ${label} contains proof, GA, signoff, restore, or custom transport overclaims`);
  }
}

function assertNoTask317AuthorityOverclaim(value: unknown, label: string): void {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    invalid(`Goal 3 durable transport release-signoff verification ${label} JSON is invalid`);
  }
  assertNoReleaseOrProofOverclaim(value, label);
  const record = value as Record<string, unknown>;
  const bad =
    record.proof_authority !== "none" ||
    record.can_promote_claim !== false ||
    record.can_certify_ga !== false ||
    record.durable_transport_provided !== false ||
    record.live_transport_open !== false ||
    (record.indefinite_stream_open !== undefined && record.indefinite_stream_open !== false) ||
    (record.long_lived_websocket_provided !== undefined && record.long_lived_websocket_provided !== false) ||
    (record.long_lived_sse_provided !== undefined && record.long_lived_sse_provided !== false) ||
    (record.pi_direct_write_allowed !== undefined && record.pi_direct_write_allowed !== false) ||
    (record.direct_trusted_state_mutation !== undefined && record.direct_trusted_state_mutation !== false);
  if (bad) {
    invalid(`Goal 3 durable transport release-signoff verification ${label} violates Task317 boundaries`);
  }
}

function assertTask317Prerequisite(
  body: DurableTransportPrerequisiteBody,
  projectId: string,
  prerequisiteId: string,
  artifact: ArtifactReference
): {
  operational: ArtifactReference;
  closure: ArtifactReference;
  terminalCertificate: ArtifactReference;
  durableContract: ArtifactReference;
  continuity: ArtifactReference;
  contract: ArtifactReference;
} {
  const blockers = Array.isArray(body.blocker_reasons) ? body.blocker_reasons : [];
  if (
    body.schema_version !== "comath.goal3_durable_transport_release_signoff_prerequisite.v1" ||
    body.durable_transport_signoff_prerequisite_id !== prerequisiteId ||
    body.project_id !== projectId ||
    body.ok !== false ||
    body.durable_transport_signoff_status !== "blocked_durable_long_lived_transport_not_provided" ||
    !blockers.includes("durable_long_lived_transport_not_provided") ||
    body.durable_transport_signoff_prerequisite_path !== artifact.path ||
    body.requested_review_mode !== "open_formal_workbench_durable_transport_release_signoff_prerequisite" ||
    body.operational_readiness_review_current !== true ||
    body.transport_closure_review_current !== true ||
    body.terminal_completion_certificate_current !== true ||
    body.durable_transport_contract_current !== true ||
    body.transport_continuity_current !== true ||
    body.transport_contract_current !== true ||
    body.terminal_unattended_completion_certified !== true ||
    body.completion_certificate_available !== true ||
    body.unattended_real_host_execution_completed !== true ||
    body.maintained_transport_primitive_bound !== true ||
    body.service_route_bound !== true ||
    body.client_fetch_contract_bound !== true ||
    body.service_transport_primitive !== "node_http_agent_run_log_session_route" ||
    body.client_transport_primitive !== "pi_fetch_get_text" ||
    body.ga_certification_gate_separate !== true
  ) {
    invalid("Goal 3 durable transport release-signoff verification Task317 prerequisite violates boundaries");
  }
  assertNoTask317AuthorityOverclaim(body, "Task317 prerequisite");
  return {
    operational: artifactReference(body.operational_readiness_review_artifact, "operational-readiness", "goal3_ga_operational_readiness_review"),
    closure: artifactReference(body.transport_closure_review_artifact, "transport-closure", "operator_service_transport_closure_review"),
    terminalCertificate: artifactReference(
      body.terminal_completion_certificate_artifact,
      "terminal-completion-certificate",
      "unattended_real_host_terminal_completion_certificate"
    ),
    durableContract: artifactReference(
      body.durable_transport_contract_artifact,
      "durable-transport-contract",
      "unattended_real_host_durable_transport_contract"
    ),
    continuity: artifactReference(body.transport_continuity_artifact, "transport-continuity", "operator_service_transport_continuity"),
    contract: artifactReference(body.transport_contract_artifact, "transport-contract", "operator_service_transport_contract")
  };
}

function closureServiceRoute(body: Record<string, unknown>): string {
  const serviceRoute = typeof body.service_route === "string" ? body.service_route.trim() : "";
  if (!/^\/agent\/run\/[A-Za-z0-9._-]+\/log-session$/u.test(serviceRoute)) {
    invalid("Goal 3 durable transport release-signoff verification Task317 transport closure route is invalid");
  }
  return serviceRoute;
}

function assertTask317ChainCurrent(projectRoot: string, refs: ReturnType<typeof assertTask317Prerequisite>): Task317ChainCurrent {
  const operational = readReferencedJsonArtifact<Record<string, unknown>>(projectRoot, refs.operational, "operational readiness");
  const closure = readReferencedJsonArtifact<Record<string, unknown>>(projectRoot, refs.closure, "transport closure");
  const terminalCertificate = readReferencedJsonArtifact<Record<string, unknown>>(
    projectRoot,
    refs.terminalCertificate,
    "terminal certificate"
  );
  const durableContract = readReferencedJsonArtifact<Record<string, unknown>>(projectRoot, refs.durableContract, "durable contract");
  const continuity = readReferencedJsonArtifact<Record<string, unknown>>(projectRoot, refs.continuity, "transport continuity");
  const contract = readReferencedJsonArtifact<Record<string, unknown>>(projectRoot, refs.contract, "transport contract");
  assertNoTask317AuthorityOverclaim(operational.body, "operational readiness");
  assertNoTask317AuthorityOverclaim(closure.body, "transport closure");
  assertNoTask317AuthorityOverclaim(terminalCertificate.body, "terminal completion certificate");
  assertNoTask317AuthorityOverclaim(durableContract.body, "durable transport contract");
  assertNoTask317AuthorityOverclaim(continuity.body, "transport continuity");
  assertNoTask317AuthorityOverclaim(contract.body, "transport contract");
  return {
    operational: operational.artifact,
    closure: closure.artifact,
    terminalCertificate: terminalCertificate.artifact,
    durableContract: durableContract.artifact,
    continuity: continuity.artifact,
    contract: contract.artifact,
    serviceRoute: closureServiceRoute(closure.body)
  };
}

function hasCompleteEvidenceInput(input: Goal3DurableTransportReleaseSignoffVerificationInput): boolean {
  const fields = [
    input.external_durable_transport_evidence_id,
    input.external_durable_transport_evidence_path,
    input.external_durable_transport_evidence_sha256
  ];
  const present = fields.filter((field) => field !== undefined);
  if (present.length === 0) {
    return false;
  }
  if (present.length !== fields.length) {
    invalid("Goal 3 durable transport release-signoff verification external evidence reference is incomplete");
  }
  return true;
}

function assertHexSha(value: unknown, label: string): string {
  const text = typeof value === "string" ? value.trim().toLowerCase() : "";
  if (!/^[a-f0-9]{64}$/u.test(text)) {
    invalid(`Goal 3 durable transport release-signoff verification ${label} hash is invalid`);
  }
  return text;
}

function assertExternalDurableTransportEvidence(
  body: ExternalDurableTransportEvidenceBody,
  projectId: string,
  evidenceId: string,
  artifact: ArtifactReference,
  expectedServiceRoute: string
): ExternalEvidenceSummary {
  const providerId = typeof body.provider_id === "string" ? body.provider_id.trim() : "";
  const operatorSessionId = typeof body.operator_session_id === "string" ? body.operator_session_id.trim() : "";
  const agentRunId = typeof body.agent_run_id === "string" ? body.agent_run_id.trim() : "";
  const serviceRoute = typeof body.service_route === "string" ? body.service_route.trim() : "";
  const freshUntil = typeof body.fresh_until === "string" ? body.fresh_until.trim() : "";
  const freshnessWindowSeconds = body.freshness_window_seconds;
  const freshUntilMs = Date.parse(freshUntil);
  assertNoReleaseOrProofOverclaim(body, "external durable transport evidence");
  if (
    body.schema_version !== "comath.goal3_external_durable_transport_evidence.v1" ||
    body.external_durable_transport_evidence_id !== evidenceId ||
    body.project_id !== projectId ||
    body.ok !== true ||
    body.evidence_status !== "external_durable_transport_primitive_available" ||
    body.evidence_path !== artifact.path ||
    !/^[A-Za-z0-9][A-Za-z0-9._:-]{2,120}$/u.test(providerId) ||
    /(?:comath|custom|ad[-_ ]?hoc)/iu.test(providerId) ||
    body.provider_kind !== "maintained_external_operator_transport" ||
    body.transport_primitive !== "external_reconnectable_operator_session" ||
    body.maintenance_source !== "external_maintained_primitive" ||
    !/^[A-Za-z0-9][A-Za-z0-9._-]{2,140}$/u.test(operatorSessionId) ||
    !/^[A-Za-z0-9][A-Za-z0-9._-]{2,140}$/u.test(agentRunId) ||
    serviceRoute !== `/agent/run/${agentRunId}/log-session` ||
    serviceRoute !== expectedServiceRoute ||
    body.service_transport_primitive !== "node_http_agent_run_log_session_route" ||
    body.client_transport_primitive !== "pi_fetch_get_text" ||
    Number.isNaN(freshUntilMs) ||
    freshUntilMs <= Date.now() ||
    typeof freshnessWindowSeconds !== "number" ||
    !Number.isSafeInteger(freshnessWindowSeconds) ||
    freshnessWindowSeconds <= 0 ||
    freshnessWindowSeconds > 30 * 24 * 60 * 60 ||
    freshUntilMs > Date.now() + freshnessWindowSeconds * 1000 ||
    body.reconnect_policy !== "external_provider_reconnect_required" ||
    body.external_durable_transport_primitive_bound !== true ||
    body.durable_transport_provided !== true ||
    body.live_transport_open !== true ||
    body.co_math_transport_stack_built !== false ||
    body.co_math_websocket_stack_built !== false ||
    body.custom_transport_implementation !== false ||
    body.indefinite_stream_open !== false ||
    body.long_lived_websocket_provided !== false ||
    body.long_lived_sse_provided !== false ||
    body.pi_direct_write_allowed !== false ||
    body.direct_trusted_state_mutation !== false ||
    body.proof_authority !== "none" ||
    body.can_promote_claim !== false ||
    body.can_certify_ga !== false
  ) {
    invalid("Goal 3 durable transport release-signoff verification external durable transport evidence violates boundaries");
  }
  return {
    artifact,
    evidenceId,
    providerId,
    providerKind: "maintained_external_operator_transport",
    transportPrimitive: "external_reconnectable_operator_session",
    daemonIdentitySha256: assertHexSha(body.daemon_identity_sha256, "daemon identity"),
    daemonPolicySha256: assertHexSha(body.daemon_policy_sha256, "daemon policy"),
    sessionPolicySha256: assertHexSha(body.session_policy_sha256, "session policy"),
    providerAttestationSha256: assertHexSha(body.provider_attestation_sha256, "provider attestation"),
    operatorSessionId,
    agentRunId,
    serviceRoute,
    freshUntil,
    freshnessWindowSeconds
  };
}

function readOptionalExternalEvidence(
  projectRoot: string,
  input: Goal3DurableTransportReleaseSignoffVerificationInput,
  projectId: string,
  expectedServiceRoute: string
): ExternalEvidenceSummary | null {
  if (!hasCompleteEvidenceInput(input)) {
    return null;
  }
  const evidenceId = assertSafeId(input.external_durable_transport_evidence_id, "external_durable_transport_evidence_id");
  const canonicalPath = externalEvidencePath(evidenceId);
  if (normalizeRelativePath(input.external_durable_transport_evidence_path ?? "") !== canonicalPath) {
    invalid("Goal 3 durable transport release-signoff verification external evidence path is not canonical");
  }
  const read = readJsonArtifact<ExternalDurableTransportEvidenceBody>(
    projectRoot,
    canonicalPath,
    input.external_durable_transport_evidence_sha256 ?? "",
    "goal3_external_durable_transport_evidence"
  );
  return assertExternalDurableTransportEvidence(read.body, projectId, evidenceId, read.artifact, expectedServiceRoute);
}

export function recordGoal3DurableTransportReleaseSignoffVerification(
  projectRoot: string,
  input: Goal3DurableTransportReleaseSignoffVerificationInput
): Goal3DurableTransportReleaseSignoffVerification {
  assertNoUnexpectedInputKeys(input);
  const projectId = assertSafeId(input.project_id, "project_id");
  const verificationId = assertSafeId(
    input.durable_transport_signoff_verification_id,
    "durable_transport_signoff_verification_id"
  );
  const requestedMode =
    input.requested_verification_mode ?? "open_formal_workbench_durable_transport_release_signoff_verification";
  if (requestedMode !== "open_formal_workbench_durable_transport_release_signoff_verification") {
    invalid("Goal 3 durable transport release-signoff verification mode is invalid");
  }
  const outputPath = verificationPath(verificationId);
  const absoluteOutputPath = assertPathAllowed(projectRoot, outputPath, { purpose: "runtime-write" });
  if (existsSync(absoluteOutputPath)) {
    throw new ComathError("Goal 3 durable transport release-signoff verification already exists", {
      statusCode: 409,
      code: "GOAL3_DURABLE_TRANSPORT_RELEASE_SIGNOFF_VERIFICATION_ALREADY_EXISTS"
    });
  }

  const prerequisiteId = assertSafeId(
    input.durable_transport_signoff_prerequisite_id,
    "durable_transport_signoff_prerequisite_id"
  );
  const prerequisiteCanonicalPath = prerequisitePath(prerequisiteId);
  if (normalizeRelativePath(input.durable_transport_signoff_prerequisite_path) !== prerequisiteCanonicalPath) {
    invalid("Goal 3 durable transport release-signoff verification prerequisite path is not canonical");
  }
  const prerequisite = readJsonArtifact<DurableTransportPrerequisiteBody>(
    projectRoot,
    prerequisiteCanonicalPath,
    input.durable_transport_signoff_prerequisite_sha256,
    "goal3_durable_transport_release_signoff_prerequisite"
  );
  const task317Refs = assertTask317Prerequisite(prerequisite.body, projectId, prerequisiteId, prerequisite.artifact);
  const currentChain = assertTask317ChainCurrent(projectRoot, task317Refs);
  const externalEvidence = readOptionalExternalEvidence(projectRoot, input, projectId, currentChain.serviceRoute);
  const actor = sanitizeActor(input.actor);
  const verified = externalEvidence !== null;
  const blockerReasons = verified ? [] : ["external_durable_transport_evidence_not_bound"];

  const body = {
    schema_version: "comath.goal3_durable_transport_release_signoff_verification.v1",
    durable_transport_signoff_verification_id: verificationId,
    project_id: projectId,
    actor,
    created_at: new Date().toISOString(),
    ok: verified,
    durable_transport_signoff_verification_status: verified
      ? "verified_external_durable_transport_primitive_bound"
      : "blocked_external_durable_transport_evidence_not_bound",
    blocker_reasons: blockerReasons,
    durable_transport_signoff_verification_path: outputPath,
    requested_verification_mode: "open_formal_workbench_durable_transport_release_signoff_verification",
    durable_transport_signoff_prerequisite_id: prerequisiteId,
    durable_transport_signoff_prerequisite_path: prerequisite.artifact.path,
    durable_transport_signoff_prerequisite_artifact: prerequisite.artifact,
    durable_transport_signoff_prerequisite_current: true,
    durable_transport_signoff_status: "blocked_durable_long_lived_transport_not_provided",
    operational_readiness_review_artifact: currentChain.operational,
    operational_readiness_review_current: true,
    transport_closure_review_artifact: currentChain.closure,
    transport_closure_review_current: true,
    terminal_completion_certificate_artifact: currentChain.terminalCertificate,
    terminal_completion_certificate_current: true,
    durable_transport_contract_artifact: currentChain.durableContract,
    durable_transport_contract_current: true,
    transport_continuity_artifact: currentChain.continuity,
    transport_continuity_current: true,
    transport_contract_artifact: currentChain.contract,
    transport_contract_current: true,
    external_durable_transport_evidence_bound: verified,
    ...(externalEvidence !== null
      ? {
          external_durable_transport_evidence_id: externalEvidence.evidenceId,
          external_durable_transport_evidence_artifact: externalEvidence.artifact,
          external_durable_transport_evidence_current: true as const,
          provider_id: externalEvidence.providerId,
          provider_kind: externalEvidence.providerKind,
          transport_primitive: externalEvidence.transportPrimitive,
          daemon_identity_sha256: externalEvidence.daemonIdentitySha256,
          daemon_policy_sha256: externalEvidence.daemonPolicySha256,
          session_policy_sha256: externalEvidence.sessionPolicySha256,
          provider_attestation_sha256: externalEvidence.providerAttestationSha256,
          operator_session_id: externalEvidence.operatorSessionId,
          agent_run_id: externalEvidence.agentRunId,
          service_route: externalEvidence.serviceRoute,
          fresh_until: externalEvidence.freshUntil,
          freshness_window_seconds: externalEvidence.freshnessWindowSeconds
        }
      : {}),
    external_durable_transport_primitive_bound: verified,
    service_transport_primitive: "node_http_agent_run_log_session_route",
    client_transport_primitive: "pi_fetch_get_text",
    durable_transport_provided: verified,
    live_transport_open: verified,
    co_math_transport_stack_built: false,
    co_math_websocket_stack_built: false,
    custom_transport_implementation: false,
    indefinite_stream_open: false,
    long_lived_websocket_provided: false,
    long_lived_sse_provided: false,
    pi_direct_write_allowed: false,
    direct_trusted_state_mutation: false,
    ga_release_signoff_ready: false,
    proof_authority: "none",
    can_promote_claim: false,
    can_certify_ga: false
  } satisfies Omit<Goal3DurableTransportReleaseSignoffVerification, "durable_transport_signoff_verification_artifact">;

  const verificationText = `${JSON.stringify(body, null, 2)}\n`;
  mkdirSync(dirname(absoluteOutputPath), { recursive: true });
  writeFileSync(absoluteOutputPath, verificationText, "utf8");
  const result: Goal3DurableTransportReleaseSignoffVerification = {
    ...body,
    durable_transport_signoff_verification_artifact: {
      kind: "goal3_durable_transport_release_signoff_verification",
      path: outputPath,
      sha256: sha256Text(verificationText),
      size_bytes: Buffer.byteLength(verificationText, "utf8")
    }
  };

  appendAuditEvent(projectRoot, {
    project_id: projectId,
    event_type: "release.goal3_durable_transport_release_signoff_verification_recorded",
    actor,
    target_id: projectId,
    payload: {
      durable_transport_signoff_verification_id: verificationId,
      durable_transport_signoff_verification_status: result.durable_transport_signoff_verification_status,
      durable_transport_signoff_verification_path: outputPath,
      durable_transport_signoff_verification_artifact_sha256:
        result.durable_transport_signoff_verification_artifact.sha256,
      durable_transport_signoff_prerequisite_id: prerequisiteId,
      durable_transport_signoff_prerequisite_artifact_sha256: prerequisite.artifact.sha256,
      durable_transport_signoff_prerequisite_current: true,
      operational_readiness_review_artifact_sha256: currentChain.operational.sha256,
      transport_closure_review_artifact_sha256: currentChain.closure.sha256,
      terminal_completion_certificate_artifact_sha256: currentChain.terminalCertificate.sha256,
      durable_transport_contract_artifact_sha256: currentChain.durableContract.sha256,
      transport_continuity_artifact_sha256: currentChain.continuity.sha256,
      transport_contract_artifact_sha256: currentChain.contract.sha256,
      external_durable_transport_evidence_bound: verified,
      ...(externalEvidence !== null
        ? {
            external_durable_transport_evidence_id: externalEvidence.evidenceId,
            external_durable_transport_evidence_artifact_sha256: externalEvidence.artifact.sha256,
            provider_id: externalEvidence.providerId,
            transport_primitive: externalEvidence.transportPrimitive,
            service_route: externalEvidence.serviceRoute
          }
        : {}),
      blocker_reasons: blockerReasons,
      durable_transport_provided: verified,
      live_transport_open: verified,
      co_math_transport_stack_built: false,
      proof_authority: "none",
      can_promote_claim: false,
      can_certify_ga: false
    }
  });
  return result;
}
