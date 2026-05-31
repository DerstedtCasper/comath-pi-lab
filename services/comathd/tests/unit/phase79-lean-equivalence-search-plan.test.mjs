import assert from "node:assert/strict";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { checkStatementEquivalence, createServiceOwnedLeanRunManifestV3 } from "../../dist/index.js";

const projectRoot = mkdtempSync(join(tmpdir(), "comath-lean-equivalence-search-plan-"));
const source = "MathResearch.C0001 (n : Nat) : n + 0 = n";
const target = "MathResearch.C0001 (n : Nat) : Nat.add n 0 = n";
const planPath = join(".comath", "evidence", "C-0001", "lean", "equivalence_search_plan.json");
let runCounter = 7900;

function writeProjectFile(root, relativePath, content) {
  const path = join(root, relativePath);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, content, "utf8");
  return path;
}

function writeVerifiedLeanRunManifest(root, { campaignId = "CAM-0079", claimId = "C-0001", candidateId = "CAND-0079" } = {}) {
  const relRoot = `.comath/evidence/${claimId}/lean/${candidateId}/equivalence-${++runCounter}`;
  const inputRel = `${relRoot}/Target.lean`;
  const toolchainRel = `${relRoot}/lean-toolchain`;
  const stdoutRel = `${relRoot}/stdout.log`;
  const stderrRel = `${relRoot}/stderr.log`;
  const manifestRel = `${relRoot}/lean_run_manifest_v3.json`;
  writeProjectFile(root, inputRel, "theorem C0001 : True := by trivial\n");
  writeProjectFile(root, toolchainRel, "leanprover/lean4:v4.23.0\n");
  writeProjectFile(root, stdoutRel, "ok\n");
  writeProjectFile(root, stderrRel, "");
  const manifest = createServiceOwnedLeanRunManifestV3({
    projectRoot: root,
    run_id: `LRUN-${runCounter}`,
    claim_id: claimId,
    campaign_id: campaignId,
    candidate_id: candidateId,
    purpose: "audit",
    command: ["lake", "build", "MathResearch.C0001", "Audit.C0001"],
    cwd: join(root, relRoot),
    input_files: [join(root, inputRel), join(root, toolchainRel)],
    lean_version: "4.23.0",
    lake_version: "5.0.0",
    elan_toolchain: "leanprover/lean4:v4.23.0",
    lean_toolchain_file: join(root, toolchainRel),
    network_policy: "disabled",
    sandbox: "none",
    exit_code: 0,
    stdout_path: join(root, stdoutRel),
    stderr_path: join(root, stderrRel),
    started_at: "2026-06-01T00:00:00.000Z",
    ended_at: "2026-06-01T00:00:01.000Z",
    proof_authority: "lean_kernel_check"
  });
  writeProjectFile(root, manifestRel, `${JSON.stringify(manifest, null, 2)}\n`);
  return manifestRel;
}

function check(overrides = {}) {
  return checkStatementEquivalence({
    projectRoot,
    reportPath: join(".comath", "evidence", "C-0001", "lean", `statement-${Math.random()}.json`),
    locked_statement_hash: "sha256:locked",
    formal_spec_statement: source,
    lean_check_output: `${target}\n`,
    theorem_name: "MathResearch.C0001",
    equivalence_search_plan_path: planPath,
    equivalence_search_hints: ["Nat.add_zero", "rfl"],
    ...overrides
  });
}

function readPlan() {
  return JSON.parse(readFileSync(join(projectRoot, planPath), "utf8"));
}

try {
  const planned = check();
  assert.equal(planned.result, "fail");
  assert.equal(planned.status, "different");
  assert.equal(planned.hard_vetoes.includes("statement_signature_mismatch"), true);
  assert.equal(planned.equivalence_search_plan_path, planPath.replace(/\\/g, "/"));
  assert.equal(planned.equivalence_search_plan_status, "blocked_unproved");

  const plan = readPlan();
  assert.equal(plan.result, "blocked_unproved");
  assert.equal(plan.proof_authority, "none");
  assert.equal(plan.can_promote_claim, false);
  assert.equal(plan.formal_spec_statement, source);
  assert.equal(plan.target_signature.normalized_signature, target);
  assert.equal(plan.locked_statement_hash, "sha256:locked");
  assert.deepEqual(plan.candidate_lemma_names, ["Nat.add_zero", "rfl"]);
  assert.deepEqual(plan.required_next_artifacts, [
    "lean_kernel_checked_equivalence",
    "witness_artifact_id",
    "witness_artifact_sha256",
    "lemma_names"
  ]);
  assert.equal(plan.obligations.length, 1);
  assert.equal(plan.obligations[0].kind, "prove_statement_equivalence");
  assert.equal(plan.obligations[0].status, "blocked_unproved");
  assert.equal(plan.obligations[0].source_signature, source);
  assert.equal(plan.obligations[0].target_signature, target);

  const exactRoot = mkdtempSync(join(tmpdir(), "comath-lean-equivalence-search-exact-"));
  try {
    checkStatementEquivalence({
      projectRoot: exactRoot,
      reportPath: join(".comath", "evidence", "C-0001", "lean", "statement-exact.json"),
      locked_statement_hash: "sha256:locked",
      formal_spec_statement: source,
      lean_check_output: `${source}\n`,
      theorem_name: "MathResearch.C0001",
      equivalence_search_plan_path: planPath,
      equivalence_search_hints: ["Nat.add_zero"]
    });
    assert.equal(existsSync(join(exactRoot, planPath)), false);
  } finally {
    rmSync(exactRoot, { recursive: true, force: true });
  }

  const registeredRoot = mkdtempSync(join(tmpdir(), "comath-lean-equivalence-search-registered-"));
  try {
    checkStatementEquivalence({
      projectRoot: registeredRoot,
      reportPath: join(".comath", "evidence", "C-0001", "lean", "statement-registered.json"),
      campaign_id: "CAM-0079",
      claim_id: "C-0001",
      candidate_id: "CAND-0079",
      locked_statement_hash: "sha256:locked",
      formal_spec_statement: source,
      lean_check_output: `${target}\n`,
      theorem_name: "MathResearch.C0001",
      equivalence_search_plan_path: planPath,
      equivalence_search_hints: ["Nat.add_zero"],
      allowed_registered_logical_equivalences: [
        {
          formal_spec_statement: source,
          equivalent_signature: target,
          witness_kind: "lean_kernel_checked_equivalence",
          witness_artifact_id: "ART-EQUIV-0001",
          witness_artifact_sha256: `sha256:${"a".repeat(64)}`,
          witness_artifact_path: writeVerifiedLeanRunManifest(registeredRoot),
          lemma_names: ["MathResearch.c0001_equiv"],
          justification: "Kernel-checked direct witness."
        }
      ]
    });
    assert.equal(existsSync(join(registeredRoot, planPath)), false);
  } finally {
    rmSync(registeredRoot, { recursive: true, force: true });
  }

  const transitiveRoot = mkdtempSync(join(tmpdir(), "comath-lean-equivalence-search-transitive-"));
  try {
    checkStatementEquivalence({
      projectRoot: transitiveRoot,
      reportPath: join(".comath", "evidence", "C-0001", "lean", "statement-transitive.json"),
      campaign_id: "CAM-0079",
      claim_id: "C-0001",
      candidate_id: "CAND-0079",
      locked_statement_hash: "sha256:locked",
      formal_spec_statement: source,
      lean_check_output: `${target}\n`,
      theorem_name: "MathResearch.C0001",
      equivalence_search_plan_path: planPath,
      equivalence_search_hints: ["Nat.add_zero"],
      allowed_registered_transitive_logical_equivalences: [
        {
          formal_spec_statement: source,
          equivalent_signature: target,
          justification: "Kernel-checked transitive witness chain.",
          links: [
            {
              formal_spec_statement: source,
              equivalent_signature: "MathResearch.C0001 (n : Nat) : n + 0 = Nat.add n 0",
              witness_kind: "lean_kernel_checked_equivalence",
              witness_artifact_id: "ART-EQUIV-0002",
              witness_artifact_sha256: `sha256:${"b".repeat(64)}`,
              witness_artifact_path: writeVerifiedLeanRunManifest(transitiveRoot),
              lemma_names: ["MathResearch.c0001_step1"],
              justification: "Kernel-checked first link."
            },
            {
              formal_spec_statement: "MathResearch.C0001 (n : Nat) : n + 0 = Nat.add n 0",
              equivalent_signature: target,
              witness_kind: "lean_kernel_checked_equivalence",
              witness_artifact_id: "ART-EQUIV-0003",
              witness_artifact_sha256: `sha256:${"c".repeat(64)}`,
              witness_artifact_path: writeVerifiedLeanRunManifest(transitiveRoot),
              lemma_names: ["MathResearch.c0001_step2"],
              justification: "Kernel-checked second link."
            }
          ]
        }
      ]
    });
    assert.equal(existsSync(join(transitiveRoot, planPath)), false);
  } finally {
    rmSync(transitiveRoot, { recursive: true, force: true });
  }

  const missingRoot = mkdtempSync(join(tmpdir(), "comath-lean-equivalence-search-missing-"));
  try {
    const missing = checkStatementEquivalence({
      projectRoot: missingRoot,
      reportPath: join(".comath", "evidence", "C-0001", "lean", "statement-missing.json"),
      locked_statement_hash: "sha256:locked",
      formal_spec_statement: source,
      lean_check_output: "",
      theorem_name: "MathResearch.C0001",
      equivalence_search_plan_path: planPath,
      equivalence_search_hints: ["Nat.add_zero"]
    });
    assert.equal(missing.result, "fail");
    assert.equal(missing.hard_vetoes.includes("missing_target_check_output"), true);
    assert.equal(existsSync(join(missingRoot, planPath)), false);
  } finally {
    rmSync(missingRoot, { recursive: true, force: true });
  }

  const emptyHintRoot = mkdtempSync(join(tmpdir(), "comath-lean-equivalence-search-empty-hints-"));
  try {
    const emptyHints = checkStatementEquivalence({
      projectRoot: emptyHintRoot,
      reportPath: join(".comath", "evidence", "C-0001", "lean", "statement-empty-hints.json"),
      locked_statement_hash: "sha256:locked",
      formal_spec_statement: source,
      lean_check_output: `${target}\n`,
      theorem_name: "MathResearch.C0001",
      equivalence_search_plan_path: planPath,
      equivalence_search_hints: ["", "  "]
    });
    assert.equal(emptyHints.result, "fail");
    assert.equal(emptyHints.equivalence_search_plan_path, undefined);
    assert.equal(existsSync(join(emptyHintRoot, planPath)), false);
  } finally {
    rmSync(emptyHintRoot, { recursive: true, force: true });
  }

  const untrustedHintRoot = mkdtempSync(join(tmpdir(), "comath-lean-equivalence-search-untrusted-hints-"));
  try {
    const untrustedHints = checkStatementEquivalence({
      projectRoot: untrustedHintRoot,
      reportPath: join(".comath", "evidence", "C-0001", "lean", "statement-untrusted-hints.json"),
      locked_statement_hash: "sha256:locked",
      formal_spec_statement: source,
      lean_check_output: `${target}\n`,
      theorem_name: "MathResearch.C0001",
      equivalence_search_plan_path: planPath,
      equivalence_search_hints: ["Nat.add_zero; admit"]
    });
    assert.equal(untrustedHints.result, "fail");
    assert.equal(untrustedHints.equivalence_search_plan_path, undefined);
    assert.equal(existsSync(join(untrustedHintRoot, planPath)), false);
  } finally {
    rmSync(untrustedHintRoot, { recursive: true, force: true });
  }
} finally {
  rmSync(projectRoot, { recursive: true, force: true });
}

console.log("Phase 79 Lean equivalence search plan tests passed.");
