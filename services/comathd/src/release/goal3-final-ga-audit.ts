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

type CertificationReviewBody = {
  schema_version?: unknown;
  ga_certification_review_id?: unknown;
  project_id?: unknown;
  ok?: unknown;
  ga_certification_status?: unknown;
  ga_certification_review_path?: unknown;
  ga_certification_review_artifact?: unknown;
  requested_review_mode?: unknown;
  blocker_reasons?: unknown;
  operational_readiness_review_id?: unknown;
  operational_readiness_review_path?: unknown;
  operational_readiness_review_artifact?: unknown;
  operational_readiness_review_current?: unknown;
  operational_readiness_status?: unknown;
  acceptance_report_path?: unknown;
  acceptance_report_artifact?: unknown;
  acceptance_report_current?: unknown;
  trust_core_negative_suite_fail_closed?: unknown;
  positive_workflow_representative_verified?: unknown;
  positive_matrix_total_required_tasks?: unknown;
  positive_matrix_remaining_blocker_status?: unknown;
  positive_matrix_remaining_blocker_code?: unknown;
  final_ga_audit_available?: unknown;
  proof_authority?: unknown;
  can_promote_claim?: unknown;
  can_certify_ga?: unknown;
  ga_certification_gate_separate?: unknown;
};

type AcceptanceReportBody = {
  schema_version?: unknown;
  proof_authority?: unknown;
  trust_core_negative_suite?: {
    all_required_cases_fail_closed?: unknown;
    missing_required_cases?: unknown;
  };
  positive_workflow?: {
    result?: unknown;
    can_promote_claim?: unknown;
    lean_run_verification?: { ok?: unknown };
    final_replay_verification?: { ok?: unknown };
  };
  positive_matrix?: {
    total_required_tasks?: unknown;
    remaining_matrix_blocker?: {
      status?: unknown;
      blocker_code?: unknown;
      can_promote_claim?: unknown;
    };
  };
};

type OperationalReadinessReviewBody = {
  schema_version?: unknown;
  operational_readiness_review_id?: unknown;
  project_id?: unknown;
  ok?: unknown;
  operational_readiness_status?: unknown;
  operational_readiness_review_path?: unknown;
  operational_readiness_review_artifact?: unknown;
  proof_authority?: unknown;
  can_promote_claim?: unknown;
  can_certify_ga?: unknown;
  ga_certification_gate_separate?: unknown;
};

type ProofBreadthClosureBody = {
  schema_version?: unknown;
  proof_breadth_closure_id?: unknown;
  project_id?: unknown;
  ok?: unknown;
  proof_breadth_status?: unknown;
  proof_breadth_closure_path?: unknown;
  proof_breadth_closure_artifact?: unknown;
  requested_closure_mode?: unknown;
  blocker_reasons?: unknown;
  total_required_tasks?: unknown;
  task_manifest_count?: unknown;
  verified_task_count?: unknown;
  missing_task_count?: unknown;
  blocked_task_count?: unknown;
  missing_task_ids?: unknown;
  blocked_task_ids?: unknown;
  packaging_report_artifacts?: unknown;
  proof_breadth_complete?: unknown;
  final_ga_audit_unblocked?: unknown;
  proof_authority?: unknown;
  can_promote_claim?: unknown;
  can_certify_ga?: unknown;
  ga_certification_gate_separate?: unknown;
};

export type Goal3FinalGaAuditInput = {
  project_id: string;
  final_ga_audit_id?: string;
  actor?: string;
  ga_certification_review_id: string;
  ga_certification_review_path: string;
  ga_certification_review_sha256: string;
  proof_breadth_closure_id?: string;
  proof_breadth_closure_path?: string;
  proof_breadth_closure_sha256?: string;
  requested_audit_mode?: "open_formal_workbench_final_ga_audit";
};

export type Goal3FinalGaAudit = {
  schema_version: "comath.goal3_final_ga_audit.v1";
  final_ga_audit_id: string;
  project_id: string;
  actor: string;
  created_at: string;
  ok: boolean;
  final_ga_audit_status:
    | "blocked_release_candidate_proof_breadth_incomplete"
    | "passed_release_candidate_final_ga_audit";
  final_ga_audit_path: string;
  requested_audit_mode: "open_formal_workbench_final_ga_audit";
  blocker_reasons: string[];
  ga_certification_review_id: string;
  ga_certification_review_path: string;
  ga_certification_review_artifact: ArtifactReference;
  ga_certification_review_current: true;
  ga_certification_status: "blocked_release_candidate_ga_certification_prerequisites";
  operational_readiness_review_id: string;
  operational_readiness_review_path: string;
  operational_readiness_review_artifact: ArtifactReference;
  operational_readiness_review_current: true;
  acceptance_report_path: string;
  acceptance_report_artifact: ArtifactReference;
  acceptance_report_current: true;
  trust_core_negative_suite_fail_closed: true;
  positive_workflow_representative_verified: true;
  positive_matrix_total_required_tasks: 100;
  proof_breadth_status:
    | "blocked_positive_matrix_release_candidate_proof_breadth_incomplete"
    | "complete_release_candidate_proof_breadth";
  proof_breadth_blocker_code: "ga_positive_100_task_matrix_not_fully_executed" | "";
  proof_breadth_closure_id?: string;
  proof_breadth_closure_path?: string;
  proof_breadth_closure_artifact?: ArtifactReference;
  proof_breadth_closure_current?: true;
  final_ga_audit_available: true;
  final_ga_audit_passed: boolean;
  ga_certificate_available: false;
  proof_authority: "none" | "lean_kernel_clean_replay";
  can_promote_claim: false;
  can_certify_ga: false;
  ga_certification_gate_separate: true;
  final_ga_audit_artifact: ArtifactReference;
};

function normalizeRelativePath(path: string): string {
  return path.replace(/\\/g, "/").replace(/^\.\/+/u, "");
}

function finalGaAuditPath(auditId: string): string {
  return normalizeRelativePath(join(".comath", "release", "goal3-final-ga-audit", auditId, "audit.json"));
}

function gaCertificationReviewPath(reviewId: string): string {
  return normalizeRelativePath(join(".comath", "release", "goal3-ga-certification", reviewId, "review.json"));
}

function proofBreadthClosurePath(closureId: string): string {
  return normalizeRelativePath(join(".comath", "release", "goal3-proof-breadth-closure", closureId, "closure.json"));
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
      code: "GOAL3_FINAL_GA_AUDIT_INVALID_ID"
    });
  }
  return id;
}

function assertSha256(value: string | undefined): string {
  const sha256 = typeof value === "string" ? value.trim().toLowerCase() : "";
  if (!/^[a-f0-9]{64}$/u.test(sha256)) {
    throw new ComathError("Goal 3 final GA audit artifact hash is stale", {
      statusCode: 400,
      code: "GOAL3_FINAL_GA_AUDIT_STALE"
    });
  }
  return sha256;
}

function sanitizeActor(value: string | undefined): string {
  return (value ?? "goal3-final-ga-audit")
    .replace(/(?:[A-Za-z]:[\\/][^\s"']+|\\\\[^\s"']+)/gu, "[redacted-path]")
    .replace(/(?:Authorization:\s*Bearer\s+\S+|api_key=\S+|token=\S+|sk-[A-Za-z0-9_-]+)/giu, "[redacted-secret]")
    .replace(
      /\b(?:clean_replay_passed|completed_formal_proof|formally_checked|formal_proof_verified|formal_replay_passed|lean_kernel_clean_replay|kernel_checked|proof_success|GA certified|can_certify_ga\s*[:=]\s*(?:true|1)|can_promote_claim\s*[:=]\s*(?:true|1))\b/giu,
      "[redacted-authority-claim]"
    )
    .slice(0, 400);
}

function readJsonArtifact<T>(
  projectRoot: string,
  canonicalPath: string,
  expectedSha256: string,
  kind: string,
  expectedSizeBytes?: number
): { body: T; artifact: ArtifactReference } {
  const absolutePath = assertPathAllowed(projectRoot, canonicalPath, { purpose: "read", resolveRealpath: true });
  if (!existsSync(absolutePath) || !statSync(absolutePath).isFile()) {
    throw new ComathError("Goal 3 final GA audit referenced artifact is stale", {
      statusCode: 400,
      code: "GOAL3_FINAL_GA_AUDIT_STALE"
    });
  }
  const content = readFileSync(absolutePath);
  const actualSha256 = sha256Bytes(content);
  if (actualSha256 !== assertSha256(expectedSha256)) {
    throw new ComathError("Goal 3 final GA audit referenced artifact hash is stale", {
      statusCode: 400,
      code: "GOAL3_FINAL_GA_AUDIT_STALE"
    });
  }
  if (expectedSizeBytes !== undefined && content.byteLength !== expectedSizeBytes) {
    throw new ComathError("Goal 3 final GA audit referenced artifact size is stale", {
      statusCode: 400,
      code: "GOAL3_FINAL_GA_AUDIT_STALE"
    });
  }
  try {
    return {
      body: JSON.parse(content.toString("utf8")) as T,
      artifact: {
        kind,
        path: canonicalPath,
        sha256: actualSha256,
        size_bytes: content.byteLength
      }
    };
  } catch {
    throw new ComathError("Goal 3 final GA audit referenced JSON is invalid", {
      statusCode: 400,
      code: "GOAL3_FINAL_GA_AUDIT_INVALID"
    });
  }
}

function artifactReference(
  value: unknown,
  label: string,
  expectedKind: string,
  expectedPath: unknown
): ArtifactReference {
  const record = value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
  const path = typeof record.path === "string" ? normalizeRelativePath(record.path) : "";
  const sizeBytes = record.size_bytes;
  if (
    record.kind !== expectedKind ||
    path !== (typeof expectedPath === "string" ? normalizeRelativePath(expectedPath) : "") ||
    !path.startsWith(".comath/") ||
    typeof record.sha256 !== "string" ||
    !/^[a-f0-9]{64}$/u.test(record.sha256) ||
    typeof sizeBytes !== "number" ||
    !Number.isSafeInteger(sizeBytes) ||
    sizeBytes <= 0
  ) {
    throw new ComathError(`Goal 3 final GA audit ${label} reference is invalid`, {
      statusCode: 400,
      code: "GOAL3_FINAL_GA_AUDIT_INVALID"
    });
  }
  return {
    kind: record.kind,
    path,
    sha256: record.sha256,
    size_bytes: sizeBytes
  };
}

function assertOperationalReadinessSupport(
  body: OperationalReadinessReviewBody,
  projectId: string,
  reference: ArtifactReference
): void {
  if (
    body.schema_version !== "comath.goal3_ga_operational_readiness_review.v1" ||
    body.project_id !== projectId ||
    body.operational_readiness_review_path !== reference.path ||
    body.operational_readiness_review_artifact !== undefined ||
    body.ok !== true ||
    body.operational_readiness_status !== "ready_for_ga_release_candidate_review" ||
    body.proof_authority !== "none" ||
    body.can_promote_claim !== false ||
    body.can_certify_ga !== false ||
    body.ga_certification_gate_separate !== true
  ) {
    throw new ComathError("Goal 3 final GA audit operational-readiness support violates boundaries", {
      statusCode: 400,
      code: "GOAL3_FINAL_GA_AUDIT_INVALID"
    });
  }
}

function assertAcceptanceSupport(body: AcceptanceReportBody): void {
  if (
    body.schema_version !== "comath.goal3_ga_acceptance.v1" ||
    body.proof_authority !== "none" ||
    body.trust_core_negative_suite?.all_required_cases_fail_closed !== true ||
    !Array.isArray(body.trust_core_negative_suite.missing_required_cases) ||
    body.trust_core_negative_suite.missing_required_cases.length !== 0 ||
    body.positive_workflow?.result !== "representative_verified_fixture" ||
    body.positive_workflow.can_promote_claim !== false ||
    body.positive_workflow.lean_run_verification?.ok !== true ||
    body.positive_workflow.final_replay_verification?.ok !== true ||
    body.positive_matrix?.total_required_tasks !== 100 ||
    body.positive_matrix.remaining_matrix_blocker?.status !== "replayable_blocker" ||
    body.positive_matrix.remaining_matrix_blocker.blocker_code !== "ga_positive_100_task_matrix_not_fully_executed" ||
    body.positive_matrix.remaining_matrix_blocker.can_promote_claim !== false
  ) {
    throw new ComathError("Goal 3 final GA audit acceptance support violates boundaries", {
      statusCode: 400,
      code: "GOAL3_FINAL_GA_AUDIT_INVALID"
    });
  }
}

function optionalProofBreadthClosure(
  projectRoot: string,
  input: Goal3FinalGaAuditInput
): { body: ProofBreadthClosureBody; artifact: ArtifactReference; closureId: string } | null {
  const hasAnyClosureInput =
    input.proof_breadth_closure_id !== undefined ||
    input.proof_breadth_closure_path !== undefined ||
    input.proof_breadth_closure_sha256 !== undefined;
  if (!hasAnyClosureInput) {
    return null;
  }
  const closureId = assertSafeId(input.proof_breadth_closure_id, "proof_breadth_closure_id");
  const canonicalPath = proofBreadthClosurePath(closureId);
  if (normalizeRelativePath(input.proof_breadth_closure_path ?? "") !== canonicalPath) {
    throw new ComathError("Goal 3 final GA audit proof-breadth closure path is not canonical", {
      statusCode: 400,
      code: "GOAL3_FINAL_GA_AUDIT_INVALID"
    });
  }
  const closure = readJsonArtifact<ProofBreadthClosureBody>(
    projectRoot,
    canonicalPath,
    input.proof_breadth_closure_sha256 ?? "",
    "goal3_release_candidate_proof_breadth_closure"
  );
  return {
    ...closure,
    closureId
  };
}

function assertProofBreadthClosure(
  body: ProofBreadthClosureBody,
  projectId: string,
  closureId: string,
  canonicalPath: string
): boolean {
  const missingTaskIds = Array.isArray(body.missing_task_ids) ? body.missing_task_ids : [];
  const blockedTaskIds = Array.isArray(body.blocked_task_ids) ? body.blocked_task_ids : [];
  const blockers = Array.isArray(body.blocker_reasons) ? body.blocker_reasons : [];
  const packagingReports = Array.isArray(body.packaging_report_artifacts) ? body.packaging_report_artifacts : [];
  const countSum =
    (typeof body.verified_task_count === "number" ? body.verified_task_count : Number.NaN) +
    (typeof body.missing_task_count === "number" ? body.missing_task_count : Number.NaN) +
    (typeof body.blocked_task_count === "number" ? body.blocked_task_count : Number.NaN);

  const commonValid =
    body.schema_version === "comath.goal3_release_candidate_proof_breadth_closure.v1" &&
    body.proof_breadth_closure_id === closureId &&
    body.project_id === projectId &&
    body.proof_breadth_closure_path === canonicalPath &&
    body.proof_breadth_closure_artifact === undefined &&
    body.requested_closure_mode === "open_formal_workbench_release_candidate_proof_breadth_closure" &&
    body.total_required_tasks === 100 &&
    body.task_manifest_count === 100 &&
    countSum === 100 &&
    missingTaskIds.length === body.missing_task_count &&
    blockedTaskIds.length === body.blocked_task_count &&
    body.can_promote_claim === false &&
    body.can_certify_ga === false &&
    body.ga_certification_gate_separate === true;
  if (!commonValid) {
    throw new ComathError("Goal 3 final GA audit proof-breadth closure violates boundaries", {
      statusCode: 400,
      code: "GOAL3_FINAL_GA_AUDIT_INVALID"
    });
  }

  const complete =
    body.ok === true &&
    body.proof_breadth_status === "complete_release_candidate_proof_breadth" &&
    blockers.length === 0 &&
    body.verified_task_count === 100 &&
    body.missing_task_count === 0 &&
    body.blocked_task_count === 0 &&
    packagingReports.length === 100 &&
    body.proof_breadth_complete === true &&
    body.final_ga_audit_unblocked === true &&
    body.proof_authority === "lean_kernel_clean_replay";
  if (complete) {
    return true;
  }

  const blocked =
    body.ok === false &&
    body.proof_breadth_status === "blocked_positive_matrix_release_candidate_proof_breadth_incomplete" &&
    blockers.includes("positive_matrix_release_candidate_proof_breadth_incomplete") &&
    body.proof_breadth_complete === false &&
    body.final_ga_audit_unblocked === false &&
    body.proof_authority === "none";
  if (blocked) {
    return false;
  }

  throw new ComathError("Goal 3 final GA audit proof-breadth closure violates boundaries", {
    statusCode: 400,
    code: "GOAL3_FINAL_GA_AUDIT_INVALID"
  });
}

function assertCertificationReview(
  body: CertificationReviewBody,
  projectId: string,
  reviewId: string,
  canonicalPath: string
): void {
  const blockers = Array.isArray(body.blocker_reasons) ? body.blocker_reasons : [];
  if (
    body.schema_version !== "comath.goal3_ga_certification_review.v1" ||
    body.ga_certification_review_id !== reviewId ||
    body.project_id !== projectId ||
    body.ok !== false ||
    body.ga_certification_status !== "blocked_release_candidate_ga_certification_prerequisites" ||
    body.ga_certification_review_path !== canonicalPath ||
    body.ga_certification_review_artifact !== undefined ||
    body.requested_review_mode !== "open_formal_workbench_ga_certification" ||
    !blockers.includes("positive_matrix_release_candidate_proof_breadth_incomplete") ||
    !blockers.includes("final_ga_certification_audit_not_available") ||
    body.operational_readiness_review_current !== true ||
    typeof body.operational_readiness_review_id !== "string" ||
    typeof body.operational_readiness_review_path !== "string" ||
    body.operational_readiness_status !== "ready_for_ga_release_candidate_review" ||
    typeof body.acceptance_report_path !== "string" ||
    body.acceptance_report_current !== true ||
    body.trust_core_negative_suite_fail_closed !== true ||
    body.positive_workflow_representative_verified !== true ||
    body.positive_matrix_total_required_tasks !== 100 ||
    body.positive_matrix_remaining_blocker_status !== "replayable_blocker" ||
    body.positive_matrix_remaining_blocker_code !== "ga_positive_100_task_matrix_not_fully_executed" ||
    body.final_ga_audit_available !== false ||
    body.proof_authority !== "none" ||
    body.can_promote_claim !== false ||
    body.can_certify_ga !== false ||
    body.ga_certification_gate_separate !== true
  ) {
    throw new ComathError("Goal 3 final GA audit certification review violates boundaries", {
      statusCode: 400,
      code: "GOAL3_FINAL_GA_AUDIT_INVALID"
    });
  }
}

export function recordGoal3FinalGaAudit(projectRoot: string, input: Goal3FinalGaAuditInput): Goal3FinalGaAudit {
  const projectId = assertSafeId(input.project_id, "project_id");
  const auditId = assertSafeId(input.final_ga_audit_id, "final_ga_audit_id");
  const requestedMode = input.requested_audit_mode ?? "open_formal_workbench_final_ga_audit";
  if (requestedMode !== "open_formal_workbench_final_ga_audit") {
    throw new ComathError("Goal 3 final GA audit mode is invalid", {
      statusCode: 400,
      code: "GOAL3_FINAL_GA_AUDIT_INVALID_MODE"
    });
  }

  const auditPath = finalGaAuditPath(auditId);
  const absoluteAuditPath = assertPathAllowed(projectRoot, auditPath, { purpose: "runtime-write" });
  if (existsSync(absoluteAuditPath)) {
    throw new ComathError("Goal 3 final GA audit already exists", {
      statusCode: 409,
      code: "GOAL3_FINAL_GA_AUDIT_ALREADY_EXISTS"
    });
  }

  const certificationReviewId = assertSafeId(input.ga_certification_review_id, "ga_certification_review_id");
  const canonicalCertificationPath = gaCertificationReviewPath(certificationReviewId);
  if (normalizeRelativePath(input.ga_certification_review_path) !== canonicalCertificationPath) {
    throw new ComathError("Goal 3 final GA audit certification-review path is not canonical", {
      statusCode: 400,
      code: "GOAL3_FINAL_GA_AUDIT_INVALID"
    });
  }
  const certification = readJsonArtifact<CertificationReviewBody>(
    projectRoot,
    canonicalCertificationPath,
    input.ga_certification_review_sha256,
    "goal3_ga_certification_review"
  );
  assertCertificationReview(certification.body, projectId, certificationReviewId, canonicalCertificationPath);

  const operationalReference = artifactReference(
    certification.body.operational_readiness_review_artifact,
    "operational-readiness",
    "goal3_ga_operational_readiness_review",
    certification.body.operational_readiness_review_path
  );
  const acceptanceReference = artifactReference(
    certification.body.acceptance_report_artifact,
    "acceptance-report",
    "goal3_ga_acceptance_report",
    certification.body.acceptance_report_path
  );
  const operational = readJsonArtifact<OperationalReadinessReviewBody>(
    projectRoot,
    operationalReference.path,
    operationalReference.sha256,
    operationalReference.kind,
    operationalReference.size_bytes
  );
  assertOperationalReadinessSupport(operational.body, projectId, operationalReference);
  const acceptance = readJsonArtifact<AcceptanceReportBody>(
    projectRoot,
    acceptanceReference.path,
    acceptanceReference.sha256,
    acceptanceReference.kind,
    acceptanceReference.size_bytes
  );
  assertAcceptanceSupport(acceptance.body);

  const proofBreadthClosure = optionalProofBreadthClosure(projectRoot, input);
  const proofBreadthClosureComplete =
    proofBreadthClosure !== null
      ? assertProofBreadthClosure(
          proofBreadthClosure.body,
          projectId,
          proofBreadthClosure.closureId,
          proofBreadthClosure.artifact.path
        )
      : false;
  const blockerReasons = proofBreadthClosureComplete
    ? []
    : ["positive_matrix_release_candidate_proof_breadth_incomplete", "ga_certification_review_not_ready_to_certify"];
  const actor = sanitizeActor(input.actor);
  const body = {
    schema_version: "comath.goal3_final_ga_audit.v1",
    final_ga_audit_id: auditId,
    project_id: projectId,
    actor,
    created_at: new Date().toISOString(),
    ok: proofBreadthClosureComplete,
    final_ga_audit_status: proofBreadthClosureComplete
      ? "passed_release_candidate_final_ga_audit"
      : "blocked_release_candidate_proof_breadth_incomplete",
    final_ga_audit_path: auditPath,
    requested_audit_mode: "open_formal_workbench_final_ga_audit",
    blocker_reasons: blockerReasons,
    ga_certification_review_id: certificationReviewId,
    ga_certification_review_path: canonicalCertificationPath,
    ga_certification_review_artifact: certification.artifact,
    ga_certification_review_current: true,
    ga_certification_status: "blocked_release_candidate_ga_certification_prerequisites",
    operational_readiness_review_id: String(certification.body.operational_readiness_review_id),
    operational_readiness_review_path: operationalReference.path,
    operational_readiness_review_artifact: operational.artifact,
    operational_readiness_review_current: true,
    acceptance_report_path: acceptanceReference.path,
    acceptance_report_artifact: acceptance.artifact,
    acceptance_report_current: true,
    trust_core_negative_suite_fail_closed: true,
    positive_workflow_representative_verified: true,
    positive_matrix_total_required_tasks: 100,
    proof_breadth_status: proofBreadthClosureComplete
      ? "complete_release_candidate_proof_breadth"
      : "blocked_positive_matrix_release_candidate_proof_breadth_incomplete",
    proof_breadth_blocker_code: proofBreadthClosureComplete
      ? ""
      : "ga_positive_100_task_matrix_not_fully_executed",
    ...(proofBreadthClosure !== null
      ? {
          proof_breadth_closure_id: proofBreadthClosure.closureId,
          proof_breadth_closure_path: proofBreadthClosure.artifact.path,
          proof_breadth_closure_artifact: proofBreadthClosure.artifact,
          proof_breadth_closure_current: true as const
        }
      : {}),
    final_ga_audit_available: true,
    final_ga_audit_passed: proofBreadthClosureComplete,
    ga_certificate_available: false,
    proof_authority: proofBreadthClosureComplete ? "lean_kernel_clean_replay" : "none",
    can_promote_claim: false,
    can_certify_ga: false,
    ga_certification_gate_separate: true
  } satisfies Omit<Goal3FinalGaAudit, "final_ga_audit_artifact">;

  const auditText = `${JSON.stringify(body, null, 2)}\n`;
  mkdirSync(dirname(absoluteAuditPath), { recursive: true });
  writeFileSync(absoluteAuditPath, auditText, "utf8");
  const result: Goal3FinalGaAudit = {
    ...body,
    final_ga_audit_artifact: {
      kind: "goal3_final_ga_audit",
      path: auditPath,
      sha256: sha256Text(auditText),
      size_bytes: Buffer.byteLength(auditText, "utf8")
    }
  };

  appendAuditEvent(projectRoot, {
    project_id: projectId,
    event_type: "release.goal3_final_ga_audit_recorded",
    actor,
    target_id: projectId,
    payload: {
      final_ga_audit_id: auditId,
      final_ga_audit_status: result.final_ga_audit_status,
      final_ga_audit_passed: result.final_ga_audit_passed,
      final_ga_audit_path: auditPath,
      final_ga_audit_artifact_sha256: result.final_ga_audit_artifact.sha256,
      ga_certification_review_id: certificationReviewId,
      ga_certification_review_artifact_sha256: certification.artifact.sha256,
      operational_readiness_review_artifact_sha256: operational.artifact.sha256,
      acceptance_report_artifact_sha256: acceptance.artifact.sha256,
      ...(proofBreadthClosure !== null
        ? {
            proof_breadth_closure_id: proofBreadthClosure.closureId,
            proof_breadth_closure_artifact_sha256: proofBreadthClosure.artifact.sha256
          }
        : {}),
      blocker_reasons: blockerReasons,
      proof_authority: result.proof_authority,
      can_promote_claim: false,
      can_certify_ga: false
    }
  });
  return result;
}
