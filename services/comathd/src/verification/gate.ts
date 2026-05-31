import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { appendAuditEvent, readAuditEvents } from "../audit/jsonl-writer.js";
import { listArtifactRefs } from "../artifacts/store.js";
import { applyGatePromotedClaim, getClaim } from "../claim/claim-store.js";
import { ComathError } from "../errors.js";
import { readEvidenceRecords } from "../evidence/store.js";
import { hasSuccessfulCitationConditionMatch } from "../literature/store.js";
import { assertPathAllowed } from "../security/path-policy.js";
import {
  claimSchema,
  finalReplayManifestV3Schema,
  gateResultSchema,
  type ArtifactRef,
  type Claim,
  type ClaimStatus,
  type Evidence,
  type GateResult
} from "../types/schemas.js";
import { nextSequentialId } from "../utils/id.js";
import {
  finalReplayLeanRunManifestSemanticallyBoundV3,
  hasFinalReplayRegistryProvenanceV3,
  hasLeanLakeBinaryHashProvenanceV3,
  verifyFinalReplayManifestV3
} from "../proof-kernel/lean/final-replay-manifest-v3.js";
import {
  hasLeanRunManifestProvenanceIndexV1,
  verifyLeanRunManifestV3Evidence
} from "../proof-kernel/lean/lean-run-manifest-v3.js";
import { runnerResultSha256, sha256Text } from "./runner-contracts.js";

export type ClaimPromotionRequest = {
  project_id: string;
  claim_id: string;
  target_status: ClaimStatus;
  evidence_ids: string[];
  artifact_ids: string[];
  actor: string;
  external_vetoes?: string[];
  external_warnings?: string[];
};

export type ClaimPromotionDecision = {
  gate: GateResult;
  claim: Claim;
};

function gateResultsPath(projectRoot: string): string {
  return assertPathAllowed(projectRoot, join(".comath", "claims", "gate-results.jsonl"), { purpose: "runtime-write" });
}

function now(): string {
  return new Date().toISOString();
}

function readJsonl(path: string): GateResult[] {
  if (!existsSync(path)) {
    return [];
  }
  return readFileSync(path, "utf8")
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line) => gateResultSchema.parse(JSON.parse(line)));
}

function writeGateResults(projectRoot: string, gates: GateResult[]): void {
  const path = gateResultsPath(projectRoot);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${gates.map((gate) => JSON.stringify(gate)).join("\n")}${gates.length ? "\n" : ""}`, "utf8");
}

export function readGateResults(projectRoot: string, projectId?: string): GateResult[] {
  const gates = readJsonl(gateResultsPath(projectRoot));
  return projectId ? gates.filter((gate) => gate.project_id === projectId) : gates;
}

function sha256FileSync(path: string): { sha256: string; size_bytes: number } {
  const data = readFileSync(path);
  return {
    sha256: createHash("sha256").update(data).digest("hex"),
    size_bytes: statSync(path).size
  };
}

function canonicalJson(value: unknown): string {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map((item) => canonicalJson(item)).join(",")}]`;
  }
  const entries = Object.entries(value as Record<string, unknown>)
    .filter(([, item]) => item !== undefined)
    .sort(([left], [right]) => left.localeCompare(right));
  return `{${entries.map(([key, item]) => `${JSON.stringify(key)}:${canonicalJson(item)}`).join(",")}}`;
}

function evidenceForRequest(projectRoot: string, request: ClaimPromotionRequest): Evidence[] {
  const byId = new Map(readEvidenceRecords(projectRoot, request.project_id).map((record) => [record.id, record]));
  return request.evidence_ids.map((id) => byId.get(id)).filter((record): record is Evidence => Boolean(record));
}

function artifactsForRequest(projectRoot: string, request: ClaimPromotionRequest): ArtifactRef[] {
  const byId = new Map(listArtifactRefs(projectRoot).filter((artifact) => artifact.project_id === request.project_id).map((artifact) => [artifact.id, artifact]));
  return request.artifact_ids.map((id) => byId.get(id)).filter((artifact): artifact is ArtifactRef => Boolean(artifact));
}

type RunnerReportResult = {
  evidence_id: string;
  artifact_id: string;
  ok: boolean;
  runner_id: string;
  runner_version: string;
  exactness: string;
  supports_status: string;
  result_sha256: string;
  vetoes: string[];
  warnings: string[];
  trusted_audit: boolean;
};

function hasTrustedRunnerAudit(
  projectRoot: string,
  request: Pick<ClaimPromotionRequest, "project_id" | "claim_id">,
  evidenceId: string,
  artifact: ArtifactRef,
  result: Record<string, unknown>,
  resultSha256: string
): boolean {
  return readAuditEvents(projectRoot).some((event) => {
    if (event.project_id !== request.project_id || event.target_id !== request.claim_id) {
      return false;
    }
    if (event.event_type !== "runner.completed" && event.event_type !== "runner.failed") {
      return false;
    }
    return (
      event.payload.artifact_id === artifact.id &&
      event.payload.evidence_id === evidenceId &&
      event.payload.result_sha256 === resultSha256 &&
      event.payload.runner_id === result.runner_id &&
      event.payload.runner_version === result.runner_version
    );
  });
}

function readRunnerReportResult(
  projectRoot: string,
  request: Pick<ClaimPromotionRequest, "project_id" | "claim_id">,
  evidenceId: string,
  artifact: ArtifactRef
): RunnerReportResult | null {
  if (artifact.kind !== "runner_output") {
    return null;
  }
  const path = assertPathAllowed(projectRoot, artifact.path, { purpose: "read", resolveRealpath: true });
  const report = JSON.parse(readFileSync(path, "utf8")) as { result?: Record<string, unknown>; runner_id?: unknown };
  const result = report.result;
  if (!result || typeof result !== "object") {
    return null;
  }
  const expectedHash = runnerResultSha256(result);
  if (!expectedHash || result.result_sha256 !== expectedHash) {
    return null;
  }
  return {
    evidence_id: evidenceId,
    artifact_id: artifact.id,
    ok: result.ok === true,
    runner_id: typeof result.runner_id === "string" ? result.runner_id : String(report.runner_id ?? "unknown"),
    runner_version: typeof result.runner_version === "string" ? result.runner_version : "unknown",
    exactness: typeof result.exactness === "string" ? result.exactness : "not_applicable",
    supports_status: typeof result.supports_status === "string" ? result.supports_status : "none",
    result_sha256: expectedHash,
    vetoes: Array.isArray(result.vetoes) ? result.vetoes.filter((item): item is string => typeof item === "string") : [],
    warnings: Array.isArray(result.warnings) ? result.warnings.filter((item): item is string => typeof item === "string") : [],
    trusted_audit: hasTrustedRunnerAudit(projectRoot, request, evidenceId, artifact, result, expectedHash)
  };
}

function runnerReportsForEvidence(
  projectRoot: string,
  request: Pick<ClaimPromotionRequest, "project_id" | "claim_id">,
  evidence: Evidence[],
  artifacts: ArtifactRef[],
  expectedEvidenceKinds: Set<Evidence["kind"]>
): RunnerReportResult[] {
  const artifactById = new Map(artifacts.map((artifact) => [artifact.id, artifact]));
  const reports: RunnerReportResult[] = [];
  for (const record of evidence) {
    if (!expectedEvidenceKinds.has(record.kind)) {
      continue;
    }
    for (const artifactId of record.artifact_ids) {
      const artifact = artifactById.get(artifactId);
      if (!artifact) {
        continue;
      }
      try {
        const report = readRunnerReportResult(projectRoot, request, record.id, artifact);
        if (report) {
          reports.push(report);
        }
      } catch {
        continue;
      }
    }
  }
  return reports;
}

function readJsonArtifact(projectRoot: string, artifact: ArtifactRef): unknown | null {
  try {
    const path = assertPathAllowed(projectRoot, artifact.path, { purpose: "read", resolveRealpath: true });
    return JSON.parse(readFileSync(path, "utf8"));
  } catch {
    return null;
  }
}

function readJsonInsideProject(projectRoot: string, relativePath: string): unknown | null {
  try {
    const path = assertPathAllowed(projectRoot, relativePath, { purpose: "read", resolveRealpath: true });
    return JSON.parse(readFileSync(path, "utf8"));
  } catch {
    return null;
  }
}

function reportPasses(projectRoot: string, relativePath: string): boolean {
  try {
    const path = assertPathAllowed(projectRoot, relativePath, { purpose: "read", resolveRealpath: true });
    const report = JSON.parse(readFileSync(path, "utf8")) as Record<string, unknown>;
    const hardVetoes = Array.isArray(report.hard_vetoes) ? report.hard_vetoes : [];
    return report.result === "pass" && hardVetoes.length === 0;
  } catch {
    return false;
  }
}

function expectedReplayPackHashes(finalReplayManifest: Record<string, unknown>): Record<string, unknown> {
  return {
    clean_workspace_sha256: finalReplayManifest.clean_workspace_sha256,
    source_hashes_after: finalReplayManifest.source_hashes_after,
    artifact_hashes: finalReplayManifest.artifact_hashes,
    dependency_lock: finalReplayManifest.dependency_lock,
    lean_run_manifest_paths: finalReplayManifest.lean_run_manifest_paths
  };
}

function replayPackMatchesFinalReplay(
  projectRoot: string,
  relativePath: string,
  finalReplayManifest: Record<string, unknown>
): boolean {
  for (const required of ["README_REPLAY.md", "FinalReplayManifest.json", "expected_hashes.json"]) {
    try {
      assertPathAllowed(projectRoot, join(relativePath, required), { purpose: "read", resolveRealpath: true });
    } catch {
      return false;
    }
  }
  const packManifest = readJsonInsideProject(projectRoot, join(relativePath, "FinalReplayManifest.json"));
  const packExpectedHashes = readJsonInsideProject(projectRoot, join(relativePath, "expected_hashes.json"));
  return (
    canonicalBindingJson(packManifest) === canonicalBindingJson(finalReplayManifest) &&
    canonicalBindingJson(packExpectedHashes) === canonicalBindingJson(expectedReplayPackHashes(finalReplayManifest))
  );
}

function stringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((entry): entry is string => typeof entry === "string" && entry.length > 0) : [];
}

function normalizedStoredPath(value: string): string {
  return value.replace(/\\/g, "/");
}

function leanRunManifestPathsMatchAndVerify(
  projectRoot: string,
  report: Record<string, unknown>,
  finalReplayManifest: Record<string, unknown>
): boolean {
  const reportPaths = stringArray(report.lean_run_manifest_paths).map(normalizedStoredPath);
  const replayPaths = stringArray(finalReplayManifest.lean_run_manifest_paths).map(normalizedStoredPath);
  if (reportPaths.length === 0 || reportPaths.length !== replayPaths.length) {
    return false;
  }
  if (canonicalBindingJson(reportPaths) !== canonicalBindingJson(replayPaths)) {
    return false;
  }
  let hasSemanticallyBoundFinalReplayRun = false;
  for (const manifestPath of replayPaths) {
    const manifest = readJsonInsideProject(projectRoot, manifestPath);
    if (!verifyLeanRunManifestV3Evidence(projectRoot, manifest).ok) {
      return false;
    }
    if (!hasLeanRunManifestProvenanceIndexV1({ projectRoot, manifest, manifest_path: manifestPath })) {
      return false;
    }
    if (finalReplayLeanRunManifestSemanticallyBoundV3(finalReplayManifest, manifest)) {
      hasSemanticallyBoundFinalReplayRun = true;
    }
  }
  return hasSemanticallyBoundFinalReplayRun;
}

function canonicalBindingJson(value: unknown): string {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map((item) => canonicalBindingJson(item)).join(",")}]`;
  }
  return `{${Object.entries(value as Record<string, unknown>)
    .filter(([, item]) => item !== undefined)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, item]) => `${JSON.stringify(key)}:${canonicalBindingJson(item)}`)
    .join(",")}}`;
}

function hashJsonInsideProject(projectRoot: string, relativePath: string): string | null {
  const value = readJsonInsideProject(projectRoot, relativePath);
  return value === null ? null : sha256Text(canonicalBindingJson(value));
}

function projectJsonStringField(projectRoot: string, relativePath: string, field: string): string | null {
  const value = readJsonInsideProject(projectRoot, relativePath);
  if (!value || typeof value !== "object") {
    return null;
  }
  const fieldValue = (value as Record<string, unknown>)[field];
  return typeof fieldValue === "string" ? fieldValue : null;
}

function projectFormalSpecLockBindingValid(input: {
  projectRoot: string;
  relativePath: string;
  bindingScope?: "positive_matrix" | "campaign";
  taskId: unknown;
  campaignId?: unknown;
  claimId: string;
  lockedStatementHash: string;
  finalReplayManifest: Record<string, unknown>;
  statementCheckPath: string;
}): boolean {
  const value = readJsonInsideProject(input.projectRoot, input.relativePath);
  const record = value && typeof value === "object" ? (value as Record<string, unknown>) : {};
  const scopeMatches =
    input.bindingScope === "campaign"
      ? record.binding_scope === "campaign" && record.campaign_id === input.campaignId && record.task_id === undefined
      : (record.binding_scope === undefined || record.binding_scope === "positive_matrix") && record.task_id === input.taskId;
  return (
    record.schema_version === "comath.formal_spec_lock.v2" &&
    record.proof_authority === "none" &&
    scopeMatches &&
    record.claim_id === input.claimId &&
    formalSpecTheoremIdentityMatches(input.projectRoot, input.relativePath, input.finalReplayManifest) &&
    record.statement_hash === input.lockedStatementHash &&
    record.statement_hash === projectJsonStringField(input.projectRoot, input.statementCheckPath, "locked_statement_hash")
  );
}

function projectAssumptionLedgerBindingValid(input: {
  projectRoot: string;
  relativePath: string;
  bindingScope?: "positive_matrix" | "campaign";
  taskId: unknown;
  campaignId?: unknown;
  claimId: string;
  lockedStatementHash: string;
}): boolean {
  const value = readJsonInsideProject(input.projectRoot, input.relativePath);
  const record = value && typeof value === "object" ? (value as Record<string, unknown>) : {};
  const scopeMatches =
    input.bindingScope === "campaign"
      ? record.binding_scope === "campaign" && record.campaign_id === input.campaignId && record.task_id === undefined
      : (record.binding_scope === undefined || record.binding_scope === "positive_matrix") && record.task_id === input.taskId;
  return (
    record.schema_version === "comath.assumption_ledger.v1" &&
    record.proof_authority === "none" &&
    scopeMatches &&
    record.claim_id === input.claimId &&
    record.formal_spec_lock_hash === input.lockedStatementHash
  );
}

function shortLeanDeclarationName(name: string): string {
  return name.split(".").filter(Boolean).at(-1) ?? name;
}

function leanDeclarationNamespace(name: string): string {
  const parts = name.split(".").filter(Boolean);
  return parts.length > 1 ? parts.slice(0, -1).join(".") : "";
}

function theoremHeaderDeclarationName(header: string | null): string | null {
  if (header === null) {
    return null;
  }
  const match = /\b(?:theorem|lemma)\s+([A-Za-z_][A-Za-z0-9_'.]*)/.exec(header);
  return match ? shortLeanDeclarationName(match[1]) : null;
}

function formalSpecTheoremIdentityMatches(
  projectRoot: string,
  formalSpecLockPath: string,
  finalReplayManifest: Record<string, unknown>
): boolean {
  if (typeof finalReplayManifest.theorem_name !== "string") {
    return false;
  }
  const formalSpecTheoremName = projectJsonStringField(projectRoot, formalSpecLockPath, "theorem_name");
  if (formalSpecTheoremName === null) {
    return false;
  }
  const finalReplayTheoremName = finalReplayManifest.theorem_name;
  const formalSpecShortName = shortLeanDeclarationName(formalSpecTheoremName);
  if (formalSpecTheoremName !== finalReplayTheoremName && formalSpecShortName !== shortLeanDeclarationName(finalReplayTheoremName)) {
    return false;
  }

  const formalSpecNamespace = projectJsonStringField(projectRoot, formalSpecLockPath, "namespace");
  const finalReplayNamespace = leanDeclarationNamespace(finalReplayTheoremName);
  if (finalReplayNamespace !== "" && (formalSpecNamespace === null || formalSpecNamespace.trim() === "")) {
    return false;
  }
  if (formalSpecNamespace !== null && formalSpecNamespace.trim() !== "" && formalSpecNamespace !== finalReplayNamespace) {
    return false;
  }

  const headerDeclarationName = theoremHeaderDeclarationName(projectJsonStringField(projectRoot, formalSpecLockPath, "theorem_header"));
  return headerDeclarationName !== null && headerDeclarationName === formalSpecShortName;
}

function finalReplayReportPathMatches(
  finalReplayManifest: Record<string, unknown>,
  finalReplayReportKey: string,
  submittedPath: string
): boolean {
  const reportPaths = finalReplayManifest.report_paths && typeof finalReplayManifest.report_paths === "object"
    ? (finalReplayManifest.report_paths as Record<string, unknown>)
    : null;
  const expectedPath = reportPaths?.[finalReplayReportKey];
  return (
    typeof expectedPath === "string" &&
    expectedPath.replace(/\\/g, "/") === submittedPath.replace(/\\/g, "/")
  );
}

function requestedJsonArtifactByPath(projectRoot: string, artifacts: ArtifactRef[], relativePath: string): unknown | null {
  const normalizedPath = relativePath.replace(/\\/g, "/");
  const directMatch = artifacts
    .filter((artifact) => artifact.path.replace(/\\/g, "/") === normalizedPath)
    .map((artifact) => readJsonArtifact(projectRoot, artifact))
    .find((value) => value !== null);
  if (directMatch) {
    return directMatch;
  }

  return artifacts
    .map((artifact) => readJsonArtifact(projectRoot, artifact))
    .find((value) => {
      if (!value || typeof value !== "object") {
        return false;
      }
      const record = value as Record<string, unknown>;
      return typeof record.binding_manifest_path === "string" && record.binding_manifest_path.replace(/\\/g, "/") === normalizedPath;
    }) ?? null;
}

function hasVerifiedDerivedBindingManifest(
  projectRoot: string,
  request: Pick<ClaimPromotionRequest, "claim_id"> & { locked_statement_hash: string },
  report: Record<string, unknown>,
  finalReplayManifest: Record<string, unknown>,
  artifacts: ArtifactRef[]
): boolean {
  if (typeof report.source_packaging_report_path !== "string") {
    return true;
  }
  if (!report.source_packaging_report_path.endsWith("/derived_final_authority_bindings_v3.json")) {
    return true;
  }

  const binding = requestedJsonArtifactByPath(projectRoot, artifacts, report.source_packaging_report_path);
  if (!binding || typeof binding !== "object") {
    return false;
  }
  const bindingRecord = binding as Record<string, unknown>;
  const bindingScope = report.binding_scope === "campaign" ? "campaign" : "positive_matrix";
  const scopeMatches =
    bindingScope === "campaign"
      ? bindingRecord.binding_scope === "campaign" &&
        bindingRecord.campaign_id === report.campaign_id &&
        bindingRecord.task_id === undefined
      : (bindingRecord.binding_scope === undefined || bindingRecord.binding_scope === "positive_matrix") &&
        bindingRecord.task_id === report.task_id;
  if (
    bindingRecord.schema_version !== "comath.final_authority_derived_bindings.v3" ||
    !scopeMatches ||
    bindingRecord.claim_id !== report.claim_id ||
    bindingRecord.claim_id !== request.claim_id ||
    bindingRecord.binding_manifest_path !== report.source_packaging_report_path ||
    bindingRecord.final_replay_manifest_v3_path !== report.final_replay_manifest_v3_path ||
    bindingRecord.proof_authority !== "none" ||
    bindingRecord.can_promote_claim !== false ||
    bindingRecord.promotion_requires_gate !== true ||
    bindingRecord.caller_supplied_hashes_trusted !== false
  ) {
    return false;
  }

  const dependencyLockHash = finalReplayManifest.dependency_lock
    ? sha256Text(canonicalBindingJson(finalReplayManifest.dependency_lock))
    : null;
  const artifactHashesHash = finalReplayManifest.artifact_hashes
    ? sha256Text(canonicalBindingJson(finalReplayManifest.artifact_hashes))
    : null;
  const dependencyLock = finalReplayManifest.dependency_lock && typeof finalReplayManifest.dependency_lock === "object"
    ? (finalReplayManifest.dependency_lock as Record<string, unknown>)
    : {};
  const reportBindings = bindingRecord.final_authority_report_bindings && typeof bindingRecord.final_authority_report_bindings === "object"
    ? (bindingRecord.final_authority_report_bindings as Record<string, unknown>)
    : null;
  const reportBindingMatches = (bindingKey: string, reportPathKey: string): boolean => {
    const binding = reportBindings?.[bindingKey];
    if (!binding || typeof binding !== "object") {
      return false;
    }
    const bindingEntry = binding as Record<string, unknown>;
    const reportPath = report[reportPathKey];
    return (
      typeof reportPath === "string" &&
      typeof bindingEntry.path === "string" &&
      bindingEntry.path.replace(/\\/g, "/") === reportPath.replace(/\\/g, "/") &&
      hashJsonInsideProject(projectRoot, bindingEntry.path) === bindingEntry.sha256
    );
  };
  const reportPathMatchesFinalReplay = (reportPathKey: string, finalReplayReportKey: string): boolean => {
    const reportPath = report[reportPathKey];
    return typeof reportPath === "string" && finalReplayReportPathMatches(finalReplayManifest, finalReplayReportKey, reportPath);
  };
  return (
    typeof bindingRecord.formal_spec_lock_path === "string" &&
    hashJsonInsideProject(projectRoot, bindingRecord.formal_spec_lock_path) === bindingRecord.formal_spec_lock_sha256 &&
    projectFormalSpecLockBindingValid({
      projectRoot,
      relativePath: bindingRecord.formal_spec_lock_path,
      bindingScope,
      taskId: bindingRecord.task_id,
      campaignId: bindingRecord.campaign_id,
      claimId: bindingRecord.claim_id as string,
      lockedStatementHash: request.locked_statement_hash,
      finalReplayManifest,
      statementCheckPath: report.statement_check_path as string
    }) &&
    typeof bindingRecord.assumption_ledger_path === "string" &&
    hashJsonInsideProject(projectRoot, bindingRecord.assumption_ledger_path) === bindingRecord.assumption_ledger_sha256 &&
    projectAssumptionLedgerBindingValid({
      projectRoot,
      relativePath: bindingRecord.assumption_ledger_path,
      bindingScope,
      taskId: bindingRecord.task_id,
      campaignId: bindingRecord.campaign_id,
      claimId: bindingRecord.claim_id as string,
      lockedStatementHash: request.locked_statement_hash
    }) &&
    dependencyLockHash === bindingRecord.dependency_lock_sha256 &&
    artifactHashesHash === bindingRecord.artifact_hashes_sha256 &&
    dependencyLock.lean_toolchain_sha256 === bindingRecord.toolchain_sha256 &&
    hashJsonInsideProject(projectRoot, report.final_replay_manifest_v3_path as string) === bindingRecord.replay_manifest_sha256 &&
    reportPathMatchesFinalReplay("dependency_closure_path", "dependency_closure") &&
    reportPathMatchesFinalReplay("axiom_profile_path", "axiom_profile") &&
    reportPathMatchesFinalReplay("statement_check_path", "statement_equivalence") &&
    reportBindingMatches("structured_audit", "structured_audit_path") &&
    reportBindingMatches("dependency_closure", "dependency_closure_path") &&
    reportBindingMatches("axiom_profile", "axiom_profile_path") &&
    reportBindingMatches("statement_check", "statement_check_path")
  );
}

function hasVerifiedFinalAuthorityPackagingV3(
  projectRoot: string,
  request: Pick<ClaimPromotionRequest, "claim_id"> & { locked_statement_hash: string },
  artifacts: ArtifactRef[]
): boolean {
  for (const packagingArtifact of artifacts) {
    if (packagingArtifact.kind !== "runner_output") {
      continue;
    }
    const packaging = readJsonArtifact(projectRoot, packagingArtifact);
    if (!packaging || typeof packaging !== "object") {
      continue;
    }
    const report = packaging as Record<string, unknown>;
    const schemaVersion = report.schema_version;
    if (schemaVersion !== "comath.final_authority_packaging.v3") {
      continue;
    }
    if (report.claim_id !== request.claim_id) {
      continue;
    }
    if (
      report.final_evidence_status !== "verified_final_authority_evidence" ||
      report.proof_authority !== "lean_kernel_clean_replay" ||
      report.can_promote_claim !== false ||
      report.promotion_requires_gate !== true
    ) {
      continue;
    }
    const missing = Array.isArray(report.missing_final_evidence_classes) ? report.missing_final_evidence_classes : ["missing"];
    if (missing.length !== 0) {
      continue;
    }
    if (report.final_replay_manifest_v3_path !== undefined && typeof report.final_replay_manifest_v3_path !== "string") {
      continue;
    }
    const manifestPath = typeof report.final_replay_manifest_v3_path === "string" ? report.final_replay_manifest_v3_path : "";
    const finalReplay = readJsonInsideProject(projectRoot, manifestPath);
    const parsed = finalReplayManifestV3Schema.safeParse(finalReplay);
    if (!parsed.success || parsed.data.claim_id !== request.claim_id || parsed.data.result !== "pass" || parsed.data.exit_code !== 0) {
      continue;
    }
    const requestedManifestArtifact = artifacts.some((artifact) => {
      if (artifact.kind !== "runner_output") {
        return false;
      }
      const artifactManifest = finalReplayManifestV3Schema.safeParse(readJsonArtifact(projectRoot, artifact));
      return artifactManifest.success && artifactManifest.data.claim_id === parsed.data.claim_id && artifactManifest.data.replay_id === parsed.data.replay_id;
    });
    if (!requestedManifestArtifact) {
      continue;
    }
    const finalReplayVerification = verifyFinalReplayManifestV3(projectRoot, finalReplay);
    if (!finalReplayVerification.ok) {
      continue;
    }
    if (!hasFinalReplayRegistryProvenanceV3(projectRoot, parsed.data)) {
      continue;
    }
    if (!leanRunManifestPathsMatchAndVerify(projectRoot, report, finalReplay as Record<string, unknown>)) {
      continue;
    }
    if (!hasLeanLakeBinaryHashProvenanceV3(projectRoot, finalReplay as Record<string, unknown>)) {
      continue;
    }
    if (!hasVerifiedDerivedBindingManifest(projectRoot, request, report, finalReplay as Record<string, unknown>, artifacts)) {
      continue;
    }
    if (typeof report.structured_audit_path !== "string" || !reportPasses(projectRoot, report.structured_audit_path)) {
      continue;
    }
    if (typeof report.dependency_closure_path !== "string" || !reportPasses(projectRoot, report.dependency_closure_path)) {
      continue;
    }
    if (typeof report.axiom_profile_path !== "string" || !reportPasses(projectRoot, report.axiom_profile_path)) {
      continue;
    }
    if (typeof report.statement_check_path !== "string" || !reportPasses(projectRoot, report.statement_check_path)) {
      continue;
    }
    if (projectJsonStringField(projectRoot, report.statement_check_path, "locked_statement_hash") !== request.locked_statement_hash) {
      continue;
    }
    if (
      typeof report.third_party_replay_pack_path !== "string" ||
      !replayPackMatchesFinalReplay(projectRoot, report.third_party_replay_pack_path, finalReplay as Record<string, unknown>)
    ) {
      continue;
    }
    return true;
  }
  return false;
}

function hasPromotionGradeLeanAuthorityEvidence(
  projectRoot: string,
  request: Pick<ClaimPromotionRequest, "claim_id"> & { locked_statement_hash: string },
  artifacts: ArtifactRef[]
): boolean {
  return hasVerifiedFinalAuthorityPackagingV3(projectRoot, request, artifacts);
}

function finalAuthorityDerivedBindingVetoes(
  projectRoot: string,
  request: Pick<ClaimPromotionRequest, "claim_id"> & { locked_statement_hash: string },
  artifacts: ArtifactRef[]
): string[] {
  const vetoes: string[] = [];
  for (const artifact of artifacts) {
    const packaging = readJsonArtifact(projectRoot, artifact);
    if (!packaging || typeof packaging !== "object") {
      continue;
    }
    const report = packaging as Record<string, unknown>;
    if (report.schema_version !== "comath.final_authority_packaging.v3") {
      continue;
    }
    if (typeof report.source_packaging_report_path !== "string" || !report.source_packaging_report_path.endsWith("/derived_final_authority_bindings_v3.json")) {
      continue;
    }
    const binding = requestedJsonArtifactByPath(projectRoot, artifacts, report.source_packaging_report_path);
    if (!binding) {
      vetoes.push("final authority derived binding manifest missing");
      continue;
    }
    const manifestPath = typeof report.final_replay_manifest_v3_path === "string" ? report.final_replay_manifest_v3_path : "";
    const finalReplay = readJsonInsideProject(projectRoot, manifestPath);
    if (!finalReplay || typeof finalReplay !== "object" || !hasVerifiedDerivedBindingManifest(projectRoot, request, report, finalReplay as Record<string, unknown>, artifacts)) {
      vetoes.push("final authority derived binding manifest mismatch");
    }
  }
  return [...new Set(vetoes)];
}

function finalAuthorityProvenanceVetoes(projectRoot: string, artifacts: ArtifactRef[]): string[] {
  const vetoes: string[] = [];
  for (const artifact of artifacts) {
    if (artifact.kind !== "runner_output") {
      continue;
    }
    const packaging = readJsonArtifact(projectRoot, artifact);
    if (!packaging || typeof packaging !== "object") {
      continue;
    }
    const report = packaging as Record<string, unknown>;
    if (
      report.schema_version !== "comath.final_authority_packaging.v3" ||
      typeof report.final_replay_manifest_v3_path !== "string"
    ) {
      continue;
    }
    const finalReplay = readJsonInsideProject(projectRoot, report.final_replay_manifest_v3_path);
    const verification = verifyFinalReplayManifestV3(projectRoot, finalReplay);
    if (verification.ok && !hasFinalReplayRegistryProvenanceV3(projectRoot, finalReplay)) {
      vetoes.push("formally_checked requires service-owned clean replay provenance");
    }
  }
  return [...new Set(vetoes)];
}

function finalAuthorityBinaryHashProvenanceVetoes(projectRoot: string, artifacts: ArtifactRef[]): string[] {
  const vetoes: string[] = [];
  for (const artifact of artifacts) {
    if (artifact.kind !== "runner_output") {
      continue;
    }
    const packaging = readJsonArtifact(projectRoot, artifact);
    if (!packaging || typeof packaging !== "object") {
      continue;
    }
    const report = packaging as Record<string, unknown>;
    if (
      report.schema_version !== "comath.final_authority_packaging.v3" ||
      typeof report.final_replay_manifest_v3_path !== "string"
    ) {
      continue;
    }
    const finalReplay = readJsonInsideProject(projectRoot, report.final_replay_manifest_v3_path);
    if (!finalReplay || typeof finalReplay !== "object" || !hasLeanLakeBinaryHashProvenanceV3(projectRoot, finalReplay as Record<string, unknown>)) {
      vetoes.push("formally_checked requires Lean/Lake binary hash provenance");
    }
  }
  return [...new Set(vetoes)];
}

function finalAuthorityLeanRunManifestProvenanceVetoes(projectRoot: string, artifacts: ArtifactRef[]): string[] {
  const vetoes: string[] = [];
  const checkFinalReplay = (finalReplay: unknown) => {
    if (!finalReplay || typeof finalReplay !== "object") {
      return;
    }
    const replayPaths = stringArray((finalReplay as Record<string, unknown>).lean_run_manifest_paths).map(normalizedStoredPath);
    for (const manifestPath of replayPaths) {
      const manifest = readJsonInsideProject(projectRoot, manifestPath);
      if (
        verifyLeanRunManifestV3Evidence(projectRoot, manifest).ok &&
        !hasLeanRunManifestProvenanceIndexV1({ projectRoot, manifest, manifest_path: manifestPath })
      ) {
        vetoes.push("formally_checked requires LeanRunManifest provenance index");
      }
    }
  };

  for (const artifact of artifacts) {
    if (artifact.kind !== "runner_output") {
      continue;
    }
    const artifactManifest = finalReplayManifestV3Schema.safeParse(readJsonArtifact(projectRoot, artifact));
    if (artifactManifest.success) {
      checkFinalReplay(artifactManifest.data);
    }
    const packaging = readJsonArtifact(projectRoot, artifact);
    if (!packaging || typeof packaging !== "object") {
      continue;
    }
    const report = packaging as Record<string, unknown>;
    if (
      report.schema_version !== "comath.final_authority_packaging.v3" ||
      report.final_evidence_status !== "verified_final_authority_evidence" ||
      typeof report.final_replay_manifest_v3_path !== "string"
    ) {
      continue;
    }
    const finalReplay = readJsonInsideProject(projectRoot, report.final_replay_manifest_v3_path);
    if (!finalReplay || typeof finalReplay !== "object") {
      continue;
    }
    checkFinalReplay(finalReplay);
  }
  return [...new Set(vetoes)];
}

function finalReplayManifestArtifactKindVetoes(projectRoot: string, artifacts: ArtifactRef[]): string[] {
  const vetoes: string[] = [];
  for (const artifact of artifacts) {
    if (artifact.kind === "runner_output") {
      continue;
    }
    const artifactManifest = finalReplayManifestV3Schema.safeParse(readJsonArtifact(projectRoot, artifact));
    if (artifactManifest.success) {
      vetoes.push("formally_checked requires final replay manifest runner_output artifact provenance");
    }
  }
  return [...new Set(vetoes)];
}

function hasPassedLeanAuthorityReplayEvidence(
  projectRoot: string,
  request: Pick<ClaimPromotionRequest, "claim_id"> & { locked_statement_hash: string },
  artifacts: ArtifactRef[]
): boolean {
  return hasVerifiedFinalAuthorityPackagingV3(projectRoot, request, artifacts);
}

function evidenceBindingVetoes(projectRoot: string, request: ClaimPromotionRequest): string[] {
  const vetoes: string[] = [];
  const evidenceById = new Map(readEvidenceRecords(projectRoot, request.project_id).map((record) => [record.id, record]));
  const artifactsById = new Map(listArtifactRefs(projectRoot).filter((artifact) => artifact.project_id === request.project_id).map((artifact) => [artifact.id, artifact]));
  const requestedArtifactIds = new Set(request.artifact_ids);

  for (const evidenceId of request.evidence_ids) {
    const evidence = evidenceById.get(evidenceId);
    if (!evidence) {
      vetoes.push(`promotion evidence not found: ${evidenceId}`);
      continue;
    }
    if (evidence.project_id !== request.project_id) {
      vetoes.push(`promotion evidence project mismatch: ${evidenceId}`);
    }
    if (evidence.claim_id !== request.claim_id) {
      vetoes.push(`promotion evidence claim mismatch: ${evidenceId}`);
    }
    for (const artifactId of evidence.artifact_ids) {
      if (!requestedArtifactIds.has(artifactId)) {
        vetoes.push(`promotion artifact missing for evidence: ${evidenceId}:${artifactId}`);
      }
    }
  }

  for (const artifactId of request.artifact_ids) {
    const artifact = artifactsById.get(artifactId);
    if (!artifact) {
      vetoes.push(`promotion artifact not found: ${artifactId}`);
      continue;
    }
    if (artifact.project_id !== request.project_id) {
      vetoes.push(`promotion artifact project mismatch: ${artifactId}`);
    }
    try {
      const path = assertPathAllowed(projectRoot, artifact.path, { purpose: "read", resolveRealpath: true });
      const hash = sha256FileSync(path);
      if (hash.sha256 !== artifact.sha256 || (artifact.size_bytes !== undefined && hash.size_bytes !== artifact.size_bytes)) {
        vetoes.push(`promotion artifact hash mismatch: ${artifactId}`);
      }
    } catch {
      vetoes.push(`promotion artifact unreadable: ${artifactId}`);
    }
  }

  return vetoes;
}

function statusEvidenceVetoes(projectRoot: string, claim: Claim, request: ClaimPromotionRequest): string[] {
  const evidence = evidenceForRequest(projectRoot, request);
  const artifacts = artifactsForRequest(projectRoot, request);
  const kinds = new Set(evidence.map((record) => record.kind));
  const artifactKinds = new Set(artifacts.map((artifact) => artifact.kind));
  const vetoes: string[] = [];

  if (request.target_status === "symbolically_checked") {
    if (!kinds.has("symbolic")) {
      vetoes.push("symbolically_checked requires symbolic evidence");
    }
    if (!artifactKinds.has("runner_output")) {
      vetoes.push("symbolically_checked requires runner_output artifact");
    }
    const reports = runnerReportsForEvidence(projectRoot, request, evidence, artifacts, new Set(["symbolic"]));
    if (reports.some((report) => !report.trusted_audit)) {
      vetoes.push("runner_output missing trusted runner audit provenance");
    }
    if (
      !reports.some(
        (report) =>
          report.trusted_audit &&
          report.ok &&
          report.supports_status === "symbolically_checked" &&
          report.exactness === "exact_symbolic" &&
          report.vetoes.length === 0
      )
    ) {
      vetoes.push("symbolically_checked requires successful symbolic runner output");
    }
  }

  if (request.target_status === "computationally_supported") {
    if (!kinds.has("computation") && !kinds.has("counterexample")) {
      vetoes.push("computationally_supported requires computation evidence");
    }
    if (!artifactKinds.has("runner_output")) {
      vetoes.push("computationally_supported requires runner_output artifact");
    }
    const reports = runnerReportsForEvidence(projectRoot, request, evidence, artifacts, new Set(["computation", "counterexample"]));
    if (reports.some((report) => !report.trusted_audit)) {
      vetoes.push("runner_output missing trusted runner audit provenance");
    }
    if (
      !reports.some(
        (report) =>
          report.trusted_audit &&
          report.ok &&
          report.supports_status === "computationally_supported" &&
          (report.exactness === "numeric_search" || report.exactness === "exact_symbolic")
      )
    ) {
      vetoes.push("computationally_supported requires successful computation runner output");
    }
  }

  if (request.target_status === "literature_supported") {
    if (!kinds.has("literature")) {
      vetoes.push("literature_supported requires literature evidence");
    }
    if (![...artifactKinds].some((kind) => kind === "bibtex" || kind === "pdf")) {
      vetoes.push("literature_supported requires exact literature artifact");
    }
  }

  if (request.target_status === "lean_skeleton") {
    if (!kinds.has("lean") && !kinds.has("audit")) {
      vetoes.push("lean_skeleton requires lean or audit evidence");
    }
  }

  if (request.target_status === "formally_checked") {
    const authorityRequest = { ...request, locked_statement_hash: claim.statement_hash };
    if (!kinds.has("lean")) {
      vetoes.push("formally_checked requires lean evidence");
    }
    if (!artifactKinds.has("code") && !artifactKinds.has("runner_output")) {
      vetoes.push("formally_checked requires proof artifact");
    }
    if (!hasPassedLeanAuthorityReplayEvidence(projectRoot, authorityRequest, artifacts)) {
      vetoes.push("formally_checked requires passed proof-kernel final replay manifest");
    }
    if (!hasPromotionGradeLeanAuthorityEvidence(projectRoot, authorityRequest, artifacts)) {
      vetoes.push("formally_checked requires hash-bound fresh final replay artifacts");
    }
    if (!hasVerifiedFinalAuthorityPackagingV3(projectRoot, authorityRequest, artifacts)) {
      vetoes.push("formally_checked requires Lean Authority v3 final replay packaging");
    }
    vetoes.push(...finalAuthorityDerivedBindingVetoes(projectRoot, authorityRequest, artifacts));
    vetoes.push(...finalAuthorityProvenanceVetoes(projectRoot, artifacts));
    vetoes.push(...finalAuthorityLeanRunManifestProvenanceVetoes(projectRoot, artifacts));
    vetoes.push(...finalAuthorityBinaryHashProvenanceVetoes(projectRoot, artifacts));
    vetoes.push(...finalReplayManifestArtifactKindVetoes(projectRoot, artifacts));
  }

  return vetoes;
}

function vetoesForRequest(projectRoot: string, claim: Claim, request: ClaimPromotionRequest): string[] {
  const vetoes: string[] = [];

  if (request.evidence_ids.length === 0) {
    vetoes.push("promotion requires linked evidence_ids");
  }
  if (request.artifact_ids.length === 0) {
    vetoes.push("promotion requires linked artifact_ids");
  }
  vetoes.push(...evidenceBindingVetoes(projectRoot, request));
  vetoes.push(...statusEvidenceVetoes(projectRoot, claim, request));

  if (request.target_status === "formally_checked") {
    if (claim.formalization_status !== "kernel_checked") {
      vetoes.push("formally_checked requires kernel_checked formalization");
    }
    if (claim.dependency_closure_status !== "all_dependencies_present") {
      vetoes.push("formally_checked requires all_dependencies_present");
    }
    if (claim.audit_state !== "audit_passed") {
      vetoes.push("formally_checked requires audit_passed");
    }
  }

  if (request.target_status === "human_accepted") {
    vetoes.push("human_accepted cannot substitute for mathematical evidence in Phase 4");
  }

  if (
    request.target_status === "literature_supported" &&
    !hasSuccessfulCitationConditionMatch(
      projectRoot,
      request.project_id,
      request.claim_id,
      request.evidence_ids,
      request.artifact_ids
    )
  ) {
    vetoes.push("literature_supported requires successful citation condition match");
  }

  if (!["literature_supported", "computationally_supported", "symbolically_checked", "lean_skeleton", "formally_checked", "human_accepted"].includes(request.target_status)) {
    vetoes.push(`unsupported promotion target: ${request.target_status}`);
  }

  return vetoes;
}

export function runClaimPromotionGate(projectRoot: string, request: ClaimPromotionRequest): GateResult {
  const claim = getClaim(projectRoot, request.project_id, request.claim_id);
  if (!claim) {
    throw new ComathError("claim not found", { statusCode: 404, code: "CLAIM_NOT_FOUND" });
  }

  const existing = readGateResults(projectRoot, request.project_id);
  const vetoes = [...vetoesForRequest(projectRoot, claim, request), ...(request.external_vetoes ?? [])];
  const warnings = vetoes.length === 0 ? [...(request.external_warnings ?? [])] : ["promotion gate failed closed", ...(request.external_warnings ?? [])];
  return gateResultSchema.parse({
    id: nextSequentialId("GR", existing.map((gate) => gate.id)),
    project_id: request.project_id,
    claim_id: request.claim_id,
    ok: vetoes.length === 0,
    target_status: request.target_status,
    vetoes,
    warnings,
    evidence_ids: request.evidence_ids,
    artifact_ids: request.artifact_ids,
    created_at: now()
  });
}

export function applyClaimPromotionDecision(
  projectRoot: string,
  claim: Claim,
  gate: GateResult,
  actor: string
): Claim {
  if (!gate.ok) {
    appendAuditEvent(projectRoot, {
      project_id: gate.project_id,
      event_type: "claim.promotion_rejected",
      actor,
      target_id: gate.claim_id,
      payload: {
        gate_result_id: gate.id,
        target_status: gate.target_status,
        vetoes: gate.vetoes
      }
    });
    return claim;
  }

  const promoted = claimSchema.parse({
    ...claim,
    status: gate.target_status,
    gate_result_id: gate.id,
    evidence_level: evidenceLevelForStatus(gate.target_status, claim.evidence_level),
    updated_at: now()
  });
  const stored = applyGatePromotedClaim(projectRoot, promoted);
  appendAuditEvent(projectRoot, {
    project_id: gate.project_id,
    event_type: "claim.promoted",
    actor,
    target_id: gate.claim_id,
    payload: {
      gate_result_id: gate.id,
      target_status: gate.target_status
    }
  });
  return stored;
}

function evidenceLevelForStatus(status: ClaimStatus, current: Claim["evidence_level"]): Claim["evidence_level"] {
  const levels: Partial<Record<ClaimStatus, Claim["evidence_level"]>> = {
    literature_supported: 2,
    computationally_supported: 2,
    symbolically_checked: 3,
    lean_skeleton: 3,
    formally_checked: 5,
    human_accepted: current
  };
  const level = levels[status] ?? current;
  return level > current ? level : current;
}

export function promoteClaim(projectRoot: string, request: ClaimPromotionRequest): ClaimPromotionDecision {
  const claim = getClaim(projectRoot, request.project_id, request.claim_id);
  if (!claim) {
    throw new ComathError("claim not found", { statusCode: 404, code: "CLAIM_NOT_FOUND" });
  }

  const gate = runClaimPromotionGate(projectRoot, request);
  writeGateResults(projectRoot, [...readGateResults(projectRoot), gate]);
  return {
    gate,
    claim: applyClaimPromotionDecision(projectRoot, claim, gate, request.actor)
  };
}
