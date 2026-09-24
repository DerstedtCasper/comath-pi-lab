import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { ComathError } from "../../errors.js";
import type { ResearchConfig } from "../../config/config.js";
import type { FinalReplayManifestV3 } from "../../types/schemas.js";
import { canonicalJson } from "../../verification/runner-contracts.js";
import { importArtifact } from "../../artifacts/store.js";
import { appendEvidenceRecord } from "../../evidence/store.js";
import type { FormalCandidateProjectReceipt } from "../../research/formal-candidate-project.js";
import { getAcquiredProjectRuntime, type ProjectRuntime } from "../../research/project-runtime.js";
import type { ResearchOrchestrator } from "../../research/research-orchestrator.js";
import type { createProofToolAttemptService } from "../../research/proof-tool-attempt.js";
import { requireApprovedFormalScope } from "../campaign/formal-spec-store.js";
import { checkDependencyClosureV2, dependencyClosureV2PackagesToExternalRevisions, type DependencyClosureV2Report } from "./dependency-closure.js";
import { runStaticCheatScan } from "./static-cheat-scan.js";
import { checkAxiomProfileV2 } from "./axiom-profile.js";
import { approvedLockDeclaration, compareStructuredLeanAuditToLock, parseApprovedLockElaborationOutput, parseStructuredLeanAuditOutput, type StructuredLeanAudit } from "./structured-audit.js";
import { checkStatementEquivalence } from "./statement-equivalence.js";
import { directElanTool, runLeanToolCommandAsync, type LeanHostAsyncCommandOptions, type LeanHostAsyncCommandResult } from "./lean-host-tools.js";
import { hasLeanRunManifestProvenanceIndexV1, runServiceOwnedLeanCommandV3Async, verifyLeanRunManifestV3Evidence, type AsyncLeanCommandReceipt } from "./lean-run-manifest-v3.js";
import { createFinalReplayManifestV3, finalReplayRegistryEntrySha256V3, hasFinalReplayRegistryProvenanceV3, hasLeanLakeBinaryHashProvenanceV3, stageFinalReplayRegistryEntryV3, stageThirdPartyReplayPackV3, verifyFinalReplayManifestV3 } from "./final-replay-manifest-v3.js";
import { readCommittedFile, resolveProjectCommitPath, withProjectCommit, writeCommittedFile } from "../../research/project-commit.js";

const hash = (value: string | Buffer) => createHash("sha256").update(value).digest("hex");
function fail(code: string): never { throw new ComathError(code, { code, statusCode: 409 }); }

export type AsyncCleanReplayPreparation = {
  schema_version: "comath.async_clean_replay_preparation.v1";
  operation_id: string;
  replay_id: string;
  campaign_id: string;
  claim_id: string;
  candidate_id: string;
  obligation_id: string;
  stage_attempt: number;
  scope_package_sha256: string;
  clean_workspace_path: string;
  preparation_manifest_path: string;
  obligation_receipt_path: string;
  source_project_operation_id: string;
  source_project_sha256: string;
  copied_files: { path: string; sha256: string }[];
  proof_authority: "none";
  can_promote_claim: false;
};
type Config = NonNullable<ResearchConfig["proof_workflow"]>;
type ReplayCommand = { exit_code: number; stdout?: string; stderr?: string; manifest?: AsyncLeanCommandReceipt; proof_authority: "none" };
export type AsyncCleanReplayExecution = { task_id: string; replay_id: string; claim_id: string; obligation_id: string;
  commands: Record<string, ReplayCommand>; executed: boolean; lake_manifest_sha256?: string; environment_receipt_path?: string;
  dependency_closure?: { schema_version: "comath.async_clean_replay_dependency_closure.v1"; result: "pass" | "fail"; report_path: string; hard_vetoes: string[]; proof_authority: "none" };
  static_audit?: { schema_version: "comath.async_clean_replay_static_audit.v1"; result: "pass" | "fail"; report_path: string; hard_vetoes: string[]; proof_authority: "none" };
  axiom_profile?: { schema_version: "comath.async_clean_replay_axiom_profile.v1"; result: "pass" | "fail"; report_path: string; hard_vetoes: string[]; proof_authority: "none" };
  statement_comparison?: { schema_version: "comath.async_clean_replay_statement_comparison.v1"; result: "pass" | "fail"; report_path: string; hard_vetoes: string[]; proof_authority: "none" };
  formal_header_comparison?: { schema_version: "comath.async_clean_replay_formal_header_comparison.v1"; result: "pass" | "fail"; report_path: string; hard_vetoes: string[]; proof_authority: "none" };
  clean_type_comparison?: { schema_version: "comath.async_clean_replay_type_comparison.v1"; result: "pass" | "blocked"; report_path: string; hard_vetoes: string[]; proof_authority: "none" };
  legacy_final_input?: { schema_version: "comath.async_clean_replay_legacy_final_input.v1"; result: "ready" | "blocked"; report_path: string; hard_vetoes: string[];
    proof_authority: "none"; can_promote_claim: false; promotion_requires_gate: true };
  proof_authority: "none";
};
export type AsyncFinalAuthorityReplayExecution = { task_id: string; replay_id: string; claim_id: string; obligation_id: string;
  commands: Record<string, ReplayCommand>; result: "pass" | "blocked"; hard_vetoes: string[]; proof_authority: "none";
  can_promote_claim: false; promotion_requires_gate: true; final_replay_manifest_v3_path?: string;
  final_replay_registry?: { registry_path: string; entry_sha256: string; proof_authority: "none"; can_promote_claim: false; promotion_requires_gate: true };
  third_party_replay_pack?: { pack_path: string; expected_hashes_sha256: string; manifest_sha256: string; proof_authority: "none"; can_promote_claim: false; promotion_requires_gate: true };
  final_authority_packaging?: { packaging_path: string; derived_bindings_path: string; result: "pass" | "blocked";
    artifact_id?: string; artifact_ids?: string[]; evidence_id?: string; proof_authority: "none" | "lean_kernel_clean_replay"; can_promote_claim: false; promotion_requires_gate: true } };

type ScopedEvidenceRef = { path: string; sha256: string };
type ScopedFinalAuthorityScope = { campaign_id: string; claim_id: string; candidate_id: string; obligation_id: string;
  stage_attempt: number; scope_package_sha256: string; replay_id: string };
export type ScopedFinalAuthorityPackagingV1 = {
  schema_version: "comath.scoped_final_authority_packaging.v1";
  result: "pass" | "blocked";
  hard_vetoes: string[];
  scope: ScopedFinalAuthorityScope;
  evidence: {
    final_replay_manifest: ScopedEvidenceRef;
    final_authority_lrun: ScopedEvidenceRef;
    registry: { path: string; entry_sha256: string };
    replay_pack: { pack_path: string; expected_hashes_sha256: string; manifest_sha256: string };
    approved_scope: { formal_spec_sha256: string; ledger_sha256: string; clean_formal_spec: ScopedEvidenceRef; clean_ledger: ScopedEvidenceRef };
    raw: { static_audit: ScopedEvidenceRef; dependency_closure: ScopedEvidenceRef; axiom_profile: ScopedEvidenceRef;
      formal_header_comparison: ScopedEvidenceRef; clean_type_comparison: ScopedEvidenceRef };
  };
  derived_bindings_path: string;
  proof_authority: "none" | "lean_kernel_clean_replay";
  can_promote_claim: false;
  promotion_requires_gate: true;
};
type ScopedFinalAuthorityDerivedBindingsV1 = {
  schema_version: "comath.scoped_final_authority_derived_bindings.v1";
  scope: ScopedFinalAuthorityScope;
  packaging_path: string;
  final_replay_manifest: ScopedEvidenceRef;
  approved_scope: ScopedFinalAuthorityPackagingV1["evidence"]["approved_scope"];
  raw: ScopedFinalAuthorityPackagingV1["evidence"]["raw"];
  proof_authority: "none";
  can_promote_claim: false;
  promotion_requires_gate: true;
};

function committedRef(projectRoot: string, path: string): ScopedEvidenceRef {
  return { path, sha256: hash(readCommittedFile(projectRoot, path)) };
}
function sameJson(left: unknown, right: unknown) { return canonicalJson(left) === canonicalJson(right); }
function readJsonCommitted(projectRoot: string, path: string): unknown { return JSON.parse(readCommittedFile(projectRoot, path)); }
function reportPasses(projectRoot: string, path: string): boolean {
  try { const value = readJsonCommitted(projectRoot, path); return !!value && typeof value === "object" && (value as { result?: unknown }).result === "pass"; }
  catch { return false; }
}
function replayPackMatches(projectRoot: string, manifest: FinalReplayManifestV3, pack: { pack_path: string; expected_hashes_sha256: string; manifest_sha256: string }): boolean {
  try {
    const manifestBytes = readCommittedFile(projectRoot, `${pack.pack_path}/FinalReplayManifest.json`);
    const expectedBytes = readCommittedFile(projectRoot, `${pack.pack_path}/expected_hashes.json`);
    const expected = { clean_workspace_sha256: manifest.clean_workspace_sha256, source_hashes_after: manifest.source_hashes_after,
      artifact_hashes: manifest.artifact_hashes, report_paths: manifest.report_paths, dependency_lock: manifest.dependency_lock,
      lean_run_manifest_paths: manifest.lean_run_manifest_paths, ...(manifest.replay_scope ? { replay_scope: manifest.replay_scope } : {}) };
    if (hash(manifestBytes) !== pack.manifest_sha256 || hash(expectedBytes) !== pack.expected_hashes_sha256
      || !sameJson(JSON.parse(manifestBytes), manifest) || !sameJson(JSON.parse(expectedBytes), expected)) return false;
    return Object.entries(manifest.source_hashes_after).every(([relativePath, expectedHash]) =>
      hash(readCommittedFile(projectRoot, `${pack.pack_path}/clean/${relativePath}`)) === expectedHash.sha256);
  } catch { return false; }
}

/** Validates a PO-scoped packaging receipt without mutating claim state or invoking a promotion gate. */
export function verifyScopedFinalAuthorityPackagingV1(projectRoot: string, candidate: unknown): { ok: boolean; vetoes: string[] } {
  const value = candidate && typeof candidate === "object" ? candidate as Partial<ScopedFinalAuthorityPackagingV1> : {};
  const vetoes: string[] = [];
  if (value.schema_version !== "comath.scoped_final_authority_packaging.v1") vetoes.push("scoped_packaging_schema_invalid");
  const scope = value.scope;
  if (!scope || ![scope.campaign_id, scope.claim_id, scope.candidate_id, scope.obligation_id, scope.scope_package_sha256, scope.replay_id].every(item => typeof item === "string")
    || !Number.isInteger(scope.stage_attempt) || scope.stage_attempt < 1) vetoes.push("scoped_packaging_scope_invalid");
  const evidence = value.evidence;
  const finalPath = evidence?.final_replay_manifest?.path;
  let manifest: FinalReplayManifestV3 | undefined;
  try { if (typeof finalPath !== "string" || !evidence?.final_replay_manifest || committedRef(projectRoot, finalPath).sha256 !== evidence.final_replay_manifest.sha256) throw new Error(); manifest = readJsonCommitted(projectRoot, finalPath) as FinalReplayManifestV3; }
  catch { vetoes.push("scoped_packaging_final_manifest_changed"); }
  if (!manifest || !verifyFinalReplayManifestV3(projectRoot, manifest).ok || !hasFinalReplayRegistryProvenanceV3(projectRoot, manifest) || !hasLeanLakeBinaryHashProvenanceV3(projectRoot, manifest)) vetoes.push("scoped_packaging_final_manifest_unverified");
  if (manifest && (!scope || manifest.campaign_id !== scope.campaign_id || manifest.claim_id !== scope.claim_id || manifest.replay_id !== scope.replay_id
    || !manifest.replay_scope || manifest.replay_scope.candidate_id !== scope.candidate_id || manifest.replay_scope.obligation_id !== scope.obligation_id
    || manifest.replay_scope.stage_attempt !== scope.stage_attempt || manifest.replay_scope.scope_package_sha256 !== scope.scope_package_sha256)) vetoes.push("scoped_packaging_manifest_scope_mismatch");
  const raw = evidence?.raw;
  for (const [key, ref] of Object.entries(raw ?? {})) {
    try { if (!ref || committedRef(projectRoot, ref.path).sha256 !== ref.sha256 || !reportPasses(projectRoot, ref.path)) vetoes.push(`scoped_packaging_${key}_invalid`); }
    catch { vetoes.push(`scoped_packaging_${key}_invalid`); }
  }
  if (!raw || ![raw.static_audit, raw.dependency_closure, raw.axiom_profile, raw.formal_header_comparison, raw.clean_type_comparison].every(Boolean)) vetoes.push("scoped_packaging_raw_evidence_missing");
  if (manifest && raw && (manifest.report_paths.static_audit !== raw.static_audit.path || manifest.report_paths.dependency_closure !== raw.dependency_closure.path
    || manifest.report_paths.axiom_profile !== raw.axiom_profile.path || manifest.report_paths.statement_equivalence !== raw.formal_header_comparison.path)) vetoes.push("scoped_packaging_raw_manifest_mismatch");
  const lrun = evidence?.final_authority_lrun;
  try {
    const receipt = lrun && readJsonCommitted(projectRoot, lrun.path);
    if (!lrun || committedRef(projectRoot, lrun.path).sha256 !== lrun.sha256 || !verifyLeanRunManifestV3Evidence(projectRoot, receipt).ok
      || !hasLeanRunManifestProvenanceIndexV1({ projectRoot, manifest: receipt, manifest_path: lrun.path }) || !manifest?.lean_run_manifest_paths.includes(lrun.path)
      || !(receipt && typeof receipt === "object" && (receipt as Record<string, unknown>).purpose === "final_replay" && (receipt as Record<string, unknown>).proof_authority === "lean_kernel_check")) throw new Error();
  } catch { vetoes.push("scoped_packaging_final_lrun_invalid"); }
  const approved = evidence?.approved_scope;
  try {
    if (!approved || committedRef(projectRoot, approved.clean_formal_spec.path).sha256 !== approved.clean_formal_spec.sha256
      || committedRef(projectRoot, approved.clean_ledger.path).sha256 !== approved.clean_ledger.sha256
      || approved.clean_formal_spec.sha256 !== approved.formal_spec_sha256 || approved.clean_ledger.sha256 !== approved.ledger_sha256) throw new Error();
  } catch { vetoes.push("scoped_packaging_approved_scope_invalid"); }
  if (!evidence?.registry || !manifest || evidence.registry.entry_sha256 !== finalReplayRegistryEntrySha256V3(manifest)
    || evidence.registry.path !== `.comath/evidence/${manifest.claim_id}/lean/final_replay_registry.jsonl`
    || !evidence?.replay_pack || !manifest
    || !replayPackMatches(projectRoot, manifest, evidence.replay_pack)) vetoes.push("scoped_packaging_replay_pack_invalid");
  const derivedPath = value.derived_bindings_path;
  try {
    const derived = typeof derivedPath === "string" ? readJsonCommitted(projectRoot, derivedPath) as ScopedFinalAuthorityDerivedBindingsV1 : undefined;
    if (!derived || derived.schema_version !== "comath.scoped_final_authority_derived_bindings.v1" || !sameJson(derived.scope, scope)
      || derived.packaging_path === derivedPath || !sameJson(derived.final_replay_manifest, evidence?.final_replay_manifest)
      || !sameJson(derived.approved_scope, approved) || !sameJson(derived.raw, raw) || derived.proof_authority !== "none"
      || derived.can_promote_claim !== false || derived.promotion_requires_gate !== true) throw new Error();
  } catch { vetoes.push("scoped_packaging_derived_bindings_invalid"); }
  if (value.result !== "pass" || value.proof_authority !== "lean_kernel_clean_replay" || value.can_promote_claim !== false || value.promotion_requires_gate !== true || !Array.isArray(value.hard_vetoes) || value.hard_vetoes.length !== 0) vetoes.push("scoped_packaging_status_invalid");
  return { ok: vetoes.length === 0, vetoes: Array.from(new Set(vetoes)) };
}

/** Stages the actual FRTASK consumer under the immutable RPLY scope. It deliberately stops before promotion. */
function stageScopedFinalAuthorityPackagingV1(input: {
  runtime: ProjectRuntime;
  operation_id: string;
  project: FormalCandidateProjectReceipt;
  preparation: AsyncCleanReplayPreparation;
  approved: ReturnType<typeof requireApprovedFormalScope>;
  manifest_path: string;
  manifest: FinalReplayManifestV3;
  final_authority_lrun_path: string;
  replay: AsyncCleanReplayExecution;
  registry: { registry_path: string; entry_sha256: string };
  pack: { pack_path: string; expected_hashes_sha256: string; manifest_sha256: string };
}): NonNullable<AsyncFinalAuthorityReplayExecution["final_authority_packaging"]> {
  const { runtime, project, preparation, approved, manifest, replay } = input;
  if (!verifyFinalReplayManifestV3(runtime.root, manifest).ok || !hasFinalReplayRegistryProvenanceV3(runtime.root, manifest)
    || !hasLeanLakeBinaryHashProvenanceV3(runtime.root, manifest) || !replayPackMatches(runtime.root, manifest, input.pack)) fail("ASYNC_FINAL_AUTHORITY_PACKAGING_INPUT_INVALID");
  const scope: ScopedFinalAuthorityScope = { campaign_id: project.campaign_id, claim_id: project.claim_id, candidate_id: project.candidate_id,
    obligation_id: project.obligation_id, stage_attempt: project.stage_attempt, scope_package_sha256: project.scope_package_sha256, replay_id: preparation.replay_id };
  if (!manifest.replay_scope || manifest.replay_id !== scope.replay_id || manifest.campaign_id !== scope.campaign_id || manifest.claim_id !== scope.claim_id
    || !sameJson(manifest.replay_scope, { candidate_id: scope.candidate_id, obligation_id: scope.obligation_id, stage_attempt: scope.stage_attempt, scope_package_sha256: scope.scope_package_sha256 })) fail("ASYNC_FINAL_AUTHORITY_PACKAGING_SCOPE_MISMATCH");
  const rawPaths = { static_audit: replay.static_audit?.report_path, dependency_closure: replay.dependency_closure?.report_path,
    axiom_profile: replay.axiom_profile?.report_path, formal_header_comparison: replay.formal_header_comparison?.report_path,
    clean_type_comparison: replay.clean_type_comparison?.report_path };
  if (Object.values(rawPaths).some(path => typeof path !== "string") || manifest.report_paths.static_audit !== rawPaths.static_audit
    || manifest.report_paths.dependency_closure !== rawPaths.dependency_closure || manifest.report_paths.axiom_profile !== rawPaths.axiom_profile
    || manifest.report_paths.statement_equivalence !== rawPaths.formal_header_comparison) fail("ASYNC_FINAL_AUTHORITY_PACKAGING_RAW_MISMATCH");
  const raw = Object.fromEntries(Object.entries(rawPaths).map(([key, path]) => [key, committedRef(runtime.root, path!)])) as ScopedFinalAuthorityPackagingV1["evidence"]["raw"];
  if (!Object.values(raw).every(ref => reportPasses(runtime.root, ref.path))) fail("ASYNC_FINAL_AUTHORITY_PACKAGING_RAW_INVALID");
  const cleanFormalSpec = committedRef(runtime.root, `${preparation.clean_workspace_path}/FormalSpec/formal_spec_lock.json`);
  const cleanLedger = committedRef(runtime.root, `${preparation.clean_workspace_path}/FormalSpec/assumption_ledger.json`);
  if (cleanFormalSpec.sha256 !== approved.formal_spec_ref.sha256 || cleanLedger.sha256 !== approved.ledger_ref.sha256) fail("ASYNC_FINAL_AUTHORITY_PACKAGING_APPROVED_SCOPE_CHANGED");
  const packaging_path = `.comath/evidence/${project.claim_id}/lean/replays/${preparation.replay_id}/final-authority-packaging.json`;
  const derived_bindings_path = `.comath/evidence/${project.claim_id}/lean/replays/${preparation.replay_id}/final-authority-derived-bindings.json`;
  const evidence: ScopedFinalAuthorityPackagingV1["evidence"] = { final_replay_manifest: committedRef(runtime.root, input.manifest_path),
    final_authority_lrun: committedRef(runtime.root, input.final_authority_lrun_path), registry: { path: input.registry.registry_path, entry_sha256: input.registry.entry_sha256 },
    replay_pack: input.pack, approved_scope: { formal_spec_sha256: approved.formal_spec_ref.sha256, ledger_sha256: approved.ledger_ref.sha256,
      clean_formal_spec: cleanFormalSpec, clean_ledger: cleanLedger }, raw };
  const packaging: ScopedFinalAuthorityPackagingV1 = { schema_version: "comath.scoped_final_authority_packaging.v1", result: "pass", hard_vetoes: [], scope, evidence,
    derived_bindings_path, proof_authority: "lean_kernel_clean_replay", can_promote_claim: false, promotion_requires_gate: true };
  const derived: ScopedFinalAuthorityDerivedBindingsV1 = { schema_version: "comath.scoped_final_authority_derived_bindings.v1", scope, packaging_path,
    final_replay_manifest: evidence.final_replay_manifest, approved_scope: evidence.approved_scope, raw: evidence.raw,
    proof_authority: "none", can_promote_claim: false, promotion_requires_gate: true };
  withProjectCommit(runtime.root, { operation_id: `${input.operation_id}:scoped-packaging`, campaign_id: project.campaign_id,
    request: { scope, manifest_path: input.manifest_path, final_authority_lrun_path: input.final_authority_lrun_path,
      registry: input.registry, pack: input.pack } }, () => {
    writeCommittedFile(runtime.root, derived_bindings_path, canonicalJson(derived));
    writeCommittedFile(runtime.root, packaging_path, canonicalJson(packaging));
    return { final_authority_packaging: { packaging_path, derived_bindings_path } };
  });
  return { packaging_path, derived_bindings_path, result: "pass", proof_authority: "lean_kernel_clean_replay", can_promote_claim: false, promotion_requires_gate: true };
}

/**
 * Copies an already committed candidate project into an append-only clean replay workspace.
 * This is preparation only: final async Lean execution and existing promotion gates remain separate.
 */
export function prepareAsyncCleanReplayWorkspace(input: {
  runtime: ProjectRuntime;
  project: FormalCandidateProjectReceipt;
  obligation_id: string;
  stage_attempt: number;
}): AsyncCleanReplayPreparation {
  const { runtime, project } = input, store = runtime.store;
  if (getAcquiredProjectRuntime(runtime.root) !== runtime || runtime.referenceCount < 1) fail("RESEARCH_OWNER_REQUIRED");
  if (input.obligation_id !== project.obligation_id || input.stage_attempt !== project.stage_attempt) fail("ASYNC_CLEAN_REPLAY_SCOPE_MISMATCH");
  const sourceCommit = store.get("SELECT phase,plan_json FROM trust_commits WHERE operation_id=?", project.operation_id);
  if (!sourceCommit || sourceCommit.phase !== "committed") fail("ASYNC_CLEAN_REPLAY_SOURCE_UNCOMMITTED");
  const sourcePlan = JSON.parse(String(sourceCommit.plan_json));
  if (canonicalJson(sourcePlan.response) !== canonicalJson(project)) fail("ASYNC_CLEAN_REPLAY_SOURCE_RECEIPT_CHANGED");
  const sourceRoot = project.project.lean_root.replace(/\\/g, "/").replace(/\/$/, "");
  const sourceFiles: { path: string; bytes: Buffer; sha256: string }[] = sourcePlan.targets
    .filter((target: { relative_path: string }) => target.relative_path === sourceRoot || target.relative_path.startsWith(`${sourceRoot}/`))
    .map((target: { relative_path: string; after_sha256: string }) => {
      const bytes = readFileSync(resolveProjectCommitPath(runtime.root, target.relative_path));
      if (hash(bytes) !== target.after_sha256) fail("ASYNC_CLEAN_REPLAY_SOURCE_CHANGED");
      const path = relative(sourceRoot, target.relative_path.replace(/\\/g, "/")).replace(/\\/g, "/");
      if (!path || path.startsWith("../")) fail("ASYNC_CLEAN_REPLAY_SOURCE_PATH_INVALID");
      return { path, bytes, sha256: target.after_sha256 };
    });
  if (!sourceFiles.length) fail("ASYNC_CLEAN_REPLAY_SOURCE_EMPTY");
  const configuration = hash(canonicalJson({ source_project_operation_id: project.operation_id, campaign_id: project.campaign_id,
    claim_id: project.claim_id, obligation_id: input.obligation_id, stage_attempt: input.stage_attempt, scope_package_sha256: project.scope_package_sha256 }));
  const locationKey = `async-clean-replay-location:${configuration}`;
  const replay_id = store.transaction(() => {
    const existing = store.get("SELECT principal_id,request_sha256,response_json,status FROM commands WHERE command_id=?", locationKey);
    if (existing) {
      const value = JSON.parse(String(existing.response_json));
      if (existing.principal_id !== "service:async-clean-replay-location" || existing.status !== "committed"
        || existing.request_sha256 !== hash(canonicalJson(value)) || value.configuration !== configuration || !/^RPLY-\d{4,}$/.test(value.replay_id)) fail("ASYNC_CLEAN_REPLAY_LOCATION_INVALID");
      return value.replay_id as string;
    }
    const value = { configuration, replay_id: store.allocateId("RPLY") };
    store.run("INSERT INTO commands(command_id,principal_id,request_sha256,response_json,status) VALUES (?,'service:async-clean-replay-location',?,?,'committed')",
      locationKey, hash(canonicalJson(value)), canonicalJson(value));
    return value.replay_id as string;
  });
  const clean_workspace_path = `.comath/lean/final_replay/${replay_id}/clean`;
  const preparation_manifest_path = `.comath/evidence/${project.claim_id}/lean/replays/${replay_id}/preparation.json`;
  const obligation_receipt_path = `.comath/campaign/${project.campaign_id}/proof/${project.obligation_id}/replays/${replay_id}/clean-replay-preparation.json`;
  const operation_id = `async-clean-replay-prepare:${configuration}`;
  const receipt: AsyncCleanReplayPreparation = {
    schema_version: "comath.async_clean_replay_preparation.v1", operation_id, replay_id, campaign_id: project.campaign_id,
    claim_id: project.claim_id, candidate_id: project.candidate_id, obligation_id: project.obligation_id, stage_attempt: project.stage_attempt,
    scope_package_sha256: project.scope_package_sha256, clean_workspace_path, preparation_manifest_path, obligation_receipt_path,
    source_project_operation_id: project.operation_id, source_project_sha256: hash(canonicalJson(project)),
    copied_files: sourceFiles.map(file => ({ path: file.path, sha256: file.sha256 })), proof_authority: "none", can_promote_claim: false
  };
  const existing = store.get("SELECT phase,plan_json FROM trust_commits WHERE operation_id=?", operation_id);
  if (existing) {
    if (existing.phase !== "committed") fail("COMMIT_PENDING");
    const plan = JSON.parse(String(existing.plan_json));
    if (canonicalJson(plan.response) !== canonicalJson(receipt)) fail("ASYNC_CLEAN_REPLAY_RECEIPT_CHANGED");
    for (const target of plan.targets) if (hash(readFileSync(resolveProjectCommitPath(runtime.root, target.relative_path))) !== target.after_sha256) fail("ASYNC_CLEAN_REPLAY_MATERIAL_CHANGED");
    return receipt;
  }
  return withProjectCommit(runtime.root, { operation_id, campaign_id: project.campaign_id, request: { configuration, source_project_operation_id: project.operation_id } }, () => {
    for (const file of sourceFiles) writeCommittedFile(runtime.root, `${clean_workspace_path}/${file.path}`, file.bytes);
    const manifest = canonicalJson(receipt);
    writeCommittedFile(runtime.root, preparation_manifest_path, manifest);
    writeCommittedFile(runtime.root, obligation_receipt_path, manifest);
    return receipt;
  });
}

/** Executes the prepared copy through a new service-only task; final gates remain a separate consumer. */
export function createAsyncCleanReplayExecutor(app: ResearchOrchestrator, tools: ReturnType<typeof createProofToolAttemptService>, config: Config) {
  const runtime = app.runtime, store = runtime.store;
  function save(operation_id: string, path: string, campaign_id: string, value: unknown) {
    withProjectCommit(runtime.root, { operation_id, campaign_id, request: value }, () => { writeCommittedFile(runtime.root, path, canonicalJson(value)); return { report_path: path }; });
  }
  function saved<T>(operation_id: string): T | undefined {
    const row = store.get("SELECT phase,plan_json FROM trust_commits WHERE operation_id=?", operation_id); if (!row) return undefined;
    if (row.phase !== "committed") fail("COMMIT_PENDING");
    const plan = JSON.parse(String(row.plan_json)), path = plan.response.report_path;
    if (typeof path !== "string") fail("ASYNC_CLEAN_REPLAY_RECEIPT_INVALID");
    const bytes = readFileSync(resolveProjectCommitPath(runtime.root, path));
    const target = plan.targets.find((value: { relative_path: string }) => value.relative_path === path);
    if (!target || hash(bytes) !== target.after_sha256) fail("ASYNC_CLEAN_REPLAY_EVIDENCE_CHANGED");
    return JSON.parse(bytes.toString("utf8")) as T;
  }
  async function execute(input: { project: FormalCandidateProjectReceipt; preparation: AsyncCleanReplayPreparation }, control: { signal: AbortSignal; assertCurrent: () => void }): Promise<AsyncCleanReplayExecution> {
    const { project, preparation } = input; control.assertCurrent();
    if (preparation.campaign_id !== project.campaign_id || preparation.claim_id !== project.claim_id || preparation.candidate_id !== project.candidate_id || preparation.obligation_id !== project.obligation_id
      || preparation.stage_attempt !== project.stage_attempt || preparation.scope_package_sha256 !== project.scope_package_sha256 || preparation.proof_authority !== "none") fail("ASYNC_CLEAN_REPLAY_BINDING_INVALID");
    const preparationCommit = store.get("SELECT phase,plan_json FROM trust_commits WHERE operation_id=?", preparation.operation_id);
    if (!preparationCommit || preparationCommit.phase !== "committed" || canonicalJson(JSON.parse(String(preparationCommit.plan_json)).response) !== canonicalJson(preparation)) fail("ASYNC_CLEAN_REPLAY_PREPARATION_CHANGED");
    const identity = hash(canonicalJson({ project, preparation, config })), operation_id = `async-clean-replay:${identity}`, task_id = `RPTASK-${identity.slice(0, 40)}`;
    const old = saved<AsyncCleanReplayExecution>(operation_id); if (old) return old;
    const submissionRow = store.get("SELECT response_json FROM commands WHERE principal_id='service:formal-submission' AND json_extract(response_json,'$.operation_id')=?", project.source_operation_id);
    if (!submissionRow) fail("ASYNC_CLEAN_REPLAY_SOURCE_RECEIPT_MISSING");
    const submission = JSON.parse(String(submissionRow.response_json)), approved = requireApprovedFormalScope(runtime, project.campaign_id, submission.scope);
    if (approved.obligation_binding.obligation_id !== project.obligation_id) fail("ASYNC_CLEAN_REPLAY_SCOPE_MISMATCH");
    let task = store.getTask(task_id);
    if (!task) {
      const campaign = store.getCampaign(project.campaign_id)!;
      app.applyPatch({ kind: "internal", id: "service:proof-workflow" }, { command_id: `${operation_id}:task`, campaign_id: project.campaign_id, base_revision: campaign.revision,
        create_tasks: [{ task_id, kind: "proof_workflow", depends_on: [], scope: approved.scope, question: `Clean replay ${preparation.replay_id} for ${project.obligation_id}.`,
          acceptance: ["Run service-owned async Lean commands on the immutable clean workspace. No promotion."], model_policy_id: config.candidate.model_policy_id,
          tool_policy_id: config.candidate.tool_policy_id, role_template: config.candidate.role_template, pool: "formalization", priority: config.candidate.priority,
          budget: config.tool_budget, method_family: "service_async_clean_replay", problem_slice: project.obligation_id, coupling_label: preparation.replay_id,
          input_refs: [approved.formal_spec_ref, approved.ledger_ref, submission.result_ref], exclusions: ["Final authority remains with existing integrity and promotion gates."] }],
        add_dependencies: [], replace_dependencies: [], reprioritize: [], cancel_tasks: [], move_pool: [], rationale: "Execute immutable clean replay through service-owned Lean permits." });
      task = store.getTask(task_id)!;
    }
    if (task.kind !== "proof_workflow" || task.method_family !== "service_async_clean_replay" || task.coupling_label !== preparation.replay_id
      || canonicalJson(task.scope) !== canonicalJson(approved.scope) || canonicalJson(task.budget) !== canonicalJson(config.tool_budget)) fail("ASYNC_CLEAN_REPLAY_TASK_CONFLICT");
    const binding = tools.startAttempt({ command_id: `${operation_id}:start`, task_id, expected_generation: 0 });
    const cwd = resolveProjectCommitPath(runtime.root, preparation.clean_workspace_path), allowed = (["lean", "lake"] as const).map(tool => {
      const path = directElanTool(tool, config.lean_toolchain); return path !== tool && existsSync(path) ? path : undefined;
    });
    if (allowed.some(value => !value)) fail("LEAN_ASYNC_BINARY_UNAVAILABLE");
    const result: AsyncCleanReplayExecution = { task_id, replay_id: preparation.replay_id, claim_id: project.claim_id, obligation_id: project.obligation_id, commands: {}, executed: false, proof_authority: "none" };
    let complete = true;
    async function command(name: string, runner: (execution: LeanHostAsyncCommandOptions) => Promise<ReplayCommand>) {
      if (tools.readAttempt(binding.attempt_key)?.state === "settled") fail("ASYNC_CLEAN_REPLAY_ATTEMPT_SETTLED");
      const key = `${operation_id}:${name}`, execution_id = `RPEX-${hash(key).slice(0, 40)}`;
      let admission = tools.beginTool({ attempt_key: binding.attempt_key, execution_id, kind: "lean", command_ref: key });
      while (!admission.granted) { if (admission.completed) fail("ASYNC_CLEAN_REPLAY_COMMAND_INCOMPLETE"); await delay(100, undefined, { signal: control.signal }); control.assertCurrent(); admission = tools.beginTool({ attempt_key: binding.attempt_key, execution_id, kind: "lean", command_ref: key }); }
      const started = performance.now(); let completion: LeanHostAsyncCommandResult["completion"] | undefined;
      try {
        const value = await runner({ runtime, ownership: admission.ownership!, allowed_programs: allowed as string[], signal: control.signal,
          timeout_ms: config.tool_timeout_ms, max_output_bytes: 2 * 1024 * 1024, onCompleted: value => { completion = value; } });
        if (!completion) fail("ASYNC_CLEAN_REPLAY_COMPLETION_MISSING"); result.commands[name] = value; return value;
      } finally {
        if (completion) {
          const released = tools.completeTool({ attempt_key: binding.attempt_key, execution_id, cumulative_wall_ms: Math.ceil(performance.now() - started), termination_confirmed: completion.termination_confirmed, handle: completion.handle });
          if (!released.released) complete = false;
        } else { complete = false; tools.recoverAttempt(binding.attempt_key); }
      }
    }
    let failure: unknown;
    try {
      const versions: Record<string, string> = {};
      for (const tool of ["lean", "lake"] as const) {
        const value = await command(`${tool}-version`, async execution => {
          const raw = await runLeanToolCommandAsync(tool, ["--version"], cwd, config.lean_toolchain, execution);
          return { exit_code: raw.exit_code, stdout: raw.stdout, stderr: raw.stderr, proof_authority: "none" };
        });
        if (value.exit_code !== 0) break;
        versions[tool] = `${value.stdout ?? ""}\n${value.stderr ?? ""}`;
      }
      if (versions.lean && versions.lake) for (const step of [
        { name: "build", purpose: "final_replay" as const, command: ["lake", "build", ...project.project.build_targets] as ["lake", ...string[]] },
        // Build every declared project root first: a root theorem may import already-verified local lemmas.
        { name: "check", purpose: "check" as const, command: ["lake", "env", "lean", project.project.theorem_file_rel] as ["lake", ...string[]] },
        { name: "audit", purpose: "audit" as const, command: ["lake", "env", "lean", project.project.audit_file_rel] as ["lake", ...string[]] },
        { name: "lock-elaboration", purpose: "audit" as const, command: ["lake", "env", "lean", project.approved_lock_elaboration_file] as ["lake", ...string[]] }
      ]) {
        const value = await command(step.name, async execution => {
          const files = preparation.copied_files.map(file => join(cwd, file.path)).filter(existsSync);
          const lakeManifest = join(cwd, "lake-manifest.json"); if (existsSync(lakeManifest)) files.push(lakeManifest);
          const receipt = await runServiceOwnedLeanCommandV3Async({ runtime, command_id: `${operation_id}:${step.name}:manifest`, claim_id: project.claim_id, campaign_id: project.campaign_id,
            candidate_id: project.candidate_id, purpose: step.purpose, command: step.command, cwd, input_files: files, leanVersionOutput: versions.lean, lakeVersionOutput: versions.lake,
            leanToolchain: config.lean_toolchain, network_policy: "disabled", proof_authority: "none", execution });
          return { exit_code: receipt.manifest.exit_code, manifest: receipt, proof_authority: "none" };
        });
        if (value.exit_code !== 0) break;
      }
      result.executed = ["check", "build", "audit", "lock-elaboration"].every(name => result.commands[name]?.exit_code === 0);
      if (result.executed) {
        const lakeManifest = join(cwd, "lake-manifest.json");
        if (!existsSync(lakeManifest)) fail("ASYNC_CLEAN_REPLAY_LAKE_MANIFEST_MISSING");
        const bytes = readFileSync(lakeManifest), lake_manifest_sha256 = hash(bytes);
        const environment_receipt_path = `.comath/evidence/${project.claim_id}/lean/replays/${preparation.replay_id}/environment.json`;
        save(`${operation_id}:environment`, environment_receipt_path, project.campaign_id, { schema_version: "comath.async_clean_replay_environment.v1",
          replay_id: preparation.replay_id, campaign_id: project.campaign_id, claim_id: project.claim_id, obligation_id: project.obligation_id,
          stage_attempt: project.stage_attempt, scope_package_sha256: project.scope_package_sha256, lake_manifest_path: `${preparation.clean_workspace_path}/lake-manifest.json`,
          lake_manifest_sha256, audit_run_id: result.commands.audit?.manifest?.run_id ?? null, proof_authority: "none" });
        result.lake_manifest_sha256 = lake_manifest_sha256; result.environment_receipt_path = environment_receipt_path;
        const closureTemp = `.comath/evidence/${project.claim_id}/lean/replays/${preparation.replay_id}/dependency-closure.tmp.json`;
        const closure = checkDependencyClosureV2({ projectRoot: runtime.root, leanRoot: join(cwd, "source"), toolchainFile: join(cwd, "lean-toolchain"),
          lakefile: join(cwd, "lakefile.lean"), lakeManifestFile: lakeManifest, reportPath: closureTemp,
          allowedImportPrefixes: [...new Set(["Mathlib", "Std", "Init", "Lake", "FormalSpec", "Audit", project.project.theorem_name.split(".")[0]!])], trustedExternalDependencies: ["mathlib"], buildStatus: "checked" });
        const dependency_closure = { schema_version: "comath.async_clean_replay_dependency_closure.v1" as const, result: closure.result,
          report_path: `.comath/evidence/${project.claim_id}/lean/replays/${preparation.replay_id}/dependency-closure.json`, hard_vetoes: closure.hard_vetoes, proof_authority: "none" as const };
        save(`${operation_id}:dependency-closure`, dependency_closure.report_path, project.campaign_id, closure);
        result.dependency_closure = dependency_closure;
        const staticTemp = `.comath/evidence/${project.claim_id}/lean/replays/${preparation.replay_id}/static-audit.tmp.json`;
        const staticReport = runStaticCheatScan({ projectRoot: runtime.root, leanRoot: join(cwd, "source"), reportPath: staticTemp });
        const static_audit = { schema_version: "comath.async_clean_replay_static_audit.v1" as const, result: staticReport.result,
          report_path: `.comath/evidence/${project.claim_id}/lean/replays/${preparation.replay_id}/static-audit.json`, hard_vetoes: staticReport.hard_vetoes, proof_authority: "none" as const };
        save(`${operation_id}:static-audit`, static_audit.report_path, project.campaign_id, staticReport);
        result.static_audit = static_audit;
        const auditManifest = result.commands.audit?.manifest;
        if (!auditManifest) fail("ASYNC_CLEAN_REPLAY_AUDIT_MANIFEST_MISSING");
        const theoremPath = join(cwd, project.project.theorem_file_rel), auditPath = join(cwd, project.project.audit_file_rel);
        const environment_fingerprint = hash(canonicalJson({ toolchain: config.lean_toolchain, lean_version: auditManifest.manifest.lean_version,
          lake_version: auditManifest.manifest.lake_version, lean_binary_sha256: auditManifest.manifest.lean_binary_sha256,
          lake_binary_sha256: auditManifest.manifest.lake_binary_sha256, toolchain_file_sha256: auditManifest.manifest.lean_toolchain_file_sha256,
          source_sha256: hash(readFileSync(theoremPath)), audit_source_sha256: hash(readFileSync(auditPath)), lake_manifest_sha256 }));
        const structured_audit: StructuredLeanAudit = parseStructuredLeanAuditOutput({ stdout: readCommittedFile(runtime.root, auditManifest.manifest.stdout_path),
          expected_target: project.project.theorem_name, source_file: project.project.theorem_file_rel, source_file_sha256: hash(readFileSync(theoremPath)),
          audit_source_sha256: hash(readFileSync(auditPath)), environment_fingerprint, generated_by_run_id: auditManifest.run_id, audit_manifest_path: auditManifest.manifest_path });
        const lockElaborationManifest = result.commands["lock-elaboration"]?.manifest;
        if (!lockElaborationManifest) fail("ASYNC_CLEAN_REPLAY_LOCK_ELABORATION_MANIFEST_MISSING");
        const bridgePath = join(cwd, project.approved_lock_elaboration_file), bridgeSource = readFileSync(bridgePath);
        const lock_elaboration = parseApprovedLockElaborationOutput({
          stdout: readCommittedFile(runtime.root, lockElaborationManifest.manifest.stdout_path), claim_id: project.claim_id,
          campaign_id: project.campaign_id, obligation_id: project.obligation_id, approval_id: approved.scope.approval_id,
          scope_package_sha256: project.scope_package_sha256, statement_hash: approved.scope.statement_hash,
          formal_spec_artifact: approved.formal_spec_ref, expected_target: `${approved.lock.namespace}.${approved.lock.theorem_name}`,
          bridge_source_path: project.approved_lock_elaboration_file, bridge_source_sha256: hash(bridgeSource),
          environment_fingerprint: hash(canonicalJson({ toolchain: config.lean_toolchain, lean_version: lockElaborationManifest.manifest.lean_version,
            lake_version: lockElaborationManifest.manifest.lake_version, lean_binary_sha256: lockElaborationManifest.manifest.lean_binary_sha256,
            lake_binary_sha256: lockElaborationManifest.manifest.lake_binary_sha256, toolchain_file_sha256: lockElaborationManifest.manifest.lean_toolchain_file_sha256,
            formal_spec_sha256: approved.formal_spec_ref.sha256, bridge_source_sha256: hash(bridgeSource), lake_manifest_sha256 })),
          generated_by_run_id: lockElaborationManifest.run_id, manifest_path: lockElaborationManifest.manifest_path
        });
        const typeComparison = compareStructuredLeanAuditToLock({ audit: structured_audit, lock: approved.lock, approved_lock_elaboration: lock_elaboration });
        const clean_type_comparison = { schema_version: "comath.async_clean_replay_type_comparison.v1" as const, result: typeComparison.result,
          report_path: `.comath/evidence/${project.claim_id}/lean/replays/${preparation.replay_id}/clean-type-comparison.json`,
          hard_vetoes: typeComparison.hard_vetoes, proof_authority: "none" as const };
        save(`${operation_id}:clean-type-comparison`, clean_type_comparison.report_path, project.campaign_id, { ...clean_type_comparison,
          structured_audit, lock_elaboration, comparison: typeComparison, audit_run_id: auditManifest.run_id,
          lock_elaboration_run_id: lockElaborationManifest.run_id });
        result.clean_type_comparison = clean_type_comparison;
        const axiomTemp = `.comath/evidence/${project.claim_id}/lean/replays/${preparation.replay_id}/axiom-profile.tmp.json`;
        const profile = checkAxiomProfileV2({ projectRoot: runtime.root, reportPath: axiomTemp, theoremName: project.project.theorem_name,
          theoremTypeHash: structured_audit.theorem_type_elaborated_hash, sourceFile: theoremPath, environmentFingerprint: environment_fingerprint,
          leanRunManifestId: auditManifest.run_id, structuredAudit: structured_audit });
        const axiom_profile = { schema_version: "comath.async_clean_replay_axiom_profile.v1" as const, result: profile.result,
          report_path: `.comath/evidence/${project.claim_id}/lean/replays/${preparation.replay_id}/axiom-profile.json`, hard_vetoes: profile.hard_vetoes, proof_authority: "none" as const };
        save(`${operation_id}:axiom-profile`, axiom_profile.report_path, project.campaign_id, profile);
        result.axiom_profile = axiom_profile;
        const statementTemp = `.comath/evidence/${project.claim_id}/lean/replays/${preparation.replay_id}/statement-comparison.tmp.json`;
        const statement = checkStatementEquivalence({ projectRoot: runtime.root, campaign_id: project.campaign_id, claim_id: project.claim_id, candidate_id: project.candidate_id,
          reportPath: statementTemp, locked_statement_hash: project.project.formal_spec.locked_statement_hash, formal_spec_statement: project.project.canonical_proposition,
          lean_check_output: "", lean_source: readFileSync(theoremPath, "utf8"), theorem_name: project.project.theorem_name });
        const statement_comparison = { schema_version: "comath.async_clean_replay_statement_comparison.v1" as const, result: statement.result,
          report_path: `.comath/evidence/${project.claim_id}/lean/replays/${preparation.replay_id}/statement-comparison.json`, hard_vetoes: statement.hard_vetoes, proof_authority: "none" as const };
        save(`${operation_id}:statement-comparison`, statement_comparison.report_path, project.campaign_id, statement);
        result.statement_comparison = statement_comparison;
        const approvedDeclaration = approvedLockDeclaration({ theorem_name: approved.lock.theorem_name, theorem_header: approved.lock.theorem_header });
        const approvedPrefix = approvedDeclaration.declaration.startsWith(`theorem ${approvedDeclaration.theorem_name}`)
          ? `theorem ${approvedDeclaration.theorem_name}` : `lemma ${approvedDeclaration.theorem_name}`;
        const formalHeaderTemp = `.comath/evidence/${project.claim_id}/lean/replays/${preparation.replay_id}/formal-header-comparison.tmp.json`;
        const formalHeader = checkStatementEquivalence({ projectRoot: runtime.root, campaign_id: project.campaign_id, claim_id: project.claim_id, candidate_id: project.candidate_id,
          reportPath: formalHeaderTemp, locked_statement_hash: project.project.formal_spec.locked_statement_hash,
          formal_spec_statement: `${project.project.theorem_name}${approvedDeclaration.declaration.slice(approvedPrefix.length)}`, lean_check_output: "",
          lean_source: readFileSync(theoremPath, "utf8"), theorem_name: project.project.theorem_name });
        const formal_header_comparison = { schema_version: "comath.async_clean_replay_formal_header_comparison.v1" as const, result: formalHeader.result,
          report_path: `.comath/evidence/${project.claim_id}/lean/replays/${preparation.replay_id}/formal-header-comparison.json`,
          hard_vetoes: formalHeader.hard_vetoes, proof_authority: "none" as const };
        save(`${operation_id}:formal-header-comparison`, formal_header_comparison.report_path, project.campaign_id, { ...formal_header_comparison,
          report: formalHeader, approved_theorem_header: approved.lock.theorem_header, actual_target: project.project.theorem_name,
          structured_type_comparison_path: clean_type_comparison.report_path });
        result.formal_header_comparison = formal_header_comparison;
        const buildManifest = result.commands.build?.manifest;
        if (!buildManifest) fail("ASYNC_CLEAN_REPLAY_BUILD_MANIFEST_MISSING");
        const evidence = (path: string) => ({ path, sha256: hash(readCommittedFile(runtime.root, path)) });
        const command = (receipt: AsyncLeanCommandReceipt) => ({ run_id: receipt.run_id, manifest_path: receipt.manifest_path,
          manifest_sha256: hash(readCommittedFile(runtime.root, receipt.manifest_path)) });
        const hard_vetoes = [
          ...(dependency_closure.result === "pass" ? [] : ["dependency_closure_failed"]),
          ...(static_audit.result === "pass" ? [] : ["static_audit_failed"]),
          ...(axiom_profile.result === "pass" ? [] : ["axiom_profile_failed"]),
          ...(clean_type_comparison.result === "pass" ? [] : ["clean_type_comparison_failed"]),
          ...(formal_header_comparison.result === "pass" ? [] : ["formal_header_comparison_failed"])
        ];
        const legacy_final_input = { schema_version: "comath.async_clean_replay_legacy_final_input.v1" as const,
          result: hard_vetoes.length ? "blocked" as const : "ready" as const,
          report_path: `.comath/evidence/${project.claim_id}/lean/replays/${preparation.replay_id}/legacy-final-input.json`,
          hard_vetoes, proof_authority: "none" as const, can_promote_claim: false as const, promotion_requires_gate: true as const };
        save(`${operation_id}:legacy-final-input`, legacy_final_input.report_path, project.campaign_id, { ...legacy_final_input,
          scope: { campaign_id: project.campaign_id, claim_id: project.claim_id, candidate_id: project.candidate_id,
            obligation_id: project.obligation_id, stage_attempt: project.stage_attempt, scope_package_sha256: project.scope_package_sha256,
            replay_id: preparation.replay_id },
          preparation: { operation_id: preparation.operation_id, preparation_manifest_path: preparation.preparation_manifest_path,
            obligation_receipt_path: preparation.obligation_receipt_path, source_project_operation_id: preparation.source_project_operation_id,
            source_project_sha256: preparation.source_project_sha256 },
          environment: evidence(environment_receipt_path), evidence: { dependency_closure: evidence(dependency_closure.report_path),
            static_audit: evidence(static_audit.report_path), axiom_profile: evidence(axiom_profile.report_path),
            statement_comparison: evidence(statement_comparison.report_path), formal_header_comparison: evidence(formal_header_comparison.report_path),
            clean_type_comparison: evidence(clean_type_comparison.report_path) },
          commands: { build: command(buildManifest), audit: command(auditManifest), lock_elaboration: command(lockElaborationManifest) } });
        result.legacy_final_input = legacy_final_input;
      }
      save(operation_id, `.comath/evidence/${project.claim_id}/lean/replays/${preparation.replay_id}/async-execution.json`, project.campaign_id, result);
      return result;
    } catch (error) {
      failure = error;
      throw error;
    } finally {
      const settled = tools.finishAttempt({ attempt_key: binding.attempt_key, outcome: result.executed ? "succeeded" : "failed", usage_complete: complete });
      if (!settled.released && !failure) fail("ASYNC_CLEAN_REPLAY_UNRECONCILED");
    }
  }
  return { execute };
}

/** Runs the only authority-bearing final replay command in its own task and attempt, never in RPTASK. */
export function createAsyncFinalAuthorityReplayExecutor(app: ResearchOrchestrator, tools: ReturnType<typeof createProofToolAttemptService>, config: Config) {
  const runtime = app.runtime, store = runtime.store;
  function save(operation_id: string, path: string, campaign_id: string, value: unknown) {
    withProjectCommit(runtime.root, { operation_id, campaign_id, request: value }, () => { writeCommittedFile(runtime.root, path, canonicalJson(value)); return { report_path: path }; });
  }
  function saved<T>(operation_id: string): T | undefined {
    const row = store.get("SELECT phase,plan_json FROM trust_commits WHERE operation_id=?", operation_id); if (!row) return undefined;
    if (row.phase !== "committed") fail("COMMIT_PENDING");
    const plan = JSON.parse(String(row.plan_json)), path = plan.response.report_path;
    if (typeof path !== "string") fail("ASYNC_FINAL_AUTHORITY_RECEIPT_INVALID");
    const bytes = readFileSync(resolveProjectCommitPath(runtime.root, path));
    const target = plan.targets.find((value: { relative_path: string }) => value.relative_path === path);
    if (!target || hash(bytes) !== target.after_sha256) fail("ASYNC_FINAL_AUTHORITY_EVIDENCE_CHANGED");
    return JSON.parse(bytes.toString("utf8")) as T;
  }
  async function execute(input: { project: FormalCandidateProjectReceipt; preparation: AsyncCleanReplayPreparation }, control: { signal: AbortSignal; assertCurrent: () => void }): Promise<AsyncFinalAuthorityReplayExecution> {
    const { project, preparation } = input; control.assertCurrent();
    if (preparation.campaign_id !== project.campaign_id || preparation.claim_id !== project.claim_id || preparation.candidate_id !== project.candidate_id
      || preparation.obligation_id !== project.obligation_id || preparation.stage_attempt !== project.stage_attempt || preparation.scope_package_sha256 !== project.scope_package_sha256) fail("ASYNC_FINAL_AUTHORITY_BINDING_INVALID");
    const replayIdentity = hash(canonicalJson({ project, preparation, config })), replayOperation = `async-clean-replay:${replayIdentity}`;
    const replay = saved<AsyncCleanReplayExecution>(replayOperation);
    const finalInput = saved<Record<string, unknown>>(`${replayOperation}:legacy-final-input`);
    if (!replay || replay.legacy_final_input?.result !== "ready" || !finalInput || finalInput.schema_version !== "comath.async_clean_replay_legacy_final_input.v1"
      || finalInput.result !== "ready" || finalInput.proof_authority !== "none" || finalInput.can_promote_claim !== false || finalInput.promotion_requires_gate !== true) fail("ASYNC_FINAL_AUTHORITY_INPUT_INVALID");
    const scope = finalInput.scope as Record<string, unknown> | undefined, evidence = finalInput.evidence as Record<string, unknown> | undefined;
    if (!scope || scope.campaign_id !== project.campaign_id || scope.claim_id !== project.claim_id || scope.candidate_id !== project.candidate_id
      || scope.obligation_id !== project.obligation_id || scope.stage_attempt !== project.stage_attempt || scope.scope_package_sha256 !== project.scope_package_sha256
      || scope.replay_id !== preparation.replay_id || !evidence) fail("ASYNC_FINAL_AUTHORITY_SCOPE_MISMATCH");
    for (const value of Object.values(evidence)) {
      const ref = value as { path?: unknown; sha256?: unknown };
      if (typeof ref.path !== "string" || typeof ref.sha256 !== "string" || hash(readCommittedFile(runtime.root, ref.path)) !== ref.sha256) fail("ASYNC_FINAL_AUTHORITY_EVIDENCE_CHANGED");
    }
    const identity = hash(canonicalJson({ project, preparation, finalInput, config })), operation_id = `async-final-authority-replay:${identity}`, task_id = `FRTASK-${identity.slice(0, 40)}`;
    const old = saved<AsyncFinalAuthorityReplayExecution>(operation_id); if (old) return old;
    const submissionRow = store.get("SELECT response_json FROM commands WHERE principal_id='service:formal-submission' AND json_extract(response_json,'$.operation_id')=?", project.source_operation_id);
    if (!submissionRow) fail("ASYNC_FINAL_AUTHORITY_SOURCE_RECEIPT_MISSING");
    const submission = JSON.parse(String(submissionRow.response_json)), approved = requireApprovedFormalScope(runtime, project.campaign_id, submission.scope);
    if (approved.obligation_binding.obligation_id !== project.obligation_id) fail("ASYNC_FINAL_AUTHORITY_SCOPE_MISMATCH");
    let task = store.getTask(task_id);
    if (!task) {
      const campaign = store.getCampaign(project.campaign_id)!;
      app.applyPatch({ kind: "internal", id: "service:proof-workflow" }, { command_id: `${operation_id}:task`, campaign_id: project.campaign_id, base_revision: campaign.revision,
        create_tasks: [{ task_id, kind: "proof_workflow", depends_on: [], scope: approved.scope, question: `Final authority replay ${preparation.replay_id} for ${project.obligation_id}.`,
          acceptance: ["Run one service-owned final Lean replay from immutable clean evidence. Promotion remains a separate gate."], model_policy_id: config.candidate.model_policy_id,
          tool_policy_id: config.candidate.tool_policy_id, role_template: config.candidate.role_template, pool: "formalization", priority: config.candidate.priority,
          budget: config.tool_budget, method_family: "service_async_final_authority_replay", problem_slice: project.obligation_id, coupling_label: preparation.replay_id,
          input_refs: [approved.formal_spec_ref, approved.ledger_ref, submission.result_ref], exclusions: ["No claim promotion from final replay execution alone."] }],
        add_dependencies: [], replace_dependencies: [], reprioritize: [], cancel_tasks: [], move_pool: [], rationale: "Run the separately permitted final Lean authority command for immutable clean evidence." });
      task = store.getTask(task_id)!;
    }
    if (task.kind !== "proof_workflow" || task.method_family !== "service_async_final_authority_replay" || task.coupling_label !== preparation.replay_id
      || canonicalJson(task.scope) !== canonicalJson(approved.scope) || canonicalJson(task.budget) !== canonicalJson(config.tool_budget)) fail("ASYNC_FINAL_AUTHORITY_TASK_CONFLICT");
    const binding = tools.startAttempt({ command_id: `${operation_id}:start`, task_id, expected_generation: 0 });
    const cwd = resolveProjectCommitPath(runtime.root, preparation.clean_workspace_path), allowed = (['lean', 'lake'] as const).map(tool => {
      const path = directElanTool(tool, config.lean_toolchain); return path !== tool && existsSync(path) ? path : undefined;
    });
    if (allowed.some(value => !value)) fail("LEAN_ASYNC_BINARY_UNAVAILABLE");
    const result: AsyncFinalAuthorityReplayExecution = { task_id, replay_id: preparation.replay_id, claim_id: project.claim_id, obligation_id: project.obligation_id,
      commands: {}, result: "blocked", hard_vetoes: ["final_authority_replay_not_executed"], proof_authority: "none", can_promote_claim: false, promotion_requires_gate: true };
    let complete = true;
    async function command(name: string, runner: (execution: LeanHostAsyncCommandOptions) => Promise<ReplayCommand>) {
      if (tools.readAttempt(binding.attempt_key)?.state === "settled") fail("ASYNC_FINAL_AUTHORITY_ATTEMPT_SETTLED");
      const key = `${operation_id}:${name}`, execution_id = `FREX-${hash(key).slice(0, 40)}`;
      let admission = tools.beginTool({ attempt_key: binding.attempt_key, execution_id, kind: "lean", command_ref: key });
      while (!admission.granted) { if (admission.completed) fail("ASYNC_FINAL_AUTHORITY_COMMAND_INCOMPLETE"); await delay(100, undefined, { signal: control.signal }); control.assertCurrent(); admission = tools.beginTool({ attempt_key: binding.attempt_key, execution_id, kind: "lean", command_ref: key }); }
      const started = performance.now(); let completion: LeanHostAsyncCommandResult["completion"] | undefined;
      try {
        const value = await runner({ runtime, ownership: admission.ownership!, allowed_programs: allowed as string[], signal: control.signal,
          timeout_ms: config.tool_timeout_ms, max_output_bytes: 2 * 1024 * 1024, onCompleted: value => { completion = value; } });
        if (!completion) fail("ASYNC_FINAL_AUTHORITY_COMPLETION_MISSING"); result.commands[name] = value; return value;
      } finally {
        if (completion) {
          const released = tools.completeTool({ attempt_key: binding.attempt_key, execution_id, cumulative_wall_ms: Math.ceil(performance.now() - started), termination_confirmed: completion.termination_confirmed, handle: completion.handle });
          if (!released.released) complete = false;
        } else { complete = false; tools.recoverAttempt(binding.attempt_key); }
      }
    }
    let failure: unknown;
    try {
      const versions: Record<string, string> = {};
      for (const tool of ["lean", "lake"] as const) {
        const value = await command(`${tool}-version`, async execution => {
          const raw = await runLeanToolCommandAsync(tool, ["--version"], cwd, config.lean_toolchain, execution);
          return { exit_code: raw.exit_code, stdout: raw.stdout, stderr: raw.stderr, proof_authority: "none" };
        });
        if (value.exit_code !== 0) break;
        versions[tool] = `${value.stdout ?? ""}\n${value.stderr ?? ""}`;
      }
      if (versions.lean && versions.lake) {
        const value = await command("final-authority-replay", async execution => {
          const files = preparation.copied_files.map(file => join(cwd, file.path)).filter(existsSync);
          const lakeManifest = join(cwd, "lake-manifest.json"); if (existsSync(lakeManifest)) files.push(lakeManifest);
          const receipt = await runServiceOwnedLeanCommandV3Async({ runtime, command_id: `${operation_id}:final-authority-replay:manifest`, claim_id: project.claim_id,
            campaign_id: project.campaign_id, candidate_id: project.candidate_id, purpose: "final_replay", command: ["lake", "build", ...project.project.build_targets], cwd,
            input_files: files, leanVersionOutput: versions.lean, lakeVersionOutput: versions.lake, leanToolchain: config.lean_toolchain,
            network_policy: "disabled", proof_authority: "lean_kernel_check", execution });
          return { exit_code: receipt.manifest.exit_code, manifest: receipt, proof_authority: "none" };
        });
        result.hard_vetoes = value.exit_code === 0 && value.manifest?.manifest.proof_authority === "lean_kernel_check" ? [] : ["final_authority_replay_failed"];
        result.result = result.hard_vetoes.length ? "blocked" : "pass";
        if (result.result === "pass" && value.manifest) {
          const finalManifest = value.manifest.manifest, leanHash = finalManifest.lean_binary_sha256, lakeHash = finalManifest.lake_binary_sha256;
          if (!leanHash || !lakeHash) fail("ASYNC_FINAL_AUTHORITY_BINARY_PROVENANCE_MISSING");
          const closure = JSON.parse(readCommittedFile(runtime.root, replay.dependency_closure!.report_path)) as DependencyClosureV2Report;
          if (closure.schema_version !== "comath.dependency_closure.v2" || closure.result !== "pass" || !Array.isArray(closure.packages)) fail("ASYNC_FINAL_AUTHORITY_DEPENDENCY_CLOSURE_INVALID");
          const source_hashes_before = Object.fromEntries(finalManifest.input_files.map(file => [
            relative(cwd, join(runtime.root, file.path)).replace(/\\/g, "/"), { sha256: file.sha256, size_bytes: file.size_bytes }
          ]));
          const final_replay_manifest_v3_path = `.comath/evidence/${project.claim_id}/lean/replays/${preparation.replay_id}/final-replay-manifest-v3.json`;
          const manifest = createFinalReplayManifestV3({ projectRoot: runtime.root, replay_id: preparation.replay_id, campaign_id: project.campaign_id,
            claim_id: project.claim_id, replay_scope: { candidate_id: project.candidate_id, obligation_id: project.obligation_id,
              stage_attempt: project.stage_attempt, scope_package_sha256: project.scope_package_sha256 }, theorem_name: project.project.theorem_name,
            clean_workspace_path: cwd, command: finalManifest.command, exit_code: finalManifest.exit_code, result: "pass", source_hashes_before,
            stdout_path: finalManifest.stdout_path, stderr_path: finalManifest.stderr_path, report_paths: { static_audit: replay.static_audit!.report_path,
              axiom_profile: replay.axiom_profile!.report_path, dependency_closure: replay.dependency_closure!.report_path,
              statement_equivalence: replay.formal_header_comparison!.report_path }, lean_run_manifest_paths: [value.manifest.manifest_path],
            dependency_lock: { local_source_root_path: "source", lean_toolchain_path: join(cwd, "lean-toolchain"), lake_manifest_path: join(cwd, "lake-manifest.json"), lakefile_path: join(cwd, "lakefile.lean"),
              external_revisions: dependencyClosureV2PackagesToExternalRevisions(closure.packages) }, network_policy: "disabled",
            sandbox_policy: { network: "disabled", os_isolation: "process_boundary_only" }, resource_budget: { timeout_ms: config.tool_timeout_ms,
              max_stdout_bytes: 2 * 1024 * 1024, max_stderr_bytes: 2 * 1024 * 1024 }, binary_hashes: { lean: leanHash, lake: lakeHash } });
          save(`${operation_id}:final-replay-manifest-v3`, final_replay_manifest_v3_path, project.campaign_id, manifest);
          result.final_replay_manifest_v3_path = final_replay_manifest_v3_path;
          const controlCampaign = store.getCampaign(project.campaign_id);
          if (!controlCampaign?.project_id) fail("ASYNC_FINAL_AUTHORITY_PROJECT_MISSING");
          const registry = withProjectCommit(runtime.root, { operation_id: `${operation_id}:registry`, campaign_id: project.campaign_id,
            request: { final_replay_manifest_v3_path, replay_id: preparation.replay_id, scope_package_sha256: project.scope_package_sha256 } }, () =>
            stageFinalReplayRegistryEntryV3({ projectRoot: runtime.root, manifest, project_id: controlCampaign.project_id,
              actor: "service:proof-workflow", source: "async_final_authority_replay" }));
          result.final_replay_registry = { ...registry, proof_authority: "none", can_promote_claim: false, promotion_requires_gate: true };
          const pack = withProjectCommit(runtime.root, { operation_id: `${operation_id}:pack`, campaign_id: project.campaign_id,
            request: { final_replay_manifest_v3_path, replay_id: preparation.replay_id, clean_workspace_sha256: manifest.clean_workspace_sha256 } }, () =>
            stageThirdPartyReplayPackV3({ projectRoot: runtime.root, manifest }));
          result.third_party_replay_pack = { ...pack, proof_authority: "none", can_promote_claim: false, promotion_requires_gate: true };
          const scopedPackaging = stageScopedFinalAuthorityPackagingV1({ runtime, operation_id, project, preparation, approved,
            manifest_path: final_replay_manifest_v3_path, manifest, final_authority_lrun_path: value.manifest.manifest_path,
            replay, registry, pack });
          const packagingArtifact = await importArtifact({ projectRoot: runtime.root, project_id: controlCampaign.project_id,
            source_path: scopedPackaging.packaging_path, kind: "runner_output", actor: "service:proof-workflow" });
          const finalReplayArtifact = await importArtifact({ projectRoot: runtime.root, project_id: controlCampaign.project_id,
            source_path: final_replay_manifest_v3_path, kind: "runner_output", actor: "service:proof-workflow" });
          const derivedBindingsArtifact = await importArtifact({ projectRoot: runtime.root, project_id: controlCampaign.project_id,
            source_path: scopedPackaging.derived_bindings_path, kind: "runner_output", actor: "service:proof-workflow" });
          const artifact_ids = [packagingArtifact.id, finalReplayArtifact.id, derivedBindingsArtifact.id];
          const evidence = appendEvidenceRecord(runtime.root, { project_id: controlCampaign.project_id, claim_id: project.claim_id, kind: "lean",
            summary: `${preparation.replay_id} scoped final-authority package is ready for the ordinary promotion gate.`, artifact_ids });
          result.final_authority_packaging = { ...scopedPackaging, artifact_id: packagingArtifact.id, artifact_ids, evidence_id: evidence.id };
        }
      }
      save(operation_id, `.comath/evidence/${project.claim_id}/lean/replays/${preparation.replay_id}/final-authority-execution.json`, project.campaign_id, result);
      return result;
    } catch (error) {
      failure = error;
      throw error;
    } finally {
      const settled = tools.finishAttempt({ attempt_key: binding.attempt_key, outcome: result.result === "pass" ? "succeeded" : "failed", usage_complete: complete });
      if (!settled.released && !failure) fail("ASYNC_FINAL_AUTHORITY_UNRECONCILED");
    }
  }
  return { execute };
}
