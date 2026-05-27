import assert from "node:assert/strict";
import {
  createComathPiExtension,
  createComathTools,
  executeComathTool,
  parseComathCommand,
  requireMutationConfirmation
} from "../dist/index.js";

const researchCommand = parseComathCommand("/cm:research start --goal n+0=n");
assert.deepEqual(researchCommand, {
  namespace: "cm",
  action: "research",
  subcommand: "start",
  args: ["--goal", "n+0=n"]
});

const tools = createComathTools();
const byName = new Map(tools.map((tool) => [tool.name, tool]));

const expectedCampaignTools = [
  ["comath.research.startCampaign", true, ["project_root", "user_goal", "actor"]],
  ["comath.campaign.status", false, ["project_root", "campaign_id"]],
  ["comath.campaign.tick", true, ["project_root", "campaign_id", "actor"]],
  ["comath.campaign.nextActions", false, ["project_root", "campaign_id"]],
  ["comath.campaign.finalAudit", true, ["project_root", "campaign_id", "actor"]],
  ["comath.campaign.replay", true, ["project_root", "campaign_id", "actor"]]
];

for (const [name, mutates, required] of expectedCampaignTools) {
  const tool = byName.get(name);
  assert.ok(tool, `${name} is registered`);
  assert.equal(tool.mutates, mutates, `${name} mutation flag`);
  assert.deepEqual(
    tool.input_schema.required,
    mutates ? [...required, "confirmation_id"] : required,
    `${name} required fields`
  );
  const permission = requireMutationConfirmation({ kind: "tool", name, mutates });
  assert.equal(permission.confirmation_required, mutates, `${name} confirmation flag`);
  assert.equal(permission.allowed, !mutates, `${name} default allow flag`);
}

const calls = [];
const client = {
  get: async (path) => {
    calls.push({ method: "GET", path });
    return { ok: true, path };
  },
  post: async (path, body) => {
    calls.push({ method: "POST", path, body });
    return { ok: true, path, body };
  }
};

await executeComathTool(client, "comath.research.startCampaign", {
  project_root: "D:/research/project",
  project_name: "Demo Campaign",
  user_goal: "Prove n + 0 = n",
  domain: "elementary",
  strict_mode: true,
  actor: "phase18-pi",
  confirmation_id: "CONF-START"
});
assert.deepEqual(calls.at(-1), {
  method: "POST",
  path: "/campaign/start",
  body: {
    project_root: "D:/research/project",
    project_name: "Demo Campaign",
    user_goal: "Prove n + 0 = n",
    domain: "elementary",
    strict_mode: true,
    actor: "phase18-pi"
  }
});

await executeComathTool(client, "comath.campaign.status", {
  project_root: "D:/research/project",
  campaign_id: "CAM-0001"
});
assert.equal(calls.at(-1).method, "GET");
assert.equal(calls.at(-1).path, "/campaign/CAM-0001/status?project_root=D%3A%2Fresearch%2Fproject");

await executeComathTool(client, "comath.campaign.tick", {
  project_root: "D:/research/project",
  campaign_id: "CAM-0001",
  actor: "phase18-pi",
  confirmation_id: "CONF-TICK"
});
assert.deepEqual(calls.at(-1), {
  method: "POST",
  path: "/campaign/CAM-0001/tick",
  body: {
    project_root: "D:/research/project",
    actor: "phase18-pi"
  }
});

await executeComathTool(client, "comath.campaign.nextActions", {
  project_root: "D:/research/project",
  campaign_id: "CAM-0001"
});
assert.equal(calls.at(-1).method, "GET");
assert.equal(calls.at(-1).path, "/campaign/CAM-0001/next-actions?project_root=D%3A%2Fresearch%2Fproject");

await executeComathTool(client, "comath.campaign.finalAudit", {
  project_root: "D:/research/project",
  campaign_id: "CAM-0001",
  actor: "phase18-pi",
  confirmation_id: "CONF-AUDIT"
});
assert.deepEqual(calls.at(-1), {
  method: "POST",
  path: "/campaign/CAM-0001/final-audit",
  body: {
    project_root: "D:/research/project",
    actor: "phase18-pi"
  }
});

await executeComathTool(client, "comath.campaign.replay", {
  project_root: "D:/research/project",
  campaign_id: "CAM-0001",
  actor: "phase18-pi",
  confirmation_id: "CONF-REPLAY"
});
assert.deepEqual(calls.at(-1), {
  method: "POST",
  path: "/campaign/CAM-0001/replay",
  body: {
    project_root: "D:/research/project",
    actor: "phase18-pi"
  }
});

await assert.rejects(
  () =>
    executeComathTool(client, "comath.campaign.tick", {
      project_root: "D:/research/project",
      confirmation_id: "CONF-MISSING-CAMPAIGN"
    }),
  /campaign_id is required/
);
await assert.rejects(
  () =>
    executeComathTool(client, "comath.campaign.tick", {
      project_root: "D:/research/project",
      campaign_id: "CAM-0001",
      actor: "phase18-pi"
    }),
  /confirmed mutation permission is required/
);
await assert.rejects(() => executeComathTool(client, "comath.unknown", {}), /unsupported comath tool/);

const extension = createComathPiExtension({ client });
assert.equal(extension.commands.includes("/cm:research"), true);
assert.equal(extension.tools.some((tool) => tool.name === "comath.research.startCampaign"), true);

console.log("Phase 18 Pi research/campaign tool tests passed.");
