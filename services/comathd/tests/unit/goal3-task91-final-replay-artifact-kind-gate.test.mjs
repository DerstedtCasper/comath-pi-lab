import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import {
  appendEvidenceRecord,
  appendFinalReplayRegistryEntryV3,
  appendLeanRunManifestProvenanceIndexV1,
  applyGatePromotedClaim,
  createFinalReplayManifestV3,
  createServiceOwnedLeanRunManifestV3,
  importArtifact,
  initProject,
  packageGoal3GaPositiveMatrixFinalAuthorityEvidenceWithDerivedBindingsV3,
  promoteClaim,
  registerClaim,
  statementHash,
  writeThirdPartyReplayPackV3
} from "../../dist/index.js";

function writeProjectFile(projectRoot, relativePath, content) {
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

async function buildPromotionAttempt({
  suffix,
  auditedRegistry,
  finalReplayArtifactKind
}) {
  const projectRoot = mkdtempSync(join(tmpdir(), `comath-goal3-task91-${suffix}-`));
  try {
    const { project } = initProject({ name: `Goal 3 Task 91 ${suffix}`, root_path: projectRoot });
    const taskId = "PM-091";
    const theoremName = `Goal3Positive091${suffix}`;
    const claimStatement = `theorem ${theoremName} : True`;
    const claim = registerClaim(projectRoot, {
      project_id: project.project_id,
      statement: claimStatement,
      assumptions: [],
      domain: "logic",
      status: "conjectural",
      actor: "goal3-task91"
    });
    assert.equal(claim.statement_hash, statementHash(claimStatement));

    const replayId = "RPLY-0091";
    const runId = "LRUN-0091";
    const cleanRootRel = `.comath/lean/final_replay/${replayId}/clean`;
    const target = writeProjectFile(
      projectRoot,
      `${cleanRootRel}/MathResearch/Target.lean`,
      [
        "import Mathlib",
        "",
        "namespace MathResearch",
        "",
        `theorem ${theoremName} : True := by`,
        "  trivial",
        "",
        `#check ${theoremName}`,
        `#print axioms ${theoremName}`,
        "",
        "end MathResearch",
        ""
      ].join("\n")
    );
    const audit = writeProjectFile(
      projectRoot,
      `${cleanRootRel}/Audit/TargetAudit.lean`,
      `import MathResearch.Target\n#check MathResearch.${theoremName}\n#print axioms MathResearch.${theoremName}\n`
    );
    const formalSpecRel = `${cleanRootRel}/FormalSpec/formal_spec_lock.json`;
    const assumptionLedgerRel = `${cleanRootRel}/FormalSpec/assumption_ledger.json`;
    const formalSpec = writeProjectFile(projectRoot, formalSpecRel, `${JSON.stringify({
      schema_version: "comath.formal_spec_lock.v2",
      task_id: taskId,
      claim_id: claim.id,
      namespace: "MathResearch",
      theorem_name: theoremName,
      theorem_header: claimStatement,
      statement_hash: claim.statement_hash,
      proof_authority: "none"
    }, null, 2)}\n`);
    const assumptionLedger = writeProjectFile(projectRoot, assumptionLedgerRel, `${JSON.stringify({
      schema_version: "comath.assumption_ledger.v1",
      task_id: taskId,
      claim_id: claim.id,
      formal_spec_lock_hash: claim.statement_hash,
      entries: [],
      proof_authority: "none"
    }, null, 2)}\n`);
    const lakefile = writeProjectFile(
      projectRoot,
      `${cleanRootRel}/lakefile.lean`,
      "import Lake\nopen Lake DSL\npackage MathResearch where\nlean_lib MathResearch where\n  roots := #[`MathResearch.Target]\n"
    );
    const toolchain = writeProjectFile(projectRoot, `${cleanRootRel}/lean-toolchain`, "leanprover/lean4:v4.23.0\n");
    const lakeManifest = writeProjectFile(projectRoot, `${cleanRootRel}/lake-manifest.json`, `${JSON.stringify({ version: 7, packages: [] }, null, 2)}\n`);
    const leanBinary = writeProjectFile(projectRoot, `${cleanRootRel}/bin/lean`, "dummy lean\n");
    const lakeBinary = writeProjectFile(projectRoot, `${cleanRootRel}/bin/lake`, "dummy lake\n");
    const stdout = writeProjectFile(projectRoot, `.comath/evidence/${claim.id}/lean/${runId}.stdout.log`, `${theoremName} checked\n`);
    const stderr = writeProjectFile(projectRoot, `.comath/evidence/${claim.id}/lean/${runId}.stderr.log`, "");

    const leanRunManifest = createServiceOwnedLeanRunManifestV3({
      projectRoot,
      run_id: runId,
      claim_id: claim.id,
      campaign_id: "CAM-0091",
      purpose: "final_replay",
      command: ["lake", "build", "MathResearch"],
      cwd: join(projectRoot, cleanRootRel),
      input_files: [target, audit, formalSpec, assumptionLedger, lakefile, toolchain, lakeManifest],
      lean_version: "4.23.0",
      lake_version: "5.0.0",
      elan_toolchain: "leanprover/lean4:v4.23.0",
      lean_toolchain_file: toolchain,
      lake_manifest_file: lakeManifest,
      lean_binary_file: leanBinary,
      lake_binary_file: lakeBinary,
      network_policy: "disabled",
      sandbox: "none",
      exit_code: 0,
      stdout_path: stdout,
      stderr_path: stderr,
      started_at: "2026-05-31T00:00:00.000Z",
      ended_at: "2026-05-31T00:00:01.000Z",
      proof_authority: "lean_kernel_check"
    });
    const leanRunManifestRel = `.comath/evidence/${claim.id}/lean/${runId}.manifest.json`;
    writeProjectFile(projectRoot, leanRunManifestRel, `${JSON.stringify(leanRunManifest, null, 2)}\n`);
    appendLeanRunManifestProvenanceIndexV1({
      projectRoot,
      project_id: project.project_id,
      actor: "goal3-task91",
      manifest: leanRunManifest,
      manifest_path: leanRunManifestRel
    });

    const structuredAuditRel = `.comath/evidence/${claim.id}/lean/structured_audit.json`;
    const dependencyClosureRel = `.comath/evidence/${claim.id}/lean/dependency_closure.json`;
    const axiomProfileRel = `.comath/evidence/${claim.id}/lean/axiom_profile.json`;
    const statementCheckRel = `.comath/evidence/${claim.id}/lean/statement_equivalence.json`;
    writeProjectFile(projectRoot, structuredAuditRel, `${JSON.stringify({ result: "pass", hard_vetoes: [], generated_by_run_id: runId }, null, 2)}\n`);
    const staticAudit = writeProjectFile(projectRoot, `.comath/evidence/${claim.id}/lean/final_static_audit.json`, `${JSON.stringify({ result: "pass", hard_vetoes: [] })}\n`);
    const dependencyClosure = writeProjectFile(projectRoot, dependencyClosureRel, `${JSON.stringify({ result: "pass", hard_vetoes: [] })}\n`);
    const axiomProfile = writeProjectFile(projectRoot, axiomProfileRel, `${JSON.stringify({ result: "pass", detected_axioms: [], hard_vetoes: [] })}\n`);
    const statementCheck = writeProjectFile(projectRoot, statementCheckRel, `${JSON.stringify({ result: "pass", locked_statement_hash: claim.statement_hash, hard_vetoes: [] })}\n`);

    const finalReplayManifest = createFinalReplayManifestV3({
      projectRoot,
      replay_id: replayId,
      campaign_id: "CAM-0091",
      claim_id: claim.id,
      theorem_name: `MathResearch.${theoremName}`,
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
        "lake-manifest.json": hashRef(lakeManifest),
        "bin/lean": hashRef(leanBinary),
        "bin/lake": hashRef(lakeBinary)
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
      resource_budget: { timeout_ms: 30000, max_stdout_bytes: 65536, max_stderr_bytes: 65536 },
      binary_hashes: { lean: sha256(leanBinary), lake: sha256(lakeBinary) }
    });
    const finalReplayManifestRel = `.comath/evidence/${claim.id}/lean/final_replay_manifest_v3.json`;
    writeProjectFile(projectRoot, finalReplayManifestRel, `${JSON.stringify(finalReplayManifest, null, 2)}\n`);
    appendFinalReplayRegistryEntryV3(
      projectRoot,
      finalReplayManifest,
      auditedRegistry ? { project_id: project.project_id, actor: "goal3-task91" } : undefined
    );

    const replayPack = writeThirdPartyReplayPackV3(projectRoot, finalReplayManifest);
    applyGatePromotedClaim(projectRoot, {
      ...claim,
      formalization_status: "kernel_checked",
      dependency_closure_status: "all_dependencies_present",
      audit_state: "audit_passed",
      updated_at: new Date().toISOString()
    });

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
    if (!auditedRegistry) {
      assert.equal(report.final_evidence_status, "blocked_missing_final_evidence");
      assert.ok(report.missing_final_evidence_classes.includes("final_replay_manifest_v3"));
      return { packaging_report: report };
    }
    assert.equal(report.final_evidence_status, "verified_final_authority_evidence");

    const packagingArtifact = await importArtifact({
      projectRoot,
      project_id: project.project_id,
      source_path: report.packaging_report_path,
      kind: "runner_output",
      actor: "goal3-task91"
    });
    const finalReplayArtifact = await importArtifact({
      projectRoot,
      project_id: project.project_id,
      source_path: finalReplayManifestRel,
      kind: finalReplayArtifactKind,
      actor: "goal3-task91"
    });
    const derivedBindingArtifact = await importArtifact({
      projectRoot,
      project_id: project.project_id,
      source_path: report.source_packaging_report_path,
      kind: "runner_output",
      actor: "goal3-task91"
    });
    const evidence = appendEvidenceRecord(projectRoot, {
      project_id: project.project_id,
      claim_id: claim.id,
      kind: "lean",
      summary: `Task91 ${suffix} submits verified packaging for ordinary gate review.`,
      artifact_ids: [packagingArtifact.id, finalReplayArtifact.id, derivedBindingArtifact.id]
    });

    return promoteClaim(projectRoot, {
      project_id: project.project_id,
      claim_id: claim.id,
      target_status: "formally_checked",
      evidence_ids: [evidence.id],
      artifact_ids: [packagingArtifact.id, finalReplayArtifact.id, derivedBindingArtifact.id],
      actor: "goal3-task91"
    });
  } finally {
    rmSync(projectRoot, { recursive: true, force: true });
  }
}

const unauditedRegistryPromotion = await buildPromotionAttempt({
  suffix: "UnauditedRegistry",
  auditedRegistry: false,
  finalReplayArtifactKind: "runner_output"
});
assert.equal(
  unauditedRegistryPromotion.packaging_report.final_evidence_status,
  "blocked_missing_final_evidence",
  "registry JSONL equality alone must not prove service-owned replay provenance"
);

const wrongArtifactKindPromotion = await buildPromotionAttempt({
  suffix: "WrongArtifactKind",
  auditedRegistry: true,
  finalReplayArtifactKind: "other"
});
assert.equal(wrongArtifactKindPromotion.gate.ok, false, "FinalReplayManifest v3 must be submitted as runner_output, not a generic artifact");
assert.equal(wrongArtifactKindPromotion.claim.status, "conjectural");
assert.ok(wrongArtifactKindPromotion.gate.vetoes.includes("formally_checked requires final replay manifest runner_output artifact provenance"));

console.log("Goal 3 Task 91 final replay artifact kind gate test passed.");
