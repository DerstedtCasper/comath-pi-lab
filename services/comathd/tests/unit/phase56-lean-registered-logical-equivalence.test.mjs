import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import {
  appendLeanRunManifestProvenanceIndexV1,
  checkStatementEquivalence,
  createServiceOwnedLeanRunManifestV3
} from "../../dist/index.js";

const projectRoot = mkdtempSync(join(tmpdir(), "comath-lean-registered-logical-equivalence-"));
const campaignId = "CAM-0056";
const claimId = "C-0056";
const candidateId = "CAND-0056";
let runCounter = 5600;

function writeProjectFile(relativePath, content) {
  const path = join(projectRoot, relativePath);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, content, "utf8");
  return path;
}

function writeVerifiedLeanRunManifest() {
  const relRoot = `.comath/evidence/${claimId}/lean/${candidateId}/equivalence-${++runCounter}`;
  const inputRel = `${relRoot}/Target.lean`;
  const toolchainRel = `${relRoot}/lean-toolchain`;
  const stdoutRel = `${relRoot}/stdout.log`;
  const stderrRel = `${relRoot}/stderr.log`;
  const manifestRel = `${relRoot}/lean_run_manifest_v3.json`;
  writeProjectFile(inputRel, "theorem C0001 : True := by trivial\n");
  writeProjectFile(toolchainRel, "leanprover/lean4:v4.23.0\n");
  writeProjectFile(stdoutRel, "ok\n");
  writeProjectFile(stderrRel, "");
  const manifest = createServiceOwnedLeanRunManifestV3({
    projectRoot,
    run_id: `LRUN-${runCounter}`,
    claim_id: claimId,
    campaign_id: campaignId,
    candidate_id: candidateId,
    purpose: "audit",
    command: ["lake", "build", "MathResearch.C0001", "Audit.C0001"],
    cwd: join(projectRoot, relRoot),
    input_files: [join(projectRoot, inputRel), join(projectRoot, toolchainRel)],
    lean_version: "4.23.0",
    lake_version: "5.0.0",
    elan_toolchain: "leanprover/lean4:v4.23.0",
    lean_toolchain_file: join(projectRoot, toolchainRel),
    network_policy: "disabled",
    sandbox: "none",
    exit_code: 0,
    stdout_path: join(projectRoot, stdoutRel),
    stderr_path: join(projectRoot, stderrRel),
    started_at: "2026-06-01T00:00:00.000Z",
    ended_at: "2026-06-01T00:00:01.000Z",
    proof_authority: "lean_kernel_check"
  });
  writeProjectFile(manifestRel, `${JSON.stringify(manifest, null, 2)}\n`);
  appendLeanRunManifestProvenanceIndexV1({
    projectRoot,
    project_id: claimId,
    actor: "phase56-logical-equivalence",
    manifest,
    manifest_path: join(projectRoot, manifestRel)
  });
  return manifestRel;
}

function check(lean_check_output, allowed_registered_logical_equivalences = []) {
  return checkStatementEquivalence({
    projectRoot,
    campaign_id: campaignId,
    claim_id: claimId,
    candidate_id: candidateId,
    reportPath: join(".comath", "evidence", "C-0001", "lean", `statement-logical-${Math.random()}.json`),
    locked_statement_hash: "sha256:locked",
    formal_spec_statement: "MathResearch.C0001 (n : Nat) : n + 0 = n",
    lean_check_output,
    theorem_name: "MathResearch.C0001",
    allowed_registered_logical_equivalences
  });
}

try {
  const witnessHash = `sha256:${"a".repeat(64)}`;
  const accepted = check("MathResearch.C0001 (n : Nat) : Nat.add n 0 = n\n", [
    {
      formal_spec_statement: "MathResearch.C0001 (n : Nat) : n + 0 = n",
      equivalent_signature: "MathResearch.C0001 (n : Nat) : Nat.add n 0 = n",
      witness_kind: "lean_kernel_checked_equivalence",
      witness_artifact_id: "ART-EQUIV-0001",
      witness_artifact_sha256: witnessHash,
      witness_artifact_path: writeVerifiedLeanRunManifest(),
      lemma_names: ["MathResearch.c0001_equiv"],
      justification: "Kernel-checked equivalence lemma rewrites Lean notation to elaborated Nat.add form."
    }
  ]);
  assert.equal(accepted.result, "pass");
  assert.equal(accepted.status, "logically_equivalent_with_registered_lemmas");
  assert.equal(accepted.equivalence_witness.kind, "registered_logical_equivalence");
  assert.equal(accepted.equivalence_witness.witness_kind, "lean_kernel_checked_equivalence");
  assert.deepEqual(accepted.equivalence_witness.lemma_names, ["MathResearch.c0001_equiv"]);
  assert.equal(accepted.equivalence_witness.witness_artifact_sha256, witnessHash);

  const missingWitness = check("MathResearch.C0001 (n : Nat) : Nat.add n 0 = n\n", [
    {
      formal_spec_statement: "MathResearch.C0001 (n : Nat) : n + 0 = n",
      equivalent_signature: "MathResearch.C0001 (n : Nat) : Nat.add n 0 = n",
      witness_kind: "lean_kernel_checked_equivalence",
      witness_artifact_id: "ART-EQUIV-0002",
      witness_artifact_sha256: "",
      lemma_names: ["MathResearch.c0001_equiv"],
      justification: "Missing hash must not be accepted."
    }
  ]);
  assert.equal(missingWitness.result, "fail");
  assert.equal(missingWitness.hard_vetoes.includes("statement_signature_mismatch"), true);

  const missingLemma = check("MathResearch.C0001 (n : Nat) : Nat.add n 0 = n\n", [
    {
      formal_spec_statement: "MathResearch.C0001 (n : Nat) : n + 0 = n",
      equivalent_signature: "MathResearch.C0001 (n : Nat) : Nat.add n 0 = n",
      witness_kind: "lean_kernel_checked_equivalence",
      witness_artifact_id: "ART-EQUIV-0003",
      witness_artifact_sha256: witnessHash,
      lemma_names: [],
      justification: "Missing registered lemma names must not be accepted."
    }
  ]);
  assert.equal(missingLemma.result, "fail");
  assert.equal(missingLemma.hard_vetoes.includes("statement_signature_mismatch"), true);

  const wrongTarget = check("MathResearch.C0001 (n : Nat) : Nat.add 0 n = n\n", [
    {
      formal_spec_statement: "MathResearch.C0001 (n : Nat) : n + 0 = n",
      equivalent_signature: "MathResearch.C0001 (n : Nat) : Nat.add n 0 = n",
      witness_kind: "lean_kernel_checked_equivalence",
      witness_artifact_id: "ART-EQUIV-0004",
      witness_artifact_sha256: witnessHash,
      lemma_names: ["MathResearch.c0001_equiv"],
      justification: "The witness is for a different target signature."
    }
  ]);
  assert.equal(wrongTarget.result, "fail");
  assert.equal(wrongTarget.hard_vetoes.includes("statement_signature_mismatch"), true);
} finally {
  rmSync(projectRoot, { recursive: true, force: true });
}

console.log("Phase 56 Lean registered logical equivalence tests passed.");
