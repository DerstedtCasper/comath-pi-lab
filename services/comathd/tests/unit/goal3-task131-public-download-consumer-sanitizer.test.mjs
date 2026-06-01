import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  appendEvidenceRecord,
  createComathServer,
  exportSnapshot,
  initProject,
  promoteClaim,
  registerClaim,
  runGoal3GaAcceptanceWorkflow
} from "../../dist/index.js";

const privilegedVocabulary =
  /\b(?:completed_formal_proof|formally_checked|formal_proof_verified|formal_replay_passed|lean_kernel_clean_replay|verified_final_authority_evidence)\b/i;

function assertPublic(value, message) {
  assert.doesNotMatch(JSON.stringify(value), privilegedVocabulary, message);
}

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

const projectRoot = mkdtempSync(join(tmpdir(), "comath-goal3-task131-public-consumers-"));
const server = createComathServer();

try {
  const { project } = initProject({ name: "Task 131 public consumers", root_path: projectRoot });
  const claim = registerClaim(projectRoot, {
    project_id: project.project_id,
    statement: "For every natural number n, n + 0 = n.",
    assumptions: ["n : Nat"],
    domain: "elementary",
    actor: "goal3-task131"
  });
  const evidence = appendEvidenceRecord(projectRoot, {
    project_id: project.project_id,
    claim_id: claim.id,
    kind: "other",
    summary: "adapter said completed_formal_proof with lean_kernel_clean_replay and formal_replay_passed",
    artifact_ids: ["ART-0001"]
  });
  const promotion = promoteClaim(projectRoot, {
    project_id: project.project_id,
    claim_id: claim.id,
    target_status: "formally_checked",
    evidence_ids: [evidence.id],
    artifact_ids: [],
    actor: "goal3-task131"
  });
  assert.equal(promotion.gate.ok, false);

  const evidenceList = await server.inject({
    method: "GET",
    path: `/evidence/list?project_root=${encodeURIComponent(projectRoot)}&project_id=${encodeURIComponent(project.project_id)}`
  });
  assert.equal(evidenceList.status, 200);
  assertPublic(evidenceList.body, "/evidence/list must sanitize unverified proof-authority vocabulary");

  const gateList = await server.inject({
    method: "GET",
    path: `/gate/list?project_root=${encodeURIComponent(projectRoot)}&project_id=${encodeURIComponent(project.project_id)}`
  });
  assert.equal(gateList.status, 200);
  assertPublic(gateList.body, "/gate/list must sanitize unverified proof-authority vocabulary");

  const workspace = join(projectRoot, ".comath", "campaign", "CAM-0001", "stage", "V1");
  mkdirSync(workspace, { recursive: true });
  writeFileSync(
    join(workspace, "candidate_manifest.json"),
    JSON.stringify({
      candidate_id: "CAND-V1",
      proof_authority: "none",
      summary: "untrusted adapter emitted completed_formal_proof and lean_kernel_clean_replay"
    }),
    "utf8"
  );
  writeFileSync(
    join(workspace, "agent_output.json"),
    JSON.stringify({
      proof_authority: "none",
      summary: "untrusted adapter emitted formal_replay_passed with verified_final_authority_evidence"
    }),
    "utf8"
  );
  writeFileSync(
    join(workspace, "agent_stage_log.jsonl"),
    `${JSON.stringify({ message: "completed_formal_proof formal_replay_passed" })}\n`,
    "utf8"
  );

  const snapshot = await exportSnapshot(projectRoot, { project_id: project.project_id, actor: "goal3-task131" });
  const manifestEntry = snapshot.manifest.entries.find((entry) => entry.relative_path.endsWith("candidate_manifest.json"));
  const outputEntry = snapshot.manifest.entries.find((entry) => entry.relative_path.endsWith("agent_output.json"));
  const logEntry = snapshot.manifest.entries.find((entry) => entry.relative_path.endsWith("agent_stage_log.jsonl"));
  assert.ok(manifestEntry);
  assert.ok(outputEntry);
  assert.ok(logEntry);
  assertPublic(readJson(join(snapshot.snapshot_root, manifestEntry.snapshot_path)), "snapshot candidate manifest copy must be public-sanitized");
  assertPublic(readJson(join(snapshot.snapshot_root, outputEntry.snapshot_path)), "snapshot agent output copy must be public-sanitized");
  assertPublic(
    readFileSync(join(snapshot.snapshot_root, logEntry.snapshot_path), "utf8"),
    "snapshot agent stage log copy must be public-sanitized"
  );

  const acceptanceReport = runGoal3GaAcceptanceWorkflow({ projectRoot, actor: "goal3-task131" });
  assert.equal(acceptanceReport.proof_authority, "none");
  assert.equal(
    acceptanceReport.trust_core_negative_suite.cases.every((item) => item.diagnostic_scope === "negative_diagnostic_only"),
    true,
    "Goal 3 negative-suite privileged diagnostic vocabulary must be explicitly scoped"
  );
} finally {
  await server.close();
  rmSync(projectRoot, { recursive: true, force: true });
}

console.log("Goal 3 Task 131 public download consumer sanitizer tests passed.");
