import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import {
  buildBraidDomainGraphPatch,
  buildBraidRunnerInput,
  getBraidBenchmarkClaims,
  getBraidComputationProtocols,
  getBraidDomainPack,
  getBraidLeanFormalizationMap,
  getBraidLiteraturePrompts,
  listBraidOntologyEntries
} from "../../dist/index.js";

const requiredOntology = [
  "braid_group",
  "braid_word",
  "braid_representation",
  "r_matrix",
  "yang_baxter_equation",
  "hecke_algebra",
  "tensor_category",
  "dhr_sector",
  "parastatistics_sector",
  "anyon_model"
];

const pack = getBraidDomainPack();
assert.equal(pack.id, "braid-statistics");
assert.equal(pack.version, "phase14-v1");
assert.equal(pack.status_authority, false);
assert.equal(pack.evidence_producer_only, true);
assert.equal(pack.required_risk_flags.includes("notation_drift"), true);
assert.equal(pack.required_risk_flags.includes("physical_interpretation_overclaim"), true);
assert.equal(pack.boundaries.some((item) => item.includes("does not promote claims")), true);

const ontology = listBraidOntologyEntries();
for (const id of requiredOntology) {
  const entry = ontology.find((item) => item.id === id);
  assert.ok(entry, `${id} ontology entry exists`);
  assert.equal(entry.assumption_fields.length > 0, true, `${id} has assumption fields`);
  assert.equal(entry.risk_flags.length > 0, true, `${id} has risk flags`);
}

const protocols = getBraidComputationProtocols();
const protocolIds = protocols.map((protocol) => protocol.id);
assert.deepEqual(protocolIds, [
  "braid_relation_exact",
  "yang_baxter_matrix_exact",
  "hecke_relation_exact",
  "fusion_rule_consistency",
  "small_counterexample_search"
]);
assert.equal(protocols.every((protocol) => protocol.evidence_kind !== "lean"), true);
assert.equal(protocols.every((protocol) => protocol.may_promote_claim === false), true);
assert.equal(protocols.find((protocol) => protocol.id === "yang_baxter_matrix_exact")?.requires_exact_arithmetic, true);

const runnerInput = buildBraidRunnerInput({
  protocol_id: "braid_relation_exact",
  strands: 3,
  word_left: ["s1", "s2", "s1"],
  word_right: ["s2", "s1", "s2"]
});
assert.equal(runnerInput.runner_id, "sympy-exact");
assert.equal(runnerInput.input.domain_protocol, "braid_relation_exact");
assert.equal(runnerInput.input.exact_arithmetic_required, true);

const benchmarks = getBraidBenchmarkClaims();
assert.equal(benchmarks.length >= 4, true);
assert.equal(
  benchmarks.every((claim) => claim.assumptions.length > 0 && claim.blockers.length > 0 && claim.target_status === "conjectural"),
  true
);
assert.equal(
  benchmarks.some((claim) => claim.risk_flags.includes("semisimplicity_assumption_missing")),
  true
);

const leanMap = getBraidLeanFormalizationMap();
assert.equal(leanMap.some((item) => item.lean_namespace === "Mathlib.GroupTheory.Braid"), true);
assert.equal(leanMap.every((item) => item.status !== "kernel_checked"), true);

const literaturePrompts = getBraidLiteraturePrompts();
assert.equal(literaturePrompts.some((prompt) => prompt.topic.includes("DHR")), true);
assert.equal(literaturePrompts.every((prompt) => prompt.must_not_use.includes("LLM memory")), true);

const patch = buildBraidDomainGraphPatch({
  project_id: "PRJ-0001",
  source_workstream_id: "WS-0001",
  created_by: "domain-braid-agent"
});
assert.equal(patch.patch_id, "GP-1401");
assert.equal(patch.state, "proposed");
assert.equal(patch.apply_preconditions.includes("review_domain_assumptions"), true);
assert.equal(patch.new_nodes.some((node) => node.id === "DOM-1401" && node.type === "DomainObject"), true);
assert.equal(patch.new_nodes.some((node) => node.type === "Claim"), true);
assert.equal(
  patch.new_nodes
    .filter((node) => node.type === "Claim")
    .every((node) => node.payload.status === "conjectural" && node.payload.gate_result_id === undefined),
  true
);
assert.equal(patch.new_edges.every((edge) => edge.label !== "proved_by"), true);

const scriptPath = join(process.cwd(), "..", "..", "python", "braid", "check_braid.py");
assert.equal(existsSync(scriptPath), true);
const braidRelation = JSON.parse(
  execFileSync("python", [
    scriptPath,
    "--input-json",
    JSON.stringify({
      mode: "braid_relation",
      strands: 3,
      word_left: ["s1", "s2", "s1"],
      word_right: ["s2", "s1", "s2"]
    })
  ], { encoding: "utf8" })
);
assert.equal(braidRelation.ok, true);
assert.equal(braidRelation.exactness, "exact_combinatorial");
assert.equal(braidRelation.supports_status, "computationally_supported");
assert.equal(braidRelation.vetoes.includes("not_symbolic_proof"), true);

const hecke = JSON.parse(
  execFileSync("python", [
    scriptPath,
    "--input-json",
    JSON.stringify({
      mode: "hecke_relation",
      q: "2",
      generator_square: "1*T + 2"
    })
  ], { encoding: "utf8" })
);
assert.equal(hecke.ok, true);
assert.equal(hecke.result.relation, "(T - q)(T + 1) = 0");

const unsafe = JSON.parse(
  execFileSync("python", [
    scriptPath,
    "--input-json",
    JSON.stringify({
      mode: "yang_baxter_matrix",
      matrix: [[0.5]],
      dimensions: [1, 1, 1]
    })
  ], { encoding: "utf8" })
);
assert.equal(unsafe.ok, false);
assert.equal(unsafe.vetoes.includes("float_contamination"), true);

function collectFiles(dir) {
  const files = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...collectFiles(path));
    } else if (entry.isFile() && /\.(ts|js|mjs|py|md)$/.test(entry.name) && statSync(path).size > 0) {
      files.push(path);
    }
  }
  return files;
}

for (const file of collectFiles(join(process.cwd(), "src", "domain", "braid-statistics"))) {
  const content = readFileSync(file, "utf8");
  assert.equal(/promoteClaim|claim\/promote|gate_result_id\s*:/i.test(content), false, `${file} bypasses claim gate`);
  assert.equal(/formally_checked|symbolically_checked|human_accepted/.test(content), false, `${file} overclaims status`);
}

for (const file of [
  join(process.cwd(), "..", "..", "skills", "braid-statistics", "SKILL.md"),
  join(process.cwd(), "..", "..", "prompts", "domain-braid-statistics.md")
]) {
  const content = readFileSync(file, "utf8");
  assert.equal(content.includes("physical_interpretation_overclaim"), true, `${file} includes risk flags`);
  assert.equal(content.includes("cannot promote claims"), true, `${file} preserves gate boundary`);
}

console.log("Phase 14 braid statistics domain pack tests passed.");
