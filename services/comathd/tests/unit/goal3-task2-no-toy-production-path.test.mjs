import assert from "node:assert/strict";
import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createComathServer, getClaim } from "../../dist/index.js";

const testRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const srcRoot = join(testRoot, "src");

function listFiles(root) {
  const files = [];
  const visit = (dir) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const path = join(dir, entry.name);
      if (entry.isDirectory()) {
        visit(path);
      } else if (entry.isFile()) {
        files.push(path);
      }
    }
  };
  visit(root);
  return files;
}

async function tickToTerminal(server, projectRoot, campaignId, actor, maxTicks = 14) {
  let last = null;
  for (let index = 0; index < maxTicks; index += 1) {
    const tick = await server.inject({
      method: "POST",
      path: `/campaign/${encodeURIComponent(campaignId)}/tick`,
      body: { project_root: projectRoot, actor }
    });
    assert.equal(tick.status, 200);
    last = tick.body;
    if (tick.body.campaign.status === "terminal") {
      return last;
    }
  }
  assert.fail("campaign did not reach a terminal state during Goal 3 Task 2 scan");
}

const productionFiles = listFiles(srcRoot).filter((path) => path.endsWith(".ts"));

assert.equal(
  existsSync(join(srcRoot, "proof-kernel", "lean", "theorem-family.ts")),
  false,
  "the theorem-family smoke recognizer must not exist under production src"
);

for (const file of productionFiles) {
  const rel = relative(srcRoot, file).replace(/\\/g, "/");
  const text = readFileSync(file, "utf8");
  assert.doesNotMatch(text, /theorem-family(?:\.js)?/, `${rel} imports or exports theorem-family smoke fixtures`);
  assert.doesNotMatch(text, /findTheoremFamilyFor(?:Goal|Obligation)/, `${rel} still exposes a production theorem-family recognizer`);
  assert.doesNotMatch(text, /runTrivialNatAddZeroCandidates/, `${rel} still exposes a production Nat-only candidate fixture`);
}

const statusSource = readFileSync(join(srcRoot, "status.ts"), "utf8");
for (const forbiddenCapability of [
  "proof_kernel_theorem_family_registry",
  "proof_kernel_theorem_template_instantiation",
  "registered_nat_linear_identity_targets",
  "controlled_nat_linear_identity_synthesis",
  "bounded_theorem_specific_proof_body_synthesis",
  "bounded_final_clean_replay_promotion"
]) {
  assert.equal(
    statusSource.includes(forbiddenCapability),
    false,
    `status capabilities still advertise obsolete toy/Nat proof path: ${forbiddenCapability}`
  );
}

{
  const projectRoot = mkdtempSync(join(tmpdir(), "comath-goal3-task2-unknown-"));
  const server = createComathServer();
  try {
    const start = await server.inject({
      method: "POST",
      path: "/campaign/start",
      body: {
        project_root: projectRoot,
        project_name: "Goal 3 Task 2 Unknown Goal",
        user_goal: "Investigate whether every prime has a twin prime.",
        domain: "number_theory",
        strict_mode: true,
        actor: "goal3-task2"
      }
    });
    assert.equal(start.status, 200);
    assert.equal(start.body.obligation, undefined, "unknown goals must not create proof obligations before FormalSpecLock");
    assert.deepEqual(start.body.campaign.open_obligations, []);
    assert.equal(start.body.campaign.blockers[0].reason, "needs_formal_spec_lock");
  } finally {
    await server.close();
    rmSync(projectRoot, { recursive: true, force: true });
  }
}

{
  const projectRoot = mkdtempSync(join(tmpdir(), "comath-goal3-task2-nat-linear-"));
  const server = createComathServer();
  try {
    const start = await server.inject({
      method: "POST",
      path: "/campaign/start",
      body: {
        project_root: projectRoot,
        project_name: "Goal 3 Task 2 No Nat Linear",
        user_goal: "Prove in Lean that 2 * n + 3 = n + n + 3 for natural numbers.",
        domain: "elementary",
        strict_mode: true,
        actor: "goal3-task2"
      }
    });
    assert.equal(start.status, 200);
    const terminal = await tickToTerminal(server, projectRoot, start.body.campaign.campaign_id, "goal3-task2");
    assert.equal(terminal.campaign.status, "terminal");
    assert.equal(terminal.campaign.terminal_state, "blocked_with_replayable_reason");
    assert.equal(terminal.final_replay, undefined);
    assert.equal(terminal.gate, undefined);

    const claim = getClaim(projectRoot, terminal.campaign.project_id, terminal.campaign.root_claim_id);
    assert.ok(claim);
    assert.equal(claim.status, "conjectural");

    const failurePath = join(projectRoot, ".comath", "campaign", terminal.campaign.campaign_id, "broad_synthesis_failure.json");
    const failure = JSON.parse(readFileSync(failurePath, "utf8"));
    assert.equal(failure.proof_authority, "none");
    assert.equal(failure.can_promote_claim, false);
    assert.equal(
      failure.hard_vetoes.includes("business_layer_theorem_prover_forbidden"),
      true,
      "former Nat-linear production support must be represented as a runtime no-reinvent hard veto"
    );
    assert.equal(existsSync(join(projectRoot, ".comath", "lean", "broad")), false);
  } finally {
    await server.close();
    rmSync(projectRoot, { recursive: true, force: true });
  }
}

console.log("Goal 3 Task 2 no toy production path tests passed.");
