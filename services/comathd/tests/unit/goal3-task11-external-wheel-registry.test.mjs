import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  createDefaultExternalWheelRegistry,
  getExternalWheelAdapter,
  initProject,
  listExternalWheelAdapters,
  promoteClaim,
  registerClaim
} from "../../dist/index.js";

const projectRoot = mkdtempSync(join(tmpdir(), "comath-external-wheel-"));

try {
  const registry = createDefaultExternalWheelRegistry({ now: () => "2026-05-30T00:00:00.000Z" });
  const adapters = listExternalWheelAdapters(registry);

  const expectedProviders = new Set([
    "loogle",
    "leansearch",
    "lean_state_search",
    "leansearchclient",
    "moogle",
    "leanexplore",
    "arxiv",
    "semantic_scholar",
    "openalex",
    "crossref",
    "unpaywall",
    "jina_reader",
    "jina_search",
    "anysearch",
    "local_pdf",
    "local_tex",
    "local_markdown",
    "sympy",
    "sage",
    "z3",
    "cvc5",
    "local_lean_repo"
  ]);
  for (const provider of expectedProviders) {
    assert.equal(adapters.some((adapter) => adapter.provider === provider), true, `missing provider ${provider}`);
  }

  assert.deepEqual(new Set(adapters.map((adapter) => adapter.kind)), new Set(["theorem_search", "retrieval", "proof_search_backend", "computation", "external_lean_repo"]));
  assert.equal(adapters.every((adapter) => adapter.proof_authority === "none"), true);
  assert.equal(adapters.every((adapter) => adapter.credential_policy.exposes_secret_values === false), true);
  assert.equal(adapters.every((adapter) => typeof adapter.rate_limit_policy.default_rpm === "number"), true);
  assert.equal(adapters.every((adapter) => adapter.terms.license_note.length > 0), true);

  const loogle = getExternalWheelAdapter(registry, "theorem_search", "loogle");
  const loogleHealth = await loogle.health();
  assert.equal(loogleHealth.status, "stubbed");
  assert.equal(loogleHealth.proof_authority, "none");
  assert.equal(loogleHealth.capabilities.includes("constant_search"), true);

  const theoremResults = await loogle.query({ query: "Nat.add_zero", namespace: "Nat" });
  assert.equal(theoremResults.length, 1);
  assert.equal(theoremResults[0].provider, "loogle");
  assert.equal(theoremResults[0].query_hash.length, 64);
  assert.equal(theoremResults[0].retrieved_at, "2026-05-30T00:00:00.000Z");
  assert.equal(theoremResults[0].capability_metadata.capabilities.includes("constant_search"), true);
  assert.equal(theoremResults[0].terms.license_note.length > 0, true);
  assert.equal(theoremResults[0].proof_authority, "none");
  assert.equal(theoremResults[0].can_promote_claim, false);
  assert.equal(theoremResults[0].promotion_vetoes.includes("external_adapter_result_has_no_proof_authority"), true);

  const arxiv = getExternalWheelAdapter(registry, "retrieval", "arxiv");
  const retrievalResults = await arxiv.search({ query: "formalized mathematics", limit: 2 });
  assert.equal(retrievalResults[0].provider, "arxiv");
  assert.equal(retrievalResults[0].source_kind, "arxiv");
  assert.equal(retrievalResults[0].prompt_injection_scan.status, "not_applicable_for_stub");
  assert.equal(retrievalResults[0].proof_authority, "none");
  assert.equal(retrievalResults[0].can_promote_claim, false);

  const sympy = getExternalWheelAdapter(registry, "computation", "sympy");
  const computation = await sympy.run({ task: "normalize", expression: "n + 0 - n" });
  assert.equal(computation.provider, "sympy");
  assert.equal(computation.exactness, "exact_symbolic");
  assert.equal(computation.proof_authority, "none");
  assert.equal(computation.can_promote_claim, false);

  const leanDojo = getExternalWheelAdapter(registry, "proof_search_backend", "leandojo");
  const candidatePack = await leanDojo.propose({ locked_statement_hash: "a".repeat(64), prompt: "try exact?" });
  assert.equal(candidatePack.provider, "leandojo");
  assert.equal(candidatePack.generated_at, "2026-05-30T00:00:00.000Z");
  assert.equal(candidatePack.proof_authority, "none");
  assert.deepEqual(candidatePack.lean_run_manifest_ids, []);
  assert.equal(candidatePack.can_promote_claim, false);

  const localLeanRepo = getExternalWheelAdapter(registry, "external_lean_repo", "local_lean_repo");
  const repoCandidate = await localLeanRepo.inspect({ ref: "./vendor/mathlib", requested_imports: ["Mathlib"] });
  assert.equal(repoCandidate.provider, "local_lean_repo");
  assert.equal(repoCandidate.inspected_at, "2026-05-30T00:00:00.000Z");
  assert.equal(repoCandidate.state, "planning_reference");
  assert.equal(repoCandidate.proof_authority, "none");
  assert.equal(repoCandidate.can_promote_claim, false);

  const { project } = initProject({ name: "External Wheel Project", root_path: projectRoot });
  const claim = registerClaim(projectRoot, {
    project_id: project.project_id,
    statement: "Every search hint is a proof.",
    assumptions: [],
    domain: "adapter-boundary",
    actor: "goal3-task11-test"
  });
  const promotion = promoteClaim(projectRoot, {
    project_id: project.project_id,
    claim_id: claim.id,
    target_status: "formally_checked",
    evidence_ids: [],
    artifact_ids: [],
    actor: "goal3-task11-test",
    external_vetoes: theoremResults[0].promotion_vetoes
  });
  assert.equal(promotion.gate.ok, false);
  assert.equal(promotion.claim.status, "draft");
  assert.equal(promotion.gate.vetoes.includes("external_adapter_result_has_no_proof_authority"), true);
} finally {
  rmSync(projectRoot, { recursive: true, force: true });
}

console.log("Goal 3 Task 11 external wheel registry tests passed.");
