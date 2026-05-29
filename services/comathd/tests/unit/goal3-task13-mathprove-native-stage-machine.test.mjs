import assert from "node:assert/strict";
import {
  advanceMathProveNativeStage,
  assertMathProveEvidenceHasNoProofAuthority,
  createMathProveNativeBlockerCertificate,
  createMathProveNativeStageRun,
  createMathProveNativeWorkflowState,
  getMathProveNativeStageDefinition,
  listMathProveNativeStages,
  validateMathProveNativeResumeState
} from "../../dist/index.js";

const expectedStages = [
  "input_intake",
  "problem_lock",
  "knowledge_pack",
  "formal_spec_and_notation_gate",
  "blueprint_and_skeleton_gate",
  "line_map_gate",
  "lemma_sprint",
  "refutation_gate",
  "integration_refactor_gate",
  "final_lean_authority_replay",
  "proof_memory_update"
];

const stages = listMathProveNativeStages();
assert.deepEqual(stages.map((stage) => stage.stage), expectedStages);
assert.deepEqual(stages.map((stage) => stage.index), expectedStages.map((_, index) => index));

for (const stage of stages) {
  assert.equal(stage.schema_version, "comath.mathprove_native_stage.v1");
  assert.equal(stage.proof_authority, "none");
  assert.equal(stage.can_promote_claim, false);
  assert.equal(stage.required_input_schema.startsWith("comath.mathprove_native."), true);
  assert.equal(stage.required_output_schema.startsWith("comath.mathprove_native."), true);
  assert.equal(stage.hard_vetoes.length > 0, true, `${stage.stage} must declare hard vetoes`);
  assert.equal(stage.required_artifacts.length > 0, true, `${stage.stage} must declare required artifacts`);
  assert.equal(stage.blocker_certificate_schema, "comath.mathprove_native.blocker_certificate.v1");
  assert.equal(stage.resume_state_schema, "comath.mathprove_native.resume_state.v1");
}

assert.deepEqual(getMathProveNativeStageDefinition("lemma_sprint").required_artifacts, [
  "AgentCandidatePack[]",
  "LeanRunManifest[]",
  "FailureMemoryEvent[]"
]);

const run = createMathProveNativeStageRun({
  campaign_id: "CAM-0001",
  claim_id: "C-0001",
  stage: "knowledge_pack",
  locked_statement_hash: "a".repeat(64),
  input_artifacts: ["ProblemLock", "InitialAssumptionLedger"],
  output_artifacts: ["LiteratureEvidence.jsonl", "TheoremSearchEvidence.jsonl"],
  status: "blocked",
  missing_artifacts: ["ContextLakeSnapshot"],
  now: () => "2026-05-30T00:00:00.000Z"
});
assert.equal(run.stage, "knowledge_pack");
assert.equal(run.proof_authority, "none");
assert.equal(run.can_promote_claim, false);
assert.deepEqual(run.hard_vetoes, ["missing_required_stage_artifact"]);
assert.equal(run.resume_state?.resume_to_stage, "knowledge_pack");
assert.deepEqual(run.resume_state?.required_artifacts, ["ContextLakeSnapshot"]);

const blocker = createMathProveNativeBlockerCertificate({
  campaign_id: "CAM-0001",
  claim_id: "C-0001",
  stage: "knowledge_pack",
  locked_statement_hash: "a".repeat(64),
  missing_artifacts: ["ContextLakeSnapshot"],
  reason: "missing knowledge snapshot",
  now: () => "2026-05-30T00:00:01.000Z"
});
assert.equal(blocker.schema_version, "comath.mathprove_native.blocker_certificate.v1");
assert.equal(blocker.stage, "knowledge_pack");
assert.equal(blocker.proof_authority, "none");
assert.equal(blocker.can_promote_claim, false);
assert.equal(blocker.status, "blocked");
assert.deepEqual(blocker.required_artifacts, ["ContextLakeSnapshot"]);
assert.equal(blocker.resume_state.resume_to_stage, "knowledge_pack");
assert.deepEqual(blocker.hard_vetoes, ["missing_required_stage_artifact"]);

const initialState = createMathProveNativeWorkflowState({
  campaign_id: "CAM-0001",
  claim_id: "C-0001",
  locked_statement_hash: "a".repeat(64),
  now: () => "2026-05-30T00:00:00.000Z"
});
assert.equal(initialState.current_stage, "input_intake");
assert.equal(initialState.proof_authority, "none");
assert.equal(initialState.can_promote_claim, false);

const afterInput = advanceMathProveNativeStage(initialState, {
  to_stage: "problem_lock",
  output_artifacts: ["RawUserGoal", "AttachmentManifest", "WorkspaceReferenceManifest", "Campaign"],
  now: () => "2026-05-30T00:00:02.000Z"
});
assert.equal(afterInput.current_stage, "problem_lock");
assert.equal(afterInput.runs.length, 1);
assert.equal(afterInput.runs[0].status, "completed");

const skipped = advanceMathProveNativeStage(initialState, {
  to_stage: "knowledge_pack",
  output_artifacts: ["ProblemLock"],
  now: () => "2026-05-30T00:00:03.000Z"
});
assert.equal(skipped.current_stage, "input_intake");
assert.equal(skipped.status, "blocked");
assert.equal(skipped.blockers.at(-1).hard_vetoes.includes("illegal_stage_transition"), true);
assert.equal(skipped.blockers.at(-1).proof_authority, "none");

assert.equal(validateMathProveNativeResumeState(blocker.resume_state, { current_stage: "knowledge_pack" }).ok, true);
assert.equal(validateMathProveNativeResumeState(blocker.resume_state, { current_stage: "lemma_sprint" }).ok, false);
assert.equal(
  validateMathProveNativeResumeState(blocker.resume_state, { current_stage: "lemma_sprint" }).hard_vetoes.includes(
    "resume_stage_mismatch"
  ),
  true
);

const finalAuditEvidence = assertMathProveEvidenceHasNoProofAuthority({
  source: "MathProve-Skill",
  mode: "final_audit",
  gate_result: "passed",
  ok: true,
  target_status: "formally_checked",
  artifacts: ["solution.md"]
});
assert.equal(finalAuditEvidence.proof_authority, "none");
assert.equal(finalAuditEvidence.can_promote_claim, false);
assert.equal(finalAuditEvidence.normalized_status, "evidence_only");
assert.equal(finalAuditEvidence.hard_vetoes.includes("mathprove_output_has_no_proof_authority"), true);
assert.equal(finalAuditEvidence.hard_vetoes.includes("missing_lean_clean_replay_authority"), true);

console.log("Goal 3 Task 13 MathProve-native stage-machine tests passed.");
