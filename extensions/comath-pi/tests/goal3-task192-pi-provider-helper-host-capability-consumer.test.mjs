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
  assert.ok(tool, `${name} must be registered for Pi provider-helper host capability consumers`);
  return tool;
}

function assertPublicBoundary(value, label) {
  assert.doesNotMatch(JSON.stringify(value), privilegedPublicTerms, `${label} must sanitize proof-authority vocabulary`);
  assert.doesNotMatch(JSON.stringify(value), hostPathTerms, `${label} must sanitize host path echoes`);
  assert.doesNotMatch(JSON.stringify(value), secretTerms, `${label} must sanitize secret echoes`);
  assert.doesNotMatch(JSON.stringify(value), transportOverclaimTerms, `${label} must sanitize transport overclaims`);
}

function assertNoForbiddenKeys(value, keys, label) {
  const serialized = JSON.stringify(value);
  for (const key of keys) {
    assert.equal(serialized.includes(`"${key}"`), false, `${label} must not forward caller-supplied ${key}`);
  }
}

const hostCapabilityTool = toolDescriptor("comath.release.agentAdapterOsIsolationProviderHostCapabilityProbe");
assert.equal(hostCapabilityTool.mutates, true, "provider host capability probe writes service-owned release diagnostics");
assert.deepEqual(hostCapabilityTool.input_schema.required, [
  "project_root",
  "project_id",
  "actor",
  "host_capability_probe_id",
  "adapter_id",
  "backend",
  "confirmation_id"
]);
assert.deepEqual(hostCapabilityTool.input_schema.properties.requested_provider.enum, [
  "oci_container",
  "nix_sandbox",
  "firejail",
  "windows_appcontainer",
  "macos_sandbox_exec",
  "service_process_boundary",
  "unknown"
]);

const hostValidationTool = toolDescriptor("comath.release.agentAdapterOsIsolationProviderHelperHostValidation");
assert.equal(hostValidationTool.mutates, true, "provider-helper host validation writes service-owned diagnostics");
assert.deepEqual(hostValidationTool.input_schema.required, [
  "project_root",
  "project_id",
  "actor",
  "host_validation_id",
  "host_capability_probe_id",
  "runner_id",
  "launch_id",
  "adapter_id",
  "backend",
  "confirmation_id"
]);

const releaseCommand = runtime_registration.commands.find((command) => command.command === "/cm:release");
assert.ok(releaseCommand, "/cm:release must be advertised in Pi runtime registration");
assert.equal(releaseCommand.subcommands.includes("agent-adapter-os-isolation-provider-host-capability-probe"), true);
assert.equal(releaseCommand.subcommands.includes("agent-adapter-os-isolation-provider-helper-host-validation"), true);

const calls = [];
const client = {
  get: async (path) => {
    calls.push({ method: "GET", path });
    return { ok: true, path };
  },
  post: async (path, body) => {
    calls.push({ method: "POST", path, body });
    if (path === "/agent/adapter/package/os-isolation-provider-host-capability-probe") {
      return {
        ok: true,
        path,
        body,
        host_capability_probe: {
          schema_version: "comath.agent_adapter_os_isolation_provider_host_capability_probe.v1",
          project_id: body.project_id,
          host_capability_probe_id: body.host_capability_probe_id,
          adapter_id: body.adapter_id,
          backend: body.backend,
          actor: "goal3-task192-route OPENAI_API_KEY=plain-token long-lived SSE",
          host_capability_probe_path:
            ".comath/release/agent-adapter-os-isolation/ADAPTER-OSISO-HOST-CAP-0192/probe.json",
          host_capability_status: "provider_host_capability_observed",
          provider: body.requested_provider,
          provider_host_capability_available: true,
          provider_host_capability: {
            probe_source: "operator_attested",
            provider_host_capability_available: true,
            caller_supplied_success_allowed: true,
            proof_authority: "lean_kernel_clean_replay"
          },
          adapter_execution_isolation: {
            current_boundary: "os_enforced",
            os_enforced: true
          },
          proof_authority: "lean_kernel_clean_replay",
          can_promote_claim: true,
          can_certify_ga: true,
          durable_transport_provided: true,
          long_lived_sse_provided: true,
          summary: "formal_replay_passed from D:/research/project with Authorization: Bearer plain-token"
        }
      };
    }
    if (path === "/agent/adapter/package/os-isolation-provider-helper-host-validation") {
      return {
        ok: true,
        path,
        body,
        host_validation: {
          schema_version: "comath.agent_adapter_os_isolation_provider_helper_host_validation.v1",
          project_id: body.project_id,
          host_validation_id: body.host_validation_id,
          host_capability_probe_id: body.host_capability_probe_id,
          runner_id: body.runner_id,
          launch_id: body.launch_id,
          adapter_id: body.adapter_id,
          backend: body.backend,
          actor: "goal3-task192-route OPENAI_API_KEY=plain-token long-lived SSE",
          host_validation_path:
            ".comath/release/agent-adapter-os-isolation/ADAPTER-OSISO-HELPER-HOST-0192/host-validation.json",
          host_validation_status: "provider_helper_host_validated",
          provider_helper_host_ready: true,
          provider_host_capability_binding: {
            bound: true,
            probe_source: "operator_attested",
            proof_authority: "lean_kernel_clean_replay"
          },
          provider_helper_host_validation: {
            validation_source: "operator_attested",
            helper_host_ready: true,
            host_capability_required: true,
            host_capability_bound: true
          },
          adapter_execution_isolation: {
            current_boundary: "os_enforced",
            os_enforced: true
          },
          proof_authority: "lean_kernel_clean_replay",
          can_promote_claim: true,
          can_certify_ga: true,
          durable_transport_provided: true,
          long_lived_sse_provided: true,
          summary: "formal_replay_passed from D:/research/project with Authorization: Bearer plain-token"
        }
      };
    }
    throw new Error(`unexpected POST path ${path}`);
  }
};

const hostCapabilityResult = await executeComathTool(
  client,
  "comath.release.agentAdapterOsIsolationProviderHostCapabilityProbe",
  {
    project_root: projectRoot,
    project_id: "PRJ-1920",
    actor: "goal3-task192 OPENAI_API_KEY=plain-token long-lived SSE",
    host_capability_probe_id: "ADAPTER-OSISO-HOST-CAP-0192",
    adapter_id: "codex-cli",
    backend: "external",
    requested_provider: "windows_appcontainer",
    host_capability_environment: {
      platform: "Windows host D:/research/project with sk-task192",
      notes: "terminal transport recovered live Authorization: Bearer plain-token clean_replay_passed",
      provider_host_capability_available: true,
      capability_facts: [{ capability: "caller-claimed", observed: true }],
      kernel_feature_facts: [{ feature: "caller-claimed-kernel", observed: true }],
      tool_path: "D:/research/project/fake-helper.exe",
      proof_authority: "lean_kernel_clean_replay",
      can_certify_ga: true
    },
    confirmation_id: "CONF-TASK192-HOST-CAP"
  }
);

assert.equal(calls.at(-1).method, "POST");
assert.equal(calls.at(-1).path, "/agent/adapter/package/os-isolation-provider-host-capability-probe");
assert.equal(calls.at(-1).body.confirmation_id, undefined, "Pi must not forward model-supplied confirmation ids");
assert.equal(calls.at(-1).body.project_root, projectRoot);
assert.deepEqual(calls.at(-1).body.host_capability_environment, {
  platform: "Windows host [redacted_host_path]",
  notes: "bounded_transport_checkpoint_only [redacted_secret] unverified_formal_status"
});
assertNoForbiddenKeys(
  calls.at(-1).body.host_capability_environment,
  [
    "provider_host_capability_available",
    "capability_facts",
    "kernel_feature_facts",
    "tool_path",
    "proof_authority",
    "can_certify_ga"
  ],
  "host capability request"
);
const hostCapabilityRequestWithoutProjectRoot = { ...calls.at(-1).body, project_root: "[project_root]" };
assertPublicBoundary(hostCapabilityRequestWithoutProjectRoot, "host capability request body");
assertPublicBoundary(hostCapabilityResult, "host capability direct result");
assert.equal(hostCapabilityResult.host_capability_probe.adapter_execution_isolation.os_enforced, false);
assert.equal(hostCapabilityResult.host_capability_probe.can_promote_claim, false);
assert.equal(hostCapabilityResult.host_capability_probe.can_certify_ga, false);

const hostValidationResult = await executeComathTool(
  client,
  "comath.release.agentAdapterOsIsolationProviderHelperHostValidation",
  {
    project_root: projectRoot,
    project_id: "PRJ-1920",
    actor: "goal3-task192 OPENAI_API_KEY=plain-token long-lived SSE",
    host_validation_id: "ADAPTER-OSISO-HELPER-HOST-0192",
    host_capability_probe_id: "ADAPTER-OSISO-HOST-CAP-0192",
    runner_id: "ADAPTER-OSISO-RUNNER-0192",
    launch_id: "ADAPTER-OSISO-LAUNCH-0192",
    adapter_id: "codex-cli",
    backend: "external",
    requested_provider: "windows_appcontainer",
    host_environment: {
      platform: "Windows host D:/research/project with sk-task192",
      notes: "terminal transport recovered live Authorization: Bearer plain-token clean_replay_passed",
      helper_host_ready: true,
      helper_binary_sha256: "f".repeat(64),
      helper_version: "caller-claimed",
      command_override: "D:/research/project/fake-helper.exe",
      argv_override: ["--prove", "clean_replay_passed"],
      env_override: { OPENAI_API_KEY: "plain-token" },
      proof_authority: "lean_kernel_clean_replay",
      can_certify_ga: true
    },
    confirmation_id: "CONF-TASK192-HOST-VALIDATION"
  }
);

assert.equal(calls.at(-1).method, "POST");
assert.equal(calls.at(-1).path, "/agent/adapter/package/os-isolation-provider-helper-host-validation");
assert.equal(calls.at(-1).body.confirmation_id, undefined, "Pi must not forward model-supplied confirmation ids");
assert.deepEqual(calls.at(-1).body.host_environment, {
  platform: "Windows host [redacted_host_path]",
  notes: "bounded_transport_checkpoint_only [redacted_secret] unverified_formal_status"
});
assertNoForbiddenKeys(
  calls.at(-1).body.host_environment,
  [
    "helper_host_ready",
    "helper_binary_sha256",
    "helper_version",
    "command_override",
    "argv_override",
    "env_override",
    "proof_authority",
    "can_certify_ga"
  ],
  "host validation request"
);
const hostValidationRequestWithoutProjectRoot = { ...calls.at(-1).body, project_root: "[project_root]" };
assertPublicBoundary(hostValidationRequestWithoutProjectRoot, "host validation request body");
assertPublicBoundary(hostValidationResult, "host validation direct result");
assert.equal(hostValidationResult.host_validation.adapter_execution_isolation.os_enforced, false);
assert.equal(hostValidationResult.host_validation.can_promote_claim, false);
assert.equal(hostValidationResult.host_validation.can_certify_ga, false);

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
  { client, project_root: projectRoot, actor: "goal3-task192" }
);

assert.equal(
  registeredTools.has("comath.release.agentAdapterOsIsolationProviderHostCapabilityProbe"),
  true,
  "Pi runtime must expose provider host capability probe as an executable tool"
);
assert.equal(
  registeredTools.has("comath.release.agentAdapterOsIsolationProviderHelperHostValidation"),
  true,
  "Pi runtime must expose provider-helper host validation as an executable tool"
);
assert.equal(commands.has("cm:release"), true, "Pi runtime must expose /cm:release for Task192 provider-helper consumers");

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
    "agent-adapter-os-isolation-provider-host-capability-probe",
    "--project-id PRJ-1920",
    "--host-capability-probe-id ADAPTER-OSISO-HOST-CAP-0192-CMD",
    "--adapter-id codex-cli",
    "--backend external",
    "--requested-provider windows_appcontainer",
    "--platform 'Windows host D:/research/project with sk-task192'",
    "--host-capability-note 'terminal transport recovered live Authorization: Bearer plain-token clean_replay_passed'"
  ].join(" "),
  ctx
);

assert.equal(calls.at(-1).method, "POST");
assert.equal(calls.at(-1).path, "/agent/adapter/package/os-isolation-provider-host-capability-probe");
assert.equal(calls.at(-1).body.confirmation_id, undefined, "runtime command must not forward confirmation ids");
assert.equal(calls.at(-1).body.project_id, "PRJ-1920");
assert.equal(calls.at(-1).body.actor, "goal3-task192");
assert.equal(calls.at(-1).body.host_capability_probe_id, "ADAPTER-OSISO-HOST-CAP-0192-CMD");
assert.deepEqual(calls.at(-1).body.host_capability_environment, {
  platform: "Windows host [redacted_host_path]",
  notes: "bounded_transport_checkpoint_only [redacted_secret] unverified_formal_status"
});

await commands.get("cm:release")(
  [
    "agent-adapter-os-isolation-provider-helper-host-validation",
    "--project-id PRJ-1920",
    "--host-validation-id ADAPTER-OSISO-HELPER-HOST-0192-CMD",
    "--host-capability-probe-id ADAPTER-OSISO-HOST-CAP-0192-CMD",
    "--runner-id ADAPTER-OSISO-RUNNER-0192-CMD",
    "--launch-id ADAPTER-OSISO-LAUNCH-0192-CMD",
    "--adapter-id codex-cli",
    "--backend external",
    "--requested-provider windows_appcontainer",
    "--platform 'Windows host D:/research/project with sk-task192'",
    "--host-validation-note 'terminal transport recovered live Authorization: Bearer plain-token clean_replay_passed'"
  ].join(" "),
  ctx
);

assert.equal(calls.at(-1).method, "POST");
assert.equal(calls.at(-1).path, "/agent/adapter/package/os-isolation-provider-helper-host-validation");
assert.equal(calls.at(-1).body.confirmation_id, undefined, "runtime command must not forward confirmation ids");
assert.equal(calls.at(-1).body.project_id, "PRJ-1920");
assert.equal(calls.at(-1).body.actor, "goal3-task192");
assert.equal(calls.at(-1).body.host_validation_id, "ADAPTER-OSISO-HELPER-HOST-0192-CMD");
assert.equal(calls.at(-1).body.host_capability_probe_id, "ADAPTER-OSISO-HOST-CAP-0192-CMD");
assert.equal(calls.at(-1).body.runner_id, "ADAPTER-OSISO-RUNNER-0192-CMD");
assert.equal(calls.at(-1).body.launch_id, "ADAPTER-OSISO-LAUNCH-0192-CMD");
assert.deepEqual(calls.at(-1).body.host_environment, {
  platform: "Windows host [redacted_host_path]",
  notes: "bounded_transport_checkpoint_only [redacted_secret] unverified_formal_status"
});

assert.equal(confirmationPrompts.length, 2, "Task192 release commands must require Pi host confirmation");
for (const prompt of confirmationPrompts) {
  assertPublicBoundary(prompt.body, "Task192 confirmation prompt");
}
assert.equal(notifications.length, 2, "Task192 release commands must notify the Pi host");
for (const notification of notifications) {
  assertPublicBoundary(notification.message, "Task192 notification");
}

console.log("Goal 3 Task192 Pi provider-helper host capability consumer tests passed.");
