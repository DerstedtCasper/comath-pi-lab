import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import {
  checkDependencyClosureV2,
  createFinalReplayManifestV3,
  getComathdStatus,
  verifyFinalReplayManifestV3
} from "../../dist/index.js";

const projectRoot = mkdtempSync(join(tmpdir(), "comath-goal3-task217-dependency-lock-"));

function writeProjectFile(relativePath, content) {
  const path = join(projectRoot, relativePath);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, content, "utf8");
  return path;
}

function sha256Text(text) {
  return createHash("sha256").update(text).digest("hex");
}

function canonicalJson(value) {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map((item) => canonicalJson(item)).join(",")}]`;
  }
  const entries = Object.entries(value)
    .filter(([, item]) => item !== undefined)
    .sort(([left], [right]) => left.localeCompare(right));
  return `{${entries.map(([key, item]) => `${JSON.stringify(key)}:${canonicalJson(item)}`).join(",")}}`;
}

function hashRef(path) {
  const data = readFileSync(path);
  return { sha256: createHash("sha256").update(data).digest("hex"), size_bytes: statSync(path).size };
}

try {
  assert.ok(
    getComathdStatus().capabilities.includes("final_replay_dependency_lock_consistency_gate"),
    "Task217 service capability ledger must advertise the dependency-lock consistency verifier gate"
  );

  const claimId = "CLM-0217";
  const campaignId = "CAM-0217";
  const replayId = "RPLY-0217";
  const cleanRootRel = `.comath/lean/final_replay/${replayId}/clean`;
  const cleanRoot = join(projectRoot, cleanRootRel);
  const mathlibRev = "abcdef0123456789abcdef0123456789abcdef01";

  const target = writeProjectFile(
    `${cleanRootRel}/MathResearch/Target.lean`,
    [
      "import Mathlib",
      "",
      "namespace MathResearch",
      "#check Nat",
      "end MathResearch",
      ""
    ].join("\n")
  );
  const audit = writeProjectFile(`${cleanRootRel}/Audit/TargetAudit.lean`, "import MathResearch.Target\n#check Nat\n");
  const formalSpec = writeProjectFile(`${cleanRootRel}/FormalSpec/target.json`, JSON.stringify({ theorem_name: "MathResearch.Target.C0217" }));
  const lakefile = writeProjectFile(
    `${cleanRootRel}/lakefile.lean`,
    [
      "import Lake",
      "open Lake DSL",
      "package MathResearch where",
      `require mathlib from git "https://github.com/leanprover-community/mathlib4" @ "${mathlibRev}"`,
      "lean_lib MathResearch where",
      "  roots := #[`MathResearch.Target]",
      ""
    ].join("\n")
  );
  const toolchain = writeProjectFile(`${cleanRootRel}/lean-toolchain`, "leanprover/lean4:v4.23.0\n");
  const lakeManifest = writeProjectFile(
    `${cleanRootRel}/lake-manifest.json`,
    `${JSON.stringify(
      {
        version: 7,
        packages: [
          {
            name: "mathlib",
            url: "https://github.com/leanprover-community/mathlib4",
            rev: mathlibRev,
            license: "Apache-2.0"
          }
        ]
      },
      null,
      2
    )}\n`
  );
  writeProjectFile(`${cleanRootRel}/.lake/packages/mathlib/Mathlib.lean`, "import Mathlib.Algebra.Group.Basic\n");
  writeProjectFile(`${cleanRootRel}/.lake/packages/mathlib/Mathlib/Algebra/Group/Basic.lean`, "class Group (G : Type) where\n");

  const stdout = writeProjectFile(`.comath/evidence/${claimId}/lean/final_replay.log`, "Nat : Type\n");
  const stderr = writeProjectFile(`.comath/evidence/${claimId}/lean/final_replay.stderr.log`, "");
  const staticAudit = writeProjectFile(`.comath/evidence/${claimId}/lean/final_static_audit.json`, JSON.stringify({ result: "pass", hard_vetoes: [] }));
  const axiomProfile = writeProjectFile(`.comath/evidence/${claimId}/lean/axiom_profile.json`, JSON.stringify({ result: "pass", hard_vetoes: [] }));
  const statementEquivalence = writeProjectFile(`.comath/evidence/${claimId}/lean/statement_equivalence.json`, JSON.stringify({ result: "pass", hard_vetoes: [] }));
  const leanRunManifest = writeProjectFile(
    `.comath/evidence/${claimId}/lean/LRUN-0002.manifest.json`,
    JSON.stringify({ schema_version: "comath.lean_run_manifest.v3", runner: "comathd.LeanRunner", exit_code: 0 })
  );
  const dependencyClosureRel = `.comath/evidence/${claimId}/lean/dependency_closure.json`;
  const dependencyClosure = checkDependencyClosureV2({
    projectRoot,
    leanRoot: cleanRoot,
    toolchainFile: toolchain,
    lakefile,
    lakeManifestFile: lakeManifest,
    reportPath: dependencyClosureRel,
    allowedImportPrefixes: ["Mathlib", "Std", "Init", "Lake", "MathResearch", "Audit"],
    trustedExternalDependencies: ["mathlib"]
  });
  assert.equal(dependencyClosure.result, "pass");
  assert.equal(
    dependencyClosure.packages.some((pkg) => pkg.name === "mathlib" && typeof pkg.materialized_package_hash === "string"),
    true
  );
  const dependencyClosurePath = join(projectRoot, dependencyClosureRel);

  const sourceHashesBefore = {
    "MathResearch/Target.lean": hashRef(target),
    "Audit/TargetAudit.lean": hashRef(audit),
    "FormalSpec/target.json": hashRef(formalSpec),
    "lakefile.lean": hashRef(lakefile),
    "lean-toolchain": hashRef(toolchain),
    "lake-manifest.json": hashRef(lakeManifest)
  };
  const externalRevisions = dependencyClosure.packages.map((pkg) => ({
    name: pkg.name,
    revision: pkg.revision ?? null,
    url: pkg.url ?? null,
    license: pkg.license,
    source: pkg.source,
    trusted: pkg.trusted,
    build_status: pkg.build_status,
    ...(pkg.materialized_package_root ? { materialized_package_root: pkg.materialized_package_root } : {}),
    ...(pkg.materialized_package_hash ? { materialized_package_hash: pkg.materialized_package_hash } : {}),
    ...(pkg.materialized_file_hashes ? { materialized_file_hashes: pkg.materialized_file_hashes } : {}),
    ...(pkg.materialized_symlinks ? { materialized_symlinks: pkg.materialized_symlinks } : {})
  }));
  const manifest = createFinalReplayManifestV3({
    projectRoot,
    replay_id: replayId,
    campaign_id: campaignId,
    claim_id: claimId,
    theorem_name: "MathResearch.Target.C0217",
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
      dependency_closure: dependencyClosurePath,
      statement_equivalence: statementEquivalence
    },
    lean_run_manifest_paths: [leanRunManifest],
    dependency_lock: {
      lean_toolchain_path: toolchain,
      lake_manifest_path: lakeManifest,
      lakefile_path: lakefile,
      external_revisions: externalRevisions
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

  assert.equal(verifyFinalReplayManifestV3(projectRoot, manifest).ok, true);

  const shadowLakefile = writeProjectFile("shadow/lakefile.lean", readFileSync(lakefile, "utf8"));
  const tamperedLakefilePath = JSON.parse(JSON.stringify(manifest));
  tamperedLakefilePath.dependency_lock.lakefile_path = "shadow/lakefile.lean";
  tamperedLakefilePath.dependency_lock.lakefile_sha256 = hashRef(shadowLakefile).sha256;
  const lakefilePathCheck = verifyFinalReplayManifestV3(projectRoot, tamperedLakefilePath);
  assert.equal(
    lakefilePathCheck.ok,
    false,
    JSON.stringify({
      clean_workspace_path: tamperedLakefilePath.clean_workspace_path,
      lakefile_path: tamperedLakefilePath.dependency_lock.lakefile_path,
      result: lakefilePathCheck
    })
  );
  assert.ok(
    lakefilePathCheck.vetoes.includes("final_replay_dependency_lock_path_mismatch:lakefile"),
    "FinalReplayManifest verification must bind dependency-lock file paths to the clean workspace, not same-hash project-local substitutes"
  );

  const tamperedToolchainText = JSON.parse(JSON.stringify(manifest));
  tamperedToolchainText.dependency_lock.lean_toolchain = "leanprover/lean4:v4.22.0";
  const toolchainTextCheck = verifyFinalReplayManifestV3(projectRoot, tamperedToolchainText);
  assert.equal(toolchainTextCheck.ok, false);
  assert.ok(
    toolchainTextCheck.vetoes.includes("final_replay_dependency_lock_toolchain_mismatch"),
    "FinalReplayManifest verification must bind dependency-lock lean_toolchain text to the clean lean-toolchain file"
  );

  const tamperedLakefileHash = JSON.parse(JSON.stringify(manifest));
  tamperedLakefileHash.dependency_lock.lakefile_sha256 = hashRef(target).sha256;
  const lakefileHashCheck = verifyFinalReplayManifestV3(projectRoot, tamperedLakefileHash);
  assert.equal(lakefileHashCheck.ok, false);
  assert.ok(
    lakefileHashCheck.vetoes.some((veto) => veto.startsWith("final_replay_dependency_lock_hash_mismatch")),
    "FinalReplayManifest verification must recompute dependency-lock file hashes from the clean workspace"
  );

  const tamperedExternalRevisions = JSON.parse(JSON.stringify(manifest));
  tamperedExternalRevisions.dependency_lock.external_revisions[0].materialized_package_hash = "0".repeat(63) + "1";
  tamperedExternalRevisions.dependency_lock.external_revisions_sha256 = sha256Text(
    canonicalJson(tamperedExternalRevisions.dependency_lock.external_revisions)
  );
  const externalRevisionCheck = verifyFinalReplayManifestV3(projectRoot, tamperedExternalRevisions);
  assert.equal(externalRevisionCheck.ok, false);
  assert.ok(
    externalRevisionCheck.vetoes.includes("final_replay_dependency_lock_external_revisions_mismatch"),
    "FinalReplayManifest verification must bind dependency-lock external revisions to DependencyClosureV2 packages"
  );

  const tamperedExternalRevisionHash = JSON.parse(JSON.stringify(manifest));
  tamperedExternalRevisionHash.dependency_lock.external_revisions_sha256 = "f".repeat(64);
  const externalRevisionHashCheck = verifyFinalReplayManifestV3(projectRoot, tamperedExternalRevisionHash);
  assert.equal(externalRevisionHashCheck.ok, false);
  assert.ok(
    externalRevisionHashCheck.vetoes.includes("final_replay_dependency_lock_external_revisions_hash_mismatch"),
    "FinalReplayManifest verification must recompute dependency-lock external_revisions_sha256"
  );
} finally {
  rmSync(projectRoot, { recursive: true, force: true });
}

console.log("Goal 3 Task217 final replay dependency lock consistency tests passed.");
