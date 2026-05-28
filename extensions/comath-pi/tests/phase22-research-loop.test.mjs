import assert from "node:assert/strict";
import {
  buildResearchCampaignLoopInput,
  createComathTools,
  executeComathTool,
  issueCampaignLoopCapability,
  parseComathCommand,
  requireMutationConfirmation,
  runComathResearchCommand,
  runResearchCampaignLoop
} from "../dist/index.js";

const parsed = parseComathCommand('/cm:research "Prove in Lean that n + 0 = n" --goal --strict --domain elementary');
assert.deepEqual(parsed, {
  namespace: "cm",
  action: "research",
  subcommand: "Prove in Lean that n + 0 = n",
  args: ["--goal", "--strict", "--domain", "elementary"]
});

assert.deepEqual(parseComathCommand('/cm:research start --goal "n + 0 = n" --domain elementary'), {
  namespace: "cm",
  action: "research",
  subcommand: "start",
  args: ["--goal", "n + 0 = n", "--domain", "elementary"]
});

assert.deepEqual(parseComathCommand('/cm:research "goal with --flag text" --domain elementary'), {
  namespace: "cm",
  action: "research",
  subcommand: "goal with --flag text",
  args: ["--domain", "elementary"]
});

assert.equal(parseComathCommand('/cm:research "Goal with \\"quoted\\" term" --strict')?.subcommand, 'Goal with "quoted" term');
assert.throws(() => parseComathCommand('/cm:research "unterminated --strict'), /unterminated quote/);

const loopTool = createComathTools().find((tool) => tool.name === "comath.research.runCampaignLoop");
assert.ok(loopTool, "loop tool is registered");
assert.equal(loopTool.mutates, true);
assert.deepEqual(loopTool.input_schema.required, ["project_root", "user_goal", "actor", "confirmation_id"]);
const loopPermission = requireMutationConfirmation({ kind: "tool", name: "comath.research.runCampaignLoop", mutates: true });
assert.equal(loopPermission.confirmation_required, true);
assert.equal(loopPermission.allowed, false);

assert.throws(
  () =>
    issueCampaignLoopCapability({
      project_root: "D:/research/project",
      actor: "phase22-pi",
      max_ticks: 4,
      confirmation: {
        kind: "mutation_confirmation",
        target: "/cm:research",
        allowed: false,
        confirmation_id: "CONF-DENIED"
      }
    }),
  /confirmed mutation permission is required/
);

assert.throws(
  () =>
    issueCampaignLoopCapability({
      project_root: "D:/research/project",
      actor: "phase22-pi",
      max_ticks: 4,
      confirmation: {
        kind: "mutation_confirmation",
        target: "comath.claim.register",
        allowed: true,
        confirmation_id: "CONF-WRONG-TARGET"
      }
    }),
  /campaign loop confirmation target is required/
);

const capability = issueCampaignLoopCapability({
  project_root: "D:/research/project",
  actor: "phase22-pi",
  max_ticks: 4,
  confirmation: {
    kind: "mutation_confirmation",
    target: "/cm:research",
    allowed: true,
    confirmation_id: "CONF-PHASE22"
  }
});

const loopInput = buildResearchCampaignLoopInput(parsed, {
  project_root: "D:/research/project",
  project_name: "Pi Research Loop",
  actor: "phase22-pi",
  capability
});
assert.equal(loopInput.user_goal, "Prove in Lean that n + 0 = n");
assert.equal(loopInput.strict_mode, true);
assert.equal(loopInput.domain, "elementary");
assert.equal(loopInput.max_ticks, 4);

const flagGoalInput = buildResearchCampaignLoopInput(parseComathCommand('/cm:research start --goal "n + 0 = n"'), {
  project_root: "D:/research/project",
  actor: "phase22-pi",
  capability
});
assert.equal(flagGoalInput.user_goal, "n + 0 = n");
assert.equal(flagGoalInput.strict_mode, undefined);

await assert.rejects(
  () =>
    runResearchCampaignLoop(
      {
        get: async () => {
          throw new Error("unexpected get");
        },
        post: async () => {
          throw new Error("unexpected post");
        }
      },
      {
        project_root: "D:/research/project",
        user_goal: "Prove n + 0 = n",
        actor: "phase22-pi",
        max_ticks: 1
      }
    ),
  /campaign loop capability is required/
);

await assert.rejects(
  () =>
    runResearchCampaignLoop(
      {
        get: async () => {
          throw new Error("unexpected get");
        },
        post: async () => {
          throw new Error("unexpected post");
        }
      },
      {
        project_root: "D:/other/project",
        user_goal: "Prove n + 0 = n",
        actor: "phase22-pi",
        capability
      }
    ),
  /capability project scope mismatch/
);

function createLoopClient(stages = ["context_built", "planning", "completed_formal_proof"], externalStates = []) {
  const calls = [];
  const tickStages = [...stages];
  const tickExternalStates = [...externalStates];
  const campaignBase = {
    campaign_id: "CAM-0001",
    project_id: "PRJ-0001",
    root_claim_id: "C-0001",
    user_goal: "Prove in Lean that n + 0 = n",
    strict_mode: true,
    blockers: [],
    next_actions: []
  };

  const client = {
    get: async (path) => {
      calls.push({ method: "GET", path });
      if (path.startsWith("/project/status")) {
        return { project: { project_id: "PRJ-0001", name: "Pi Research Loop" }, runtime: { initialized: true } };
      }
      if (path.startsWith("/workstream/list")) {
        return { workstreams: [] };
      }
      if (path.startsWith("/claim/list")) {
        return {
          claims: [
            {
              id: "C-0001",
              status: "formally_checked",
              statement: "For every natural number n, n + 0 = n."
            }
          ]
        };
      }
      if (path.startsWith("/evidence/list")) {
        return { evidence: [{ id: "EV-0001", claim_id: "C-0001", kind: "lean" }] };
      }
      if (path.startsWith("/gate/list")) {
        return { gates: [{ id: "GR-0001", claim_id: "C-0001", ok: true, vetoes: [], warnings: [] }] };
      }
      if (path.startsWith("/paper/state")) {
        return { margin_notes: [] };
      }
      if (path.startsWith("/paper/check")) {
        return { ok: true, vetoes: [], warnings: [], notes: [] };
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
            status: "running",
            next_actions: ["tick campaign to build context pack"]
          },
          obligation: { obligation_id: "PO-0001", claim_id: "C-0001" }
        };
      }
      if (path === "/campaign/CAM-0001/tick") {
        const stage = tickStages.shift() ?? "planning";
        const externalTerminalState =
          tickExternalStates.shift() ??
          (stage === "completed_formal_proof"
            ? "formal_proof_verified"
            : stage === "completed_refutation"
              ? "verified_counterexample"
              : undefined);
        return {
          campaign: {
            ...campaignBase,
            current_stage: stage,
            status: stage.startsWith("completed_") ? "terminal" : "running",
            external_v3_terminal_state: externalTerminalState,
            next_actions: stage.startsWith("completed_") ? [] : [`continue from ${stage}`]
          }
        };
      }
      throw new Error(`unexpected POST ${path}`);
    }
  };
  return { client, calls };
}

const directHarness = createLoopClient();
const result = await runResearchCampaignLoop(directHarness.client, loopInput);
assert.equal(result.campaign.campaign_id, "CAM-0001");
assert.equal(result.campaign.current_stage, "completed_formal_proof");
assert.equal(result.campaign.external_v3_terminal_state, "formal_proof_verified");
assert.equal(result.external_v3_terminal_state, "formal_proof_verified");
assert.equal(result.terminal, true);
assert.equal(result.stopped_reason, "terminal");
assert.equal(result.ticks.length, 3);
assert.equal(result.dashboard.project.project_id, "PRJ-0001");
assert.equal(result.dashboard.claims[0].id, "C-0001");
assert.equal(result.dashboard.evidence[0].source, "runner");
assert.equal(directHarness.calls.filter((call) => call.method === "POST" && call.path.endsWith("/tick")).length, 3);
assert.equal(directHarness.calls.some((call) => call.path.includes("/paper/render-claim")), false);
assert.equal(directHarness.calls.some((call) => call.path.includes("/graph-patch/apply")), false);

const commandHarness = createLoopClient(["completed_formal_proof"]);
const commandResult = await runComathResearchCommand(
  commandHarness.client,
  '/cm:research start --goal "n + 0 = n" --strict',
  {
    project_root: "D:/research/project",
    project_name: "Pi Research Loop",
    actor: "phase22-pi",
    confirmation_id: "CONF-COMMAND",
    max_ticks: 2
  }
);
assert.equal(commandResult.terminal, true);
assert.equal(commandHarness.calls[0].path, "/campaign/start");
assert.equal(commandHarness.calls.some((call) => call.path === "/campaign/CAM-0001/tick"), true);

const toolHarness = createLoopClient(["completed_formal_proof"]);
const toolResult = await executeComathTool(toolHarness.client, "comath.research.runCampaignLoop", {
  project_root: "D:/research/project",
  project_name: "Pi Research Loop",
  user_goal: "n + 0 = n",
  actor: "phase22-pi",
  confirmation_id: "CONF-TOOL",
  max_ticks: 2
});
assert.equal(toolResult.terminal, true);
assert.equal(toolHarness.calls[0].path, "/campaign/start");
assert.equal(toolHarness.calls.some((call) => call.path === "/campaign/CAM-0001/tick"), true);

const exhaustedHarness = createLoopClient();
const exhausted = await runResearchCampaignLoop(exhaustedHarness.client, {
  ...loopInput,
  capability: issueCampaignLoopCapability({
    project_root: "D:/research/project",
    actor: "phase22-pi",
    max_ticks: 0,
    confirmation: {
      kind: "mutation_confirmation",
      target: "/cm:research",
      allowed: true,
      confirmation_id: "CONF-ZERO"
    }
  }),
  max_ticks: 0
});
assert.equal(exhausted.terminal, false);
assert.equal(exhausted.stopped_reason, "tick_budget_exhausted");
assert.equal(exhausted.ticks.length, 0);

const externalOnlyHarness = createLoopClient(["candidate_arbitration"], ["user_visible_theorem_repair_required"]);
const externalOnly = await runResearchCampaignLoop(externalOnlyHarness.client, {
  ...loopInput,
  capability: issueCampaignLoopCapability({
    project_root: "D:/research/project",
    actor: "phase22-pi",
    max_ticks: 1,
    confirmation: {
      kind: "mutation_confirmation",
      target: "/cm:research",
      allowed: true,
      confirmation_id: "CONF-EXTERNAL-V3"
    }
  }),
  max_ticks: 1
});
assert.equal(externalOnly.terminal, true);
assert.equal(externalOnly.stopped_reason, "terminal");
assert.equal(externalOnly.external_v3_terminal_state, "user_visible_theorem_repair_required");

console.log("Phase 22 research loop tests passed.");
