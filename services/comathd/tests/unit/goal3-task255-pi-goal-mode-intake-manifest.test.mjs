import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createComathServer } from "../../dist/index.js";

const server = createComathServer();
const root = mkdtempSync(join(tmpdir(), "comath-goal3-task255-intake-"));

function sha256File(path) {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}

try {
  const paperPath = join(root, "papers", "source.md");
  const attachmentPath = join(root, "notes", "idea.tex");
  const workspaceRoot = join(root, "lean");
  mkdirSync(join(root, "papers"), { recursive: true });
  mkdirSync(join(root, "notes"), { recursive: true });
  mkdirSync(workspaceRoot, { recursive: true });
  writeFileSync(paperPath, "# Source\n\nA paper-like note used as goal-mode input.\n");
  writeFileSync(attachmentPath, "\\section{Idea}\nA TeX attachment used as a hint only.\n");
  writeFileSync(join(workspaceRoot, "Main.lean"), "theorem trivial_goal : True := by trivial\n");

  const start = await server.inject({
    method: "POST",
    path: "/campaign/start",
    body: {
      project_root: root,
      project_name: "Goal 3 Task 255 Intake",
      user_goal: "Prove the attached Lean skeleton captures the trivial goal boundary.",
      domain: "formalization",
      mode: "goal",
      paper_paths: [paperPath],
      attachments: ["notes/idea.tex"],
      workspace_refs: ["lean"],
      budget: "frontier",
      goal_mode_policy: {
        mode: "goal",
        terminal_states: [
          "formal_replay_passed",
          "formal_counterexample_confirmed",
          "needs_user_statement_disambiguation",
          "blocked_with_replayable_certificate",
          "budget_exhausted_with_resume_state"
        ],
        require_user_confirmation_for_statement_lock: true,
        resume_enabled: true
      },
      strict_mode: true,
      actor: "goal3-task255"
    }
  });

  assert.equal(start.status, 200);
  assert.equal(start.body.campaign.status, "running");

  const intakeRun = start.body.campaign.stage_runs.find(
    (run) => run.stage === "initialized" && run.artifact_paths.some((path) => path.endsWith("goal_mode_intake_manifest.json"))
  );
  assert.ok(intakeRun, "startCampaign must attach a service-owned goal-mode intake manifest to the initialized stage");
  const manifestRel = intakeRun.artifact_paths.find((path) => path.endsWith("goal_mode_intake_manifest.json"));
  assert.ok(manifestRel?.startsWith(".comath/campaign/"));

  const manifestPath = join(root, manifestRel);
  assert.equal(existsSync(manifestPath), true, "service-owned intake manifest must be written under .comath");
  const manifestText = readFileSync(manifestPath, "utf8");
  const manifest = JSON.parse(manifestText);

  assert.equal(manifest.schema_version, "comath.pi_goal_mode_intake_manifest.v1");
  assert.equal(manifest.campaign_id, start.body.campaign.campaign_id);
  assert.equal(manifest.project_id, start.body.campaign.project_id);
  assert.equal(manifest.claim_id, start.body.campaign.root_claim_id);
  assert.equal(manifest.mode, "goal");
  assert.equal(manifest.budget, "frontier");
  assert.equal(manifest.proof_authority, "none");
  assert.equal(manifest.external_evidence_authority, false);
  assert.equal(manifest.can_promote_claim, false);
  assert.equal(manifest.can_certify_ga, false);
  assert.equal(manifest.path_policy.project_root_confined, true);
  assert.equal(manifest.path_policy.no_symlink_escape, true);

  assert.deepEqual(
    manifest.paper_refs.map((ref) => ref.normalized_path),
    ["papers/source.md"]
  );
  assert.equal(manifest.paper_refs[0].input_ref_kind, "project_absolute");
  assert.equal(manifest.paper_refs[0].entry_type, "file");
  assert.equal(manifest.paper_refs[0].sha256, sha256File(paperPath));
  assert.equal(manifest.paper_refs[0].size_bytes, readFileSync(paperPath).byteLength);
  assert.equal(manifest.paper_refs[0].proof_authority, "none");
  assert.equal(manifest.paper_refs[0].can_promote_claim, false);

  assert.deepEqual(
    manifest.attachment_refs.map((ref) => ref.normalized_path),
    ["notes/idea.tex"]
  );
  assert.equal(manifest.attachment_refs[0].input_ref_kind, "project_relative");
  assert.equal(manifest.attachment_refs[0].entry_type, "file");
  assert.equal(manifest.attachment_refs[0].sha256, sha256File(attachmentPath));
  assert.equal(manifest.attachment_refs[0].proof_authority, "none");

  assert.deepEqual(
    manifest.workspace_refs.map((ref) => ref.normalized_path),
    ["lean"]
  );
  assert.equal(manifest.workspace_refs[0].entry_type, "directory");
  assert.equal(manifest.workspace_refs[0].sha256, null);
  assert.equal(manifest.workspace_refs[0].proof_authority, "none");
  assert.equal(manifest.workspace_refs[0].can_promote_claim, false);

  assert.equal(manifestText.includes(root), false, "manifest must not leak the host project root");
  assert.equal(manifestText.includes(root.replace(/\\/g, "/")), false, "manifest must not leak normalized host project root");
  assert.equal(
    manifestText.includes(root.replace(/\\/g, "\\\\")),
    false,
    "manifest must not leak JSON-escaped host project root"
  );

  const exported = await server.inject({
    method: "GET",
    path: `/campaign/${encodeURIComponent(start.body.campaign.campaign_id)}/export?project_root=${encodeURIComponent(root)}`
  });
  assert.equal(exported.status, 200);
  assert.equal(exported.body.export_manifest.proof_authority, "none");
  assert.equal(exported.body.export_manifest.can_promote_claim, false);
  assert.equal(exported.body.export_manifest.goal_mode_intake_manifest.path, manifestRel);
  assert.equal(exported.body.export_manifest.goal_mode_intake_manifest.sha256, sha256File(manifestPath));
  assert.equal(exported.body.export_manifest.goal_mode_intake_manifest.proof_authority, "none");
  assert.equal(exported.body.export_manifest.goal_mode_intake_manifest.can_promote_claim, false);
  assert.equal(exported.body.export_manifest.goal_mode_intake_manifest.can_certify_ga, false);
  assert.equal(exported.body.export_manifest.goal_mode_intake_manifest.external_evidence_authority, false);
} finally {
  await server.close();
  rmSync(root, { recursive: true, force: true });
}

console.log("Goal 3 Task 255 Pi goal-mode intake manifest test passed.");
