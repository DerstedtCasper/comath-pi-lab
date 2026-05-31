import assert from "node:assert/strict";
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { getClaim, importArtifact, initProject, registerClaim, statementHash, tickCampaign, writeCampaign } from "../../dist/index.js";

function writeProjectFile(projectRoot, relativePath, text) {
  const absolute = join(projectRoot, relativePath);
  mkdirSync(dirname(absolute), { recursive: true });
  writeFileSync(absolute, text, "utf8");
}

function writeJsonProjectFile(projectRoot, relativePath, value) {
  writeProjectFile(projectRoot, relativePath, `${JSON.stringify(value, null, 2)}\n`);
}

function campaignFixture(projectId, campaignId, claimId, statementHashValue, acceptedArtifacts, openObligations) {
  const now = "2026-05-31T00:00:00.000Z";
  return {
    campaign_id: campaignId,
    project_id: projectId,
    root_claim_id: claimId,
    user_goal: "Task104 fail-closed replay request guard",
    current_stage: "final_global_replay",
    status: "running",
    strict_mode: true,
    stage_runs: [],
    open_obligations: openObligations ?? [
      {
        obligation_id: "PO-0104",
        claim_id: claimId,
        locked_statement_nl: "MathResearch.Goal3FailClosed104 : True",
        locked_statement_structured: {},
        statement_hash: statementHashValue,
        dependencies: [],
        assumptions: [],
        status: "candidate_selected"
      }
    ],
    accepted_artifacts: acceptedArtifacts,
    blockers: [],
    next_actions: ["run final global Lean replay and claim promotion gate"],
    created_at: now,
    updated_at: now
  };
}

function writeLeanProject(projectRoot, leanRootRel) {
  writeProjectFile(projectRoot, `${leanRootRel}/MathResearch/Target.lean`, "namespace MathResearch\ntheorem Goal3FailClosed104 : True := by\n  trivial\nend MathResearch\n");
  writeProjectFile(projectRoot, `${leanRootRel}/Audit/TargetAudit.lean`, "import MathResearch.Target\n#check MathResearch.Goal3FailClosed104\n");
  writeJsonProjectFile(projectRoot, `${leanRootRel}/FormalSpec/formal_spec_lock.json`, {});
  writeJsonProjectFile(projectRoot, `${leanRootRel}/FormalSpec/assumption_ledger.json`, {});
  writeProjectFile(projectRoot, `${leanRootRel}/lakefile.lean`, "import Lake\nopen Lake DSL\npackage MathResearch where\nlean_lib MathResearch where\n  roots := #[`MathResearch.Target]\n");
  writeProjectFile(projectRoot, `${leanRootRel}/lean-toolchain`, "leanprover/lean4:v4.23.0\n");
}

async function runBlockedScenario(name, campaignId, makeTarget, expectedReason) {
  const projectRoot = mkdtempSync(join(tmpdir(), `comath-goal3-task104-${name}-`));
  try {
    const { project } = initProject({ name: `Goal 3 Task 104 ${name}`, root_path: projectRoot });
    const theoremName = "MathResearch.Goal3FailClosed104";
    const claimStatement = `${theoremName} : True`;
    const claim = registerClaim(projectRoot, {
      project_id: project.project_id,
      statement: claimStatement,
      assumptions: [],
      domain: "logic",
      status: "conjectural",
      actor: "goal3-task104"
    });
    assert.equal(claim.statement_hash, statementHash(claimStatement));

    const target = makeTarget({ campaignId, claim, claimStatement });
    writeLeanProject(projectRoot, target.leanRootRel);
    const replayTargetRel = `.comath/campaign/${campaignId}/workstreams/WS-0104/final_replay_target.json`;
    writeJsonProjectFile(projectRoot, replayTargetRel, target.payload);
    const replayTargetArtifact = await importArtifact({
      projectRoot,
      project_id: project.project_id,
      source_path: replayTargetRel,
      kind: "code",
      actor: "goal3-task104"
    });
    if (target.tamperArtifact === true) {
      writeProjectFile(projectRoot, replayTargetArtifact.path, "{}\n");
    }
    writeCampaign(
      projectRoot,
      campaignFixture(project.project_id, campaignId, claim.id, claim.statement_hash, [replayTargetArtifact], target.openObligations),
      "goal3-task104"
    );

    const result = await tickCampaign({
      project_root: projectRoot,
      campaign_id: campaignId,
      actor: "goal3-task104"
    });

    assert.equal(result.campaign.current_stage, "blocked");
    assert.match(JSON.stringify(result.campaign.blockers), new RegExp(expectedReason));
    assert.equal(existsSync(join(projectRoot, `.comath/campaign/${campaignId}/assembled_final_replay_request.json`)), false);
    assert.equal(getClaim(projectRoot, project.project_id, claim.id)?.status, "conjectural");
  } finally {
    rmSync(projectRoot, { recursive: true, force: true });
  }
}

function targetPayload({ campaignId, claim, claimStatement, leanRootRel, lockedStatementHash }) {
  return {
    schema_version: "comath.campaign_final_replay_target.v1",
    campaign_id: campaignId,
    claim_id: claim.id,
    obligation_id: "PO-0104",
    artifact_role: "final_replay_request_source",
    proof_authority: "none",
    can_promote_claim: false,
    replay_request: {
      schema_version: "comath.campaign_final_global_replay_request.v1",
      claim_id: claim.id,
      packaging_scope: "campaign",
      lean_project: {
        lean_root: leanRootRel,
        theorem_file_rel: "MathResearch/Target.lean",
        formal_spec_file: "FormalSpec/formal_spec_lock.json",
        assumption_ledger_file: "FormalSpec/assumption_ledger.json",
        audit_file_rel: "Audit/TargetAudit.lean",
        lakefile: "lakefile.lean",
        toolchain_file: "lean-toolchain",
        theorem_name: "MathResearch.Goal3FailClosed104",
        theorem_family_id: campaignId,
        canonical_proposition: "True",
        build_targets: ["MathResearch"],
        replay_command: "lake build MathResearch",
        primary_dependency: "Mathlib",
        formal_spec: {
          claim_id: claim.id,
          theorem_name: "Goal3FailClosed104",
          namespace: "MathResearch",
          normalized_statement: claimStatement,
          locked_statement_hash: lockedStatementHash
        }
      }
    }
  };
}

await runBlockedScenario(
  "positive-path",
  "CAMPOSITIVE-0104",
  ({ campaignId, claim, claimStatement }) => {
    const leanRootRel = ".comath/release/positive_matrix/task104-forbidden";
    return {
      leanRootRel,
      payload: targetPayload({
        campaignId,
        claim,
        claimStatement,
        leanRootRel,
        lockedStatementHash: claim.statement_hash
      })
    };
  },
  "final_replay_request_positive_matrix_path_forbidden"
);

await runBlockedScenario(
  "positive-split-path",
  "CAMSPLIT-0104",
  ({ campaignId, claim, claimStatement }) => {
    const leanRootRel = ".comath/release/positive_matrix";
    return {
      leanRootRel,
      payload: targetPayload({
        campaignId,
        claim,
        claimStatement,
        leanRootRel,
        lockedStatementHash: claim.statement_hash
      })
    };
  },
  "final_replay_request_positive_matrix_path_forbidden"
);

await runBlockedScenario(
  "statement-drift",
  "CAMDRIFT-0104",
  ({ campaignId, claim, claimStatement }) => {
    const leanRootRel = ".comath/lean/task104-statement-drift";
    return {
      leanRootRel,
      payload: targetPayload({
        campaignId,
        claim,
        claimStatement,
        leanRootRel,
        lockedStatementHash: "sha256:drifted-statement"
      })
    };
  },
  "final_replay_request_statement_hash_drift"
);

await runBlockedScenario(
  "obligation-mismatch",
  "CAMOBLIG-0104",
  ({ campaignId, claim, claimStatement }) => {
    const leanRootRel = ".comath/lean/task104-obligation-mismatch";
    return {
      leanRootRel,
      openObligations: [
        {
          obligation_id: "PO-9999",
          claim_id: claim.id,
          locked_statement_nl: "MathResearch.Goal3FailClosed104 : True",
          locked_statement_structured: {},
          statement_hash: claim.statement_hash,
          dependencies: [],
          assumptions: [],
          status: "candidate_selected"
        }
      ],
      payload: targetPayload({
        campaignId,
        claim,
        claimStatement,
        leanRootRel,
        lockedStatementHash: claim.statement_hash
      })
    };
  },
  "accepted_final_replay_target_obligation_mismatch"
);

await runBlockedScenario(
  "artifact-tamper",
  "CAMTAMPER-0104",
  ({ campaignId, claim, claimStatement }) => {
    const leanRootRel = ".comath/lean/task104-artifact-tamper";
    return {
      leanRootRel,
      tamperArtifact: true,
      payload: targetPayload({
        campaignId,
        claim,
        claimStatement,
        leanRootRel,
        lockedStatementHash: claim.statement_hash
      })
    };
  },
  "accepted_artifact_hash_mismatch"
);

console.log("Goal 3 Task 104 final replay request fail-closed test passed.");
