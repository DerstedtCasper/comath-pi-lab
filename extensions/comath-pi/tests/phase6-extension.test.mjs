import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import {
  createComathClient,
  createComathPiExtension,
  createComathTools,
  discoverComathResources,
  parseComathCommand,
  renderTextDashboard,
  requireMutationConfirmation
} from "../dist/index.js";

const initCommand = parseComathCommand("/cm:init D:/research/project");
assert.deepEqual(initCommand, {
  namespace: "cm",
  action: "init",
  args: ["D:/research/project"]
});

assert.deepEqual(parseComathCommand("/cm:claim add For all x, x = x"), {
  namespace: "cm",
  action: "claim",
  subcommand: "add",
  args: ["For", "all", "x,", "x", "=", "x"]
});

assert.deepEqual(parseComathCommand("/cm:snapshot export D:/research/project"), {
  namespace: "cm",
  action: "snapshot",
  subcommand: "export",
  args: ["D:/research/project"]
});

assert.deepEqual(parseComathCommand("/cm:replay verify SNAP-0001"), {
  namespace: "cm",
  action: "replay",
  subcommand: "verify",
  args: ["SNAP-0001"]
});

assert.deepEqual(parseComathCommand("/cm:release review --project-id PRJ-0001"), {
  namespace: "cm",
  action: "release",
  subcommand: "review",
  args: ["--project-id", "PRJ-0001"]
});

assert.equal(parseComathCommand("/not-comath"), null);

const calls = [];
const client = createComathClient({
  baseUrl: "http://comath.test",
  fetch: async (url, init) => {
    calls.push({ url: String(url), init });
    return {
      ok: true,
      status: 200,
      json: async () => ({ ok: true, project: { project_id: "PRJ-0001" } })
    };
  }
});

const opened = await client.post("/project/open", { root_path: "D:/research/project" });
assert.equal(opened.project.project_id, "PRJ-0001");
assert.equal(calls[0].url, "http://comath.test/project/open");
assert.equal(calls[0].init.method, "POST");
assert.equal(calls[0].init.headers["content-type"], "application/json");

const failingClient = createComathClient({
  baseUrl: "http://comath.test",
  fetch: async () => ({
    ok: false,
    status: 503,
    json: async () => ({ error: "offline" })
  })
});
await assert.rejects(() => failingClient.get("/health"), /comathd request failed/);

const gate = requireMutationConfirmation({ kind: "tool", name: "comath.claim.register", mutates: true });
assert.equal(gate.allowed, false);
assert.equal(gate.confirmation_required, true);

const readGate = requireMutationConfirmation({ kind: "tool", name: "comath.status.snapshot", mutates: false });
assert.equal(readGate.allowed, true);

const tools = createComathTools();
assert.equal(tools.some((tool) => tool.name === "comath.project.open"), true);
assert.equal(tools.some((tool) => tool.name === "comath.claim.requestPromotion"), true);
assert.equal(tools.some((tool) => tool.name === "comath.snapshot.export"), true);
assert.equal(tools.some((tool) => tool.name === "comath.snapshot.verify"), true);
assert.equal(tools.some((tool) => tool.name === "comath.snapshot.restore"), true);
assert.equal(tools.some((tool) => tool.name === "comath.replay.verifyManifest"), true);
assert.equal(tools.some((tool) => tool.name === "comath.release.sourceReviewPublicArchive"), true);
assert.equal(tools.some((tool) => tool.name === "comath.release.publicArchiveReview"), true);
assert.equal(tools.some((tool) => tool.name === "comath.release.piCodexLifecycleReview"), true);
assert.equal(tools.some((tool) => tool.name === "comath.release.piCodexApiProbe"), true);
assert.equal(tools.some((tool) => tool.name === "comath.release.piCodexLifecycleWalkthrough"), true);
assert.equal(tools.some((tool) => tool.name === "comath.release.piCodexLifecycleControl"), true);
assert.equal(tools.some((tool) => tool.name === "comath.release.piCodexLifecycleSession"), true);
assert.equal(tools.some((tool) => tool.name === "comath.release.piCodexLifecycleOperatorSession"), true);
assert.equal(tools.some((tool) => tool.name === "comath.release.piCodexLifecycleOperatorTransportRecovery"), true);
assert.equal(tools.some((tool) => tool.name === "comath.release.piCodexLifecycleOperatorTransportLease"), true);
assert.equal(tools.some((tool) => tool.name === "comath.release.piCodexLifecycleOperatorTransportHeartbeat"), true);
assert.equal(tools.some((tool) => tool.name === "comath.release.piCodexLifecycleGuidedRealPiExecution"), true);
assert.equal(tools.some((tool) => tool.name === "comath.release.piCodexLifecycleOperatorServiceTransportContract"), true);
assert.equal(tools.some((tool) => tool.name === "comath.release.piCodexLifecycleOperatorServiceTransportContinuity"), true);
assert.equal(tools.some((tool) => tool.name === "comath.release.piCodexLifecycleUnattendedRealHostHandoffReview"), true);
assert.equal(tools.some((tool) => tool.name === "comath.release.piCodexLifecycleUnattendedRealHostOperatorApproval"), true);
assert.equal(tools.some((tool) => tool.name === "comath.release.piCodexLifecycleUnattendedRealHostExecutorContract"), true);
assert.equal(
  tools.some((tool) => tool.name === "comath.release.piCodexLifecycleUnattendedRealHostDurableTransportContract"),
  true
);
assert.equal(tools.some((tool) => tool.name === "comath.release.piCodexLifecycleUnattendedRealHostExecutionReadiness"), true);
assert.equal(tools.some((tool) => tool.name === "comath.release.piCodexLifecycleUnattendedRealHostExecutionAttempt"), true);
assert.equal(
  tools.some((tool) => tool.name === "comath.release.piCodexLifecycleUnattendedRealHostExecutionAttemptReview"),
  true
);
assert.equal(tools.some((tool) => tool.name === "comath.release.piCodexLifecycleInteractiveRealPi"), true);
assert.equal(tools.some((tool) => tool.name === "comath.release.agentAdapterOsIsolationProbe"), true);
assert.equal(tools.some((tool) => tool.name === "comath.release.agentAdapterOsIsolationSandboxExecutionProbe"), true);
assert.equal(tools.some((tool) => tool.name === "comath.release.agentAdapterOsIsolationProviderHostCapabilityProbe"), true);
assert.equal(tools.some((tool) => tool.name === "comath.release.agentAdapterOsIsolationProviderHelperHostValidation"), true);
assert.equal(
  tools.every((tool) => tool.input_schema && tool.input_schema.type === "object"),
  true
);
assert.equal(tools.find((tool) => tool.name === "comath.claim.register")?.mutates, true);
assert.equal(tools.find((tool) => tool.name === "comath.snapshot.export")?.mutates, true);
assert.equal(tools.find((tool) => tool.name === "comath.snapshot.verify")?.mutates, false);
assert.equal(tools.find((tool) => tool.name === "comath.snapshot.restore")?.mutates, true);
assert.equal(tools.find((tool) => tool.name === "comath.replay.verifyManifest")?.mutates, false);
assert.deepEqual(tools.find((tool) => tool.name === "comath.snapshot.export")?.input_schema.required, [
  "project_root",
  "project_id",
  "actor",
  "confirmation_id"
]);

const resources = discoverComathResources({
  skills: ["math-research", "mathprove-adapter"],
  prompts: ["coordinator", "reviewer"],
  domainPacks: ["braid-statistics"],
  artifacts: ["snapshot-manifest", "replay-manifest"]
});
assert.deepEqual(resources.map((resource) => resource.uri), [
  "skills/math-research",
  "skills/mathprove-adapter",
  "prompts/coordinator",
  "prompts/reviewer",
  "domain-packs/braid-statistics",
  "artifacts/snapshot-manifest",
  "artifacts/replay-manifest"
]);
assert.equal(resources.some((resource) => resource.uri.includes("claims")), false);

const dashboard = renderTextDashboard({
  project: { project_id: "PRJ-0001", name: "Demo" },
  claims: [{ id: "C-0001", status: "conjectural", statement: "x = x" }],
  workstreams: [{ id: "WS-0001", status: "queued", goal: "check proof" }],
  blockers: ["missing Lean proof"]
});
assert.equal(dashboard.includes("PRJ-0001"), true);
assert.equal(dashboard.includes("missing Lean proof"), true);

const extension = createComathPiExtension({ client });
assert.equal(extension.name, "coMath-pi-lab");
assert.equal(extension.commands.length > 0, true);
assert.equal(extension.commands.includes("/cm:snapshot"), true);
assert.equal(extension.commands.includes("/cm:replay"), true);
assert.equal(extension.commands.includes("/cm:release"), true);
assert.equal(extension.tools.length, tools.length);

function collectFiles(dir) {
  const files = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory() && entry.name !== "dist") {
      files.push(...collectFiles(path));
    } else if (entry.isFile() && /\.(ts|js|mjs)$/.test(entry.name) && statSync(path).size > 0) {
      files.push(path);
    }
  }
  return files;
}

const sourceRoot = join(process.cwd(), "src");
for (const file of collectFiles(sourceRoot)) {
  const content = readFileSync(file, "utf8");
  assert.equal(/from\s+["'][^"']*services\/comathd\/src/i.test(content), false, `${file} imports service internals`);
  assert.equal(/writeFile|appendFile|mkdir|rmSync/.test(content), false, `${file} writes runtime state`);
  assert.equal(/triviumdb|TriviumUnavailableResearchMemoryDB/.test(content), false, `${file} touches TriviumDB`);
}

console.log("Phase 6 extension tests passed.");
