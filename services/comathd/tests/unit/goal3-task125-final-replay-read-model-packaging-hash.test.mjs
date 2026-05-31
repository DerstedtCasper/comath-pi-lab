import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import {
  appendFinalReplayRegistryEntryV3,
  appendLeanRunManifestProvenanceIndexV1,
  createFinalReplayManifestV3,
  createServiceOwnedLeanRunManifestV3,
  hasFormalReplayAuthorityPassEvidence,
  projectExternalV3TerminalState,
  projectGoalModeTerminalState
} from "../../dist/index.js";

const projectRoot = mkdtempSync(join(tmpdir(), "comath-goal3-task125-packaging-hash-"));

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

function writeFinalReplayFixture() {
  const claimId = "C-0125";
  const projectId = "PRJ-0125";
  const campaignId = "CAM-0125";
  const replayId = "RPLY-0125";
  const runId = "LRUN-0125";
  const cleanRootRel = `.comath/lean/final_replay/${replayId}/clean`;
  const target = writeProjectFile(
    `${cleanRootRel}/MathResearch/Target.lean`,
    "import Mathlib\n\nnamespace MathResearch\n\ntheorem Goal3Task125 : True := by\n  trivial\n\n#check Goal3Task125\n#print axioms Goal3Task125\n\nend MathResearch\n"
  );
  const audit = writeProjectFile(
    `${cleanRootRel}/Audit/TargetAudit.lean`,
    "import MathResearch.Target\n#check MathResearch.Goal3Task125\n#print axioms MathResearch.Goal3Task125\n"
  );
  const formalSpec = writeProjectFile(
    `${cleanRootRel}/FormalSpec/formal_spec_lock.json`,
    `${JSON.stringify(
      {
        schema_version: "comath.formal_spec_lock.v2",
        task_id: "PM-125",
        claim_id: claimId,
        namespace: "MathResearch",
        theorem_name: "Goal3Task125",
        theorem_header: "theorem Goal3Task125 : True",
        statement_hash: "1".repeat(64),
        proof_authority: "none"
      },
      null,
      2
    )}\n`
  );
  const assumptionLedger = writeProjectFile(
    `${cleanRootRel}/FormalSpec/assumption_ledger.json`,
    `${JSON.stringify(
      {
        schema_version: "comath.assumption_ledger.v1",
        task_id: "PM-125",
        claim_id: claimId,
        formal_spec_lock_hash: "1".repeat(64),
        entries: [],
        proof_authority: "none"
      },
      null,
      2
    )}\n`
  );
  const lakefile = writeProjectFile(
    `${cleanRootRel}/lakefile.lean`,
    "import Lake\nopen Lake DSL\npackage MathResearch where\nlean_lib MathResearch where\n  roots := #[`MathResearch.Target]\n"
  );
  const toolchain = writeProjectFile(`${cleanRootRel}/lean-toolchain`, "leanprover/lean4:v4.23.0\n");
  const lakeManifest = writeProjectFile(`${cleanRootRel}/lake-manifest.json`, `${JSON.stringify({ version: 7, packages: [] }, null, 2)}\n`);
  const leanBinary = writeProjectFile(`${cleanRootRel}/bin/lean`, "dummy lean executable for Task125\n");
  const lakeBinary = writeProjectFile(`${cleanRootRel}/bin/lake`, "dummy lake executable for Task125\n");
  const stdout = writeProjectFile(`.comath/evidence/${claimId}/lean/${runId}.stdout.log`, "Goal3Task125 checked\n");
  const stderr = writeProjectFile(`.comath/evidence/${claimId}/lean/${runId}.stderr.log`, "");
  const staticAudit = writeProjectFile(`.comath/evidence/${claimId}/lean/final_static_audit.json`, `${JSON.stringify({ result: "pass", hard_vetoes: [] })}\n`);
  const dependencyClosure = writeProjectFile(`.comath/evidence/${claimId}/lean/dependency_closure.json`, `${JSON.stringify({ result: "pass", hard_vetoes: [] })}\n`);
  const axiomProfile = writeProjectFile(`.comath/evidence/${claimId}/lean/axiom_profile.json`, `${JSON.stringify({ result: "pass", detected_axioms: [], hard_vetoes: [] })}\n`);
  const statementCheck = writeProjectFile(
    `.comath/evidence/${claimId}/lean/statement_equivalence.json`,
    `${JSON.stringify({ result: "pass", locked_statement_hash: "1".repeat(64), hard_vetoes: [] })}\n`
  );
  const leanRunManifest = createServiceOwnedLeanRunManifestV3({
    projectRoot,
    run_id: runId,
    claim_id: claimId,
    campaign_id: campaignId,
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
    started_at: "2026-06-01T00:00:00.000Z",
    ended_at: "2026-06-01T00:00:01.000Z",
    proof_authority: "lean_kernel_check"
  });
  const leanRunManifestRel = `.comath/evidence/${claimId}/lean/${runId}.manifest.json`;
  writeProjectFile(leanRunManifestRel, `${JSON.stringify(leanRunManifest, null, 2)}\n`);
  appendLeanRunManifestProvenanceIndexV1({
    projectRoot,
    project_id: projectId,
    actor: "goal3-task125",
    manifest: leanRunManifest,
    manifest_path: leanRunManifestRel
  });
  const manifest = createFinalReplayManifestV3({
    projectRoot,
    replay_id: replayId,
    campaign_id: campaignId,
    claim_id: claimId,
    theorem_name: "MathResearch.Goal3Task125",
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
    resource_budget: { timeout_ms: 30000, max_stdout_bytes: 65536, max_stderr_bytes: 65536 },
    binary_hashes: { lean: sha256(leanBinary), lake: sha256(lakeBinary) }
  });
  const manifestRel = `.comath/evidence/${claimId}/lean/final_replay_manifest_v3.json`;
  writeProjectFile(manifestRel, `${JSON.stringify(manifest, null, 2)}\n`);
  appendFinalReplayRegistryEntryV3(projectRoot, manifest, { project_id: projectId, actor: "goal3-task125" });
  const packagingRel = `.comath/evidence/${claimId}/lean/final_authority_packaging_report_v3.json`;
  const packagingPath = writeProjectFile(
    packagingRel,
    `${JSON.stringify(
      {
        schema_version: "comath.final_authority_packaging.v3",
        final_evidence_status: "verified_final_authority_evidence",
        proof_authority: "lean_kernel_clean_replay",
        final_replay_manifest_v3_path: manifestRel,
        can_promote_claim: true
      },
      null,
      2
    )}\n`
  );
  return { campaignId, manifestRel, packagingRel, packagingHash: sha256(packagingPath) };
}

try {
  const fixture = writeFinalReplayFixture();
  const evidenceWithoutPackagingHash = {
    schema_version: "comath.formal_replay_authority_evidence.v1",
    proof_authority: "lean_kernel_clean_replay",
    final_evidence_status: "verified_final_authority_evidence",
    final_replay_manifest_v3_path: fixture.manifestRel,
    final_authority_packaging_path: fixture.packagingRel,
    replay_id: "RPLY-0125",
    gate_result_id: "GR-0125",
    recorded_at: "2026-06-01T00:00:00.000Z"
  };
  const completedCampaign = {
    current_stage: "completed_formal_proof",
    status: "terminal",
    terminal_state: "completed_formal_proof",
    formal_replay_authority_passed: true,
    formal_replay_authority_evidence: evidenceWithoutPackagingHash
  };

  assert.equal(
    hasFormalReplayAuthorityPassEvidence({ ...completedCampaign, projectRoot }),
    false,
    "read-model authority evidence must require a packaging artifact hash, even when FinalReplayManifest provenance is valid"
  );
  assert.equal(projectExternalV3TerminalState(completedCampaign, { projectRoot }), undefined);
  assert.equal(projectGoalModeTerminalState(completedCampaign, { projectRoot }), undefined);

  const boundEvidence = { ...evidenceWithoutPackagingHash, artifact_hash: fixture.packagingHash };
  assert.equal(
    hasFormalReplayAuthorityPassEvidence({
      ...completedCampaign,
      formal_replay_authority_evidence: boundEvidence,
      projectRoot
    }),
    true
  );
  assert.equal(
    projectExternalV3TerminalState(
      { ...completedCampaign, formal_replay_authority_evidence: boundEvidence },
      { projectRoot }
    ),
    "formal_proof_verified"
  );
} finally {
  rmSync(projectRoot, { recursive: true, force: true });
}

console.log("Goal 3 Task 125 final replay read-model packaging hash test passed.");
