import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdirSync, mkdtempSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import {
  createFinalReplayManifestV3,
  createServiceOwnedLeanRunManifestV3,
  packageGoal3GaPositiveMatrixFinalAuthorityEvidenceFromEvidenceV3,
  writeThirdPartyReplayPackV3
} from "../../dist/index.js";

const projectRoot = mkdtempSync(join(tmpdir(), "comath-goal3-task62-binding-"));

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

function canonicalJson(value) {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map((item) => canonicalJson(item)).join(",")}]`;
  }
  return `{${Object.entries(value)
    .filter(([, item]) => item !== undefined)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, item]) => `${JSON.stringify(key)}:${canonicalJson(item)}`)
    .join(",")}}`;
}

function sha256Text(text) {
  return createHash("sha256").update(text, "utf8").digest("hex");
}

const claimId = "C-0062";
const replayId = "RPLY-0062";
const taskId = "PM-062";
const cleanRootRel = `.comath/lean/final_replay/${replayId}/clean`;

const target = writeProjectFile(
  `${cleanRootRel}/MathResearch/Target.lean`,
  [
    "import Mathlib",
    "",
    "namespace MathResearch",
    "",
    "theorem Goal3Positive062 : True := by",
    "  trivial",
    "",
    "#check Goal3Positive062",
    "#print axioms Goal3Positive062",
    "",
    "end MathResearch",
    ""
  ].join("\n")
);
const audit = writeProjectFile(`${cleanRootRel}/Audit/TargetAudit.lean`, "import MathResearch.Target\n#check MathResearch.Goal3Positive062\n#print axioms MathResearch.Goal3Positive062\n");
const formalSpecLock = {
  schema_version: "comath.formal_spec_lock.v2",
  task_id: taskId,
  claim_id: claimId,
  namespace: "MathResearch",
  theorem_name: "Goal3Positive062",
  theorem_header: "theorem Goal3Positive062 : True",
  statement_hash: "pm062-locked-statement-hash",
  proof_authority: "none"
};
const assumptionLedger = {
  schema_version: "comath.assumption_ledger.v1",
  task_id: taskId,
  claim_id: claimId,
  formal_spec_lock_hash: formalSpecLock.statement_hash,
  entries: [],
  proof_authority: "none"
};
const formalSpec = writeProjectFile(`${cleanRootRel}/FormalSpec/target.json`, `${JSON.stringify(formalSpecLock, null, 2)}\n`);
const assumptionLedgerPath = writeProjectFile(`.comath/evidence/${claimId}/assumption_ledger.json`, `${JSON.stringify(assumptionLedger, null, 2)}\n`);
const lakefile = writeProjectFile(`${cleanRootRel}/lakefile.lean`, "import Lake\nopen Lake DSL\npackage MathResearch where\nlean_lib MathResearch where\n  roots := #[`MathResearch.Target]\n");
const toolchain = writeProjectFile(`${cleanRootRel}/lean-toolchain`, "leanprover/lean4:v4.23.0\n");
const lakeManifest = writeProjectFile(`${cleanRootRel}/lake-manifest.json`, `${JSON.stringify({ version: 7, packages: [] }, null, 2)}\n`);

const stdout = writeProjectFile(`.comath/evidence/${claimId}/lean/LRUN-0062.stdout.log`, "Goal3Positive062 checked\n");
const stderr = writeProjectFile(`.comath/evidence/${claimId}/lean/LRUN-0062.stderr.log`, "");
const leanRunManifest = createServiceOwnedLeanRunManifestV3({
  projectRoot,
  run_id: "LRUN-0062",
  claim_id: claimId,
  campaign_id: "CAM-0062",
  purpose: "final_replay",
  command: ["lake", "build", "MathResearch"],
  cwd: join(projectRoot, cleanRootRel),
  input_files: [target, audit, formalSpec, lakefile, toolchain, lakeManifest],
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
const leanRunManifestRel = `.comath/evidence/${claimId}/lean/LRUN-0062.manifest.json`;
writeProjectFile(leanRunManifestRel, `${JSON.stringify(leanRunManifest, null, 2)}\n`);

const staticAudit = writeProjectFile(`.comath/evidence/${claimId}/lean/final_static_audit.json`, `${JSON.stringify({ result: "pass", hard_vetoes: [] })}\n`);
const structuredAuditRel = `.comath/evidence/${claimId}/lean/structured_audit.json`;
writeProjectFile(
  structuredAuditRel,
  `${JSON.stringify({
    schema_version: "comath.structured_lean_audit.v3",
    theorem_name: "MathResearch.Goal3Positive062",
    fully_qualified_name: "MathResearch.Goal3Positive062",
    theorem_type_pretty: "True",
    theorem_type_elaborated_hash: "pm062-type-hash",
    source_file: "MathResearch/Target.lean",
    source_file_sha256: sha256(target),
    imports: ["Mathlib"],
    axiom_profile: [],
    environment_fingerprint: "pm062-env",
    generated_by_run_id: "LRUN-0062",
    result: "pass",
    hard_vetoes: []
  }, null, 2)}\n`
);
const axiomProfile = writeProjectFile(`.comath/evidence/${claimId}/lean/axiom_profile.json`, `${JSON.stringify({ result: "pass", detected_axioms: [], hard_vetoes: [] })}\n`);
const dependencyClosure = writeProjectFile(`.comath/evidence/${claimId}/lean/dependency_closure.json`, `${JSON.stringify({ result: "pass", hard_vetoes: [] })}\n`);
const statementCheck = writeProjectFile(`.comath/evidence/${claimId}/lean/statement_equivalence.json`, `${JSON.stringify({ result: "pass", locked_statement_hash: formalSpecLock.statement_hash, hard_vetoes: [] })}\n`);

const finalReplayManifest = createFinalReplayManifestV3({
  projectRoot,
  replay_id: replayId,
  campaign_id: "CAM-0062",
  claim_id: claimId,
  theorem_name: "MathResearch.Goal3Positive062",
  clean_workspace_path: join(projectRoot, cleanRootRel),
  command: ["lake", "build", "MathResearch"],
  exit_code: 0,
  result: "pass",
  source_hashes_before: {
    "MathResearch/Target.lean": hashRef(target),
    "Audit/TargetAudit.lean": hashRef(audit),
    "FormalSpec/target.json": hashRef(formalSpec),
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
const finalReplayManifestRel = `.comath/evidence/${claimId}/lean/final_replay_manifest_v3.json`;
writeProjectFile(finalReplayManifestRel, `${JSON.stringify(finalReplayManifest, null, 2)}\n`);
const replayPack = writeThirdPartyReplayPackV3(projectRoot, finalReplayManifest);

const forgedBindingEvidence = packageGoal3GaPositiveMatrixFinalAuthorityEvidenceFromEvidenceV3({
  projectRoot,
  taskId,
  claimId,
  evidence: {
    lean_run_manifest_paths: [leanRunManifestRel],
    final_replay_manifest_v3_path: finalReplayManifestRel,
    structured_audit_path: structuredAuditRel,
    dependency_closure_path: `.comath/evidence/${claimId}/lean/dependency_closure.json`,
    axiom_profile_path: `.comath/evidence/${claimId}/lean/axiom_profile.json`,
    statement_check_path: `.comath/evidence/${claimId}/lean/statement_equivalence.json`,
    third_party_replay_pack_path: replayPack.pack_path,
    formal_spec_lock_path: `.comath/evidence/${claimId}/forged_formal_spec_lock.json`,
    formal_spec_lock_sha256: "0".repeat(64),
    assumption_ledger_path: `.comath/evidence/${claimId}/assumption_ledger.json`,
    assumption_ledger_sha256: "1".repeat(64),
    dependency_lock_sha256: "2".repeat(64),
    artifact_hashes_sha256: "3".repeat(64),
    toolchain_sha256: "4".repeat(64),
    replay_manifest_sha256: "5".repeat(64)
  }
});

assert.equal(forgedBindingEvidence.final_evidence_status, "blocked_missing_final_evidence");
assert.equal(forgedBindingEvidence.proof_authority, "none");
assert.equal(forgedBindingEvidence.can_promote_claim, false);
assert.ok(forgedBindingEvidence.missing_final_evidence_classes.includes("formal_spec_lock_binding"));
assert.ok(forgedBindingEvidence.missing_final_evidence_classes.includes("assumption_ledger_binding"));
assert.ok(forgedBindingEvidence.missing_final_evidence_classes.includes("dependency_lock_binding"));
assert.ok(forgedBindingEvidence.missing_final_evidence_classes.includes("artifact_hash_binding"));
assert.ok(forgedBindingEvidence.missing_final_evidence_classes.includes("toolchain_hash_binding"));
assert.ok(forgedBindingEvidence.missing_final_evidence_classes.includes("replay_manifest_hash_binding"));

const correctlyBoundEvidence = packageGoal3GaPositiveMatrixFinalAuthorityEvidenceFromEvidenceV3({
  projectRoot,
  taskId,
  claimId,
  evidence: {
    lean_run_manifest_paths: [leanRunManifestRel],
    final_replay_manifest_v3_path: finalReplayManifestRel,
    structured_audit_path: structuredAuditRel,
    dependency_closure_path: `.comath/evidence/${claimId}/lean/dependency_closure.json`,
    axiom_profile_path: `.comath/evidence/${claimId}/lean/axiom_profile.json`,
    statement_check_path: `.comath/evidence/${claimId}/lean/statement_equivalence.json`,
    third_party_replay_pack_path: replayPack.pack_path,
    formal_spec_lock_path: `${cleanRootRel}/FormalSpec/target.json`,
    formal_spec_lock_sha256: sha256Text(canonicalJson(formalSpecLock)),
    assumption_ledger_path: `.comath/evidence/${claimId}/assumption_ledger.json`,
    assumption_ledger_sha256: sha256Text(canonicalJson(assumptionLedger)),
    dependency_lock_sha256: sha256Text(canonicalJson(finalReplayManifest.dependency_lock)),
    artifact_hashes_sha256: sha256Text(canonicalJson(finalReplayManifest.artifact_hashes)),
    toolchain_sha256: finalReplayManifest.dependency_lock.lean_toolchain_sha256,
    replay_manifest_sha256: sha256Text(canonicalJson(finalReplayManifest))
  }
});

assert.equal(correctlyBoundEvidence.final_evidence_status, "verified_final_authority_evidence");
assert.deepEqual(correctlyBoundEvidence.missing_final_evidence_classes, []);
assert.equal(correctlyBoundEvidence.proof_authority, "lean_kernel_clean_replay");
assert.equal(correctlyBoundEvidence.can_promote_claim, false, "binding verification still must not bypass the ordinary promotion gate");

console.log("Goal 3 Task 62 final authority binding integrity test passed.");
