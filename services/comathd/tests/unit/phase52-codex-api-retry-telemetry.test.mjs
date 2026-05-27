import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  executeAgentAdapterPackage,
  initProject,
  readAuditEvents,
  setCodexApiBackendClientForTests,
  spawnWorkstream
} from "../../dist/index.js";

const projectRoot = mkdtempSync(join(tmpdir(), "comath-phase52-codex-api-retry-"));
const previousApiKey = process.env.COMATH_CODEX_API_KEY;
const previousApiBaseUrl = process.env.COMATH_CODEX_API_BASE_URL;
const previousApiModel = process.env.COMATH_CODEX_API_MODEL;
const previousMaxAttempts = process.env.COMATH_CODEX_API_MAX_ATTEMPTS;

try {
  process.env.COMATH_CODEX_API_KEY = "sk-phase52-secret";
  process.env.COMATH_CODEX_API_BASE_URL = "https://api.openai.test/v1";
  process.env.COMATH_CODEX_API_MODEL = "gpt-5-codex-test";
  process.env.COMATH_CODEX_API_MAX_ATTEMPTS = "3";

  const init = initProject({ name: "Phase 52 Codex API Retry Project", root_path: projectRoot });
  const projectId = init.project.project_id;
  const workstream = spawnWorkstream(projectRoot, {
    project_id: projectId,
    kind: "proof_route",
    goal: "Run retry-hardened Codex API backend.",
    created_by: "phase52-test"
  });
  const contextPath = `.comath/workstreams/${workstream.workstream_id}/spec.yaml`;

  let retryCalls = 0;
  setCodexApiBackendClientForTests(async () => {
    retryCalls += 1;
    if (retryCalls === 1) {
      return {
        status: 429,
        headers: { "retry-after": "0" },
        json: { error: { message: "rate limited once" } }
      };
    }
    return {
      status: 200,
      headers: { "x-ratelimit-remaining-requests": "41" },
      json: {
        id: "resp_phase52_retry",
        output_text: "# Codex API Draft\n\nretry_hardened: true\nproof_authority: none"
      }
    };
  });

  const recovered = await executeAgentAdapterPackage(projectRoot, {
    project_id: projectId,
    campaign_id: "CAM-0052",
    workstream_id: workstream.workstream_id,
    profile_id: "proof-route",
    adapter_id: "codex-cli",
    backend: "codex-api",
    goal: "Produce a non-authoritative API draft after one retry.",
    context_path: contextPath,
    actor: "phase52-test"
  });
  assert.equal(recovered.result.status, "succeeded");
  assert.equal(retryCalls, 2, "Codex API backend should retry once after a 429");
  const recoveredStdout = readFileSync(join(projectRoot, recovered.result.stdout_path), "utf8");
  assert.match(recoveredStdout, /codex_api_attempts: 2/);
  assert.match(recoveredStdout, /codex_api_rate_limited: true/);
  assert.match(recoveredStdout, /codex_api_output_untrusted: true/);
  assert.doesNotMatch(recoveredStdout, /sk-phase52-secret/);

  let failedCalls = 0;
  setCodexApiBackendClientForTests(async () => {
    failedCalls += 1;
    return {
      status: 503,
      headers: { "retry-after": "0" },
      json: { error: { message: `temporary outage ${failedCalls}` } }
    };
  });
  const failed = await executeAgentAdapterPackage(projectRoot, {
    project_id: projectId,
    campaign_id: "CAM-0052",
    workstream_id: workstream.workstream_id,
    profile_id: "reviewer",
    adapter_id: "codex-cli",
    backend: "codex-api",
    goal: "Fail closed after exhausted API retries.",
    context_path: contextPath,
    actor: "phase52-test"
  });
  assert.equal(failed.result.status, "failed");
  assert.equal(failedCalls, 3, "Codex API backend should stop at the configured max attempts");
  const failedStderr = readFileSync(join(projectRoot, failed.result.stderr_path), "utf8");
  assert.match(failedStderr, /Codex API backend failed after 3 attempts/);
  assert.match(failedStderr, /last_status=503/);
  assert.doesNotMatch(failedStderr, /sk-phase52-secret/);

  const events = readAuditEvents(projectRoot);
  assert.equal(
    events.some(
      (event) =>
        event.event_type === "agent_adapter.codex_api_invoked" &&
        event.payload.attempts === 2 &&
        event.payload.rate_limited === true &&
        event.payload.status === 200 &&
        event.payload.proof_authority === "none"
    ),
    true
  );
  assert.equal(
    events.some(
      (event) =>
        event.event_type === "agent_adapter.codex_api_failed" &&
        event.payload.attempts === 3 &&
        event.payload.last_status === 503 &&
        event.payload.proof_authority === "none"
    ),
    true
  );
} finally {
  setCodexApiBackendClientForTests(undefined);
  for (const [key, value] of [
    ["COMATH_CODEX_API_KEY", previousApiKey],
    ["COMATH_CODEX_API_BASE_URL", previousApiBaseUrl],
    ["COMATH_CODEX_API_MODEL", previousApiModel],
    ["COMATH_CODEX_API_MAX_ATTEMPTS", previousMaxAttempts]
  ]) {
    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }
  rmSync(projectRoot, { recursive: true, force: true });
}

console.log("Phase 52 Codex API retry telemetry tests passed.");
