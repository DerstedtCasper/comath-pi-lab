import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { z } from "zod";
import { ComathError } from "../errors.js";
import { canonicalJson } from "../verification/runner-contracts.js";
import { requireApprovedFormalScope } from "../proof-kernel/campaign/formal-spec-store.js";
import { buildApprovedLockElaborationSource, buildStructuredLeanAuditSource } from "../proof-kernel/lean/structured-audit.js";
import type { GaAgentReplayProject } from "../proof-kernel/ensemble/ga-agent-stage-runner.js";
import { getAcquiredProjectRuntime, type ProjectRuntime } from "./project-runtime.js";
import { assertProjectReadable, existsCommittedFile, readCommittedFile, resolveProjectCommitPath, withProjectCommit, writeCommittedFile } from "./project-commit.js";
import { formalCandidateSubmissionSchema } from "./formal-candidate-contracts.js";
import type { FormalCandidateSubmissionReceipt } from "./formal-candidate-intake.js";

const hash = (value: string | Buffer) => createHash("sha256").update(value).digest("hex");
const inputSchema = z.strictObject({ submission_command_id: z.string().min(1).max(160), lean_toolchain: z.string().regex(/^leanprover\/lean4:v\d+\.\d+\.\d+$/) });
function fail(code: string): never { throw new ComathError(code, { code, statusCode: 409 }); }
function leanName(parts: string[]): string {
  if (!parts.length || parts.some(part => !part || /[«»\p{Cc}]/u.test(part))) fail("FORMAL_PROJECT_LEAN_NAME_INVALID");
  return parts.map(part => `«${part}»`).join(".");
}
export type FormalCandidateProjectReceipt = { schema_version: "comath.formal_candidate_project.v1"; operation_id: string;
  candidate_id: string; obligation_id: string; claim_id: string; campaign_id: string; generation: number; stage_attempt: number;
  source_operation_id: string; source_files: { relative_path: string; sha256: string }[]; scope_package_sha256: string;
  project: GaAgentReplayProject; input_files: string[]; descriptor_path: string; approved_lock_elaboration_file: string; proof_authority: "none" };

/** Materializes a clean source project from service-accepted bytes, never by reconstructing a proof or ledger. */
export function createFormalCandidateProjectService(runtime: ProjectRuntime, options: {
  readSubmissionReceipt: (commandId: string) => FormalCandidateSubmissionReceipt | undefined;
}) {
  const store = runtime.store;
  function materializeAcceptedCandidateLeanProject(raw: z.infer<typeof inputSchema>): FormalCandidateProjectReceipt {
    if (getAcquiredProjectRuntime(runtime.root) !== runtime || runtime.referenceCount < 1) fail("RESEARCH_OWNER_REQUIRED");
    const input = inputSchema.parse(raw), submission = options.readSubmissionReceipt(input.submission_command_id);
    if (!submission || submission.commit_state !== "committed") fail("FORMAL_PROJECT_SUBMISSION_UNCOMMITTED");
    assertProjectReadable(runtime.root, undefined, submission.campaign_id);
    const ready = store.get("SELECT * FROM events WHERE type='FormalCandidateReadyForVerification' AND task_id=? AND generation=? AND json_extract(payload_json,'$.operation_id')=? AND json_extract(payload_json,'$.candidate_id')=?",
      submission.task_id, submission.generation, submission.operation_id, submission.candidate_id);
    if (!ready) fail("FORMAL_PROJECT_VERIFICATION_NOT_READY");
    const readyValue = JSON.parse(String(ready.payload_json));
    if (ready.actor !== "service:formal-submission" || ready.payload_sha256 !== hash(canonicalJson(readyValue))
      || readyValue.active_for_verification !== true || readyValue.proof_authority !== "none"
      || canonicalJson(readyValue.result_ref) !== canonicalJson(submission.result_ref)) fail("FORMAL_PROJECT_READY_PROVENANCE_INVALID");
    const approved = requireApprovedFormalScope(runtime, submission.campaign_id, submission.scope);
    const packageEntry = approved.receipt.packages.find(value => value.obligation_id === submission.obligation_id);
    if (!packageEntry || packageEntry.scope_package_sha256 !== submission.scope_package_sha256) fail("FORMAL_PROJECT_SCOPE_MISMATCH");
    const value = formalCandidateSubmissionSchema.parse(JSON.parse(readCommittedFile(runtime.root, submission.submission_path)));
    // Local integrated dependencies need their own gate-verified producer; a worker reference is not that evidence.
    if (value.requested_dependencies.length) fail("FORMAL_INTEGRATED_MATERIAL_REQUIRED");
    const configuration = hash(canonicalJson({ source_operation_id: submission.operation_id, lean_toolchain: input.lean_toolchain,
      scope_package_sha256: submission.scope_package_sha256, approved_lock_elaboration_version: 1 }));
    // Lake's native Windows trace/build paths can exceed MAX_PATH beneath the full canonical source hierarchy.
    // Keep original candidate sources there; this short derived workspace has a durable full-hash identity mapping.
    const projectId = store.transaction(() => {
      const key = `formal-project-location:${configuration}`, existing = store.get("SELECT * FROM commands WHERE command_id=?", key);
      if (existing) {
        const value = JSON.parse(String(existing.response_json));
        if (existing.principal_id !== "service:formal-project-location" || existing.status !== "committed"
          || existing.request_sha256 !== hash(canonicalJson(value)) || value.configuration !== configuration || !/^LPROJ-\d{4,}$/.test(value.project_id)) fail("FORMAL_PROJECT_LOCATION_INVALID");
        return value.project_id as string;
      }
      const value = { project_id: store.allocateId("LPROJ"), configuration, source_operation_id: submission.operation_id };
      store.run("INSERT INTO commands(command_id,principal_id,request_sha256,response_json,status) VALUES (?,'service:formal-project-location',?,?,'committed')",
        key, hash(canonicalJson(value)), canonicalJson(value));
      return value.project_id;
    });
    const base = `.comath/lean/projects/${projectId}`;
    const moduleNames = value.files.map(file => leanName(file.relative_path.slice(0, -5).split("/")));
    const targetModule = leanName(value.theorem_file.slice(0, -5).split("/"));
    const theorem = leanName(value.theorem_name.split("."));
    const sourceFiles = value.files.map(file => {
      const bytes = readFileSync(resolveProjectCommitPath(runtime.root, `${submission.workspace_path}/source/${file.relative_path}`));
      if (hash(bytes) !== file.artifact.sha256) fail("FORMAL_PROJECT_SOURCE_CHANGED");
      return { relative_path: `source/${file.relative_path}`, sha256: file.artifact.sha256, bytes };
    });
    const lockBytes = readCommittedFile(runtime.root, packageEntry.formal_spec_path), ledgerBytes = readCommittedFile(runtime.root, packageEntry.ledger_path);
    if (hash(lockBytes) !== submission.scope.formal_spec_sha256 || hash(ledgerBytes) !== submission.scope.ledger_sha256) fail("FORMAL_PROJECT_SCOPE_CHANGED");
    const project: GaAgentReplayProject = { lean_root: base, theorem_file_rel: `source/${value.theorem_file}`,
      formal_spec_file: "FormalSpec/formal_spec_lock.json", assumption_ledger_file: "FormalSpec/assumption_ledger.json",
      audit_file_rel: "Audit/CandidateAudit.lean", lakefile: "lakefile.lean", toolchain_file: "lean-toolchain",
      theorem_name: value.theorem_name, theorem_family_id: submission.candidate_id, canonical_proposition: approved.lock.theorem_type_pretty,
      build_targets: ["ComathCandidate"], replay_command: "lake build ComathCandidate", primary_dependency: "Lean4",
      formal_spec: { claim_id: submission.scope.claim_id, theorem_name: approved.lock.theorem_name, namespace: approved.lock.namespace,
        normalized_statement: approved.lock.normalized_nl_statement, locked_statement_hash: approved.lock.statement_hash } };
    const approvedLockElaborationFile = "Audit/ApprovedLockElaboration.lean";
    let approvedLockElaborationSource: string;
    try {
      approvedLockElaborationSource = buildApprovedLockElaborationSource({ namespace: approved.lock.namespace,
        theorem_name: approved.lock.theorem_name, theorem_header: approved.lock.theorem_header, imports: approved.lock.imports_allowed });
    } catch { fail("FORMAL_PROJECT_LOCK_ELABORATION_INVALID"); }
    const generated = [
      { path: project.formal_spec_file, bytes: lockBytes }, { path: project.assumption_ledger_file, bytes: ledgerBytes },
      { path: project.toolchain_file, bytes: input.lean_toolchain + "\n" },
      { path: project.lakefile, bytes: `import Lake\nopen Lake DSL\npackage ComathCandidate where\nlean_lib ComathCandidate where\n  srcDir := "source"\n  roots := #[${moduleNames.map(name => "`" + name).join(", ")}]\n` },
      { path: project.audit_file_rel, bytes: buildStructuredLeanAuditSource({ target_module: targetModule, target: theorem }) },
      { path: approvedLockElaborationFile, bytes: approvedLockElaborationSource }
    ];
    const operationId = `formal-project:${configuration}`, descriptorPath = `${base}/candidate_replay_project_descriptor.json`;
    const receipt: FormalCandidateProjectReceipt = { schema_version: "comath.formal_candidate_project.v1", operation_id: operationId,
      candidate_id: submission.candidate_id, obligation_id: submission.obligation_id, claim_id: submission.scope.claim_id,
      campaign_id: submission.campaign_id, generation: submission.generation, stage_attempt: submission.stage_attempt,
      source_operation_id: submission.operation_id, source_files: sourceFiles.map(({ relative_path, sha256 }) => ({ relative_path, sha256 })),
      scope_package_sha256: submission.scope_package_sha256, project, descriptor_path: descriptorPath,
      input_files: [...sourceFiles.map(file => `${base}/${file.relative_path}`), ...generated.map(file => `${base}/${file.path}`)],
      approved_lock_elaboration_file: approvedLockElaborationFile, proof_authority: "none" };
    const existing = store.get("SELECT phase,plan_json FROM trust_commits WHERE operation_id=?", operationId);
    if (existing) {
      if (existing.phase !== "committed") fail("COMMIT_PENDING");
      const plan = JSON.parse(String(existing.plan_json));
      if (canonicalJson(plan.response) !== canonicalJson(receipt)) fail("FORMAL_PROJECT_RECEIPT_CHANGED");
      for (const target of plan.targets) {
        const bytes = readFileSync(resolveProjectCommitPath(runtime.root, target.relative_path));
        if (hash(bytes) !== target.after_sha256) fail("FORMAL_PROJECT_MATERIAL_CHANGED");
      }
      return receipt;
    }
    return withProjectCommit(runtime.root, { operation_id: operationId, campaign_id: submission.campaign_id,
      request: { source_operation_id: submission.operation_id, configuration } }, () => {
      for (const file of [...sourceFiles.map(file => ({ path: file.relative_path, bytes: file.bytes })), ...generated]) {
        const path = `${base}/${file.path}`;
        if (existsCommittedFile(runtime.root, path)) fail("FORMAL_PROJECT_MATERIAL_EXISTS");
        writeCommittedFile(runtime.root, path, file.bytes);
      }
      if (existsCommittedFile(runtime.root, descriptorPath)) fail("FORMAL_PROJECT_MATERIAL_EXISTS");
      writeCommittedFile(runtime.root, descriptorPath, canonicalJson({ schema_version: "comath.candidate_replay_project_descriptor.v1",
        campaign_id: receipt.campaign_id, claim_id: receipt.claim_id, obligation_id: receipt.obligation_id, candidate_id: receipt.candidate_id,
        artifact_role: "candidate_replay_project_descriptor", proof_authority: "none", can_promote_claim: false,
        source_operation_id: submission.operation_id, scope_package_sha256: receipt.scope_package_sha256, lean_project: project }));
      return receipt;
    });
  }
  return { materializeAcceptedCandidateLeanProject };
}
