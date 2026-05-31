import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import {
  createFinalReplayManifestV3,
  createGoal3GaPm002ReplayMaterialPackPreflight,
  createServiceOwnedLeanRunManifestV3,
  executeGoal3GaPm002LeanAuthorityReplay,
  packageGoal3GaPm002FinalAuthorityEvidence,
  verifyFinalReplayManifestV3,
  writeThirdPartyReplayPackV3
} from "../../dist/index.js";

const projectRoot = mkdtempSync(join(tmpdir(), "comath-goal3-task42-pm002-final-"));
const preflight = createGoal3GaPm002ReplayMaterialPackPreflight({ projectRoot });

const commandReport = executeGoal3GaPm002LeanAuthorityReplay({
  projectRoot,
  materialSource: preflight.material_source,
  probeLeanVersion: () => ({ exit_code: 0, stdout: "Lean (version 4.23.0, x86_64-unknown, commit abc)", stderr: "" }),
  probeLakeVersion: () => ({ exit_code: 0, stdout: "Lake version 5.0.0", stderr: "" }),
  runReplayCommand: (command) => ({ exit_code: 0, stdout: `${command.join(" ")} ok`, stderr: "" })
});

assert.equal(commandReport.blocker_code, "lean_authority_evidence_incomplete");

const blocked = packageGoal3GaPm002FinalAuthorityEvidence({
  projectRoot,
  materialSource: preflight.material_source,
  commandReplayReport: commandReport
});

assert.equal(blocked.schema_version, "comath.goal3_pm002_final_authority_packaging.v1");
assert.equal(blocked.task_id, "PM-002");
assert.equal(blocked.final_evidence_status, "blocked_missing_final_evidence");
assert.equal(blocked.blocker_code, "final_authority_evidence_incomplete");
assert.equal(blocked.proof_authority, "none");
assert.equal(blocked.can_promote_claim, false);
assert.ok(blocked.missing_final_evidence_classes.includes("final_replay_manifest_v3"));
assert.ok(blocked.missing_final_evidence_classes.includes("structured_audit"));
assert.ok(blocked.missing_final_evidence_classes.includes("dependency_closure"));
assert.ok(blocked.missing_final_evidence_classes.includes("axiom_profile"));
assert.ok(blocked.missing_final_evidence_classes.includes("statement_check"));
assert.ok(blocked.missing_final_evidence_classes.includes("third_party_replay_pack"));
assert.equal(blocked.lean_run_manifest_paths.length, 2);
assert.ok(existsSync(join(projectRoot, blocked.blocker_path)), "missing final-evidence blocker must be persisted");

function writeProjectFile(relativePath, content) {
  const path = join(projectRoot, relativePath);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, content, "utf8");
  return path;
}

function sha256(path) {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}

function hashRef(path) {
  return { sha256: sha256(path), size_bytes: statSync(path).size };
}

const claimId = "C-0002";
const replayId = "RPLY-0002";
const cleanRootRel = `.comath/lean/final_replay/${replayId}/clean`;
const cleanRoot = join(projectRoot, cleanRootRel);
const target = writeProjectFile(`${cleanRootRel}/MathResearch/Target.lean`, readFileSync(join(projectRoot, preflight.material_source.lean_source_path), "utf8"));
const audit = writeProjectFile(`${cleanRootRel}/Audit/TargetAudit.lean`, "import MathResearch.Target\n#check MathResearch.Goal3Positive002\n#print axioms MathResearch.Goal3Positive002\n");
const formalSpec = writeProjectFile(`${cleanRootRel}/FormalSpec/target.json`, readFileSync(join(projectRoot, preflight.material_source.formal_spec_lock_path), "utf8"));
const lakefile = writeProjectFile(`${cleanRootRel}/lakefile.lean`, readFileSync(join(projectRoot, preflight.material_source.lakefile_path), "utf8"));
const toolchain = writeProjectFile(`${cleanRootRel}/lean-toolchain`, readFileSync(join(projectRoot, preflight.material_source.lean_toolchain_path), "utf8"));
const lakeManifest = writeProjectFile(`${cleanRootRel}/lake-manifest.json`, readFileSync(join(projectRoot, preflight.material_source.lake_manifest_path), "utf8"));

const stdout = writeProjectFile(`.comath/evidence/${claimId}/lean/final_replay.log`, "MathResearch.Goal3Positive002 : Nat.zero = Nat.zero\n");
const stderr = writeProjectFile(`.comath/evidence/${claimId}/lean/final_replay.stderr.log`, "");
const staticAudit = writeProjectFile(`.comath/evidence/${claimId}/lean/final_static_audit.json`, JSON.stringify({ result: "pass", hard_vetoes: [] }));
const structuredAuditRel = `.comath/evidence/${claimId}/lean/structured_audit.json`;
writeProjectFile(
  structuredAuditRel,
  JSON.stringify({
    schema_version: "comath.structured_lean_audit.v3",
    theorem_name: "MathResearch.Goal3Positive002",
    fully_qualified_name: "MathResearch.Goal3Positive002",
    theorem_type_pretty: "Nat.zero = Nat.zero",
    result: "pass",
    hard_vetoes: [],
    generated_by_run_id: "LRUN-0003"
  })
);
const axiomProfile = writeProjectFile(`.comath/evidence/${claimId}/lean/axiom_profile.json`, JSON.stringify({ result: "pass", detected_axioms: [], hard_vetoes: [] }));
const dependencyClosure = writeProjectFile(`.comath/evidence/${claimId}/lean/dependency_closure.json`, JSON.stringify({ result: "pass", hard_vetoes: [] }));
const statementEquivalence = writeProjectFile(`.comath/evidence/${claimId}/lean/statement_equivalence.json`, JSON.stringify({ result: "pass", hard_vetoes: [] }));
const finalRunManifest = createServiceOwnedLeanRunManifestV3({
  projectRoot,
  run_id: "LRUN-0003",
  claim_id: claimId,
  campaign_id: "CAM-0002",
  purpose: "final_replay",
  command: ["lake", "build", "MathResearch"],
  cwd: cleanRoot,
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
  started_at: new Date().toISOString(),
  ended_at: new Date().toISOString(),
  proof_authority: "lean_kernel_check"
});
const finalRunManifestRel = ".comath/evidence/C-0002/lean/LRUN-0003.manifest.json";
writeProjectFile(finalRunManifestRel, `${JSON.stringify(finalRunManifest, null, 2)}\n`);
const commandBlockerPath = commandReport.executor_blocker_path;
const commandBlocker = JSON.parse(readFileSync(join(projectRoot, commandBlockerPath), "utf8"));
commandBlocker.lean_run_manifest_paths = [...commandBlocker.lean_run_manifest_paths, finalRunManifestRel];
writeProjectFile(commandBlockerPath, `${JSON.stringify(commandBlocker, null, 2)}\n`);

const sourceHashesBefore = {
  "MathResearch/Target.lean": hashRef(target),
  "Audit/TargetAudit.lean": hashRef(audit),
  "FormalSpec/target.json": hashRef(formalSpec),
  "lakefile.lean": hashRef(lakefile),
  "lean-toolchain": hashRef(toolchain),
  "lake-manifest.json": hashRef(lakeManifest)
};
const finalReplayManifest = createFinalReplayManifestV3({
  projectRoot,
  replay_id: replayId,
  campaign_id: "CAM-0002",
  claim_id: claimId,
  theorem_name: "MathResearch.Goal3Positive002",
  clean_workspace_path: cleanRoot,
  command: ["lake", "build", "MathResearch"],
  exit_code: 0,
  result: "pass",
  source_hashes_before: sourceHashesBefore,
  stdout_path: stdout,
  stderr_path: stderr,
  report_paths: {
    static_audit: staticAudit,
    axiom_profile: axiomProfile,
    dependency_closure: dependencyClosure,
    statement_equivalence: statementEquivalence
  },
  lean_run_manifest_paths: [join(projectRoot, ".comath/evidence/C-0002/lean/LRUN-0003.manifest.json")],
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
assert.equal(verifyFinalReplayManifestV3(projectRoot, finalReplayManifest).ok, true);

const finalReplayManifestRel = `.comath/evidence/${claimId}/lean/final_replay_manifest_v3.json`;
const failedFinalReplayManifest = { ...finalReplayManifest, result: "fail", exit_code: 1 };
writeProjectFile(finalReplayManifestRel, JSON.stringify(failedFinalReplayManifest, null, 2));
const failedFinal = packageGoal3GaPm002FinalAuthorityEvidence({
  projectRoot,
  materialSource: { ...preflight.material_source, final_replay_manifest_v3_path: finalReplayManifestRel, structured_audit_path: structuredAuditRel },
  commandReplayReport: commandReport
});
assert.equal(failedFinal.final_evidence_status, "blocked_missing_final_evidence");
assert.ok(failedFinal.missing_final_evidence_classes.includes("final_replay_manifest_v3"));

writeProjectFile(finalReplayManifestRel, JSON.stringify(finalReplayManifest, null, 2));
const replayPack = writeThirdPartyReplayPackV3(projectRoot, finalReplayManifest);

const finalMaterialSource = {
  ...preflight.material_source,
  lean_run_manifest_v3_path: ".comath/evidence/C-0002/lean/LRUN-0003.manifest.json",
  final_replay_manifest_v3_path: finalReplayManifestRel,
  structured_audit_path: structuredAuditRel,
  third_party_replay_pack_path: replayPack.pack_path,
  lean_run_manifest_id: "LRUN-0003",
  final_replay_manifest_id: replayId
};

const packaged = packageGoal3GaPm002FinalAuthorityEvidence({
  projectRoot,
  materialSource: finalMaterialSource,
  commandReplayReport: commandReport
});

assert.equal(packaged.final_evidence_status, "verified_final_authority_evidence");
assert.equal(packaged.blocker_code, "");
assert.deepEqual(packaged.missing_final_evidence_classes, []);
assert.equal(packaged.proof_authority, "lean_kernel_clean_replay");
assert.equal(packaged.can_promote_claim, false, "packaging alone must not bypass the promotion gate");
assert.equal(packaged.promotion_requires_gate, true);
assert.equal(packaged.final_replay_manifest_v3_path, finalReplayManifestRel);
assert.equal(packaged.structured_audit_path, structuredAuditRel);
assert.equal(packaged.third_party_replay_pack_path, replayPack.pack_path);
assert.ok(existsSync(join(projectRoot, packaged.packaging_report_path)));

console.log("Goal 3 Task 42 PM-002 final authority packaging test passed.");
