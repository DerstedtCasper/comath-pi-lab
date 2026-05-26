import assert from "node:assert/strict";

const piEntry = await import("../dist/pi-extension.js");

const registeredTools = [];
await piEntry.default({
  registerTool(tool) {
    registeredTools.push(tool);
  }
});

const byName = new Map(registeredTools.map((tool) => [tool.name, tool]));
const projectRoot = "D:/tmp/comath-project";
const projectId = "PRJ-0001";
const workstreamId = "WS-0001";
const claimId = "C-0001";
const citationId = "CIT-0001";
const manifestPath = "D:/tmp/comath-project/.comath/snapshots/SNAP-0001/manifest.json";

const cases = [
  {
    tool: "comath.service.health",
    payload: {},
    method: "GET",
    path: "/health"
  },
  {
    tool: "comath.project.init",
    payload: { root_path: projectRoot, name: "Control Surface Project" },
    method: "POST",
    path: "/project/init",
    body: { root_path: projectRoot, name: "Control Surface Project" }
  },
  {
    tool: "comath.project.open",
    payload: { root_path: projectRoot },
    method: "POST",
    path: "/project/open",
    body: { root_path: projectRoot }
  },
  {
    tool: "comath.project.status",
    payload: { project_root: projectRoot },
    method: "GET",
    path: "/project/status?project_root=D%3A%2Ftmp%2Fcomath-project"
  },
  {
    tool: "comath.claim.register",
    payload: { project_root: projectRoot, project_id: projectId, statement: "x = x", domain: "algebra" },
    method: "POST",
    path: "/claim/register"
  },
  {
    tool: "comath.claim.get",
    payload: { project_root: projectRoot, project_id: projectId, claim_id: claimId },
    method: "GET",
    path: "/claim/get?project_root=D%3A%2Ftmp%2Fcomath-project&project_id=PRJ-0001&claim_id=C-0001"
  },
  {
    tool: "comath.claim.update",
    payload: { project_root: projectRoot, project_id: projectId, claim_id: claimId, patch: { status: "conjectural" }, actor: "pi" },
    method: "POST",
    path: "/claim/update"
  },
  {
    tool: "comath.claim.link",
    payload: { project_root: projectRoot, project_id: projectId, source_id: "C-0001", target_id: "C-0002", label: "depends_on", actor: "pi" },
    method: "POST",
    path: "/claim/link"
  },
  {
    tool: "comath.claim.requestPromotion",
    payload: { project_root: projectRoot, project_id: projectId, claim_id: claimId, target_status: "literature_supported" },
    method: "POST",
    path: "/claim/promote"
  },
  {
    tool: "comath.evidence.attach",
    payload: { project_root: projectRoot, project_id: projectId, kind: "literature", summary: "supported", actor: "pi" },
    method: "POST",
    path: "/evidence/attach"
  },
  {
    tool: "comath.artifact.import",
    payload: { project_root: projectRoot, project_id: projectId, source_path: "notes/result.txt", kind: "log", actor: "pi" },
    method: "POST",
    path: "/artifact/import"
  },
  {
    tool: "comath.artifact.list",
    payload: { project_root: projectRoot, project_id: projectId },
    method: "GET",
    path: "/artifact/list?project_root=D%3A%2Ftmp%2Fcomath-project&project_id=PRJ-0001"
  },
  {
    tool: "comath.workstream.spawn",
    payload: { project_root: projectRoot, project_id: projectId, kind: "proof_route", goal: "route proof", actor: "pi" },
    method: "POST",
    path: "/workstream/spawn"
  },
  {
    tool: "comath.workstream.status",
    payload: { project_root: projectRoot, project_id: projectId, workstream_id: workstreamId },
    method: "GET",
    path: "/workstream/status?project_root=D%3A%2Ftmp%2Fcomath-project&project_id=PRJ-0001&workstream_id=WS-0001"
  },
  {
    tool: "comath.workstream.list",
    payload: { project_root: projectRoot, project_id: projectId },
    method: "GET",
    path: "/workstream/list?project_root=D%3A%2Ftmp%2Fcomath-project&project_id=PRJ-0001"
  },
  {
    tool: "comath.workstream.bundle",
    payload: { project_root: projectRoot, project_id: projectId, workstream_id: workstreamId },
    method: "GET",
    path: "/workstream/bundle?project_root=D%3A%2Ftmp%2Fcomath-project&project_id=PRJ-0001&workstream_id=WS-0001"
  },
  {
    tool: "comath.workstream.report",
    payload: { project_root: projectRoot, project_id: projectId, workstream_id: workstreamId, report_markdown: "# Report" },
    method: "POST",
    path: "/workstream/report"
  },
  {
    tool: "comath.workstream.transition",
    payload: { project_root: projectRoot, project_id: projectId, workstream_id: workstreamId, next_status: "running", actor: "pi" },
    method: "POST",
    path: "/workstream/transition"
  },
  {
    tool: "comath.graph.proposePatch",
    payload: { project_root: projectRoot, project_id: projectId, workstream_id: workstreamId, new_nodes: [], new_edges: [] },
    method: "POST",
    path: "/graph-patch/propose",
    body: { project_root: projectRoot, project_id: projectId, workstream_id: workstreamId, new_nodes: [], new_edges: [], created_by: "pi-extension" }
  },
  {
    tool: "comath.graph.reviewPatch",
    payload: { project_root: projectRoot, project_id: projectId, workstream_id: workstreamId, next_state: "accepted", reviewer: "pi" },
    method: "POST",
    path: "/graph-patch/review"
  },
  {
    tool: "comath.graph.applyPatch",
    payload: { project_root: projectRoot, project_id: projectId, workstream_id: workstreamId, reviewer: "pi" },
    method: "POST",
    path: "/graph-patch/apply"
  },
  {
    tool: "comath.memory.health",
    payload: { project_root: projectRoot, project_id: projectId },
    method: "GET",
    path: "/memory/health?project_root=D%3A%2Ftmp%2Fcomath-project&project_id=PRJ-0001"
  },
  {
    tool: "comath.memory.rebuild",
    payload: { project_root: projectRoot, project_id: projectId },
    method: "POST",
    path: "/memory/rebuild"
  },
  {
    tool: "comath.memory.search",
    payload: { project_root: projectRoot, project_id: projectId, query: "braid", limit: 5 },
    method: "POST",
    path: "/memory/search"
  },
  {
    tool: "comath.memory.contextPack",
    payload: { project_root: projectRoot, project_id: projectId, seed_ids: [claimId], depth: 1 },
    method: "POST",
    path: "/memory/context-pack"
  },
  {
    tool: "comath.literature.importBibTeX",
    payload: { project_root: projectRoot, project_id: projectId, bibtex: "@article{x,title={X}}", actor: "pi" },
    method: "POST",
    path: "/literature/import-bibtex"
  },
  {
    tool: "comath.literature.importPdf",
    payload: { project_root: projectRoot, project_id: projectId, source_path: "papers/a.pdf", actor: "pi" },
    method: "POST",
    path: "/literature/import-pdf"
  },
  {
    tool: "comath.literature.registerCitation",
    payload: { project_root: projectRoot, project_id: projectId, title: "Paper", actor: "pi" },
    method: "POST",
    path: "/literature/register-citation"
  },
  {
    tool: "comath.literature.checkCondition",
    payload: { project_root: projectRoot, project_id: projectId, citation_id: citationId, claim_id: claimId, condition: "supports theorem", actor: "pi" },
    method: "POST",
    path: "/literature/check-condition"
  },
  {
    tool: "comath.literature.list",
    payload: { project_root: projectRoot, project_id: projectId },
    method: "GET",
    path: "/literature/list?project_root=D%3A%2Ftmp%2Fcomath-project&project_id=PRJ-0001"
  },
  {
    tool: "comath.status.snapshot",
    payload: { project_root: projectRoot, project_id: projectId },
    method: "GET",
    path: "/status/snapshot?project_root=D%3A%2Ftmp%2Fcomath-project&project_id=PRJ-0001"
  },
  {
    tool: "comath.paper.init",
    payload: { project_root: projectRoot, project_id: projectId, actor: "pi" },
    method: "POST",
    path: "/paper/init"
  },
  {
    tool: "comath.paper.state",
    payload: { project_root: projectRoot, project_id: projectId },
    method: "GET",
    path: "/paper/state?project_root=D%3A%2Ftmp%2Fcomath-project&project_id=PRJ-0001"
  },
  {
    tool: "comath.paper.updateSection",
    payload: { project_root: projectRoot, project_id: projectId, section_id: "intro", title: "Intro", markdown: "Text", actor: "pi" },
    method: "POST",
    path: "/paper/update-section"
  },
  {
    tool: "comath.paper.renderClaim",
    payload: { project_root: projectRoot, project_id: projectId, claim_id: claimId, wording: "theorem", actor: "pi" },
    method: "POST",
    path: "/paper/render-claim"
  },
  {
    tool: "comath.paper.check",
    payload: { project_root: projectRoot, project_id: projectId },
    method: "GET",
    path: "/paper/check?project_root=D%3A%2Ftmp%2Fcomath-project&project_id=PRJ-0001"
  },
  {
    tool: "comath.paper.export",
    payload: { project_root: projectRoot, project_id: projectId, format: "md", actor: "pi" },
    method: "POST",
    path: "/paper/export"
  },
  {
    tool: "comath.snapshot.export",
    payload: { project_root: projectRoot, project_id: projectId, actor: "pi" },
    method: "POST",
    path: "/snapshot/export"
  },
  {
    tool: "comath.snapshot.verify",
    payload: { manifest_path: manifestPath },
    method: "POST",
    path: "/snapshot/verify"
  },
  {
    tool: "comath.snapshot.restore",
    payload: { manifest_path: manifestPath, target_root: "D:/tmp/restored-comath-project", actor: "pi" },
    method: "POST",
    path: "/snapshot/restore"
  },
  {
    tool: "comath.replay.verifyManifest",
    payload: { manifest_path: manifestPath },
    method: "POST",
    path: "/replay/verify-manifest"
  }
];

const researchStartTool = byName.get("comath.research.start");
assert.ok(researchStartTool, "comath.research.start is registered");
const researchStartRequests = [];
await researchStartTool.execute(
  "TOOLCALL-RESEARCH-START",
  {
    root_path: projectRoot,
    name: "Control Surface Project",
    goal: "Start the full Pi SDK/RPC control surface.",
    kind: "proof_route",
    actor: "pi-control-test"
  },
  undefined,
  undefined,
  {
    fetch: async (url, init) => {
      researchStartRequests.push({ url: String(url), init });
      if (String(url).endsWith("/project/init")) {
        return {
          ok: true,
          status: 200,
          json: async () => ({ project: { project_id: projectId }, runtime_root: `${projectRoot}/.comath` })
        };
      }
      return {
        ok: true,
        status: 200,
        json: async () => ({ workstream: { workstream_id: workstreamId } })
      };
    }
  }
);
assert.equal(researchStartRequests.length, 2);
assert.equal(researchStartRequests[0].url, "http://127.0.0.1:48731/project/init");
assert.equal(researchStartRequests[0].init.method, "POST");
assert.equal(researchStartRequests[1].url, "http://127.0.0.1:48731/workstream/spawn");
assert.equal(researchStartRequests[1].init.method, "POST");

assert.deepEqual(
  [...cases.map((item) => item.tool), "comath.research.start"].sort(),
  registeredTools.map((tool) => tool.name).sort()
);

for (const item of cases) {
  const tool = byName.get(item.tool);
  assert.ok(tool, `${item.tool} is registered`);
  const requests = [];
  const result = await tool.execute("TOOLCALL-ROUTE", item.payload, undefined, undefined, {
    fetch: async (url, init) => {
      requests.push({ url: String(url), init });
      return {
        ok: true,
        status: 200,
        json: async () => ({ ok: true, route: item.path })
      };
    }
  });
  assert.equal(result.details.ok, true, `${item.tool} returns Pi details`);
  assert.equal(requests.length, 1, `${item.tool} makes one comathd request`);
  assert.equal(requests[0].url, `http://127.0.0.1:48731${item.path}`, `${item.tool} URL`);
  assert.equal(requests[0].init.method, item.method, `${item.tool} method`);
  if (item.method === "GET") {
    assert.equal(requests[0].init.body, undefined, `${item.tool} has no GET body`);
  } else {
    assert.deepEqual(JSON.parse(requests[0].init.body), item.body ?? item.payload, `${item.tool} POST body`);
  }
}

console.log("Phase 23 Pi control surface tests passed.");
