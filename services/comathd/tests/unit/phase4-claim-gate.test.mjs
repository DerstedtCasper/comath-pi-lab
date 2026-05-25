import assert from "node:assert/strict";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  claimToMarkdown,
  createComathServer,
  getClaim,
  initProject,
  linkClaims,
  promoteClaim,
  readGateResults,
  registerClaim,
  updateClaim
} from "../../dist/index.js";

const projectRoot = mkdtempSync(join(tmpdir(), "comath-claim-"));

try {
  const { project } = initProject({ name: "Claim Project", root_path: projectRoot });

  const claim = registerClaim(projectRoot, {
    project_id: project.project_id,
    statement: "  For all   x,\n x = x.  ",
    assumptions: ["x is an object"],
    domain: "algebra",
    actor: "phase4-test"
  });

  assert.equal(claim.id, "C-0001");
  assert.equal(claim.statement, "For all x, x = x.");
  assert.equal(claim.status, "draft");
  assert.equal(getClaim(projectRoot, project.project_id, claim.id)?.statement_hash, claim.statement_hash);

  assert.throws(
    () =>
      registerClaim(projectRoot, {
        project_id: project.project_id,
        statement: "x = x",
        assumptions: [],
        domain: "algebra",
        status: "formally_checked",
        actor: "phase4-test"
      }),
    /direct claim status escalation/
  );

  assert.throws(
    () =>
      updateClaim(projectRoot, {
        project_id: project.project_id,
        claim_id: claim.id,
        actor: "phase4-test",
        patch: { status: "literature_supported" }
      }),
    /direct claim status escalation/
  );

  const updated = updateClaim(projectRoot, {
    project_id: project.project_id,
    claim_id: claim.id,
    actor: "phase4-test",
    patch: { status: "conjectural", evidence_level: 0 }
  });
  assert.equal(updated.status, "conjectural");

  const dependency = registerClaim(projectRoot, {
    project_id: project.project_id,
    statement: "x exists.",
    assumptions: [],
    domain: "algebra",
    actor: "phase4-test"
  });
  const edge = linkClaims(projectRoot, {
    project_id: project.project_id,
    source_id: claim.id,
    target_id: dependency.id,
    label: "depends_on",
    actor: "phase4-test"
  });
  assert.equal(edge.id, "EDGE-0001");

  const failedPromotion = promoteClaim(projectRoot, {
    project_id: project.project_id,
    claim_id: claim.id,
    target_status: "formally_checked",
    evidence_ids: [],
    artifact_ids: [],
    actor: "phase4-test"
  });
  assert.equal(failedPromotion.gate.ok, false);
  assert.equal(failedPromotion.claim.status, "conjectural");
  assert.equal(failedPromotion.gate.vetoes.some((veto) => veto.includes("kernel_checked")), true);

  const gates = readGateResults(projectRoot, project.project_id);
  assert.equal(gates.length, 1);
  assert.equal(gates[0].ok, false);

  const markdown = claimToMarkdown(failedPromotion.claim);
  assert.equal(markdown.includes("For all x, x = x."), true);
  assert.equal(markdown.includes("conjectural"), true);

  const claimsFile = join(projectRoot, ".comath", "claims", "claims.jsonl");
  assert.equal(existsSync(claimsFile), true);
  assert.equal(readFileSync(claimsFile, "utf8").split(/\r?\n/).filter(Boolean).length, 2);

  const server = createComathServer();
  const routeClaim = await server.inject({
    method: "POST",
    path: "/claim/register",
    body: {
      project_root: projectRoot,
      project_id: project.project_id,
      statement: "Route claim",
      assumptions: [],
      domain: "api",
      actor: "phase4-route"
    }
  });
  assert.equal(routeClaim.status, 200);
  assert.equal(routeClaim.body.claim.id, "C-0003");

  const routePromotion = await server.inject({
    method: "POST",
    path: "/claim/promote",
    body: {
      project_root: projectRoot,
      project_id: project.project_id,
      claim_id: routeClaim.body.claim.id,
      target_status: "human_accepted",
      evidence_ids: [],
      artifact_ids: [],
      actor: "phase4-route"
    }
  });
  assert.equal(routePromotion.status, 200);
  assert.equal(routePromotion.body.gate.ok, false);
  await server.close();
} finally {
  rmSync(projectRoot, { recursive: true, force: true });
}

console.log("Phase 4 claim/gate tests passed.");
