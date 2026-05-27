import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { appendEvidenceRecord, createComathServer } from "../../dist/index.js";

const projectRoot = mkdtempSync(join(tmpdir(), "comath-read-model-routes-"));
const server = createComathServer();

try {
  const init = await server.inject({
    method: "POST",
    path: "/project/init",
    body: { name: "Read Model Routes", root_path: projectRoot }
  });
  assert.equal(init.status, 200);
  const projectId = init.body.project.project_id;

  const claimA = await server.inject({
    method: "POST",
    path: "/claim/register",
    body: {
      project_root: projectRoot,
      project_id: projectId,
      statement: "For every natural number n, n + 0 = n.",
      assumptions: ["n : Nat"],
      domain: "elementary",
      actor: "phase21-read-model"
    }
  });
  assert.equal(claimA.status, 200);

  const claimB = await server.inject({
    method: "POST",
    path: "/claim/register",
    body: {
      project_root: projectRoot,
      project_id: projectId,
      statement: "A separate dashboard claim.",
      assumptions: [],
      domain: "dashboard",
      actor: "phase21-read-model"
    }
  });
  assert.equal(claimB.status, 200);

  const evidence = appendEvidenceRecord(projectRoot, {
    project_id: projectId,
    claim_id: claimA.body.claim.id,
    kind: "other",
    summary: "Dashboard read-model evidence.",
    artifact_ids: []
  });

  const rejectedPromotion = await server.inject({
    method: "POST",
    path: "/claim/promote",
    body: {
      project_root: projectRoot,
      project_id: projectId,
      claim_id: claimA.body.claim.id,
      target_status: "formally_checked",
      evidence_ids: [evidence.id],
      artifact_ids: [],
      actor: "phase21-read-model"
    }
  });
  assert.equal(rejectedPromotion.status, 200);
  assert.equal(rejectedPromotion.body.gate.ok, false);

  const claims = await server.inject({
    method: "GET",
    path: `/claim/list?project_root=${encodeURIComponent(projectRoot)}&project_id=${encodeURIComponent(projectId)}`
  });
  assert.equal(claims.status, 200);
  assert.deepEqual(
    claims.body.claims.map((claim) => claim.id),
    [claimA.body.claim.id, claimB.body.claim.id]
  );
  assert.equal(claims.body.claims[0].statement.includes("n + 0 = n"), true);

  const evidenceList = await server.inject({
    method: "GET",
    path: `/evidence/list?project_root=${encodeURIComponent(projectRoot)}&project_id=${encodeURIComponent(projectId)}`
  });
  assert.equal(evidenceList.status, 200);
  assert.deepEqual(evidenceList.body.evidence.map((record) => record.id), [evidence.id]);
  assert.equal(evidenceList.body.evidence[0].claim_id, claimA.body.claim.id);

  const gates = await server.inject({
    method: "GET",
    path: `/gate/list?project_root=${encodeURIComponent(projectRoot)}&project_id=${encodeURIComponent(projectId)}`
  });
  assert.equal(gates.status, 200);
  assert.equal(gates.body.gates.length, 1);
  assert.equal(gates.body.gates[0].claim_id, claimA.body.claim.id);
  assert.equal(gates.body.gates[0].ok, false);

  const gatesForClaim = await server.inject({
    method: "GET",
    path: `/gate/list?project_root=${encodeURIComponent(projectRoot)}&project_id=${encodeURIComponent(projectId)}&claim_id=${encodeURIComponent(claimA.body.claim.id)}`
  });
  assert.equal(gatesForClaim.status, 200);
  assert.deepEqual(gatesForClaim.body.gates.map((gate) => gate.claim_id), [claimA.body.claim.id]);
} finally {
  await server.close();
  rmSync(projectRoot, { recursive: true, force: true });
}

console.log("Phase 21 read-model route tests passed.");
