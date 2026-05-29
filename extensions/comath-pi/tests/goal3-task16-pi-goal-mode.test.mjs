import assert from "node:assert/strict";
import {
  buildResearchCampaignLoopInput,
  createComathTools,
  executeComathTool,
  goalModeTerminalStates,
  parseComathCommand,
  runComathResearchCommand,
  runResearchCampaignLoop
} from "../dist/index.js";

const allowedGoalTerminals = [
  "formal_replay_passed",
  "formal_counterexample_confirmed",
  "needs_user_statement_disambiguation",
  "blocked_with_replayable_certificate",
  "budget_exhausted_with_resume_state"
];

assert.deepEqual(goalModeTerminalStates, allowedGoalTerminals);

const parsed = parseComathCommand(
  '/cm:research --goal "Show that every finite subgroup of a field multiplicative group is cyclic" --paper ./paper.pdf --attach ./notes.md --workspace-ref ./lean --mode goal --strict --budget frontier'
);
assert.equal(parsed?.action, "research");

const input = buildResearchCampaignLoopInput(parsed, {
  project_root: "D:/research/project",
  project_name: "Goal Mode UX",
  actor: "goal3-task16-pi"
});

assert.equal(input.mode, "goal");
assert.equal(input.user_goal, "Show that every finite subgroup of a field multiplicative group is cyclic");
assert.deepEqual(input.paper_paths, ["./paper.pdf"]);
assert.deepEqual(input.attachments, ["./notes.md"]);
assert.deepEqual(input.workspace_refs, ["./lean"]);
assert.equal(input.budget, "frontier");
assert.equal(input.strict_mode, true);
assert.deepEqual(input.goal_mode_policy.terminal_states, allowedGoalTerminals);
assert.equal(input.goal_mode_policy.resume_enabled, true);

const defaultModeInput = buildResearchCampaignLoopInput(parseComathCommand('/cm:research --goal "A broad theorem"'), {
  project_root: "D:/research/project",
  actor: "goal3-task16-pi"
});
assert.equal(defaultModeInput.mode, "goal");

assert.throws(
  () =>
    buildResearchCampaignLoopInput(parseComathCommand('/cm:research --goal "debug target" --mode bounded'), {
      project_root: "D:/research/project",
      actor: "goal3-task16-pi"
    }),
  /bounded research mode requires --debug or --ci/
);

const boundedDebugInput = buildResearchCampaignLoopInput(
  parseComathCommand('/cm:research --goal "debug target" --mode bounded --debug --max-ticks 2'),
  {
    project_root: "D:/research/project",
    actor: "goal3-task16-pi"
  }
);
assert.equal(boundedDebugInput.mode, "bounded");
assert.equal(boundedDebugInput.max_ticks, 2);

function createGoalModeClient({ terminalExternalState = "replayable_environment_blocker", tickStages = ["blocked"], startBlockers = true, terminalTicks = true } = {}) {
  const calls = [];
  const campaignBase = {
    campaign_id: "CAM-0016",
    project_id: "PRJ-0016",
    root_claim_id: "C-0016",
    user_goal: input.user_goal,
    strict_mode: true,
    blockers: startBlockers
      ? [
          {
            code: "NEEDS_FORMAL_SPEC_LOCK",
            reason: "formal statement requires disambiguation before proof search",
            artifact_path: ".comath/campaign/CAM-0016/formal_spec_lock_blocker.json"
          }
        ]
      : [],
    next_actions: ["review FormalSpecLock blocker", "resume after approved statement lock"]
  };
  const client = {
    get: async (path) => {
      calls.push({ method: "GET", path });
      if (path.startsWith("/project/status")) {
        return { project: { project_id: "PRJ-0016", name: "Goal Mode UX" }, runtime: { initialized: true } };
      }
      if (path.startsWith("/workstream/list")) {
        return { workstreams: [] };
      }
      if (path.startsWith("/claim/list")) {
        return {
          claims: [
            {
              id: "C-0016",
              status: "needs_formal_spec_lock",
              statement: input.user_goal
            }
          ]
        };
      }
      if (path.startsWith("/evidence/list")) {
        return { evidence: [] };
      }
      if (path.startsWith("/gate/list")) {
        return { gates: [] };
      }
      if (path.startsWith("/paper/state")) {
        return { margin_notes: [] };
      }
      if (path.startsWith("/paper/check")) {
        return { ok: true, vetoes: [], warnings: [], notes: [] };
      }
      if (path.startsWith("/campaign/CAM-0016/next-actions")) {
        return { campaign_id: "CAM-0016", next_actions: campaignBase.next_actions };
      }
      if (path.startsWith("/campaign/CAM-0016/export")) {
        return {
          export_manifest: {
            schema_version: "comath.pi_goal_export.v1",
            campaign_id: "CAM-0016",
            proof_authority: "none",
            can_promote_claim: false
          }
        };
      }
      throw new Error(`unexpected GET ${path}`);
    },
    post: async (path, body) => {
      calls.push({ method: "POST", path, body });
      if (path === "/campaign/start") {
        return {
          campaign: {
            ...campaignBase,
            current_stage: "problem_locked",
            status: "running"
          },
          obligation: { obligation_id: "PO-0016", claim_id: "C-0016" }
        };
      }
      if (path === "/campaign/CAM-0016/tick") {
        const stage = tickStages.shift() ?? "blocked";
        return {
          campaign: {
            ...campaignBase,
            current_stage: stage,
            status: terminalTicks ? "terminal" : "running",
            ...(terminalTicks ? { terminal_state: "blocked_with_replayable_reason" } : {}),
            ...(terminalTicks ? { external_v3_terminal_state: terminalExternalState } : {}),
            ...(terminalTicks ? { goal_mode_terminal_state: "blocked_with_replayable_certificate" } : {})
          }
        };
      }
      if (path === "/campaign/CAM-0016/resume") {
        return { campaign: { ...campaignBase, current_stage: "problem_locked", status: "running" } };
      }
      if (path === "/campaign/CAM-0016/cancel") {
        return {
          campaign: {
            ...campaignBase,
            current_stage: "cancelled",
            status: "terminal",
            terminal_state: "cancelled_by_user"
          }
        };
      }
      throw new Error(`unexpected POST ${path}`);
    }
  };
  return { client, calls };
}

const harness = createGoalModeClient();
const result = await runComathResearchCommand(
  harness.client,
  '/cm:research --goal "Show that every finite subgroup of a field multiplicative group is cyclic" --paper ./paper.pdf --attach ./notes.md --workspace-ref ./lean --mode goal --strict --budget frontier',
  {
    project_root: "D:/research/project",
    project_name: "Goal Mode UX",
    actor: "goal3-task16-pi",
    confirmation_id: "CONF-GOAL16"
  }
);

assert.equal(result.mode, "goal");
assert.equal(result.goal_terminal_state, "needs_user_statement_disambiguation");
assert.equal(result.stopped_reason, "terminal");
assert.deepEqual(result.next_actions, ["review FormalSpecLock blocker", "resume after approved statement lock"]);
assert.equal(result.blocker_certificate.code, "NEEDS_FORMAL_SPEC_LOCK");
assert.equal(result.resume_state.schema_version, "comath.pi_goal_resume_state.v1");
assert.equal(result.export_descriptor.route, "/campaign/CAM-0016/export");
assert.equal(result.dashboard.project.project_id, "PRJ-0016");

const startCall = harness.calls.find((call) => call.method === "POST" && call.path === "/campaign/start");
assert.ok(startCall, "goal-mode research starts through comathd campaign route");
assert.equal(startCall.body.mode, "goal");
assert.deepEqual(startCall.body.paper_paths, ["./paper.pdf"]);
assert.deepEqual(startCall.body.attachments, ["./notes.md"]);
assert.deepEqual(startCall.body.workspace_refs, ["./lean"]);
assert.equal(startCall.body.budget, "frontier");
assert.deepEqual(startCall.body.goal_mode_policy.terminal_states, allowedGoalTerminals);
assert.equal(harness.calls.some((call) => String(call.path).includes(".comath")), false);

const exhaustedHarness = createGoalModeClient({ tickStages: ["planning"], startBlockers: false, terminalTicks: false });
const exhausted = await runResearchCampaignLoop(exhaustedHarness.client, {
  ...input,
  max_ticks: 1,
  capability: {
    kind: "campaign_loop",
    project_root: "D:/research/project",
    actor: "goal3-task16-pi",
    max_ticks: 1,
    token: "campaign-loop:CONF-EXHAUSTED",
    confirmation_id: "CONF-EXHAUSTED"
  }
});
assert.equal(exhausted.goal_terminal_state, "budget_exhausted_with_resume_state");
assert.equal(exhausted.stopped_reason, "budget_exhausted_with_resume_state");
assert.equal(exhausted.resume_state.campaign_id, "CAM-0016");

const tools = createComathTools();
for (const name of ["comath.campaign.resume", "comath.campaign.cancel", "comath.campaign.export"]) {
  assert.ok(tools.some((tool) => tool.name === name), `${name} is registered`);
}

const routeHarness = createGoalModeClient();
await executeComathTool(routeHarness.client, "comath.campaign.resume", {
  project_root: "D:/research/project",
  campaign_id: "CAM-0016",
  actor: "goal3-task16-pi",
  confirmation_id: "CONF-RESUME"
});
assert.equal(routeHarness.calls.at(-1).path, "/campaign/CAM-0016/resume");

await executeComathTool(routeHarness.client, "comath.campaign.cancel", {
  project_root: "D:/research/project",
  campaign_id: "CAM-0016",
  actor: "goal3-task16-pi",
  confirmation_id: "CONF-CANCEL"
});
assert.equal(routeHarness.calls.at(-1).path, "/campaign/CAM-0016/cancel");

await executeComathTool(routeHarness.client, "comath.campaign.export", {
  project_root: "D:/research/project",
  campaign_id: "CAM-0016"
});
assert.equal(routeHarness.calls.at(-1).path, "/campaign/CAM-0016/export?project_root=D%3A%2Fresearch%2Fproject");

console.log("Goal 3 Task 16 Pi goal-mode tests passed.");
