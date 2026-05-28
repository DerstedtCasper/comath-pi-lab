import assert from "node:assert/strict";
import { executeComathTool } from "../dist/index.js";

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

await executeComathTool(client, "comath.claim.register", {
  project_root: "D:/research/project",
  project_id: "PRJ-0001",
  statement: "For every natural number n, n + 0 = n.",
  assumptions: ["n : Nat"],
  domain: "elementary-number-theory",
  actor: "phase59-pi",
  confirmation_id: "CONF-CLAIM"
});
assert.deepEqual(calls.at(-1), {
  method: "POST",
  path: "/claim/register",
  body: {
    project_root: "D:/research/project",
    project_id: "PRJ-0001",
    statement: "For every natural number n, n + 0 = n.",
    assumptions: ["n : Nat"],
    domain: "elementary-number-theory",
    actor: "phase59-pi"
  }
});

await executeComathTool(client, "comath.claim.get", {
  project_root: "D:/research/project",
  project_id: "PRJ-0001",
  claim_id: "C-0001"
});
assert.equal(calls.at(-1).method, "GET");
assert.equal(
  calls.at(-1).path,
  "/claim/get?project_root=D%3A%2Fresearch%2Fproject&project_id=PRJ-0001&claim_id=C-0001"
);

await executeComathTool(client, "comath.claim.requestPromotion", {
  project_root: "D:/research/project",
  project_id: "PRJ-0001",
  claim_id: "C-0001",
  target_status: "formally_checked",
  evidence_ids: ["E-0001"],
  artifact_ids: ["AR-0001"],
  actor: "phase59-pi",
  confirmation_id: "CONF-PROMOTE"
});
assert.deepEqual(calls.at(-1), {
  method: "POST",
  path: "/claim/promote",
  body: {
    project_root: "D:/research/project",
    project_id: "PRJ-0001",
    claim_id: "C-0001",
    target_status: "formally_checked",
    evidence_ids: ["E-0001"],
    artifact_ids: ["AR-0001"],
    actor: "phase59-pi"
  }
});

await executeComathTool(client, "comath.paper.state", {
  project_root: "D:/research/project",
  project_id: "PRJ-0001"
});
assert.equal(calls.at(-1).method, "GET");
assert.equal(calls.at(-1).path, "/paper/state?project_root=D%3A%2Fresearch%2Fproject&project_id=PRJ-0001");

await executeComathTool(client, "comath.paper.updateSection", {
  project_root: "D:/research/project",
  project_id: "PRJ-0001",
  section_id: "sec-intro",
  title: "Introduction",
  markdown: "Bounded product surface.",
  actor: "phase59-pi",
  confirmation_id: "CONF-PAPER"
});
assert.deepEqual(calls.at(-1), {
  method: "POST",
  path: "/paper/update-section",
  body: {
    project_root: "D:/research/project",
    project_id: "PRJ-0001",
    section_id: "sec-intro",
    title: "Introduction",
    markdown: "Bounded product surface.",
    actor: "phase59-pi"
  }
});

await executeComathTool(client, "comath.snapshot.export", {
  project_root: "D:/research/project",
  project_id: "PRJ-0001",
  actor: "phase59-pi",
  confirmation_id: "CONF-SNAPSHOT"
});
assert.deepEqual(calls.at(-1), {
  method: "POST",
  path: "/snapshot/export",
  body: {
    project_root: "D:/research/project",
    project_id: "PRJ-0001",
    actor: "phase59-pi"
  }
});

await executeComathTool(client, "comath.snapshot.verify", {
  manifest_path: "D:/research/project/.comath/snapshots/SNAP-0001/manifest.json"
});
assert.deepEqual(calls.at(-1), {
  method: "POST",
  path: "/snapshot/verify",
  body: {
    manifest_path: "D:/research/project/.comath/snapshots/SNAP-0001/manifest.json"
  }
});

await executeComathTool(client, "comath.replay.verifyManifest", {
  manifest_path: "D:/research/project/.comath/snapshots/SNAP-0001/manifest.json"
});
assert.deepEqual(calls.at(-1), {
  method: "POST",
  path: "/replay/verify-manifest",
  body: {
    manifest_path: "D:/research/project/.comath/snapshots/SNAP-0001/manifest.json"
  }
});

await assert.rejects(
  () =>
    executeComathTool(client, "comath.snapshot.restore", {
      manifest_path: "D:/research/project/.comath/snapshots/SNAP-0001/manifest.json",
      target_root: "D:/research/restored",
      actor: "phase59-pi"
    }),
  /confirmed mutation permission is required/
);

console.log("Phase 59 Pi product surface tool routing tests passed.");
