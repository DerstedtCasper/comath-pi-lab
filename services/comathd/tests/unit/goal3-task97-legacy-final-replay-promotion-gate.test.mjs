import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import {
  appendEvidenceRecord,
  applyGatePromotedClaim,
  importArtifact,
  initProject,
  promoteClaim,
  registerClaim
} from "../../dist/index.js";

const projectRoot = mkdtempSync(join(tmpdir(), "comath-goal3-task97-"));

function writeProjectFile(relativePath, content) {
  const path = join(projectRoot, relativePath);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, content, "utf8");
  return path;
}

function sha256File(path) {
  return {
    sha256: createHash("sha256").update(readFileSync(path)).digest("hex"),
    size_bytes: statSync(path).size
  };
}

try {
  const { project } = initProject({ name: "Goal3 Task97 Legacy Final Replay Gate", root_path: projectRoot });
  const claim = registerClaim(projectRoot, {
    project_id: project.project_id,
    statement: "For every natural number n, n + 0 = n.",
    assumptions: ["n : Nat"],
    domain: "elementary",
    status: "conjectural",
    actor: "goal3-task97"
  });

  const proofPath = writeProjectFile(
    join(".comath", "lean", "MathResearch", "C0001.lean"),
    "namespace MathResearch\n\ntheorem C0001 (n : Nat) : n + 0 = n := Nat.add_zero n\n\nend MathResearch\n"
  );
  const proofArtifact = await importArtifact({
    projectRoot,
    project_id: project.project_id,
    source_path: proofPath,
    kind: "code",
    actor: "goal3-task97"
  });

  const reportPaths = {
    stdout: writeProjectFile(`.comath/evidence/${claim.id}/lean/final_replay.log`, "#print axioms MathResearch.C0001\n"),
    stderr: writeProjectFile(`.comath/evidence/${claim.id}/lean/final_replay.stderr.log`, ""),
    static_audit: writeProjectFile(
      `.comath/evidence/${claim.id}/lean/final_static_audit.json`,
      JSON.stringify({ result: "pass", findings: [], hard_vetoes: [] })
    ),
    axiom_profile: writeProjectFile(
      `.comath/evidence/${claim.id}/lean/axiom_profile.json`,
      JSON.stringify({ result: "pass", detected_axioms: [], hard_vetoes: [] })
    ),
    dependency_closure: writeProjectFile(
      `.comath/evidence/${claim.id}/lean/dependency_closure.json`,
      JSON.stringify({ result: "pass", hard_vetoes: [] })
    ),
    statement_equivalence: writeProjectFile(
      `.comath/evidence/${claim.id}/lean/statement_equivalence.json`,
      JSON.stringify({ result: "pass", equivalence: "exact", hard_vetoes: [], locked_statement_hash: claim.statement_hash })
    )
  };
  const legacyReplayManifestPath = writeProjectFile(
    join(".comath", "evidence", claim.id, "lean", "final_replay_manifest_legacy_bound.json"),
    `${JSON.stringify(
      {
        replay_id: "RPLY-0001",
        campaign_id: "CAM-0001",
        claim_id: claim.id,
        theorem_name: "MathResearch.C0001",
        theorem_family: "nat_add_zero",
        canonical_proposition: "n + 0 = n",
        normalized_statement: claim.statement,
        primary_dependency: "Nat.add_zero",
        locked_statement_hash: claim.statement_hash,
        clean_workspace_path: ".comath/lean/final_replay/RPLY-0001/clean",
        lean_toolchain: "leanprover/lean4:v4.23.0",
        lakefile_hash: "a".repeat(64),
        local_file_hashes: {
          "MathResearch/C0001.lean": "b".repeat(64)
        },
        command: "lake build MathResearch.C0001",
        exit_code: 0,
        stdout_path: `.comath/evidence/${claim.id}/lean/final_replay.log`,
        stderr_path: `.comath/evidence/${claim.id}/lean/final_replay.stderr.log`,
        static_audit_path: `.comath/evidence/${claim.id}/lean/final_static_audit.json`,
        axiom_profile_path: `.comath/evidence/${claim.id}/lean/axiom_profile.json`,
        dependency_closure_path: `.comath/evidence/${claim.id}/lean/dependency_closure.json`,
        statement_equivalence_path: `.comath/evidence/${claim.id}/lean/statement_equivalence.json`,
        artifact_hashes: Object.fromEntries(Object.entries(reportPaths).map(([key, path]) => [key, sha256File(path)])),
        result: "pass"
      },
      null,
      2
    )}\n`
  );
  const legacyReplayArtifact = await importArtifact({
    projectRoot,
    project_id: project.project_id,
    source_path: legacyReplayManifestPath,
    kind: "runner_output",
    actor: "goal3-task97"
  });
  const evidence = appendEvidenceRecord(projectRoot, {
    project_id: project.project_id,
    claim_id: claim.id,
    kind: "lean",
    summary:
      "A legacy hash-bound finalLeanReplaySchema manifest is present, but it is not Lean Authority v3 packaging evidence.",
    artifact_ids: [proofArtifact.id, legacyReplayArtifact.id]
  });

  applyGatePromotedClaim(projectRoot, {
    ...claim,
    formalization_status: "kernel_checked",
    dependency_closure_status: "all_dependencies_present",
    audit_state: "audit_passed",
    updated_at: new Date().toISOString()
  });

  const promotion = promoteClaim(projectRoot, {
    project_id: project.project_id,
    claim_id: claim.id,
    target_status: "formally_checked",
    evidence_ids: [evidence.id],
    artifact_ids: [proofArtifact.id, legacyReplayArtifact.id],
    actor: "goal3-task97"
  });

  assert.equal(promotion.gate.ok, false, "legacy finalLeanReplaySchema must not satisfy promotion-grade evidence");
  assert.equal(promotion.claim.status, "conjectural");
  assert.equal(
    promotion.gate.vetoes.includes("formally_checked requires Lean Authority v3 final replay packaging"),
    true
  );
} finally {
  rmSync(projectRoot, { recursive: true, force: true });
}

console.log("Goal3 Task97 legacy final replay promotion gate tests passed.");
