import assert from "node:assert/strict";
import { pathToFileURL } from "node:url";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  createComathPiExtension,
  createPiRuntimeRegistration,
  executeComathTool,
  runtime_registration,
  validatePiRuntimeRegistration
} from "../dist/index.js";

const client = {
  get: async () => ({ ok: true }),
  post: async () => ({ ok: true })
};

const extension = createComathPiExtension({ client });
const registration = createPiRuntimeRegistration(extension, {
  package_name: "@comath/pi-extension",
  package_version: "0.0.0",
  entrypoint: "dist/index.js",
  detected_pi_runtime: {
    source: "local_probe",
    version: "unknown",
    confidence: "unverified"
  },
  rate_limit: {
    global_rpm: 4
  }
});

assert.equal(registration.schema_version, "comath.pi.runtime.registration.v1");
assert.equal(registration.extension_id, "comath-pi-lab");
assert.equal(registration.package.name, "@comath/pi-extension");
assert.equal(registration.entrypoint, "dist/index.js");
assert.equal(registration.runtime_policy.global_rpm, 4);
assert.equal(registration.runtime_policy.tick_budget.default_max_ticks, 8);
assert.equal(registration.runtime_policy.tick_budget.per_tick_mutation_owner, "comathd");
assert.equal(registration.boundary.trusted_state_access, "comathd_only");
assert.equal(registration.boundary.extension_writes_runtime_state, false);
assert.equal(registration.boundary.pi_session_is_math_authority, false);
assert.deepEqual(registration.service_authority.comathd_owns, [
  "ResearchCampaign",
  "claim_graph",
  "evidence_graph",
  "workstreams",
  "proof_memory",
  "failure_memory",
  "TriviumDB_adapter",
  "Lean_verification",
  "final_audit",
  "global_replay",
  "goal_mode_resume_state",
  "goal_mode_export_pack"
]);

const researchCommand = registration.commands.find((command) => command.command === "/cm:research");
assert.ok(researchCommand, "research command is in runtime registration");
assert.equal(researchCommand.goal_compatible, true);
assert.equal(researchCommand.dispatch_tool, "comath.research.runCampaignLoop");
assert.equal(researchCommand.mutates, true);
assert.equal(researchCommand.requires_confirmation, true);

const campaignTick = registration.commands.find((command) => command.command === "/cm:campaign");
assert.ok(campaignTick?.subcommands.includes("tick"), "campaign tick command is registered");
assert.equal(campaignTick?.dispatch_tool, "comath.campaign.tick");

const byToolName = new Map(registration.tools.map((tool) => [tool.name, tool]));
assert.equal(byToolName.get("comath.research.runCampaignLoop")?.pi_goal_continuation, true);
assert.equal(byToolName.get("comath.research.runCampaignLoop")?.bounded_tick, false);
assert.equal(byToolName.get("comath.campaign.tick")?.bounded_tick, true);
assert.equal(byToolName.get("comath.campaign.status")?.requires_confirmation, false);
assert.equal(byToolName.get("comath.campaign.finalAudit")?.requires_confirmation, true);

const mutatingToolNames = registration.tools.filter((tool) => tool.mutates).map((tool) => tool.name).sort();
assert.deepEqual(registration.permissions.mutating_tools_requiring_confirmation.sort(), mutatingToolNames);
assert.equal(registration.permissions.default_for_mutations, "deny_until_confirmed");
assert.equal(registration.permissions.readonly_tools_allowed_without_confirmation, true);
for (const tool of registration.tools) {
  if (tool.mutates) {
    assert.equal(
      tool.input_schema.required.includes("confirmation_id"),
      false,
      `${tool.name} must not expose model-supplied confirmation_id in its Pi runtime schema`
    );
    assert.equal(
      Object.hasOwn(tool.input_schema.properties, "confirmation_id"),
      false,
      `${tool.name} must keep confirmation_id host-injected rather than model-supplied`
    );
  }
}

const serialized = JSON.stringify(registration);
assert.equal(serialized.includes("http://"), false);
assert.equal(serialized.includes("baseUrl"), false);
assert.equal(serialized.includes("COMATHD_BASE_URL"), false);
assert.equal(serialized.includes(".comath/claims"), false);

const packageJsonPath = resolve(process.cwd(), "package.json");
const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf8"));
assert.equal(packageJson.private, false);
assert.equal(packageJson.main, "dist/index.js");
assert.equal(packageJson.exports["."].import, "./dist/index.js");
assert.equal(packageJson.exports["."].types, "./dist/index.d.ts");
assert.deepEqual(packageJson.pi.extensions, ["./dist/index.js"]);
assert.equal(packageJson.pi.runtime_policy.global_rpm, 4);
assert.equal(packageJson.pi.runtime_policy.registration_export, "runtime_registration");
assert.deepEqual(packageJson.files.sort(), ["dist", "README.md"].sort());

const entrypointPath = resolve(process.cwd(), packageJson.pi.extensions[0]);
const entrypointModule = await import(pathToFileURL(entrypointPath).href);
assert.equal(typeof entrypointModule.default, "function");
assert.equal(entrypointModule[packageJson.pi.runtime_policy.registration_export].extension_id, "comath-pi-lab");
assert.equal(
  normalizeEntrypoint(entrypointModule[packageJson.pi.runtime_policy.registration_export].entrypoint),
  normalizeEntrypoint(packageJson.pi.extensions[0])
);
assert.equal(runtime_registration.extension_id, "comath-pi-lab");
assert.equal(runtime_registration.runtime_policy.global_rpm, 4);
assert.equal(
  validatePiRuntimeRegistration(runtime_registration, {
    expected_global_rpm: 4,
    require_goal_continuation: true
  }).ok,
  true
);

const fakePi = createFakePi();
const runtimeCalls = [];
await entrypointModule.default(fakePi.api, {
  client: {
    get: async (path) => {
      runtimeCalls.push({ method: "GET", path });
      return { ok: true };
    },
    post: async (path, body) => {
      runtimeCalls.push({ method: "POST", path, body });
      return { ok: true };
    }
  }
});
assert.equal(fakePi.tools.has("comath.research.runCampaignLoop"), true);
assert.equal(fakePi.tools.has("comath.campaign.tick"), true);
assert.equal(fakePi.tools.has("comath.evidence.attach"), false);
assert.equal(fakePi.tools.has("comath.status.snapshot"), false);
assert.equal(fakePi.commands.has("cm:research"), true);
assert.equal(fakePi.commands.has("cm:campaign"), true);
assert.equal(fakePi.commands.has("cm:agent"), true);
assert.equal(fakePi.commands.has("cm:audit"), true);
assert.equal(fakePi.commands.has("cm:snapshot"), true);
assert.equal(fakePi.commands.has("cm:replay"), true);
assert.equal(fakePi.commands.has("cm:release"), true);
assert.deepEqual(
  runtime_registration.commands.map((command) => command.command).sort(),
  ["/cm:agent", "/cm:audit", "/cm:campaign", "/cm:release", "/cm:replay", "/cm:research", "/cm:snapshot"].sort()
);
assert.equal(fakePi.handlers.has("resources_discover"), true);
for (const toolName of fakePi.tools.keys()) {
  assert.equal(
    [
      "comath.research.startCampaign",
      "comath.research.runCampaignLoop",
      "comath.campaign.status",
      "comath.campaign.tick",
      "comath.campaign.nextActions",
      "comath.campaign.resume",
      "comath.campaign.cancel",
      "comath.campaign.export",
      "comath.campaign.finalAudit",
      "comath.campaign.replay",
      "comath.snapshot.export",
      "comath.snapshot.verify",
      "comath.snapshot.restore",
      "comath.replay.verifyManifest",
      "comath.release.sourceReviewPublicArchive",
      "comath.release.publicArchiveReview",
      "comath.release.piCodexLifecycleReview",
      "comath.release.piCodexApiProbe",
      "comath.release.piRealPiRuntimeProbe",
      "comath.release.piCodexLifecycleWalkthrough",
      "comath.release.piCodexLifecycleControl",
      "comath.release.piCodexLifecycleSession",
      "comath.release.piCodexLifecycleOperatorSession",
      "comath.release.piCodexLifecycleOperatorTransportRecovery",
      "comath.release.piCodexLifecycleOperatorTransportLease",
      "comath.release.piCodexLifecycleOperatorTransportHeartbeat",
      "comath.release.piCodexLifecycleGuidedRealPiExecution",
      "comath.release.piCodexLifecycleInteractiveRealPi",
      "comath.release.agentAdapterOsIsolationProbe",
      "comath.release.agentAdapterOsIsolationSandboxExecutionProbe",
      "comath.release.agentAdapterOsIsolationProviderHostCapabilityProbe",
      "comath.release.agentAdapterOsIsolationProviderHelperHostValidation",
      "comath.agent.profileList",
      "comath.agent.profileGet",
      "comath.agent.runForProfile",
      "comath.agent.prepareLaunch",
      "comath.agent.executeProfile",
      "comath.agent.logs",
      "comath.agent.streamLogs",
      "comath.agent.subscribeLogs",
      "comath.agent.logSession",
      "comath.agent.operatorPanel",
      "comath.agent.cancelRun",
      "comath.agent.health",
      "comath.agent.adapterPackageList",
      "comath.agent.prepareAdapterPackage",
      "comath.agent.executeAdapterPackage"
    ].includes(toolName),
    true,
    `${toolName} is not wired through executeComathTool yet`
  );
}

const runtimeTickParameters = fakePi.tools.get("comath.campaign.tick").parameters;
assert.equal(runtimeTickParameters.required.includes("confirmation_id"), false);
assert.equal(Object.hasOwn(runtimeTickParameters.properties, "confirmation_id"), false);

const deniedMutation = await fakePi.tools.get("comath.campaign.tick").execute(
  "TC-DENIED",
  {
    project_root: "D:/research/project",
    campaign_id: "CAM-0001",
    actor: "phase26-pi",
    confirmation_id: "MODEL-SUPPLIED-IGNORED"
  },
  undefined,
  undefined,
  {
    ui: {
      confirm: async () => false
    }
  }
);
assert.equal(deniedMutation.isError, true);
assert.match(deniedMutation.content[0].text, /rejected by Pi host confirmation/);
assert.equal(runtimeCalls.length, 0);

const confirmationPrompts = [];
const confirmedMutation = await fakePi.tools.get("comath.campaign.tick").execute(
  "TC-CONFIRMED",
  {
    project_root: "D:/research/project",
    campaign_id: "CAM-0001",
    actor: "phase26-pi",
    confirmation_id: "MODEL-SUPPLIED-IGNORED"
  },
  undefined,
  undefined,
  {
    ui: {
      confirm: async (title, body) => {
        confirmationPrompts.push({ title, body });
        return true;
      }
    }
  }
);
assert.equal(confirmedMutation.isError, undefined);
assert.equal(runtimeCalls.at(-1).method, "POST");
assert.equal(runtimeCalls.at(-1).path, "/campaign/CAM-0001/tick");
assert.equal(runtimeCalls.at(-1).body.actor, "phase26-pi");
assert.equal(confirmationPrompts.length, 1);
assert.match(confirmationPrompts[0].body, /comath\.campaign\.tick/);

await fakePi.commands.get("cm:campaign").handler(
  "status CAM-0001 --project-root D:/research/project",
  { ui: { notify: async () => undefined } }
);
assert.equal(runtimeCalls.at(-1).method, "GET");
assert.match(runtimeCalls.at(-1).path, /\/campaign\/CAM-0001\/status/);

await fakePi.commands.get("cm:campaign").handler(
  "status --campaign-id CAM-0001 --project-root D:/research/project",
  { ui: { notify: async () => undefined } }
);
assert.equal(runtimeCalls.at(-1).method, "GET");
assert.match(runtimeCalls.at(-1).path, /\/campaign\/CAM-0001\/status/);

await assert.rejects(
  () =>
    fakePi.commands.get("cm:campaign").handler(
      "status --project-root D:/research/project",
      { ui: { notify: async () => undefined } }
    ),
  /campaign_id is required/
);

await fakePi.commands.get("cm:campaign").handler(
  "tick CAM-0001 --project-root D:/research/project --actor phase26-pi",
  {
    ui: {
      confirm: async () => true,
      notify: async () => undefined
    }
  }
);
assert.equal(runtimeCalls.at(-1).method, "POST");
assert.equal(runtimeCalls.at(-1).path, "/campaign/CAM-0001/tick");

await fakePi.commands.get("cm:audit").handler(
  "final CAM-0001 --project-root D:/research/project --actor phase26-pi",
  {
    ui: {
      confirm: async () => true,
      notify: async () => undefined
    }
  }
);
assert.equal(runtimeCalls.at(-1).method, "POST");
assert.equal(runtimeCalls.at(-1).path, "/campaign/CAM-0001/final-audit");

await fakePi.commands.get("cm:replay").handler(
  "final CAM-0001 --project-root D:/research/project --actor phase26-pi",
  {
    ui: {
      confirm: async () => true,
      notify: async () => undefined
    }
  }
);
assert.equal(runtimeCalls.at(-1).method, "POST");
assert.equal(runtimeCalls.at(-1).path, "/campaign/CAM-0001/replay");

await assert.rejects(
  () =>
    executeComathTool(
      {
        get: async () => ({ ok: true }),
        post: async () => {
          throw new Error("post should not be reached without confirmation");
        }
      },
      "comath.campaign.tick",
      {
        project_root: "D:/research/project",
        campaign_id: "CAM-0001",
        actor: "phase26-pi"
      }
    ),
  /confirmed mutation permission is required/
);

const confirmedCalls = [];
await executeComathTool(
  {
    get: async (path) => {
      confirmedCalls.push({ method: "GET", path });
      return { ok: true };
    },
    post: async (path, body) => {
      confirmedCalls.push({ method: "POST", path, body });
      return { ok: true };
    }
  },
  "comath.campaign.tick",
  {
    project_root: "D:/research/project",
    campaign_id: "CAM-0001",
    actor: "phase26-pi",
    confirmation_id: "CONF-PHASE26"
  }
);
assert.equal(confirmedCalls.at(-1).method, "POST");
assert.equal(confirmedCalls.at(-1).path, "/campaign/CAM-0001/tick");

const validation = validatePiRuntimeRegistration(registration, {
  expected_global_rpm: 4,
  require_goal_continuation: true
});
assert.equal(validation.ok, true);
assert.deepEqual(validation.vetoes, []);

const badRpm = structuredClone(registration);
badRpm.runtime_policy.global_rpm = 5;
const rpmValidation = validatePiRuntimeRegistration(badRpm, {
  expected_global_rpm: 4,
  require_goal_continuation: true
});
assert.equal(rpmValidation.ok, false);
assert.equal(rpmValidation.vetoes.some((veto) => veto.code === "global_rpm_mismatch"), true);

const badPermission = structuredClone(registration);
badPermission.permissions.mutating_tools_requiring_confirmation =
  badPermission.permissions.mutating_tools_requiring_confirmation.filter(
    (name) => name !== "comath.campaign.tick"
  );
const permissionValidation = validatePiRuntimeRegistration(badPermission, {
  expected_global_rpm: 4,
  require_goal_continuation: true
});
assert.equal(permissionValidation.ok, false);
assert.equal(
  permissionValidation.vetoes.some((veto) => veto.code === "mutating_tool_without_confirmation"),
  true
);

const badGoal = structuredClone(registration);
badGoal.commands = badGoal.commands.map((command) =>
  command.command === "/cm:research" ? { ...command, goal_compatible: false } : command
);
const goalValidation = validatePiRuntimeRegistration(badGoal, {
  expected_global_rpm: 4,
  require_goal_continuation: true
});
assert.equal(goalValidation.ok, false);
assert.equal(goalValidation.vetoes.some((veto) => veto.code === "research_goal_command_not_registered"), true);

const badBoundary = structuredClone(registration);
badBoundary.boundary.trusted_state_access = "extension_direct";
const boundaryValidation = validatePiRuntimeRegistration(badBoundary, {
  expected_global_rpm: 4,
  require_goal_continuation: true
});
assert.equal(boundaryValidation.ok, false);
assert.equal(boundaryValidation.vetoes.some((veto) => veto.code === "trusted_state_boundary_violation"), true);

assert.equal(extension.runtime_registration.extension_id, registration.extension_id);
assert.equal(extension.runtime_registration.runtime_policy.global_rpm, 4);

function normalizeEntrypoint(value) {
  return value.replace(/^[.][\\/]/, "").replaceAll("\\", "/");
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

console.log("Phase 26 Pi runtime registration tests passed.");
