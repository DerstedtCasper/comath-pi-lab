import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { createComathServer } from "../../services/comathd/dist/index.js";

const sessionRoot = mkdtempSync(join(tmpdir(), "comath-phase45-install-session-"));
const server = createComathServer();

try {
  const httpServer = await server.listen(0, "127.0.0.1");
  const address = httpServer.address();
  assert.equal(typeof address, "object", "comathd listen must return a bound TCP address");
  const baseUrl = `http://127.0.0.1:${address.port}`;

  const packageJson = JSON.parse(readFileSync(resolve("extensions/comath-pi/package.json"), "utf8"));
  const entrypointPath = resolve("extensions/comath-pi", packageJson.pi.extensions[0]);
  const entrypointModule = await import(pathToFileURL(entrypointPath).href);
  assert.equal(typeof entrypointModule.default, "function", "Pi package entrypoint must be importable from the built package manifest");
  assert.equal(entrypointModule.runtime_registration.runtime_policy.global_rpm, 4);
  assert.equal(entrypointModule.runtime_registration.boundary.trusted_state_access, "comathd_only");

  const client = entrypointModule.createComathClient({ baseUrl });
  const fakePi = createFakePi();
  const notifications = [];
  const confirmations = [];
  entrypointModule.default(fakePi.api, {
    client,
    project_root: sessionRoot,
    project_name: "Phase 45 Install Session",
    actor: "phase45-pi",
    max_ticks: 2
  });

  assert.equal(fakePi.tools.has("comath.research.startCampaign"), true);
  assert.equal(fakePi.tools.has("comath.agent.adapterPackageList"), true);
  assert.equal(fakePi.commands.has("cm:research"), true);
  assert.equal(fakePi.commands.has("cm:campaign"), true);
  assert.equal(fakePi.commands.has("cm:agent"), true);
  assert.equal(fakePi.handlers.has("resources_discover"), true);

  const health = await client.get("/health");
  assert.equal(health.ok, true);
  assert.equal(health.capabilities.includes("codex_cli_external_adapter_invocation"), true);

  const startResult = await fakePi.tools.get("comath.research.startCampaign").execute(
    "TC-PHASE45-START",
    {
      project_root: sessionRoot,
      project_name: "Phase 45 Install Session",
      user_goal: "Prove Nat.add_zero through the installed Pi/comathd session.",
      actor: "phase45-pi"
    },
    undefined,
    undefined,
    hostContext(confirmations, notifications)
  );
  assert.equal(startResult.isError, undefined, startResult.content[0]?.text);
  assert.equal(confirmations.length, 1, "mutating Pi runtime tool requires host confirmation");
  const campaignId = startResult.details.campaign.campaign_id;
  const projectId = startResult.details.campaign.project_id;
  assert.match(campaignId, /^CAM-/);
  assert.match(projectId, /^PRJ-/);

  await fakePi.commands.get("cm:campaign").handler(`status ${campaignId}`, hostContext(confirmations, notifications));
  assert.match(notifications.at(-1).message, new RegExp(campaignId));

  await fakePi.commands.get("cm:campaign").handler(`tick ${campaignId}`, hostContext(confirmations, notifications));
  assert.equal(confirmations.length, 2, "mutating command path also requires host confirmation");

  await fakePi.commands.get("cm:agent").handler("packages", hostContext(confirmations, notifications));
  assert.match(notifications.at(-1).message, /codex-cli/);

  await fakePi.commands.get("cm:agent").handler(
    `prepare-package codex-cli --project-id ${projectId} --run-id ARUN-4500 --profile proof-route --goal "Install session adapter package smoke." --context .comath/campaign/${campaignId}/campaign.json`,
    hostContext(confirmations, notifications)
  );
  assert.equal(confirmations.length, 3, "packaged adapter launch preparation remains host-confirmed");
  assert.match(notifications.at(-1).message, /codex-cli/);
  assert.match(notifications.at(-1).message, /proof_authority/);
  assert.match(notifications.at(-1).message, /COMATH_CODEX_ADAPTER_BACKEND/);

  const status = await client.get(`/project/status?project_root=${encodeURIComponent(sessionRoot)}`);
  assert.equal(status.project.project_id, projectId);
  assert.equal(status.project.name, "Phase 45 Install Session");

  const resources = fakePi.handlers.get("resources_discover")({}, hostContext(confirmations, notifications));
  assert.deepEqual(resources.skillPaths, ["skills"]);
  assert.deepEqual(resources.promptPaths, ["prompts"]);

  assert.equal(
    notifications.every((entry) => typeof entry.message === "string" && entry.message.length > 0),
    true,
    "interactive session should surface operator-visible notifications"
  );
} finally {
  await server.close();
  rmSync(sessionRoot, { recursive: true, force: true });
}

function hostContext(confirmations, notifications) {
  return {
    ui: {
      confirm: async (title, body) => {
        confirmations.push({ title, body });
        return true;
      },
      notify: async (message, level = "info") => {
        notifications.push({ message, level });
      }
    }
  };
}

function createFakePi() {
  const tools = new Map();
  const commands = new Map();
  const handlers = new Map();
  return {
    tools,
    commands,
    handlers,
    api: {
      registerTool(tool) {
        tools.set(tool.name, tool);
      },
      registerCommand(name, options) {
        commands.set(name, options);
      },
      on(event, handler) {
        handlers.set(event, handler);
      }
    }
  };
}

console.log("Phase 45 Pi/comathd install-session e2e tests passed.");
