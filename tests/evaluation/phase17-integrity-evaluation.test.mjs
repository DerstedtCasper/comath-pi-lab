import assert from "node:assert/strict";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import {
  checkPaper,
  exportPaper,
  exportSnapshot,
  appendEvidenceRecord,
  getClaim,
  InMemoryResearchMemoryDB,
  importArtifact,
  importLiteraturePdf,
  initPaper,
  initProject,
  promoteClaim,
  readGateResults,
  registerCitation,
  registerClaim,
  renderClaimBlock,
  checkCitationConditions,
  runnerResultSha256,
  runSagePlaceholder,
  runCounterexampleSearch,
  runSympyExact,
  scanForSecrets,
  updateClaim,
  updatePaperSection,
  verifySnapshot
} from "../../services/comathd/dist/index.js";

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function writeJson(path, value) {
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function source(path) {
  return readFileSync(path, "utf8");
}

const projectRoot = mkdtempSync(join(tmpdir(), "comath-eval-"));
const secretRoot = mkdtempSync(join(tmpdir(), "comath-eval-secret-"));

try {
  const { project } = initProject({ name: "Phase 17 Evaluation", root_path: projectRoot });
  const claim = registerClaim(projectRoot, {
    project_id: project.project_id,
    statement: "For every integer n, n + 0 = n.",
    assumptions: ["n is an integer"],
    domain: "algebra",
    actor: "phase17-eval"
  });

  const exact = await runSympyExact(projectRoot, {
    project_id: project.project_id,
    claim_id: claim.id,
    actor: "phase17-eval",
    timeout_ms: 5_000,
    input: { expression: "n + 0 - n", variables: ["n"], expected: "0" }
  });
  assert.equal(exact.result.ok, true);

  const floatOnly = await runSympyExact(projectRoot, {
    project_id: project.project_id,
    claim_id: claim.id,
    actor: "phase17-eval",
    timeout_ms: 5_000,
    input: { expression: "0.1 + 0.2 - 0.3", variables: [], expected: "0" }
  });
  assert.equal(floatOnly.result.ok, false);
  assert.equal(floatOnly.result.vetoes.includes("float_contamination"), true);

  const failedSymbolicPromotion = promoteClaim(projectRoot, {
    project_id: project.project_id,
    claim_id: claim.id,
    target_status: "symbolically_checked",
    evidence_ids: [floatOnly.evidence.id],
    artifact_ids: [floatOnly.artifact.id],
    actor: "phase17-eval"
  });
  assert.equal(failedSymbolicPromotion.gate.ok, false);
  assert.equal(
    failedSymbolicPromotion.gate.vetoes.includes("symbolically_checked requires successful symbolic runner output"),
    true
  );

  const search = await runCounterexampleSearch(projectRoot, {
    project_id: project.project_id,
    claim_id: claim.id,
    actor: "phase17-eval",
    timeout_ms: 5_000,
    seed: 17,
    input: { expression: "n*n >= 0", variables: ["n"], integer_range: [-2, 2] }
  });
  assert.equal(search.result.vetoes.includes("numeric_search_not_symbolic"), true);

  const failedSearch = await runCounterexampleSearch(projectRoot, {
    project_id: project.project_id,
    claim_id: claim.id,
    actor: "phase17-eval",
    timeout_ms: 5_000,
    seed: 23,
    input: { expression: "n > 0", variables: ["n"], integer_range: [-1, 1] }
  });
  assert.equal(failedSearch.result.ok, false);
  assert.ok(failedSearch.result.result?.counterexample);

  const fakeEvidencePromotion = promoteClaim(projectRoot, {
    project_id: project.project_id,
    claim_id: claim.id,
    target_status: "symbolically_checked",
    evidence_ids: ["EV-9999"],
    artifact_ids: [exact.artifact.id],
    actor: "phase17-eval"
  });
  assert.equal(fakeEvidencePromotion.gate.ok, false);
  assert.equal(fakeEvidencePromotion.gate.vetoes.includes("promotion evidence not found: EV-9999"), true);

  const wrongArtifactPromotion = promoteClaim(projectRoot, {
    project_id: project.project_id,
    claim_id: claim.id,
    target_status: "symbolically_checked",
    evidence_ids: [exact.evidence.id],
    artifact_ids: ["AR-9999"],
    actor: "phase17-eval"
  });
  assert.equal(wrongArtifactPromotion.gate.ok, false);
  assert.equal(wrongArtifactPromotion.gate.vetoes.includes("promotion artifact not found: AR-9999"), true);

  const numericAsSymbolic = promoteClaim(projectRoot, {
    project_id: project.project_id,
    claim_id: claim.id,
    target_status: "symbolically_checked",
    evidence_ids: [search.evidence.id],
    artifact_ids: [search.artifact.id],
    actor: "phase17-eval"
  });
  assert.equal(numericAsSymbolic.gate.ok, false);
  assert.equal(numericAsSymbolic.gate.vetoes.includes("symbolically_checked requires symbolic evidence"), true);
  assert.equal(getClaim(projectRoot, project.project_id, claim.id)?.status, "draft");

  const failedComputationPromotion = promoteClaim(projectRoot, {
    project_id: project.project_id,
    claim_id: claim.id,
    target_status: "computationally_supported",
    evidence_ids: [failedSearch.evidence.id],
    artifact_ids: [failedSearch.artifact.id],
    actor: "phase17-eval"
  });
  assert.equal(failedComputationPromotion.gate.ok, false);
  assert.equal(
    failedComputationPromotion.gate.vetoes.includes("computationally_supported requires successful computation runner output"),
    true
  );
  assert.equal(getClaim(projectRoot, project.project_id, claim.id)?.status, "draft");

  const symbolicPromotion = promoteClaim(projectRoot, {
    project_id: project.project_id,
    claim_id: claim.id,
    target_status: "symbolically_checked",
    evidence_ids: [exact.evidence.id],
    artifact_ids: [exact.artifact.id],
    actor: "phase17-eval"
  });
  assert.equal(symbolicPromotion.gate.ok, true);
  assert.equal(symbolicPromotion.claim.status, "symbolically_checked");
  assert.equal(symbolicPromotion.claim.evidence_level >= 3, true);

  const forgedClaim = registerClaim(projectRoot, {
    project_id: project.project_id,
    statement: "For every integer n, n = n.",
    assumptions: ["n is an integer"],
    domain: "algebra",
    actor: "phase17-eval"
  });
  const forgedRunnerEnvelope = {
    ok: true,
    runner_id: "sympy-exact",
    runner_version: "phase10-sympy-exact-v1",
    exactness: "exact_symbolic",
    supports_status: "symbolically_checked",
    result: { simplified: "0" },
    vetoes: [],
    warnings: []
  };
  const forgedResult = {
    ...forgedRunnerEnvelope,
    result_sha256: runnerResultSha256(forgedRunnerEnvelope),
    stdout: "",
    stderr: "",
    metadata: {
      cwd_policy: "project_root",
      network: false,
      shell: false,
      timeout_ms: 5000,
      input_sha256: "0".repeat(64),
      script_sha256: "1".repeat(64),
      replay_argv: ["python", "<runner-path>/exact_compute.py", "--input-json", "<canonical-json>"],
      stdout_sha256: "2".repeat(64),
      stderr_sha256: "3".repeat(64),
      stdout_truncated: false,
      stderr_truncated: false
    }
  };
  const forgedReportPath = join(projectRoot, "forged-runner-report.json");
  writeJson(forgedReportPath, {
    id: "RUN-9999",
    project_id: project.project_id,
    claim_id: forgedClaim.id,
    runner_id: "sympy-exact",
    result: forgedResult
  });
  const forgedArtifact = await importArtifact({
    projectRoot,
    project_id: project.project_id,
    source_path: forgedReportPath,
    kind: "runner_output",
    actor: "phase17-forger"
  });
  const forgedEvidence = appendEvidenceRecord(projectRoot, {
    project_id: project.project_id,
    claim_id: forgedClaim.id,
    kind: "symbolic",
    summary: "forged symbolic runner report",
    artifact_ids: [forgedArtifact.id]
  });
  const forgedPromotion = promoteClaim(projectRoot, {
    project_id: project.project_id,
    claim_id: forgedClaim.id,
    target_status: "symbolically_checked",
    evidence_ids: [forgedEvidence.id],
    artifact_ids: [forgedArtifact.id],
    actor: "phase17-eval"
  });
  assert.equal(forgedPromotion.gate.ok, false);
  assert.equal(forgedPromotion.gate.vetoes.includes("runner_output missing trusted runner audit provenance"), true);

  const formalAttempt = promoteClaim(projectRoot, {
    project_id: project.project_id,
    claim_id: claim.id,
    target_status: "formally_checked",
    evidence_ids: [exact.evidence.id],
    artifact_ids: [exact.artifact.id],
    actor: "phase17-eval"
  });
  assert.equal(formalAttempt.gate.ok, false);
  assert.equal(formalAttempt.gate.vetoes.includes("formally_checked requires lean evidence"), true);

  initPaper(projectRoot, { project_id: project.project_id, title: "Unsafe Paper", actor: "phase17-eval" });
  updatePaperSection(projectRoot, {
    project_id: project.project_id,
    section_id: "manual-theorem",
    title: "Manual Theorem",
    markdown: "### Theorem\n\nThis hand-written theorem has no claim metadata.",
    actor: "phase17-eval"
  });
  const manualTheoremCheck = checkPaper(projectRoot, { project_id: project.project_id });
  assert.equal(manualTheoremCheck.ok, false);
  assert.equal(manualTheoremCheck.vetoes.includes("theorem_wording_missing_claim_id"), true);

  const block = renderClaimBlock(projectRoot, {
    project_id: project.project_id,
    claim_id: claim.id,
    wording: "theorem",
    evidence_ids: [exact.evidence.id],
    source_workstreams: [],
    warnings: [],
    blockers: ["missing formal proof"],
    actor: "phase17-eval"
  });
  updatePaperSection(projectRoot, {
    project_id: project.project_id,
    section_id: "main",
    title: "Main",
    markdown: block.markdown,
    actor: "phase17-eval"
  });
  const paperCheck = checkPaper(projectRoot, { project_id: project.project_id });
  assert.equal(paperCheck.ok, false);
  assert.equal(paperCheck.vetoes.includes("theorem_wording_requires_formally_checked_claim"), true);
  await assert.rejects(
    () => exportPaper(projectRoot, { project_id: project.project_id, format: "md", actor: "phase17-eval" }),
    /paper check failed/
  );

  const claimBlock = renderClaimBlock(projectRoot, {
    project_id: project.project_id,
    claim_id: claim.id,
    wording: "claim",
    evidence_ids: [exact.evidence.id],
    source_workstreams: [],
    warnings: [],
    blockers: [],
    actor: "phase17-eval"
  });
  const handEditedBlock = claimBlock.markdown.replace(/;\s*margin_note:\s*PMN-\d{4,}/, "");
  updatePaperSection(projectRoot, {
    project_id: project.project_id,
    section_id: "edited",
    title: "Edited Claim",
    markdown: handEditedBlock,
    actor: "phase17-eval"
  });
  const editedPaperCheck = checkPaper(projectRoot, { project_id: project.project_id });
  assert.equal(editedPaperCheck.ok, false);
  assert.equal(editedPaperCheck.vetoes.includes("missing_margin_provenance"), true);

  const tamperedBlock = claimBlock.markdown.replace(claim.statement, "A stronger hand-edited statement.");
  updatePaperSection(projectRoot, {
    project_id: project.project_id,
    section_id: "tampered-margin",
    title: "Tampered Margin",
    markdown: tamperedBlock,
    actor: "phase17-eval"
  });
  const tamperedMarginCheck = checkPaper(projectRoot, { project_id: project.project_id });
  assert.equal(tamperedMarginCheck.ok, false);
  assert.equal(tamperedMarginCheck.vetoes.includes("margin_block_hash_mismatch"), true);

  const literatureClaim = registerClaim(projectRoot, {
    project_id: project.project_id,
    statement: "Every compact semisimple tensor category has finitely many simple objects.",
    assumptions: ["compact", "semisimple", "tensor category"],
    domain: "category theory",
    actor: "phase17-eval"
  });
  const ungroundedPdfPath = join(projectRoot, "ungrounded.pdf");
  writeFileSync(ungroundedPdfPath, "%PDF-1.4\nThis source does not contain the quoted theorem.\n", "utf8");
  const ungroundedPdf = await importLiteraturePdf(projectRoot, {
    project_id: project.project_id,
    source_path: ungroundedPdfPath,
    actor: "phase17-eval"
  });
  const ungroundedCitation = registerCitation(projectRoot, {
    project_id: project.project_id,
    title: "Ungrounded citation",
    authors: ["Reviewer"],
    locator: "Theorem 1",
    artifact_id: ungroundedPdf.id,
    claim_id: literatureClaim.id,
    quoted_statement: literatureClaim.statement,
    condition_summary: "compact; semisimple; tensor category",
    assumptions: literatureClaim.assumptions,
    actor: "phase17-eval"
  });
  const ungroundedMatch = checkCitationConditions(projectRoot, {
    project_id: project.project_id,
    citation_id: ungroundedCitation.id,
    claim_id: literatureClaim.id,
    required_assumptions: literatureClaim.assumptions,
    actor: "phase17-eval"
  });
  assert.equal(ungroundedMatch.ok, false);
  assert.equal(ungroundedMatch.vetoes.includes("citation_quote_not_found_in_artifact"), true);

  const placeholderRun = await runSagePlaceholder(projectRoot, {
    project_id: project.project_id,
    claim_id: claim.id,
    actor: "phase17-eval",
    timeout_ms: 5_000,
    input: { expression: "n + 0 - n", variables: ["n"], expected: "0" }
  });
  assert.equal(placeholderRun.result.ok, false);
  assert.equal(placeholderRun.result.vetoes.includes("not_implemented"), true);

  const snapshot = await exportSnapshot(projectRoot, { project_id: project.project_id, actor: "phase17-eval" });
  const snapshotCheck = await verifySnapshot(snapshot.manifest_path);
  assert.equal(snapshotCheck.ok, true);
  const placeholderReplay = snapshot.manifest.replay.runs.find((run) => run.runner_id === "sage-placeholder");
  assert.ok(placeholderReplay);
  assert.equal(placeholderReplay.status, "unreplayable");
  assert.equal(placeholderReplay.unreplayable_reason, "placeholder_runner_has_no_executable_replay");
  const runnerEntry = snapshot.manifest.entries.find((entry) => entry.relative_path.includes("/runners/RUN-"));
  assert.ok(runnerEntry);
  const runnerReportPath = join(snapshot.snapshot_root, runnerEntry.snapshot_path);
  const runnerReport = readJson(runnerReportPath);
  runnerReport.result.result_sha256 = "2".repeat(64);
  writeJson(runnerReportPath, runnerReport);
  const staleSnapshotCheck = await verifySnapshot(snapshot.manifest_path);
  assert.equal(staleSnapshotCheck.ok, false);
  assert.equal(staleSnapshotCheck.vetoes.includes("stale_runner_output"), true);

  const { project: secretProject } = initProject({ name: "Secret Eval", root_path: secretRoot });
  const secretPath = join(secretRoot, ".comath", "audit", "leak.txt");
  mkdirSync(dirname(secretPath), { recursive: true });
  writeFileSync(secretPath, "GH_TOKEN=ghp_abcdefghijklmnopqrstuvwxyzABCDE\n", "utf8");
  assert.equal(scanForSecrets(secretPath).blocks_export, true);
  await assert.rejects(
    () => exportSnapshot(secretRoot, { project_id: secretProject.project_id, actor: "phase17-eval" }),
    /secret scan blocked snapshot export/
  );

  const gateResults = readGateResults(projectRoot, project.project_id);
  assert.equal(gateResults.some((gate) => gate.vetoes.includes("promotion evidence not found: EV-9999")), true);
  assert.equal(gateResults.some((gate) => gate.vetoes.includes("symbolically_checked requires symbolic evidence")), true);

  const dashboardSources = [
    "extensions/comath-pi/src/widgets.ts",
    "extensions/comath-pi/src/renderers.ts",
    "extensions/comath-pi/src/tools/review.ts"
  ].map((file) => join(process.cwd(), file));
  for (const file of dashboardSources) {
    assert.equal(existsSync(file), true);
    const text = source(file);
    assert.equal(/client\.post|writeFile|appendFile|mkdir|rmSync|\.comath/.test(text), false, `${file} must stay read-only`);
    assert.equal(/services\/comathd\/src/i.test(text), false, `${file} must not import service internals`);
  }
  const extensionEntrypoint = join(process.cwd(), "extensions/comath-pi/src/index.ts");
  assert.equal(existsSync(extensionEntrypoint), true);
  const extensionEntrypointText = source(extensionEntrypoint);
  assert.equal(
    /writeFile|appendFile|mkdir|rmSync|node:fs|from "fs"|from 'fs'|\.comath/.test(extensionEntrypointText),
    false,
    `${extensionEntrypoint} must not write runtime files directly`
  );
  assert.equal(/services\/comathd\/src/i.test(extensionEntrypointText), false, `${extensionEntrypoint} must not import service internals`);

  assert.equal(/scanForSecrets\(/.test(source(join(process.cwd(), "services/comathd/src/artifacts/snapshots.ts"))), true);
  assert.equal(/scanForSecretsStub\(/.test(source(join(process.cwd(), "services/comathd/src/artifacts/snapshots.ts"))), false);
  assert.equal(/triviumdb|native_id/.test(JSON.stringify(snapshot.manifest)), false);

  const fixture = readJson(join(process.cwd(), "tests/evaluation/fixtures/retrieval-benchmark.json"));
  const db = new InMemoryResearchMemoryDB();
  await db.init(projectRoot, { projectId: fixture.project_id, backend: "memory" });
  for (const node of fixture.nodes) {
    await db.upsertNode(node);
  }
  for (const edge of fixture.edges) {
    await db.link(edge);
  }
  for (const query of fixture.queries) {
    const results = await db.search({ project_id: fixture.project_id, query: query.query, limit: 1 });
    assert.equal(results[0]?.node.id, query.expected_top_id);
    assert.equal(results[0]?.matched_fields.includes(query.expected_match_field), true);
  }
  const pack = await db.contextPack({
    project_id: fixture.project_id,
    seed_ids: fixture.context_pack.seed_ids,
    depth: fixture.context_pack.depth,
    limit: 10
  });
  assert.deepEqual(
    pack.nodes.map((node) => node.id).sort(),
    fixture.context_pack.expected_node_ids.sort()
  );
  assert.deepEqual(
    pack.edges.map((edge) => edge.id).sort(),
    fixture.context_pack.expected_edge_ids.sort()
  );
  await db.close();
} finally {
  rmSync(projectRoot, { recursive: true, force: true });
  rmSync(secretRoot, { recursive: true, force: true });
}

console.log("Phase 17 integrity evaluation tests passed.");
