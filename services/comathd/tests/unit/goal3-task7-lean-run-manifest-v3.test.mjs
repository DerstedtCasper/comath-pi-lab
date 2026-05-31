import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, relative } from "node:path";
import {
  createServiceOwnedLeanRunManifestV3,
  parseLeanToolchainMetadata,
  runServiceOwnedLeanCommandV3,
  verifyLeanRunManifestV3Evidence
} from "../../dist/index.js";

const projectRoot = mkdtempSync(join(tmpdir(), "comath-goal3-task7-"));

function writeProjectFile(relativePath, content) {
  const path = join(projectRoot, relativePath);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, content, "utf8");
  return path;
}

function sha256File(path) {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}

function size(path) {
  return statSync(path).size;
}

try {
  const leanRoot = writeProjectFile("LeanSmoke.lean", "#check Nat\n");
  const toolchain = writeProjectFile("lean-toolchain", "leanprover/lean4:v4.23.0\n");
  const lakefile = writeProjectFile("lakefile.lean", "import Lake\nopen Lake DSL\npackage MathResearch\n");
  const stdout = writeProjectFile(".comath/evidence/CLM-0001/lean/RUN-0001.stdout.log", "Nat : Type\n");
  const stderr = writeProjectFile(".comath/evidence/CLM-0001/lean/RUN-0001.stderr.log", "");

  const metadata = parseLeanToolchainMetadata({
    leanVersionOutput: "Lean (version 4.23.0, x86_64-unknown-linux-gnu, commit abcdef)",
    lakeVersionOutput: "Lake version 5.0.0-src+abcdef (Lean version 4.23.0)",
    leanToolchain: "leanprover/lean4:v4.23.0"
  });

  const manifest = createServiceOwnedLeanRunManifestV3({
    projectRoot,
    run_id: "LRUN-0001",
    claim_id: "CLM-0001",
    campaign_id: "CAM-0001",
    purpose: "check",
    command: ["lake", "env", "lean", "LeanSmoke.lean"],
    cwd: projectRoot,
    input_files: [leanRoot, toolchain, lakefile],
    lean_version: metadata.lean_version,
    lake_version: metadata.lake_version,
    elan_toolchain: metadata.elan_toolchain,
    lean_toolchain_file: toolchain,
    lake_manifest_file: undefined,
    network_policy: "disabled",
    sandbox: "none",
    exit_code: 0,
    stdout_path: stdout,
    stderr_path: stderr,
    started_at: "2026-05-30T00:00:00.000Z",
    ended_at: "2026-05-30T00:00:01.000Z",
    proof_authority: "lean_kernel_check"
  });

  assert.equal(manifest.schema_version, "comath.lean_run_manifest.v3");
  assert.equal(manifest.runner, "comathd.LeanRunner");
  assert.equal(manifest.proof_authority, "lean_kernel_check");
  assert.equal(manifest.lean_toolchain_file_sha256, sha256File(toolchain));
  assert.equal(manifest.stdout_sha256, sha256File(stdout));
  assert.equal(manifest.stderr_sha256, sha256File(stderr));
  assert.deepEqual(
    manifest.input_files.find((entry) => entry.path === "LeanSmoke.lean"),
    { path: "LeanSmoke.lean", sha256: sha256File(leanRoot), size_bytes: size(leanRoot) }
  );

  const ok = verifyLeanRunManifestV3Evidence(projectRoot, manifest);
  assert.equal(ok.ok, true);
  assert.deepEqual(ok.vetoes, []);

  const agentWritten = { ...manifest, runner: "agent.V5LeanSprinter" };
  const agentCheck = verifyLeanRunManifestV3Evidence(projectRoot, agentWritten);
  assert.equal(agentCheck.ok, false);
  assert.equal(agentCheck.vetoes.includes("lean_run_manifest_not_service_owned"), true);

  const fakePassLog = {
    ...manifest,
    runner: "comathd.LeanRunner",
    stdout_sha256: "0".repeat(64)
  };
  const fakePassCheck = verifyLeanRunManifestV3Evidence(projectRoot, fakePassLog);
  assert.equal(fakePassCheck.ok, false);
  assert.equal(fakePassCheck.vetoes.includes("lean_stdout_hash_mismatch"), true);

  const pathDrift = {
    ...manifest,
    stdout_path: relative(projectRoot, stderr).replace(/\\/g, "/"),
    stdout_sha256: sha256File(stdout)
  };
  const pathCheck = verifyLeanRunManifestV3Evidence(projectRoot, pathDrift);
  assert.equal(pathCheck.ok, false);
  assert.equal(pathCheck.vetoes.includes("lean_stdout_hash_mismatch"), true);

  assert.throws(
    () =>
      parseLeanToolchainMetadata({
        leanVersionOutput: "Lean version unknown",
        lakeVersionOutput: "Lake version 5.0.0-src+abcdef (Lean version 4.23.0)",
        leanToolchain: "leanprover/lean4:v4.23.0"
      }),
    /lean_version_unknown/
  );
  assert.throws(
    () =>
      parseLeanToolchainMetadata({
        leanVersionOutput: "Lean (version 4.23.0, x86_64-unknown-linux-gnu)",
        lakeVersionOutput: "",
        leanToolchain: "leanprover/lean4:v4.23.0"
      }),
    /lake_version_missing/
  );
  assert.throws(
    () =>
      parseLeanToolchainMetadata({
        leanVersionOutput: "Lean (version 4.23.0, x86_64-unknown-linux-gnu)",
        lakeVersionOutput: "Lake version 5.0.0-src+abcdef (Lean version 4.23.0)",
        leanToolchain: ""
      }),
    /lean_toolchain_missing/
  );
  assert.throws(
    () =>
      parseLeanToolchainMetadata({
        leanVersionOutput: "Lean (version 4.23.0, x86_64-unknown-linux-gnu)",
        lakeVersionOutput: "Lake version 5.0.0-src+abcdef (Lean version 4.23.0)",
        leanToolchain: "leanprover/lean4:v4.22.0"
      }),
    /lean_toolchain_mismatch/
  );

  const serviceRun = runServiceOwnedLeanCommandV3({
    projectRoot,
    run_id: "LRUN-0002",
    claim_id: "CLM-0001",
    campaign_id: "CAM-0001",
    purpose: "audit",
    command: ["lake", "env", "lean", "LeanSmoke.lean"],
    cwd: projectRoot,
    input_files: [leanRoot, toolchain, lakefile],
    leanVersionOutput: "Lean (version 4.23.0, x86_64-unknown-linux-gnu)",
    lakeVersionOutput: "Lake version 5.0.0-src+abcdef (Lean version 4.23.0)",
    leanToolchain: "leanprover/lean4:v4.23.0",
    network_policy: "disabled",
    sandbox: "none",
    proof_authority: "none",
    run: () => ({ exit_code: 1, stdout: "", stderr: "synthetic command failed before Lean authority" })
  });

  assert.equal(serviceRun.manifest.runner, "comathd.LeanRunner");
  assert.equal(serviceRun.manifest.exit_code, 1);
  assert.equal(readFileSync(join(projectRoot, serviceRun.manifest.stderr_path), "utf8"), "synthetic command failed before Lean authority");
  assert.equal(verifyLeanRunManifestV3Evidence(projectRoot, serviceRun.manifest).ok, true);

  assert.throws(
    () =>
      runServiceOwnedLeanCommandV3({
        projectRoot,
        run_id: "LRUN-0002",
        claim_id: "CLM-0001",
        campaign_id: "CAM-0001",
        purpose: "audit",
        command: ["lake", "env", "lean", "LeanSmoke.lean"],
        cwd: projectRoot,
        input_files: [leanRoot, toolchain, lakefile],
        leanVersionOutput: "Lean (version 4.23.0, x86_64-unknown-linux-gnu)",
        lakeVersionOutput: "Lake version 5.0.0-src+abcdef (Lean version 4.23.0)",
        leanToolchain: "leanprover/lean4:v4.23.0",
        network_policy: "disabled",
        sandbox: "none",
        proof_authority: "none",
        run: () => ({ exit_code: 0, stdout: "second run must not overwrite", stderr: "overwritten" })
      }),
    /lean_run_manifest_append_only_violation/
  );
  assert.equal(readFileSync(join(projectRoot, serviceRun.manifest.stderr_path), "utf8"), "synthetic command failed before Lean authority");
} finally {
  rmSync(projectRoot, { recursive: true, force: true });
}

console.log("Goal 3 Task 7 LeanRunManifest v3 tests passed.");
