import assert from "node:assert/strict";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const testDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(testDir, "..", "..", "..", "..");
const defaultMathProveRoot = resolve(repoRoot, "..", "MathProve-Skill");
const projectRoot = mkdtempSync(join(tmpdir(), "comath-mathprove-final-audit-"));

const comath = await import("../../dist/index.js");
const {
  initProject,
  registerClaim,
  runMathProveFinalAuditExternal,
  promoteClaimWithMathProveBridge,
  getClaim,
  isMathProveFinalAuditPassed
} = comath;

assert.equal(typeof runMathProveFinalAuditExternal, "function", "Phase 58 must export final-audit runner");

try {
  const { project } = initProject({ name: "MathProve Final Audit", root_path: projectRoot });
  const claim = registerClaim(projectRoot, {
    project_id: project.project_id,
    statement: "The square expansion identity is audited by MathProve as non-authoritative evidence.",
    assumptions: ["x is a symbolic variable"],
    domain: "algebra",
    actor: "phase58-test"
  });
  const request = {
    project_id: project.project_id,
    claim_id: claim.id,
    mode: "final_audit",
    target_status: "formally_checked",
    actor: "phase58-test"
  };

  const audit = await runMathProveFinalAuditExternal(projectRoot, request, {
    mathprove_root: defaultMathProveRoot,
    expected_statement_hash: claim.statement_hash
  });
  assert.equal(audit.result.bridge_version, "phase58-final-audit-v1");
  assert.equal(audit.result.ok, true);
  assert.equal(audit.result.gate_result, "failed");
  assert.equal(audit.result.vetoes.includes("mathprove_final_audit_not_formal_authority"), true);
  assert.equal(audit.result.vetoes.includes("missing_kernel_checked_artifact"), true);
  assert.equal(audit.result.metadata.runner_id, "mathprove-skill.final_audit");
  assert.equal(audit.result.metadata.network, false);
  assert.equal(audit.result.metadata.invoked, true);
  assert.equal(audit.result.metadata.steps_sha256.length, 64);
  assert.equal(audit.result.metadata.solution_sha256.length, 64);
  assert.equal(audit.result.mathprove.status, "passed");
  assert.equal(audit.result.mathprove.report[0].status, "passed");
  assert.equal(existsSync(audit.report_path), true);
  const archived = JSON.parse(readFileSync(audit.report_path, "utf8"));
  assert.equal(archived.backend, "external-final-audit");
  assert.doesNotMatch(JSON.stringify(archived), /[A-Za-z]:\\/);

  const promotion = await promoteClaimWithMathProveBridge(projectRoot, {
    ...request,
    evidence_ids: [],
    artifact_ids: []
  }, {
    backend: "external-final-audit",
    mathprove_root: defaultMathProveRoot,
    expected_statement_hash: claim.statement_hash
  });
  assert.equal(promotion.bridge.result.ok, true);
  assert.equal(promotion.gate.ok, false);
  assert.equal(promotion.gate.vetoes.includes("mathprove_final_audit_not_formal_authority"), true);
  assert.equal(getClaim(projectRoot, project.project_id, claim.id)?.status, "draft");

  assert.equal(
    isMathProveFinalAuditPassed({ status: "passed", report: [] }, 0),
    false,
    "empty final-audit reports must not count as passed evidence"
  );
} finally {
  rmSync(projectRoot, { recursive: true, force: true });
}

console.log("Phase 58 MathProve final-audit runner tests passed.");
