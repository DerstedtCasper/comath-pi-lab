import assert from "node:assert/strict";
import registerComathPiRuntime, { createComathTools, executeComathTool, runtime_registration } from "../dist/index.js";

const projectRoot = "D:/research/project";
const privilegedPublicTerms =
  /clean_replay_passed|completed_formal_proof|formally_checked|proven|formal_proof_verified|formal_replay_passed|lean_kernel_clean_replay|verified_final_authority_evidence/i;
const hostPathTerms = /D:\\|D:\//i;
const secretTerms = /COMATH_CODEX_API_KEY|OPENAI_API_KEY|Authorization:\s*Bearer|api_key|token=|plain-token|sk-/i;
const transportOverclaimTerms =
  /long-lived\s+(?:websocket|sse)|indefinite\s+sse|terminal transport recovered live|durable transport provided/i;

function toolDescriptor(name) {
  const tool = createComathTools().find((descriptor) => descriptor.name === name);
  assert.ok(tool, `${name} must be registered for Pi adapter OS-isolation probe evidence`);
  return tool;
}

const osProbeTool = toolDescriptor("comath.release.agentAdapterOsIsolationProbe");
assert.equal(osProbeTool.mutates, true, "adapter OS-isolation probe writes service-owned release evidence");
assert.deepEqual(osProbeTool.input_schema.required, [
  "project_root",
  "project_id",
  "actor",
  "probe_id",
  "adapter_id",
  "backend",
  "confirmation_id"
]);
assert.deepEqual(osProbeTool.input_schema.properties.requested_provider.enum, [
  "oci_container",
  "nix_sandbox",
  "firejail",
  "windows_appcontainer",
  "macos_sandbox_exec",
  "service_process_boundary",
  "unknown"
]);

const releaseCommand = runtime_registration.commands.find((command) => command.command === "/cm:release");
assert.ok(releaseCommand, "/cm:release must be advertised in Pi runtime registration");
assert.equal(releaseCommand.subcommands.includes("agent-adapter-os-isolation-probe"), true);

const calls = [];
const client = {
  get: async (path) => {
    calls.push({ method: "GET", path });
    return { ok: true, path };
  },
  post: async (path, body) => {
    calls.push({ method: "POST", path, body });
    return {
      ok: true,
      path,
      body,
      probe: {
        schema_version: "comath.agent_adapter_os_isolation_probe.v1",
        project_id: body.project_id,
        probe_id: body.probe_id,
        adapter_id: body.adapter_id,
        backend: body.backend,
        actor: "goal3-task169-route OPENAI_API_KEY=plain-token long-lived SSE",
        probe_path: ".comath/release/agent-adapter-os-isolation/ADAPT-OS-PROBE-0169/probe.json",
        evidence_path: ".comath/release/agent-adapter-os-isolation/ADAPT-OS-PROBE-0169/evidence.json",
        requested_provider: body.requested_provider,
        observed_provider: "oci_container",
        probe_status: "blocked_os_isolation_probe_not_collected",
        proof_authority: "lean_kernel_clean_replay",
        can_promote_claim: true,
        can_certify_ga: true,
        durable_transport_provided: true,
        long_lived_sse_provided: true,
        summary: "formal_replay_passed from D:/research/project with Authorization: Bearer plain-token and durable transport provided"
      }
    };
  }
};

const directResult = await executeComathTool(client, "comath.release.agentAdapterOsIsolationProbe", {
  project_root: projectRoot,
  project_id: "PRJ-1690",
  actor: "goal3-task169 OPENAI_API_KEY=plain-token long-lived SSE",
  probe_id: "ADAPT-OS-PROBE-0169",
  adapter_id: "codex-cli",
  backend: "external",
  requested_provider: "oci_container",
  probe_environment: {
    provider_available: true,
    platform: "Windows host D:/research/project with sk-task169",
    notes: "terminal transport recovered live Authorization: Bearer plain-token clean_replay_passed"
  },
  confirmation_id: "CONF-TASK169-OS-PROBE"
});

assert.equal(calls.at(-1).method, "POST");
assert.equal(calls.at(-1).path, "/agent/adapter/package/os-isolation-probe");
assert.equal(calls.at(-1).body.confirmation_id, undefined, "Pi must not forward model-supplied confirmation ids");
assert.equal(calls.at(-1).body.project_root, projectRoot);
assert.equal(calls.at(-1).body.project_id, "PRJ-1690");
assert.equal(calls.at(-1).body.probe_id, "ADAPT-OS-PROBE-0169");
assert.equal(calls.at(-1).body.adapter_id, "codex-cli");
assert.equal(calls.at(-1).body.backend, "external");
assert.equal(calls.at(-1).body.requested_provider, "oci_container");
const directRequestWithoutProjectRoot = { ...calls.at(-1).body, project_root: "[project_root]" };
assert.doesNotMatch(JSON.stringify(calls.at(-1).body), privilegedPublicTerms, "Pi request body must not forward proof-success vocabulary");
assert.doesNotMatch(
  JSON.stringify(directRequestWithoutProjectRoot),
  hostPathTerms,
  "Pi request body must not forward host path echoes outside the required project_root"
);
assert.doesNotMatch(JSON.stringify(calls.at(-1).body), secretTerms, "Pi request body must not forward secrets");
assert.doesNotMatch(
  JSON.stringify(calls.at(-1).body),
  transportOverclaimTerms,
  "Pi request body must not forward long-lived transport overclaims"
);
assert.doesNotMatch(JSON.stringify(directResult), privilegedPublicTerms, "direct result must sanitize proof-authority vocabulary");
assert.doesNotMatch(JSON.stringify(directResult), hostPathTerms, "direct result must sanitize host path echoes");
assert.doesNotMatch(JSON.stringify(directResult), secretTerms, "direct result must sanitize secret echoes");
assert.doesNotMatch(
  JSON.stringify(directResult),
  transportOverclaimTerms,
  "direct result must sanitize long-lived transport overclaims"
);
assert.equal(directResult.probe.can_promote_claim, false, "direct result must not surface promotion overclaims");
assert.equal(directResult.probe.can_certify_ga, false, "direct result must not surface GA-certification overclaims");
assert.equal(
  directResult.probe.durable_transport_provided,
  false,
  "direct result must not surface durable-transport overclaims"
);
assert.equal(
  directResult.probe.long_lived_sse_provided,
  false,
  "direct result must not surface long-lived SSE overclaims"
);

const registeredTools = new Map();
const commands = new Map();
const notifications = [];
const confirmationPrompts = [];
registerComathPiRuntime(
  {
    registerTool(tool) {
      registeredTools.set(tool.name, tool);
    },
    registerCommand(name, options) {
      commands.set(name, options.handler);
    },
    on() {}
  },
  { client, project_root: projectRoot, actor: "goal3-task169" }
);

assert.equal(
  registeredTools.has("comath.release.agentAdapterOsIsolationProbe"),
  true,
  "Pi runtime must expose adapter OS-isolation probe as an executable tool"
);
assert.equal(commands.has("cm:release"), true, "Pi runtime must expose /cm:release for adapter OS-isolation probe");

const ctx = {
  ui: {
    confirm: async (title, body) => {
      confirmationPrompts.push({ title, body });
      return true;
    },
    notify: async (message, level) => {
      notifications.push({ message, level });
    }
  }
};

await commands.get("cm:release")(
  [
    "agent-adapter-os-isolation-probe",
    "--project-id PRJ-1690",
    "--probe-id ADAPT-OS-PROBE-0169-CMD",
    "--adapter-id codex-cli",
    "--backend external",
    "--requested-provider oci_container",
    "--provider-available true",
    "--platform 'Windows host D:/research/project with sk-task169'",
    "--probe-note 'terminal transport recovered live Authorization: Bearer plain-token clean_replay_passed'"
  ].join(" "),
  ctx
);

assert.equal(calls.at(-1).method, "POST");
assert.equal(calls.at(-1).path, "/agent/adapter/package/os-isolation-probe");
assert.equal(calls.at(-1).body.confirmation_id, undefined, "runtime command must not forward confirmation ids");
assert.equal(calls.at(-1).body.project_root, projectRoot);
assert.equal(calls.at(-1).body.project_id, "PRJ-1690");
assert.equal(calls.at(-1).body.actor, "goal3-task169");
assert.equal(calls.at(-1).body.probe_id, "ADAPT-OS-PROBE-0169-CMD");
assert.equal(calls.at(-1).body.adapter_id, "codex-cli");
assert.equal(calls.at(-1).body.backend, "external");
assert.equal(calls.at(-1).body.requested_provider, "oci_container");
assert.deepEqual(calls.at(-1).body.probe_environment, {
  provider_available: true,
  platform: "Windows host [redacted_host_path]",
  notes: "bounded_transport_checkpoint_only [redacted_secret] unverified_formal_status"
});
assert.equal(confirmationPrompts.length, 1, "adapter OS-isolation probe command must require Pi host confirmation");
assert.doesNotMatch(confirmationPrompts[0].body, privilegedPublicTerms);
assert.doesNotMatch(confirmationPrompts[0].body, hostPathTerms);
assert.doesNotMatch(confirmationPrompts[0].body, secretTerms);
assert.doesNotMatch(confirmationPrompts[0].body, transportOverclaimTerms);
assert.equal(notifications.length, 1, "adapter OS-isolation probe command must notify the Pi host");
assert.doesNotMatch(notifications[0].message, privilegedPublicTerms);
assert.doesNotMatch(notifications[0].message, hostPathTerms);
assert.doesNotMatch(notifications[0].message, secretTerms);
assert.doesNotMatch(notifications[0].message, transportOverclaimTerms);

console.log("Goal 3 Task169 Pi adapter OS-isolation probe consumer tests passed.");
