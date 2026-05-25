import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, resolve } from "node:path";
import {
  createComathClient,
  createComathPiExtension,
  discoverComathResources,
  getSubagentDefinition,
  listSubagentDefinitions,
  validateSubagentAssignment
} from "../dist/index.js";

const repoRoot = resolve(process.cwd(), "../..");
const agentsDir = join(repoRoot, ".pi", "agents");
const promptsDir = join(repoRoot, ".pi", "prompts");

const expectedRoles = [
  "coordinator",
  "librarian",
  "computation",
  "proof_route",
  "formalization",
  "reviewer",
  "graph_builder",
  "security_auditor",
  "math_integrity_auditor"
];

const definitions = listSubagentDefinitions();
assert.equal(definitions.length, expectedRoles.length);
assert.deepEqual(definitions.map((definition) => definition.role).sort(), [...expectedRoles].sort());
assert.equal(getSubagentDefinition("graph-builder")?.role, "graph_builder");

const forbiddenConflictZones = [
  "services/comathd/src/types",
  "services/comathd/src/api/server.ts",
  "services/comathd/src/security/path-policy.ts",
  "services/comathd/src/verification/gate.ts",
  "services/comathd/src/memory/in-memory-research-memory-db.ts",
  "package.json"
];

for (const definition of definitions) {
  assert.equal(definition.may_mutate_trusted_state, false, definition.id);
  assert.equal(definition.allowed_write_roots.length > 0, true, definition.id);
  assert.equal(definition.forbidden_write_roots.length > 0, true, definition.id);
  assert.equal(definition.prompt_uri.startsWith(".pi/prompts/"), true, definition.id);
  for (const zone of forbiddenConflictZones) {
    assert.equal(definition.allowed_write_roots.includes(zone), false, `${definition.id} allows ${zone}`);
  }
}

assert.equal(existsSync(agentsDir), true);
assert.equal(existsSync(promptsDir), true);
const agentFiles = readdirSync(agentsDir).filter((name) => name.endsWith(".md"));
assert.deepEqual(agentFiles.sort(), [
  "computation.md",
  "coordinator.md",
  "formalization.md",
  "graph-builder.md",
  "librarian.md",
  "math-integrity-auditor.md",
  "proof-route.md",
  "reviewer.md",
  "security-auditor.md"
]);

for (const definition of definitions) {
  const fileName = `${definition.id}.md`;
  const content = readFileSync(join(agentsDir, fileName), "utf8");
  assert.equal(content.includes(`id: ${definition.id}`), true);
  assert.equal(content.includes("may_mutate_trusted_state: false"), true);
  assert.equal(content.includes("do not promote claims"), true);
  assert.equal(content.includes("GraphPatch proposal only"), true);
}

const promptNames = [
  "parallel-workstream.md",
  "graph-patch-proposal.md",
  "child-agent-report.md",
  "merge-review.md"
];
for (const promptName of promptNames) {
  const content = readFileSync(join(promptsDir, promptName), "utf8");
  assert.equal(content.includes("own workstream directory"), true, promptName);
  assert.equal(content.includes("GraphPatch proposal only"), true, promptName);
  assert.equal(content.includes("do not promote claims"), true, promptName);
  assert.equal(content.includes("reviewer approval is not proof"), true, promptName);
  assert.equal(content.includes("parent coordinator merges"), true, promptName);
}

const acceptedAssignment = validateSubagentAssignment({
  agent_id: "graph-builder",
  workstream_id: "WS-0001",
  requested_write_paths: [".comath/workstreams/WS-0001/report.md", ".comath/workstreams/WS-0001/graph_patch.json"]
});
assert.equal(acceptedAssignment.allowed, true);

const wrongWorkstream = validateSubagentAssignment({
  agent_id: "graph-builder",
  workstream_id: "WS-0001",
  requested_write_paths: [".comath/workstreams/WS-0002/report.md"]
});
assert.equal(wrongWorkstream.allowed, false);
assert.equal(wrongWorkstream.reasons.some((reason) => reason.includes("own workstream")), true);

const coreFile = validateSubagentAssignment({
  agent_id: "reviewer",
  workstream_id: "WS-0001",
  requested_write_paths: ["services/comathd/src/api/server.ts"]
});
assert.equal(coreFile.allowed, false);
assert.equal(coreFile.reasons.some((reason) => reason.includes("forbidden")), true);

const resources = discoverComathResources({
  skills: ["math-research"],
  prompts: ["parallel-workstream"],
  domainPacks: ["braid-statistics"],
  subagents: definitions.map((definition) => definition.id)
});
assert.equal(resources.some((resource) => resource.uri === "domain-packs/braid-statistics" && resource.kind === "domain-pack"), true);
assert.equal(resources.some((resource) => resource.uri === ".pi/agents/graph-builder.md" && resource.kind === "subagent"), true);

const client = createComathClient({
  baseUrl: "http://comath.test",
  fetch: async () => ({
    ok: true,
    status: 200,
    json: async () => ({ ok: true })
  })
});
const extension = createComathPiExtension({ client });
assert.equal(extension.subagents.length, expectedRoles.length);
assert.equal(extension.resources.some((resource) => resource.kind === "subagent"), true);

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

for (const file of collectFiles(join(process.cwd(), "src"))) {
  const content = readFileSync(file, "utf8");
  assert.equal(/from\s+["'][^"']*services\/comathd\/src/i.test(content), false, `${file} imports service internals`);
  assert.equal(/writeFile|appendFile|mkdir|rmSync/.test(content), false, `${file} writes files`);
  assert.equal(/triviumdb|TriviumUnavailableResearchMemoryDB/.test(content), false, `${file} touches TriviumDB`);
  assert.equal(/applyGatePromotedClaim|promoteClaim/.test(content), false, `${file} touches claim promotion internals`);
}

console.log("Phase 8 subagent scaffold tests passed.");
