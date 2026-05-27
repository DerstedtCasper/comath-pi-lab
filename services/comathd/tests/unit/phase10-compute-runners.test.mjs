import assert from "node:assert/strict";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  getClaim,
  initProject,
  listRunnerSpecs,
  promoteClaim,
  readAuditEvents,
  readEvidenceRecords,
  registerClaim,
  runCounterexampleSearch,
  runSagePlaceholder,
  runSatPlaceholder,
  runSympyExact
} from "../../dist/index.js";

const projectRoot = mkdtempSync(join(tmpdir(), "comath-compute-"));

try {
  const { project } = initProject({ name: "Compute Runner Project", root_path: projectRoot });
  const claim = registerClaim(projectRoot, {
    project_id: project.project_id,
    statement: "For every integer n, n + 0 = n.",
    assumptions: ["n is an integer"],
    domain: "algebra",
    actor: "phase10-test"
  });

  const specs = listRunnerSpecs();
  assert.equal(specs.some((spec) => spec.runner_id === "sympy-exact"), true);
  assert.equal(specs.some((spec) => spec.runner_id === "counterexample-search"), true);
  assert.equal(specs.some((spec) => spec.runner_id === "sage-placeholder"), true);
  assert.equal(specs.some((spec) => spec.runner_id === "sat-placeholder"), true);
  assert.equal(
    specs.every((spec) => spec.shell === false && spec.network === false && !spec.command),
    true,
    "runner specs must not expose a user-command execution surface"
  );

  const exact = await runSympyExact(projectRoot, {
    project_id: project.project_id,
    claim_id: claim.id,
    actor: "phase10-test",
    timeout_ms: 5_000,
    input: {
      expression: "n + 0 - n",
      variables: ["n"],
      expected: "0"
    }
  });
  assert.equal(exact.result.ok, true);
  assert.equal(exact.result.runner_id, "sympy-exact");
  assert.equal(exact.result.exactness, "exact_symbolic");
  assert.equal(exact.result.vetoes.length, 0);
  assert.equal(exact.result.metadata.cwd_policy, "project_root");
  assert.equal(exact.result.metadata.network, false);
  assert.equal(exact.result.metadata.shell, false);
  assert.equal(typeof exact.result.metadata.input_sha256, "string");
  assert.equal(exact.result.metadata.input_sha256.length, 64);
  assert.equal(exact.artifact.kind, "runner_output");
  assert.equal(existsSync(join(projectRoot, exact.artifact.path)), true);
  assert.equal(exact.evidence.kind, "symbolic");
  assert.deepEqual(exact.evidence.artifact_ids, [exact.artifact.id]);

  const injection = await runSympyExact(projectRoot, {
    project_id: project.project_id,
    claim_id: claim.id,
    actor: "phase10-test",
    timeout_ms: 5_000,
    input: {
      expression: "n; __import__('os').system('echo unsafe')",
      variables: ["n"],
      expected: "0"
    }
  });
  assert.equal(injection.result.ok, false);
  assert.equal(injection.result.vetoes.includes("unsafe_expression_syntax"), true);
  assert.equal(injection.result.stdout.length, 0);
  assert.equal(injection.result.stderr.length, 0);

  const floatContaminated = await runSympyExact(projectRoot, {
    project_id: project.project_id,
    claim_id: claim.id,
    actor: "phase10-test",
    timeout_ms: 5_000,
    input: {
      expression: "0.1 + 0.2 - 0.3",
      variables: [],
      expected: "0"
    }
  });
  assert.equal(floatContaminated.result.ok, false);
  assert.equal(floatContaminated.result.exactness, "inexact");
  assert.equal(floatContaminated.result.vetoes.includes("float_contamination"), true);

  const searchA = await runCounterexampleSearch(projectRoot, {
    project_id: project.project_id,
    claim_id: claim.id,
    actor: "phase10-test",
    timeout_ms: 5_000,
    seed: 1234,
    input: {
      expression: "n*n >= 0",
      variables: ["n"],
      integer_range: [-2, 2]
    }
  });
  const searchB = await runCounterexampleSearch(projectRoot, {
    project_id: project.project_id,
    claim_id: claim.id,
    actor: "phase10-test",
    timeout_ms: 5_000,
    seed: 1234,
    input: {
      expression: "n*n >= 0",
      variables: ["n"],
      integer_range: [-2, 2]
    }
  });
  assert.equal(searchA.result.ok, true);
  assert.equal(searchA.result.exactness, "numeric_search");
  assert.equal(searchA.result.supports_status, "computationally_supported");
  assert.equal(searchA.result.vetoes.includes("numeric_search_not_symbolic"), true);
  assert.equal(searchA.result.metadata.seed, 1234);
  assert.equal(searchA.result.result_sha256, searchB.result.result_sha256);

  const missingSeed = await runCounterexampleSearch(projectRoot, {
    project_id: project.project_id,
    claim_id: claim.id,
    actor: "phase10-test",
    timeout_ms: 5_000,
    input: {
      expression: "n > 0",
      variables: ["n"],
      integer_range: [-1, 1]
    }
  });
  assert.equal(missingSeed.result.ok, false);
  assert.equal(missingSeed.result.vetoes.includes("missing_seed"), true);

  const sage = await runSagePlaceholder(projectRoot, {
    project_id: project.project_id,
    claim_id: claim.id,
    actor: "phase10-test",
    timeout_ms: 5_000,
    input: { task: "check elliptic curve rank" }
  });
  assert.equal(sage.result.ok, false);
  assert.equal(sage.result.vetoes.includes("not_implemented"), true);

  const sat = await runSatPlaceholder(projectRoot, {
    project_id: project.project_id,
    claim_id: claim.id,
    actor: "phase10-test",
    timeout_ms: 5_000,
    input: { cnf: [[1], [-1]] }
  });
  assert.equal(sat.result.ok, false);
  assert.equal(sat.result.vetoes.includes("not_implemented"), true);

  await assert.rejects(
    () =>
      runSympyExact(projectRoot, {
        project_id: project.project_id,
        claim_id: "C-9999",
        actor: "phase10-test",
        timeout_ms: 5_000,
        input: { expression: "1 + 1", variables: [], expected: "2" }
      }),
    /claim not found/
  );

  const evidence = readEvidenceRecords(projectRoot, project.project_id);
  assert.equal(evidence.length >= 7, true);
  assert.equal(evidence.some((record) => record.kind === "symbolic"), true);
  assert.equal(evidence.some((record) => record.kind === "computation"), true);

  const auditEvents = readAuditEvents(projectRoot);
  assert.equal(auditEvents.some((event) => event.event_type === "runner.completed"), true);
  assert.equal(auditEvents.some((event) => event.event_type === "runner.failed"), true);

  const promotion = promoteClaim(projectRoot, {
    project_id: project.project_id,
    claim_id: claim.id,
    target_status: "symbolically_checked",
    evidence_ids: [exact.evidence.id],
    artifact_ids: [exact.artifact.id],
    actor: "phase10-test",
    external_vetoes: searchA.result.vetoes,
    external_warnings: searchA.result.warnings
  });
  assert.equal(promotion.gate.ok, false);
  assert.equal(promotion.gate.vetoes.includes("numeric_search_not_symbolic"), true);
  assert.equal(getClaim(projectRoot, project.project_id, claim.id)?.status, "draft");

  const runnerReport = JSON.parse(readFileSync(exact.report_path, "utf8"));
  assert.equal(runnerReport.result.runner_id, "sympy-exact");
  assert.equal(runnerReport.result.metadata.replay_argv.includes("--input-json"), true);
  assert.equal(typeof runnerReport.result.metadata.replay_input_json, "string");
  assert.equal(runnerReport.result.metadata.input_sha256, runnerReport.result.metadata.replay_input_sha256);
  assert.equal(runnerReport.result.metadata.replay_input_json.includes('"runner_id":"sympy-exact"'), true);
} finally {
  rmSync(projectRoot, { recursive: true, force: true });
}

console.log("Phase 10 compute runner tests passed.");
