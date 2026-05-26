import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const packageRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const packageJson = JSON.parse(readFileSync(join(packageRoot, "package.json"), "utf8"));

assert.notEqual(packageJson.private, true, "package must be publishable/installable");
assert.equal(typeof packageJson.description, "string");
assert.equal(packageJson.description.length > 0, true);
assert.equal(typeof packageJson.license, "string");
assert.equal(packageJson.license.length > 0, true);
assert.equal(packageJson.repository?.type, "git");
assert.equal(typeof packageJson.repository?.url, "string");
assert.equal(packageJson.keywords.includes("pi-package"), true);
assert.equal(packageJson.keywords.includes("pi"), true);
assert.deepEqual(packageJson.files, ["dist/**/*.js", "dist/**/*.d.ts", "package.json"]);
assert.equal(packageJson.peerDependencies?.["@earendil-works/pi-coding-agent"], "*");
assert.deepEqual(packageJson.pi?.extensions, ["./dist/pi-extension.js"]);

const piEntry = await import("../dist/pi-extension.js");
assert.equal(typeof piEntry.default, "function");

const registeredTools = [];
const registeredCommands = [];
const fakePi = {
  registerTool(tool) {
    registeredTools.push(["top-level", tool]);
  },
  tools: {
    register(tool) {
      registeredTools.push(["namespace", tool]);
    }
  },
  registerCommand(command) {
    registeredCommands.push(["top-level", command]);
  },
  commands: {
    register(command) {
      registeredCommands.push(["namespace", command]);
    }
  }
};

const installResult = await piEntry.default(fakePi);
assert.equal(installResult.ok, true);
assert.equal(installResult.name, "coMath-pi-lab");
assert.equal(registeredTools.length > 0, true);
assert.equal(registeredTools.some(([, tool]) => tool.name === "comath.claim.register"), true);
assert.equal(registeredCommands.length > 0, true);
assert.equal(registeredCommands.some(([, command]) => command.name === "/cm:status"), true);

const claimRegisterTool = registeredTools.find(([, tool]) => tool.name === "comath.claim.register")[1];
const evidenceAttachTool = registeredTools.find(([, tool]) => tool.name === "comath.evidence.attach")[1];
const statusSnapshotTool = registeredTools.find(([, tool]) => tool.name === "comath.status.snapshot")[1];
const requests = [];
const toolResult = await claimRegisterTool.execute(
  "tool-call-1",
  {
    project_root: "D:/tmp/comath-project",
    project_id: "PRJ-0001",
    statement: "A directly registered Pi tool reaches comathd.",
    domain: "braid-statistics",
    assumptions: ["oriented closure"]
  },
  undefined,
  undefined,
  {
    fetch: async (url, init) => {
      requests.push({ url, init });
      return {
        ok: true,
        status: 200,
        json: async () => ({ ok: true, claim: { id: "CLM-0001", status: "draft" } })
      };
    }
  }
);
assert.equal(toolResult.claim.id, "CLM-0001");
assert.equal(claimRegisterTool.mutates, true);
assert.equal(evidenceAttachTool.mutates, true);
assert.equal(statusSnapshotTool.mutates, false);
assert.equal(requests.length, 1);
assert.equal(requests[0].url, "http://127.0.0.1:48731/claim/register");
assert.equal(requests[0].init.method, "POST");
assert.deepEqual(JSON.parse(requests[0].init.body), {
  project_root: "D:/tmp/comath-project",
  project_id: "PRJ-0001",
  statement: "A directly registered Pi tool reaches comathd.",
  domain: "braid-statistics",
  assumptions: ["oriented closure"]
});

const evidenceResult = await evidenceAttachTool.execute(
  "tool-call-2",
  {
    project_root: "D:/tmp/comath-project",
    project_id: "PRJ-0001",
    claim_id: "CLM-0001",
    kind: "literature",
    summary: "Pi evidence route reaches comathd.",
    actor: "pi-test"
  },
  undefined,
  undefined,
  {
    fetch: async (url, init) => {
      requests.push({ url, init });
      return {
        ok: true,
        status: 200,
        json: async () => ({ evidence: { id: "EV-0001", claim_id: "CLM-0001" } })
      };
    }
  }
);
assert.equal(evidenceResult.evidence.id, "EV-0001");
assert.equal(requests[1].url, "http://127.0.0.1:48731/evidence/attach");
assert.equal(requests[1].init.method, "POST");
assert.deepEqual(JSON.parse(requests[1].init.body), {
  project_root: "D:/tmp/comath-project",
  project_id: "PRJ-0001",
  claim_id: "CLM-0001",
  kind: "literature",
  summary: "Pi evidence route reaches comathd.",
  actor: "pi-test"
});

const statusResult = await statusSnapshotTool.execute(
  "tool-call-3",
  {
    project_root: "D:/tmp/comath-project",
    project_id: "PRJ-0001"
  },
  undefined,
  undefined,
  {
    fetch: async (url, init) => {
      requests.push({ url, init });
      return {
        ok: true,
        status: 200,
        json: async () => ({ project: { initialized: true }, claims: [], evidence: [], workstreams: [] })
      };
    }
  }
);
assert.equal(statusResult.project.initialized, true);
assert.equal(
  requests[2].url,
  "http://127.0.0.1:48731/status/snapshot?project_root=D%3A%2Ftmp%2Fcomath-project&project_id=PRJ-0001"
);
assert.equal(requests[2].init.method, "GET");
assert.equal(requests[2].init.body, undefined);

const noApiResult = await piEntry.default({});
assert.deepEqual(noApiResult, {
  ok: false,
  name: "coMath-pi-lab",
  registeredTools: 0,
  registeredCommands: 0,
  reason: "No compatible Pi registration API found"
});

const packCommand =
  process.platform === "win32"
    ? { file: process.env.ComSpec ?? "cmd.exe", args: ["/d", "/s", "/c", "npm pack --dry-run --json"] }
    : { file: "npm", args: ["pack", "--dry-run", "--json"] };
const packOutput = execFileSync(packCommand.file, packCommand.args, {
  cwd: packageRoot,
  encoding: "utf8",
  stdio: ["ignore", "pipe", "pipe"]
});
const [packInfo] = JSON.parse(packOutput);
const packedFiles = packInfo.files.map((file) => file.path).sort();
assert.equal(packedFiles.some((path) => path.startsWith("tests/")), false);
assert.equal(packedFiles.some((path) => path.endsWith(".tsbuildinfo")), false);
assert.equal(packedFiles.includes("dist/pi-extension.js"), true);
assert.equal(packedFiles.includes("dist/pi-extension.d.ts"), true);
assert.equal(packedFiles.includes("package.json"), true);

console.log("Phase 22 Pi install package tests passed.");
