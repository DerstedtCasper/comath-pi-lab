import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  buildAgentAdapterPackageLaunch,
  createComathServer,
  executeAgentAdapterPackage,
  getAgentRun,
  initProject,
  readAuditEvents,
  setCodexApiBackendClientForTests,
  spawnWorkstream
} from "../../dist/index.js";

const projectRoot = mkdtempSync(join(tmpdir(), "comath-phase51-codex-api-"));
const previousApiKey = process.env.COMATH_CODEX_API_KEY;
const previousApiBaseUrl = process.env.COMATH_CODEX_API_BASE_URL;
const previousApiModel = process.env.COMATH_CODEX_API_MODEL;

try {
  assert.equal(typeof setCodexApiBackendClientForTests, "function", "Phase 51 must export Codex API backend test injection");
  process.env.COMATH_CODEX_API_KEY = "sk-phase51-secret";
  process.env.COMATH_CODEX_API_BASE_URL = "https://api.openai.test/v1";
  process.env.COMATH_CODEX_API_MODEL = "gpt-5-codex-test";

  const calls = [];
  setCodexApiBackendClientForTests(async (request) => {
    calls.push(request);
    assert.equal(request.url, "https://api.openai.test/v1/responses");
    assert.equal(request.headers.authorization, "Bearer sk-phase51-secret");
    assert.equal(request.body.model, "gpt-5-codex-test");
    assert.equal(request.body.metadata.proof_authority, "none");
    assert.match(request.body.input, /Produce a non-authoritative API draft/);
    return {
      status: 200,
      json: {
        id: "resp_phase51",
        output_text: "# Codex API Draft\n\napi_output_untrusted: true\nproof_authority: none"
      }
    };
  });

  const init = initProject({ name: "Phase 51 Codex API Project", root_path: projectRoot });
  const projectId = init.project.project_id;
  const workstream = spawnWorkstream(projectRoot, {
    project_id: projectId,
    kind: "proof_route",
    goal: "Run service-configured Codex API backend.",
    created_by: "phase51-test"
  });
  const contextPath = `.comath/workstreams/${workstream.workstream_id}/spec.yaml`;

  const prepared = buildAgentAdapterPackageLaunch(projectRoot, {
    project_id: projectId,
    run_id: "ARUN-5101",
    profile_id: "proof-route",
    adapter_id: "codex-cli",
    backend: "codex-api",
    goal: "Produce a non-authoritative API draft.",
    context_path: contextPath,
    actor: "phase51-test"
  });
  assert.equal(prepared.launch.launch_input.command.env.COMATH_CODEX_ADAPTER_BACKEND, "codex-api");
  assert.equal(prepared.launch.launch_input.command.env.COMATH_CODEX_API_KEY, undefined);
  assert.equal(prepared.launch.launch_input.command.env.OPENAI_API_KEY, undefined);
  assert.equal(prepared.launch.launch_input.command.env.COMATH_CODEX_API_KEY_REF, "COMATH_CODEX_API_KEY");

  const execution = await executeAgentAdapterPackage(projectRoot, {
    project_id: projectId,
    campaign_id: "CAM-0051",
    workstream_id: workstream.workstream_id,
    profile_id: "proof-route",
    adapter_id: "codex-cli",
    backend: "codex-api",
    goal: "Produce a non-authoritative API draft.",
    context_path: contextPath,
    actor: "phase51-test"
  });
  assert.equal(execution.result.status, "succeeded");
  assert.equal(calls.length, 1);
  const run = getAgentRun(projectRoot, projectId, execution.run.id);
  assert.equal(run.status, "succeeded");
  const stdout = readFileSync(join(projectRoot, execution.result.stdout_path), "utf8");
  assert.match(stdout, /adapter_backend: codex-api/);
  assert.match(stdout, /codex_api_response_id: resp_phase51/);
  assert.match(stdout, /codex_api_output_untrusted: true/);
  assert.match(stdout, /proof_authority: none/);
  assert.doesNotMatch(stdout, /sk-phase51-secret/);

  delete process.env.COMATH_CODEX_API_KEY;
  const failClosed = await executeAgentAdapterPackage(projectRoot, {
    project_id: projectId,
    campaign_id: "CAM-0051",
    workstream_id: workstream.workstream_id,
    profile_id: "reviewer",
    adapter_id: "codex-cli",
    backend: "codex-api",
    goal: "This must fail closed because no service API key is configured.",
    context_path: contextPath,
    actor: "phase51-test"
  });
  assert.equal(failClosed.result.status, "failed");
  const failedStderr = readFileSync(join(projectRoot, failClosed.result.stderr_path), "utf8");
  assert.match(failedStderr, /Codex API key is not configured/);

  process.env.COMATH_CODEX_API_KEY = "sk-phase51-secret";
  const server = createComathServer();
  const response = await server.inject({
    method: "POST",
    path: "/agent/adapter/package/prepare-launch",
    body: {
      project_root: projectRoot,
      project_id: projectId,
      run_id: "ARUN-5102",
      profile_id: "proof-route",
      adapter_id: "codex-cli",
      backend: "codex-api",
      goal: "Prepare Codex API adapter launch.",
      context_path: contextPath,
      actor: "phase51-route-test"
    }
  });
  assert.equal(response.status, 200, JSON.stringify(response.body));
  const env = response.body.prepared.launch.launch_input.command.env;
  assert.equal(env.COMATH_CODEX_ADAPTER_BACKEND, "codex-api");
  assert.equal(env.COMATH_CODEX_API_KEY, undefined);
  assert.equal(env.COMATH_CODEX_API_KEY_REF, "COMATH_CODEX_API_KEY");

  const events = readAuditEvents(projectRoot);
  assert.equal(
    events.some(
      (event) =>
        event.event_type === "agent_adapter.package_launch_prepared" &&
        event.payload.backend === "codex-api" &&
        event.payload.codex_api_configured === true &&
        event.payload.proof_authority === "none"
    ),
    true
  );
} finally {
  setCodexApiBackendClientForTests(undefined);
  if (previousApiKey === undefined) {
    delete process.env.COMATH_CODEX_API_KEY;
  } else {
    process.env.COMATH_CODEX_API_KEY = previousApiKey;
  }
  if (previousApiBaseUrl === undefined) {
    delete process.env.COMATH_CODEX_API_BASE_URL;
  } else {
    process.env.COMATH_CODEX_API_BASE_URL = previousApiBaseUrl;
  }
  if (previousApiModel === undefined) {
    delete process.env.COMATH_CODEX_API_MODEL;
  } else {
    process.env.COMATH_CODEX_API_MODEL = previousApiModel;
  }
  rmSync(projectRoot, { recursive: true, force: true });
}

console.log("Phase 51 Codex API backend tests passed.");
