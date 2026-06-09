import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { appendAuditEvent } from "../audit/jsonl-writer.js";
import { ComathError } from "../errors.js";
import { assertPathAllowed } from "../security/path-policy.js";
import { runGoal3GaAcceptanceWorkflow, type Goal3GaAcceptanceReport } from "./goal3-ga-acceptance.js";

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
  transport_closure_review_current?: unknown;
  adapter_os_isolation_review_current?: unknown;
  terminal_unattended_completion_certified?: unknown;
  completion_certificate_available?: unknown;
  unattended_real_host_execution_completed?: unknown;
  maintained_transport_primitive_bound?: unknown;
  durable_transport_provided?: unknown;
  live_transport_open?: unknown;
  adapter_os_isolation_required_for_ga?: unknown;
  proof_authority?: unknown;
  can_promote_claim?: unknown;
  can_certify_ga?: unknown;
  ga_certification_gate_separate?: unknown;
};

type FinalGaAuditBody = {
  schema_version?: unknown;
  final_ga_audit_id?: unknown;
  project_id?: unknown;
  ok?: unknown;
  final_ga_audit_status?: unknown;
  final_ga_audit_path?: unknown;
  final_ga_audit_artifact?: unknown;
  requested_audit_mode?: unknown;
  blocker_reasons?: unknown;
  proof_breadth_status?: unknown;
  proof_breadth_blocker_code?: unknown;
  proof_breadth_closure_current?: unknown;
  proof_breadth_closure_artifact?: unknown;
  final_ga_audit_available?: unknown;
  final_ga_audit_passed?: unknown;
  ga_certificate_available?: unknown;
  proof_authority?: unknown;
  can_promote_claim?: unknown;
  can_certify_ga?: unknown;
  ga_certification_gate_separate?: unknown;
};

export type Goal3GaCertificationReviewInput = {
  project_id: string;
  ga_certification_review_id?: string;
  actor?: string;
  operational_readiness_review_id: string;
  operational_readiness_review_path: string;
  operational_readiness_review_sha256: string;
  final_ga_audit_id?: string;
  final_ga_audit_path?: string;
  final_ga_audit_sha256?: string;
  requested_review_mode?: "open_formal_workbench_ga_certification";
};

export type Goal3GaCertificationReview = {
  schema_version: "comath.goal3_ga_certification_review.v1";
  ga_certification_review_id: string;
  project_id: string;
  actor: string;
  created_at: string;
  ok: boolean;
  ga_certification_status:
    | "blocked_release_candidate_ga_certification_prerequisites"
    | "ready_for_ga_certificate_gate";
  ga_certification_review_path: string;
  requested_review_mode: "open_formal_workbench_ga_certification";
  blocker_reasons: string[];
  operational_readiness_review_id: string;
  operational_readiness_review_path: string;
  operational_readiness_review_artifact: ArtifactReference;
  operational_readiness_review_current: true;
  operational_readiness_status:
    | "ready_for_ga_release_candidate_review"
    | "blocked_ga_operational_readiness_prerequisites";
  acceptance_report_path: string;
  acceptance_report_artifact: ArtifactReference;
  acceptance_report_current: true;
  trust_core_negative_suite_fail_closed: boolean;
  positive_workflow_representative_verified: boolean;
  positive_matrix_total_required_tasks: number;
  positive_matrix_remaining_blocker_status: "replayable_blocker";
  positive_matrix_remaining_blocker_code: "ga_positive_100_task_matrix_not_fully_executed";
  final_ga_audit_available: boolean;
  final_ga_audit_id?: string;
  final_ga_audit_path?: string;
  final_ga_audit_artifact?: ArtifactReference;
  final_ga_audit_current?: true;
  final_ga_audit_passed: boolean;
  ga_certificate_available: false;
  proof_authority: "none" | "lean_kernel_clean_replay";
  can_promote_claim: false;
  can_certify_ga: false;
  ga_certification_gate_separate: true;
  ga_certification_review_artifact: ArtifactReference;
};

function normalizeRelativePath(path: string): string {
  return path.replace(/\\/g, "/").replace(/^\.\/+/u, "");
}

function gaCertificationReviewPath(reviewId: string): string {
  return normalizeRelativePath(join(".comath", "release", "goal3-ga-certification", reviewId, "review.json"));
}

function gaCertificationAcceptanceReportPath(reviewId: string): string {
  return normalizeRelativePath(join(".comath", "release", "goal3-ga-certification", reviewId, "acceptance-report.json"));
}

function finalGaAuditPath(auditId: string): string {
  return normalizeRelativePath(join(".comath", "release", "goal3-final-ga-audit", auditId, "audit.json"));
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

function assertSafeId(value: string | undefined, label: string): string {
  const id = typeof value === "string" ? value.trim() : "";
  if (!/^[A-Za-z0-9][A-Za-z0-9._-]{2,120}$/u.test(id)) {
    throw new ComathError(`${label} is invalid`, {
      statusCode: 400,
      code: "GOAL3_GA_CERTIFICATION_REVIEW_INVALID_ID"
    });
  }
  return id;
}

function assertSha256(value: string | undefined): string {
  const sha256 = typeof value === "string" ? value.trim().toLowerCase() : "";
  if (!/^[a-f0-9]{64}$/u.test(sha256)) {
    throw new ComathError("Goal 3 GA certification review artifact hash is stale", {
      statusCode: 400,
      code: "GOAL3_GA_CERTIFICATION_REVIEW_STALE"
    });
  }
  return sha256;
}

function sanitizeActor(value: string | undefined): string {
  return (value ?? "goal3-ga-certification-review")
    .replace(/(?:[A-Za-z]:[\\/][^\s"']+|\\\\[^\s"']+)/gu, "[redacted-path]")
    .replace(/(?:Authorization:\s*Bearer\s+\S+|api_key=\S+|token=\S+|sk-[A-Za-z0-9_-]+)/giu, "[redacted-secret]")
    .replace(
      /\b(?:clean_replay_passed|completed_formal_proof|formally_checked|formal_proof_verified|formal_replay_passed|lean_kernel_clean_replay|kernel_checked|proof_success|GA certified|can_certify_ga\s*[:=]\s*(?:true|1)|can_promote_claim\s*[:=]\s*(?:true|1))\b/giu,
      "[redacted-authority-claim]"
    )
    .slice(0, 400);
}

function readOperationalReadinessReview(
  projectRoot: string,
  inputPath: string,
  reviewId: string,
  expectedSha256: string
): { body: OperationalReadinessReviewBody; artifact: ArtifactReference } {
  const canonicalPath = operationalReadinessReviewPath(reviewId);
  if (normalizeRelativePath(inputPath) !== canonicalPath) {
    throw new ComathError("Goal 3 GA certification operational readiness path is not canonical", {
      statusCode: 400,
      code: "GOAL3_GA_CERTIFICATION_REVIEW_INVALID"
    });
  }
  const absolutePath = assertPathAllowed(projectRoot, canonicalPath, { purpose: "read", resolveRealpath: true });
  if (!existsSync(absolutePath) || !statSync(absolutePath).isFile()) {
    throw new ComathError("Goal 3 GA certification operational readiness artifact is stale", {
      statusCode: 400,
      code: "GOAL3_GA_CERTIFICATION_REVIEW_STALE"
    });
  }
  const content = readFileSync(absolutePath);
  const actualSha256 = sha256Bytes(content);
  if (actualSha256 !== assertSha256(expectedSha256)) {
    throw new ComathError("Goal 3 GA certification operational readiness artifact hash is stale", {
      statusCode: 400,
      code: "GOAL3_GA_CERTIFICATION_REVIEW_STALE"
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
    throw new ComathError("Goal 3 GA certification operational readiness JSON is invalid", {
      statusCode: 400,
      code: "GOAL3_GA_CERTIFICATION_REVIEW_INVALID"
    });
  }
}

function readFinalGaAudit(
  projectRoot: string,
  input: Goal3GaCertificationReviewInput
): { body: FinalGaAuditBody; artifact: ArtifactReference; auditId: string } | null {
  const hasAnyFinalAuditInput =
    input.final_ga_audit_id !== undefined ||
    input.final_ga_audit_path !== undefined ||
    input.final_ga_audit_sha256 !== undefined;
  if (!hasAnyFinalAuditInput) {
    return null;
  }
  const auditId = assertSafeId(input.final_ga_audit_id, "final_ga_audit_id");
  const canonicalPath = finalGaAuditPath(auditId);
  if (normalizeRelativePath(input.final_ga_audit_path ?? "") !== canonicalPath) {
    throw new ComathError("Goal 3 GA certification final audit path is not canonical", {
      statusCode: 400,
      code: "GOAL3_GA_CERTIFICATION_REVIEW_INVALID"
    });
  }
  const absolutePath = assertPathAllowed(projectRoot, canonicalPath, { purpose: "read", resolveRealpath: true });
  if (!existsSync(absolutePath) || !statSync(absolutePath).isFile()) {
    throw new ComathError("Goal 3 GA certification final audit artifact is stale", {
      statusCode: 400,
      code: "GOAL3_GA_CERTIFICATION_REVIEW_STALE"
    });
  }
  const content = readFileSync(absolutePath);
  const actualSha256 = sha256Bytes(content);
  if (actualSha256 !== assertSha256(input.final_ga_audit_sha256 ?? "")) {
    throw new ComathError("Goal 3 GA certification final audit artifact hash is stale", {
      statusCode: 400,
      code: "GOAL3_GA_CERTIFICATION_REVIEW_STALE"
    });
  }
  try {
    return {
      body: JSON.parse(content.toString("utf8")) as FinalGaAuditBody,
      artifact: {
        kind: "goal3_final_ga_audit",
        path: canonicalPath,
        sha256: actualSha256,
        size_bytes: content.byteLength
      },
      auditId
    };
  } catch {
    throw new ComathError("Goal 3 GA certification final audit JSON is invalid", {
      statusCode: 400,
      code: "GOAL3_GA_CERTIFICATION_REVIEW_INVALID"
    });
  }
}

function assertOperationalReadinessReview(
  body: OperationalReadinessReviewBody,
  projectId: string,
  reviewId: string,
  canonicalPath: string
): void {
  const ready = body.ok === true;
  const blocked = body.ok === false;
  const statusOk = ready
    ? body.operational_readiness_status === "ready_for_ga_release_candidate_review"
    : body.operational_readiness_status === "blocked_ga_operational_readiness_prerequisites";
  if (
    body.schema_version !== "comath.goal3_ga_operational_readiness_review.v1" ||
    body.operational_readiness_review_id !== reviewId ||
    body.project_id !== projectId ||
    body.operational_readiness_review_path !== canonicalPath ||
    body.operational_readiness_review_artifact !== undefined ||
    (!ready && !blocked) ||
    !statusOk ||
    body.requested_review_mode !== "open_formal_workbench_ga_operational_readiness" ||
    body.transport_closure_review_current !== true ||
    body.adapter_os_isolation_review_current !== true ||
    body.terminal_unattended_completion_certified !== true ||
    body.completion_certificate_available !== true ||
    body.unattended_real_host_execution_completed !== true ||
    body.maintained_transport_primitive_bound !== true ||
    body.durable_transport_provided !== false ||
    body.live_transport_open !== false ||
    body.adapter_os_isolation_required_for_ga !== true ||
    body.proof_authority !== "none" ||
    body.can_promote_claim !== false ||
    body.can_certify_ga !== false ||
    body.ga_certification_gate_separate !== true
  ) {
    throw new ComathError("Goal 3 GA certification operational readiness review violates boundaries", {
      statusCode: 400,
      code: "GOAL3_GA_CERTIFICATION_REVIEW_INVALID"
    });
  }
}

function acceptanceReportIsCurrent(report: Goal3GaAcceptanceReport): boolean {
  return (
    report.schema_version === "comath.goal3_ga_acceptance.v1" &&
    report.proof_authority === "none" &&
    report.trust_core_negative_suite.all_required_cases_fail_closed &&
    report.trust_core_negative_suite.missing_required_cases.length === 0 &&
    report.positive_workflow.result === "representative_verified_fixture" &&
    report.positive_workflow.lean_run_verification.ok &&
    report.positive_workflow.final_replay_verification.ok &&
    report.positive_matrix.remaining_matrix_blocker.status === "replayable_blocker" &&
    report.positive_matrix.remaining_matrix_blocker.can_promote_claim === false
  );
}

function assertFinalGaAudit(body: FinalGaAuditBody, projectId: string, auditId: string, canonicalPath: string): boolean {
  const blockers = Array.isArray(body.blocker_reasons) ? body.blocker_reasons : [];
  const commonValid =
    body.schema_version === "comath.goal3_final_ga_audit.v1" &&
    body.final_ga_audit_id === auditId &&
    body.project_id === projectId &&
    body.final_ga_audit_path === canonicalPath &&
    body.final_ga_audit_artifact === undefined &&
    body.requested_audit_mode === "open_formal_workbench_final_ga_audit" &&
    body.final_ga_audit_available === true &&
    body.ga_certificate_available === false &&
    body.can_promote_claim === false &&
    body.can_certify_ga === false &&
    body.ga_certification_gate_separate === true;
  if (!commonValid) {
    throw new ComathError("Goal 3 GA certification final audit violates boundaries", {
      statusCode: 400,
      code: "GOAL3_GA_CERTIFICATION_REVIEW_INVALID"
    });
  }

  const passed =
    body.ok === true &&
    body.final_ga_audit_status === "passed_release_candidate_final_ga_audit" &&
    blockers.length === 0 &&
    body.final_ga_audit_passed === true &&
    body.proof_breadth_status === "complete_release_candidate_proof_breadth" &&
    body.proof_breadth_blocker_code === "" &&
    body.proof_breadth_closure_current === true &&
    body.proof_breadth_closure_artifact !== undefined &&
    body.proof_authority === "lean_kernel_clean_replay";
  if (passed) {
    return true;
  }

  const blocked =
    body.ok === false &&
    body.final_ga_audit_status === "blocked_release_candidate_proof_breadth_incomplete" &&
    blockers.includes("positive_matrix_release_candidate_proof_breadth_incomplete") &&
    body.final_ga_audit_passed === false &&
    body.proof_breadth_status === "blocked_positive_matrix_release_candidate_proof_breadth_incomplete" &&
    body.proof_breadth_blocker_code === "ga_positive_100_task_matrix_not_fully_executed" &&
    body.proof_authority === "none";
  if (blocked) {
    return false;
  }

  throw new ComathError("Goal 3 GA certification final audit violates boundaries", {
    statusCode: 400,
    code: "GOAL3_GA_CERTIFICATION_REVIEW_INVALID"
  });
}

function scrubNoAuthoritySupportFlags(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => scrubNoAuthoritySupportFlags(item));
  }
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, child]) => [
        key,
        key === "can_promote_claim" || key === "can_certify_ga" ? false : scrubNoAuthoritySupportFlags(child)
      ])
    );
  }
  return value;
}

function toNoAuthorityAcceptanceSupportReport(report: Goal3GaAcceptanceReport): Goal3GaAcceptanceReport {
  return scrubNoAuthoritySupportFlags(report) as Goal3GaAcceptanceReport;
}

export function recordGoal3GaCertificationReview(
  projectRoot: string,
  input: Goal3GaCertificationReviewInput
): Goal3GaCertificationReview {
  const projectId = assertSafeId(input.project_id, "project_id");
  const reviewId = assertSafeId(input.ga_certification_review_id, "ga_certification_review_id");
  const requestedMode = input.requested_review_mode ?? "open_formal_workbench_ga_certification";
  if (requestedMode !== "open_formal_workbench_ga_certification") {
    throw new ComathError("Goal 3 GA certification review mode is invalid", {
      statusCode: 400,
      code: "GOAL3_GA_CERTIFICATION_REVIEW_INVALID_MODE"
    });
  }

  const reviewPath = gaCertificationReviewPath(reviewId);
  const acceptanceReportPath = gaCertificationAcceptanceReportPath(reviewId);
  const absoluteReviewPath = assertPathAllowed(projectRoot, reviewPath, { purpose: "runtime-write" });
  const absoluteAcceptancePath = assertPathAllowed(projectRoot, acceptanceReportPath, { purpose: "runtime-write" });
  if (existsSync(absoluteReviewPath) || existsSync(absoluteAcceptancePath)) {
    throw new ComathError("Goal 3 GA certification review already exists", {
      statusCode: 409,
      code: "GOAL3_GA_CERTIFICATION_REVIEW_ALREADY_EXISTS"
    });
  }

  const operationalReadinessReviewId = assertSafeId(
    input.operational_readiness_review_id,
    "operational_readiness_review_id"
  );
  const operational = readOperationalReadinessReview(
    projectRoot,
    input.operational_readiness_review_path,
    operationalReadinessReviewId,
    input.operational_readiness_review_sha256
  );
  const canonicalOperationalPath = operationalReadinessReviewPath(operationalReadinessReviewId);
  assertOperationalReadinessReview(operational.body, projectId, operationalReadinessReviewId, canonicalOperationalPath);

  const actor = sanitizeActor(input.actor);
  const acceptanceReport = runGoal3GaAcceptanceWorkflow({ projectRoot, actor });
  if (!acceptanceReportIsCurrent(acceptanceReport)) {
    throw new ComathError("Goal 3 GA certification acceptance diagnostic violates boundaries", {
      statusCode: 500,
      code: "GOAL3_GA_CERTIFICATION_REVIEW_INTERNAL_ACCEPTANCE_INVALID"
    });
  }
  const acceptanceSupportReport = toNoAuthorityAcceptanceSupportReport(acceptanceReport);
  const acceptanceText = `${JSON.stringify(acceptanceSupportReport, null, 2)}\n`;
  mkdirSync(dirname(absoluteAcceptancePath), { recursive: true });
  writeFileSync(absoluteAcceptancePath, acceptanceText, "utf8");
  const acceptanceArtifact: ArtifactReference = {
    kind: "goal3_ga_acceptance_report",
    path: acceptanceReportPath,
    sha256: sha256Text(acceptanceText),
    size_bytes: Buffer.byteLength(acceptanceText, "utf8")
  };

  const operationalReady = operational.body.ok === true;
  const finalGaAudit = readFinalGaAudit(projectRoot, input);
  const finalGaAuditPassed =
    finalGaAudit !== null
      ? assertFinalGaAudit(finalGaAudit.body, projectId, finalGaAudit.auditId, finalGaAudit.artifact.path)
      : false;
  const readyForCertificateGate = operationalReady && finalGaAuditPassed;
  const blockerReasons = readyForCertificateGate
    ? []
    : [
        ...(operationalReady ? [] : ["operational_readiness_review_not_ready"]),
        ...(finalGaAudit === null
          ? ["positive_matrix_release_candidate_proof_breadth_incomplete", "final_ga_certification_audit_not_available"]
          : finalGaAuditPassed
            ? []
            : ["final_ga_certification_audit_not_passed"])
      ];
  const body = {
    schema_version: "comath.goal3_ga_certification_review.v1",
    ga_certification_review_id: reviewId,
    project_id: projectId,
    actor,
    created_at: new Date().toISOString(),
    ok: readyForCertificateGate,
    ga_certification_status: readyForCertificateGate
      ? "ready_for_ga_certificate_gate"
      : "blocked_release_candidate_ga_certification_prerequisites",
    ga_certification_review_path: reviewPath,
    requested_review_mode: "open_formal_workbench_ga_certification",
    blocker_reasons: blockerReasons,
    operational_readiness_review_id: operationalReadinessReviewId,
    operational_readiness_review_path: canonicalOperationalPath,
    operational_readiness_review_artifact: operational.artifact,
    operational_readiness_review_current: true,
    operational_readiness_status: operationalReady
      ? "ready_for_ga_release_candidate_review"
      : "blocked_ga_operational_readiness_prerequisites",
    acceptance_report_path: acceptanceReportPath,
    acceptance_report_artifact: acceptanceArtifact,
    acceptance_report_current: true,
    trust_core_negative_suite_fail_closed: acceptanceReport.trust_core_negative_suite.all_required_cases_fail_closed,
    positive_workflow_representative_verified: acceptanceReport.positive_workflow.result === "representative_verified_fixture",
    positive_matrix_total_required_tasks: acceptanceReport.positive_matrix.total_required_tasks,
    positive_matrix_remaining_blocker_status: acceptanceReport.positive_matrix.remaining_matrix_blocker.status,
    positive_matrix_remaining_blocker_code: acceptanceReport.positive_matrix.remaining_matrix_blocker.blocker_code,
    final_ga_audit_available: finalGaAudit !== null,
    ...(finalGaAudit !== null
      ? {
          final_ga_audit_id: finalGaAudit.auditId,
          final_ga_audit_path: finalGaAudit.artifact.path,
          final_ga_audit_artifact: finalGaAudit.artifact,
          final_ga_audit_current: true as const
        }
      : {}),
    final_ga_audit_passed: finalGaAuditPassed,
    ga_certificate_available: false,
    proof_authority: finalGaAuditPassed ? "lean_kernel_clean_replay" : "none",
    can_promote_claim: false,
    can_certify_ga: false,
    ga_certification_gate_separate: true
  } satisfies Omit<Goal3GaCertificationReview, "ga_certification_review_artifact">;

  const reviewText = `${JSON.stringify(body, null, 2)}\n`;
  mkdirSync(dirname(absoluteReviewPath), { recursive: true });
  writeFileSync(absoluteReviewPath, reviewText, "utf8");
  const result: Goal3GaCertificationReview = {
    ...body,
    ga_certification_review_artifact: {
      kind: "goal3_ga_certification_review",
      path: reviewPath,
      sha256: sha256Text(reviewText),
      size_bytes: Buffer.byteLength(reviewText, "utf8")
    }
  };

  appendAuditEvent(projectRoot, {
    project_id: projectId,
    event_type: "release.goal3_ga_certification_review_recorded",
    actor,
    target_id: projectId,
    payload: {
      ga_certification_review_id: reviewId,
      ga_certification_status: result.ga_certification_status,
      ga_certification_review_path: reviewPath,
      ga_certification_review_artifact_sha256: result.ga_certification_review_artifact.sha256,
      operational_readiness_review_id: operationalReadinessReviewId,
      operational_readiness_review_artifact_sha256: operational.artifact.sha256,
      acceptance_report_artifact_sha256: acceptanceArtifact.sha256,
      ...(finalGaAudit !== null
        ? {
            final_ga_audit_id: finalGaAudit.auditId,
            final_ga_audit_artifact_sha256: finalGaAudit.artifact.sha256,
            final_ga_audit_passed: finalGaAuditPassed
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
