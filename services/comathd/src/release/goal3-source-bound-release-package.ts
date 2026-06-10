import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { appendAuditEvent } from "../audit/jsonl-writer.js";
import { ComathError } from "../errors.js";
import { sanitizePublicFormalAuthorityVocabulary } from "../proof-kernel/campaign/external-terminal-vocabulary.js";
import { assertPathAllowed } from "../security/path-policy.js";
import { canonicalJson, sha256Text } from "../verification/runner-contracts.js";
import { reviewGoal3PublicArchiveSurfaces } from "./public-archive-review.js";
import { assembleSourceReviewPublicArchive } from "./source-review-public-archive.js";

type ArtifactReference = {
  kind: string;
  path: string;
  sha256: string;
  size_bytes: number;
};

type Goal3GaCertificateConsumptionReviewBody = {
  schema_version?: unknown;
  ga_certificate_consumption_review_id?: unknown;
  project_id?: unknown;
  actor?: unknown;
  ok?: unknown;
  release_closure_status?: unknown;
  ga_certificate_consumption_review_path?: unknown;
  requested_consumption_mode?: unknown;
  ga_certificate_id?: unknown;
  ga_certificate_path?: unknown;
  ga_certificate_artifact?: unknown;
  ga_certificate_current?: unknown;
  ga_certificate_consumed?: unknown;
  ga_certification_review_id?: unknown;
  ga_certification_review_path?: unknown;
  ga_certification_review_artifact?: unknown;
  ga_certification_review_current?: unknown;
  final_ga_audit_id?: unknown;
  final_ga_audit_path?: unknown;
  final_ga_audit_artifact?: unknown;
  final_ga_audit_current?: unknown;
  final_ga_audit_passed?: unknown;
  proof_breadth_closure_id?: unknown;
  proof_breadth_closure_path?: unknown;
  proof_breadth_closure_artifact?: unknown;
  proof_breadth_closure_current?: unknown;
  proof_breadth_complete?: unknown;
  operational_readiness_review_id?: unknown;
  operational_readiness_review_path?: unknown;
  operational_readiness_review_artifact?: unknown;
  operational_readiness_review_current?: unknown;
  operational_readiness_status?: unknown;
  adapter_production_helper_source_bound?: unknown;
  adapter_helper_profile_source?: unknown;
  adapter_production_helper_configured?: unknown;
  adapter_bundled_protocol_asset?: unknown;
  ga_certificate_available?: unknown;
  proof_authority?: unknown;
  can_promote_claim?: unknown;
  can_certify_ga?: unknown;
  claim_promotion_requires_ordinary_gate?: unknown;
};

export type Goal3SourceBoundReleasePackageInput = {
  project_id: string;
  release_package_id?: string;
  actor?: string;
  ga_certificate_consumption_review_id: string;
  ga_certificate_consumption_review_path: string;
  ga_certificate_consumption_review_sha256: string;
};

export type Goal3SourceBoundReleasePackage = {
  schema_version: "comath.goal3_source_bound_release_package.v1";
  release_package_id: string;
  project_id: string;
  actor: string;
  created_at: string;
  ok: true;
  release_package_status: "source_bound_public_diagnostic_package_ready";
  release_package_path: string;
  ga_certificate_consumption_review_id: string;
  ga_certificate_consumption_review_path: string;
  ga_certificate_consumption_review_artifact: ArtifactReference;
  ga_certificate_consumption_review_current: true;
  source_bound_release_chain_current: true;
  source_review_public_archive_id: string;
  source_review_public_archive_manifest_path: string;
  source_review_public_archive_manifest_sha256: string;
  public_archive_review_id: string;
  public_archive_review_path: string;
  public_archive_review_ok: true;
  public_report_paths: {
    markdown: string;
    html: string;
    json: string;
  };
  proof_authority: "none";
  can_promote_claim: false;
  can_certify_ga: false;
  package_is_proof_authority: false;
  claim_promotion_requires_ordinary_gate: true;
  release_package_artifact: ArtifactReference;
};

type Goal3SourceBoundReleasePackageBody = Omit<Goal3SourceBoundReleasePackage, "release_package_artifact">;

const sourceBoundReleaseStatus = "publishable_workbench_release_candidate_source_bound";
const sourceBoundConsumptionMode = "open_formal_workbench_ga_certificate_source_bound_consumption";

function normalizeRelativePath(path: string): string {
  return path.replace(/\\/g, "/").replace(/^\.\/+/u, "");
}

function packagePath(packageId: string): string {
  return normalizeRelativePath(join(".comath", "release", "goal3-source-bound-release-package", packageId, "package.json"));
}

function publicArchiveReviewPath(reviewId: string): string {
  return normalizeRelativePath(join(".comath", "release", "public-archive-review", reviewId, "review.json"));
}

function generatedReportPath(packageId: string, format: "markdown" | "html" | "json"): string {
  const extension = format === "markdown" ? "md" : format;
  return normalizeRelativePath(
    join(".comath", "release", "source-review", "generated", "goal3-source-bound-release-package", packageId, `report.${extension}`)
  );
}

function consumptionReviewPath(reviewId: string): string {
  return normalizeRelativePath(join(".comath", "release", "goal3-ga-certificate-consumption", reviewId, "consumption-review.json"));
}

function assertSafeId(value: string | undefined, label: string): string {
  const id = typeof value === "string" ? value.trim() : "";
  if (!/^[A-Za-z0-9][A-Za-z0-9._-]{2,140}$/u.test(id)) {
    throw new ComathError(`${label} is invalid`, {
      statusCode: 400,
      code: "GOAL3_SOURCE_BOUND_RELEASE_PACKAGE_INVALID"
    });
  }
  return id;
}

function assertSha256(value: string | undefined): string {
  const sha256 = typeof value === "string" ? value.trim().toLowerCase() : "";
  if (!/^[a-f0-9]{64}$/u.test(sha256)) {
    throw new ComathError("Goal 3 source-bound release package referenced consumption hash is stale", {
      statusCode: 400,
      code: "GOAL3_SOURCE_BOUND_RELEASE_PACKAGE_STALE"
    });
  }
  return sha256;
}

function sanitizeActor(value: string | undefined): string {
  return (value ?? "goal3-source-bound-release-package")
    .replace(/(?:[A-Za-z]:[\\/][^\s"']+|\\\\[^\s"']+)/gu, "[redacted-path]")
    .replace(
      /(?:Authorization:\s*Bearer\s+\S+|api[_-]?key(?:=\S+)?|token=\S+|sk-[A-Za-z0-9_-]+)/giu,
      "[redacted-secret]"
    )
    .replace(
      /\b(?:clean_replay_passed|completed_formal_proof|formally_checked|formal_proof_verified|formal_replay_passed|kernel_checked|lean_kernel_clean_replay|proof_success|proven|verified_final_authority_evidence|can_promote_claim\s*[:=]\s*(?:true|1))\b/giu,
      "[redacted-authority-claim]"
    )
    .slice(0, 400);
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
    throw new ComathError(`Goal 3 source-bound release package ${label} reference is invalid`, {
      statusCode: 400,
      code: "GOAL3_SOURCE_BOUND_RELEASE_PACKAGE_INVALID"
    });
  }
  return {
    kind: record.kind,
    path,
    sha256: record.sha256,
    size_bytes: sizeBytes
  };
}

function readConsumptionReview(
  projectRoot: string,
  input: Goal3SourceBoundReleasePackageInput,
  consumptionId: string
): {
  body: Goal3GaCertificateConsumptionReviewBody;
  artifact: ArtifactReference;
} {
  const canonicalPath = consumptionReviewPath(consumptionId);
  if (normalizeRelativePath(input.ga_certificate_consumption_review_path) !== canonicalPath) {
    throw new ComathError("Goal 3 source-bound release package consumption-review path is not canonical", {
      statusCode: 400,
      code: "GOAL3_SOURCE_BOUND_RELEASE_PACKAGE_INVALID"
    });
  }
  const absolutePath = assertPathAllowed(projectRoot, canonicalPath, { purpose: "read", resolveRealpath: true });
  if (!existsSync(absolutePath) || !statSync(absolutePath).isFile()) {
    throw new ComathError("Goal 3 source-bound release package referenced consumption review is stale", {
      statusCode: 400,
      code: "GOAL3_SOURCE_BOUND_RELEASE_PACKAGE_STALE"
    });
  }
  const text = readFileSync(absolutePath, "utf8");
  const actualSha256 = sha256Text(text);
  if (actualSha256 !== assertSha256(input.ga_certificate_consumption_review_sha256)) {
    throw new ComathError("Goal 3 source-bound release package referenced consumption hash is stale", {
      statusCode: 400,
      code: "GOAL3_SOURCE_BOUND_RELEASE_PACKAGE_STALE"
    });
  }
  try {
    return {
      body: JSON.parse(text) as Goal3GaCertificateConsumptionReviewBody,
      artifact: {
        kind: "goal3_ga_certificate_consumption_review",
        path: canonicalPath,
        sha256: actualSha256,
        size_bytes: Buffer.byteLength(text, "utf8")
      }
    };
  } catch {
    throw new ComathError("Goal 3 source-bound release package consumption review JSON is invalid", {
      statusCode: 400,
      code: "GOAL3_SOURCE_BOUND_RELEASE_PACKAGE_INVALID"
    });
  }
}

function assertConsumptionReviewSourceBound(
  body: Goal3GaCertificateConsumptionReviewBody,
  projectId: string,
  consumptionId: string,
  artifact: ArtifactReference
): void {
  if (
    body.schema_version !== "comath.goal3_ga_certificate_consumption_review.v1" ||
    body.ga_certificate_consumption_review_id !== consumptionId ||
    body.project_id !== projectId ||
    body.ok !== true ||
    body.release_closure_status !== sourceBoundReleaseStatus ||
    body.ga_certificate_consumption_review_path !== artifact.path ||
    body.requested_consumption_mode !== sourceBoundConsumptionMode ||
    body.ga_certificate_current !== true ||
    body.ga_certificate_consumed !== true ||
    body.ga_certification_review_current !== true ||
    body.final_ga_audit_current !== true ||
    body.final_ga_audit_passed !== true ||
    body.proof_breadth_closure_current !== true ||
    body.proof_breadth_complete !== true ||
    body.operational_readiness_review_current !== true ||
    body.operational_readiness_status !== "ready_for_ga_release_candidate_review" ||
    body.adapter_production_helper_source_bound !== true ||
    body.adapter_helper_profile_source !== "operator_configured_provider_helper" ||
    body.adapter_production_helper_configured !== true ||
    body.adapter_bundled_protocol_asset !== false ||
    body.ga_certificate_available !== true ||
    body.proof_authority !== "lean_kernel_clean_replay" ||
    body.can_promote_claim !== false ||
    body.can_certify_ga !== true ||
    body.claim_promotion_requires_ordinary_gate !== true
  ) {
    throw new ComathError("Goal 3 source-bound release package consumption review is not publishable source-bound material", {
      statusCode: 400,
      code: "GOAL3_SOURCE_BOUND_RELEASE_PACKAGE_INVALID"
    });
  }

  artifactReference(body.ga_certificate_artifact, "GA certificate", "goal3_ga_certificate", body.ga_certificate_path);
  artifactReference(
    body.ga_certification_review_artifact,
    "GA certification review",
    "goal3_ga_certification_review",
    body.ga_certification_review_path
  );
  artifactReference(body.final_ga_audit_artifact, "final GA audit", "goal3_final_ga_audit", body.final_ga_audit_path);
  artifactReference(
    body.proof_breadth_closure_artifact,
    "proof-breadth closure",
    "goal3_release_candidate_proof_breadth_closure",
    body.proof_breadth_closure_path
  );
  artifactReference(
    body.operational_readiness_review_artifact,
    "operational readiness",
    "goal3_ga_operational_readiness_review",
    body.operational_readiness_review_path
  );
}

function publicPackageReport(packageId: string, body: Goal3GaCertificateConsumptionReviewBody, artifact: ArtifactReference): unknown {
  return sanitizePublicFormalAuthorityVocabulary({
    schema_version: "comath.goal3_source_bound_release_package_public_report.v1",
    release_package_id: packageId,
    release_package_status: "source_bound_public_diagnostic_package_ready",
    ga_certificate_consumption_review: {
      id: artifact.path.split("/").slice(-2, -1)[0],
      path: artifact.path,
      sha256: artifact.sha256,
      size_bytes: artifact.size_bytes
    },
    source_bound_release_chain: {
      ga_certificate_id: body.ga_certificate_id,
      ga_certificate_sha256: (body.ga_certificate_artifact as ArtifactReference | undefined)?.sha256,
      ga_certification_review_id: body.ga_certification_review_id,
      ga_certification_review_sha256: (body.ga_certification_review_artifact as ArtifactReference | undefined)?.sha256,
      final_ga_audit_id: body.final_ga_audit_id,
      final_ga_audit_sha256: (body.final_ga_audit_artifact as ArtifactReference | undefined)?.sha256,
      proof_breadth_closure_id: body.proof_breadth_closure_id,
      proof_breadth_closure_sha256: (body.proof_breadth_closure_artifact as ArtifactReference | undefined)?.sha256,
      operational_readiness_review_id: body.operational_readiness_review_id,
      operational_readiness_review_sha256: (body.operational_readiness_review_artifact as ArtifactReference | undefined)?.sha256,
      source_bound_release_chain_current: true
    },
    public_archive_contract: {
      kind: "source_bound_release_package_public_diagnostic",
      proof_authority: "none",
      can_promote_claim: false,
      can_certify_ga: false,
      package_is_proof_authority: false,
      can_restore: false,
      exposes_host_paths: false
    },
    proof_authority: "none",
    can_promote_claim: false,
    can_certify_ga: false,
    package_is_proof_authority: false,
    claim_promotion_requires_ordinary_gate: true
  });
}

function writeGeneratedReports(
  projectRoot: string,
  packageId: string,
  body: Goal3GaCertificateConsumptionReviewBody,
  artifact: ArtifactReference
): Goal3SourceBoundReleasePackageBody["public_report_paths"] {
  const report = publicPackageReport(packageId, body, artifact) as Record<string, unknown>;
  const jsonPath = generatedReportPath(packageId, "json");
  const markdownPath = generatedReportPath(packageId, "markdown");
  const htmlPath = generatedReportPath(packageId, "html");
  const summaryLines = [
    "# Goal 3 Source-Bound Release Package",
    "",
    `Package id: ${packageId}`,
    "Status: source_bound_public_diagnostic_package_ready",
    `Task306 consumption review: ${artifact.path}`,
    `Task306 consumption review SHA-256: ${artifact.sha256}`,
    "",
    "This public package is diagnostic material only.",
    "Proof authority: none.",
    "Claim promotion: false.",
    "GA certification: false."
  ];
  const html = [
    "<!doctype html>",
    '<html lang="en">',
    "<head><meta charset=\"utf-8\"><title>Goal 3 Source-Bound Release Package</title></head>",
    "<body>",
    "<h1>Goal 3 Source-Bound Release Package</h1>",
    `<p>Package id: ${packageId}</p>`,
    "<p>Status: source_bound_public_diagnostic_package_ready</p>",
    `<p>Task306 consumption review: ${artifact.path}</p>`,
    `<p>Task306 consumption review SHA-256: ${artifact.sha256}</p>`,
    "<p>This public package is diagnostic material only.</p>",
    "<p>Proof authority: none.</p>",
    "<p>Claim promotion: false.</p>",
    "<p>GA certification: false.</p>",
    "</body>",
    "</html>"
  ].join("\n");

  for (const [path, text] of [
    [jsonPath, canonicalJson(report)],
    [markdownPath, `${summaryLines.join("\n")}\n`],
    [htmlPath, `${html}\n`]
  ] as const) {
    const absolutePath = assertPathAllowed(projectRoot, path, { purpose: "runtime-write" });
    mkdirSync(dirname(absolutePath), { recursive: true });
    writeFileSync(absolutePath, text, "utf8");
  }
  return {
    markdown: markdownPath,
    html: htmlPath,
    json: jsonPath
  };
}

export function recordGoal3SourceBoundReleasePackage(
  projectRoot: string,
  input: Goal3SourceBoundReleasePackageInput
): Goal3SourceBoundReleasePackage {
  const projectId = assertSafeId(input.project_id, "project_id");
  const packageId = assertSafeId(input.release_package_id, "release_package_id");
  const consumptionId = assertSafeId(
    input.ga_certificate_consumption_review_id,
    "ga_certificate_consumption_review_id"
  );
  const packageManifestPath = packagePath(packageId);
  const absolutePackageManifestPath = assertPathAllowed(projectRoot, packageManifestPath, { purpose: "runtime-write" });
  if (existsSync(absolutePackageManifestPath)) {
    throw new ComathError("Goal 3 source-bound release package already exists", {
      statusCode: 409,
      code: "GOAL3_SOURCE_BOUND_RELEASE_PACKAGE_ALREADY_EXISTS"
    });
  }

  const consumption = readConsumptionReview(projectRoot, input, consumptionId);
  assertConsumptionReviewSourceBound(consumption.body, projectId, consumptionId, consumption.artifact);

  const actor = sanitizeActor(input.actor);
  const publicReportPaths = writeGeneratedReports(projectRoot, packageId, consumption.body, consumption.artifact);
  const archive = assembleSourceReviewPublicArchive(projectRoot, {
    project_id: projectId,
    actor,
    archive_id: `GOAL3-SOURCE-BOUND-PUBLIC-ARCHIVE-${packageId}`,
    reports: [
      { format: "markdown", path: publicReportPaths.markdown },
      { format: "html", path: publicReportPaths.html },
      { format: "json", path: publicReportPaths.json }
    ]
  });
  const archiveManifestSha256 = sha256Text(
    readFileSync(assertPathAllowed(projectRoot, archive.manifest_path, { purpose: "read" }), "utf8")
  );
  const publicArchiveReviewId = `GOAL3-SOURCE-BOUND-PUBLIC-ARCHIVE-REVIEW-${packageId}`;
  const body: Goal3SourceBoundReleasePackageBody = {
    schema_version: "comath.goal3_source_bound_release_package.v1",
    release_package_id: packageId,
    project_id: projectId,
    actor,
    created_at: new Date().toISOString(),
    ok: true,
    release_package_status: "source_bound_public_diagnostic_package_ready",
    release_package_path: packageManifestPath,
    ga_certificate_consumption_review_id: consumptionId,
    ga_certificate_consumption_review_path: consumption.artifact.path,
    ga_certificate_consumption_review_artifact: consumption.artifact,
    ga_certificate_consumption_review_current: true,
    source_bound_release_chain_current: true,
    source_review_public_archive_id: archive.archive_id,
    source_review_public_archive_manifest_path: archive.manifest_path,
    source_review_public_archive_manifest_sha256: archiveManifestSha256,
    public_archive_review_id: publicArchiveReviewId,
    public_archive_review_path: publicArchiveReviewPath(publicArchiveReviewId),
    public_archive_review_ok: true,
    public_report_paths: publicReportPaths,
    proof_authority: "none",
    can_promote_claim: false,
    can_certify_ga: false,
    package_is_proof_authority: false,
    claim_promotion_requires_ordinary_gate: true
  };
  const publicPayload = {
    schema_version: "comath.goal3_source_bound_release_package_route_payload.v1",
    release_package_id: packageId,
    ga_certificate_consumption_review_artifact_sha256: consumption.artifact.sha256,
    source_review_public_archive_manifest_path: archive.manifest_path,
    public_archive_review_path: body.public_archive_review_path,
    proof_authority: "none",
    can_promote_claim: false,
    can_certify_ga: false,
    package_is_proof_authority: false
  };
  const archiveReview = reviewGoal3PublicArchiveSurfaces(projectRoot, {
    project_id: projectId,
    actor,
    review_id: publicArchiveReviewId,
    surfaces: [
      {
        surface_id: `source-review-public-archive:${archive.archive_id}`,
        surface_kind: "source_review_public_archive",
        manifest_path: archive.manifest_path
      },
      {
        surface_id: `source-bound-package-route:${packageId}`,
        surface_kind: "public_route_payload",
        payload: publicPayload
      },
      {
        surface_id: `source-bound-package-manifest:${packageId}`,
        surface_kind: "public_review_manifest",
        payload: body
      }
    ]
  });
  if (!archiveReview.ok) {
    throw new ComathError("Goal 3 source-bound release package public archive review failed", {
      statusCode: 400,
      code: "GOAL3_SOURCE_BOUND_RELEASE_PACKAGE_INVALID"
    });
  }

  const packageText = canonicalJson(body);
  const archiveReviewText = readFileSync(assertPathAllowed(projectRoot, archiveReview.manifest_path, { purpose: "read" }), "utf8");
  mkdirSync(dirname(absolutePackageManifestPath), { recursive: true });
  writeFileSync(absolutePackageManifestPath, packageText, "utf8");
  const result: Goal3SourceBoundReleasePackage = {
    ...body,
    release_package_artifact: {
      kind: "goal3_source_bound_release_package",
      path: packageManifestPath,
      sha256: sha256Text(packageText),
      size_bytes: Buffer.byteLength(packageText, "utf8")
    }
  };

  appendAuditEvent(projectRoot, {
    project_id: projectId,
    event_type: "release.goal3_source_bound_release_package_recorded",
    actor,
    target_id: projectId,
    payload: {
      release_package_id: packageId,
      release_package_path: packageManifestPath,
      release_package_artifact_sha256: result.release_package_artifact.sha256,
      ga_certificate_consumption_review_id: consumptionId,
      ga_certificate_consumption_review_artifact_sha256: consumption.artifact.sha256,
      source_bound_release_chain_current: true,
      source_review_public_archive_manifest_path: archive.manifest_path,
      source_review_public_archive_manifest_sha256: result.source_review_public_archive_manifest_sha256,
      public_archive_review_id: archiveReview.review_id,
      public_archive_review_path: archiveReview.manifest_path,
      public_archive_review_sha256: sha256Text(archiveReviewText),
      public_archive_review_ok: true,
      proof_authority: "none",
      can_promote_claim: false,
      can_certify_ga: false,
      package_is_proof_authority: false
    }
  });

  return result;
}
