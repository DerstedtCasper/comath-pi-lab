import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import {
  createComathPiExtension,
  createComathTools,
  parseComathCommand,
  requireMutationConfirmation
} from "../dist/index.js";

const paperCommand = parseComathCommand("/cm:paper check PRJ-0001");
assert.deepEqual(paperCommand, {
  namespace: "cm",
  action: "paper",
  subcommand: "check",
  args: ["PRJ-0001"]
});

const tools = createComathTools();
const byName = new Map(tools.map((tool) => [tool.name, tool]));

const expectedPaperTools = [
  ["comath.paper.init", true, ["project_root", "project_id", "actor"]],
  ["comath.paper.state", false, ["project_root", "project_id"]],
  ["comath.paper.updateSection", true, ["project_root", "project_id", "section_id", "title", "markdown", "actor"]],
  ["comath.paper.renderClaim", true, ["project_root", "project_id", "claim_id", "wording", "actor"]],
  ["comath.paper.check", false, ["project_root", "project_id"]],
  ["comath.paper.export", true, ["project_root", "project_id", "format", "actor"]]
];

for (const [name, mutates, required] of expectedPaperTools) {
  const tool = byName.get(name);
  assert.ok(tool, `${name} is registered`);
  assert.equal(tool.mutates, mutates, `${name} mutation flag`);
  assert.equal(tool.input_schema.type, "object", `${name} object schema`);
  assert.deepEqual(
    tool.input_schema.required,
    mutates ? [...required, "confirmation_id"] : required,
    `${name} required fields`
  );

  const permission = requireMutationConfirmation({ kind: "tool", name, mutates });
  assert.equal(permission.confirmation_required, mutates, `${name} confirmation flag`);
  assert.equal(permission.allowed, !mutates, `${name} default allow flag`);
}

assert.equal(byName.get("comath.paper.check")?.description.includes("without promoting claims"), true);
assert.equal(byName.get("comath.paper.export")?.description.includes("artifact"), true);

const extension = createComathPiExtension({
  client: {
    get: async () => ({}),
    post: async () => ({})
  }
});
assert.equal(extension.commands.includes("/cm:paper"), true);
assert.equal(extension.tools.length, tools.length);
assert.equal(extension.tools.some((tool) => tool.name === "comath.paper.renderClaim"), true);

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
}

console.log("Phase 12 Pi extension paper tool tests passed.");
