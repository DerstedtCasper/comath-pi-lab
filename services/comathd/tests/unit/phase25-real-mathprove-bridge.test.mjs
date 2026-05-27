import assert from "node:assert/strict";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const testDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(testDir, "..", "..", "..", "..");
const defaultMathProveRoot = resolve(repoRoot, "..", "MathProve-Skill");
const projectRoot = mkdtempSync(join(tmpdir(), "comath-real-mathprove-"));

const comath = await import("../../dist/index.js");
const {
  getClaim,
  initProject,
  promoteClaimWithMathProveBridge,
  readAuditEvents,
  readGateResults,
  registerClaim,
  parseMathProveBridgeResult,
  scrubHostPaths,
  runMathProveBridgeExternal
} = comath;

assert.equal(typeof runMathProveBridgeExternal, "function", "Phase 25 must export a real MathProve bridge runner");

try {
  const { project } = initProject({ name: "Real MathProve Bridge Project", root_path: projectRoot });
  const claim = registerClaim(projectRoot, {
    project_id: project.project_id,
    statement: "The MathProve bridge can be invoked as a non-authoritative evidence runner.",
    assumptions: ["CoMath owns claim promotion gates"],
    domain: "proof-infrastructure",
    actor: "phase25-test"
  });

  const baseRequest = {
    project_id: project.project_id,
    claim_id: claim.id,
    mode: "final_audit",
    target_status: "formally_checked",
    actor: "phase25-test"
  };

  assert.equal(
    scrubHostPaths("Traceback from D:\\MATH _Studio\\MathProve-Skill\\scripts\\verify_sympy.py"),
    "Traceback from <host-path>"
  );

  const untrustedRunnerRoot = await runMathProveBridgeExternal(projectRoot, baseRequest, {
    mathprove_root: join(projectRoot, "missing-MathProve-Skill"),
    expected_statement_hash: claim.statement_hash
  });
  assert.equal(untrustedRunnerRoot.result.bridge_version, "phase25-external-v1");
  assert.equal(untrustedRunnerRoot.result.ok, false);
  assert.equal(untrustedRunnerRoot.result.gate_result, "failed");
  assert.equal(untrustedRunnerRoot.result.vetoes.includes("mathprove_external_runner_untrusted_root"), true);
  assert.equal(untrustedRunnerRoot.result.vetoes.includes("mathprove_external_not_formal_authority"), true);
  assert.equal(untrustedRunnerRoot.result.claim_statement_hash, claim.statement_hash);
  assert.equal(untrustedRunnerRoot.result.metadata.invoked, false);
  assert.equal(untrustedRunnerRoot.artifact.kind, "runner_output");
  assert.equal(untrustedRunnerRoot.artifact.path.startsWith(".comath"), true);
  assert.equal(existsSync(join(projectRoot, untrustedRunnerRoot.artifact.path)), true);

  const mismatch = await runMathProveBridgeExternal(projectRoot, baseRequest, {
    mathprove_root: defaultMathProveRoot,
    expected_statement_hash: "0".repeat(64)
  });
  assert.equal(mismatch.result.ok, false);
  assert.equal(mismatch.result.vetoes.includes("mathprove_claim_statement_hash_mismatch"), true);
  assert.equal(mismatch.result.metadata.invoked, false);

  assert.equal(
    existsSync(join(defaultMathProveRoot, "scripts", "verify_sympy.py")),
    true,
    "Phase 25 real bridge test requires sibling MathProve-Skill with scripts/verify_sympy.py"
  );

  const external = await runMathProveBridgeExternal(projectRoot, baseRequest, {
    mathprove_root: defaultMathProveRoot,
    expected_statement_hash: claim.statement_hash
  });
  assert.equal(external.result.bridge_version, "phase25-external-v1");
  assert.equal(external.result.ok, true);
  assert.equal(external.result.gate_result, "failed");
  assert.equal(external.result.vetoes.includes("mathprove_external_not_claim_proof"), true);
  assert.equal(external.result.vetoes.includes("mathprove_external_not_formal_authority"), true);
  assert.equal(external.result.vetoes.includes("missing_kernel_checked_artifact"), true);
  assert.equal(external.result.metadata.runner_id, "mathprove-skill.verify_sympy");
  assert.equal(external.result.metadata.network, false);
  assert.equal(external.result.metadata.exit_code, 0);
  assert.equal(external.result.metadata.invoked, true);
  assert.equal(external.result.metadata.stdout_sha256.length, 64);
  assert.equal(external.result.metadata.stderr_sha256.length, 64);
  assert.equal(external.result.metadata.result_sha256.length, 64);
  assert.equal(external.result.metadata.replay_input_sha256.length, 64);
  assert.equal(external.result.mathprove.status, "success");
  assert.equal(external.result.mathprove.output.ok, true);
  assert.equal(external.result.mathprove.output.claim_id, claim.id);
  assert.equal(external.result.mathprove.output.statement_hash, claim.statement_hash);
  assert.throws(
    () =>
      parseMathProveBridgeResult(JSON.stringify({ ...external.result, gate_result: "passed" }), {
        claim_id: claim.id,
        mode: "final_audit",
        target_status: "formally_checked"
      }),
    /must remain non-authoritative/
  );

  const externalRecord = JSON.parse(readFileSync(external.report_path, "utf8"));
  assert.equal(externalRecord.bridge, "mathprove");
  assert.equal(externalRecord.backend, "external");
  assert.doesNotMatch(JSON.stringify(externalRecord), /[A-Za-z]:\\\\/);
  assert.equal(externalRecord.result.metadata.argv_template.includes("--workspace-dir <controlled-workspace>"), true);
  assert.equal(externalRecord.result.metadata.argv_template.includes("--code <comath-generated-sympy-code>"), true);
  assert.equal(externalRecord.result.metadata.mathprove_root, "<external-mathprove-root>");
  assert.equal(externalRecord.result.metadata.script_path, "<mathprove-root>/scripts/verify_sympy.py");
  assert.equal(externalRecord.result.metadata.workspace_path.startsWith(".comath/evidence/"), true);

  const promotion = await promoteClaimWithMathProveBridge(projectRoot, {
    ...baseRequest,
    evidence_ids: [],
    artifact_ids: []
  }, {
    backend: "external",
    mathprove_root: defaultMathProveRoot,
    expected_statement_hash: claim.statement_hash
  });
  assert.equal(promotion.bridge.result.ok, true);
  assert.equal(promotion.gate.ok, false);
  assert.equal(promotion.gate.vetoes.includes("mathprove_external_not_formal_authority"), true);
  assert.equal(promotion.gate.vetoes.includes("missing_kernel_checked_artifact"), true);
  assert.equal(promotion.claim.status, "draft");
  assert.equal(getClaim(projectRoot, project.project_id, claim.id)?.status, "draft");

  const gateResults = readGateResults(projectRoot, project.project_id);
  assert.equal(gateResults.length, 1);
  assert.equal(gateResults[0].artifact_ids.includes(promotion.bridge.artifact.id), true);
  assert.equal(gateResults[0].evidence_ids.includes(promotion.bridge.evidence.id), true);

  const auditEvents = readAuditEvents(projectRoot);
  assert.equal(auditEvents.filter((event) => event.event_type === "mathprove.bridge_ran").length >= 4, true);
  assert.equal(
    auditEvents.some(
      (event) => event.event_type === "mathprove.bridge_ran" && event.payload.backend === "external" && event.payload.ok === true
    ),
    true
  );
} finally {
  rmSync(projectRoot, { recursive: true, force: true });
}

console.log("Phase 25 real MathProve bridge tests passed.");
