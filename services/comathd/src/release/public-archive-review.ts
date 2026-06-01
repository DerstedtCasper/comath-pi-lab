import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { appendAuditEvent } from "../audit/jsonl-writer.js";
import { ComathError } from "../errors.js";
import { assertPathAllowed } from "../security/path-policy.js";
import { canonicalJson, sha256Text } from "../verification/runner-contracts.js";

export type PublicArchiveReviewSurfaceKind =
  | "source_review_public_archive"
  | "public_route_payload"
  | "public_review_manifest";

export type PublicArchiveReviewSurfaceInput = {
  surface_id: string;
  surface_kind: PublicArchiveReviewSurfaceKind;
  manifest_path?: string;
  payload?: unknown;
};

export type ReviewGoal3PublicArchiveSurfacesInput = {
  project_id: string;
  actor: string;
  review_id?: string;
  surfaces: PublicArchiveReviewSurfaceInput[];
};

export type PublicArchiveReviewFinding = {
  surface_id: string;
  surface_kind: PublicArchiveReviewSurfaceKind;
  code: string;
  location: string;
};

export type PublicArchiveReviewSurfaceSummary = {
  surface_id: string;
  surface_kind: PublicArchiveReviewSurfaceKind;
  material_path?: string;
  sha256?: string;
  findings: PublicArchiveReviewFinding[];
};

export type Goal3PublicArchiveReviewResult = {
  schema_version: "comath.goal3_public_archive_review.v1";
  review_id: string;
  project_id: string;
  ok: boolean;
  proof_authority: "none";
  can_promote_claim: false;
  review_is_proof_authority: false;
  surfaces: PublicArchiveReviewSurfaceSummary[];
  vetoes: string[];
  warnings: string[];
  manifest_path: string;
};

const privilegedPublicTerms =
  /\b(?:clean_replay_passed|completed_formal_proof|formally_checked|formal_proof_verified|formal_replay_passed|lean_kernel_clean_replay|proven|verified_final_authority_evidence)\b/i;

const knownSurfaceKinds = new Set<PublicArchiveReviewSurfaceKind>([
  "source_review_public_archive",
  "public_route_payload",
  "public_review_manifest"
]);

function normalizeRelativePath(path: string): string {
  return path.replace(/\\/g, "/");
}

function assertReviewId(value: string | undefined): string {
  const reviewId = value ?? `PAR-${new Date().toISOString().replace(/[-:.TZ]/g, "").slice(0, 14)}`;
  if (!/^[A-Za-z0-9._-]+$/.test(reviewId)) {
    throw new ComathError("invalid public archive review id", {
      code: "PUBLIC_ARCHIVE_REVIEW_INVALID_ID"
    });
  }
  return reviewId;
}

function assertSurfaceId(value: string): void {
  if (!/^[A-Za-z0-9._:-]+$/.test(value)) {
    throw new ComathError("invalid public archive review surface id", {
      code: "PUBLIC_ARCHIVE_REVIEW_INVALID_SURFACE_ID"
    });
  }
}

function assertSurfaceKind(value: unknown): asserts value is PublicArchiveReviewSurfaceKind {
  if (!knownSurfaceKinds.has(value as PublicArchiveReviewSurfaceKind)) {
    throw new ComathError("unsupported public archive review surface kind", {
      code: "PUBLIC_ARCHIVE_REVIEW_INVALID_SURFACE_KIND"
    });
  }
}

function projectRelativePath(projectRoot: string, path: string): { absolute: string; relative: string } {
  const root = resolve(projectRoot);
  const absolute = assertPathAllowed(root, path, { purpose: "read", resolveRealpath: true });
  const relativePath = normalizeRelativePath(relative(root, absolute));
  if (
    !relativePath ||
    relativePath === "." ||
    relativePath === ".." ||
    relativePath.startsWith("../") ||
    relativePath.startsWith("/") ||
    /^[A-Za-z]:\//.test(relativePath)
  ) {
    throw new ComathError("public archive review material path escapes project root", {
      code: "PUBLIC_ARCHIVE_REVIEW_PATH_TRAVERSAL"
    });
  }
  return { absolute, relative: relativePath };
}

function isSafeProjectRelativeMaterialPath(path: string): boolean {
  const normalized = normalizeRelativePath(path);
  return (
    !!normalized &&
    normalized !== "." &&
    normalized !== ".." &&
    !normalized.startsWith("../") &&
    !normalized.includes("/../") &&
    !normalized.endsWith("/..") &&
    !normalized.startsWith("/") &&
    !normalized.startsWith("//") &&
    !/^[A-Za-z]:\//.test(normalized) &&
    !path.includes("\\\\")
  );
}

function hostPathVariants(projectRoot: string): string[] {
  const resolved = resolve(projectRoot);
  return Array.from(new Set([resolved, resolved.replace(/\\/g, "/"), resolved.replace(/\\/g, "\\\\")])).filter(Boolean);
}

function valueHasHostPath(projectRoot: string, value: string): boolean {
  if (/[A-Za-z]:[\\/]/.test(value) || value.includes("\\\\?\\") || value.startsWith("\\\\")) {
    return true;
  }
  return hostPathVariants(projectRoot).some((variant) => value.includes(variant));
}

function addFinding(
  findings: PublicArchiveReviewFinding[],
  surface: PublicArchiveReviewSurfaceInput,
  code: string,
  location: string
): void {
  findings.push({
    surface_id: surface.surface_id,
    surface_kind: surface.surface_kind,
    code,
    location
  });
}

function inspectValue(
  projectRoot: string,
  surface: PublicArchiveReviewSurfaceInput,
  value: unknown,
  location: string,
  findings: PublicArchiveReviewFinding[]
): void {
  if (typeof value === "string") {
    if (privilegedPublicTerms.test(value)) {
      addFinding(findings, surface, "public_archive_authority_vocabulary", location);
    }
    if (valueHasHostPath(projectRoot, value)) {
      addFinding(findings, surface, "public_archive_host_path_echo", location);
    }
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((entry, index) => inspectValue(projectRoot, surface, entry, `${location}[${index}]`, findings));
    return;
  }
  if (!value || typeof value !== "object") {
    return;
  }

  for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
    const childLocation = `${location}.${key}`;
    if (privilegedPublicTerms.test(key)) {
      addFinding(findings, surface, "public_archive_authority_vocabulary", childLocation);
    }
    if (valueHasHostPath(projectRoot, key)) {
      addFinding(findings, surface, "public_archive_host_path_echo", childLocation);
    }
    if ((key === "can_restore" || key === "restore_source") && entry === true) {
      addFinding(findings, surface, "public_archive_restorable_semantics", childLocation);
    }
    if (key === "exposes_host_paths" && entry === true) {
      addFinding(findings, surface, "public_archive_exposes_host_paths", childLocation);
    }
    if (
      (key === "proof_authority" && entry !== "none") ||
      (key.endsWith("_is_proof_authority") && entry === true) ||
      (key === "archive_is_proof_authority" && entry === true) ||
      (key === "review_is_proof_authority" && entry === true)
    ) {
      addFinding(findings, surface, "public_archive_claims_proof_authority", childLocation);
    }
    if (key === "can_promote_claim" && entry === true) {
      addFinding(findings, surface, "public_archive_promotional_semantics", childLocation);
    }
    inspectValue(projectRoot, surface, entry, childLocation, findings);
  }
}

function materialPayload(projectRoot: string, surface: PublicArchiveReviewSurfaceInput): {
  payload: unknown;
  materialPath?: string;
  materialSha256?: string;
} {
  if (surface.manifest_path) {
    const material = projectRelativePath(projectRoot, surface.manifest_path);
    if (!existsSync(material.absolute)) {
      throw new ComathError("public archive review material is missing", {
        code: "PUBLIC_ARCHIVE_REVIEW_MATERIAL_MISSING"
      });
    }
    const text = readFileSync(material.absolute, "utf8");
    let payload: unknown = text;
    if (material.relative.endsWith(".json")) {
      try {
        payload = JSON.parse(text);
      } catch {
        throw new ComathError("public archive review JSON material is invalid", {
          code: "PUBLIC_ARCHIVE_REVIEW_INVALID_JSON"
        });
      }
    }
    return { payload, materialPath: material.relative, materialSha256: sha256Text(text) };
  }
  if (surface.payload === undefined) {
    throw new ComathError("public archive review surface must provide a manifest path or payload", {
      code: "PUBLIC_ARCHIVE_REVIEW_EMPTY_SURFACE"
    });
  }
  return { payload: surface.payload };
}

function payloadReports(payload: unknown): Record<string, unknown>[] {
  if (!payload || typeof payload !== "object") {
    return [];
  }
  const reports = (payload as { reports?: unknown }).reports;
  if (!Array.isArray(reports)) {
    return [];
  }
  return reports.filter((report): report is Record<string, unknown> => !!report && typeof report === "object");
}

function policyStatus(policy: unknown, key: "os_immutable_storage" | "external_notarization"): string | undefined {
  if (!policy || typeof policy !== "object") {
    return undefined;
  }
  const entry = (policy as Record<string, unknown>)[key];
  if (!entry || typeof entry !== "object") {
    return undefined;
  }
  const status = (entry as { status?: unknown }).status;
  return typeof status === "string" ? status : undefined;
}

function inspectSourceReviewNotarizationPolicy(
  projectRoot: string,
  surface: PublicArchiveReviewSurfaceInput,
  payload: unknown,
  material: ReturnType<typeof materialPayload>,
  findings: PublicArchiveReviewFinding[]
): void {
  if (surface.surface_kind !== "source_review_public_archive" || !payload || typeof payload !== "object") {
    return;
  }
  const record = payload as {
    notarization_manifest_path?: unknown;
    immutability_policy?: unknown;
  };
  if (typeof record.notarization_manifest_path !== "string") {
    addFinding(findings, surface, "source_review_public_archive_notarization_missing", "$.notarization_manifest_path");
    return;
  }
  if (!isSafeProjectRelativeMaterialPath(record.notarization_manifest_path)) {
    addFinding(findings, surface, "source_review_public_archive_notarization_path_invalid", "$.notarization_manifest_path");
    return;
  }
  if (!material.materialPath || !material.materialSha256) {
    addFinding(findings, surface, "source_review_public_archive_notarization_unbound", "$.notarization_manifest_path");
    return;
  }

  const notarizationPath = projectRelativePath(projectRoot, record.notarization_manifest_path);
  if (!existsSync(notarizationPath.absolute) || !statSync(notarizationPath.absolute).isFile()) {
    addFinding(findings, surface, "source_review_public_archive_notarization_missing", "$.notarization_manifest_path");
    return;
  }

  let notarization: unknown;
  try {
    notarization = JSON.parse(readFileSync(notarizationPath.absolute, "utf8"));
  } catch {
    addFinding(findings, surface, "source_review_public_archive_notarization_invalid", "$.notarization_manifest_path");
    return;
  }
  inspectValue(projectRoot, surface, notarization, "$.notarization", findings);
  if (!notarization || typeof notarization !== "object") {
    addFinding(findings, surface, "source_review_public_archive_notarization_invalid", "$.notarization");
    return;
  }

  const notarizationRecord = notarization as Record<string, unknown>;
  if (notarizationRecord.schema_version !== "comath.source_review_public_archive_notarization.v1") {
    addFinding(findings, surface, "source_review_public_archive_notarization_invalid", "$.notarization.schema_version");
  }
  if (notarizationRecord.source_review_manifest_path !== material.materialPath) {
    addFinding(findings, surface, "source_review_public_archive_notarization_manifest_path_mismatch", "$.notarization.source_review_manifest_path");
  }
  if (notarizationRecord.source_review_manifest_sha256 !== material.materialSha256) {
    addFinding(findings, surface, "source_review_public_archive_notarization_hash_mismatch", "$.notarization.source_review_manifest_sha256");
  }

  const manifestPolicy = record.immutability_policy;
  const notarizationPolicy = notarizationRecord.immutability_policy;
  for (const [policy, location] of [
    [manifestPolicy, "$.immutability_policy"],
    [notarizationPolicy, "$.notarization.immutability_policy"]
  ] as const) {
    if (!policy || typeof policy !== "object") {
      addFinding(findings, surface, "source_review_public_archive_immutability_policy_missing", location);
      continue;
    }
    const policyRecord = policy as Record<string, unknown>;
    if (
      policyRecord.proof_authority !== "none" ||
      policyRecord.can_promote_claim !== false ||
      policyRecord.can_restore !== false ||
      policyRecord.tamper_evident_manifest !== true
    ) {
      addFinding(findings, surface, "source_review_public_archive_immutability_policy_invalid", location);
    }
    if (
      policyStatus(policy, "os_immutable_storage") !== "not_configured" ||
      policyStatus(policy, "external_notarization") !== "not_configured"
    ) {
      addFinding(findings, surface, "source_review_public_archive_immutability_overclaim", location);
    }
  }

  const notarizedReports = payloadReports(notarization);
  for (const report of payloadReports(payload)) {
    const publicRelativePath = report.public_relative_path;
    if (typeof publicRelativePath !== "string") {
      continue;
    }
    const match = notarizedReports.find((entry) => entry.public_relative_path === publicRelativePath);
    if (!match) {
      addFinding(findings, surface, "source_review_public_archive_notarization_report_missing", `$.reports[${publicRelativePath}]`);
      continue;
    }
    if (match.sha256 !== report.sha256 || match.size_bytes !== report.size_bytes) {
      addFinding(findings, surface, "source_review_public_archive_notarization_report_mismatch", `$.reports[${publicRelativePath}]`);
    }
  }
}

function inspectReferencedPublicReports(
  projectRoot: string,
  surface: PublicArchiveReviewSurfaceInput,
  payload: unknown,
  findings: PublicArchiveReviewFinding[]
): void {
  if (surface.surface_kind !== "source_review_public_archive" || !payload || typeof payload !== "object") {
    return;
  }
  const reports = (payload as { reports?: unknown }).reports;
  if (!Array.isArray(reports)) {
    addFinding(findings, surface, "source_review_public_archive_reports_missing", "$.reports");
    return;
  }
  for (const [index, report] of reports.entries()) {
    if (!report || typeof report !== "object") {
      addFinding(findings, surface, "source_review_public_archive_report_invalid", `$.reports[${index}]`);
      continue;
    }
    const publicPath = (report as { public_relative_path?: unknown }).public_relative_path;
    if (typeof publicPath !== "string") {
      addFinding(findings, surface, "source_review_public_archive_report_path_missing", `$.reports[${index}].public_relative_path`);
      continue;
    }
    const material = projectRelativePath(projectRoot, publicPath);
    if (!existsSync(material.absolute)) {
      throw new ComathError("public archive review referenced report is missing", {
        code: "PUBLIC_ARCHIVE_REVIEW_REFERENCED_REPORT_MISSING"
      });
    }
    if (!statSync(material.absolute).isFile()) {
      throw new ComathError("public archive review referenced report is not a file", {
        code: "PUBLIC_ARCHIVE_REVIEW_REFERENCED_REPORT_NOT_FILE"
      });
    }
    const text = readFileSync(material.absolute, "utf8");
    inspectValue(projectRoot, surface, text, `$.reports[${index}].public_content`, findings);
  }
}

function reviewSurface(projectRoot: string, surface: PublicArchiveReviewSurfaceInput): PublicArchiveReviewSurfaceSummary {
  assertSurfaceId(surface.surface_id);
  assertSurfaceKind(surface.surface_kind);
  const findings: PublicArchiveReviewFinding[] = [];
  const material = materialPayload(projectRoot, surface);
  inspectValue(projectRoot, surface, material.payload, "$", findings);
  inspectReferencedPublicReports(projectRoot, surface, material.payload, findings);
  inspectSourceReviewNotarizationPolicy(projectRoot, surface, material.payload, material, findings);
  return {
    surface_id: surface.surface_id,
    surface_kind: surface.surface_kind,
    material_path: material.materialPath,
    sha256: material.materialSha256,
    findings
  };
}

export function reviewGoal3PublicArchiveSurfaces(
  projectRoot: string,
  input: ReviewGoal3PublicArchiveSurfacesInput
): Goal3PublicArchiveReviewResult {
  const reviewId = assertReviewId(input.review_id);
  if (!input.surfaces.length) {
    throw new ComathError("public archive review requires at least one surface", {
      code: "PUBLIC_ARCHIVE_REVIEW_EMPTY"
    });
  }
  const surfaces = input.surfaces.map((surface) => reviewSurface(projectRoot, surface));
  const vetoes = Array.from(new Set(surfaces.flatMap((surface) => surface.findings.map((finding) => finding.code)))).sort();
  const reviewRoot = normalizeRelativePath(join(".comath", "release", "public-archive-review", reviewId));
  const manifestPath = normalizeRelativePath(join(reviewRoot, "review.json"));
  const result: Goal3PublicArchiveReviewResult = {
    schema_version: "comath.goal3_public_archive_review.v1",
    review_id: reviewId,
    project_id: input.project_id,
    ok: vetoes.length === 0,
    proof_authority: "none",
    can_promote_claim: false,
    review_is_proof_authority: false,
    surfaces,
    vetoes,
    warnings: [],
    manifest_path: manifestPath
  };
  const absoluteManifestPath = assertPathAllowed(projectRoot, manifestPath, { purpose: "runtime-write" });
  mkdirSync(dirname(absoluteManifestPath), { recursive: true });
  writeFileSync(absoluteManifestPath, canonicalJson(result), "utf8");
  appendAuditEvent(projectRoot, {
    project_id: input.project_id,
    event_type: "goal3.public_archive_review_completed",
    actor: input.actor,
    target_id: input.project_id,
    payload: {
      review_id: reviewId,
      ok: result.ok,
      manifest_path: result.manifest_path,
      surface_count: surfaces.length,
      vetoes,
      proof_authority: "none",
      can_promote_claim: false,
      review_is_proof_authority: false
    }
  });
  return result;
}
