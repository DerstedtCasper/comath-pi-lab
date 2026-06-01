import assert from "node:assert/strict";
import registerComathPiRuntime, { runtime_registration } from "../dist/index.js";

const privilegedVocabulary =
  /completed_formal_proof|formally_checked|proven|formal_proof_verified|formal_replay_passed|lean_kernel_clean_replay|verified_final_authority_evidence/i;

const snapshotRegistration = runtime_registration.commands.find((command) => command.command === "/cm:snapshot");
assert.ok(snapshotRegistration, "/cm:snapshot must be advertised in the static Pi runtime registration");
assert.deepEqual(snapshotRegistration.subcommands, ["export", "verify", "restore"]);

function leakedSnapshotPayload(path, body) {
  return {
    ok: true,
    path,
    body,
    report: {
      terminal_state: "formal_replay_passed",
      proof_authority: "lean_kernel_clean_replay",
      evidence: ["verified_final_authority_evidence"],
      notes: ["completed_formal_proof was marked formally_checked by an upstream report"]
    }
  };
}

const calls = [];
const client = {
  get: async (path) => {
    calls.push({ method: "GET", path });
    return leakedSnapshotPayload(path, undefined);
  },
  post: async (path, body) => {
    calls.push({ method: "POST", path, body });
    return leakedSnapshotPayload(path, body);
  }
};

const tools = new Map();
const commands = new Map();
registerComathPiRuntime(
  {
    registerTool(tool) {
      tools.set(tool.name, tool);
    },
    registerCommand(name, options) {
      commands.set(name, options.handler);
    },
    on() {}
  },
  { client, project_root: "D:/research/project", actor: "goal3-task131" }
);

assert.ok(commands.has("cm:snapshot"), "live Pi runtime must register the /cm:snapshot command handler");
for (const toolName of [
  "comath.snapshot.export",
  "comath.snapshot.verify",
  "comath.snapshot.restore",
  "comath.replay.verifyManifest"
]) {
  assert.ok(tools.has(toolName), `${toolName} must be registered as a live Pi runtime tool`);
}

const notifications = [];
const confirmations = [];
const ctx = {
  ui: {
    confirm: async (title, message) => {
      confirmations.push({ title, message });
      return true;
    },
    notify: async (message, level) => {
      notifications.push({ message, level });
    }
  }
};

await commands.get("cm:snapshot")("export --project-id PRJ-0001", ctx);
assert.deepEqual(calls.at(-1), {
  method: "POST",
  path: "/snapshot/export",
  body: {
    project_root: "D:/research/project",
    project_id: "PRJ-0001",
    actor: "goal3-task131"
  }
});

await commands.get("cm:snapshot")("verify D:/research/project/.comath/snapshots/SNAP-0001/manifest.json", ctx);
assert.deepEqual(calls.at(-1), {
  method: "POST",
  path: "/snapshot/verify",
  body: {
    manifest_path: "D:/research/project/.comath/snapshots/SNAP-0001/manifest.json"
  }
});

await commands.get("cm:snapshot")(
  "restore --manifest-path D:/research/project/.comath/snapshots/SNAP-0001/manifest.json --target-root D:/research/restored",
  ctx
);
assert.deepEqual(calls.at(-1), {
  method: "POST",
  path: "/snapshot/restore",
  body: {
    manifest_path: "D:/research/project/.comath/snapshots/SNAP-0001/manifest.json",
    target_root: "D:/research/restored",
    actor: "goal3-task131"
  }
});
assert.equal(confirmations.length, 2, "export and restore must require host confirmation");
assert.equal(confirmations[0].title, "Confirm CoMath mutation");
assert.equal(confirmations[1].title, "Confirm CoMath mutation");

assert.equal(notifications.length, 3);
for (const notification of notifications) {
  assert.equal(notification.level, "info");
  assert.doesNotMatch(
    notification.message,
    privilegedVocabulary,
    "/cm:snapshot notifications must not expose privileged proof-authority vocabulary"
  );
}

console.log("Goal 3 Task 131 Pi snapshot runtime consistency tests passed.");
