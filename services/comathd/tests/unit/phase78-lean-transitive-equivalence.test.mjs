import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { checkStatementEquivalence, createServiceOwnedLeanRunManifestV3 } from "../../dist/index.js";

const projectRoot = mkdtempSync(join(tmpdir(), "comath-lean-transitive-equivalence-"));
const campaignId = "CAM-0078";
const claimId = "C-0078";
const candidateId = "CAND-0078";
const source = "MathResearch.C0001 (n : Nat) : n + 0 = n";
const middle = "MathResearch.C0001 (n : Nat) : Nat.add n 0 = n";
const target = "MathResearch.C0001 (n : Nat) : Eq (Nat.add n 0) n";
const hashA = `sha256:${"a".repeat(64)}`;
const hashB = `sha256:${"b".repeat(64)}`;
let runCounter = 7800;

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
  return manifestRel;
}

function link(overrides = {}) {
  return {
    formal_spec_statement: source,
    equivalent_signature: middle,
    witness_kind: "lean_kernel_checked_equivalence",
    witness_artifact_id: "ART-EQUIV-0001",
    witness_artifact_sha256: hashA,
    witness_artifact_path: writeVerifiedLeanRunManifest(),
    lemma_names: ["MathResearch.c0001_notation_equiv"],
    justification: "Kernel-checked equivalence lemma rewrites Lean notation to elaborated Nat.add form.",
    ...overrides
  };
}

function chain(overrides = {}) {
  return {
    formal_spec_statement: source,
    equivalent_signature: target,
    links: [
      link(),
      link({
        formal_spec_statement: middle,
        equivalent_signature: target,
        witness_artifact_id: "ART-EQUIV-0002",
        witness_artifact_sha256: hashB,
        witness_artifact_path: writeVerifiedLeanRunManifest(),
        lemma_names: ["MathResearch.c0001_eq_form_equiv"],
        justification: "Kernel-checked equivalence lemma rewrites equality notation to Eq form."
      })
    ],
    justification: "Service-owned transitive equivalence chain from locked spec through registered kernel-checked lemmas.",
    ...overrides
  };
}

function check(allowed_registered_transitive_logical_equivalences = []) {
  return checkStatementEquivalence({
    projectRoot,
    campaign_id: campaignId,
    claim_id: claimId,
    candidate_id: candidateId,
    reportPath: join(".comath", "evidence", "C-0001", "lean", `statement-transitive-${Math.random()}.json`),
    locked_statement_hash: "sha256:locked",
    formal_spec_statement: source,
    lean_check_output: `${target}\n`,
    theorem_name: "MathResearch.C0001",
    allowed_registered_transitive_logical_equivalences
  });
}

try {
  const accepted = check([chain()]);
  assert.equal(accepted.result, "pass");
  assert.equal(accepted.status, "logically_equivalent_with_registered_lemmas");
  assert.equal(accepted.equivalence_witness.kind, "registered_transitive_logical_equivalence");
  assert.equal(accepted.equivalence_witness.formal_spec_statement, source);
  assert.equal(accepted.equivalence_witness.equivalent_signature, target);
  assert.deepEqual(accepted.equivalence_witness.lemma_names, [
    "MathResearch.c0001_notation_equiv",
    "MathResearch.c0001_eq_form_equiv"
  ]);
  assert.equal(accepted.equivalence_witness.transitive_links.length, 2);
  assert.equal(accepted.equivalence_witness.transitive_links[0].witness_artifact_sha256, hashA);
  assert.equal(accepted.equivalence_witness.transitive_links[1].witness_artifact_sha256, hashB);

  const brokenEndpoint = check([
    chain({
      links: [
        link(),
        link({
          formal_spec_statement: "MathResearch.C0001 (n : Nat) : Nat.add 0 n = n",
          equivalent_signature: target,
          witness_artifact_id: "ART-EQUIV-0002",
          witness_artifact_sha256: hashB,
          lemma_names: ["MathResearch.c0001_eq_form_equiv"]
        })
      ]
    })
  ]);
  assert.equal(brokenEndpoint.result, "fail");
  assert.equal(brokenEndpoint.hard_vetoes.includes("statement_signature_mismatch"), true);

  const missingLink = check([chain({ links: [link()] })]);
  assert.equal(missingLink.result, "fail");
  assert.equal(missingLink.hard_vetoes.includes("statement_signature_mismatch"), true);

  const nonKernelWitness = check([
    chain({
      links: [
        link({ witness_kind: "human_reviewed_equivalence" }),
        link({
          formal_spec_statement: middle,
          equivalent_signature: target,
          witness_artifact_id: "ART-EQUIV-0002",
          witness_artifact_sha256: hashB,
          lemma_names: ["MathResearch.c0001_eq_form_equiv"]
        })
      ]
    })
  ]);
  assert.equal(nonKernelWitness.result, "fail");
  assert.equal(nonKernelWitness.hard_vetoes.includes("statement_signature_mismatch"), true);

  const missingHash = check([
    chain({
      links: [
        link({ witness_artifact_sha256: "" }),
        link({
          formal_spec_statement: middle,
          equivalent_signature: target,
          witness_artifact_id: "ART-EQUIV-0002",
          witness_artifact_sha256: hashB,
          lemma_names: ["MathResearch.c0001_eq_form_equiv"]
        })
      ]
    })
  ]);
  assert.equal(missingHash.result, "fail");
  assert.equal(missingHash.hard_vetoes.includes("statement_signature_mismatch"), true);

  const missingLemma = check([
    chain({
      links: [
        link(),
        link({
          formal_spec_statement: middle,
          equivalent_signature: target,
          witness_artifact_id: "ART-EQUIV-0002",
          witness_artifact_sha256: hashB,
          lemma_names: []
        })
      ]
    })
  ]);
  assert.equal(missingLemma.result, "fail");
  assert.equal(missingLemma.hard_vetoes.includes("statement_signature_mismatch"), true);
} finally {
  rmSync(projectRoot, { recursive: true, force: true });
}

console.log("Phase 78 Lean transitive logical-equivalence tests passed.");
