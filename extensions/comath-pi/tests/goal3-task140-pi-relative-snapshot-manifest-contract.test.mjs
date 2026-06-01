import assert from "node:assert/strict";
import registerComathPiRuntime, { createComathTools, executeComathTool, runtime_registration } from "../dist/index.js";

const projectRoot = "D:/research/project";
const relativeManifestPath = ".comath/snapshots/SNAP-0001/manifest.json";
const absoluteManifestPath = "D:/research/project/.comath/snapshots/SNAP-0001/manifest.json";

function toolDescriptor(name) {
  const tool = createComathTools().find((descriptor) => descriptor.name === name);
  assert.ok(tool, `${name} must be registered`);
  return tool;
}

function assertOptionalProjectRoot(name) {
  const tool = toolDescriptor(name);
  assert.equal(
    Object.hasOwn(tool.input_schema.properties, "project_root"),
    true,
    `${name} must advertise project_root for project-relative snapshot manifest paths`
  );
  assert.equal(
    tool.input_schema.required?.includes("project_root") ?? false,
    false,
    `${name} must keep project_root optional so absolute manifest paths remain compatible`
  );
}

assertOptionalProjectRoot("comath.snapshot.verify");
assertOptionalProjectRoot("comath.snapshot.restore");
assertOptionalProjectRoot("comath.replay.verifyManifest");

const snapshotCommand = runtime_registration.commands.find((command) => command.command === "/cm:snapshot");
assert.ok(snapshotCommand, "/cm:snapshot must be advertised in Pi runtime registration");
assert.equal(
  snapshotCommand.subcommands.includes("verify-manifest"),
  true,
  "/cm:snapshot must advertise verify-manifest for replay manifest paths returned from public snapshot exports"
);

const calls = [];
const client = {
  get: async (path) => {
    calls.push({ method: "GET", path });
    return { ok: true, path };
  },
  post: async (path, body) => {
    calls.push({ method: "POST", path, body });
    return { ok: true, path, body };
  }
};

await executeComathTool(client, "comath.snapshot.verify", {
  project_root: projectRoot,
  manifest_path: relativeManifestPath
});
assert.deepEqual(calls.at(-1), {
  method: "POST",
  path: "/snapshot/verify",
  body: {
    project_root: projectRoot,
    manifest_path: relativeManifestPath
  }
});

await executeComathTool(client, "comath.replay.verifyManifest", {
  project_root: projectRoot,
  manifest_path: relativeManifestPath
});
assert.deepEqual(calls.at(-1), {
  method: "POST",
  path: "/replay/verify-manifest",
  body: {
    project_root: projectRoot,
    manifest_path: relativeManifestPath
  }
});

await executeComathTool(client, "comath.snapshot.restore", {
  project_root: projectRoot,
  manifest_path: relativeManifestPath,
  target_root: "D:/research/restored",
  actor: "goal3-task140",
  confirmation_id: "CONF-TASK140"
});
assert.deepEqual(calls.at(-1), {
  method: "POST",
  path: "/snapshot/restore",
  body: {
    project_root: projectRoot,
    manifest_path: relativeManifestPath,
    target_root: "D:/research/restored",
    actor: "goal3-task140"
  }
});

await executeComathTool(client, "comath.snapshot.verify", {
  manifest_path: absoluteManifestPath
});
assert.deepEqual(calls.at(-1), {
  method: "POST",
  path: "/snapshot/verify",
  body: {
    manifest_path: absoluteManifestPath
  }
});

const commands = new Map();
const notifications = [];
registerComathPiRuntime(
  {
    registerTool() {},
    registerCommand(name, options) {
      commands.set(name, options.handler);
    },
    on() {}
  },
  { client, project_root: projectRoot, actor: "goal3-task140" }
);

const ctx = {
  ui: {
    confirm: async () => true,
    notify: async (message, level) => {
      notifications.push({ message, level });
    }
  }
};

await commands.get("cm:snapshot")(`verify ${relativeManifestPath}`, ctx);
assert.deepEqual(calls.at(-1), {
  method: "POST",
  path: "/snapshot/verify",
  body: {
    project_root: projectRoot,
    manifest_path: relativeManifestPath
  }
});

await commands.get("cm:snapshot")(`verify-manifest ${relativeManifestPath}`, ctx);
assert.deepEqual(calls.at(-1), {
  method: "POST",
  path: "/replay/verify-manifest",
  body: {
    project_root: projectRoot,
    manifest_path: relativeManifestPath
  }
});

await commands.get("cm:snapshot")(`restore --manifest-path ${relativeManifestPath} --target-root D:/research/restored`, ctx);
assert.deepEqual(calls.at(-1), {
  method: "POST",
  path: "/snapshot/restore",
  body: {
    project_root: projectRoot,
    manifest_path: relativeManifestPath,
    target_root: "D:/research/restored",
    actor: "goal3-task140"
  }
});

assert.equal(notifications.length, 3, "relative snapshot command flows should notify the Pi host");

console.log("Goal 3 Task 140 Pi relative snapshot manifest contract tests passed.");
