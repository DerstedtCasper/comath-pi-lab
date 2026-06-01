import assert from "node:assert/strict";
import registerComathPiRuntime, { createComathTools, executeComathTool, runtime_registration } from "../dist/index.js";

const projectRoot = "D:/research/project";
const privilegedPublicTerms =
  /completed_formal_proof|formally_checked|proven|formal_proof_verified|formal_replay_passed|lean_kernel_clean_replay|verified_final_authority_evidence/i;
const hostPathTerms = /D:\\|D:\//i;

function toolDescriptor(name) {
  const tool = createComathTools().find((descriptor) => descriptor.name === name);
  assert.ok(tool, `${name} must be registered for Pi public release consumers`);
  return tool;
}

const sourceReviewTool = toolDescriptor("comath.release.sourceReviewPublicArchive");
assert.equal(sourceReviewTool.mutates, true, "source-review archive assembly writes service-owned release material");
assert.deepEqual(sourceReviewTool.input_schema.required, ["project_root", "project_id", "actor", "reports", "confirmation_id"]);

const reviewTool = toolDescriptor("comath.release.publicArchiveReview");
assert.equal(reviewTool.mutates, true, "public archive review writes service-owned review material");
assert.deepEqual(reviewTool.input_schema.required, ["project_root", "project_id", "actor", "surfaces", "confirmation_id"]);

const releaseCommand = runtime_registration.commands.find((command) => command.command === "/cm:release");
assert.ok(releaseCommand, "/cm:release must be advertised in Pi runtime registration");
assert.equal(releaseCommand.dispatch_tool, "comath.release.publicArchiveReview");
assert.equal(releaseCommand.mutates, true);
assert.equal(releaseCommand.requires_confirmation, true);
assert.equal(releaseCommand.subcommands.includes("source-review"), true);
assert.equal(releaseCommand.subcommands.includes("review"), true);

const calls = [];
const client = {
  get: async (path) => {
    calls.push({ method: "GET", path });
    return { ok: true, path };
  },
  post: async (path, body) => {
    calls.push({ method: "POST", path, body });
    return {
      ok: true,
      path,
      body,
      proof_authority: "lean_kernel_clean_replay",
      summary: "formal_replay_passed from D:/research/project/.comath/release/raw.json"
    };
  }
};

await executeComathTool(client, "comath.release.sourceReviewPublicArchive", {
  project_root: projectRoot,
  project_id: "PRJ-143",
  actor: "goal3-task143",
  archive_id: "SRP-TASK143",
  reports: [
    { format: "markdown", path: ".comath/release/source-review/generated/report.md" },
    { format: "html", path: ".comath/release/source-review/generated/report.html" },
    { format: "json", path: ".comath/release/source-review/generated/report.json" }
  ],
  confirmation_id: "CONF-TASK143-SOURCE"
});
assert.deepEqual(calls.at(-1), {
  method: "POST",
  path: "/release/source-review/public-archive",
  body: {
    project_root: projectRoot,
    project_id: "PRJ-143",
    actor: "goal3-task143",
    archive_id: "SRP-TASK143",
    reports: [
      { format: "markdown", path: ".comath/release/source-review/generated/report.md" },
      { format: "html", path: ".comath/release/source-review/generated/report.html" },
      { format: "json", path: ".comath/release/source-review/generated/report.json" }
    ]
  }
});

await executeComathTool(client, "comath.release.publicArchiveReview", {
  project_root: projectRoot,
  project_id: "PRJ-143",
  actor: "goal3-task143",
  review_id: "PAR-TASK143",
  surfaces: [
    {
      surface_id: "source-review",
      surface_kind: "source_review_public_archive",
      manifest_path: ".comath/release/source-review/public-archive/SRP-TASK143/manifest.json"
    },
    {
      surface_id: "snapshot-export",
      surface_kind: "public_route_payload",
      payload: { public_archive_contract: { can_restore: false, proof_authority: "none" } }
    }
  ],
  confirmation_id: "CONF-TASK143-REVIEW"
});
assert.deepEqual(calls.at(-1), {
  method: "POST",
  path: "/release/public-archive/review",
  body: {
    project_root: projectRoot,
    project_id: "PRJ-143",
    actor: "goal3-task143",
    review_id: "PAR-TASK143",
    surfaces: [
      {
        surface_id: "source-review",
        surface_kind: "source_review_public_archive",
        manifest_path: ".comath/release/source-review/public-archive/SRP-TASK143/manifest.json"
      },
      {
        surface_id: "snapshot-export",
        surface_kind: "public_route_payload",
        payload: { public_archive_contract: { can_restore: false, proof_authority: "none" } }
      }
    ]
  }
});

const commands = new Map();
const notifications = [];
const confirmationPrompts = [];
registerComathPiRuntime(
  {
    registerTool() {},
    registerCommand(name, options) {
      commands.set(name, options.handler);
    },
    on() {}
  },
  { client, project_root: projectRoot, actor: "goal3-task143" }
);

assert.equal(commands.has("cm:release"), true, "Pi runtime must expose /cm:release for public review consumers");
const ctx = {
  ui: {
    confirm: async (title, body) => {
      confirmationPrompts.push({ title, body });
      return true;
    },
    notify: async (message, level) => {
      notifications.push({ message, level });
    }
  }
};

await commands.get("cm:release")(
  "review --project-id PRJ-143 --review-id PAR-TASK143 --surface source-review:source_review_public_archive:.comath/release/source-review/public-archive/SRP-TASK143/manifest.json",
  ctx
);
assert.equal(calls.at(-1).method, "POST");
assert.equal(calls.at(-1).path, "/release/public-archive/review");
assert.deepEqual(calls.at(-1).body, {
  project_root: projectRoot,
  project_id: "PRJ-143",
  actor: "goal3-task143",
  review_id: "PAR-TASK143",
  surfaces: [
    {
      surface_id: "source-review",
      surface_kind: "source_review_public_archive",
      manifest_path: ".comath/release/source-review/public-archive/SRP-TASK143/manifest.json"
    }
  ]
});
assert.equal(confirmationPrompts.length, 1, "release review command must require Pi host confirmation");
assert.equal(notifications.length, 1, "release review command must notify the Pi host");
assert.doesNotMatch(notifications[0].message, privilegedPublicTerms, "Pi release notifications must sanitize proof-authority vocabulary");
assert.doesNotMatch(notifications[0].message, hostPathTerms, "Pi release notifications must sanitize host path echoes");

console.log("Goal 3 Task 143 Pi public release review consumer tests passed.");
