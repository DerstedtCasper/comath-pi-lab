import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { basename, dirname, extname, join, relative, resolve } from "node:path";
import { appendAuditEvent } from "../audit/jsonl-writer.js";
import { ComathError } from "../errors.js";
import { sanitizePublicFormalAuthorityText, sanitizePublicFormalAuthorityVocabulary } from "../proof-kernel/campaign/external-terminal-vocabulary.js";
import { assertPathAllowed } from "../security/path-policy.js";
import { canonicalJson } from "../verification/runner-contracts.js";

export type SourceReviewGeneratedReportFormat = "markdown" | "html" | "json";

export type SourceReviewGeneratedReportInput = {
  format: SourceReviewGeneratedReportFormat;
  path: string;
};

export type AssembleSourceReviewPublicArchiveInput = {
  project_id: string;
  actor: string;
  archive_id?: string;
  reports: SourceReviewGeneratedReportInput[];
};

export type SourceReviewPublicArchiveReport = {
  format: SourceReviewGeneratedReportFormat;
  source_relative_path: string;
  public_relative_path: string;
  sha256: string;
  size_bytes: number;
};

export type SourceReviewPublicArchiveContract = {
  kind: "source_review_public_diagnostic";
  proof_authority: "none";
  can_promote_claim: false;
  can_restore: false;
  restore_source: false;
  public_archive_is_proof_authority: false;
  exposes_host_paths: false;
  requires_sanitized_generated_reports: true;
  generated_report_formats: ["markdown", "html", "json"];
};

export type SourceReviewPublicArchiveResult = SourceReviewPublicArchiveContract & {
  schema_version: "comath.source_review_public_archive.v1";
  archive_kind: "source_review_public_diagnostic";
  project_id: string;
  archive_id: string;
  archive_root: string;
  manifest_path: string;
  public_archive_contract: SourceReviewPublicArchiveContract;
  reports: SourceReviewPublicArchiveReport[];
  warnings: string[];
};

const generatedReportFormats = ["markdown", "html", "json"] as const;

const allowedExtensions: Record<SourceReviewGeneratedReportFormat, string[]> = {
  markdown: [".md", ".markdown"],
  html: [".html", ".htm"],
  json: [".json"]
};

function sha256Text(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

function normalizeRelativePath(path: string): string {
  return path.replace(/\\/g, "/");
}

function publicArchiveContract(): SourceReviewPublicArchiveContract {
  return {
    kind: "source_review_public_diagnostic",
    proof_authority: "none",
    can_promote_claim: false,
    can_restore: false,
    restore_source: false,
    public_archive_is_proof_authority: false,
    exposes_host_paths: false,
    requires_sanitized_generated_reports: true,
    generated_report_formats: [...generatedReportFormats] as ["markdown", "html", "json"]
  };
}

function assertArchiveId(value: string | undefined): string {
  const archiveId = value ?? `SRP-${new Date().toISOString().replace(/[-:.TZ]/g, "").slice(0, 14)}`;
  if (!/^[A-Za-z0-9._-]+$/.test(archiveId)) {
    throw new ComathError("invalid source-review public archive id", {
      code: "SOURCE_REVIEW_PUBLIC_ARCHIVE_INVALID_ID"
    });
  }
  return archiveId;
}

function publicProjectRelativePath(projectRoot: string, path: string): string {
  const root = resolve(projectRoot);
  const absolutePath = assertPathAllowed(root, path, { purpose: "read", resolveRealpath: true });
  const relativePath = normalizeRelativePath(relative(root, absolutePath));
  if (
    !relativePath ||
    relativePath === "." ||
    relativePath === ".." ||
    relativePath.startsWith("../") ||
    /^[A-Za-z]:\//.test(relativePath) ||
    relativePath.startsWith("/")
  ) {
    throw new ComathError("source-review public archive path escapes project root", {
      code: "SOURCE_REVIEW_PUBLIC_ARCHIVE_PATH_TRAVERSAL"
    });
  }
  return relativePath;
}

function assertGeneratedReportPath(relativePath: string, format: SourceReviewGeneratedReportFormat): void {
  if (
    !relativePath.startsWith(".comath/release/source-review/") &&
    !relativePath.startsWith(".comath/artifacts/papers/")
  ) {
    throw new ComathError("source-review public archives can only package generated public report material", {
      code: "SOURCE_REVIEW_PUBLIC_ARCHIVE_SOURCE_OUT_OF_SCOPE"
    });
  }

  const extension = extname(relativePath).toLowerCase();
  if (!allowedExtensions[format].includes(extension)) {
    throw new ComathError("source-review public archive report format does not match file extension", {
      code: "SOURCE_REVIEW_PUBLIC_ARCHIVE_FORMAT_MISMATCH"
    });
  }
}

function assertKnownReportFormat(format: unknown): asserts format is SourceReviewGeneratedReportFormat {
  if (!generatedReportFormats.includes(format as SourceReviewGeneratedReportFormat)) {
    throw new ComathError("source-review public archive report format is not supported", {
      code: "SOURCE_REVIEW_PUBLIC_ARCHIVE_INVALID_FORMAT"
    });
  }
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function hostPathVariants(projectRoot: string): string[] {
  const resolved = resolve(projectRoot);
  return Array.from(new Set([resolved, resolved.replace(/\\/g, "/"), resolved.replace(/\\/g, "\\\\")])).filter(Boolean);
}

function sanitizePublicHostPathText(projectRoot: string, value: string): string {
  let sanitized = value;
  for (const variant of hostPathVariants(projectRoot)) {
    sanitized = sanitized.replace(new RegExp(escapeRegex(variant), "g"), "[redacted_host_path]");
  }
  sanitized = sanitized.replace(/[A-Za-z]:[\\/][^\r\n<>"']*/g, "[redacted_host_path]");
  sanitized = sanitized.replace(/\\\\\?\\[^\r\n<>"']*/g, "[redacted_host_path]");
  sanitized = sanitized.replace(/\\\\[^\\\r\n<>"']+[\\/][^\r\n<>"']*/g, "[redacted_host_path]");
  return sanitized.replace(/\[redacted_host_path\](?:[\\/][^\s<>"']+)*/g, "[redacted_host_path]");
}

function sanitizePublicHostPathEchoes(projectRoot: string, value: unknown): unknown {
  if (typeof value === "string") {
    return sanitizePublicHostPathText(projectRoot, value);
  }
  if (Array.isArray(value)) {
    return value.map((entry) => sanitizePublicHostPathEchoes(projectRoot, entry));
  }
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, entry]) => [
        sanitizePublicHostPathText(projectRoot, key),
        sanitizePublicHostPathEchoes(projectRoot, entry)
      ])
    );
  }
  return value;
}

function sanitizeReportContent(projectRoot: string, format: SourceReviewGeneratedReportFormat, text: string): string {
  if (format === "json") {
    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch {
      throw new ComathError("source-review public archive JSON report must be valid JSON", {
        code: "SOURCE_REVIEW_PUBLIC_ARCHIVE_INVALID_JSON"
      });
    }
    return canonicalJson(sanitizePublicFormalAuthorityVocabulary(sanitizePublicHostPathEchoes(projectRoot, parsed)));
  }
  return sanitizePublicFormalAuthorityText(sanitizePublicHostPathText(projectRoot, text));
}

function assertRequiredFormats(reports: SourceReviewGeneratedReportInput[]): void {
  for (const report of reports) {
    assertKnownReportFormat(report.format);
  }
  const formats = new Set(reports.map((report) => report.format));
  const missing = generatedReportFormats.filter((format) => !formats.has(format));
  if (missing.length) {
    throw new ComathError("source-review public archive requires markdown, html, and json generated reports", {
      code: "SOURCE_REVIEW_PUBLIC_ARCHIVE_MISSING_FORMAT",
    });
  }
}

function reportPublicPath(archiveRoot: string, index: number, sourceRelativePath: string, format: SourceReviewGeneratedReportFormat): string {
  const extension = format === "markdown" ? ".md" : format === "html" ? ".html" : ".json";
  const safeBase = basename(sourceRelativePath, extname(sourceRelativePath)).replace(/[^A-Za-z0-9._-]+/g, "_") || "report";
  return normalizeRelativePath(join(archiveRoot, "reports", `${String(index + 1).padStart(2, "0")}-${safeBase}${extension}`));
}

export function assembleSourceReviewPublicArchive(
  projectRoot: string,
  input: AssembleSourceReviewPublicArchiveInput
): SourceReviewPublicArchiveResult {
  assertRequiredFormats(input.reports);
  const archiveId = assertArchiveId(input.archive_id);
  const archiveRoot = normalizeRelativePath(join(".comath", "release", "source-review", "public-archive", archiveId));
  const archiveRootPath = assertPathAllowed(projectRoot, archiveRoot, { purpose: "runtime-write" });
  mkdirSync(join(archiveRootPath, "reports"), { recursive: true });

  const reports = input.reports.map((report, index): SourceReviewPublicArchiveReport => {
    const sourceRelativePath = publicProjectRelativePath(projectRoot, report.path);
    assertGeneratedReportPath(sourceRelativePath, report.format);
    const sourcePath = assertPathAllowed(projectRoot, sourceRelativePath, { purpose: "read", resolveRealpath: true });
    if (!existsSync(sourcePath) || !statSync(sourcePath).isFile()) {
      throw new ComathError("source-review public archive report source is not a file", {
        code: "SOURCE_REVIEW_PUBLIC_ARCHIVE_SOURCE_MISSING"
      });
    }
    const sanitized = sanitizeReportContent(projectRoot, report.format, readFileSync(sourcePath, "utf8"));
    const publicRelativePath = reportPublicPath(archiveRoot, index, sourceRelativePath, report.format);
    const publicPath = assertPathAllowed(projectRoot, publicRelativePath, { purpose: "runtime-write" });
    mkdirSync(dirname(publicPath), { recursive: true });
    writeFileSync(publicPath, sanitized, "utf8");
    return {
      format: report.format,
      source_relative_path: sourceRelativePath,
      public_relative_path: publicRelativePath,
      sha256: sha256Text(sanitized),
      size_bytes: Buffer.byteLength(sanitized, "utf8")
    };
  });

  const contract = publicArchiveContract();
  const result: SourceReviewPublicArchiveResult = {
    schema_version: "comath.source_review_public_archive.v1",
    archive_kind: "source_review_public_diagnostic",
    project_id: input.project_id,
    archive_id: archiveId,
    archive_root: archiveRoot,
    manifest_path: normalizeRelativePath(join(archiveRoot, "manifest.json")),
    ...contract,
    public_archive_contract: contract,
    reports,
    warnings: []
  };
  const manifestPath = assertPathAllowed(projectRoot, result.manifest_path, { purpose: "runtime-write" });
  writeFileSync(manifestPath, canonicalJson(result), "utf8");
  appendAuditEvent(projectRoot, {
    project_id: input.project_id,
    event_type: "source_review.public_archive_assembled",
    actor: input.actor,
    target_id: input.project_id,
    payload: {
      archive_id: archiveId,
      manifest_path: result.manifest_path,
      report_count: reports.length,
      generated_report_formats: result.generated_report_formats,
      proof_authority: "none",
      can_restore: false,
      exposes_host_paths: false
    }
  });
  return result;
}
