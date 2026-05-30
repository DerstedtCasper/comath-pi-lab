import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import {
  createFinalReplayManifestV3,
  createServiceOwnedLeanRunManifestV3,
  initProject,
  packageGoal3GaPositiveMatrixFinalAuthorityEvidenceWithDerivedBindingsV3,
  registerClaim,
  statementHash,
  writeThirdPartyReplayPackV3
} from "../../dist/index.js";

const projectRoot = mkdtempSync(join(tmpdir(), "comath-goal3-task82-replay-pack-binding-"));

function writeProjectFile(relativePath, content) {
  const absolute = join(projectRoot, relativePath);
  mkdirSync(dirname(absolute), { recursive: true });
  writeFileSync(absolute, content, "utf8");
  return absolute;
}

function sha256(path) {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}

function hashRef(path) {
  return { sha256: sha256(path), size_bytes: statSync(path).size };
}

try {
  const { project } = initProject({ name: "Goal 3 Task 82 Replay Pack Binding", root_path: projectRoot });
  const taskId = "PM-082";
  const claimStatement = "theorem Goal3Positive082 : True";
  const claim = registerClaim(projectRoot, {
    project_id: project.project_id,
    statement: claimStatement,
    assumptions: [],
    domain: "logic",
    status: "conjectural",
    actor: "goal3-task82"
  });
  assert.equal(claim.statement_hash, statementHash(claimStatement));

  const replayId = "RPLY-0082";
  const runId = "LRUN-0082";
  const cleanRootRel = `.comath/lean/final_replay/${replayId}/clean`;
  const target = writeProjectFile(
    `${cleanRootRel}/MathResearch/Target.lean`,
    [
      "import Mathlib",
      "",
      "namespace MathResearch",
      "",
      "theorem Goal3Positive082 : True := by",
      "  trivial",
      "",
      "#check Goal3Positive082",
      "#print axioms Goal3Positive082",
      "",
      "end MathResearch",
      ""
    ].join("\n")
  );
  const audit = writeProjectFile(`${cleanRootRel}/Audit/TargetAudit.lean`, "import MathResearch.Target\n#check MathResearch.Goal3Positive082\n#print axioms MathResearch.Goal3Positive082\n");
  const formalSpecRel = `${cleanRootRel}/FormalSpec/formal_spec_lock.json`;
  const assumptionLedgerRel = `${cleanRootRel}/FormalSpec/assumption_ledger.json`;
  const formalSpec = writeProjectFile(formalSpecRel, `${JSON.stringify({
    schema_version: "comath.formal_spec_lock.v2",
    task_id: taskId,
    claim_id: claim.id,
    namespace: "MathResearch",
    theorem_name: "Goal3Positive082",
    theorem_header: "theorem Goal3Positive082 : True",
    statement_hash: claim.statement_hash,
    proof_authority: "none"
  }, null, 2)}\n`);
  const assumptionLedger = writeProjectFile(assumptionLedgerRel, `${JSON.stringify({
    schema_version: "comath.assumption_ledger.v2",
    task_id: taskId,
    claim_id: claim.id,
    formal_spec_lock_hash: claim.statement_hash,
    entries: [],
    proof_authority: "none"
  }, null, 2)}\n`);
  const lakefile = writeProjectFile(`${cleanRootRel}/lakefile.lean`, "import Lake\nopen Lake DSL\npackage MathResearch where\nlean_lib MathResearch where\n  roots := #[`MathResearch.Target]\n");
  const toolchain = writeProjectFile(`${cleanRootRel}/lean-toolchain`, "leanprover/lean4:v4.23.0\n");
  const lakeManifest = writeProjectFile(`${cleanRootRel}/lake-manifest.json`, `${JSON.stringify({ version: 7, packages: [] }, null, 2)}\n`);
  const stdout = writeProjectFile(`.comath/evidence/${claim.id}/lean/${runId}.stdout.log`, "Goal3Positive082 checked\n");
  const stderr = writeProjectFile(`.comath/evidence/${claim.id}/lean/${runId}.stderr.log`, "");

  const leanRunManifest = createServiceOwnedLeanRunManifestV3({
    projectRoot,
    run_id: runId,
    claim_id: claim.id,
    campaign_id: "CAM-0082",
    purpose: "final_replay",
    command: ["lake", "build", "MathResearch"],
    cwd: join(projectRoot, cleanRootRel),
    input_files: [target, audit, formalSpec, assumptionLedger, lakefile, toolchain, lakeManifest],
    lean_version: "4.23.0",
    lake_version: "5.0.0",
    elan_toolchain: "leanprover/lean4:v4.23.0",
    lean_toolchain_file: toolchain,
    lake_manifest_file: lakeManifest,
    network_policy: "disabled",
    sandbox: "none",
    exit_code: 0,
    stdout_path: stdout,
    stderr_path: stderr,
    started_at: "2026-05-30T00:00:00.000Z",
    ended_at: "2026-05-30T00:00:01.000Z",
    proof_authority: "lean_kernel_check"
  });
  const leanRunManifestRel = `.comath/evidence/${claim.id}/lean/${runId}.manifest.json`;
  writeProjectFile(leanRunManifestRel, `${JSON.stringify(leanRunManifest, null, 2)}\n`);

  const structuredAuditRel = `.comath/evidence/${claim.id}/lean/structured_audit.json`;
  const dependencyClosureRel = `.comath/evidence/${claim.id}/lean/dependency_closure.json`;
  const axiomProfileRel = `.comath/evidence/${claim.id}/lean/axiom_profile.json`;
  const statementCheckRel = `.comath/evidence/${claim.id}/lean/statement_equivalence.json`;
  writeProjectFile(structuredAuditRel, `${JSON.stringify({ result: "pass", hard_vetoes: [], generated_by_run_id: runId }, null, 2)}\n`);
  const staticAudit = writeProjectFile(`.comath/evidence/${claim.id}/lean/final_static_audit.json`, `${JSON.stringify({ result: "pass", hard_vetoes: [] })}\n`);
  const dependencyClosure = writeProjectFile(dependencyClosureRel, `${JSON.stringify({ result: "pass", hard_vetoes: [] })}\n`);
  const axiomProfile = writeProjectFile(axiomProfileRel, `${JSON.stringify({ result: "pass", detected_axioms: [], hard_vetoes: [] })}\n`);
  const statementCheck = writeProjectFile(statementCheckRel, `${JSON.stringify({ result: "pass", locked_statement_hash: claim.statement_hash, hard_vetoes: [] })}\n`);

  const finalReplayManifest = createFinalReplayManifestV3({
    projectRoot,
    replay_id: replayId,
    campaign_id: "CAM-0082",
    claim_id: claim.id,
    theorem_name: "MathResearch.Goal3Positive082",
    clean_workspace_path: join(projectRoot, cleanRootRel),
    command: ["lake", "build", "MathResearch"],
    exit_code: 0,
    result: "pass",
    source_hashes_before: {
      "MathResearch/Target.lean": hashRef(target),
      "Audit/TargetAudit.lean": hashRef(audit),
      "FormalSpec/formal_spec_lock.json": hashRef(formalSpec),
      "FormalSpec/assumption_ledger.json": hashRef(assumptionLedger),
      "lakefile.lean": hashRef(lakefile),
      "lean-toolchain": hashRef(toolchain),
      "lake-manifest.json": hashRef(lakeManifest)
    },
    stdout_path: stdout,
    stderr_path: stderr,
    report_paths: {
      static_audit: staticAudit,
      axiom_profile: axiomProfile,
      dependency_closure: dependencyClosure,
      statement_equivalence: statementCheck
    },
    lean_run_manifest_paths: [join(projectRoot, leanRunManifestRel)],
    dependency_lock: {
      lean_toolchain_path: toolchain,
      lake_manifest_path: lakeManifest,
      lakefile_path: lakefile,
      external_revisions: []
    },
    network_policy: "disabled",
    sandbox_policy: { network: "disabled", os_isolation: "process_boundary_only" },
    resource_budget: { timeout_ms: 30000, max_stdout_bytes: 65536, max_stderr_bytes: 65536 }
  });
  const finalReplayManifestRel = `.comath/evidence/${claim.id}/lean/final_replay_manifest_v3.json`;
  writeProjectFile(finalReplayManifestRel, `${JSON.stringify(finalReplayManifest, null, 2)}\n`);
  const replayPack = writeThirdPartyReplayPackV3(projectRoot, finalReplayManifest);

  const foreignManifest = {
    ...finalReplayManifest,
    replay_id: "RPLY-FOREIGN",
    claim_id: "C-FOREIGN",
    theorem_name: "MathResearch.ForeignTheorem"
  };
  writeProjectFile(`${replayPack.pack_path}/FinalReplayManifest.json`, `${JSON.stringify(foreignManifest, null, 2)}\n`);

  const report = packageGoal3GaPositiveMatrixFinalAuthorityEvidenceWithDerivedBindingsV3({
    projectRoot,
    taskId,
    claimId: claim.id,
    evidence: {
      lean_run_manifest_paths: [leanRunManifestRel],
      final_replay_manifest_v3_path: finalReplayManifestRel,
      structured_audit_path: structuredAuditRel,
      dependency_closure_path: dependencyClosureRel,
      axiom_profile_path: axiomProfileRel,
      statement_check_path: statementCheckRel,
      third_party_replay_pack_path: replayPack.pack_path,
      formal_spec_lock_path: formalSpecRel,
      assumption_ledger_path: assumptionLedgerRel
    }
  });

  assert.equal(report.final_evidence_status, "blocked_missing_final_evidence");
  assert.ok(report.missing_final_evidence_classes.includes("third_party_replay_pack"));
} finally {
  rmSync(projectRoot, { recursive: true, force: true });
}

console.log("Goal 3 Task 82 third-party replay pack binding test passed.");
