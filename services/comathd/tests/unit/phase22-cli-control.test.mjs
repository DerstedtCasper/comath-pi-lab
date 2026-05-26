import assert from "node:assert/strict";
import { spawn, spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const packageJson = JSON.parse(readFileSync("package.json", "utf8"));
assert.equal(packageJson.bin.comathd, "./dist/cli.js");
assert.equal(packageJson.bin["comath-lab"], "./dist/cli.js");

const cliPath = join(process.cwd(), "dist", "cli.js");
const tempRoot = mkdtempSync(join(tmpdir(), "comath-cli-control-"));
const projectRoot = join(tempRoot, "project");
const readyFile = join(tempRoot, "ready.json");

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

async function waitForReady(path, child) {
  const started = Date.now();
  while (Date.now() - started < 10_000) {
    if (existsSync(path)) {
      return readJson(path);
    }
    if (child.exitCode !== null) {
      throw new Error(`serve exited before ready file was written: ${child.exitCode}`);
    }
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  throw new Error("timed out waiting for comathd ready file");
}

function runCli(args, options = {}) {
  const result = spawnSync(process.execPath, [cliPath, ...args], {
    cwd: process.cwd(),
    encoding: "utf8",
    env: {
      ...process.env,
      NO_COLOR: "1"
    }
  });
  if (result.status !== (options.status ?? 0)) {
    throw new Error(
      [
        `unexpected CLI exit for ${args.join(" ")}`,
        `status=${result.status}`,
        `stdout=${result.stdout}`,
        `stderr=${result.stderr}`
      ].join("\n")
    );
  }
  return result.stdout.trim() ? JSON.parse(result.stdout) : null;
}

const serve = spawn(
  process.execPath,
  [cliPath, "serve", "--host", "127.0.0.1", "--port", "0", "--ready-file", readyFile, "--json"],
  {
    cwd: process.cwd(),
    stdio: ["ignore", "pipe", "pipe"],
    env: {
      ...process.env,
      NO_COLOR: "1"
    }
  }
);

let stdout = "";
let stderr = "";
serve.stdout.on("data", (chunk) => {
  stdout += chunk.toString("utf8");
});
serve.stderr.on("data", (chunk) => {
  stderr += chunk.toString("utf8");
});

try {
  const ready = await waitForReady(readyFile, serve);
  assert.equal(ready.service, "comathd");
  assert.equal(ready.host, "127.0.0.1");
  assert.equal(typeof ready.port, "number");
  assert.match(ready.baseUrl, /^http:\/\/127\.0\.0\.1:\d+$/);

  const health = runCli(["health", "--base-url", ready.baseUrl]);
  assert.equal(health.ok, true);
  assert.equal(health.service, "comathd");

  const started = runCli([
    "research",
    "start",
    "--base-url",
    ready.baseUrl,
    "--root",
    projectRoot,
    "--name",
    "CLI Control Project",
    "--goal",
    "Start an externally driven braid-statistics research workflow.",
    "--kind",
    "proof_route",
    "--actor",
    "cli-test"
  ]);
  assert.equal(started.project.root_path, projectRoot);
  assert.equal(started.workstream.workstream_id, "WS-0001");
  assert.equal(started.workstream.status, "queued");

  const claim = runCli([
    "claim",
    "register",
    "--base-url",
    ready.baseUrl,
    "--project-root",
    projectRoot,
    "--project-id",
    started.project.project_id,
    "--statement",
    "The Jones polynomial distinguishes the selected braid closure in this workflow.",
    "--domain",
    "braid-statistics",
    "--assumption",
    "oriented braid closure",
    "--actor",
    "cli-test"
  ]);
  assert.equal(claim.claim.project_id, started.project.project_id);
  assert.equal(claim.claim.status, "draft");

  const evidence = runCli([
    "tool",
    "call",
    "comath.evidence.attach",
    "--base-url",
    ready.baseUrl,
    "--json",
    JSON.stringify({
      project_root: projectRoot,
      project_id: started.project.project_id,
      claim_id: claim.claim.id,
      kind: "literature",
      summary: "External CLI attached evidence through the Pi-compatible tool route.",
      actor: "cli-test"
    })
  ]);
  assert.equal(evidence.evidence.id, "EV-0001");
  assert.equal(evidence.evidence.claim_id, claim.claim.id);

  const listed = runCli([
    "workstream",
    "list",
    "--base-url",
    ready.baseUrl,
    "--project-root",
    projectRoot,
    "--project-id",
    started.project.project_id
  ]);
  assert.equal(listed.workstreams.length, 1);

  const snapshot = runCli([
    "tool",
    "call",
    "comath.status.snapshot",
    "--base-url",
    ready.baseUrl,
    "--json",
    JSON.stringify({
      project_root: projectRoot,
      project_id: started.project.project_id
    })
  ]);
  assert.equal(snapshot.project.initialized, true);
  assert.equal(snapshot.claims.length, 1);
  assert.equal(snapshot.evidence.length, 1);
  assert.equal(snapshot.workstreams.length, 1);
  assert.equal(snapshot.audit_event_count >= 3, true);

  const missingBaseUrl = spawnSync(process.execPath, [cliPath, "health"], {
    cwd: process.cwd(),
    encoding: "utf8"
  });
  assert.notEqual(missingBaseUrl.status, 0);
  assert.match(missingBaseUrl.stderr, /base URL/i);
} finally {
  serve.kill("SIGTERM");
  await new Promise((resolve) => serve.once("exit", resolve));
  if (serve.exitCode !== 0 && serve.exitCode !== null) {
    throw new Error(`serve failed with exit ${serve.exitCode}\nstdout=${stdout}\nstderr=${stderr}`);
  }
  rmSync(tempRoot, { recursive: true, force: true });
}

console.log("Phase 22 CLI control tests passed.");
