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

type OperationalReadinessReviewBody = {
  schema_version?: unknown;
  operational_readiness_review_id?: unknown;
  project_id?: unknown;
  ok?: unknown;
  operational_readiness_status?: unknown;
  operational_readiness_review_path?: unknown;
  operational_readiness_review_artifact?: unknown;
  requested_review_mode?: unknown;
  transport_closure_review_id?: unknown;
  transport_closure_review_path?: unknown;
  transport_closure_review_artifact?: unknown;
  transport_closure_review_current?: unknown;
  terminal_unattended_completion_certified?: unknown;
  completion_certificate_available?: unknown;
  unattended_real_host_execution_completed?: unknown;
  maintained_transport_primitive_bound?: unknown;
  service_transport_primitive?: unknown;
  client_transport_primitive?: unknown;
  durable_transport_provided?: unknown;
  live_transport_open?: unknown;
  adapter_os_isolation_review_current?: unknown;
  adapter_os_enforced?: unknown;
  adapter_os_isolation_required_for_ga?: unknown;
  adapter_production_helper_source_bound?: unknown;
  adapter_helper_profile_source?: unknown;
  adapter_production_helper_configured?: unknown;
  adapter_bundled_protocol_asset?: unknown;
  proof_authority?: unknown;
  can_promote_claim?: unknown;
  can_certify_ga?: unknown;
  ga_certification_gate_separate?: unknown;
};

type TransportClosureReviewBody = {
  schema_version?: unknown;
  transport_closure_review_id?: unknown;
  project_id?: unknown;
  transport_closure_review_status?: unknown;
  durable_transport_closure_status?: unknown;
  transport_closure_review_path?: unknown;
  transport_closure_review_artifact?: unknown;
  requested_transport_closure_mode?: unknown;
  terminal_completion_certificate_artifact?: unknown;
  terminal_completion_certificate_current?: unknown;
  durable_transport_contract_artifact?: unknown;
  durable_transport_contract_current?: unknown;
  transport_continuity_artifact?: unknown;
  transport_continuity_current?: unknown;
  transport_contract_artifact?: unknown;
  transport_contract_current?: unknown;
  maintained_transport_primitive_bound?: unknown;
  completion_certificate_available?: unknown;
  terminal_unattended_completion_certified?: unknown;
  unattended_real_host_execution_completed?: unknown;
  service_transport_primitive?: unknown;
  client_transport_primitive?: unknown;
  service_route?: unknown;
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

type NestedTransportBody = Record<string, unknown>;

export type Goal3DurableTransportReleaseSignoffPrerequisiteInput = {
  project_id: string;
  durable_transport_signoff_prerequisite_id?: string;
  actor?: string;
  operational_readiness_review_id: string;
  operational_readiness_review_path: string;
  operational_readiness_review_sha256: string;
  requested_review_mode?: "open_formal_workbench_durable_transport_release_signoff_prerequisite";
};

export type Goal3DurableTransportReleaseSignoffPrerequisite = {
  schema_version: "comath.goal3_durable_transport_release_signoff_prerequisite.v1";
  durable_transport_signoff_prerequisite_id: string;
  project_id: string;
  actor: string;
  created_at: string;
  ok: false;
  durable_transport_signoff_status: "blocked_durable_long_lived_transport_not_provided";
  blocker_reasons: ["durable_long_lived_transport_not_provided"];
  durable_transport_signoff_prerequisite_path: string;
  requested_review_mode: "open_formal_workbench_durable_transport_release_signoff_prerequisite";
  operational_readiness_review_id: string;
  operational_readiness_review_path: string;
  operational_readiness_review_artifact: ArtifactReference;
  operational_readiness_review_current: true;
  transport_closure_review_id: string;
  transport_closure_review_path: string;
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
  terminal_unattended_completion_certified: true;
  completion_certificate_available: true;
  unattended_real_host_execution_completed: true;
  maintained_transport_primitive_bound: true;
  service_route_bound: true;
  client_fetch_contract_bound: true;
  service_transport_primitive: "node_http_agent_run_log_session_route";
  client_transport_primitive: "pi_fetch_get_text";
  durable_transport_provided: false;
  live_transport_open: false;
  indefinite_stream_open: false;
  long_lived_websocket_provided: false;
  long_lived_sse_provided: false;
  pi_direct_write_allowed: false;
  direct_trusted_state_mutation: false;
  proof_authority: "none";
  can_promote_claim: false;
  can_certify_ga: false;
  ga_certification_gate_separate: true;
  durable_transport_signoff_prerequisite_artifact: ArtifactReference;
};

function normalizeRelativePath(path: string): string {
  return path.replace(/\\/g, "/").replace(/^\.\/+/u, "");
}

function durableTransportSignoffPrerequisitePath(reviewId: string): string {
  return normalizeRelativePath(
    join(".comath", "release", "goal3-durable-transport-release-signoff-prerequisite", reviewId, "prerequisite.json")
  );
}

function operationalReadinessReviewPath(reviewId: string): string {
  return normalizeRelativePath(join(".comath", "release", "goal3-ga-operational-readiness", reviewId, "review.json"));
}

function sha256Bytes(bytes: Buffer): string {
  return createHash("sha256").update(bytes).digest("hex");
}

function sha256Text(text: string): string {
  return createHash("sha256").update(text).digest("hex");
}

const invalidCode = "GOAL3_DURABLE_TRANSPORT_RELEASE_SIGNOFF_PREREQUISITE_INVALID";
const staleCode = "GOAL3_DURABLE_TRANSPORT_RELEASE_SIGNOFF_PREREQUISITE_STALE";

function assertSafeId(value: string | undefined, label: string): string {
  const id = typeof value === "string" ? value.trim() : "";
  if (!/^[A-Za-z0-9][A-Za-z0-9._-]{2,140}$/u.test(id)) {
    throw new ComathError(`${label} is invalid`, {
      statusCode: 400,
      code: "GOAL3_DURABLE_TRANSPORT_RELEASE_SIGNOFF_PREREQUISITE_INVALID_ID"
    });
  }
  return id;
}

function assertSha256(value: string | undefined): string {
  const sha256 = typeof value === "string" ? value.trim().toLowerCase() : "";
  if (!/^[a-f0-9]{64}$/u.test(sha256)) {
    throw new ComathError("Goal 3 durable transport release-signoff prerequisite artifact hash is stale", {
      statusCode: 400,
      code: staleCode
    });
  }
  return sha256;
}

function sanitizeActor(value: string | undefined): string {
  return (value ?? "goal3-ga-transport-chain-freshness-review")
    .replace(/(?:[A-Za-z]:[\\/][^\s"']+|\\\\[^\s"']+)/gu, "[redacted-path]")
    .replace(/(?:Authorization:\s*Bearer\s+\S+|api_key=\S+|token=\S+|sk-[A-Za-z0-9_-]+)/giu, "[redacted-secret]")
    .replace(
      /\b(?:clean_replay_passed|completed_formal_proof|formally_checked|formal_proof_verified|formal_replay_passed|lean_kernel_clean_replay|kernel_checked|proof_success|GA certified|can_certify_ga\s*[:=]\s*(?:true|1)|can_promote_claim\s*[:=]\s*(?:true|1))\b/giu,
      "[redacted-authority-claim]"
    )
    .replace(
      /\b(?:long[- ]lived\s+(?:websocket|sse)|indefinite\s+sse|terminal transport recovered live|durable transport provided|live transport open)\b/giu,
      "[redacted-transport-claim]"
    )
    .slice(0, 400);
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
    throw new ComathError(`Goal 3 durable transport release-signoff prerequisite ${label} reference is invalid`, {
      statusCode: 400,
      code: invalidCode
    });
  }
  return {
    kind: record.kind,
    path,
    sha256: record.sha256,
    size_bytes: sizeBytes
  };
}

function referencesEqual(left: ArtifactReference, right: ArtifactReference): boolean {
  return (
    left.kind === right.kind &&
    normalizeRelativePath(left.path) === normalizeRelativePath(right.path) &&
    left.sha256 === right.sha256 &&
    left.size_bytes === right.size_bytes
  );
}

function readJsonArtifact<T>(
  projectRoot: string,
  reference: ArtifactReference,
  staleFailureCode = staleCode
): { body: T; artifact: ArtifactReference } {
  const absolutePath = assertPathAllowed(projectRoot, reference.path, { purpose: "read", resolveRealpath: true });
  if (!existsSync(absolutePath) || !statSync(absolutePath).isFile()) {
    throw new ComathError("Goal 3 durable transport release-signoff prerequisite referenced artifact is stale", {
      statusCode: 400,
      code: staleFailureCode
    });
  }
  const content = readFileSync(absolutePath);
  const actualSha256 = sha256Bytes(content);
  if (actualSha256 !== assertSha256(reference.sha256) || content.byteLength !== reference.size_bytes) {
    throw new ComathError("Goal 3 durable transport release-signoff prerequisite referenced artifact hash is stale", {
      statusCode: 400,
      code: staleFailureCode
    });
  }
  try {
    return {
      body: JSON.parse(content.toString("utf8")) as T,
      artifact: {
        ...reference,
        path: normalizeRelativePath(reference.path)
      }
    };
  } catch {
    throw new ComathError("Goal 3 durable transport release-signoff prerequisite referenced JSON is invalid", {
      statusCode: 400,
      code: invalidCode
    });
  }
}

function readOperationalReadinessReview(
  projectRoot: string,
  inputPath: string,
  reviewId: string,
  expectedSha256: string
): { body: OperationalReadinessReviewBody; artifact: ArtifactReference } {
  const canonicalPath = operationalReadinessReviewPath(reviewId);
  if (normalizeRelativePath(inputPath) !== canonicalPath) {
    throw new ComathError("Goal 3 durable transport release-signoff prerequisite operational readiness path is not canonical", {
      statusCode: 400,
      code: invalidCode
    });
  }
  const absolutePath = assertPathAllowed(projectRoot, canonicalPath, { purpose: "read", resolveRealpath: true });
  if (!existsSync(absolutePath) || !statSync(absolutePath).isFile()) {
    throw new ComathError("Goal 3 durable transport release-signoff prerequisite operational readiness is stale", {
      statusCode: 400,
      code: staleCode
    });
  }
  const content = readFileSync(absolutePath);
  const actualSha256 = sha256Bytes(content);
  if (actualSha256 !== assertSha256(expectedSha256)) {
    throw new ComathError("Goal 3 durable transport release-signoff prerequisite operational readiness hash is stale", {
      statusCode: 400,
      code: staleCode
    });
  }
  try {
    return {
      body: JSON.parse(content.toString("utf8")) as OperationalReadinessReviewBody,
      artifact: {
        kind: "goal3_ga_operational_readiness_review",
        path: canonicalPath,
        sha256: actualSha256,
        size_bytes: content.byteLength
      }
    };
  } catch {
    throw new ComathError("Goal 3 durable transport release-signoff prerequisite operational readiness JSON is invalid", {
      statusCode: 400,
      code: invalidCode
    });
  }
}

function assertOperationalReadiness(
  body: OperationalReadinessReviewBody,
  projectId: string,
  reviewId: string,
  canonicalPath: string
): ArtifactReference {
  if (
    body.schema_version !== "comath.goal3_ga_operational_readiness_review.v1" ||
    body.operational_readiness_review_id !== reviewId ||
    body.project_id !== projectId ||
    body.ok !== true ||
    body.operational_readiness_status !== "ready_for_ga_release_candidate_review" ||
    body.operational_readiness_review_path !== canonicalPath ||
    body.operational_readiness_review_artifact !== undefined ||
    body.requested_review_mode !== "open_formal_workbench_ga_operational_readiness" ||
    body.transport_closure_review_current !== true ||
    body.adapter_os_isolation_review_current !== true ||
    body.adapter_os_enforced !== true ||
    body.adapter_os_isolation_required_for_ga !== true ||
    body.adapter_production_helper_source_bound !== true ||
    body.adapter_helper_profile_source !== "operator_configured_provider_helper" ||
    body.adapter_production_helper_configured !== true ||
    body.adapter_bundled_protocol_asset !== false ||
    body.terminal_unattended_completion_certified !== true ||
    body.completion_certificate_available !== true ||
    body.unattended_real_host_execution_completed !== true ||
    body.maintained_transport_primitive_bound !== true ||
    body.service_transport_primitive !== "node_http_agent_run_log_session_route" ||
    body.client_transport_primitive !== "pi_fetch_get_text" ||
    body.durable_transport_provided !== false ||
    body.live_transport_open !== false ||
    body.proof_authority !== "none" ||
    body.can_promote_claim !== false ||
    body.can_certify_ga !== false ||
    body.ga_certification_gate_separate !== true ||
    typeof body.transport_closure_review_id !== "string" ||
    typeof body.transport_closure_review_path !== "string"
  ) {
    throw new ComathError("Goal 3 durable transport release-signoff prerequisite operational readiness violates boundaries", {
      statusCode: 400,
      code: invalidCode
    });
  }
  return artifactReference(
    body.transport_closure_review_artifact,
    "transport-closure",
    "operator_service_transport_closure_review",
    body.transport_closure_review_path
  );
}

function assertNoAuthorityBoundary(body: NestedTransportBody, label: string): void {
  const bad =
    body.proof_authority !== "none" ||
    body.can_promote_claim !== false ||
    body.can_certify_ga !== false ||
    body.durable_transport_provided !== false ||
    body.live_transport_open !== false ||
    (body.indefinite_stream_open !== undefined && body.indefinite_stream_open !== false) ||
    (body.long_lived_websocket_provided !== undefined && body.long_lived_websocket_provided !== false) ||
    (body.long_lived_sse_provided !== undefined && body.long_lived_sse_provided !== false) ||
    (body.pi_direct_write_allowed !== undefined && body.pi_direct_write_allowed !== false) ||
    (body.direct_trusted_state_mutation !== undefined && body.direct_trusted_state_mutation !== false);
  if (bad) {
    throw new ComathError(`Goal 3 durable transport release-signoff prerequisite ${label} violates authority boundaries`, {
      statusCode: 400,
      code: invalidCode
    });
  }
}

function assertTransportClosureReview(
  body: TransportClosureReviewBody,
  projectId: string,
  reference: ArtifactReference
): {
  terminalCertificate: ArtifactReference;
  durableContract: ArtifactReference;
  continuity: ArtifactReference;
  contract: ArtifactReference;
} {
  if (
    body.schema_version !== "comath.pi_codex_operator_service_transport_closure_review.v1" ||
    typeof body.transport_closure_review_id !== "string" ||
    body.project_id !== projectId ||
    body.transport_closure_review_path !== reference.path ||
    body.transport_closure_review_artifact !== undefined ||
    body.transport_closure_review_status !== "maintained_operator_service_transport_closure_reviewed" ||
    body.durable_transport_closure_status !== "maintained_operator_service_transport_closure_reviewed" ||
    body.requested_transport_closure_mode !== "maintained_operator_service_transport_closure_review" ||
    body.terminal_completion_certificate_current !== true ||
    body.durable_transport_contract_current !== true ||
    body.transport_continuity_current !== true ||
    body.transport_contract_current !== true ||
    body.maintained_transport_primitive_bound !== true ||
    body.completion_certificate_available !== true ||
    body.terminal_unattended_completion_certified !== true ||
    body.unattended_real_host_execution_completed !== true ||
    body.service_transport_primitive !== "node_http_agent_run_log_session_route" ||
    body.client_transport_primitive !== "pi_fetch_get_text" ||
    typeof body.service_route !== "string" ||
    !/^\/agent\/run\/[A-Za-z0-9._-]+\/log-session$/u.test(body.service_route) ||
    body.durable_transport_provided !== false ||
    body.live_transport_open !== false ||
    body.indefinite_stream_open !== false ||
    body.long_lived_websocket_provided !== false ||
    body.long_lived_sse_provided !== false ||
    body.pi_direct_write_allowed !== false ||
    body.direct_trusted_state_mutation !== false ||
    body.proof_authority !== "none" ||
    body.can_promote_claim !== false ||
    body.can_certify_ga !== false ||
    body.ga_certification_gate_separate !== true
  ) {
    throw new ComathError("Goal 3 durable transport release-signoff prerequisite closure review violates boundaries", {
      statusCode: 400,
      code: invalidCode
    });
  }
  return {
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
    continuity: artifactReference(
      body.transport_continuity_artifact,
      "transport-continuity",
      "operator_service_transport_continuity"
    ),
    contract: artifactReference(body.transport_contract_artifact, "transport-contract", "operator_service_transport_contract")
  };
}

function assertNestedTransportChain(
  terminalCertificate: NestedTransportBody,
  durableContract: NestedTransportBody,
  continuity: NestedTransportBody,
  contract: NestedTransportBody,
  refs: {
    terminalCertificate: ArtifactReference;
    durableContract: ArtifactReference;
    continuity: ArtifactReference;
    contract: ArtifactReference;
  }
): void {
  assertNoAuthorityBoundary(terminalCertificate, "terminal completion certificate");
  assertNoAuthorityBoundary(durableContract, "durable transport contract");
  assertNoAuthorityBoundary(continuity, "transport continuity");
  assertNoAuthorityBoundary(contract, "transport contract");

  const terminalDurable = artifactReference(
    terminalCertificate.durable_transport_contract_artifact,
    "terminal durable-contract",
    refs.durableContract.kind,
    refs.durableContract.path
  );
  const durableContinuity = artifactReference(
    durableContract.transport_continuity_artifact,
    "durable continuity",
    refs.continuity.kind,
    refs.continuity.path
  );
  const durableContractRef = artifactReference(
    durableContract.transport_contract_artifact,
    "durable transport-contract",
    refs.contract.kind,
    refs.contract.path
  );
  const continuityContract = artifactReference(
    continuity.transport_contract_artifact,
    "continuity transport-contract",
    refs.contract.kind,
    refs.contract.path
  );

  if (
    !referencesEqual(terminalDurable, refs.durableContract) ||
    !referencesEqual(durableContinuity, refs.continuity) ||
    !referencesEqual(durableContractRef, refs.contract) ||
    !referencesEqual(continuityContract, refs.contract) ||
    terminalCertificate.terminal_unattended_completion_certified !== true ||
    terminalCertificate.completion_certificate_available !== true ||
    terminalCertificate.unattended_real_host_execution_completed !== true ||
    durableContract.durable_transport_contract_current !== true ||
    durableContract.service_owned_durable_transport_prerequisite_configured !== true ||
    durableContract.maintained_transport_primitive_bound !== true ||
    continuity.maintained_transport_primitive_bound !== true ||
    contract.maintained_transport_primitive_bound !== true ||
    durableContract.service_transport_primitive !== "node_http_agent_run_log_session_route" ||
    durableContract.client_transport_primitive !== "pi_fetch_get_text" ||
    continuity.service_transport_primitive !== "node_http_agent_run_log_session_route" ||
    continuity.client_transport_primitive !== "pi_fetch_get_text" ||
    contract.service_transport_primitive !== "node_http_agent_run_log_session_route" ||
    contract.client_transport_primitive !== "pi_fetch_get_text"
  ) {
    throw new ComathError("Goal 3 durable transport release-signoff prerequisite nested transport chain is invalid", {
      statusCode: 400,
      code: invalidCode
    });
  }
}

export function recordGoal3DurableTransportReleaseSignoffPrerequisite(
  projectRoot: string,
  input: Goal3DurableTransportReleaseSignoffPrerequisiteInput
): Goal3DurableTransportReleaseSignoffPrerequisite {
  const projectId = assertSafeId(input.project_id, "project_id");
  const reviewId = assertSafeId(
    input.durable_transport_signoff_prerequisite_id,
    "durable_transport_signoff_prerequisite_id"
  );
  const requestedMode =
    input.requested_review_mode ?? "open_formal_workbench_durable_transport_release_signoff_prerequisite";
  if (requestedMode !== "open_formal_workbench_durable_transport_release_signoff_prerequisite") {
    throw new ComathError("Goal 3 durable transport release-signoff prerequisite mode is invalid", {
      statusCode: 400,
      code: "GOAL3_DURABLE_TRANSPORT_RELEASE_SIGNOFF_PREREQUISITE_INVALID_MODE"
    });
  }

  const reviewPath = durableTransportSignoffPrerequisitePath(reviewId);
  const absoluteReviewPath = assertPathAllowed(projectRoot, reviewPath, { purpose: "runtime-write" });
  if (existsSync(absoluteReviewPath)) {
    throw new ComathError("Goal 3 durable transport release-signoff prerequisite already exists", {
      statusCode: 409,
      code: "GOAL3_DURABLE_TRANSPORT_RELEASE_SIGNOFF_PREREQUISITE_ALREADY_EXISTS"
    });
  }

  const readinessId = assertSafeId(input.operational_readiness_review_id, "operational_readiness_review_id");
  const operational = readOperationalReadinessReview(
    projectRoot,
    input.operational_readiness_review_path,
    readinessId,
    input.operational_readiness_review_sha256
  );
  const operationalCanonicalPath = operationalReadinessReviewPath(readinessId);
  const transportClosureReference = assertOperationalReadiness(
    operational.body,
    projectId,
    readinessId,
    operationalCanonicalPath
  );

  const closure = readJsonArtifact<TransportClosureReviewBody>(projectRoot, transportClosureReference);
  const refs = assertTransportClosureReview(closure.body, projectId, transportClosureReference);
  const terminalCertificate = readJsonArtifact<NestedTransportBody>(projectRoot, refs.terminalCertificate);
  const durableContract = readJsonArtifact<NestedTransportBody>(projectRoot, refs.durableContract);
  const continuity = readJsonArtifact<NestedTransportBody>(projectRoot, refs.continuity);
  const contract = readJsonArtifact<NestedTransportBody>(projectRoot, refs.contract);
  assertNestedTransportChain(
    terminalCertificate.body,
    durableContract.body,
    continuity.body,
    contract.body,
    refs
  );

  const blockerReasons: ["durable_long_lived_transport_not_provided"] = [
    "durable_long_lived_transport_not_provided"
  ];
  const body = {
    schema_version: "comath.goal3_durable_transport_release_signoff_prerequisite.v1",
    durable_transport_signoff_prerequisite_id: reviewId,
    project_id: projectId,
    actor: sanitizeActor(input.actor),
    created_at: new Date().toISOString(),
    ok: false,
    durable_transport_signoff_status: "blocked_durable_long_lived_transport_not_provided",
    blocker_reasons: blockerReasons,
    durable_transport_signoff_prerequisite_path: reviewPath,
    requested_review_mode: "open_formal_workbench_durable_transport_release_signoff_prerequisite",
    operational_readiness_review_id: readinessId,
    operational_readiness_review_path: operationalCanonicalPath,
    operational_readiness_review_artifact: operational.artifact,
    operational_readiness_review_current: true,
    transport_closure_review_id: String(closure.body.transport_closure_review_id),
    transport_closure_review_path: transportClosureReference.path,
    transport_closure_review_artifact: closure.artifact,
    transport_closure_review_current: true,
    terminal_completion_certificate_artifact: terminalCertificate.artifact,
    terminal_completion_certificate_current: true,
    durable_transport_contract_artifact: durableContract.artifact,
    durable_transport_contract_current: true,
    transport_continuity_artifact: continuity.artifact,
    transport_continuity_current: true,
    transport_contract_artifact: contract.artifact,
    transport_contract_current: true,
    terminal_unattended_completion_certified: true,
    completion_certificate_available: true,
    unattended_real_host_execution_completed: true,
    maintained_transport_primitive_bound: true,
    service_route_bound: true,
    client_fetch_contract_bound: true,
    service_transport_primitive: "node_http_agent_run_log_session_route",
    client_transport_primitive: "pi_fetch_get_text",
    durable_transport_provided: false,
    live_transport_open: false,
    indefinite_stream_open: false,
    long_lived_websocket_provided: false,
    long_lived_sse_provided: false,
    pi_direct_write_allowed: false,
    direct_trusted_state_mutation: false,
    proof_authority: "none",
    can_promote_claim: false,
    can_certify_ga: false,
    ga_certification_gate_separate: true
  } satisfies Omit<Goal3DurableTransportReleaseSignoffPrerequisite, "durable_transport_signoff_prerequisite_artifact">;

  const reviewText = `${JSON.stringify(body, null, 2)}\n`;
  mkdirSync(dirname(absoluteReviewPath), { recursive: true });
  writeFileSync(absoluteReviewPath, reviewText, "utf8");
  const result: Goal3DurableTransportReleaseSignoffPrerequisite = {
    ...body,
    durable_transport_signoff_prerequisite_artifact: {
      kind: "goal3_durable_transport_release_signoff_prerequisite",
      path: reviewPath,
      sha256: sha256Text(reviewText),
      size_bytes: Buffer.byteLength(reviewText, "utf8")
    }
  };

  appendAuditEvent(projectRoot, {
    project_id: projectId,
    event_type: "release.goal3_durable_transport_release_signoff_prerequisite_recorded",
    actor: result.actor,
    target_id: projectId,
    payload: {
      durable_transport_signoff_prerequisite_id: reviewId,
      durable_transport_signoff_status: result.durable_transport_signoff_status,
      blocker_reasons: blockerReasons,
      durable_transport_signoff_prerequisite_path: reviewPath,
      durable_transport_signoff_prerequisite_artifact_sha256:
        result.durable_transport_signoff_prerequisite_artifact.sha256,
      operational_readiness_review_id: readinessId,
      operational_readiness_review_artifact_sha256: operational.artifact.sha256,
      transport_closure_review_id: result.transport_closure_review_id,
      transport_closure_review_artifact_sha256: closure.artifact.sha256,
      terminal_completion_certificate_artifact_sha256: terminalCertificate.artifact.sha256,
      durable_transport_contract_artifact_sha256: durableContract.artifact.sha256,
      transport_continuity_artifact_sha256: continuity.artifact.sha256,
      transport_contract_artifact_sha256: contract.artifact.sha256,
      terminal_completion_certificate_current: true,
      durable_transport_contract_current: true,
      transport_continuity_current: true,
      transport_contract_current: true,
      maintained_transport_primitive_bound: true,
      service_route_bound: true,
      client_fetch_contract_bound: true,
      durable_transport_provided: false,
      live_transport_open: false,
      proof_authority: "none",
      can_promote_claim: false,
      can_certify_ga: false
    }
  });
  return result;
}
