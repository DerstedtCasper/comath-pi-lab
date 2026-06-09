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

type TransportClosureReviewBody = {
  schema_version?: unknown;
  transport_closure_review_id?: unknown;
  project_id?: unknown;
  transport_closure_review_status?: unknown;
  durable_transport_closure_status?: unknown;
  transport_closure_review_path?: unknown;
  requested_transport_closure_mode?: unknown;
  terminal_completion_certificate_current?: unknown;
  durable_transport_contract_current?: unknown;
  transport_continuity_current?: unknown;
  transport_contract_current?: unknown;
  maintained_transport_primitive_bound?: unknown;
  completion_certificate_available?: unknown;
  terminal_unattended_completion_certified?: unknown;
  unattended_real_host_execution_completed?: unknown;
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
  terminal_completion_certificate_artifact?: unknown;
  durable_transport_contract_artifact?: unknown;
  transport_continuity_artifact?: unknown;
  transport_contract_artifact?: unknown;
  transport_closure_review_artifact?: unknown;
};

type AdapterOsIsolationReviewBody = {
  schema_version?: unknown;
  review_id?: unknown;
  project_id?: unknown;
  adapter_id?: unknown;
  backend?: unknown;
  ok?: unknown;
  readiness_status?: unknown;
  review_path?: unknown;
  evidence_artifact?: unknown;
  adapter_execution_isolation?: {
    required_for_ga?: unknown;
    current_boundary?: unknown;
    os_enforced?: unknown;
    provider?: unknown;
    production_helper_configured?: unknown;
    helper_profile_source?: unknown;
    bundled_protocol_asset?: unknown;
    claims_runtime_enforcement?: unknown;
    proof_authority?: unknown;
  };
  checks?: {
    production_helper_source?: {
      ok?: unknown;
      observed?: unknown;
    };
  };
  vetoes?: unknown;
  proof_authority?: unknown;
  can_promote_claim?: unknown;
  can_certify_ga?: unknown;
};

export type Goal3GaOperationalReadinessReviewInput = {
  project_id: string;
  operational_readiness_review_id?: string;
  actor?: string;
  transport_closure_review_id: string;
  transport_closure_review_path: string;
  transport_closure_review_sha256: string;
  adapter_os_isolation_review_id: string;
  adapter_os_isolation_review_path: string;
  adapter_os_isolation_review_sha256: string;
  requested_review_mode?: "open_formal_workbench_ga_operational_readiness";
};

export type Goal3GaOperationalReadinessReview = {
  schema_version: "comath.goal3_ga_operational_readiness_review.v1";
  operational_readiness_review_id: string;
  project_id: string;
  actor: string;
  created_at: string;
  ok: boolean;
  operational_readiness_status:
    | "ready_for_ga_release_candidate_review"
    | "blocked_ga_operational_readiness_prerequisites";
  operational_readiness_review_path: string;
  requested_review_mode: "open_formal_workbench_ga_operational_readiness";
  blocker_reasons: string[];
  transport_closure_review_id: string;
  transport_closure_review_status: "maintained_operator_service_transport_closure_reviewed";
  transport_closure_review_path: string;
  transport_closure_review_artifact: ArtifactReference;
  transport_closure_review_current: true;
  terminal_unattended_completion_certified: true;
  completion_certificate_available: true;
  unattended_real_host_execution_completed: true;
  maintained_transport_primitive_bound: true;
  service_transport_primitive: "node_http_agent_run_log_session_route";
  client_transport_primitive: "pi_fetch_get_text";
  durable_transport_provided: false;
  live_transport_open: false;
  adapter_os_isolation_review_id: string;
  adapter_os_isolation_review_path: string;
  adapter_os_isolation_review_artifact: ArtifactReference;
  adapter_os_isolation_review_current: true;
  adapter_id: string;
  adapter_backend: string;
  adapter_os_isolation_status:
    | "ready_for_os_isolation_release_review"
    | "blocked_missing_os_enforced_adapter_isolation";
  adapter_os_enforced: boolean;
  adapter_os_isolation_required_for_ga: true;
  adapter_production_helper_source_bound: boolean;
  adapter_helper_profile_source: string | null;
  adapter_production_helper_configured: boolean;
  adapter_bundled_protocol_asset: boolean;
  proof_authority: "none";
  can_promote_claim: false;
  can_certify_ga: false;
  ga_certification_gate_separate: true;
  operational_readiness_review_artifact: ArtifactReference;
};

function normalizeRelativePath(path: string): string {
  return path.replace(/\\/g, "/").replace(/^\.\/+/u, "");
}

function operationalReadinessReviewPath(reviewId: string): string {
  return normalizeRelativePath(join(".comath", "release", "goal3-ga-operational-readiness", reviewId, "review.json"));
}

function transportClosureReviewPath(reviewId: string): string {
  return normalizeRelativePath(
    join(".comath", "release", "pi-codex-lifecycle", reviewId, "operator-service-transport-closure-review.json")
  );
}

function adapterOsIsolationReviewPath(reviewId: string): string {
  return normalizeRelativePath(join(".comath", "release", "agent-adapter-os-isolation", reviewId, "review.json"));
}

function sha256Bytes(bytes: Buffer): string {
  return createHash("sha256").update(bytes).digest("hex");
}

function sha256Text(text: string): string {
  return createHash("sha256").update(text).digest("hex");
}

function assertSafeId(value: string | undefined, label: string): string {
  const id = typeof value === "string" ? value.trim() : "";
  if (!/^[A-Za-z0-9][A-Za-z0-9._-]{2,120}$/u.test(id)) {
    throw new ComathError(`${label} is invalid`, {
      statusCode: 400,
      code: "GOAL3_GA_OPERATIONAL_READINESS_REVIEW_INVALID_ID"
    });
  }
  return id;
}

function assertSha256(value: string | undefined): string {
  const sha256 = typeof value === "string" ? value.trim().toLowerCase() : "";
  if (!/^[a-f0-9]{64}$/u.test(sha256)) {
    throw new ComathError("Goal 3 GA operational readiness artifact hash is stale", {
      statusCode: 400,
      code: "GOAL3_GA_OPERATIONAL_READINESS_REVIEW_STALE"
    });
  }
  return sha256;
}

function sanitizeActor(value: string | undefined): string {
  return (value ?? "goal3-ga-operational-readiness-review")
    .replace(/(?:[A-Za-z]:[\\/][^\s"']+|\\\\[^\s"']+)/gu, "[redacted-path]")
    .replace(/(?:Authorization:\s*Bearer\s+\S+|api_key=\S+|token=\S+|sk-[A-Za-z0-9_-]+)/giu, "[redacted-secret]")
    .replace(
      /\b(?:clean_replay_passed|completed_formal_proof|formally_checked|formal_proof_verified|formal_replay_passed|lean_kernel_clean_replay|kernel_checked|proof_success|GA certified|can_certify_ga\s*[:=]\s*(?:true|1)|can_promote_claim\s*[:=]\s*(?:true|1))\b/giu,
      "[redacted-authority-claim]"
    )
    .slice(0, 400);
}

function hasArtifactReference(value: unknown, kind: string): value is ArtifactReference {
  const candidate = value as ArtifactReference;
  return (
    typeof candidate?.kind === "string" &&
    candidate.kind === kind &&
    typeof candidate.path === "string" &&
    candidate.path.startsWith(".comath/") &&
    /^[a-f0-9]{64}$/u.test(candidate.sha256) &&
    Number.isSafeInteger(candidate.size_bytes) &&
    candidate.size_bytes > 0
  );
}

function readBoundArtifact<T>(
  projectRoot: string,
  inputPath: string,
  canonicalPath: string,
  expectedSha256: string,
  invalidMessage: string
): { body: T; artifact: ArtifactReference } {
  if (normalizeRelativePath(inputPath) !== canonicalPath) {
    throw new ComathError(invalidMessage, {
      statusCode: 400,
      code: "GOAL3_GA_OPERATIONAL_READINESS_REVIEW_INVALID"
    });
  }
  const absolutePath = assertPathAllowed(projectRoot, canonicalPath, { purpose: "read", resolveRealpath: true });
  if (!existsSync(absolutePath) || !statSync(absolutePath).isFile()) {
    throw new ComathError("Goal 3 GA operational readiness artifact is stale", {
      statusCode: 400,
      code: "GOAL3_GA_OPERATIONAL_READINESS_REVIEW_STALE"
    });
  }
  const content = readFileSync(absolutePath);
  const actualSha256 = sha256Bytes(content);
  if (actualSha256 !== assertSha256(expectedSha256)) {
    throw new ComathError("Goal 3 GA operational readiness artifact hash is stale", {
      statusCode: 400,
      code: "GOAL3_GA_OPERATIONAL_READINESS_REVIEW_STALE"
    });
  }
  try {
    return {
      body: JSON.parse(content.toString("utf8")) as T,
      artifact: {
        kind: "",
        path: canonicalPath,
        sha256: actualSha256,
        size_bytes: content.byteLength
      }
    };
  } catch {
    throw new ComathError(invalidMessage, {
      statusCode: 400,
      code: "GOAL3_GA_OPERATIONAL_READINESS_REVIEW_INVALID"
    });
  }
}

function assertTransportClosureReview(
  body: TransportClosureReviewBody,
  projectId: string,
  reviewId: string,
  canonicalPath: string
): void {
  if (
    body.schema_version !== "comath.pi_codex_operator_service_transport_closure_review.v1" ||
    body.transport_closure_review_id !== reviewId ||
    body.project_id !== projectId ||
    body.transport_closure_review_path !== canonicalPath ||
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
    body.ga_certification_gate_separate !== true ||
    !hasArtifactReference(
      body.terminal_completion_certificate_artifact,
      "unattended_real_host_terminal_completion_certificate"
    ) ||
    !hasArtifactReference(body.durable_transport_contract_artifact, "unattended_real_host_durable_transport_contract") ||
    !hasArtifactReference(body.transport_continuity_artifact, "operator_service_transport_continuity") ||
    !hasArtifactReference(body.transport_contract_artifact, "operator_service_transport_contract")
  ) {
    throw new ComathError("Goal 3 GA operational readiness transport closure violates boundaries", {
      statusCode: 400,
      code: "GOAL3_GA_OPERATIONAL_READINESS_REVIEW_INVALID"
    });
  }
}

function assertAdapterOsIsolationReview(
  body: AdapterOsIsolationReviewBody,
  projectId: string,
  reviewId: string,
  canonicalPath: string
): void {
  const ready = body.ok === true;
  const blocked = body.ok === false;
  const statusOk = ready
    ? body.readiness_status === "ready_for_os_isolation_release_review"
    : body.readiness_status === "blocked_missing_os_enforced_adapter_isolation";
  if (
    body.schema_version !== "comath.agent_adapter_os_isolation_readiness.v1" ||
    body.review_id !== reviewId ||
    body.project_id !== projectId ||
    body.review_path !== canonicalPath ||
    (!ready && !blocked) ||
    !statusOk ||
    body.adapter_execution_isolation?.required_for_ga !== true ||
    body.adapter_execution_isolation.claims_runtime_enforcement !== false ||
    body.adapter_execution_isolation.proof_authority !== "none" ||
    body.proof_authority !== "none" ||
    body.can_promote_claim !== false ||
    body.can_certify_ga !== false
  ) {
    throw new ComathError("Goal 3 GA operational readiness adapter OS-isolation review violates boundaries", {
      statusCode: 400,
      code: "GOAL3_GA_OPERATIONAL_READINESS_REVIEW_INVALID"
    });
  }
  if (
    ready &&
    (
      body.adapter_execution_isolation.os_enforced !== true ||
      body.adapter_execution_isolation.current_boundary !== "os_enforced" ||
      !hasArtifactReference(body.evidence_artifact, "agent_adapter_os_isolation_evidence") ||
      body.checks?.production_helper_source?.ok !== true ||
      body.checks.production_helper_source.observed !== "operator_configured_provider_helper" ||
      body.adapter_execution_isolation.production_helper_configured !== true ||
      body.adapter_execution_isolation.helper_profile_source !== "operator_configured_provider_helper" ||
      body.adapter_execution_isolation.bundled_protocol_asset !== false ||
      !Array.isArray(body.vetoes) ||
      body.vetoes.length !== 0
    )
  ) {
    throw new ComathError("Goal 3 GA operational readiness ready adapter OS-isolation review is incomplete", {
      statusCode: 400,
      code: "GOAL3_GA_OPERATIONAL_READINESS_REVIEW_INVALID"
    });
  }
}

export function recordGoal3GaOperationalReadinessReview(
  projectRoot: string,
  input: Goal3GaOperationalReadinessReviewInput
): Goal3GaOperationalReadinessReview {
  const projectId = assertSafeId(input.project_id, "project_id");
  const reviewId = assertSafeId(input.operational_readiness_review_id, "operational_readiness_review_id");
  const requestedMode = input.requested_review_mode ?? "open_formal_workbench_ga_operational_readiness";
  if (requestedMode !== "open_formal_workbench_ga_operational_readiness") {
    throw new ComathError("Goal 3 GA operational readiness review mode is invalid", {
      statusCode: 400,
      code: "GOAL3_GA_OPERATIONAL_READINESS_REVIEW_INVALID_MODE"
    });
  }
  const reviewPath = operationalReadinessReviewPath(reviewId);
  const absoluteReviewPath = assertPathAllowed(projectRoot, reviewPath, { purpose: "runtime-write" });
  if (existsSync(absoluteReviewPath)) {
    throw new ComathError("Goal 3 GA operational readiness review already exists", {
      statusCode: 409,
      code: "GOAL3_GA_OPERATIONAL_READINESS_REVIEW_ALREADY_EXISTS"
    });
  }

  const transportReviewId = assertSafeId(input.transport_closure_review_id, "transport_closure_review_id");
  const canonicalTransportPath = transportClosureReviewPath(transportReviewId);
  const transport = readBoundArtifact<TransportClosureReviewBody>(
    projectRoot,
    input.transport_closure_review_path,
    canonicalTransportPath,
    input.transport_closure_review_sha256,
    "Goal 3 GA operational readiness transport closure path is not canonical"
  );
  transport.artifact.kind = "operator_service_transport_closure_review";
  assertTransportClosureReview(transport.body, projectId, transportReviewId, canonicalTransportPath);

  const osReviewId = assertSafeId(input.adapter_os_isolation_review_id, "adapter_os_isolation_review_id");
  const canonicalOsReviewPath = adapterOsIsolationReviewPath(osReviewId);
  const osReview = readBoundArtifact<AdapterOsIsolationReviewBody>(
    projectRoot,
    input.adapter_os_isolation_review_path,
    canonicalOsReviewPath,
    input.adapter_os_isolation_review_sha256,
    "Goal 3 GA operational readiness adapter OS-isolation review path is not canonical"
  );
  osReview.artifact.kind = "agent_adapter_os_isolation_readiness";
  assertAdapterOsIsolationReview(osReview.body, projectId, osReviewId, canonicalOsReviewPath);

  const adapterReady = osReview.body.ok === true;
  const adapterProductionHelperSourceBound =
    adapterReady &&
    osReview.body.checks?.production_helper_source?.ok === true &&
    osReview.body.checks.production_helper_source.observed === "operator_configured_provider_helper" &&
    osReview.body.adapter_execution_isolation?.production_helper_configured === true &&
    osReview.body.adapter_execution_isolation.helper_profile_source === "operator_configured_provider_helper" &&
    osReview.body.adapter_execution_isolation.bundled_protocol_asset === false;
  const adapterStatus = adapterReady
    ? "ready_for_os_isolation_release_review"
    : "blocked_missing_os_enforced_adapter_isolation";
  const blockerReasons = adapterReady ? [] : ["adapter_os_isolation_release_review_not_ready"];
  const body = {
    schema_version: "comath.goal3_ga_operational_readiness_review.v1",
    operational_readiness_review_id: reviewId,
    project_id: projectId,
    actor: sanitizeActor(input.actor),
    created_at: new Date().toISOString(),
    ok: adapterReady,
    operational_readiness_status: adapterReady
      ? "ready_for_ga_release_candidate_review"
      : "blocked_ga_operational_readiness_prerequisites",
    operational_readiness_review_path: reviewPath,
    requested_review_mode: "open_formal_workbench_ga_operational_readiness",
    blocker_reasons: blockerReasons,
    transport_closure_review_id: transportReviewId,
    transport_closure_review_status: "maintained_operator_service_transport_closure_reviewed",
    transport_closure_review_path: canonicalTransportPath,
    transport_closure_review_artifact: transport.artifact,
    transport_closure_review_current: true,
    terminal_unattended_completion_certified: true,
    completion_certificate_available: true,
    unattended_real_host_execution_completed: true,
    maintained_transport_primitive_bound: true,
    service_transport_primitive: "node_http_agent_run_log_session_route",
    client_transport_primitive: "pi_fetch_get_text",
    durable_transport_provided: false,
    live_transport_open: false,
    adapter_os_isolation_review_id: osReviewId,
    adapter_os_isolation_review_path: canonicalOsReviewPath,
    adapter_os_isolation_review_artifact: osReview.artifact,
    adapter_os_isolation_review_current: true,
    adapter_id: String(osReview.body.adapter_id ?? "unknown"),
    adapter_backend: String(osReview.body.backend ?? "unknown"),
    adapter_os_isolation_status: adapterStatus,
    adapter_os_enforced: adapterReady,
    adapter_os_isolation_required_for_ga: true,
    adapter_production_helper_source_bound: adapterProductionHelperSourceBound,
    adapter_helper_profile_source:
      typeof osReview.body.adapter_execution_isolation?.helper_profile_source === "string"
        ? osReview.body.adapter_execution_isolation.helper_profile_source
        : null,
    adapter_production_helper_configured:
      osReview.body.adapter_execution_isolation?.production_helper_configured === true,
    adapter_bundled_protocol_asset: osReview.body.adapter_execution_isolation?.bundled_protocol_asset === true,
    proof_authority: "none",
    can_promote_claim: false,
    can_certify_ga: false,
    ga_certification_gate_separate: true
  } satisfies Omit<Goal3GaOperationalReadinessReview, "operational_readiness_review_artifact">;

  const artifactText = `${JSON.stringify(body, null, 2)}\n`;
  mkdirSync(dirname(absoluteReviewPath), { recursive: true });
  writeFileSync(absoluteReviewPath, artifactText, "utf8");
  const result: Goal3GaOperationalReadinessReview = {
    ...body,
    operational_readiness_review_artifact: {
      kind: "goal3_ga_operational_readiness_review",
      path: reviewPath,
      sha256: sha256Text(artifactText),
      size_bytes: Buffer.byteLength(artifactText, "utf8")
    }
  };

  appendAuditEvent(projectRoot, {
    project_id: projectId,
    event_type: "release.goal3_ga_operational_readiness_review_recorded",
    actor: result.actor,
    target_id: projectId,
    payload: {
      operational_readiness_review_id: reviewId,
      operational_readiness_status: result.operational_readiness_status,
      operational_readiness_review_path: reviewPath,
      operational_readiness_review_artifact_sha256: result.operational_readiness_review_artifact.sha256,
      transport_closure_review_id: transportReviewId,
      transport_closure_review_artifact_sha256: transport.artifact.sha256,
      adapter_os_isolation_review_id: osReviewId,
      adapter_os_isolation_review_artifact_sha256: osReview.artifact.sha256,
      adapter_os_enforced: adapterReady,
      adapter_production_helper_source_bound: adapterProductionHelperSourceBound,
      adapter_helper_profile_source:
        typeof osReview.body.adapter_execution_isolation?.helper_profile_source === "string"
          ? osReview.body.adapter_execution_isolation.helper_profile_source
          : null,
      adapter_production_helper_configured:
        osReview.body.adapter_execution_isolation?.production_helper_configured === true,
      adapter_bundled_protocol_asset: osReview.body.adapter_execution_isolation?.bundled_protocol_asset === true,
      blocker_reasons: blockerReasons,
      proof_authority: "none",
      can_promote_claim: false,
      can_certify_ga: false
    }
  });
  return result;
}
