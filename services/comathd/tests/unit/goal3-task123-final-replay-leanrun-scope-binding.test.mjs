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
  hasLeanLakeBinaryHashProvenanceV3,
  initProject,
  registerClaim
} from "../../dist/index.js";

const projectRoot = mkdtempSync(join(tmpdir(), "comath-goal3-task123-leanrun-scope-"));

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

function writeFinalReplayLeanRun({ claim, campaignId, replayId, runId, theoremName }) {
  const cleanRootRel = `.comath/lean/final_replay/${replayId}/clean`;
  const target = writeProjectFile(
    `${cleanRootRel}/MathResearch/Target.lean`,
    `import Mathlib\nnamespace MathResearch\ntheorem ${theoremName} : True := by\n  trivial\nend MathResearch\n`
  );
  const audit = writeProjectFile(`${cleanRootRel}/Audit/TargetAudit.lean`, `import MathResearch.Target\n#check MathResearch.${theoremName}\n`);
  const formalSpec = writeProjectFile(`${cleanRootRel}/FormalSpec/formal_spec_lock.json`, `${JSON.stringify({ claim_id: claim.id, theorem_name: theoremName })}\n`);
  const assumptionLedger = writeProjectFile(`${cleanRootRel}/FormalSpec/assumption_ledger.json`, `${JSON.stringify({ claim_id: claim.id, entries: [] })}\n`);
  const lakefile = writeProjectFile(`${cleanRootRel}/lakefile.lean`, "import Lake\nopen Lake DSL\npackage MathResearch where\nlean_lib MathResearch where\n  roots := #[`MathResearch.Target]\n");
  const toolchain = writeProjectFile(`${cleanRootRel}/lean-toolchain`, "leanprover/lean4:v4.23.0\n");
  const lakeManifest = writeProjectFile(`${cleanRootRel}/lake-manifest.json`, `${JSON.stringify({ version: 7, packages: [] }, null, 2)}\n`);
  const leanBinary = writeProjectFile(`${cleanRootRel}/bin/lean`, `dummy lean ${runId}\n`);
  const lakeBinary = writeProjectFile(`${cleanRootRel}/bin/lake`, `dummy lake ${runId}\n`);
  const stdout = writeProjectFile(`.comath/evidence/${claim.id}/lean/${runId}.stdout.log`, `${theoremName} checked\n`);
  const stderr = writeProjectFile(`.comath/evidence/${claim.id}/lean/${runId}.stderr.log`, "");

  const manifest = createServiceOwnedLeanRunManifestV3({
    projectRoot,
    run_id: runId,
    claim_id: claim.id,
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
  const manifestRel = `.comath/evidence/${claim.id}/lean/${runId}.manifest.json`;
  writeProjectFile(manifestRel, `${JSON.stringify(manifest, null, 2)}\n`);
  appendLeanRunManifestProvenanceIndexV1({
    projectRoot,
    project_id: claim.project_id,
    actor: "goal3-task123",
    manifest,
    manifest_path: manifestRel
  });
  return {
    cleanRootRel,
    target,
    audit,
    formalSpec,
    assumptionLedger,
    lakefile,
    toolchain,
    lakeManifest,
    leanBinary,
    lakeBinary,
    stdout,
    stderr,
    manifestRel
  };
}

function writeReport(claim, name, content) {
  return writeProjectFile(`.comath/evidence/${claim.id}/lean/${name}.json`, `${JSON.stringify(content)}\n`);
}

try {
  const { project } = initProject({ name: "Goal 3 Task 123 LeanRun Scope", root_path: projectRoot });
  const claimA = registerClaim(projectRoot, {
    project_id: project.project_id,
    statement: "theorem Goal3Task123A : True",
    assumptions: [],
    domain: "logic",
    status: "conjectural",
    actor: "goal3-task123"
  });
  const claimB = registerClaim(projectRoot, {
    project_id: project.project_id,
    statement: "theorem Goal3Task123B : True",
    assumptions: [],
    domain: "logic",
    status: "conjectural",
    actor: "goal3-task123"
  });

  const borrowed = writeFinalReplayLeanRun({
    claim: claimB,
    campaignId: "CAM-1232",
    replayId: "RPLY-1232",
    runId: "LRUN-1232",
    theoremName: "Goal3Task123B"
  });
  const finalReplay = createFinalReplayManifestV3({
    projectRoot,
    replay_id: "RPLY-1231",
    campaign_id: "CAM-1231",
    claim_id: claimA.id,
    theorem_name: "MathResearch.Goal3Task123A",
    clean_workspace_path: join(projectRoot, borrowed.cleanRootRel),
    command: ["lake", "build", "MathResearch"],
    exit_code: 0,
    result: "pass",
    source_hashes_before: {
      "MathResearch/Target.lean": hashRef(borrowed.target),
      "Audit/TargetAudit.lean": hashRef(borrowed.audit),
      "FormalSpec/formal_spec_lock.json": hashRef(borrowed.formalSpec),
      "FormalSpec/assumption_ledger.json": hashRef(borrowed.assumptionLedger),
      "lakefile.lean": hashRef(borrowed.lakefile),
      "lean-toolchain": hashRef(borrowed.toolchain),
      "lake-manifest.json": hashRef(borrowed.lakeManifest)
    },
    stdout_path: borrowed.stdout,
    stderr_path: borrowed.stderr,
    report_paths: {
      static_audit: writeReport(claimA, "static_audit", { result: "pass", hard_vetoes: [] }),
      axiom_profile: writeReport(claimA, "axiom_profile", { result: "pass", detected_axioms: [], hard_vetoes: [] }),
      dependency_closure: writeReport(claimA, "dependency_closure", { result: "pass", hard_vetoes: [] }),
      statement_equivalence: writeReport(claimA, "statement_equivalence", { result: "pass", hard_vetoes: [] })
    },
    lean_run_manifest_paths: [join(projectRoot, borrowed.manifestRel)],
    dependency_lock: {
      lean_toolchain_path: borrowed.toolchain,
      lake_manifest_path: borrowed.lakeManifest,
      lakefile_path: borrowed.lakefile,
      external_revisions: []
    },
    network_policy: "disabled",
    sandbox_policy: { network: "disabled", os_isolation: "process_boundary_only" },
    resource_budget: { timeout_ms: 30000, max_stdout_bytes: 65536, max_stderr_bytes: 65536 },
    binary_hashes: { lean: sha256(borrowed.leanBinary), lake: sha256(borrowed.lakeBinary) }
  });
  appendFinalReplayRegistryEntryV3(projectRoot, finalReplay, { project_id: project.project_id, actor: "goal3-task123" });

  assert.equal(
    hasLeanLakeBinaryHashProvenanceV3(projectRoot, finalReplay),
    false,
    "FinalReplayManifest binary provenance must not borrow an indexed final-replay LeanRunManifest from a different claim/campaign"
  );
} finally {
  rmSync(projectRoot, { recursive: true, force: true });
}

console.log("Goal 3 Task 123 final replay LeanRun scope binding tests passed.");
