import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  getClaim,
  initProject,
  mathProveRunManifestSchema,
  parseMathProveBridgeResult,
  promoteClaimWithMathProveBridge,
  readAuditEvents,
  readGateResults,
  registerClaim,
  runMathProveBridgeMock
} from "../../dist/index.js";

const testDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(testDir, "..", "..", "..", "..");
const bridgeScript = join(repoRoot, "python", "mathprove_bridge.py");
const projectRoot = mkdtempSync(join(tmpdir(), "comath-mathprove-"));

function runBridgeCli(args) {
  const stdout = execFileSync("python", [bridgeScript, ...args], {
    cwd: repoRoot,
    encoding: "utf8"
  });
  return JSON.parse(stdout);
}

try {
  const { project } = initProject({ name: "MathProve Bridge Project", root_path: projectRoot });
  const claim = registerClaim(projectRoot, {
    project_id: project.project_id,
    statement: "Every object is equal to itself.",
    assumptions: ["x is an object"],
    domain: "algebra",
    actor: "phase9-test"
  });

  assert.equal(existsSync(bridgeScript), true, "Phase 9 bridge script must exist");

  for (const mode of ["plan", "route", "final_audit"]) {
    const cliResult = runBridgeCli([
      "--project-root",
      projectRoot,
      "--claim",
      claim.id,
      "--mode",
      mode,
      "--target-status",
      "formally_checked"
    ]);
    assert.equal(cliResult.ok, false);
    assert.equal(cliResult.bridge_version, "phase9-mock");
    assert.equal(cliResult.mode, mode);
    assert.equal(cliResult.claim_id, claim.id);
    assert.equal(cliResult.target_status, "formally_checked");
    assert.equal(cliResult.gate_result, "failed");
    assert.deepEqual(cliResult.evidence, []);
    assert.deepEqual(cliResult.artifacts, []);
    assert.equal(cliResult.vetoes.includes("not_implemented"), true);
    assert.equal(cliResult.vetoes.includes("mathprove_mock_no_kernel_proof"), true);
    assert.equal(cliResult.vetoes.includes("missing_kernel_checked_artifact"), true);
    assert.equal(cliResult.vetoes.includes("missing_dependency_closure_audit"), true);
  }

  const symbolicCliResult = runBridgeCli([
    "--project-root",
    projectRoot,
    "--claim",
    claim.id,
    "--mode",
    "final_audit",
    "--target-status",
    "symbolically_checked"
  ]);
  assert.equal(symbolicCliResult.ok, false);
  assert.equal(symbolicCliResult.vetoes.includes("missing_exact_symbolic_artifact"), true);
  assert.equal(symbolicCliResult.vetoes.includes("float_only_exact_proof"), true);

  const literatureCliResult = runBridgeCli([
    "--project-root",
    projectRoot,
    "--claim",
    claim.id,
    "--mode",
    "final_audit",
    "--target-status",
    "literature_supported"
  ]);
  assert.equal(literatureCliResult.ok, false);
  assert.equal(literatureCliResult.vetoes.includes("missing_exact_citation_artifact"), true);
  assert.equal(literatureCliResult.vetoes.includes("citation_condition_mismatch"), true);

  assert.throws(
    () => parseMathProveBridgeResult("{not-json", { claim_id: claim.id, mode: "plan", target_status: "formally_checked" }),
    /invalid MathProve bridge JSON/
  );
  assert.throws(
    () =>
      parseMathProveBridgeResult(
        JSON.stringify({ ...literatureCliResult, mode: "side_channel" }),
        { claim_id: claim.id, mode: "plan", target_status: "literature_supported" }
      ),
    /invalid MathProve bridge result/
  );
  assert.throws(
    () =>
      parseMathProveBridgeResult(
        JSON.stringify({ ...literatureCliResult, claim_id: "C-9999" }),
        { claim_id: claim.id, mode: "final_audit", target_status: "literature_supported" }
      ),
    /claim mismatch/
  );
  assert.throws(
    () =>
      parseMathProveBridgeResult(
        JSON.stringify({ ...literatureCliResult, target_status: "formally_checked" }),
        { claim_id: claim.id, mode: "final_audit", target_status: "literature_supported" }
      ),
    /target status mismatch/
  );

  const adapterResult = await runMathProveBridgeMock(projectRoot, {
    project_id: project.project_id,
    claim_id: claim.id,
    mode: "route",
    target_status: "formally_checked",
    actor: "phase9-test"
  });
  assert.equal(adapterResult.result.ok, false);
  assert.equal(adapterResult.result.vetoes.includes("mathprove_mock_no_kernel_proof"), true);
  assert.equal(adapterResult.artifact.kind, "runner_output");
  assert.equal(adapterResult.artifact.path.startsWith(".comath"), true);
  assert.equal(existsSync(join(projectRoot, adapterResult.artifact.path)), true);
  assert.equal(adapterResult.evidence.id, "EV-0001");
  assert.equal(adapterResult.evidence.kind, "audit");
  assert.deepEqual(adapterResult.evidence.artifact_ids, [adapterResult.artifact.id]);

  const bridgeRecordPath = join(projectRoot, ".comath", "evidence", claim.id, "mathprove", "MPBR-0001.json");
  assert.equal(existsSync(bridgeRecordPath), true);
  const bridgeRecord = JSON.parse(readFileSync(bridgeRecordPath, "utf8"));
  assert.equal(bridgeRecord.result.claim_id, claim.id);
  assert.equal(bridgeRecord.result.ok, false);
  const bridgeManifest = mathProveRunManifestSchema.parse(bridgeRecord.mathprove_run_manifest);
  assert.equal(bridgeManifest.id, "MPBR-0001");
  assert.equal(bridgeManifest.project_id, project.project_id);
  assert.equal(bridgeManifest.claim_id, claim.id);
  assert.equal(bridgeManifest.mode, "route");
  assert.equal(bridgeManifest.status, "failed");
  assert.equal(bridgeManifest.run_root.endsWith(join(".comath", "evidence", claim.id, "mathprove")), true);
  assert.equal(bridgeManifest.run_root.startsWith(".comath"), true);
  assert.equal(bridgeManifest.run_root.includes(projectRoot), false);
  assert.deepEqual(bridgeManifest.artifact_ids, [adapterResult.artifact.id]);
  assert.deepEqual(bridgeManifest.evidence_ids, [adapterResult.evidence.id]);
  assert.equal(bridgeManifest.vetoes.includes("mathprove_mock_no_kernel_proof"), true);

  const promotion = await promoteClaimWithMathProveBridge(projectRoot, {
    project_id: project.project_id,
    claim_id: claim.id,
    mode: "final_audit",
    target_status: "formally_checked",
    evidence_ids: ["EV-9999"],
    artifact_ids: ["AR-9999"],
    actor: "phase9-test"
  });
  assert.equal(promotion.bridge.result.ok, false);
  assert.equal(promotion.gate.ok, false);
  assert.equal(promotion.gate.vetoes.includes("mathprove_mock_no_kernel_proof"), true);
  assert.equal(promotion.gate.vetoes.includes("missing_kernel_checked_artifact"), true);
  assert.equal(promotion.claim.status, "draft");
  assert.equal(getClaim(projectRoot, project.project_id, claim.id)?.status, "draft");

  const gateResults = readGateResults(projectRoot, project.project_id);
  assert.equal(gateResults.length, 1);
  assert.equal(gateResults[0].ok, false);
  assert.equal(gateResults[0].artifact_ids.includes(promotion.bridge.artifact.id), true);
  assert.equal(gateResults[0].evidence_ids.includes(promotion.bridge.evidence.id), true);

  const auditEvents = readAuditEvents(projectRoot);
  assert.equal(auditEvents.some((event) => event.event_type === "mathprove.bridge_ran"), true);
  assert.equal(auditEvents.some((event) => event.event_type === "claim.promotion_rejected"), true);
} finally {
  rmSync(projectRoot, { recursive: true, force: true });
}

console.log("Phase 9 MathProve bridge tests passed.");
