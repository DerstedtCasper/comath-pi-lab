import assert from "node:assert/strict";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const root = process.cwd();

function read(path) {
  return readFileSync(join(root, path), "utf8");
}

function assertFile(path) {
  assert.equal(existsSync(join(root, path)), true, `${path} must exist`);
}

function assertIncludes(path, needle) {
  assert.match(read(path), new RegExp(needle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")), `${path} must include ${needle}`);
}

assertFile(".github/workflows/ci.yml");
assertFile(".github/workflows/release-guard.yml");
assertIncludes(".github/workflows/ci.yml", "corepack pnpm install --frozen-lockfile");
assertIncludes(".github/workflows/ci.yml", "corepack pnpm build");
assertIncludes(".github/workflows/ci.yml", "corepack pnpm typecheck");
assertIncludes(".github/workflows/ci.yml", "corepack pnpm test");
assertIncludes(".github/workflows/ci.yml", "corepack pnpm release:check");
assertIncludes(".github/workflows/release-guard.yml", "corepack pnpm external:check");
assertIncludes(".github/workflows/release-guard.yml", "tags:");
assertIncludes(".github/workflows/release-guard.yml", "release:");

const packageJson = JSON.parse(read("package.json"));
assert.equal(packageJson.scripts.ci, "corepack pnpm build && corepack pnpm typecheck && corepack pnpm test");
assert.equal(packageJson.scripts["release:check"], "node scripts/ga-readiness.mjs");
assert.equal(packageJson.scripts["external:check"], "node scripts/external-runtime-validation.mjs");

assertFile("scripts/ga-readiness.mjs");
assertFile("scripts/external-runtime-validation.mjs");
assertFile("docs/release/GA_RELEASE_CHECKLIST.md");
assertFile("docs/release/EXTERNAL_RUNTIME_VALIDATION.md");
assertFile("docs/release/CI.md");

for (const doc of [
  "docs/release/GA_RELEASE_CHECKLIST.md",
  "docs/release/EXTERNAL_RUNTIME_VALIDATION.md",
  "docs/release/CI.md"
]) {
  assertIncludes(doc, "Pi installed runtime validation");
  assertIncludes(doc, "MathProve workspace runner validation");
  assertIncludes(doc, "TriviumDB native validation");
  assertIncludes(doc, "runner re-execution replay validation");
  assertIncludes(doc, "package metadata and artifacts");
  assertIncludes(doc, "DLP and secret scanning");
  assertIncludes(doc, "locking stress");
}

assertIncludes("README.md", "Production Formal Workbench Core");
assertIncludes("README.md", "not GA");
assertIncludes("tests/README.md", "Release readiness");

const externalFixtureRoot = mkdtempSync(join(tmpdir(), "comath-external-validation-"));
try {
  const weakEvidencePath = join(externalFixtureRoot, "weak-evidence.json");
  writeFileSync(
    weakEvidencePath,
    JSON.stringify(
      {
        generated_by: "phase-release-test",
        checks: {
          pi_installed_runtime: {
            status: "passed",
            evidence_uri: "placeholder",
            completed_at: "2026-05-26T00:00:00.000Z",
            target_version: "placeholder",
            registration_result: "placeholder",
            tool_invocation_result: "placeholder",
            cancellation_result: "placeholder"
          },
          mathprove_workspace_runner: {
            status: "passed",
            evidence_uri: "placeholder",
            completed_at: "2026-05-26T00:00:00.000Z",
            workspace_root: "placeholder",
            manifest_path: "placeholder",
            final_audit_path: "placeholder",
            promotion_gate_result: "placeholder"
          },
          triviumdb_native: {
            status: "passed",
            evidence_uri: "placeholder",
            completed_at: "2026-05-26T00:00:00.000Z",
            platform: "placeholder",
            node_version: "placeholder",
            persistence_result: "placeholder",
            snapshot_restore_result: "placeholder"
          },
          runner_reexecution_replay: {
            status: "passed",
            evidence_uri: "placeholder",
            completed_at: "2026-05-26T00:00:00.000Z",
            snapshot_id: "placeholder",
            reexecution_result: "placeholder",
            hash_verification_result: "placeholder",
            network_policy_result: "placeholder"
          },
          package_metadata_artifacts: {
            status: "passed",
            evidence_uri: "placeholder",
            completed_at: "2026-05-26T00:00:00.000Z",
            package_versions: "placeholder",
            license_result: "placeholder",
            pack_dry_run_result: "placeholder",
            changelog_result: "placeholder",
            provenance_result: "placeholder"
          },
          dlp_secret_scanning: {
            status: "passed",
            evidence_uri: "placeholder",
            completed_at: "2026-05-26T00:00:00.000Z",
            threat_model_uri: "placeholder",
            scan_scope: "placeholder",
            report_path: "placeholder",
            binary_archive_pdf_result: "placeholder"
          },
          locking_stress: {
            status: "passed",
            evidence_uri: "placeholder",
            completed_at: "2026-05-26T00:00:00.000Z",
            platform: "placeholder",
            process_count: "placeholder",
            crash_recovery_result: "placeholder",
            stale_recovery_result: "placeholder",
            lost_update_result: "placeholder"
          }
        }
      },
      null,
      2
    ),
    "utf8"
  );
  const weakResult = spawnSync(process.execPath, ["scripts/external-runtime-validation.mjs"], {
    cwd: root,
    env: { ...process.env, COMATH_EXTERNAL_EVIDENCE: weakEvidencePath },
    encoding: "utf8"
  });
  assert.notEqual(weakResult.status, 0, "placeholder-only external evidence must fail closed");
  assert.match(`${weakResult.stderr}\n${weakResult.stdout}`, /schema_version|reviewed_by|evidence artifact/i);
} finally {
  rmSync(externalFixtureRoot, { recursive: true, force: true });
}

console.log("GA readiness repository contract tests passed.");
