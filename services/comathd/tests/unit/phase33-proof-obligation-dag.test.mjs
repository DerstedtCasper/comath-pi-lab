import assert from "node:assert/strict";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createComathServer, validateProofObligationDag, writeProofPlanningArtifacts } from "../../dist/index.js";

const projectRoot = mkdtempSync(join(tmpdir(), "comath-proof-obligation-dag-"));
const server = createComathServer();

async function tick(campaignId) {
  const response = await server.inject({
    method: "POST",
    path: `/campaign/${encodeURIComponent(campaignId)}/tick`,
    body: { project_root: projectRoot, actor: "phase33-dag" }
  });
  assert.equal(response.status, 200);
  return response.body;
}

async function planCampaign(goal) {
  const start = await server.inject({
    method: "POST",
    path: "/campaign/start",
    body: {
      project_root: projectRoot,
      project_name: "Proof Obligation DAG",
      user_goal: goal,
      domain: "elementary",
      strict_mode: true,
      actor: "phase33-dag"
    }
  });
  assert.equal(start.status, 200);

  let planned = null;
  for (let index = 0; index < 8; index += 1) {
    planned = await tick(start.body.campaign.campaign_id);
    if (planned.campaign.current_stage === "candidate_generation") {
      break;
    }
  }
  assert.ok(planned, "planning ticks should return a body");
  assert.equal(planned.campaign.current_stage, "candidate_generation");
  return planned;
}

function campaignProofPath(campaignId, rel) {
  return join(projectRoot, ".comath", "campaign", campaignId, "proof", rel);
}

function dagNode(obligationId) {
  return {
    obligation_id: obligationId,
    claim_id: "C-0001",
    theorem_family: "nat_add_zero",
    locked_statement_hash: `hash-${obligationId}`,
    lean_target: `theorem ${obligationId.replace("-", "")} (n : Nat) : n + 0 = n`,
    status: "queued",
    kind: obligationId === "PO-0001" ? "root" : "leaf"
  };
}

function proofObligation(overrides) {
  return {
    obligation_id: "PO-0001",
    claim_id: "C-0001",
    locked_statement_nl: "Prove a closed proof obligation.",
    locked_statement_structured: {
      theorem_family: "phase33_multi_obligation",
      proposition: "n + 0 = n"
    },
    lean_target: "theorem Phase33Root (n : Nat) : n + 0 = n",
    statement_hash: "phase33-root-hash",
    dependencies: [],
    assumptions: [],
    status: "queued",
    ...overrides
  };
}

try {
  assert.throws(
    () =>
      validateProofObligationDag({
        nodes: [dagNode("PO-0001"), dagNode("PO-0001")],
        edges: []
      }),
    /duplicate proof obligation DAG node/
  );

  assert.throws(
    () =>
      validateProofObligationDag({
        nodes: [dagNode("PO-0001")],
        edges: [{ from_obligation_id: "PO-0001", to_obligation_id: "PO-9999", relation: "decomposes_to" }]
      }),
    /unknown obligation/
  );

  assert.throws(
    () =>
      validateProofObligationDag({
        nodes: [dagNode("PO-0001"), dagNode("PO-0002")],
        edges: [{ from_obligation_id: "PO-0001", to_obligation_id: "PO-0002", relation: "not_decomposes_to" }]
      }),
    /unsupported relation/
  );

  assert.throws(
    () =>
      validateProofObligationDag({
        nodes: [dagNode("PO-0001"), dagNode("PO-0002")],
        edges: [
          { from_obligation_id: "PO-0001", to_obligation_id: "PO-0002", relation: "decomposes_to" },
          { from_obligation_id: "PO-0002", to_obligation_id: "PO-0001", relation: "decomposes_to" }
        ]
      }),
    /cycle detected/
  );

  const rootObligation = proofObligation({
    obligation_id: "PO-0001",
    locked_statement_nl: "Root theorem for a decomposed obligation.",
    lean_target: "theorem Phase33Root (n : Nat) : n + 0 = n",
    statement_hash: "phase33-root-hash"
  });
  const lemmaObligation = proofObligation({
    obligation_id: "PO-0002",
    parent_obligation_id: "PO-0001",
    locked_statement_nl: "Intermediate lemma for the root theorem.",
    lean_target: "theorem Phase33Lemma (n : Nat) : n = n",
    statement_hash: "phase33-lemma-hash",
    locked_statement_structured: {
      theorem_family: "phase33_multi_obligation_lemma",
      proposition: "n = n"
    }
  });
  const sublemmaObligation = proofObligation({
    obligation_id: "PO-0003",
    parent_obligation_id: "PO-0002",
    locked_statement_nl: "Leaf sublemma for the intermediate lemma.",
    lean_target: "theorem Phase33Sublemma (n : Nat) : 0 + n = n",
    statement_hash: "phase33-sublemma-hash",
    dependencies: ["PO-0002"],
    locked_statement_structured: {
      theorem_family: "phase33_multi_obligation_sublemma",
      proposition: "0 + n = n"
    }
  });
  const multiCampaign = {
    campaign_id: "CAM-9001",
    project_id: "P-0001",
    root_claim_id: "C-0001",
    user_goal: "Exercise multi-obligation planning closure.",
    current_stage: "planning",
    status: "running",
    strict_mode: true,
    stage_runs: [],
    open_obligations: [rootObligation, lemmaObligation, sublemmaObligation],
    accepted_artifacts: [],
    blockers: [],
    next_actions: [],
    created_at: "2026-05-27T00:00:00.000Z",
    updated_at: "2026-05-27T00:00:00.000Z"
  };

  const multiArtifacts = writeProofPlanningArtifacts({
    projectRoot,
    campaign: multiCampaign,
    obligation: rootObligation
  });
  assert.deepEqual(multiArtifacts.obligation_yaml_paths, [
    ".comath/campaign/CAM-9001/proof/obligations/PO-0001.yaml",
    ".comath/campaign/CAM-9001/proof/obligations/PO-0002.yaml",
    ".comath/campaign/CAM-9001/proof/obligations/PO-0003.yaml"
  ]);

  const multiDag = JSON.parse(readFileSync(campaignProofPath("CAM-9001", "lemma_dag.json"), "utf8"));
  assert.deepEqual(
    multiDag.nodes.map((node) => [node.obligation_id, node.kind]),
    [
      ["PO-0001", "root"],
      ["PO-0002", "intermediate"],
      ["PO-0003", "leaf"]
    ]
  );
  assert.deepEqual(multiDag.edges, [
    { from_obligation_id: "PO-0001", to_obligation_id: "PO-0002", relation: "decomposes_to" },
    { from_obligation_id: "PO-0002", to_obligation_id: "PO-0003", relation: "decomposes_to" }
  ]);
  assert.deepEqual(multiDag.leaf_obligation_ids, ["PO-0003"]);

  const multiLineMap = JSON.parse(readFileSync(campaignProofPath("CAM-9001", "line_map.json"), "utf8"));
  assert.deepEqual(
    multiLineMap.lines.map((line) => line.obligation_id),
    ["PO-0001", "PO-0002", "PO-0003"]
  );

  for (const obligationId of ["PO-0001", "PO-0002", "PO-0003"]) {
    const yaml = readFileSync(campaignProofPath("CAM-9001", join("obligations", `${obligationId}.yaml`)), "utf8");
    assert.match(yaml, new RegExp(`obligation_id: ${obligationId}`));
  }

  const multiSkeletonLean = readFileSync(campaignProofPath("CAM-9001", "Skeleton.lean"), "utf8");
  for (const [obligationId, theoremName] of [
    ["PO-0001", "Phase33Root"],
    ["PO-0002", "Phase33Lemma"],
    ["PO-0003", "Phase33Sublemma"]
  ]) {
    assert.match(multiSkeletonLean, new RegExp(`proof_obligation: ${obligationId}`));
    assert.match(multiSkeletonLean, new RegExp(`theorem ${theoremName}`));
  }

  const multiSkeletonReport = readFileSync(campaignProofPath("CAM-9001", "skeleton_report.md"), "utf8");
  for (const obligationId of ["PO-0001", "PO-0002", "PO-0003"]) {
    assert.match(multiSkeletonReport, new RegExp(`- ${obligationId}: planning-stage sorry placeholder`));
  }
  assert.doesNotMatch(multiSkeletonReport, /only permitted planning-stage sorry/);

  const planned = await planCampaign("Prove in Lean that n + 0 = n for natural numbers.");
  const campaignId = planned.campaign.campaign_id;
  const dagPath = campaignProofPath(campaignId, "lemma_dag.json");
  const lineMapPath = campaignProofPath(campaignId, "line_map.json");
  const obligationPath = campaignProofPath(campaignId, join("obligations", "PO-0001.yaml"));
  const skeletonLeanPath = campaignProofPath(campaignId, "Skeleton.lean");
  const skeletonReportPath = campaignProofPath(campaignId, "skeleton_report.md");

  for (const path of [dagPath, lineMapPath, obligationPath, skeletonLeanPath, skeletonReportPath]) {
    assert.equal(existsSync(path), true, `${path} should exist`);
  }

  const dag = JSON.parse(readFileSync(dagPath, "utf8"));
  assert.equal(dag.generated_by, "native_stage_gate");
  assert.equal(dag.campaign_id, campaignId);
  assert.equal(dag.root_obligation_id, "PO-0001");
  assert.equal(dag.acyclic, true);
  assert.equal(dag.nodes[0].obligation_id, "PO-0001");
  assert.equal(dag.nodes[0].theorem_family, "nat_add_zero");
  assert.deepEqual(dag.edges, []);
  assert.deepEqual(dag.leaf_obligation_ids, ["PO-0001"]);

  const lineMap = JSON.parse(readFileSync(lineMapPath, "utf8"));
  assert.equal(lineMap.root_obligation_id, "PO-0001");
  assert.equal(lineMap.lines[0].obligation_id, "PO-0001");
  assert.equal(lineMap.lines[0].formal_target, "theorem C0001 (n : Nat) : n + 0 = n");
  assert.equal(lineMap.lines[0].expected_evidence.includes("Lean"), true);

  const obligationYaml = readFileSync(obligationPath, "utf8");
  assert.match(obligationYaml, /obligation_id: PO-0001/);
  assert.match(obligationYaml, /status: queued/);
  assert.match(obligationYaml, /theorem_family: nat_add_zero/);

  const skeletonLean = readFileSync(skeletonLeanPath, "utf8");
  assert.match(skeletonLean, /proof_obligation: PO-0001/);
  assert.match(skeletonLean, /theorem C0001 \(n : Nat\) : n \+ 0 = n := by/);
  assert.match(skeletonLean, /sorry/);

  const skeletonReport = readFileSync(skeletonReportPath, "utf8");
  assert.match(skeletonReport, /No final proof authority/);
  assert.match(skeletonReport, new RegExp(`\\.comath/campaign/${campaignId}/proof/Skeleton\\.lean`));

  const planningRun = planned.campaign.stage_runs.find((run) => run.stage === "skeleton_gate");
  assert.ok(planningRun, "planning stage run should be recorded");
  assert.equal(planningRun.artifact_paths.includes(`.comath/campaign/${campaignId}/proof/lemma_dag.json`), true);
  assert.equal(planningRun.artifact_paths.includes(`.comath/campaign/${campaignId}/proof/Skeleton.lean`), true);
  const lineMapRun = planned.campaign.stage_runs.find((run) => run.stage === "line_map_gate");
  assert.ok(lineMapRun, "line-map stage run should be recorded");
  assert.equal(lineMapRun.artifact_paths.includes(`.comath/campaign/${campaignId}/proof/line_map.json`), true);

  const secondPlanned = await planCampaign("Prove in Lean that n * 0 = 0 for natural numbers.");
  const secondCampaignId = secondPlanned.campaign.campaign_id;
  const secondDagPath = campaignProofPath(secondCampaignId, "lemma_dag.json");
  assert.notEqual(secondDagPath, dagPath);
  assert.equal(JSON.parse(readFileSync(dagPath, "utf8")).nodes[0].theorem_family, "nat_add_zero");
  assert.equal(JSON.parse(readFileSync(secondDagPath, "utf8")).nodes[0].theorem_family, "nat_mul_zero");
} finally {
  await server.close();
  rmSync(projectRoot, { recursive: true, force: true });
}

console.log("Phase 33 proof obligation DAG tests passed.");
