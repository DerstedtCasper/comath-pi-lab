import assert from "node:assert/strict";
import { existsSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import {
  aggregateDashboardSnapshot,
  renderDashboardText,
  renderTuiDashboard,
  summarizeDashboardBlockers
} from "../dist/index.js";

const calls = [];
const client = {
  get: async (path) => {
    calls.push({ method: "GET", path });
    if (path.startsWith("/project/status")) {
      return {
        project: { project_id: "PRJ-0001", name: "Dashboard Project" },
        runtime: { initialized: true }
      };
    }
    if (path.startsWith("/workstream/list")) {
      return {
        workstreams: [
          { id: "WS-0001", status: "running", goal: "check braid relation" },
          { id: "WS-0002", status: "blocked", goal: "find citation", last_error: "missing locator" }
        ]
      };
    }
    if (path.startsWith("/claim/list")) {
      return {
        claims: [
          {
            id: "C-0001",
            status: "conjectural",
            statement: "For every natural number n, n + 0 = n.",
            evidence_level: 0
          }
        ]
      };
    }
    if (path.startsWith("/evidence/list")) {
      return {
        evidence: [
          {
            id: "EV-0001",
            claim_id: "C-0001",
            kind: "lean",
            summary: "Lean replay evidence"
          }
        ]
      };
    }
    if (path.startsWith("/gate/list")) {
      return {
        gates: [
          {
            id: "GR-0001",
            claim_id: "C-0001",
            ok: false,
            vetoes: ["missing final replay"]
          }
        ]
      };
    }
    if (path.startsWith("/paper/state")) {
      return {
        manifest: { paper_id: "PAPER-0001", title: "Braid Notes" },
        margin_notes: [
          {
            id: "PMN-0001",
            claim_id: "C-0001",
            evidence_ids: ["EV-0001"],
            source_workstreams: ["WS-0001"],
            warnings: ["requires source"],
            blockers: ["missing formal proof"]
          },
          {
            id: "PMN-0002",
            claim_id: "C-PAPER-ONLY",
            evidence_ids: ["EV-PAPER-ONLY"],
            source_workstreams: [],
            warnings: [],
            blockers: ["paper-only blocker"]
          }
        ]
      };
    }
    if (path.startsWith("/paper/check")) {
      return {
        ok: false,
        vetoes: ["hidden_blocker", "stale_claim_statement"],
        warnings: [],
        notes: ["C-0001:conjectural"]
      };
    }
    throw new Error(`unexpected GET ${path}`);
  },
  post: async (path) => {
    calls.push({ method: "POST", path });
    throw new Error(`dashboard must not mutate: ${path}`);
  }
};

const snapshot = await aggregateDashboardSnapshot(client, {
  project_root: "D:/research/project",
  project_id: "PRJ-0001"
});

assert.equal(snapshot.project.project_id, "PRJ-0001");
assert.equal(snapshot.project.name, "Dashboard Project");
assert.equal(snapshot.paper.check.ok, false);
assert.equal(snapshot.paper.margin_notes[0].claim_id, "C-0001");
assert.equal(snapshot.degraded.includes("claim_list_unavailable"), false);
assert.equal(snapshot.degraded.includes("evidence_list_unavailable"), false);
assert.equal(snapshot.degraded.includes("gate_result_list_unavailable"), false);
assert.equal(snapshot.claims[0].status, "conjectural");
assert.equal(snapshot.claims[0].statement, "For every natural number n, n + 0 = n.");
assert.equal(snapshot.evidence[0].source, "runner");
assert.equal(snapshot.claims.some((claim) => claim.id === "C-PAPER-ONLY"), false);
assert.equal(snapshot.evidence.some((item) => item.id === "EV-PAPER-ONLY"), false);
assert.equal(snapshot.blockers.some((item) => item.source === "gate" && item.reason === "missing final replay"), true);
assert.equal(calls.length, 7);
assert.equal(calls.every((call) => call.method === "GET"), true);
assert.equal(calls.some((call) => call.path.includes("/paper/render-claim")), false);
assert.equal(calls.some((call) => call.path.includes("/claim/update")), false);
assert.equal(calls.some((call) => call.path.includes("/graph-patch/apply")), false);

const blockers = summarizeDashboardBlockers(snapshot);
assert.equal(blockers.some((item) => item.reason === "hidden_blocker"), true);
assert.equal(blockers.some((item) => item.reason === "missing formal proof"), true);
assert.equal(blockers.some((item) => item.source === "workstream"), true);

const text = renderDashboardText(snapshot);
assert.equal(text.includes("Dashboard Project"), true);
assert.equal(text.includes("C-0001"), true);
assert.equal(text.includes("EV-0001"), true);
assert.equal(text.includes("WS-0001"), true);
assert.equal(text.includes("hidden_blocker"), true);
assert.equal(text.includes("claim_list_unavailable"), false);
assert.equal(text.includes("Gate Results"), true);
assert.equal(text.includes("missing final replay"), true);

const emptyText = renderDashboardText({
  project: { project_id: "PRJ-EMPTY" },
  claims: [],
  workstreams: [],
  evidence: [],
  paper: { margin_notes: [], check: { ok: true, vetoes: [], warnings: [], notes: [] } },
  blockers: [],
  generated_at: "2026-05-25T00:00:00.000Z",
  degraded: []
});
assert.equal(emptyText.includes("Claims\nnone"), true);
assert.equal(emptyText.includes("Workstreams\nnone"), true);
assert.equal(emptyText.includes("Blockers\nnone"), true);

const tui = renderTuiDashboard(snapshot);
assert.equal(tui.kind, "dashboard");
assert.equal(tui.sections.some((section) => section.id === "paper"), true);
assert.equal(tui.sections.some((section) => section.rows.some((row) => row.includes("hidden_blocker"))), true);

const dashboardSourceFiles = [
  join(process.cwd(), "src", "widgets.ts"),
  join(process.cwd(), "src", "renderers.ts"),
  join(process.cwd(), "src", "tools", "review.ts")
].filter((file) => existsSync(file) && statSync(file).size > 0);

for (const file of dashboardSourceFiles) {
  const content = readFileSync(file, "utf8");
  assert.equal(/from\s+["'][^"']*services\/comathd\/src/i.test(content), false, `${file} imports service internals`);
  assert.equal(/writeFile|appendFile|mkdir|rmSync/.test(content), false, `${file} writes runtime state`);
  assert.equal(/readFile|readdir|statSync|\.comath/.test(content), false, `${file} reads runtime files directly`);
  assert.equal(/\/snapshot|\/replay|snapshotPath|replayPath|exportSnapshot|restoreSnapshot/i.test(content), false, `${file} implements Phase 16 persistence early`);
}

console.log("Phase 15 dashboard tests passed.");
