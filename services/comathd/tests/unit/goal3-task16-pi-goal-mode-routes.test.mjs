import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createComathServer } from "../../dist/index.js";

const server = createComathServer();
const root = mkdtempSync(join(tmpdir(), "comath-goal3-task16-routes-"));

try {
  const start = await server.inject({
    method: "POST",
    path: "/campaign/start",
    body: {
      project_root: root,
      project_name: "Goal 3 Task 16 Routes",
      user_goal: "Classify the intended theorem from these attached notes",
      mode: "goal",
      paper_paths: ["./paper.pdf"],
      attachments: ["./notes.md"],
      workspace_refs: ["./lean"],
      budget: "frontier",
      goal_mode_policy: {
        mode: "goal",
        terminal_states: [
          "formal_replay_passed",
          "formal_counterexample_confirmed",
          "needs_user_statement_disambiguation",
          "blocked_with_replayable_certificate",
          "budget_exhausted_with_resume_state"
        ],
        require_user_confirmation_for_statement_lock: true,
        resume_enabled: true
      },
      strict_mode: true,
      actor: "goal3-task16-routes"
    }
  });
  assert.equal(start.status, 200);
  assert.equal(start.body.campaign.status, "blocked");
  assert.equal(start.body.campaign.goal_mode_terminal_state, "needs_user_statement_disambiguation");
  assert.equal(start.body.campaign.blockers[0].code, "NEEDS_FORMAL_SPEC_LOCK");
  assert.equal(start.body.campaign.blockers[0].artifact_path.includes("formal_spec_lock_blocker"), true);

  const campaignId = start.body.campaign.campaign_id;
  const status = await server.inject({
    method: "GET",
    path: `/campaign/${encodeURIComponent(campaignId)}/status?project_root=${encodeURIComponent(root)}`
  });
  assert.equal(status.status, 200);
  assert.equal(status.body.campaign.goal_mode_terminal_state, "needs_user_statement_disambiguation");

  const nextActions = await server.inject({
    method: "GET",
    path: `/campaign/${encodeURIComponent(campaignId)}/next-actions?project_root=${encodeURIComponent(root)}`
  });
  assert.equal(nextActions.status, 200);
  assert.deepEqual(nextActions.body.next_actions, [
    "create approved FormalSpecLock and AssumptionLedger before proof obligation creation"
  ]);

  const exported = await server.inject({
    method: "GET",
    path: `/campaign/${encodeURIComponent(campaignId)}/export?project_root=${encodeURIComponent(root)}`
  });
  assert.equal(exported.status, 200);
  assert.equal(exported.body.export_manifest.schema_version, "comath.pi_goal_export.v1");
  assert.equal(exported.body.export_manifest.campaign_id, campaignId);
  assert.equal(exported.body.export_manifest.proof_authority, "none");
  assert.equal(exported.body.export_manifest.can_promote_claim, false);
  assert.equal(exported.body.export_manifest.blocker_certificates[0].code, "NEEDS_FORMAL_SPEC_LOCK");

  const resume = await server.inject({
    method: "POST",
    path: `/campaign/${encodeURIComponent(campaignId)}/resume`,
    body: {
      project_root: root,
      actor: "goal3-task16-routes"
    }
  });
  assert.equal(resume.status, 409);
  assert.equal(resume.body.code, "CAMPAIGN_REPAIR_REQUIRED");

  const cancel = await server.inject({
    method: "POST",
    path: `/campaign/${encodeURIComponent(campaignId)}/cancel`,
    body: {
      project_root: root,
      actor: "goal3-task16-routes"
    }
  });
  assert.equal(cancel.status, 200);
  assert.equal(cancel.body.campaign.terminal_state, "cancelled_by_user");
  assert.equal(cancel.body.campaign.external_v3_terminal_state, "user_cancelled");
} finally {
  await server.close();
  rmSync(root, { recursive: true, force: true });
}

console.log("Goal 3 Task 16 Pi goal-mode route tests passed.");
