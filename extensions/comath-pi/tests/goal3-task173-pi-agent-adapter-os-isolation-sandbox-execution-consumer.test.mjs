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
  assert.ok(tool, `${name} must be registered for Pi sandbox execution probe evidence`);
  return tool;
}

const sandboxExecutionTool = toolDescriptor("comath.release.agentAdapterOsIsolationSandboxExecutionProbe");
assert.equal(sandboxExecutionTool.mutates, true, "sandbox execution probe writes service-owned release evidence");
assert.deepEqual(sandboxExecutionTool.input_schema.required, [
  "project_root",
  "project_id",
  "actor",
  "execution_id",
  "launch_id",
  "adapter_id",
  "backend",
  "confirmation_id"
]);
assert.deepEqual(sandboxExecutionTool.input_schema.properties.requested_provider.enum, [
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
assert.equal(releaseCommand.subcommands.includes("agent-adapter-os-isolation-sandbox-execution"), true);

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
      execution: {
        schema_version: "comath.agent_adapter_os_isolation_sandbox_execution.v1",
        project_id: body.project_id,
        execution_id: body.execution_id,
        launch_id: body.launch_id,
        adapter_id: body.adapter_id,
        backend: body.backend,
        actor: "goal3-task173-route OPENAI_API_KEY=plain-token long-lived SSE",
        execution_path: ".comath/release/agent-adapter-os-isolation/ADAPT-OS-EXEC-0173/sandbox-execution.json",
        provider: body.requested_provider,
        execution_status: "blocked_sandbox_execution_probe_not_collected",
        adapter_execution_isolation: {
          current_boundary: "os_enforced",
          os_enforced: true
        },
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

const directResult = await executeComathTool(client, "comath.release.agentAdapterOsIsolationSandboxExecutionProbe", {
  project_root: projectRoot,
  project_id: "PRJ-1730",
  actor: "goal3-task173 OPENAI_API_KEY=plain-token long-lived SSE",
  execution_id: "ADAPT-OS-EXEC-0173",
  launch_id: "ADAPT-OS-LAUNCH-0173",
  adapter_id: "codex-cli",
  backend: "external",
  requested_provider: "windows_appcontainer",
  execution_environment: {
    platform: "Windows host D:/research/project with sk-task173",
    notes: "terminal transport recovered live Authorization: Bearer plain-token clean_replay_passed",
    process_isolation_enforced: true,
    filesystem_scope_enforced: true,
    network_isolation_enforced: true,
    no_new_privileges: true,
    escape_prevention: true,
    adapter_process_exit_code: 0,
    stdout_sha256: "1".repeat(64),
    stderr_sha256: "2".repeat(64),
    transcript_sha256: "3".repeat(64)
  },
  confirmation_id: "CONF-TASK173-OS-SANDBOX-EXECUTION"
});

assert.equal(calls.at(-1).method, "POST");
assert.equal(calls.at(-1).path, "/agent/adapter/package/os-isolation-sandbox-execution");
assert.equal(calls.at(-1).body.confirmation_id, undefined, "Pi must not forward model-supplied confirmation ids");
assert.equal(calls.at(-1).body.project_root, projectRoot);
assert.equal(calls.at(-1).body.project_id, "PRJ-1730");
assert.equal(calls.at(-1).body.execution_id, "ADAPT-OS-EXEC-0173");
assert.equal(calls.at(-1).body.launch_id, "ADAPT-OS-LAUNCH-0173");
assert.equal(calls.at(-1).body.adapter_id, "codex-cli");
assert.equal(calls.at(-1).body.backend, "external");
assert.equal(calls.at(-1).body.requested_provider, "windows_appcontainer");
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
assert.equal(directResult.execution.adapter_execution_isolation.os_enforced, false, "direct result must not surface OS-enforcement overclaims");
assert.equal(directResult.execution.can_promote_claim, false, "direct result must not surface promotion overclaims");
assert.equal(directResult.execution.can_certify_ga, false, "direct result must not surface GA-certification overclaims");
assert.equal(directResult.execution.durable_transport_provided, false, "direct result must not surface durable-transport overclaims");
assert.equal(directResult.execution.long_lived_sse_provided, false, "direct result must not surface long-lived SSE overclaims");

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
  { client, project_root: projectRoot, actor: "goal3-task173" }
);

assert.equal(
  registeredTools.has("comath.release.agentAdapterOsIsolationSandboxExecutionProbe"),
  true,
  "Pi runtime must expose sandbox execution probe as an executable tool"
);
assert.equal(commands.has("cm:release"), true, "Pi runtime must expose /cm:release for sandbox execution probe");

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
    "agent-adapter-os-isolation-sandbox-execution",
    "--project-id PRJ-1730",
    "--execution-id ADAPT-OS-EXEC-0173-CMD",
    "--launch-id ADAPT-OS-LAUNCH-0173-CMD",
    "--adapter-id codex-cli",
    "--backend external",
    "--requested-provider windows_appcontainer",
    "--platform 'Windows host D:/research/project with sk-task173'",
    "--process-isolation-enforced true",
    "--filesystem-scope-enforced true",
    "--network-isolation-enforced true",
    "--no-new-privileges true",
    "--escape-prevention true",
    "--adapter-process-exit-code 0",
    "--stdout-sha256 1111111111111111111111111111111111111111111111111111111111111111",
    "--stderr-sha256 2222222222222222222222222222222222222222222222222222222222222222",
    "--transcript-sha256 3333333333333333333333333333333333333333333333333333333333333333",
    "--execution-note 'terminal transport recovered live Authorization: Bearer plain-token clean_replay_passed'"
  ].join(" "),
  ctx
);

assert.equal(calls.at(-1).method, "POST");
assert.equal(calls.at(-1).path, "/agent/adapter/package/os-isolation-sandbox-execution");
assert.equal(calls.at(-1).body.confirmation_id, undefined, "runtime command must not forward confirmation ids");
assert.equal(calls.at(-1).body.project_root, projectRoot);
assert.equal(calls.at(-1).body.project_id, "PRJ-1730");
assert.equal(calls.at(-1).body.actor, "goal3-task173");
assert.equal(calls.at(-1).body.execution_id, "ADAPT-OS-EXEC-0173-CMD");
assert.equal(calls.at(-1).body.launch_id, "ADAPT-OS-LAUNCH-0173-CMD");
assert.equal(calls.at(-1).body.adapter_id, "codex-cli");
assert.equal(calls.at(-1).body.backend, "external");
assert.equal(calls.at(-1).body.requested_provider, "windows_appcontainer");
assert.deepEqual(calls.at(-1).body.execution_environment, {
  platform: "Windows host [redacted_host_path]",
  notes: "bounded_transport_checkpoint_only [redacted_secret] unverified_formal_status",
  process_isolation_enforced: true,
  filesystem_scope_enforced: true,
  network_isolation_enforced: true,
  no_new_privileges: true,
  escape_prevention: true,
  adapter_process_exit_code: 0,
  stdout_sha256: "1".repeat(64),
  stderr_sha256: "2".repeat(64),
  transcript_sha256: "3".repeat(64)
});
assert.equal(confirmationPrompts.length, 1, "sandbox execution probe command must require Pi host confirmation");
assert.doesNotMatch(confirmationPrompts[0].body, privilegedPublicTerms);
assert.doesNotMatch(confirmationPrompts[0].body, hostPathTerms);
assert.doesNotMatch(confirmationPrompts[0].body, secretTerms);
assert.doesNotMatch(confirmationPrompts[0].body, transportOverclaimTerms);
assert.equal(notifications.length, 1, "sandbox execution probe command must notify the Pi host");
assert.doesNotMatch(notifications[0].message, privilegedPublicTerms);
assert.doesNotMatch(notifications[0].message, hostPathTerms);
assert.doesNotMatch(notifications[0].message, secretTerms);
assert.doesNotMatch(notifications[0].message, transportOverclaimTerms);

console.log("Goal 3 Task173 Pi adapter OS-isolation sandbox execution consumer tests passed.");
