import assert from "node:assert/strict";
import { existsSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  appendEvidenceRecord,
  certifyClaimForFormalProof,
  certifyFormalProofAudit,
  certifyFormalProofDependencies,
  certifyFormalizationFromProofRun,
  containsLeanPlaceholders,
  detectLeanToolchain,
  formalProofRunSchema,
  getClaim,
  importArtifact,
  initProject,
  isLean4VersionOutput,
  promoteClaim,
  readFormalProofRuns,
  readProvenanceEvents,
  registerClaim,
  runLeanProofCheck,
  updateClaim
} from "../../dist/index.js";
import * as comathd from "../../dist/index.js";

const projectRoot = mkdtempSync(join(tmpdir(), "comath-formal-proof-"));
const timestamp = "2026-05-26T00:00:00.000Z";

try {
  const { project } = initProject({ name: "Formal Proof Project", root_path: projectRoot });
  const claim = registerClaim(projectRoot, {
    project_id: project.project_id,
    statement: "For every natural number n, n = n.",
    assumptions: ["n : Nat"],
    domain: "Lean4 arithmetic",
    actor: "phase18-test"
  });

  const validRun = {
    id: "FPR-0001",
    project_id: project.project_id,
    claim_id: claim.id,
    system: "lean4",
    status: "kernel_checked",
    proof_artifact_id: "AR-0001",
    log_artifact_id: "AR-0002",
    theorem_name: "self_eq_nat",
    statement_hash: claim.statement_hash,
    toolchain_version: "Lean 4.29.1",
    dependency_hash: "mathlib-test-hash",
    contains_sorry: false,
    contains_admit: false,
    kernel_checked: true,
    exit_code: 0,
    vetoes: [],
    warnings: [],
    created_at: timestamp
  };
  assert.equal(formalProofRunSchema.parse(validRun).status, "kernel_checked");
  assert.throws(
    () => formalProofRunSchema.parse({ ...validRun, contains_sorry: true }),
    /kernel_checked formal proof runs cannot contain sorry/
  );
  assert.throws(
    () => formalProofRunSchema.parse({ ...validRun, proof_artifact_id: undefined }),
    /kernel_checked formal proof runs require proof_artifact_id/
  );
  assert.throws(() => formalProofRunSchema.parse({ ...validRun, status: "accepted_by_reviewer" }), /Invalid/);
  assert.equal(
    Object.prototype.hasOwnProperty.call(comathd, "appendFormalProofRun"),
    false,
    "raw formal proof run append must not be exported as a public authority"
  );

  const proofPath = join(projectRoot, "SelfEq.lean");
  const logPath = join(projectRoot, "SelfEq.lean.log");
  writeFileSync(proofPath, "theorem self_eq_nat (n : Nat) : n = n := rfl\n", "utf8");
  writeFileSync(logPath, "Lean kernel accepted theorem self_eq_nat\n", "utf8");
  const untrustedProofArtifact = await importArtifact({
    projectRoot,
    project_id: project.project_id,
    source_path: proofPath,
    kind: "code",
    actor: "phase18-test"
  });
  const untrustedLogArtifact = await importArtifact({
    projectRoot,
    project_id: project.project_id,
    source_path: logPath,
    kind: "runner_output",
    actor: "phase18-test"
  });
  const evidence = appendEvidenceRecord(projectRoot, {
    project_id: project.project_id,
    claim_id: claim.id,
    kind: "lean",
    summary: "Synthetic Lean kernel check fixture for phase18.",
    artifact_ids: [untrustedProofArtifact.id, untrustedLogArtifact.id]
  });

  updateClaim(projectRoot, {
    project_id: project.project_id,
    claim_id: claim.id,
    actor: "phase18-test",
    patch: {
      status: "blocked"
    }
  });
  const manuallyPreparedClaim = getClaim(projectRoot, project.project_id, claim.id);
  assert.equal(manuallyPreparedClaim.status, "blocked");

  const withoutFormalRun = promoteClaim(projectRoot, {
    project_id: project.project_id,
    claim_id: claim.id,
    target_status: "formally_checked",
    evidence_ids: [evidence.id],
    artifact_ids: [untrustedProofArtifact.id, untrustedLogArtifact.id],
    actor: "phase18-test"
  });
  assert.equal(withoutFormalRun.gate.ok, false);
  assert.equal(
    withoutFormalRun.gate.vetoes.includes("formally_checked requires kernel_checked formal proof run"),
    true
  );

  const validStoredRun = await runLeanProofCheck(projectRoot, {
    project_id: project.project_id,
    claim_id: claim.id,
    proof_path: proofPath,
    theorem_name: "self_eq_nat",
    dependency_hash: "mathlib-test-hash",
    actor: "phase18-test"
  });
  assert.equal(validStoredRun.id, "FPR-0001");
  assert.equal(validStoredRun.status, "kernel_checked");
  assert.notEqual(validStoredRun.proof_artifact_id, untrustedProofArtifact.id);
  assert.notEqual(validStoredRun.log_artifact_id, untrustedLogArtifact.id);
  assert.equal(readFormalProofRuns(projectRoot, project.project_id).length, 1);
  assert.equal(existsSync(join(projectRoot, ".comath", "evidence", "formal-proof-runs.jsonl")), true);
  const formalArtifactIds = [validStoredRun.proof_artifact_id, validStoredRun.log_artifact_id];
  const formalEvidence = appendEvidenceRecord(projectRoot, {
    project_id: project.project_id,
    claim_id: claim.id,
    kind: "lean",
    summary: "Lean kernel check fixture recorded by runLeanProofCheck.",
    artifact_ids: formalArtifactIds
  });

  const formalPromotion = promoteClaim(projectRoot, {
    project_id: project.project_id,
    claim_id: claim.id,
    target_status: "formally_checked",
    evidence_ids: [formalEvidence.id],
    artifact_ids: formalArtifactIds,
    actor: "phase18-test"
  });
  assert.equal(formalPromotion.gate.vetoes.includes("formally_checked requires kernel_checked formal proof run"), false);
  assert.equal(
    formalPromotion.gate.vetoes.includes("formally_checked requires kernel_checked formalization"),
    true
  );

  const formalized = certifyFormalizationFromProofRun(projectRoot, {
    project_id: project.project_id,
    claim_id: claim.id,
    artifact_ids: formalArtifactIds,
    actor: "phase18-test"
  });
  assert.equal(formalized.formalization_status, "kernel_checked");
  assert.equal(formalized.dependency_closure_status, "unchecked");
  assert.equal(formalized.audit_state, "not_audited");
  const afterFormalizationOnly = promoteClaim(projectRoot, {
    project_id: project.project_id,
    claim_id: claim.id,
    target_status: "formally_checked",
    evidence_ids: [formalEvidence.id],
    artifact_ids: formalArtifactIds,
    actor: "phase18-test"
  });
  assert.equal(afterFormalizationOnly.gate.ok, false);
  assert.equal(afterFormalizationOnly.gate.vetoes.includes("formally_checked requires all_dependencies_present"), true);
  assert.equal(afterFormalizationOnly.gate.vetoes.includes("formally_checked requires audit_passed"), true);

  const dependencyCertified = certifyFormalProofDependencies(projectRoot, {
    project_id: project.project_id,
    claim_id: claim.id,
    dependency_hash: "mathlib-test-hash",
    actor: "phase18-test"
  });
  assert.equal(dependencyCertified.dependency_closure_status, "all_dependencies_present");
  const afterDependencyOnly = promoteClaim(projectRoot, {
    project_id: project.project_id,
    claim_id: claim.id,
    target_status: "formally_checked",
    evidence_ids: [formalEvidence.id],
    artifact_ids: formalArtifactIds,
    actor: "phase18-test"
  });
  assert.equal(afterDependencyOnly.gate.ok, false);
  assert.equal(afterDependencyOnly.gate.vetoes.includes("formally_checked requires audit_passed"), true);

  const auditPath = join(projectRoot, "SelfEq.audit.json");
  writeFileSync(
    auditPath,
    JSON.stringify({
      formal_proof_run_id: validStoredRun.id,
      statement_hash: claim.statement_hash,
      dependency_hash: "mathlib-test-hash",
      audit_passed: true
    }),
    "utf8"
  );
  const auditArtifact = await importArtifact({
    projectRoot,
    project_id: project.project_id,
    source_path: auditPath,
    kind: "other",
    actor: "phase18-test"
  });
  const auditEvidence = appendEvidenceRecord(projectRoot, {
    project_id: project.project_id,
    claim_id: claim.id,
    kind: "audit",
    summary: "Independent formal proof audit fixture.",
    artifact_ids: [auditArtifact.id]
  });

  assert.throws(
    () =>
      certifyFormalProofAudit(projectRoot, {
        project_id: project.project_id,
        claim_id: claim.id,
        audit_artifact_ids: [validStoredRun.log_artifact_id],
        actor: "phase18-test"
      }),
    /audit evidence/
  );

  const audited = certifyFormalProofAudit(projectRoot, {
    project_id: project.project_id,
    claim_id: claim.id,
    audit_artifact_ids: [auditArtifact.id],
    actor: "phase18-test"
  });
  assert.equal(audited.audit_state, "audit_passed");

  const certifiedArtifactIds = [...formalArtifactIds, auditArtifact.id];
  const certifiedEvidenceIds = [formalEvidence.id, auditEvidence.id];
  const certified = certifyClaimForFormalProof(projectRoot, {
    project_id: project.project_id,
    claim_id: claim.id,
    artifact_ids: certifiedArtifactIds,
    actor: "phase18-test"
  });
  assert.equal(certified.formalization_status, "kernel_checked");
  assert.equal(certified.dependency_closure_status, "all_dependencies_present");
  assert.equal(certified.audit_state, "audit_passed");
  const certifiedPromotion = promoteClaim(projectRoot, {
    project_id: project.project_id,
    claim_id: claim.id,
    target_status: "formally_checked",
    evidence_ids: certifiedEvidenceIds,
    artifact_ids: certifiedArtifactIds,
    actor: "phase18-test"
  });
  assert.equal(certifiedPromotion.gate.ok, true);
  assert.equal(certifiedPromotion.claim.status, "formally_checked");

  const staleFormalAuthority = updateClaim(projectRoot, {
    project_id: project.project_id,
    claim_id: claim.id,
    actor: "phase18-test",
    patch: {
      statement: "For every natural number n, n = n + 0."
    }
  });
  assert.notEqual(staleFormalAuthority.statement_hash, claim.statement_hash);
  assert.equal(staleFormalAuthority.status, "conjectural");
  assert.equal(staleFormalAuthority.evidence_level, 0);
  assert.equal(staleFormalAuthority.gate_result_id, undefined);
  assert.equal(staleFormalAuthority.formalization_status, "none");
  assert.equal(staleFormalAuthority.dependency_closure_status, "unchecked");
  assert.equal(staleFormalAuthority.audit_state, "not_audited");
  const stalePromotion = promoteClaim(projectRoot, {
    project_id: project.project_id,
    claim_id: claim.id,
    target_status: "formally_checked",
    evidence_ids: certifiedEvidenceIds,
    artifact_ids: certifiedArtifactIds,
    actor: "phase18-test"
  });
  assert.equal(stalePromotion.gate.ok, false);
  assert.equal(stalePromotion.gate.vetoes.includes("formally_checked requires kernel_checked formal proof run"), true);
  assert.equal(stalePromotion.gate.vetoes.includes("formally_checked requires formalization certification"), true);

  assert.equal(containsLeanPlaceholders("theorem t : True := by trivial"), false);
  assert.equal(containsLeanPlaceholders("theorem t : True := by\n  sorry"), true);
  assert.equal(isLean4VersionOutput("Lean (version 4.27.0, x86_64-w64-windows-gnu, commit abc, Release)"), true);
  assert.equal(isLean4VersionOutput("fake lean-compatible checker version 4.0"), false);

  const fakeExecutableClaim = registerClaim(projectRoot, {
    project_id: project.project_id,
    statement: "A caller-supplied executable cannot become Lean kernel authority.",
    assumptions: [],
    domain: "Lean4",
    actor: "phase18-test"
  });
  const fakeExecutableProofPath = join(projectRoot, "FakeExecutable.lean");
  const fakeExecutablePath = join(projectRoot, "fake-lean.cmd");
  writeFileSync(fakeExecutableProofPath, "theorem fake_executable_test : True := by\n  trivial\n", "utf8");
  writeFileSync(fakeExecutablePath, "@echo off\r\necho Lean (version 4.99.0, fake)\r\nexit /b 0\r\n", "utf8");
  const fakeExecutableRun = await runLeanProofCheck(projectRoot, {
    project_id: project.project_id,
    claim_id: fakeExecutableClaim.id,
    proof_path: fakeExecutableProofPath,
    theorem_name: "fake_executable_test",
    actor: "phase18-test",
    lean_executable: fakeExecutablePath
  });
  assert.equal(fakeExecutableRun.status, "toolchain_missing");
  assert.equal(fakeExecutableRun.kernel_checked, false);
  assert.equal(fakeExecutableRun.vetoes.includes("custom lean executable not allowed"), true);

  const skeletonClaim = registerClaim(projectRoot, {
    project_id: project.project_id,
    statement: "A placeholder Lean proof must not certify a claim.",
    assumptions: [],
    domain: "Lean4",
    actor: "phase18-test"
  });
  const skeletonProofPath = join(projectRoot, "Skeleton.lean");
  writeFileSync(skeletonProofPath, "theorem skeleton_test : True := by\n  sorry\n", "utf8");
  const skeletonRun = await runLeanProofCheck(projectRoot, {
    project_id: project.project_id,
    claim_id: skeletonClaim.id,
    proof_path: skeletonProofPath,
    theorem_name: "skeleton_test",
    actor: "phase18-test"
  });
  assert.equal(skeletonRun.status, "skeleton_only");
  assert.equal(skeletonRun.kernel_checked, false);
  assert.equal(skeletonRun.vetoes.includes("lean proof contains sorry/admit"), true);
  assert.throws(
    () =>
      certifyClaimForFormalProof(projectRoot, {
        project_id: project.project_id,
        claim_id: skeletonClaim.id,
        artifact_ids: [skeletonRun.proof_artifact_id, skeletonRun.log_artifact_id],
        actor: "phase18-test"
      }),
    /trusted formal proof run/
  );

  const leanToolchain = await detectLeanToolchain();
  assert.equal(typeof leanToolchain.available, "boolean");
  if (leanToolchain.available) {
    const runtimeClaim = registerClaim(projectRoot, {
      project_id: project.project_id,
      statement: "Lean accepts reflexivity for True.",
      assumptions: [],
      domain: "Lean4",
      actor: "phase18-test"
    });
    const runtimeProofPath = join(projectRoot, "RuntimeAccepted.lean");
    writeFileSync(runtimeProofPath, "theorem runtime_accepted : True := by\n  trivial\n", "utf8");
    const runtimeRun = await runLeanProofCheck(projectRoot, {
      project_id: project.project_id,
      claim_id: runtimeClaim.id,
      proof_path: runtimeProofPath,
      theorem_name: "runtime_accepted",
      dependency_hash: "runtime-dependency-hash",
      actor: "phase18-test"
    });
    assert.equal(runtimeRun.status, "kernel_checked");
    assert.equal(runtimeRun.kernel_checked, true);
    const runtimeEvidence = appendEvidenceRecord(projectRoot, {
      project_id: project.project_id,
      claim_id: runtimeClaim.id,
      kind: "lean",
      summary: "Lean accepted runtime proof fixture.",
      artifact_ids: [runtimeRun.proof_artifact_id, runtimeRun.log_artifact_id]
    });
    assert.throws(
      () =>
        certifyClaimForFormalProof(projectRoot, {
          project_id: project.project_id,
          claim_id: runtimeClaim.id,
          artifact_ids: [runtimeRun.proof_artifact_id, runtimeRun.log_artifact_id],
          actor: "phase18-test"
        }),
      /formalization certification/
    );
    certifyFormalizationFromProofRun(projectRoot, {
      project_id: project.project_id,
      claim_id: runtimeClaim.id,
      artifact_ids: [runtimeRun.proof_artifact_id, runtimeRun.log_artifact_id],
      actor: "phase18-test"
    });
    certifyFormalProofDependencies(projectRoot, {
      project_id: project.project_id,
      claim_id: runtimeClaim.id,
      dependency_hash: "runtime-dependency-hash",
      actor: "phase18-test"
    });
    const runtimeAuditPath = join(projectRoot, "RuntimeAccepted.audit.json");
    writeFileSync(
      runtimeAuditPath,
      JSON.stringify({
        formal_proof_run_id: runtimeRun.id,
        statement_hash: runtimeClaim.statement_hash,
        dependency_hash: "runtime-dependency-hash",
        audit_passed: true
      }),
      "utf8"
    );
    const runtimeAuditArtifact = await importArtifact({
      projectRoot,
      project_id: project.project_id,
      source_path: runtimeAuditPath,
      kind: "other",
      actor: "phase18-test"
    });
    const runtimeAuditEvidence = appendEvidenceRecord(projectRoot, {
      project_id: project.project_id,
      claim_id: runtimeClaim.id,
      kind: "audit",
      summary: "Independent runtime Lean proof audit fixture.",
      artifact_ids: [runtimeAuditArtifact.id]
    });
    certifyFormalProofAudit(projectRoot, {
      project_id: project.project_id,
      claim_id: runtimeClaim.id,
      audit_artifact_ids: [runtimeAuditArtifact.id],
      actor: "phase18-test"
    });
    certifyClaimForFormalProof(projectRoot, {
      project_id: project.project_id,
      claim_id: runtimeClaim.id,
      artifact_ids: [runtimeRun.proof_artifact_id, runtimeRun.log_artifact_id, runtimeAuditArtifact.id],
      actor: "phase18-test"
    });
    const runtimePromotion = promoteClaim(projectRoot, {
      project_id: project.project_id,
      claim_id: runtimeClaim.id,
      target_status: "formally_checked",
      evidence_ids: [runtimeEvidence.id, runtimeAuditEvidence.id],
      artifact_ids: [runtimeRun.proof_artifact_id, runtimeRun.log_artifact_id, runtimeAuditArtifact.id],
      actor: "phase18-test"
    });
    assert.equal(runtimePromotion.gate.ok, true);
    assert.equal(runtimePromotion.claim.status, "formally_checked");
  }

  const provenance = readProvenanceEvents(projectRoot, project.project_id);
  assert.equal(provenance.some((event) => event.event_type === "formal_proof.run_recorded"), true);
  assert.equal(provenance.some((event) => event.event_type === "formal_proof.formalization_certified"), true);
  assert.equal(provenance.some((event) => event.event_type === "formal_proof.dependencies_certified"), true);
  assert.equal(provenance.some((event) => event.event_type === "formal_proof.audit_certified"), true);
  assert.equal(provenance.some((event) => event.event_type === "formal_proof.claim_certified"), true);
} finally {
  rmSync(projectRoot, { recursive: true, force: true });
}

console.log("Phase 18 formal proof authority tests passed.");
