import assert from "node:assert/strict";
import { createServer } from "node:http";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

const serviceCalls = [];

const server = createServer(async (request, response) => {
  const url = new URL(request.url ?? "/", "http://127.0.0.1");
  serviceCalls.push({ method: request.method, path: url.pathname, search: url.search });
  const send = (payload) => {
    response.writeHead(200, { "content-type": "application/json" });
    response.end(JSON.stringify(payload));
  };

  if (request.method === "POST" && url.pathname === "/campaign/start") {
    send({
      campaign: {
        campaign_id: "CAM-1250",
        project_id: "PRJ-1250",
        root_claim_id: "C-1250",
        current_stage: "problem_locked",
        status: "running",
        blockers: [],
        next_actions: ["tick campaign"]
      },
      obligation: { obligation_id: "PO-1250", claim_id: "C-1250" }
    });
    return;
  }

  if (request.method === "POST" && url.pathname === "/campaign/CAM-1250/tick") {
    send({
      campaign: {
        campaign_id: "CAM-1250",
        project_id: "PRJ-1250",
        root_claim_id: "C-1250",
        current_stage: "completed_formal_proof",
        status: "terminal",
        terminal_state: "completed_formal_proof",
        external_v3_terminal_state: "formal_proof_verified",
        goal_mode_terminal_state: "formal_replay_passed",
        formal_replay_authority_passed: true,
        formal_replay_authority_evidence: {
          schema_version: "comath.formal_replay_authority_evidence.v1",
          proof_authority: "lean_kernel_clean_replay",
          final_evidence_status: "verified_final_authority_evidence",
          final_replay_manifest_v3_path: ".comath/evidence/C-1250/lean/final_replay_manifest_v3.json",
          final_authority_packaging_path: ".comath/evidence/C-1250/lean/final_authority_packaging_v3.json"
        },
        next_actions: []
      }
    });
    return;
  }

  if (request.method === "GET" && url.pathname === "/campaign/CAM-1250/export") {
    send({
      export_manifest: {
        evidence_pack_ready: false,
        proof_authority: "none",
        can_promote_claim: false
      }
    });
    return;
  }

  if (request.method === "GET" && url.pathname === "/project/status") {
    send({ project: { project_id: "PRJ-1250", name: "Task125 UX" }, runtime: { initialized: true } });
    return;
  }
  if (request.method === "GET" && url.pathname === "/workstream/list") {
    send({ workstreams: [] });
    return;
  }
  if (request.method === "GET" && url.pathname === "/claim/list") {
    send({ claims: [{ id: "C-1250", status: "conjectural", statement: "Untrusted proof-shaped terminal state" }] });
    return;
  }
  if (request.method === "GET" && url.pathname === "/evidence/list") {
    send({ evidence: [{ id: "EV-1250", claim_id: "C-1250", kind: "audit", proof_authority: "none" }] });
    return;
  }
  if (request.method === "GET" && url.pathname === "/gate/list") {
    send({ gates: [{ id: "GR-1250", claim_id: "C-1250", ok: false, vetoes: ["unverified final replay authority"], warnings: [] }] });
    return;
  }
  if (request.method === "GET" && url.pathname === "/paper/state") {
    send({ margin_notes: [] });
    return;
  }
  if (request.method === "GET" && url.pathname === "/paper/check") {
    send({ ok: true, vetoes: [], warnings: [], notes: [] });
    return;
  }

  response.writeHead(404, { "content-type": "application/json" });
  response.end(JSON.stringify({ error: `unexpected ${request.method} ${url.pathname}` }));
});

try {
  await new Promise((resolveListen) => server.listen(0, "127.0.0.1", resolveListen));
  const address = server.address();
  assert.equal(typeof address, "object");
  const baseUrl = `http://127.0.0.1:${address.port}`;

  const packageJson = JSON.parse(readFileSync(resolve("extensions/comath-pi/package.json"), "utf8"));
  const entrypointPath = resolve("extensions/comath-pi", packageJson.pi.extensions[0]);
  const entrypointModule = await import(pathToFileURL(entrypointPath).href);
  const fakePi = createFakePi();
  const notifications = [];
  const confirmations = [];

  entrypointModule.default(fakePi.api, {
    client: entrypointModule.createComathClient({ baseUrl }),
    project_root: "D:/research/task125-public-ux",
    project_name: "Task125 UX",
    actor: "goal3-task125",
    max_ticks: 1
  });

  await fakePi.commands.get("cm:research").handler(
    '--goal "Prove a theorem from attached notes" --mode goal --strict --max-ticks 1',
    hostContext(confirmations, notifications)
  );

  assert.equal(confirmations.length, 1);
  assert.ok(serviceCalls.some((call) => call.method === "POST" && call.path === "/campaign/start"));
  assert.ok(serviceCalls.some((call) => call.method === "POST" && call.path === "/campaign/CAM-1250/tick"));
  assert.ok(serviceCalls.some((call) => call.method === "GET" && call.path === "/campaign/CAM-1250/export"));

  const message = notifications.at(-1).message;
  const payload = JSON.parse(message);

  assert.equal(payload.external_v3_terminal_state, undefined);
  assert.equal(payload.goal_terminal_state, "blocked_with_replayable_certificate");
  assert.equal(payload.export_descriptor.proof_authority, "none");
  assert.equal(payload.export_descriptor.can_promote_claim, false);
  assert.equal(payload.campaign?.external_v3_terminal_state, undefined);
  assert.equal(payload.campaign?.goal_mode_terminal_state, undefined);
  assert.equal(payload.campaign?.formal_replay_authority_evidence, undefined);
  assert.equal(payload.blocker_certificate?.code, "UNVERIFIED_FORMAL_REPLAY_AUTHORITY");
  assert.equal(payload.dashboard.claims.every((claim) => claim.status !== "formally_checked"), true);
  assert.equal(payload.dashboard.evidence.every((evidence) => evidence.proof_authority !== "lean_kernel_clean_replay"), true);
  assert.doesNotMatch(message, /formal_proof_verified|formal_replay_passed|lean_kernel_clean_replay|verified_final_authority_evidence/);
} finally {
  await new Promise((resolveClose) => server.close(resolveClose));
}

function hostContext(confirmations, notifications) {
  return {
    ui: {
      confirm: async (title, body) => {
        confirmations.push({ title, body });
        return true;
      },
      notify: async (message, level = "info") => {
        notifications.push({ message, level });
      }
    }
  };
}

function createFakePi() {
  const commands = new Map();
  return {
    commands,
    api: {
      registerTool() {
        // command path only
      },
      registerCommand(name, options) {
        commands.set(name, options);
      },
      on() {
        // no resources needed
      }
    }
  };
}

console.log("Goal 3 Task 125 Pi research-loop public UX authority test passed.");
