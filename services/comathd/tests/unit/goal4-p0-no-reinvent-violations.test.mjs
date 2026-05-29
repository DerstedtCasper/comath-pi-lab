import assert from "node:assert/strict";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  createComathServer,
  decideCandidate,
  getClaim,
  initProject,
  registerClaim
} from "../../dist/index.js";
import { runTrivialNatAddZeroCandidates } from "../fixtures/proof-smoke/nat-add-zero-candidates.mjs";
import * as productionApi from "../../dist/index.js";

const failures = [];

async function expectNoViolation(name, check) {
  try {
    await check();
  } catch (error) {
    failures.push(`${name}: ${error.message}`);
  }
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
  assert.fail("campaign did not reach a terminal state during P0 negative-test scan");
}

function makeSyntheticCandidateFixture(projectRoot) {
  const { project } = initProject({ name: "Goal 4 P0 Synthetic Candidate Fixture", root_path: projectRoot });
  const claim = registerClaim(projectRoot, {
    project_id: project.project_id,
    statement: "For every natural number n, n + 0 = n.",
    assumptions: ["n : Nat"],
    domain: "elementary",
    status: "conjectural",
    actor: "goal4-p0-negative-test"
  });
  const campaign = {
    campaign_id: "CAM-0001",
    project_id: project.project_id,
    root_claim_id: claim.id,
    user_goal: claim.statement,
    current_stage: "candidate_arbitration",
    status: "running",
    strict_mode: true,
    stage_runs: [],
    open_obligations: [],
    accepted_artifacts: [],
    blockers: [],
    next_actions: [],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
  const obligation = {
    obligation_id: "PO-0001",
    claim_id: claim.id,
    locked_statement_nl: claim.statement,
    locked_statement_structured: { theorem: "Nat.add_zero", binder: "n : Nat" },
    lean_target: "MathResearch.C0001",
    statement_hash: claim.statement_hash,
    dependencies: [],
    assumptions: ["n : Nat"],
    status: "candidate_search"
  };
  return { campaign, obligation };
}

await expectNoViolation("production theorem-family recognizer must be quarantined from trusted runtime", () => {
  assert.equal(
    Object.hasOwn(productionApi, "findTheoremFamilyForGoal"),
    false,
    "production package still exports findTheoremFamilyForGoal"
  );
  assert.equal(
    Object.hasOwn(productionApi, "findTheoremFamilyForObligation"),
    false,
    "production package still exports findTheoremFamilyForObligation"
  );
});

await expectNoViolation("production Nat-only candidate fixture must not be exported", () => {
  assert.equal(
    Object.hasOwn(productionApi, "runTrivialNatAddZeroCandidates"),
    false,
    "production package still exports runTrivialNatAddZeroCandidates"
  );
});

await expectNoViolation("proof-smoke fixture remains non-authoritative when used by tests", () => {
  assert.equal(
    typeof runTrivialNatAddZeroCandidates,
    "function",
    "test fixture must remain available outside production exports"
  );
});

await expectNoViolation("obligation-level theorem-family recognizer must not support production proof claims", () => {
  assert.equal(
    Object.hasOwn(productionApi, "findTheoremFamilyForObligation"),
    false,
    "production code still supports Nat proof claims through obligation matching"
  );
});

await expectNoViolation("production theorem-family goal recognizer must not classify Nat targets", () => {
  assert.equal(
    Object.hasOwn(productionApi, "findTheoremFamilyForGoal"),
    false,
    "production code still classifies a Nat theorem-family target"
  );
});

await expectNoViolation("production fixture APIs stay absent even for synthetic Nat obligations", () => {
  const projectRoot = mkdtempSync(join(tmpdir(), "comath-goal4-p0-obligation-family-"));
  try {
    makeSyntheticCandidateFixture(projectRoot);
    assert.equal(
      Object.hasOwn(productionApi, "findTheoremFamilyForObligation"),
      false,
      "production API exposes obligation matching for a synthetic Nat target"
    );
  } finally {
    rmSync(projectRoot, { recursive: true, force: true });
  }
});

await expectNoViolation("legacy theorem-family recognizer calls are unavailable in production", () => {
  assert.equal(
    productionApi.findTheoremFamilyForGoal,
    undefined,
    "production code still exposes a theorem-family goal recognizer"
  );
});

await expectNoViolation("unknown user goals must not receive default n : Nat assumptions", async () => {
  const projectRoot = mkdtempSync(join(tmpdir(), "comath-goal4-p0-default-nat-"));
  const server = createComathServer();
  try {
    const start = await server.inject({
      method: "POST",
      path: "/campaign/start",
      body: {
        project_root: projectRoot,
        project_name: "Goal 4 P0 No Default Nat",
        user_goal: "Investigate whether every prime has a twin prime.",
        domain: "number_theory",
        strict_mode: true,
        actor: "goal4-p0-negative-test"
      }
    });
    assert.equal(start.status, 200);
    assert.equal(start.body.obligation, undefined, "unknown goals must not create proof obligations before FormalSpecLock");
    assert.deepEqual(start.body.campaign.open_obligations, [], "campaign injected a proof obligation before FormalSpecLock");
    assert.equal(start.body.campaign.blockers[0].reason, "needs_formal_spec_lock");

    const assumptionsPath = join(projectRoot, ".comath", "lock", "assumptions.md");
    if (existsSync(assumptionsPath)) {
      assert.doesNotMatch(
        readFileSync(assumptionsPath, "utf8"),
        /\bn\s*:\s*Nat\b/,
        "problem lock wrote a default Nat variable"
      );
    }
  } finally {
    await server.close();
    rmSync(projectRoot, { recursive: true, force: true });
  }
});

await expectNoViolation("Nat linear business-layer synthesis must not promote proof artifacts", async () => {
  const projectRoot = mkdtempSync(join(tmpdir(), "comath-goal4-p0-nat-linear-"));
  const server = createComathServer();
  try {
    const start = await server.inject({
      method: "POST",
      path: "/campaign/start",
      body: {
        project_root: projectRoot,
        project_name: "Goal 4 P0 No Nat Linear Synthesis",
        user_goal: "Prove in Lean that 2 * n + 3 = n + n + 3 for natural numbers.",
        domain: "elementary",
        strict_mode: true,
        actor: "goal4-p0-negative-test"
      }
    });
    assert.equal(start.status, 200);
    const terminal = await tickToTerminal(server, projectRoot, start.body.campaign.campaign_id, "goal4-p0-negative-test");
    assert.notEqual(
      terminal.campaign.terminal_state,
      "completed_formal_proof",
      "Nat linear business-layer synthesis reached completed_formal_proof"
    );
    const claim = getClaim(projectRoot, terminal.campaign.project_id, terminal.campaign.root_claim_id);
    assert.notEqual(claim.status, "formally_checked", "Nat linear business-layer synthesis promoted the root claim");
  } finally {
    await server.close();
    rmSync(projectRoot, { recursive: true, force: true });
  }
});

await expectNoViolation("candidate runner must not encode a synthetic V1 winner", () => {
  const projectRoot = mkdtempSync(join(tmpdir(), "comath-goal4-p0-v1-winner-"));
  try {
    const { campaign, obligation } = makeSyntheticCandidateFixture(projectRoot);
    const batch = runTrivialNatAddZeroCandidates({ projectRoot, campaign, obligation });
    assert.equal(
      batch.candidates.some(
        (candidate) => candidate.variant_id === "V1" && candidate.state === "candidate_kernel_checked" && candidate.score === 15500
      ),
      false,
      "V1 is still hard-coded as candidate_kernel_checked with synthetic winning score"
    );
  } finally {
    rmSync(projectRoot, { recursive: true, force: true });
  }
});

await expectNoViolation("synthetic candidate arbitration must not pass before trusted replay evidence", () => {
  const projectRoot = mkdtempSync(join(tmpdir(), "comath-goal4-p0-synthetic-arbitration-"));
  try {
    const { campaign, obligation } = makeSyntheticCandidateFixture(projectRoot);
    const batch = runTrivialNatAddZeroCandidates({ projectRoot, campaign, obligation });
    const { decision, gate } = decideCandidate({ projectRoot, campaign, candidates: batch.candidates });
    assert.notEqual(gate.result, "pass", "arbitration passed on synthetic candidate metadata");
    assert.equal(decision.selected_candidate_id, null, "arbitration selected a candidate without trusted replay evidence");
  } finally {
    rmSync(projectRoot, { recursive: true, force: true });
  }
});

if (failures.length > 0) {
  throw new Error(`Goal 4 P0 no-reinvent violations still present:\n- ${failures.join("\n- ")}`);
}

console.log("Goal 4 P0 no-reinvent negative tests passed.");
