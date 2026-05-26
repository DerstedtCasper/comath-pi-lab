import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { IsObject } from "typebox";

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
assert.equal(packageJson.peerDependenciesMeta?.["@earendil-works/pi-coding-agent"]?.optional, true);
assert.deepEqual(packageJson.pi?.extensions, ["./dist/pi-extension.js"]);

const piEntry = await import("../dist/pi-extension.js");
assert.equal(typeof piEntry.default, "function");

const registeredTools = [];
const registeredCommands = [];
const eventHandlers = new Map();
const sentUserMessages = [];
const fakePi = {
  on(event, handler) {
    eventHandlers.set(event, handler);
  },
  registerTool(tool) {
    registeredTools.push(["top-level", tool]);
  },
  tools: {
    register(tool) {
      registeredTools.push(["namespace", tool]);
    }
  },
  registerCommand(name, options) {
    registeredCommands.push(["top-level", name, options]);
  },
  commands: {
    register(name, options) {
      registeredCommands.push(["namespace", name, options]);
    }
  },
  sendUserMessage(content, options) {
    sentUserMessages.push({ content, options });
  }
};

const installResult = await piEntry.default(fakePi);
assert.equal(installResult.ok, true);
assert.equal(installResult.name, "coMath-pi-lab");
assert.equal(registeredTools.length > 0, true);
assert.equal(registeredTools.some(([, tool]) => tool.name === "comath.claim.register"), true);
assert.equal(registeredTools.every(([, tool]) => IsObject(tool.parameters)), true);
assert.equal(registeredCommands.length > 0, true);
assert.equal(registeredCommands.some(([, name, options]) => name === "cm:status" && typeof options.handler === "function"), true);
assert.equal(registeredCommands.some(([, name]) => name.startsWith("/")), false);
assert.equal(typeof eventHandlers.get("tool_call"), "function");

const statusCommand = registeredCommands.find(([, name]) => name === "cm:status")[2];
await statusCommand.handler("--project PRJ-0001", { hasUI: false });
assert.deepEqual(sentUserMessages, [{ content: "/cm:status --project PRJ-0001", options: undefined }]);

const researchStartTool = registeredTools.find(([, tool]) => tool.name === "comath.research.start")[1];
const claimRegisterTool = registeredTools.find(([, tool]) => tool.name === "comath.claim.register")[1];
const evidenceAttachTool = registeredTools.find(([, tool]) => tool.name === "comath.evidence.attach")[1];
const statusSnapshotTool = registeredTools.find(([, tool]) => tool.name === "comath.status.snapshot")[1];
const requests = [];
const researchStartResult = await researchStartTool.execute(
  "tool-call-0",
  {
    root_path: "D:/tmp/comath-project",
    name: "SDK Directed Project",
    goal: "Start a Pi SDK directed braid-statistics workflow.",
    kind: "proof_route",
    actor: "pi-sdk-test",
    headless: true
  },
  undefined,
  undefined,
  {
    fetch: async (url, init) => {
      requests.push({ url, init });
      if (String(url).endsWith("/project/init")) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            project: { project_id: "PRJ-0001", root_path: "D:/tmp/comath-project" },
            runtime_root: "D:/tmp/comath-project/.comath"
          })
        };
      }
      if (String(url).endsWith("/workstream/spawn")) {
        return {
          ok: true,
          status: 200,
          json: async () => ({ workstream: { workstream_id: "WS-0001", status: "queued" } })
        };
      }
      throw new Error(`unexpected research start URL: ${url}`);
    }
  }
);
assert.equal(researchStartResult.details.ok, true);
assert.equal(researchStartResult.details.headless, true);
assert.equal(researchStartResult.details.project.project_id, "PRJ-0001");
assert.equal(researchStartResult.details.workstream.workstream_id, "WS-0001");
assert.equal(researchStartResult.content[0].type, "text");
assert.equal(requests[0].url, "http://127.0.0.1:48731/project/init");
assert.equal(requests[0].init.method, "POST");
assert.deepEqual(JSON.parse(requests[0].init.body), {
  root_path: "D:/tmp/comath-project",
  name: "SDK Directed Project"
});
assert.equal(requests[1].url, "http://127.0.0.1:48731/workstream/spawn");
assert.equal(requests[1].init.method, "POST");
assert.deepEqual(JSON.parse(requests[1].init.body), {
  project_root: "D:/tmp/comath-project",
  project_id: "PRJ-0001",
  kind: "proof_route",
  goal: "Start a Pi SDK directed braid-statistics workflow.",
  actor: "pi-sdk-test",
  created_by: "pi-sdk-test"
});

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
assert.equal(toolResult.details.claim.id, "CLM-0001");
assert.equal(claimRegisterTool.mutates, true);
assert.equal(researchStartTool.mutates, true);
assert.equal(evidenceAttachTool.mutates, true);
assert.equal(statusSnapshotTool.mutates, false);
const confirmationGate = eventHandlers.get("tool_call");
const blockedMutation = await confirmationGate(
  { toolName: "comath.research.start", input: { root_path: "D:/tmp/comath-project" } },
  { hasUI: false }
);
assert.deepEqual(blockedMutation, {
  block: true,
  reason: "CoMath mutating tool comath.research.start requires confirmation"
});
const confirmedMutation = await confirmationGate(
  { toolName: "comath.research.start", input: { root_path: "D:/tmp/comath-project" } },
  { hasUI: true, ui: { confirm: async () => true } }
);
assert.equal(confirmedMutation, undefined);
const rejectedMutation = await confirmationGate(
  { toolName: "comath.research.start", input: { root_path: "D:/tmp/comath-project" } },
  { hasUI: true, ui: { confirm: async () => false } }
);
assert.deepEqual(rejectedMutation, {
  block: true,
  reason: "CoMath mutating tool comath.research.start was blocked by user"
});
const readonlyCall = await confirmationGate({ toolName: "comath.status.snapshot", input: {} }, { hasUI: false });
assert.equal(readonlyCall, undefined);
assert.equal(requests.length, 3);
assert.equal(requests[2].url, "http://127.0.0.1:48731/claim/register");
assert.equal(requests[2].init.method, "POST");
assert.deepEqual(JSON.parse(requests[2].init.body), {
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
assert.equal(evidenceResult.details.evidence.id, "EV-0001");
assert.equal(requests[3].url, "http://127.0.0.1:48731/evidence/attach");
assert.equal(requests[3].init.method, "POST");
assert.deepEqual(JSON.parse(requests[3].init.body), {
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
assert.equal(statusResult.details.project.initialized, true);
assert.equal(
  requests[4].url,
  "http://127.0.0.1:48731/status/snapshot?project_root=D%3A%2Ftmp%2Fcomath-project&project_id=PRJ-0001"
);
assert.equal(requests[4].init.method, "GET");
assert.equal(requests[4].init.body, undefined);

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
