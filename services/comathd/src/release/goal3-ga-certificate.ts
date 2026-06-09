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
  operational_readiness_review_current?: unknown;
  acceptance_report_current?: unknown;
  final_ga_audit_available?: unknown;
  final_ga_audit_id?: unknown;
  final_ga_audit_path?: unknown;
  final_ga_audit_artifact?: unknown;
  final_ga_audit_current?: unknown;
  final_ga_audit_passed?: unknown;
  ga_certificate_available?: unknown;
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

export type Goal3GaCertificateInput = {
  project_id: string;
  ga_certificate_id?: string;
  actor?: string;
  ga_certification_review_id: string;
  ga_certification_review_path: string;
  ga_certification_review_sha256: string;
  requested_certificate_mode?: "open_formal_workbench_ga_certificate";
};

export type Goal3GaCertificate = {
  schema_version: "comath.goal3_ga_certificate.v1";
  ga_certificate_id: string;
  project_id: string;
  actor: string;
  created_at: string;
  ok: true;
  ga_certification_status: "ga_release_candidate_certified";
  ga_certificate_path: string;
  requested_certificate_mode: "open_formal_workbench_ga_certificate";
  ga_certification_review_id: string;
  ga_certification_review_path: string;
  ga_certification_review_artifact: ArtifactReference;
  ga_certification_review_current: true;
  final_ga_audit_id: string;
  final_ga_audit_path: string;
  final_ga_audit_artifact: ArtifactReference;
  final_ga_audit_current: true;
  final_ga_audit_passed: true;
  ga_certificate_available: true;
  proof_authority: "lean_kernel_clean_replay";
  can_promote_claim: false;
  can_certify_ga: true;
  claim_promotion_requires_ordinary_gate: true;
  ga_certificate_artifact: ArtifactReference;
};

function normalizeRelativePath(path: string): string {
  return path.replace(/\\/g, "/").replace(/^\.\/+/u, "");
}

function certificatePath(certificateId: string): string {
  return normalizeRelativePath(join(".comath", "release", "goal3-ga-certificate", certificateId, "certificate.json"));
}

function certificationReviewPath(reviewId: string): string {
  return normalizeRelativePath(join(".comath", "release", "goal3-ga-certification", reviewId, "review.json"));
}

function finalGaAuditPath(auditId: string): string {
  return normalizeRelativePath(join(".comath", "release", "goal3-final-ga-audit", auditId, "audit.json"));
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
      code: "GOAL3_GA_CERTIFICATE_INVALID_ID"
    });
  }
  return id;
}

function assertSha256(value: string | undefined): string {
  const sha256 = typeof value === "string" ? value.trim().toLowerCase() : "";
  if (!/^[a-f0-9]{64}$/u.test(sha256)) {
    throw new ComathError("Goal 3 GA certificate referenced artifact hash is stale", {
      statusCode: 400,
      code: "GOAL3_GA_CERTIFICATE_STALE"
    });
  }
  return sha256;
}

function sanitizeActor(value: string | undefined): string {
  return (value ?? "goal3-ga-certificate")
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
    throw new ComathError("Goal 3 GA certificate referenced artifact is stale", {
      statusCode: 400,
      code: "GOAL3_GA_CERTIFICATE_STALE"
    });
  }
  const content = readFileSync(absolutePath);
  const actualSha256 = sha256Bytes(content);
  if (actualSha256 !== assertSha256(expectedSha256)) {
    throw new ComathError("Goal 3 GA certificate referenced artifact hash is stale", {
      statusCode: 400,
      code: "GOAL3_GA_CERTIFICATE_STALE"
    });
  }
  if (expectedSizeBytes !== undefined && content.byteLength !== expectedSizeBytes) {
    throw new ComathError("Goal 3 GA certificate referenced artifact size is stale", {
      statusCode: 400,
      code: "GOAL3_GA_CERTIFICATE_STALE"
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
    throw new ComathError("Goal 3 GA certificate referenced JSON is invalid", {
      statusCode: 400,
      code: "GOAL3_GA_CERTIFICATE_INVALID"
    });
  }
}

function artifactReference(value: unknown, label: string, expectedKind: string, expectedPath: unknown): ArtifactReference {
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
    throw new ComathError(`Goal 3 GA certificate ${label} reference is invalid`, {
      statusCode: 400,
      code: "GOAL3_GA_CERTIFICATE_INVALID"
    });
  }
  return {
    kind: record.kind,
    path,
    sha256: record.sha256,
    size_bytes: sizeBytes
  };
}

function assertPassedFinalGaAudit(
  body: FinalGaAuditBody,
  projectId: string,
  auditId: string,
  artifact: ArtifactReference
): void {
  const blockers = Array.isArray(body.blocker_reasons) ? body.blocker_reasons : [];
  if (
    body.schema_version !== "comath.goal3_final_ga_audit.v1" ||
    body.final_ga_audit_id !== auditId ||
    body.project_id !== projectId ||
    artifact.path !== finalGaAuditPath(auditId) ||
    body.final_ga_audit_path !== artifact.path ||
    body.final_ga_audit_artifact !== undefined ||
    body.requested_audit_mode !== "open_formal_workbench_final_ga_audit" ||
    body.ok !== true ||
    body.final_ga_audit_status !== "passed_release_candidate_final_ga_audit" ||
    blockers.length !== 0 ||
    body.final_ga_audit_available !== true ||
    body.final_ga_audit_passed !== true ||
    body.proof_breadth_status !== "complete_release_candidate_proof_breadth" ||
    body.proof_breadth_blocker_code !== "" ||
    body.proof_breadth_closure_current !== true ||
    body.proof_breadth_closure_artifact === undefined ||
    body.ga_certificate_available !== false ||
    body.proof_authority !== "lean_kernel_clean_replay" ||
    body.can_promote_claim !== false ||
    body.can_certify_ga !== false ||
    body.ga_certification_gate_separate !== true
  ) {
    throw new ComathError("Goal 3 GA certificate final audit is not certificate-ready", {
      statusCode: 400,
      code: "GOAL3_GA_CERTIFICATE_INVALID"
    });
  }
}

function assertReadyCertificationReview(
  body: CertificationReviewBody,
  projectId: string,
  reviewId: string,
  canonicalPath: string
): { auditId: string; artifact: ArtifactReference } {
  const blockers = Array.isArray(body.blocker_reasons) ? body.blocker_reasons : [];
  if (
    body.schema_version !== "comath.goal3_ga_certification_review.v1" ||
    body.ga_certification_review_id !== reviewId ||
    body.project_id !== projectId ||
    body.ga_certification_review_path !== canonicalPath ||
    body.ga_certification_review_artifact !== undefined ||
    body.requested_review_mode !== "open_formal_workbench_ga_certification" ||
    body.ok !== true ||
    body.ga_certification_status !== "ready_for_ga_certificate_gate" ||
    blockers.length !== 0 ||
    body.operational_readiness_review_current !== true ||
    body.acceptance_report_current !== true ||
    body.final_ga_audit_available !== true ||
    typeof body.final_ga_audit_id !== "string" ||
    typeof body.final_ga_audit_path !== "string" ||
    body.final_ga_audit_current !== true ||
    body.final_ga_audit_passed !== true ||
    body.ga_certificate_available !== false ||
    body.proof_authority !== "lean_kernel_clean_replay" ||
    body.can_promote_claim !== false ||
    body.can_certify_ga !== false ||
    body.ga_certification_gate_separate !== true
  ) {
    throw new ComathError("Goal 3 GA certificate certification review is not certificate-ready", {
      statusCode: 400,
      code: "GOAL3_GA_CERTIFICATE_INVALID"
    });
  }
  const auditId = assertSafeId(body.final_ga_audit_id, "final_ga_audit_id");
  const canonicalFinalAuditPath = finalGaAuditPath(auditId);
  if (normalizeRelativePath(body.final_ga_audit_path) !== canonicalFinalAuditPath) {
    throw new ComathError("Goal 3 GA certificate final-audit path is not canonical for its id", {
      statusCode: 400,
      code: "GOAL3_GA_CERTIFICATE_INVALID"
    });
  }
  return {
    auditId,
    artifact: artifactReference(
      body.final_ga_audit_artifact,
      "final-audit",
      "goal3_final_ga_audit",
      canonicalFinalAuditPath
    )
  };
}

export function recordGoal3GaCertificate(projectRoot: string, input: Goal3GaCertificateInput): Goal3GaCertificate {
  const projectId = assertSafeId(input.project_id, "project_id");
  const certificateId = assertSafeId(input.ga_certificate_id, "ga_certificate_id");
  const requestedMode = input.requested_certificate_mode ?? "open_formal_workbench_ga_certificate";
  if (requestedMode !== "open_formal_workbench_ga_certificate") {
    throw new ComathError("Goal 3 GA certificate mode is invalid", {
      statusCode: 400,
      code: "GOAL3_GA_CERTIFICATE_INVALID_MODE"
    });
  }

  const certificatePathValue = certificatePath(certificateId);
  const absoluteCertificatePath = assertPathAllowed(projectRoot, certificatePathValue, { purpose: "runtime-write" });
  if (existsSync(absoluteCertificatePath)) {
    throw new ComathError("Goal 3 GA certificate already exists", {
      statusCode: 409,
      code: "GOAL3_GA_CERTIFICATE_ALREADY_EXISTS"
    });
  }

  const reviewId = assertSafeId(input.ga_certification_review_id, "ga_certification_review_id");
  const canonicalReviewPath = certificationReviewPath(reviewId);
  if (normalizeRelativePath(input.ga_certification_review_path) !== canonicalReviewPath) {
    throw new ComathError("Goal 3 GA certificate certification-review path is not canonical", {
      statusCode: 400,
      code: "GOAL3_GA_CERTIFICATE_INVALID"
    });
  }
  const review = readJsonArtifact<CertificationReviewBody>(
    projectRoot,
    canonicalReviewPath,
    input.ga_certification_review_sha256,
    "goal3_ga_certification_review"
  );
  const finalAuditReference = assertReadyCertificationReview(review.body, projectId, reviewId, canonicalReviewPath);
  const finalAudit = readJsonArtifact<FinalGaAuditBody>(
    projectRoot,
    finalAuditReference.artifact.path,
    finalAuditReference.artifact.sha256,
    finalAuditReference.artifact.kind,
    finalAuditReference.artifact.size_bytes
  );
  assertPassedFinalGaAudit(finalAudit.body, projectId, finalAuditReference.auditId, finalAudit.artifact);

  const actor = sanitizeActor(input.actor);
  const body = {
    schema_version: "comath.goal3_ga_certificate.v1",
    ga_certificate_id: certificateId,
    project_id: projectId,
    actor,
    created_at: new Date().toISOString(),
    ok: true,
    ga_certification_status: "ga_release_candidate_certified",
    ga_certificate_path: certificatePathValue,
    requested_certificate_mode: "open_formal_workbench_ga_certificate",
    ga_certification_review_id: reviewId,
    ga_certification_review_path: canonicalReviewPath,
    ga_certification_review_artifact: review.artifact,
    ga_certification_review_current: true,
    final_ga_audit_id: finalAuditReference.auditId,
    final_ga_audit_path: finalAudit.artifact.path,
    final_ga_audit_artifact: finalAudit.artifact,
    final_ga_audit_current: true,
    final_ga_audit_passed: true,
    ga_certificate_available: true,
    proof_authority: "lean_kernel_clean_replay",
    can_promote_claim: false,
    can_certify_ga: true,
    claim_promotion_requires_ordinary_gate: true
  } satisfies Omit<Goal3GaCertificate, "ga_certificate_artifact">;

  const certificateText = `${JSON.stringify(body, null, 2)}\n`;
  mkdirSync(dirname(absoluteCertificatePath), { recursive: true });
  writeFileSync(absoluteCertificatePath, certificateText, "utf8");
  const result: Goal3GaCertificate = {
    ...body,
    ga_certificate_artifact: {
      kind: "goal3_ga_certificate",
      path: certificatePathValue,
      sha256: sha256Text(certificateText),
      size_bytes: Buffer.byteLength(certificateText, "utf8")
    }
  };

  appendAuditEvent(projectRoot, {
    project_id: projectId,
    event_type: "release.goal3_ga_certificate_recorded",
    actor,
    target_id: projectId,
    payload: {
      ga_certificate_id: certificateId,
      ga_certification_status: result.ga_certification_status,
      ga_certificate_path: certificatePathValue,
      ga_certificate_artifact_sha256: result.ga_certificate_artifact.sha256,
      ga_certification_review_id: reviewId,
      ga_certification_review_artifact_sha256: review.artifact.sha256,
      final_ga_audit_id: result.final_ga_audit_id,
      final_ga_audit_artifact_sha256: finalAudit.artifact.sha256,
      proof_authority: "lean_kernel_clean_replay",
      can_promote_claim: false,
      can_certify_ga: true
    }
  });
  return result;
}
