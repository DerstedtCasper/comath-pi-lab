import assert from "node:assert/strict";
import {
  aggregateDashboardSnapshot,
  renderDashboardText,
  renderTextDashboard,
  renderTuiDashboard
} from "../dist/index.js";

const proofAuthorityVocabulary =
  /formally_checked|proven|formal_proof_verified|formal_replay_passed|lean_kernel_clean_replay|verified_final_authority_evidence/;

const legacyText = renderTextDashboard({
  project: { project_id: "PRJ-126", name: "Task126 Dashboard" },
  claims: [
    {
      id: "C-1260",
      status: "formally_checked",
      statement: "A locally cached dashboard claim must not promote proof authority."
    },
    {
      id: "C-1261",
      status: "proven",
      statement: "A non-CoMath promotional status must be neutralized."
    }
  ],
  workstreams: [
    {
      id: "WS-1260",
      status: "formal_replay_passed",
      goal: "A cached public dashboard workstream must not imply replay authority."
    }
  ],
  blockers: []
});

assert.doesNotMatch(
  legacyText,
  proofAuthorityVocabulary,
  "legacy/local dashboard snapshots must not render privileged proof-authority vocabulary without service proof context"
);
assert.match(legacyText, /unverified_formal_status/);

const calls = [];
const client = {
  get: async (path) => {
    calls.push(path);
    if (path.startsWith("/project/status")) {
      return { project: { project_id: "PRJ-126", name: "Task126 Dashboard" }, runtime: { initialized: true } };
    }
    if (path.startsWith("/workstream/list")) {
      return {
        workstreams: [
          {
            id: "WS-1262",
            status: "formal_proof_verified",
            goal: "A raw service workstream status is display-only."
          }
        ]
      };
    }
    if (path.startsWith("/claim/list")) {
      return {
        claims: [
          {
            id: "C-1262",
            status: "formally_checked",
            statement: "A raw dashboard read-model claim status is display-only."
          }
        ]
      };
    }
    if (path.startsWith("/evidence/list")) {
      return {
        evidence: [
          {
            id: "EV-1262",
            claim_id: "C-1262",
            kind: "lean",
            proof_authority: "lean_kernel_clean_replay"
          }
        ]
      };
    }
    if (path.startsWith("/gate/list")) {
      return {
        gates: [
          {
            id: "GR-1262",
            claim_id: "C-1262",
            ok: true,
            target_status: "formally_checked",
            vetoes: [],
            warnings: []
          }
        ]
      };
    }
    if (path.startsWith("/paper/state")) {
      return { margin_notes: [] };
    }
    if (path.startsWith("/paper/check")) {
      return { ok: true, vetoes: [], warnings: [], notes: [] };
    }
    throw new Error(`unexpected GET ${path}`);
  }
};

const snapshot = await aggregateDashboardSnapshot(client, {
  project_root: "D:/research/task126-dashboard",
  project_id: "PRJ-126"
});
const text = renderDashboardText(snapshot);
const tui = renderTuiDashboard(snapshot);

assert.equal(calls.length, 7);
assert.doesNotMatch(text, proofAuthorityVocabulary);
assert.match(text, /unverified_formal_status/);
assert.equal(
  tui.sections.some((section) => section.rows.some((row) => proofAuthorityVocabulary.test(row))),
  false,
  "TUI dashboard rows must not render privileged proof-authority vocabulary without service proof context"
);

console.log("Goal 3 Task 126 dashboard public authority wording test passed.");
