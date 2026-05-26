import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { dirname, isAbsolute, join, resolve } from "node:path";

const evidencePath = process.env.COMATH_EXTERNAL_EVIDENCE ?? join("docs", "release", "external-runtime-evidence.json");

const requiredChecks = [
  {
    id: "pi_installed_runtime",
    label: "Pi installed runtime validation",
    requiredFields: ["target_version", "registration_result", "tool_invocation_result", "cancellation_result"]
  },
  {
    id: "mathprove_workspace_runner",
    label: "MathProve workspace runner validation",
    requiredFields: ["workspace_root", "manifest_path", "final_audit_path", "promotion_gate_result"]
  },
  {
    id: "triviumdb_native",
    label: "TriviumDB native validation",
    requiredFields: ["platform", "node_version", "persistence_result", "snapshot_restore_result"]
  },
  {
    id: "runner_reexecution_replay",
    label: "runner re-execution replay validation",
    requiredFields: ["snapshot_id", "reexecution_result", "hash_verification_result", "network_policy_result"]
  },
  {
    id: "package_metadata_artifacts",
    label: "package metadata and artifacts",
    requiredFields: ["package_versions", "license_result", "pack_dry_run_result", "changelog_result", "provenance_result"]
  },
  {
    id: "dlp_secret_scanning",
    label: "DLP and secret scanning",
    requiredFields: ["threat_model_uri", "scan_scope", "report_path", "binary_archive_pdf_result"]
  },
  {
    id: "locking_stress",
    label: "locking stress",
    requiredFields: ["platform", "process_count", "crash_recovery_result", "stale_recovery_result", "lost_update_result"]
  }
];

function template() {
  return {
    schema_version: 1,
    generated_by: "scripts/external-runtime-validation.mjs",
    reviewed_by: "",
    reviewed_at: "",
    checks: Object.fromEntries(
      requiredChecks.map((check) => [
        check.id,
        {
          label: check.label,
          status: "missing",
          evidence_uri: "",
          evidence_artifacts: [
            {
              path: "",
              sha256: ""
            }
          ],
          completed_at: "",
          notes: "",
          ...Object.fromEntries(check.requiredFields.map((field) => [field, ""]))
        }
      ])
    )
  };
}

if (process.argv.includes("--template")) {
  process.stdout.write(`${JSON.stringify(template(), null, 2)}\n`);
  process.exit(0);
}

if (!existsSync(evidencePath)) {
  console.error(`Missing external runtime evidence file: ${evidencePath}`);
  console.error("Create it from: corepack pnpm external:check -- --template");
  process.exit(1);
}

const evidence = JSON.parse(readFileSync(evidencePath, "utf8"));
const failures = [];
const evidenceBaseDir = dirname(resolve(evidencePath));

function isBlankOrPlaceholder(value) {
  if (typeof value !== "string") {
    return true;
  }
  const normalized = value.trim().toLowerCase();
  return (
    normalized.length === 0 ||
    normalized === "placeholder" ||
    normalized === "todo" ||
    normalized === "tbd" ||
    normalized === "n/a" ||
    normalized === "missing"
  );
}

function isIsoTimestamp(value) {
  return typeof value === "string" && !Number.isNaN(Date.parse(value));
}

function sha256File(path) {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}

function validateEvidenceArtifacts(label, record) {
  if (!Array.isArray(record.evidence_artifacts) || record.evidence_artifacts.length === 0) {
    failures.push(`${label}: evidence artifact list is required`);
    return;
  }

  for (const [index, artifact] of record.evidence_artifacts.entries()) {
    if (!artifact || typeof artifact !== "object") {
      failures.push(`${label}: evidence artifact ${index} must be an object`);
      continue;
    }
    if (isBlankOrPlaceholder(artifact.path)) {
      failures.push(`${label}: evidence artifact ${index} path is required`);
      continue;
    }
    if (typeof artifact.sha256 !== "string" || !/^[a-f0-9]{64}$/.test(artifact.sha256)) {
      failures.push(`${label}: evidence artifact ${index} sha256 is required`);
      continue;
    }
    const artifactPath = isAbsolute(artifact.path) ? artifact.path : resolve(evidenceBaseDir, artifact.path);
    if (!existsSync(artifactPath)) {
      failures.push(`${label}: evidence artifact ${index} file does not exist`);
      continue;
    }
    const actual = sha256File(artifactPath);
    if (actual !== artifact.sha256) {
      failures.push(`${label}: evidence artifact ${index} sha256 mismatch`);
    }
  }
}

if (evidence.schema_version !== 1) {
  failures.push("schema_version must be 1");
}
if (isBlankOrPlaceholder(evidence.reviewed_by)) {
  failures.push("reviewed_by is required");
}
if (!isIsoTimestamp(evidence.reviewed_at)) {
  failures.push("reviewed_at must be an ISO timestamp");
}

for (const check of requiredChecks) {
  const record = evidence.checks?.[check.id];
  if (!record) {
    failures.push(`${check.label}: missing record`);
    continue;
  }
  if (record.status !== "passed") {
    failures.push(`${check.label}: status must be passed`);
  }
  if (isBlankOrPlaceholder(record.evidence_uri)) {
    failures.push(`${check.label}: evidence_uri is required`);
  }
  if (!isIsoTimestamp(record.completed_at)) {
    failures.push(`${check.label}: completed_at must be an ISO timestamp`);
  }
  validateEvidenceArtifacts(check.label, record);
  for (const field of check.requiredFields) {
    if (isBlankOrPlaceholder(record[field])) {
      failures.push(`${check.label}: ${field} is required`);
    }
  }
}

if (failures.length > 0) {
  console.error("External runtime validation is incomplete:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log("External runtime validation evidence passed.");
