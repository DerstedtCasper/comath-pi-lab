import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import {
  appendFinalReplayRegistryEntryV3,
  createFinalReplayManifestV3,
  verifyFinalReplayManifestV3,
  writeThirdPartyReplayPackV3
} from "../../dist/index.js";

const projectRoot = mkdtempSync(join(tmpdir(), "comath-goal3-task8-"));

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

try {
  const claimId = "CLM-0001";
  const campaignId = "CAM-0001";
  const replayId = "RPLY-0001";
  const cleanRootRel = `.comath/lean/final_replay/${replayId}/clean`;
  const cleanRoot = join(projectRoot, cleanRootRel);
  const target = writeProjectFile(`${cleanRootRel}/MathResearch/Target.lean`, "import Std\n#check Nat\n");
  const audit = writeProjectFile(`${cleanRootRel}/Audit/TargetAudit.lean`, "#check Nat\n");
  const formalSpec = writeProjectFile(`${cleanRootRel}/FormalSpec/target.json`, JSON.stringify({ theorem_name: "MathResearch.Target.C0001" }));
  const lakefile = writeProjectFile(`${cleanRootRel}/lakefile.lean`, "import Lake\nopen Lake DSL\npackage MathResearch\n");
  const toolchain = writeProjectFile(`${cleanRootRel}/lean-toolchain`, "leanprover/lean4:v4.23.0\n");
  const lakeManifest = writeProjectFile(`${cleanRootRel}/lake-manifest.json`, JSON.stringify({ packages: [] }));
  const stdout = writeProjectFile(`.comath/evidence/${claimId}/lean/final_replay.log`, "Nat : Type\n");
  const stderr = writeProjectFile(`.comath/evidence/${claimId}/lean/final_replay.stderr.log`, "");
  const staticAudit = writeProjectFile(`.comath/evidence/${claimId}/lean/final_static_audit.json`, JSON.stringify({ result: "pass", hard_vetoes: [] }));
  const axiomProfile = writeProjectFile(`.comath/evidence/${claimId}/lean/axiom_profile.json`, JSON.stringify({ result: "pass", hard_vetoes: [] }));
  const dependencyClosure = writeProjectFile(`.comath/evidence/${claimId}/lean/dependency_closure.json`, JSON.stringify({ result: "pass", hard_vetoes: [] }));
  const statementEquivalence = writeProjectFile(`.comath/evidence/${claimId}/lean/statement_equivalence.json`, JSON.stringify({ result: "pass", hard_vetoes: [] }));
  const leanRunManifest = writeProjectFile(
    `.comath/evidence/${claimId}/lean/LRUN-0001.manifest.json`,
    JSON.stringify({ schema_version: "comath.lean_run_manifest.v3", runner: "comathd.LeanRunner", exit_code: 0 })
  );

  const sourceHashesBefore = {
    "MathResearch/Target.lean": hashRef(target),
    "Audit/TargetAudit.lean": hashRef(audit),
    "FormalSpec/target.json": hashRef(formalSpec),
    "lakefile.lean": hashRef(lakefile),
    "lean-toolchain": hashRef(toolchain),
    "lake-manifest.json": hashRef(lakeManifest)
  };
  const manifest = createFinalReplayManifestV3({
    projectRoot,
    replay_id: replayId,
    campaign_id: campaignId,
    claim_id: claimId,
    theorem_name: "MathResearch.Target.C0001",
    clean_workspace_path: cleanRoot,
    command: ["lake", "build", "MathResearch.Target"],
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
    lean_run_manifest_paths: [leanRunManifest],
    dependency_lock: {
      lean_toolchain_path: toolchain,
      lake_manifest_path: lakeManifest,
      lakefile_path: lakefile,
      external_revisions: []
    },
    network_policy: "disabled",
    sandbox_policy: {
      network: "disabled",
      os_isolation: "process_boundary_only"
    },
    resource_budget: {
      timeout_ms: 30000,
      max_stdout_bytes: 65536,
      max_stderr_bytes: 65536
    }
  });

  assert.equal(manifest.schema_version, "comath.final_replay_manifest.v3");
  assert.equal(manifest.runner, "comathd.LeanAuthority");
  assert.equal(manifest.proof_authority, "lean_kernel_clean_replay");
  assert.equal(manifest.clean_workspace_sha256.length, 64);
  assert.equal(manifest.source_hashes_before["MathResearch/Target.lean"].sha256, sha256(target));
  assert.equal(manifest.source_hashes_after["MathResearch/Target.lean"].sha256, sha256(target));
  assert.equal(manifest.dependency_lock.lean_toolchain_sha256, sha256(toolchain));
  assert.equal(manifest.dependency_lock.lake_manifest_sha256, sha256(lakeManifest));
  assert.equal(manifest.no_symlink_escape, true);

  const registry = appendFinalReplayRegistryEntryV3(projectRoot, manifest);
  assert.equal(existsSync(join(projectRoot, registry.registry_path)), true);
  assert.throws(() => appendFinalReplayRegistryEntryV3(projectRoot, manifest), /final_replay_registry_append_only_violation/);

  const pack = writeThirdPartyReplayPackV3(projectRoot, manifest);
  assert.equal(existsSync(join(projectRoot, pack.pack_path, "README_REPLAY.md")), true);
  assert.equal(existsSync(join(projectRoot, pack.pack_path, "expected_hashes.json")), true);
  assert.equal(readFileSync(join(projectRoot, pack.pack_path, "README_REPLAY.md"), "utf8").includes(projectRoot), false);
  assert.equal(readFileSync(join(projectRoot, pack.pack_path, "expected_hashes.json"), "utf8").includes(projectRoot), false);

  const ok = verifyFinalReplayManifestV3(projectRoot, manifest);
  assert.equal(ok.ok, true);
  assert.deepEqual(ok.vetoes, []);

  writeFileSync(target, "import Std\n#check String\n", "utf8");
  const drift = verifyFinalReplayManifestV3(projectRoot, manifest);
  assert.equal(drift.ok, false);
  assert.equal(drift.vetoes.includes("final_replay_source_hash_after_mismatch"), true);

  const unpinned = JSON.parse(JSON.stringify(manifest));
  delete unpinned.dependency_lock.lake_manifest_sha256;
  const unpinnedCheck = verifyFinalReplayManifestV3(projectRoot, unpinned);
  assert.equal(unpinnedCheck.ok, false);
  assert.equal(unpinnedCheck.vetoes.includes("final_replay_dependency_unpinned"), true);

  const network = { ...manifest, network_policy: "unknown" };
  const networkCheck = verifyFinalReplayManifestV3(projectRoot, network);
  assert.equal(networkCheck.ok, false);
  assert.equal(networkCheck.vetoes.includes("final_replay_network_policy_untrusted"), true);

  const symlink = { ...manifest, no_symlink_escape: false };
  const symlinkCheck = verifyFinalReplayManifestV3(projectRoot, symlink);
  assert.equal(symlinkCheck.ok, false);
  assert.equal(symlinkCheck.vetoes.includes("final_replay_symlink_escape"), true);
} finally {
  rmSync(projectRoot, { recursive: true, force: true });
}

console.log("Goal 3 Task 8 Lean Authority v3 final replay tests passed.");
