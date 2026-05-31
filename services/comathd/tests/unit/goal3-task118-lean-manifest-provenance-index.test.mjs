import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import {
  initProject,
  readAuditEvents,
  runServiceOwnedLeanCommandV3,
  verifyLeanRunManifestV3Evidence
} from "../../dist/index.js";

const projectRoot = mkdtempSync(join(tmpdir(), "comath-goal3-task118-"));

function writeProjectFile(relativePath, content) {
  const path = join(projectRoot, relativePath);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, content, "utf8");
  return path;
}

function sha256File(path) {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}

function readJsonl(path) {
  return readFileSync(path, "utf8")
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line) => JSON.parse(line));
}

try {
  const { project } = initProject({ name: "Goal 3 Task 118", root_path: projectRoot });
  const claimId = "CLM-0118";
  const leanRoot = writeProjectFile("LeanSmoke.lean", "#check True\n");
  const toolchain = writeProjectFile("lean-toolchain", "leanprover/lean4:v4.23.0\n");
  const lakefile = writeProjectFile("lakefile.lean", "import Lake\nopen Lake DSL\npackage MathResearch\n");

  const run = runServiceOwnedLeanCommandV3({
    projectRoot,
    project_id: project.project_id,
    actor: "goal3-task118",
    run_id: "LRUN-0118",
    claim_id: claimId,
    campaign_id: "CAM-0118",
    candidate_id: "CAND-0118",
    purpose: "check",
    command: ["lake", "env", "lean", "LeanSmoke.lean"],
    cwd: projectRoot,
    input_files: [leanRoot, toolchain, lakefile],
    leanVersionOutput: "Lean (version 4.23.0, x86_64-unknown-linux-gnu)",
    lakeVersionOutput: "Lake version 5.0.0-src+abcdef (Lean version 4.23.0)",
    leanToolchain: "leanprover/lean4:v4.23.0",
    network_policy: "disabled",
    sandbox: "none",
    proof_authority: "lean_kernel_check",
    run: () => ({ exit_code: 0, stdout: "Task118 checked\n", stderr: "" })
  });

  assert.equal(verifyLeanRunManifestV3Evidence(projectRoot, run.manifest).ok, true);

  const manifestRel = `.comath/evidence/${claimId}/lean/LRUN-0118.manifest.json`;
  const indexPath = join(projectRoot, `.comath/evidence/${claimId}/lean/lean_run_manifest_index.jsonl`);
  const indexRows = readJsonl(indexPath);
  assert.equal(indexRows.length, 1);
  assert.deepEqual(
    {
      schema_version: indexRows[0].schema_version,
      claim_id: indexRows[0].claim_id,
      campaign_id: indexRows[0].campaign_id,
      candidate_id: indexRows[0].candidate_id,
      run_id: indexRows[0].run_id,
      purpose: indexRows[0].purpose,
      manifest_path: indexRows[0].manifest_path,
      manifest_sha256: indexRows[0].manifest_sha256,
      runner: indexRows[0].runner,
      append_only: indexRows[0].append_only,
      proof_authority: indexRows[0].proof_authority
    },
    {
      schema_version: "comath.lean_run_manifest_index.v1",
      claim_id: claimId,
      campaign_id: "CAM-0118",
      candidate_id: "CAND-0118",
      run_id: "LRUN-0118",
      purpose: "check",
      manifest_path: manifestRel,
      manifest_sha256: sha256File(join(projectRoot, manifestRel)),
      runner: "comathd.LeanRunner",
      append_only: true,
      proof_authority: "lean_kernel_check"
    }
  );
  assert.equal(indexRows[0].stdout_path, run.manifest.stdout_path);
  assert.equal(indexRows[0].stderr_path, run.manifest.stderr_path);
  assert.match(indexRows[0].recorded_at, /^\d{4}-\d{2}-\d{2}T/);

  const auditEvents = readAuditEvents(projectRoot);
  assert.equal(
    auditEvents.some(
      (event) =>
        event.event_type === "lean_run_manifest.written" &&
        event.project_id === project.project_id &&
        event.target_id === claimId &&
        event.actor === "goal3-task118" &&
        event.payload.run_id === "LRUN-0118" &&
        event.payload.manifest_path === manifestRel &&
        event.payload.manifest_sha256 === sha256File(join(projectRoot, manifestRel))
    ),
    true
  );

  assert.throws(
    () =>
      runServiceOwnedLeanCommandV3({
        projectRoot,
        project_id: project.project_id,
        actor: "goal3-task118",
        run_id: "LRUN-0118",
        claim_id: claimId,
        campaign_id: "CAM-0118",
        candidate_id: "CAND-0118",
        purpose: "check",
        command: ["lake", "env", "lean", "LeanSmoke.lean"],
        cwd: projectRoot,
        input_files: [leanRoot, toolchain, lakefile],
        leanVersionOutput: "Lean (version 4.23.0, x86_64-unknown-linux-gnu)",
        lakeVersionOutput: "Lake version 5.0.0-src+abcdef (Lean version 4.23.0)",
        leanToolchain: "leanprover/lean4:v4.23.0",
        network_policy: "disabled",
        sandbox: "none",
        proof_authority: "lean_kernel_check",
        run: () => ({ exit_code: 0, stdout: "duplicate\n", stderr: "" })
      }),
    /lean_run_manifest_append_only_violation/
  );
  assert.equal(readJsonl(indexPath).length, 1, "duplicate rejected runs must not append provenance rows");
} finally {
  rmSync(projectRoot, { recursive: true, force: true });
}

console.log("Goal 3 Task 118 Lean manifest provenance index tests passed.");
