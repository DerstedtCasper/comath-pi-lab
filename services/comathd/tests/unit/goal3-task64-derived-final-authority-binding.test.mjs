import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import {
  createFinalReplayManifestV3,
  createServiceOwnedLeanRunManifestV3,
  packageGoal3GaPositiveMatrixFinalAuthorityEvidenceWithDerivedBindingsV3,
  writeThirdPartyReplayPackV3
} from "../../dist/index.js";

const projectRoot = mkdtempSync(join(tmpdir(), "comath-goal3-task64-derived-binding-"));

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

const taskId = "PM-064";
const claimId = "C-0064";
const replayId = "RPLY-0064";
const cleanRootRel = `.comath/lean/final_replay/${replayId}/clean`;

const formalSpecLock = {
  schema_version: "comath.formal_spec_lock.v2",
  task_id: taskId,
  theorem_name: "Goal3Positive064",
  statement_hash: "pm064-locked-statement-hash",
  proof_authority: "none"
};
const assumptionLedger = {
  schema_version: "comath.assumption_ledger.v2",
  task_id: taskId,
  entries: [],
  proof_authority: "none"
};

const target = writeProjectFile(
  `${cleanRootRel}/MathResearch/Target.lean`,
  [
    "import Mathlib",
    "",
    "namespace MathResearch",
    "",
    "theorem Goal3Positive064 : True := by",
    "  trivial",
    "",
    "#check Goal3Positive064",
    "#print axioms Goal3Positive064",
    "",
    "end MathResearch",
    ""
  ].join("\n")
);
const audit = writeProjectFile(`${cleanRootRel}/Audit/TargetAudit.lean`, "import MathResearch.Target\n#check MathResearch.Goal3Positive064\n#print axioms MathResearch.Goal3Positive064\n");
const formalSpecRel = `${cleanRootRel}/FormalSpec/formal_spec_lock.json`;
const assumptionLedgerRel = `${cleanRootRel}/FormalSpec/assumption_ledger.json`;
const formalSpec = writeProjectFile(formalSpecRel, `${JSON.stringify(formalSpecLock, null, 2)}\n`);
const assumptionLedgerPath = writeProjectFile(assumptionLedgerRel, `${JSON.stringify(assumptionLedger, null, 2)}\n`);
const lakefile = writeProjectFile(`${cleanRootRel}/lakefile.lean`, "import Lake\nopen Lake DSL\npackage MathResearch where\nlean_lib MathResearch where\n  roots := #[`MathResearch.Target]\n");
const toolchain = writeProjectFile(`${cleanRootRel}/lean-toolchain`, "leanprover/lean4:v4.23.0\n");
const lakeManifest = writeProjectFile(`${cleanRootRel}/lake-manifest.json`, `${JSON.stringify({ version: 7, packages: [] }, null, 2)}\n`);

const stdout = writeProjectFile(`.comath/evidence/${claimId}/lean/LRUN-0064.stdout.log`, "Goal3Positive064 checked\n");
const stderr = writeProjectFile(`.comath/evidence/${claimId}/lean/LRUN-0064.stderr.log`, "");
const leanRunManifest = createServiceOwnedLeanRunManifestV3({
  projectRoot,
  run_id: "LRUN-0064",
  claim_id: claimId,
  campaign_id: "CAM-0064",
  purpose: "final_replay",
  command: ["lake", "build", "MathResearch"],
  cwd: join(projectRoot, cleanRootRel),
  input_files: [target, audit, formalSpec, assumptionLedgerPath, lakefile, toolchain, lakeManifest],
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
const leanRunManifestRel = `.comath/evidence/${claimId}/lean/LRUN-0064.manifest.json`;
writeProjectFile(leanRunManifestRel, `${JSON.stringify(leanRunManifest, null, 2)}\n`);

const structuredAuditRel = `.comath/evidence/${claimId}/lean/structured_audit.json`;
writeProjectFile(
  structuredAuditRel,
  `${JSON.stringify({
    schema_version: "comath.structured_lean_audit.v3",
    theorem_name: "MathResearch.Goal3Positive064",
    fully_qualified_name: "MathResearch.Goal3Positive064",
    theorem_type_pretty: "True",
    theorem_type_elaborated_hash: "pm064-type-hash",
    source_file: "MathResearch/Target.lean",
    source_file_sha256: sha256(target),
    imports: ["Mathlib"],
    axiom_profile: [],
    environment_fingerprint: "pm064-env",
    generated_by_run_id: "LRUN-0064",
    result: "pass",
    hard_vetoes: []
  }, null, 2)}\n`
);
const staticAudit = writeProjectFile(`.comath/evidence/${claimId}/lean/final_static_audit.json`, `${JSON.stringify({ result: "pass", hard_vetoes: [] })}\n`);
const axiomProfileRel = `.comath/evidence/${claimId}/lean/axiom_profile.json`;
const dependencyClosureRel = `.comath/evidence/${claimId}/lean/dependency_closure.json`;
const statementCheckRel = `.comath/evidence/${claimId}/lean/statement_equivalence.json`;
const axiomProfile = writeProjectFile(axiomProfileRel, `${JSON.stringify({ result: "pass", detected_axioms: [], hard_vetoes: [] })}\n`);
const dependencyClosure = writeProjectFile(dependencyClosureRel, `${JSON.stringify({ result: "pass", hard_vetoes: [] })}\n`);
const statementCheck = writeProjectFile(statementCheckRel, `${JSON.stringify({ result: "pass", locked_statement_hash: formalSpecLock.statement_hash, hard_vetoes: [] })}\n`);

const finalReplayManifest = createFinalReplayManifestV3({
  projectRoot,
  replay_id: replayId,
  campaign_id: "CAM-0064",
  claim_id: claimId,
  theorem_name: "MathResearch.Goal3Positive064",
  clean_workspace_path: join(projectRoot, cleanRootRel),
  command: ["lake", "build", "MathResearch"],
  exit_code: 0,
  result: "pass",
  source_hashes_before: {
    "MathResearch/Target.lean": hashRef(target),
    "Audit/TargetAudit.lean": hashRef(audit),
    "FormalSpec/formal_spec_lock.json": hashRef(formalSpec),
    "FormalSpec/assumption_ledger.json": hashRef(assumptionLedgerPath),
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

const report = packageGoal3GaPositiveMatrixFinalAuthorityEvidenceWithDerivedBindingsV3({
  projectRoot,
  taskId,
  claimId,
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

assert.equal(report.final_evidence_status, "verified_final_authority_evidence");
assert.equal(report.proof_authority, "lean_kernel_clean_replay");
assert.equal(report.can_promote_claim, false, "derived bindings must still require the ordinary promotion gate");
assert.equal(report.promotion_requires_gate, true);
assert.deepEqual(report.missing_final_evidence_classes, []);
for (const evidenceClass of [
  "formal_spec_lock_binding",
  "assumption_ledger_binding",
  "dependency_lock_binding",
  "artifact_hash_binding",
  "toolchain_hash_binding",
  "replay_manifest_hash_binding"
]) {
  assert.ok(report.source_verification.verified_final_evidence_classes.includes(evidenceClass), `${evidenceClass} must be derived and verified`);
}

const bindingManifestPath = join(projectRoot, `.comath/release/positive_matrix/${taskId}/derived_final_authority_bindings_v3.json`);
assert.ok(existsSync(bindingManifestPath), "derived binding manifest must be persisted as project-local evidence");
const bindingManifest = JSON.parse(readFileSync(bindingManifestPath, "utf8"));
assert.equal(bindingManifest.schema_version, "comath.final_authority_derived_bindings.v3");
assert.equal(bindingManifest.task_id, taskId);
assert.equal(bindingManifest.claim_id, claimId);
assert.equal(bindingManifest.proof_authority, "none");
assert.equal(bindingManifest.can_promote_claim, false);
assert.equal(bindingManifest.formal_spec_lock_sha256, sha256Text(canonicalJson(formalSpecLock)));
assert.equal(bindingManifest.assumption_ledger_sha256, sha256Text(canonicalJson(assumptionLedger)));
assert.equal(bindingManifest.dependency_lock_sha256, sha256Text(canonicalJson(finalReplayManifest.dependency_lock)));
assert.equal(bindingManifest.artifact_hashes_sha256, sha256Text(canonicalJson(finalReplayManifest.artifact_hashes)));
assert.equal(bindingManifest.toolchain_sha256, finalReplayManifest.dependency_lock.lean_toolchain_sha256);
assert.equal(bindingManifest.replay_manifest_sha256, sha256Text(canonicalJson(finalReplayManifest)));
assert.equal(bindingManifest.caller_supplied_hashes_trusted, false);

console.log("Goal 3 Task 64 derived final-authority binding test passed.");
