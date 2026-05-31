import assert from "node:assert/strict";
import { aggregateDashboardSnapshot, renderDashboardText, renderTuiDashboard } from "../dist/index.js";

const calls = [];
const client = {
  get: async (path) => {
    calls.push(path);
    if (path.startsWith("/project/status")) {
      return {
        project: { project_id: "PRJ-0092", name: "Audit Evidence Project" },
        runtime: { initialized: true }
      };
    }
    if (path.startsWith("/workstream/list")) {
      return { workstreams: [] };
    }
    if (path.startsWith("/claim/list")) {
      return {
        claims: [
          {
            id: "C-0092",
            status: "blocked_with_replayable_certificate",
            statement: "PM-084 real replay attempt remains environment-blocked."
          }
        ]
      };
    }
    if (path.startsWith("/evidence/list")) {
      return {
        evidence: [
          {
            id: "EV-AUDIT-0092",
            claim_id: "C-0092",
            kind: "audit",
            summary: "real Lean replay attempt archived as non-authoritative audit evidence"
          },
          {
            id: "EV-LEAN-0092",
            claim_id: "C-0092",
            kind: "lean",
            summary: "service-owned Lean run manifest"
          }
        ]
      };
    }
    if (path.startsWith("/gate/list")) {
      return {
        gates: [
          {
            id: "GR-0092",
            claim_id: "C-0092",
            ok: false,
            target_status: "formally_checked",
            vetoes: ["final Lean replay missing"]
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
  project_root: "D:/research/audit-evidence",
  project_id: "PRJ-0092"
});

assert.equal(calls.length, 7);
assert.equal(snapshot.evidence.find((item) => item.id === "EV-AUDIT-0092")?.source, "audit");
assert.equal(snapshot.evidence.find((item) => item.id === "EV-LEAN-0092")?.source, "runner");

const text = renderDashboardText(snapshot);
assert.match(text, /EV-AUDIT-0092 claim:C-0092 audit/);
assert.doesNotMatch(text, /EV-AUDIT-0092 claim:C-0092 runner/);
assert.match(text, /EV-LEAN-0092 claim:C-0092 runner/);

const tui = renderTuiDashboard(snapshot);
const evidenceSection = tui.sections.find((section) => section.id === "evidence");
assert.ok(evidenceSection);
assert.ok(evidenceSection.rows.includes("EV-AUDIT-0092 audit"));
assert.ok(evidenceSection.rows.includes("EV-LEAN-0092 runner"));

console.log("Goal 3 Task 92 dashboard audit evidence semantics tests passed.");
