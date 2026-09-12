import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";
import { isAbsolute, relative, resolve } from "node:path";
import { URL } from "node:url";
import { createHash } from "node:crypto";
import { realpathSync, readFileSync, statSync } from "node:fs";
import { ComathError, toComathError } from "../errors.js";
import { loadConfig, researchConfigSchema } from "../config/config.js";
import { acquireResearchDaemon, type ResearchDaemonOptions, type ResearchDaemonReference } from "../research/daemon-runtime.js";
import { authenticateHost, authenticateOperator, authenticateResearchReader } from "../control/operator-auth.js";
import { dispatchResearchRoute } from "../control/research-routes.js";
import { getAcquiredProjectRuntime } from "../research/project-runtime.js";
import { getProofWorkflowBridge } from "../research/proof-workflow-bridge.js";
import { shutdownLegacyRuntime } from "../agents/runtime/legacy-runtime-facade.js";
import { artifactPathForHash, listArtifactRefs } from "../artifacts/store.js";
import { getComathdStatus } from "../status.js";
import { getProjectStatus, initProject, openProject } from "../project/project-store.js";
import { getClaim, linkClaims, readClaims, registerClaim, updateClaim } from "../claim/claim-store.js";
import { readEvidenceRecords } from "../evidence/store.js";
import { promoteClaim, readGateResults } from "../verification/gate.js";
import {
  checkPaper,
  exportPaper,
  initPaper,
  readPaperState,
  renderClaimBlock,
  updatePaperSection
} from "../artifacts/paper.js";
import { exportSnapshot, restoreSnapshot, verifySnapshot } from "../artifacts/snapshots.js";
import {
  checkCitationConditions,
  importBibTeX,
  importLiteraturePdf,
  listCitationConditionMatches,
  listCitations,
  registerCitation
} from "../literature/index.js";
import { InMemoryResearchMemoryDB } from "../memory/in-memory-research-memory-db.js";
import { buildGraphPatchFromWorkstream } from "../memory/builder.js";
import { applyAcceptedGraphPatch, reviewGraphPatch } from "../memory/graph-patch.js";
import {
  getWorkstreamStatus,
  listWorkstreams,
  readWorkstreamBundle,
  spawnWorkstream,
  transitionWorkstreamStatus,
  writeWorkstreamReport
} from "../workstream/workstream-store.js";
import { getCampaign, writeCampaign } from "../proof-kernel/campaign/research-campaign.js";
import {
  exportCampaignGoalModeEvidence,
  repairStageGateAndResume,
  replayCampaign,
  startCampaign,
  tickCampaign
} from "../proof-kernel/campaign/campaign-tick.js";
import {
  sanitizePublicFormalAuthorityVocabulary,
  withPublicExternalV3CampaignResult,
  withPublicExternalV3TerminalState
} from "../proof-kernel/campaign/external-terminal-vocabulary.js";
import { runV3NegativeGaSlices } from "../release/v3-negative-ga-slices.js";
import { assembleSourceReviewPublicArchive } from "../release/source-review-public-archive.js";
import { reviewGoal3PublicArchiveSurfaces } from "../release/public-archive-review.js";
import { recordGoal3GaOperationalReadinessReview } from "../release/goal3-ga-operational-readiness.js";
import { recordGoal3DurableTransportReleaseSignoffPrerequisite } from "../release/goal3-ga-transport-chain-freshness.js";
import { recordGoal3FinalReleaseSignoffDecision } from "../release/goal3-final-release-signoff-decision.js";
import { recordGoal3DurableTransportReleaseSignoffVerification } from "../release/goal3-durable-transport-release-signoff-verification.js";
import { recordGoal3FinalReleaseSignoffCertificationBoundaryReview } from "../release/goal3-final-release-signoff-certification-boundary-review.js";
import { recordGoal3FinalReleaseCandidateClosureAudit } from "../release/goal3-final-release-candidate-closure-audit.js";
import { recordGoal3ReleaseCandidateProofBreadthReview } from "../release/goal3-proof-breadth-review.js";
import { recordGoal3ReleaseCandidateProofBreadthClosure } from "../release/goal3-proof-breadth-closure.js";
import { recordGoal3ReleaseCandidateProofBreadthExecutionBridge } from "../release/goal3-proof-breadth-execution-bridge.js";
import { recordGoal3ReleaseCandidateProofBreadthExecutionFollowThrough } from "../release/goal3-proof-breadth-execution-follow-through.js";
import { recordGoal3ReleaseCandidateProofBreadthTaskLocalPackagingFollowThrough } from "../release/goal3-proof-breadth-task-local-packaging-follow-through.js";
import { recordGoal3ReleaseCandidateProofBreadthSelectedTranchePackagingResultsFollowUp } from "../release/goal3-proof-breadth-selected-tranche-packaging-results-follow-up.js";
import { recordGoal3ReleaseCandidateProofBreadthSelectedTrancheClosureRecheck } from "../release/goal3-proof-breadth-selected-tranche-closure-recheck.js";
import { recordGoal3ReleaseCandidateProofBreadthSelectedTrancheNextExecutionBridge } from "../release/goal3-proof-breadth-selected-tranche-next-execution-bridge.js";
import { recordGoal3ReleaseCandidateProofBreadthSelectedTrancheNextPackagingFollowThrough } from "../release/goal3-proof-breadth-selected-tranche-next-packaging-follow-through.js";
import { recordGoal3ReleaseCandidateProofBreadthSelectedTrancheNextPackagingResultsFollowUp } from "../release/goal3-proof-breadth-selected-tranche-next-packaging-results-follow-up.js";
import { recordGoal3ReleaseCandidateProofBreadthSelectedTrancheNextClosureRecheck } from "../release/goal3-proof-breadth-selected-tranche-next-closure-recheck.js";
import { recordGoal3ReleaseCandidateProofBreadthSelectedTrancheNextClosureExecutionBridge } from "../release/goal3-proof-breadth-selected-tranche-next-closure-execution-bridge.js";
import { recordGoal3ReleaseCandidateProofBreadthSelectedTrancheNextClosurePackagingFollowThrough } from "../release/goal3-proof-breadth-selected-tranche-next-closure-packaging-follow-through.js";
import { recordGoal3ReleaseCandidateProofBreadthSelectedTrancheNextClosurePackagingResultsFollowUp } from "../release/goal3-proof-breadth-selected-tranche-next-closure-packaging-results-follow-up.js";
import { recordGoal3ReleaseCandidateProofBreadthSelectedTrancheNextClosurePackagingResultsClosureRecheck } from "../release/goal3-proof-breadth-selected-tranche-next-closure-packaging-results-closure-recheck.js";
import { recordGoal3ReleaseCandidateProofBreadthSelectedTrancheNextClosurePackagingResultsClosureExecutionBridge } from "../release/goal3-proof-breadth-selected-tranche-next-closure-packaging-results-closure-execution-bridge.js";
import { recordGoal3ReleaseCandidateProofBreadthSelectedTrancheNextClosurePackagingResultsClosureExecutionPackagingFollowThrough } from "../release/goal3-proof-breadth-selected-tranche-next-closure-packaging-results-closure-execution-packaging-follow-through.js";
import { recordGoal3ReleaseCandidateProofBreadthSelectedTrancheNextClosurePackagingResultsClosureExecutionPackagingResultsFollowUp } from "../release/goal3-proof-breadth-selected-tranche-next-closure-packaging-results-closure-execution-packaging-results-follow-up.js";
import { recordGoal3ReleaseCandidateProofBreadthSelectedTrancheNextClosurePackagingResultsClosureExecutionPackagingResultsClosureRecheck } from "../release/goal3-proof-breadth-selected-tranche-next-closure-packaging-results-closure-execution-packaging-results-closure-recheck.js";
import { recordGoal3ReleaseCandidateProofBreadthSelectedTrancheNextClosurePackagingResultsClosureExecutionPackagingResultsClosureExecutionBridge } from "../release/goal3-proof-breadth-selected-tranche-next-closure-packaging-results-closure-execution-packaging-results-closure-execution-bridge.js";
import { recordGoal3ReleaseCandidateProofBreadthSelectedTrancheNextClosurePackagingResultsClosureExecutionPackagingResultsClosureExecutionPackagingFollowThrough } from "../release/goal3-proof-breadth-selected-tranche-next-closure-packaging-results-closure-execution-packaging-results-closure-execution-packaging-follow-through.js";
import { recordGoal3ReleaseCandidateProofBreadthSelectedTrancheNextClosurePackagingResultsClosureExecutionPackagingResultsClosureExecutionPackagingResultsFollowUp } from "../release/goal3-proof-breadth-selected-tranche-next-closure-packaging-results-closure-execution-packaging-results-closure-execution-packaging-results-follow-up.js";
import { recordGoal3ReleaseCandidateProofBreadthSelectedTrancheNextClosurePackagingResultsClosureExecutionPackagingResultsClosureExecutionPackagingResultsClosureRecheck } from "../release/goal3-proof-breadth-selected-tranche-next-closure-packaging-results-closure-execution-packaging-results-closure-execution-packaging-results-closure-recheck.js";
import { recordGoal3ReleaseCandidateProofBreadthSelectedTrancheNextClosurePackagingResultsClosureExecutionPackagingResultsClosureExecutionPackagingResultsClosureExecutionBridge } from "../release/goal3-proof-breadth-selected-tranche-next-closure-packaging-results-closure-execution-packaging-results-closure-execution-packaging-results-closure-execution-bridge.js";
import { recordGoal3ReleaseCandidateProofBreadthSelectedTrancheNextClosurePackagingResultsClosureExecutionPackagingResultsClosureExecutionPackagingResultsClosureExecutionPackagingFollowThrough } from "../release/goal3-proof-breadth-selected-tranche-next-closure-packaging-results-closure-execution-packaging-results-closure-execution-packaging-results-closure-execution-packaging-follow-through.js";
import { recordGoal3ReleaseCandidateProofBreadthSelectedTrancheNextClosurePackagingResultsClosureExecutionPackagingResultsClosureExecutionPackagingResultsClosureExecutionPackagingResultsFollowUp } from "../release/goal3-proof-breadth-selected-tranche-next-closure-packaging-results-closure-execution-packaging-results-closure-execution-packaging-results-closure-execution-packaging-results-follow-up.js";
import { recordGoal3ReleaseCandidateProofBreadthSelectedTrancheNextClosurePackagingResultsClosureExecutionPackagingResultsClosureExecutionPackagingResultsClosureExecutionPackagingResultsClosureRecheck } from "../release/goal3-proof-breadth-selected-tranche-next-closure-packaging-results-closure-execution-packaging-results-closure-execution-packaging-results-closure-execution-packaging-results-closure-recheck.js";
import { recordGoal3ReleaseCandidateProofBreadthSelectedTrancheNextClosurePackagingResultsClosureExecutionPackagingResultsClosureExecutionPackagingResultsClosureExecutionPackagingResultsClosureExecutionBridge } from "../release/goal3-proof-breadth-selected-tranche-next-closure-packaging-results-closure-execution-packaging-results-closure-execution-packaging-results-closure-execution-packaging-results-closure-execution-bridge.js";
import { recordGoal3ReleaseCandidateProofBreadthSelectedTrancheNextClosurePackagingResultsClosureExecutionPackagingResultsClosureExecutionPackagingResultsClosureExecutionPackagingResultsClosureExecutionPackagingFollowThrough } from "../release/goal3-proof-breadth-selected-tranche-next-closure-packaging-results-closure-execution-packaging-results-closure-execution-packaging-results-closure-execution-packaging-results-closure-execution-packaging-follow-through.js";
import { recordGoal3ReleaseCandidateProofBreadthSelectedTrancheNextClosurePackagingResultsClosureExecutionPackagingResultsClosureExecutionPackagingResultsClosureExecutionPackagingResultsClosureExecutionPackagingResultsFollowUp } from "../release/goal3-proof-breadth-selected-tranche-next-closure-packaging-results-closure-execution-packaging-results-closure-execution-packaging-results-closure-execution-packaging-results-closure-execution-packaging-results-follow-up.js";
import { recordGoal3ReleaseCandidateProofBreadthSelectedTrancheNextClosurePackagingResultsClosureExecutionPackagingResultsClosureExecutionPackagingResultsClosureExecutionPackagingResultsClosureExecutionPackagingResultsClosureRecheck } from "../release/goal3-proof-breadth-selected-tranche-next-closure-packaging-results-closure-execution-packaging-results-closure-execution-packaging-results-closure-execution-packaging-results-closure-execution-packaging-results-closure-recheck.js";
import { recordGoal3ReleaseCandidateProofBreadthSelectedTrancheNextClosurePackagingResultsClosureExecutionPackagingResultsClosureExecutionPackagingResultsClosureExecutionPackagingResultsClosureExecutionPackagingResultsClosureExecutionBridge } from "../release/goal3-proof-breadth-selected-tranche-next-closure-packaging-results-closure-execution-packaging-results-closure-execution-packaging-results-closure-execution-packaging-results-closure-execution-packaging-results-closure-execution-bridge.js";
import { recordGoal3GaCertificationReview } from "../release/goal3-ga-certification.js";
import { recordGoal3FinalGaAudit } from "../release/goal3-final-ga-audit.js";
import { recordGoal3GaCertificate } from "../release/goal3-ga-certificate.js";
import { recordGoal3GaCertificateConsumptionReview } from "../release/goal3-ga-certificate-consumption.js";
import { recordGoal3SourceBoundReleasePackage } from "../release/goal3-source-bound-release-package.js";
import { recordGoal3SourceAvailableReviewArtifact } from "../release/goal3-source-available-review-artifact.js";
import { recordGoal3SourceArtifactPresentationReview } from "../release/goal3-source-artifact-presentation-review.js";
import { recordGoal3SourceReleasePublicChecklist } from "../release/goal3-source-release-public-checklist.js";
import { recordGoal3SourceReleaseExternalEvidenceBinding } from "../release/goal3-source-release-external-evidence-binding.js";
import { recordGoal3SourceReleaseExternalProviderVerification } from "../release/goal3-source-release-external-provider-verification.js";
import { recordGoal3SourceReleaseExternalProviderPolicyInspection } from "../release/goal3-source-release-external-provider-policy-inspection.js";
import { recordGoal3SourceReleaseOsImmutabilityAttestation } from "../release/goal3-source-release-os-immutability-attestation.js";
import {
  collectPiCodexLifecycleEvidence,
  heartbeatPiCodexLifecycleOperatorTransportLease,
  openPiCodexLifecycleOperatorTransportLease,
  orchestratePiCodexLifecycleAutomaticRealPiExecution,
  persistPiCodexLifecycleOperatorSession,
  probePiCodexProductionCodexAccountNetwork,
  probePiCodexDurableServiceLifecycle,
  probePiCodexRealPiInstallRuntimeRegistration,
  recordPiCodexLifecycleGuidedRealPiExecution,
  recordPiCodexLifecycleOperatorServiceTransportContinuity,
  recordPiCodexLifecycleOperatorServiceTransportContract,
  recordPiCodexLifecycleOperatorServiceTransportClosureReview,
  recordPiCodexLifecycleUnattendedRealHostDurableTransportContract,
  recordPiCodexLifecycleUnattendedRealHostCompletionCertificationPrerequisite,
  recordPiCodexLifecycleUnattendedRealHostTerminalCompletionCertificateDesign,
  recordPiCodexLifecycleUnattendedRealHostTerminalCompletionCertificate,
  recordPiCodexLifecycleUnattendedRealHostExecutionAttempt,
  recordPiCodexLifecycleUnattendedRealHostExecutionReadiness,
  recordPiCodexLifecycleUnattendedRealHostExecutorContract,
  recordPiCodexLifecycleUnattendedRealHostOperatorApproval,
  recoverPiCodexLifecycleOperatorTransport,
  reviewPiCodexLifecycleTerminalExecution,
  reviewPiCodexLifecycleUnattendedRealHostExecutionAttempt,
  reviewPiCodexLifecycleUnattendedRealHostHandoff,
  reviewPiCodexLifecycleReadiness
} from "../release/pi-codex-lifecycle-readiness.js";
import {
  buildAgentProfileLaunch,
  buildAgentAdapterPackageLaunch,
  collectAgentAdapterOsIsolationProviderHelperExecutionEvidence,
  createAgentRunForProfile,
  executeAgentAdapterPackage,
  executeProfileAgentRun,
  probeAgentAdapterOsIsolationProviderHostCapability,
  runAgentAdapterOsIsolationProviderHelperExecution,
  prepareAgentAdapterOsIsolationProviderRunner,
  prepareAgentAdapterOsIsolationSandboxLaunch,
  runAgentAdapterOsIsolationSandboxExecutionProbe,
  validateAgentAdapterOsIsolationProviderHelperHost,
  validateExternalCodexCliInstallation,
  cancelAgentRunFromOperator,
  getAgentProfile,
  formatAgentRunLogSseSession,
  listAgentAdapterPackages,
  probeAgentAdapterOsIsolation,
  readAgentRunOperatorPanel,
  listAgentProfiles,
  formatAgentRunLogSseSnapshot,
  probeAgentAdapterHealth,
  readAgentRunLogs,
  reviewAgentAdapterOsIsolationReadiness,
  streamAgentRunLogs,
  validateAgentProfiles
} from "../agents/index.js";

export type InjectRequest = {
  method: "GET" | "POST";
  path: string;
  body?: unknown;
};

export type InjectResponse = {
  status: number;
  body: any;
  headers?: Record<string, string>;
};

type RouteHandler = (body: unknown, url: URL) => unknown | Promise<unknown>;

type RouteContext = {
  memoryDbs: Map<string, InMemoryResearchMemoryDB>;
  boundRoot?: string;
};

function memoryKey(projectRoot: string, projectId: string): string {
  return `${projectRoot}\0${projectId}`;
}

async function getMemoryDb(context: RouteContext, projectRoot: string, projectId: string): Promise<InMemoryResearchMemoryDB> {
  const key = memoryKey(projectRoot, projectId);
  const existing = context.memoryDbs.get(key);
  if (existing) {
    return existing;
  }
  const db = new InMemoryResearchMemoryDB();
  await db.init(projectRoot, { projectId, backend: "memory" });
  context.memoryDbs.set(key, db);
  return db;
}

function success(body: unknown): InjectResponse {
  return { status: 200, body };
}

type PaperExportRouteResult = Awaited<ReturnType<typeof exportPaper>>;
type SnapshotExportRouteResult = Awaited<ReturnType<typeof exportSnapshot>>;
type SnapshotVerifyRouteResult = Awaited<ReturnType<typeof verifySnapshot>>;
type SnapshotRestoreRouteResult = Awaited<ReturnType<typeof restoreSnapshot>>;

function publicRelativePath(path: string): string {
  return path.replace(/\\/g, "/");
}

function publicHostPathString(value: string): string {
  const normalized = publicRelativePath(value);
  if (
    /[A-Za-z]:\//.test(normalized) ||
    value.includes("\\\\") ||
    value.includes("\\\\?\\") ||
    normalized.startsWith("/") ||
    normalized.startsWith("../") ||
    normalized.includes("/../") ||
    normalized.endsWith("/..")
  ) {
    return "[redacted_unsafe_path]";
  }
  return value;
}

function sanitizePublicHostPathEchoes(value: unknown): unknown {
  if (typeof value === "string") {
    return publicHostPathString(value);
  }
  if (Array.isArray(value)) {
    return value.map((entry) => sanitizePublicHostPathEchoes(entry));
  }
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, entry]) => [
        key,
        sanitizePublicHostPathEchoes(entry)
      ])
    );
  }
  return value;
}

function publicSnapshotRouteValue(value: unknown): unknown {
  return sanitizePublicFormalAuthorityVocabulary(sanitizePublicHostPathEchoes(value));
}

function publicPaperExportRouteResult(result: PaperExportRouteResult): unknown {
  const artifactPath = publicRelativePath(result.artifact.path);
  return sanitizePublicFormalAuthorityVocabulary({
    artifact: {
      ...result.artifact,
      path: artifactPath
    },
    check: result.check,
    exported_relative_path: artifactPath,
    public_archive_contract: {
      kind: "paper_export_public_diagnostic",
      proof_authority: "none",
      can_restore: false,
      exposes_host_paths: false
    }
  });
}

function publicProjectRelativePath(projectRoot: string, path: string): string {
  const root = resolve(projectRoot);
  const absolutePath = isAbsolute(path) ? resolve(path) : resolve(root, path);
  const relativePath = publicRelativePath(relative(root, absolutePath));
  if (
    !relativePath ||
    relativePath === "." ||
    relativePath === ".." ||
    relativePath.startsWith("../") ||
    /[A-Za-z]:\//.test(relativePath) ||
    relativePath.startsWith("/")
  ) {
    return "[redacted_unsafe_path]";
  }
  return relativePath;
}

function publicSnapshotExportRouteResult(projectRoot: string, result: SnapshotExportRouteResult): unknown {
  return publicSnapshotRouteValue({
    snapshot_root: publicProjectRelativePath(projectRoot, result.snapshot_root),
    manifest_path: publicProjectRelativePath(projectRoot, result.manifest_path),
    replay_manifest_path: publicProjectRelativePath(projectRoot, result.replay_manifest_path),
    manifest: result.manifest,
    public_archive_contract: {
      kind: "snapshot_export_public_download",
      proof_authority: "none",
      can_restore: false,
      exposes_host_paths: false,
      internal_restore_required_for_restore: true
    }
  });
}

function publicSnapshotVerifyRouteResult(result: SnapshotVerifyRouteResult): unknown {
  return publicSnapshotRouteValue({
    ok: result.ok,
    vetoes: result.vetoes,
    warnings: result.warnings,
    runner_reexecution: result.runner_reexecution,
    manifest: result.manifest ?? null,
    public_archive_contract: {
      kind: "snapshot_verify_public_diagnostic",
      proof_authority: "none",
      exposes_host_paths: false,
      internal_restore_required_for_restore: true
    }
  });
}

function publicSnapshotRestoreRouteResult(result: SnapshotRestoreRouteResult): unknown {
  return publicSnapshotRouteValue({
    restored_entries: result.restored_entries,
    project_id: result.project_id,
    public_restore_contract: {
      kind: "snapshot_restore_public_diagnostic",
      proof_authority: "none",
      exposes_host_paths: false,
      target_root_redacted: true,
      restored_from: "internal_restore"
    }
  });
}

function publicReplayVerifyRouteResult(result: SnapshotVerifyRouteResult): unknown {
  return publicSnapshotRouteValue({
    ok: result.ok,
    vetoes: result.vetoes,
    warnings: result.warnings,
    runner_reexecution: result.runner_reexecution,
    manifest: result.manifest ?? null,
    replay: result.manifest?.replay ?? null,
    public_archive_contract: {
      kind: "snapshot_replay_verify_public_diagnostic",
      proof_authority: "none",
      exposes_host_paths: false,
      internal_restore_required_for_restore: true
    }
  });
}

type SnapshotManifestRouteBody = {
  project_root?: string;
  manifest_path: string;
};

function routeSnapshotManifestPath(body: SnapshotManifestRouteBody): string {
  if (!body.project_root || isAbsolute(body.manifest_path)) {
    return body.manifest_path;
  }
  const root = resolve(body.project_root);
  const manifestPath = resolve(root, body.manifest_path);
  const relativePath = publicRelativePath(relative(root, manifestPath));
  if (
    relativePath === ".." ||
    relativePath.startsWith("../") ||
    /[A-Za-z]:\//.test(relativePath) ||
    relativePath.startsWith("/")
  ) {
    return body.manifest_path;
  }
  return manifestPath;
}

async function route(method: string, path: string, body: unknown, context: RouteContext): Promise<InjectResponse> {
  const url = new URL(path, "http://127.0.0.1");
  if (context.boundRoot) {
    const payload = body && typeof body === "object" ? body as Record<string, unknown> : {};
    const roots = [payload.project_root, payload.root_path, url.searchParams.get("project_root"), url.searchParams.get("root_path")];
    for (const candidate of roots) if (candidate !== undefined && candidate !== null) {
      let matches = false;
      try { matches = typeof candidate === "string" && isAbsolute(candidate) && canonicalServerRoot(candidate) === canonicalServerRoot(context.boundRoot); } catch { /* Unknown roots cannot match this service. */ }
      if (!matches) {
        return { status: 409, body: { ok: false, code: "PROJECT_ROOT_MISMATCH", error: "Request does not match the bound project" } };
      }
    }
  }

  const handlers = new Map<string, RouteHandler>([
    [
      "GET /health",
      () => ({
        ok: true,
        service: "comathd",
        ...getComathdStatus()
      })
    ],
    [
      "GET /agent/profile/list",
      (_payload, parsedUrl) => {
        const globalRpm = Number(parsedUrl.searchParams.get("global_rpm") ?? 4);
        const profiles = listAgentProfiles();
        return {
          profiles,
          validation: validateAgentProfiles(profiles, { global_rpm: globalRpm })
        };
      }
    ],
    [
      "GET /agent/adapter/package/list",
      () => ({ packages: listAgentAdapterPackages() })
    ],
    [
      "POST /agent/adapter/package/os-isolation-provider-runner",
      (payload) => {
        const body = payload as Parameters<typeof prepareAgentAdapterOsIsolationProviderRunner>[1] & { project_root: string };
        return {
          runner: sanitizePublicFormalAuthorityVocabulary(
            prepareAgentAdapterOsIsolationProviderRunner(body.project_root, body)
          )
        };
      }
    ],
    [
      "POST /agent/adapter/package/os-isolation-provider-host-capability-probe",
      (payload) => {
        const body = payload as Parameters<typeof probeAgentAdapterOsIsolationProviderHostCapability>[1] & { project_root: string };
        return {
          host_capability_probe: sanitizePublicFormalAuthorityVocabulary(
            probeAgentAdapterOsIsolationProviderHostCapability(body.project_root, body)
          )
        };
      }
    ],
    [
      "POST /agent/adapter/package/os-isolation-provider-helper-host-validation",
      (payload) => {
        const body = payload as Parameters<typeof validateAgentAdapterOsIsolationProviderHelperHost>[1] & { project_root: string };
        return {
          host_validation: sanitizePublicFormalAuthorityVocabulary(
            validateAgentAdapterOsIsolationProviderHelperHost(body.project_root, body)
          )
        };
      }
    ],
    [
      "POST /agent/adapter/package/os-isolation-provider-helper-collection",
      (payload) => {
        const body = payload as Parameters<typeof collectAgentAdapterOsIsolationProviderHelperExecutionEvidence>[1] & { project_root: string };
        return {
          collection: sanitizePublicFormalAuthorityVocabulary(
            collectAgentAdapterOsIsolationProviderHelperExecutionEvidence(body.project_root, body)
          )
        };
      }
    ],
    [
      "POST /agent/adapter/package/os-isolation-provider-helper-execution",
      (payload) => {
        const body = payload as Parameters<typeof runAgentAdapterOsIsolationProviderHelperExecution>[1] & { project_root: string };
        return {
          helper_execution: sanitizePublicFormalAuthorityVocabulary(
            runAgentAdapterOsIsolationProviderHelperExecution(body.project_root, body)
          )
        };
      }
    ],
    [
      "POST /agent/adapter/package/os-isolation-sandbox-launch",
      (payload) => {
        const body = payload as Parameters<typeof prepareAgentAdapterOsIsolationSandboxLaunch>[1] & { project_root: string };
        return {
          launch: sanitizePublicFormalAuthorityVocabulary(
            prepareAgentAdapterOsIsolationSandboxLaunch(body.project_root, body)
          )
        };
      }
    ],
    [
      "POST /agent/adapter/package/os-isolation-sandbox-execution",
      (payload) => {
        const body = payload as Parameters<typeof runAgentAdapterOsIsolationSandboxExecutionProbe>[1] & { project_root: string };
        return {
          execution: sanitizePublicFormalAuthorityVocabulary(
            runAgentAdapterOsIsolationSandboxExecutionProbe(body.project_root, body)
          )
        };
      }
    ],
    [
      "POST /agent/adapter/package/os-isolation-probe",
      (payload) => {
        const body = payload as Parameters<typeof probeAgentAdapterOsIsolation>[1] & { project_root: string };
        return {
          probe: sanitizePublicFormalAuthorityVocabulary(
            probeAgentAdapterOsIsolation(body.project_root, body)
          )
        };
      }
    ],
    [
      "POST /agent/adapter/package/os-isolation-review",
      (payload) => {
        const body = payload as {
          project_root: string;
          project_id: string;
          review_id?: string;
          adapter_id: string;
          backend?: "bundled" | "external" | "codex-api";
          evidence_path?: string;
          actor: string;
        };
        return {
          review: sanitizePublicFormalAuthorityVocabulary(
            reviewAgentAdapterOsIsolationReadiness(body.project_root, {
              project_id: body.project_id,
              review_id: body.review_id,
              adapter_id: body.adapter_id as Parameters<typeof reviewAgentAdapterOsIsolationReadiness>[1]["adapter_id"],
              backend: body.backend,
              evidence_path: body.evidence_path,
              actor: body.actor
            })
          )
        };
      }
    ],
    ["POST /project/init", (payload) => initProject(payload as { name?: string; root_path: string })],
    [
      "POST /campaign/start",
      (payload) => {
        const request = payload as {
          project_root: string;
          project_name?: string;
          user_goal: string;
          domain?: string;
          strict_mode?: boolean;
          mode?: "goal" | "bounded";
          paper_paths?: string[];
          attachments?: string[];
          workspace_refs?: string[];
          budget?: string;
          goal_mode_policy?: Record<string, unknown>;
          actor?: string;
        };
        return withPublicExternalV3CampaignResult(startCampaign(request), { projectRoot: request.project_root });
      }
    ],
    [
      "POST /release/v3-negative-ga-slices",
      (payload) =>
        runV3NegativeGaSlices(
          payload as {
            project_root: string;
            project_name?: string;
            actor?: string;
          }
        )
    ],
    [
      "POST /release/source-review/public-archive",
      (payload) => {
        const body = payload as Parameters<typeof assembleSourceReviewPublicArchive>[1] & { project_root: string };
        return assembleSourceReviewPublicArchive(body.project_root, body);
      }
    ],
    [
      "POST /release/public-archive/review",
      (payload) => {
        const body = payload as Parameters<typeof reviewGoal3PublicArchiveSurfaces>[1] & { project_root: string };
        return reviewGoal3PublicArchiveSurfaces(body.project_root, body);
      }
    ],
    [
      "POST /release/goal3/ga-operational-readiness-review",
      (payload) => {
        const body = payload as Parameters<typeof recordGoal3GaOperationalReadinessReview>[1] & {
          project_root: string;
        };
        return {
          operational_readiness_review: recordGoal3GaOperationalReadinessReview(body.project_root, body)
        };
      }
    ],
    [
      "POST /release/goal3/durable-transport-release-signoff-prerequisite",
      (payload) => {
        const body = payload as Parameters<typeof recordGoal3DurableTransportReleaseSignoffPrerequisite>[1] & {
          project_root: string;
        };
        return {
          durable_transport_release_signoff_prerequisite:
            recordGoal3DurableTransportReleaseSignoffPrerequisite(body.project_root, body)
        };
      }
    ],
    [
      "POST /release/goal3/final-release-signoff-decision",
      (payload) => {
        const body = payload as Parameters<typeof recordGoal3FinalReleaseSignoffDecision>[1] & {
          project_root: string;
        };
        const { project_root: projectRoot, ...input } = body;
        return {
          final_release_signoff_decision: recordGoal3FinalReleaseSignoffDecision(projectRoot, input)
        };
      }
    ],
    [
      "POST /release/goal3/durable-transport-release-signoff-verification",
      (payload) => {
        const body = payload as Parameters<typeof recordGoal3DurableTransportReleaseSignoffVerification>[1] & {
          project_root: string;
        };
        const { project_root: projectRoot, ...input } = body;
        return {
          durable_transport_release_signoff_verification:
            recordGoal3DurableTransportReleaseSignoffVerification(projectRoot, input)
        };
      }
    ],
    [
      "POST /release/goal3/final-release-signoff-certification-boundary-review",
      (payload) => {
        const body = payload as Parameters<typeof recordGoal3FinalReleaseSignoffCertificationBoundaryReview>[1] & {
          project_root: string;
        };
        const { project_root: projectRoot, ...input } = body;
        return {
          final_release_signoff_certification_boundary_review:
            recordGoal3FinalReleaseSignoffCertificationBoundaryReview(projectRoot, input)
        };
      }
    ],
    [
      "POST /release/goal3/final-release-candidate-closure-audit",
      (payload) => {
        const body = payload as Parameters<typeof recordGoal3FinalReleaseCandidateClosureAudit>[1] & {
          project_root: string;
        };
        const { project_root: projectRoot, ...input } = body;
        return {
          final_release_candidate_closure_audit: recordGoal3FinalReleaseCandidateClosureAudit(projectRoot, input)
        };
      }
    ],
    [
      "POST /release/goal3/proof-breadth-review",
      (payload) => {
        const body = payload as Parameters<typeof recordGoal3ReleaseCandidateProofBreadthReview>[1] & {
          project_root: string;
        };
        return {
          proof_breadth_review: recordGoal3ReleaseCandidateProofBreadthReview(body.project_root, body)
        };
      }
    ],
    [
      "POST /release/goal3/proof-breadth-closure",
      (payload) => {
        const body = payload as Parameters<typeof recordGoal3ReleaseCandidateProofBreadthClosure>[1] & {
          project_root: string;
        };
        return {
          proof_breadth_closure: recordGoal3ReleaseCandidateProofBreadthClosure(body.project_root, body)
        };
      }
    ],
    [
      "POST /release/goal3/proof-breadth-execution-bridge",
      (payload) => {
        const body = payload as Parameters<typeof recordGoal3ReleaseCandidateProofBreadthExecutionBridge>[1] & {
          project_root: string;
        };
        return {
          proof_breadth_execution_bridge: recordGoal3ReleaseCandidateProofBreadthExecutionBridge(
            body.project_root,
            body
          )
        };
      }
    ],
    [
      "POST /release/goal3/proof-breadth-execution-follow-through",
      (payload) => {
        const body = payload as Parameters<typeof recordGoal3ReleaseCandidateProofBreadthExecutionFollowThrough>[1] & {
          project_root: string;
        };
        return {
          proof_breadth_execution_follow_through: recordGoal3ReleaseCandidateProofBreadthExecutionFollowThrough(
            body.project_root,
            body
          )
        };
      }
    ],
    [
      "POST /release/goal3/task-local-lean-authority-packaging-follow-through",
      (payload) => {
        const body = payload as Parameters<typeof recordGoal3ReleaseCandidateProofBreadthTaskLocalPackagingFollowThrough>[1] & {
          project_root: string;
        };
        return {
          task_local_packaging_follow_through: recordGoal3ReleaseCandidateProofBreadthTaskLocalPackagingFollowThrough(
            body.project_root,
            body
          )
        };
      }
    ],
    [
      "POST /release/goal3/selected-tranche-packaging-results-follow-up",
      (payload) => {
        const body = payload as Parameters<typeof recordGoal3ReleaseCandidateProofBreadthSelectedTranchePackagingResultsFollowUp>[1] & {
          project_root: string;
        };
        return {
          selected_tranche_packaging_results_follow_up:
            recordGoal3ReleaseCandidateProofBreadthSelectedTranchePackagingResultsFollowUp(body.project_root, body)
        };
      }
    ],
    [
      "POST /release/goal3/selected-tranche-closure-recheck",
      (payload) => {
        const body = payload as Parameters<typeof recordGoal3ReleaseCandidateProofBreadthSelectedTrancheClosureRecheck>[1] & {
          project_root: string;
        };
        return {
          selected_tranche_closure_recheck: recordGoal3ReleaseCandidateProofBreadthSelectedTrancheClosureRecheck(
            body.project_root,
            body
          )
        };
      }
    ],
    [
      "POST /release/goal3/selected-tranche-next-execution-bridge",
      (payload) => {
        const body = payload as Parameters<typeof recordGoal3ReleaseCandidateProofBreadthSelectedTrancheNextExecutionBridge>[1] & {
          project_root: string;
        };
        return {
          selected_tranche_next_execution_bridge:
            recordGoal3ReleaseCandidateProofBreadthSelectedTrancheNextExecutionBridge(body.project_root, body)
        };
      }
    ],
    [
      "POST /release/goal3/selected-tranche-next-packaging-follow-through",
      (payload) => {
        const body = payload as Parameters<typeof recordGoal3ReleaseCandidateProofBreadthSelectedTrancheNextPackagingFollowThrough>[1] & {
          project_root: string;
        };
        return {
          selected_tranche_next_packaging_follow_through:
            recordGoal3ReleaseCandidateProofBreadthSelectedTrancheNextPackagingFollowThrough(body.project_root, body)
        };
      }
    ],
    [
      "POST /release/goal3/selected-tranche-next-packaging-results-follow-up",
      (payload) => {
        const body = payload as Parameters<typeof recordGoal3ReleaseCandidateProofBreadthSelectedTrancheNextPackagingResultsFollowUp>[1] & {
          project_root: string;
        };
        return {
          selected_tranche_next_packaging_results_follow_up:
            recordGoal3ReleaseCandidateProofBreadthSelectedTrancheNextPackagingResultsFollowUp(body.project_root, body)
        };
      }
    ],
    [
      "POST /release/goal3/selected-tranche-next-closure-recheck",
      (payload) => {
        const body = payload as Parameters<typeof recordGoal3ReleaseCandidateProofBreadthSelectedTrancheNextClosureRecheck>[1] & {
          project_root: string;
        };
        return {
          selected_tranche_next_closure_recheck:
            recordGoal3ReleaseCandidateProofBreadthSelectedTrancheNextClosureRecheck(body.project_root, body)
        };
      }
    ],
    [
      "POST /release/goal3/selected-tranche-next-closure-execution-bridge",
      (payload) => {
        const body = payload as Parameters<typeof recordGoal3ReleaseCandidateProofBreadthSelectedTrancheNextClosureExecutionBridge>[1] & {
          project_root: string;
        };
        return {
          selected_tranche_next_closure_execution_bridge:
            recordGoal3ReleaseCandidateProofBreadthSelectedTrancheNextClosureExecutionBridge(body.project_root, body)
        };
      }
    ],
    [
      "POST /release/goal3/selected-tranche-next-closure-packaging-follow-through",
      (payload) => {
        const body = payload as Parameters<typeof recordGoal3ReleaseCandidateProofBreadthSelectedTrancheNextClosurePackagingFollowThrough>[1] & {
          project_root: string;
        };
        return {
          selected_tranche_next_closure_packaging_follow_through:
            recordGoal3ReleaseCandidateProofBreadthSelectedTrancheNextClosurePackagingFollowThrough(body.project_root, body)
        };
      }
    ],
    [
      "POST /release/goal3/selected-tranche-next-closure-packaging-results-follow-up",
      (payload) => {
        const body = payload as Parameters<
          typeof recordGoal3ReleaseCandidateProofBreadthSelectedTrancheNextClosurePackagingResultsFollowUp
        >[1] & {
          project_root: string;
        };
        return {
          selected_tranche_next_closure_packaging_results_follow_up:
            recordGoal3ReleaseCandidateProofBreadthSelectedTrancheNextClosurePackagingResultsFollowUp(
              body.project_root,
              body
            )
        };
      }
    ],
    [
      "POST /release/goal3/selected-tranche-next-closure-packaging-results-closure-recheck",
      (payload) => {
        const body = payload as Parameters<
          typeof recordGoal3ReleaseCandidateProofBreadthSelectedTrancheNextClosurePackagingResultsClosureRecheck
        >[1] & {
          project_root: string;
        };
        return {
          selected_tranche_next_closure_packaging_results_closure_recheck:
            recordGoal3ReleaseCandidateProofBreadthSelectedTrancheNextClosurePackagingResultsClosureRecheck(
              body.project_root,
              body
            )
        };
      }
    ],
    [
      "POST /release/goal3/selected-tranche-next-closure-packaging-results-closure-execution-bridge",
      (payload) => {
        const body = payload as Parameters<
          typeof recordGoal3ReleaseCandidateProofBreadthSelectedTrancheNextClosurePackagingResultsClosureExecutionBridge
        >[1] & {
          project_root: string;
        };
        return {
          selected_tranche_next_closure_packaging_results_closure_execution_bridge:
            recordGoal3ReleaseCandidateProofBreadthSelectedTrancheNextClosurePackagingResultsClosureExecutionBridge(
              body.project_root,
              body
            )
        };
      }
    ],
    [
      "POST /release/goal3/selected-tranche-next-closure-packaging-results-closure-execution-packaging-follow-through",
      (payload) => {
        const body = payload as Parameters<
          typeof recordGoal3ReleaseCandidateProofBreadthSelectedTrancheNextClosurePackagingResultsClosureExecutionPackagingFollowThrough
        >[1] & {
          project_root: string;
        };
        return {
          selected_tranche_next_closure_packaging_results_closure_execution_packaging_follow_through:
            recordGoal3ReleaseCandidateProofBreadthSelectedTrancheNextClosurePackagingResultsClosureExecutionPackagingFollowThrough(
              body.project_root,
              body
            )
        };
      }
    ],
    [
      "POST /release/goal3/selected-tranche-next-closure-packaging-results-closure-execution-packaging-results-follow-up",
      (payload) => {
        const body = payload as Parameters<
          typeof recordGoal3ReleaseCandidateProofBreadthSelectedTrancheNextClosurePackagingResultsClosureExecutionPackagingResultsFollowUp
        >[1] & {
          project_root: string;
        };
        return {
          selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_follow_up:
            recordGoal3ReleaseCandidateProofBreadthSelectedTrancheNextClosurePackagingResultsClosureExecutionPackagingResultsFollowUp(
              body.project_root,
              body
            )
        };
      }
    ],
    [
      "POST /release/goal3/selected-tranche-next-closure-packaging-results-closure-execution-packaging-results-closure-recheck",
      (payload) => {
        const body = payload as Parameters<
          typeof recordGoal3ReleaseCandidateProofBreadthSelectedTrancheNextClosurePackagingResultsClosureExecutionPackagingResultsClosureRecheck
        >[1] & {
          project_root: string;
        };
        return {
          selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_recheck:
            recordGoal3ReleaseCandidateProofBreadthSelectedTrancheNextClosurePackagingResultsClosureExecutionPackagingResultsClosureRecheck(
              body.project_root,
              body
            )
        };
      }
    ],
    [
      "POST /release/goal3/selected-tranche-next-closure-packaging-results-closure-execution-packaging-results-closure-execution-bridge",
      (payload) => {
        const body = payload as Parameters<
          typeof recordGoal3ReleaseCandidateProofBreadthSelectedTrancheNextClosurePackagingResultsClosureExecutionPackagingResultsClosureExecutionBridge
        >[1] & {
          project_root: string;
        };
        return {
          selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_bridge:
            recordGoal3ReleaseCandidateProofBreadthSelectedTrancheNextClosurePackagingResultsClosureExecutionPackagingResultsClosureExecutionBridge(
              body.project_root,
              body
            )
        };
      }
    ],
    [
      "POST /release/goal3/selected-tranche-next-closure-packaging-results-closure-execution-packaging-results-closure-execution-packaging-follow-through",
      (payload) => {
        const body = payload as Parameters<
          typeof recordGoal3ReleaseCandidateProofBreadthSelectedTrancheNextClosurePackagingResultsClosureExecutionPackagingResultsClosureExecutionPackagingFollowThrough
        >[1] & {
          project_root: string;
        };
        return {
          selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_follow_through:
            recordGoal3ReleaseCandidateProofBreadthSelectedTrancheNextClosurePackagingResultsClosureExecutionPackagingResultsClosureExecutionPackagingFollowThrough(
              body.project_root,
              body
            )
        };
      }
    ],
    [
      "POST /release/goal3/selected-tranche-next-closure-packaging-results-closure-execution-packaging-results-closure-execution-packaging-results-follow-up",
      (payload) => {
        const body = payload as Parameters<
          typeof recordGoal3ReleaseCandidateProofBreadthSelectedTrancheNextClosurePackagingResultsClosureExecutionPackagingResultsClosureExecutionPackagingResultsFollowUp
        >[1] & {
          project_root: string;
        };
        return {
          selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_follow_up:
            recordGoal3ReleaseCandidateProofBreadthSelectedTrancheNextClosurePackagingResultsClosureExecutionPackagingResultsClosureExecutionPackagingResultsFollowUp(
              body.project_root,
              body
          )
        };
      }
    ],
    [
      "POST /release/goal3/selected-tranche-next-closure-packaging-results-closure-execution-packaging-results-closure-execution-packaging-results-closure-recheck",
      (payload) => {
        const body = payload as Parameters<
          typeof recordGoal3ReleaseCandidateProofBreadthSelectedTrancheNextClosurePackagingResultsClosureExecutionPackagingResultsClosureExecutionPackagingResultsClosureRecheck
        >[1] & {
          project_root: string;
        };
        return {
          selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_recheck:
            recordGoal3ReleaseCandidateProofBreadthSelectedTrancheNextClosurePackagingResultsClosureExecutionPackagingResultsClosureExecutionPackagingResultsClosureRecheck(
              body.project_root,
              body
            )
        };
      }
    ],
    [
      "POST /release/goal3/selected-tranche-next-closure-packaging-results-closure-execution-packaging-results-closure-execution-packaging-results-closure-execution-bridge",
      (payload) => {
        const body = payload as Parameters<
          typeof recordGoal3ReleaseCandidateProofBreadthSelectedTrancheNextClosurePackagingResultsClosureExecutionPackagingResultsClosureExecutionPackagingResultsClosureExecutionBridge
        >[1] & {
          project_root: string;
        };
        return {
          selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_bridge:
            recordGoal3ReleaseCandidateProofBreadthSelectedTrancheNextClosurePackagingResultsClosureExecutionPackagingResultsClosureExecutionPackagingResultsClosureExecutionBridge(
              body.project_root,
              body
            )
        };
      }
    ],
    [
      "POST /release/goal3/selected-tranche-next-closure-packaging-results-closure-execution-packaging-results-closure-execution-packaging-results-closure-execution-packaging-follow-through",
      (payload) => {
        const body = payload as Parameters<
          typeof recordGoal3ReleaseCandidateProofBreadthSelectedTrancheNextClosurePackagingResultsClosureExecutionPackagingResultsClosureExecutionPackagingResultsClosureExecutionPackagingFollowThrough
        >[1] & {
          project_root: string;
        };
        return {
          selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_follow_through:
            recordGoal3ReleaseCandidateProofBreadthSelectedTrancheNextClosurePackagingResultsClosureExecutionPackagingResultsClosureExecutionPackagingResultsClosureExecutionPackagingFollowThrough(
              body.project_root,
              body
            )
        };
      }
    ],
    [
      "POST /release/goal3/selected-tranche-next-closure-packaging-results-closure-execution-packaging-results-closure-execution-packaging-results-closure-execution-packaging-results-follow-up",
      (payload) => {
        const body = payload as Parameters<
          typeof recordGoal3ReleaseCandidateProofBreadthSelectedTrancheNextClosurePackagingResultsClosureExecutionPackagingResultsClosureExecutionPackagingResultsClosureExecutionPackagingResultsFollowUp
        >[1] & {
          project_root: string;
        };
        return {
          selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_follow_up:
            recordGoal3ReleaseCandidateProofBreadthSelectedTrancheNextClosurePackagingResultsClosureExecutionPackagingResultsClosureExecutionPackagingResultsClosureExecutionPackagingResultsFollowUp(
              body.project_root,
              body
            )
        };
      }
    ],
    [
      "POST /release/goal3/selected-tranche-next-closure-packaging-results-closure-execution-packaging-results-closure-execution-packaging-results-closure-execution-packaging-results-closure-recheck",
      (payload) => {
        const body = payload as Parameters<
          typeof recordGoal3ReleaseCandidateProofBreadthSelectedTrancheNextClosurePackagingResultsClosureExecutionPackagingResultsClosureExecutionPackagingResultsClosureExecutionPackagingResultsClosureRecheck
        >[1] & {
          project_root: string;
        };
        return {
          selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_recheck:
            recordGoal3ReleaseCandidateProofBreadthSelectedTrancheNextClosurePackagingResultsClosureExecutionPackagingResultsClosureExecutionPackagingResultsClosureExecutionPackagingResultsClosureRecheck(
              body.project_root,
              body
            )
        };
      }
    ],
    [
      "POST /release/goal3/selected-tranche-next-closure-packaging-results-closure-execution-packaging-results-closure-execution-packaging-results-closure-execution-packaging-results-closure-execution-bridge",
      (payload) => {
        const body = payload as Parameters<
          typeof recordGoal3ReleaseCandidateProofBreadthSelectedTrancheNextClosurePackagingResultsClosureExecutionPackagingResultsClosureExecutionPackagingResultsClosureExecutionPackagingResultsClosureExecutionBridge
        >[1] & {
          project_root: string;
        };
        return {
          selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_bridge:
            recordGoal3ReleaseCandidateProofBreadthSelectedTrancheNextClosurePackagingResultsClosureExecutionPackagingResultsClosureExecutionPackagingResultsClosureExecutionPackagingResultsClosureExecutionBridge(
              body.project_root,
              body
          )
        };
      }
    ],
    [
      "POST /release/goal3/selected-tranche-next-closure-packaging-results-closure-execution-packaging-results-closure-execution-packaging-results-closure-execution-packaging-results-closure-execution-packaging-follow-through",
      (payload) => {
        const body = payload as Parameters<
          typeof recordGoal3ReleaseCandidateProofBreadthSelectedTrancheNextClosurePackagingResultsClosureExecutionPackagingResultsClosureExecutionPackagingResultsClosureExecutionPackagingResultsClosureExecutionPackagingFollowThrough
        >[1] & {
          project_root: string;
        };
        return {
          goal3_release_candidate_proof_breadth_selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_follow_through:
            recordGoal3ReleaseCandidateProofBreadthSelectedTrancheNextClosurePackagingResultsClosureExecutionPackagingResultsClosureExecutionPackagingResultsClosureExecutionPackagingResultsClosureExecutionPackagingFollowThrough(
              body.project_root,
              body
          )
        };
      }
    ],
    [
      "POST /release/goal3/selected-tranche-next-closure-packaging-results-closure-execution-packaging-results-closure-execution-packaging-results-closure-execution-packaging-results-closure-execution-packaging-results-follow-up",
      (payload) => {
        const body = payload as Parameters<
          typeof recordGoal3ReleaseCandidateProofBreadthSelectedTrancheNextClosurePackagingResultsClosureExecutionPackagingResultsClosureExecutionPackagingResultsClosureExecutionPackagingResultsClosureExecutionPackagingResultsFollowUp
        >[1] & {
          project_root: string;
        };
        return {
          goal3_release_candidate_proof_breadth_selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_follow_up:
            recordGoal3ReleaseCandidateProofBreadthSelectedTrancheNextClosurePackagingResultsClosureExecutionPackagingResultsClosureExecutionPackagingResultsClosureExecutionPackagingResultsClosureExecutionPackagingResultsFollowUp(
              body.project_root,
              body
            )
        };
      }
    ],
    [
      "POST /release/goal3/selected-tranche-next-closure-packaging-results-closure-execution-packaging-results-closure-execution-packaging-results-closure-execution-packaging-results-closure-execution-packaging-results-closure-recheck",
      (payload) => {
        const body = payload as Parameters<
          typeof recordGoal3ReleaseCandidateProofBreadthSelectedTrancheNextClosurePackagingResultsClosureExecutionPackagingResultsClosureExecutionPackagingResultsClosureExecutionPackagingResultsClosureExecutionPackagingResultsClosureRecheck
        >[1] & {
          project_root: string;
        };
        return {
          selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_recheck:
            recordGoal3ReleaseCandidateProofBreadthSelectedTrancheNextClosurePackagingResultsClosureExecutionPackagingResultsClosureExecutionPackagingResultsClosureExecutionPackagingResultsClosureExecutionPackagingResultsClosureRecheck(
              body.project_root,
              body
            )
        };
      }
    ],
    [
      "POST /release/goal3/selected-tranche-next-closure-packaging-results-closure-execution-packaging-results-closure-execution-packaging-results-closure-execution-packaging-results-closure-execution-packaging-results-closure-execution-bridge",
      (payload) => {
        const body = payload as Parameters<
          typeof recordGoal3ReleaseCandidateProofBreadthSelectedTrancheNextClosurePackagingResultsClosureExecutionPackagingResultsClosureExecutionPackagingResultsClosureExecutionPackagingResultsClosureExecutionPackagingResultsClosureExecutionBridge
        >[1] & {
          project_root: string;
        };
        return {
          selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_bridge:
            recordGoal3ReleaseCandidateProofBreadthSelectedTrancheNextClosurePackagingResultsClosureExecutionPackagingResultsClosureExecutionPackagingResultsClosureExecutionPackagingResultsClosureExecutionPackagingResultsClosureExecutionBridge(
              body.project_root,
              body
            )
        };
      }
    ],
    [
      "POST /release/goal3/ga-certification-review",
      (payload) => {
        const body = payload as Parameters<typeof recordGoal3GaCertificationReview>[1] & {
          project_root: string;
        };
        return {
          ga_certification_review: recordGoal3GaCertificationReview(body.project_root, body)
        };
      }
    ],
    [
      "POST /release/goal3/ga-certificate",
      (payload) => {
        const body = payload as Parameters<typeof recordGoal3GaCertificate>[1] & {
          project_root: string;
        };
        return {
          ga_certificate: recordGoal3GaCertificate(body.project_root, body)
        };
      }
    ],
    [
      "POST /release/goal3/ga-certificate-consumption-review",
      (payload) => {
        const body = payload as Parameters<typeof recordGoal3GaCertificateConsumptionReview>[1] & {
          project_root: string;
        };
        return {
          ga_certificate_consumption_review: recordGoal3GaCertificateConsumptionReview(body.project_root, body)
        };
      }
    ],
    [
      "POST /release/goal3/source-bound-release-package",
      (payload) => {
        const body = payload as Parameters<typeof recordGoal3SourceBoundReleasePackage>[1] & {
          project_root: string;
        };
        return {
          source_bound_release_package: recordGoal3SourceBoundReleasePackage(body.project_root, body)
        };
      }
    ],
    [
      "POST /release/goal3/source-available-review-artifact",
      (payload) => {
        const body = payload as Parameters<typeof recordGoal3SourceAvailableReviewArtifact>[1] & {
          project_root: string;
        };
        return {
          source_available_review_artifact: recordGoal3SourceAvailableReviewArtifact(body.project_root, body)
        };
      }
    ],
    [
      "POST /release/goal3/source-artifact-presentation-review",
      (payload) => {
        const body = payload as Parameters<typeof recordGoal3SourceArtifactPresentationReview>[1] & {
          project_root: string;
        };
        return {
          source_artifact_presentation_review: recordGoal3SourceArtifactPresentationReview(body.project_root, body)
        };
      }
    ],
    [
      "POST /release/goal3/source-release-public-checklist",
      (payload) => {
        const body = payload as Parameters<typeof recordGoal3SourceReleasePublicChecklist>[1] & {
          project_root: string;
        };
        return {
          source_release_public_checklist: recordGoal3SourceReleasePublicChecklist(body.project_root, body)
        };
      }
    ],
    [
      "POST /release/goal3/source-release-external-evidence-binding",
      (payload) => {
        const body = payload as Parameters<typeof recordGoal3SourceReleaseExternalEvidenceBinding>[1] & {
          project_root: string;
        };
        return {
          source_release_external_evidence_binding: recordGoal3SourceReleaseExternalEvidenceBinding(body.project_root, body)
        };
      }
    ],
    [
      "POST /release/goal3/source-release-external-provider-verification",
      async (payload) => {
        const body = payload as Parameters<typeof recordGoal3SourceReleaseExternalProviderVerification>[1] & {
          project_root: string;
        };
        return {
          source_release_external_provider_verification: await recordGoal3SourceReleaseExternalProviderVerification(
            body.project_root,
            body
          )
        };
      }
    ],
    [
      "POST /release/goal3/source-release-external-provider-policy-inspection",
      async (payload) => {
        const body = payload as Parameters<typeof recordGoal3SourceReleaseExternalProviderPolicyInspection>[1] & {
          project_root: string;
        };
        return {
          source_release_external_provider_policy_inspection: await recordGoal3SourceReleaseExternalProviderPolicyInspection(
            body.project_root,
            body
          )
        };
      }
    ],
    [
      "POST /release/goal3/source-release-os-immutability-attestation",
      async (payload) => {
        const body = payload as Parameters<typeof recordGoal3SourceReleaseOsImmutabilityAttestation>[1] & {
          project_root: string;
        };
        return {
          source_release_os_immutability_attestation: await recordGoal3SourceReleaseOsImmutabilityAttestation(
            body.project_root,
            body
          )
        };
      }
    ],
    [
      "POST /release/goal3/final-ga-audit",
      (payload) => {
        const body = payload as Parameters<typeof recordGoal3FinalGaAudit>[1] & {
          project_root: string;
        };
        return {
          final_ga_audit: recordGoal3FinalGaAudit(body.project_root, body)
        };
      }
    ],
    [
      "POST /release/pi-codex-lifecycle/unattended-real-host-operator-approval",
      (payload) => {
        const body = payload as Parameters<typeof recordPiCodexLifecycleUnattendedRealHostOperatorApproval>[1] & {
          project_root: string;
        };
        return {
          approval: recordPiCodexLifecycleUnattendedRealHostOperatorApproval(body.project_root, body)
        };
      }
    ],
    [
      "POST /release/pi-codex-lifecycle/unattended-real-host-executor-contract",
      (payload) => {
        const body = payload as Parameters<typeof recordPiCodexLifecycleUnattendedRealHostExecutorContract>[1] & {
          project_root: string;
        };
        return {
          executor_contract: recordPiCodexLifecycleUnattendedRealHostExecutorContract(body.project_root, body)
        };
      }
    ],
    [
      "POST /release/pi-codex-lifecycle/unattended-real-host-durable-transport-contract",
      (payload) => {
        const body = payload as Parameters<typeof recordPiCodexLifecycleUnattendedRealHostDurableTransportContract>[1] & {
          project_root: string;
        };
        return {
          durable_transport_contract: recordPiCodexLifecycleUnattendedRealHostDurableTransportContract(
            body.project_root,
            body
          )
        };
      }
    ],
    [
      "POST /release/pi-codex-lifecycle/unattended-real-host-execution-readiness",
      (payload) => {
        const body = payload as Parameters<typeof recordPiCodexLifecycleUnattendedRealHostExecutionReadiness>[1] & {
          project_root: string;
        };
        return {
          readiness: recordPiCodexLifecycleUnattendedRealHostExecutionReadiness(body.project_root, body)
        };
      }
    ],
    [
      "POST /release/pi-codex-lifecycle/unattended-real-host-execution-attempt",
      (payload) => {
        const body = payload as Parameters<typeof recordPiCodexLifecycleUnattendedRealHostExecutionAttempt>[1] & {
          project_root: string;
        };
        return {
          execution_attempt: recordPiCodexLifecycleUnattendedRealHostExecutionAttempt(body.project_root, body)
        };
      }
    ],
    [
      "POST /release/pi-codex-lifecycle/unattended-real-host-execution-attempt-review",
      (payload) => {
        const body = payload as Parameters<typeof reviewPiCodexLifecycleUnattendedRealHostExecutionAttempt>[1] & {
          project_root: string;
        };
        return {
          execution_attempt_review: reviewPiCodexLifecycleUnattendedRealHostExecutionAttempt(body.project_root, body)
        };
      }
    ],
    [
      "POST /release/pi-codex-lifecycle/unattended-real-host-completion-certification-prerequisite",
      (payload) => {
        const body = payload as Parameters<
          typeof recordPiCodexLifecycleUnattendedRealHostCompletionCertificationPrerequisite
        >[1] & {
          project_root: string;
        };
        return {
          completion_certification_prerequisite:
            recordPiCodexLifecycleUnattendedRealHostCompletionCertificationPrerequisite(body.project_root, body)
        };
      }
    ],
    [
      "POST /release/pi-codex-lifecycle/unattended-real-host-terminal-completion-certificate-design",
      (payload) => {
        const body = payload as Parameters<
          typeof recordPiCodexLifecycleUnattendedRealHostTerminalCompletionCertificateDesign
        >[1] & {
          project_root: string;
        };
        return {
          terminal_completion_certificate_design:
            recordPiCodexLifecycleUnattendedRealHostTerminalCompletionCertificateDesign(body.project_root, body)
        };
      }
    ],
    [
      "POST /release/pi-codex-lifecycle/unattended-real-host-terminal-completion-certificate",
      (payload) => {
        const body = payload as Parameters<
          typeof recordPiCodexLifecycleUnattendedRealHostTerminalCompletionCertificate
        >[1] & {
          project_root: string;
        };
        return {
          terminal_completion_certificate:
            recordPiCodexLifecycleUnattendedRealHostTerminalCompletionCertificate(body.project_root, body)
        };
      }
    ],
    [
      "POST /release/pi-codex-lifecycle/operator-service-transport-closure-review",
      (payload) => {
        const body = payload as Parameters<typeof recordPiCodexLifecycleOperatorServiceTransportClosureReview>[1] & {
          project_root: string;
        };
        return {
          transport_closure_review: recordPiCodexLifecycleOperatorServiceTransportClosureReview(
            body.project_root,
            body
          )
        };
      }
    ],
    [
      "POST /release/pi-codex-lifecycle/unattended-real-host-handoff-review",
      (payload) => {
        const body = payload as Parameters<typeof reviewPiCodexLifecycleUnattendedRealHostHandoff>[1] & {
          project_root: string;
        };
        return {
          handoff_review: reviewPiCodexLifecycleUnattendedRealHostHandoff(body.project_root, body)
        };
      }
    ],
    [
      "POST /release/pi-codex-lifecycle/automatic-real-pi-execution",
      (payload) => {
        const body = payload as Parameters<typeof orchestratePiCodexLifecycleAutomaticRealPiExecution>[1] & {
          project_root: string;
        };
        return {
          orchestration: orchestratePiCodexLifecycleAutomaticRealPiExecution(body.project_root, body)
        };
      }
    ],
    [
      "POST /release/pi-codex-lifecycle/terminal-execution-review",
      (payload) => {
        const body = payload as Parameters<typeof reviewPiCodexLifecycleTerminalExecution>[1] & { project_root: string };
        return {
          review: reviewPiCodexLifecycleTerminalExecution(body.project_root, body)
        };
      }
    ],
    [
      "POST /release/pi-codex-lifecycle/operator-service-transport-contract",
      (payload) => {
        const body = payload as Parameters<typeof recordPiCodexLifecycleOperatorServiceTransportContract>[1] & {
          project_root: string;
        };
        return {
          contract: recordPiCodexLifecycleOperatorServiceTransportContract(body.project_root, body)
        };
      }
    ],
    [
      "POST /release/pi-codex-lifecycle/operator-service-transport-continuity",
      (payload) => {
        const body = payload as Parameters<typeof recordPiCodexLifecycleOperatorServiceTransportContinuity>[1] & {
          project_root: string;
        };
        return {
          continuity: recordPiCodexLifecycleOperatorServiceTransportContinuity(body.project_root, body)
        };
      }
    ],
    [
      "POST /release/pi-codex-lifecycle/guided-real-pi-execution",
      (payload) => {
        const body = payload as Parameters<typeof recordPiCodexLifecycleGuidedRealPiExecution>[1] & { project_root: string };
        return {
          execution: recordPiCodexLifecycleGuidedRealPiExecution(body.project_root, body)
        };
      }
    ],
    [
      "POST /release/pi-codex-lifecycle/operator-transport-lease",
      (payload) => {
        const body = payload as Parameters<typeof openPiCodexLifecycleOperatorTransportLease>[1] & { project_root: string };
        return {
          lease: openPiCodexLifecycleOperatorTransportLease(body.project_root, body)
        };
      }
    ],
    [
      "POST /release/pi-codex-lifecycle/operator-transport-heartbeat",
      (payload) => {
        const body = payload as Parameters<typeof heartbeatPiCodexLifecycleOperatorTransportLease>[1] & { project_root: string };
        return {
          heartbeat: heartbeatPiCodexLifecycleOperatorTransportLease(body.project_root, body)
        };
      }
    ],
    [
      "POST /release/pi-codex-lifecycle/operator-transport-recovery",
      (payload) => {
        const body = payload as Parameters<typeof recoverPiCodexLifecycleOperatorTransport>[1] & { project_root: string };
        return {
          recovery: recoverPiCodexLifecycleOperatorTransport(body.project_root, body)
        };
      }
    ],
    [
      "POST /release/pi-codex-lifecycle/operator-session",
      (payload) => {
        const body = payload as Parameters<typeof persistPiCodexLifecycleOperatorSession>[1] & { project_root: string };
        return {
          session: persistPiCodexLifecycleOperatorSession(body.project_root, body)
        };
      }
    ],
    [
      "POST /release/pi-codex-lifecycle/evidence",
      (payload) => {
        const body = payload as Parameters<typeof collectPiCodexLifecycleEvidence>[1] & { project_root: string };
        return {
          evidence: collectPiCodexLifecycleEvidence(body.project_root, body)
        };
      }
    ],
    [
      "POST /release/pi-codex-lifecycle/service-probe",
      (payload) => {
        const body = payload as Parameters<typeof probePiCodexDurableServiceLifecycle>[1] & { project_root: string };
        return {
          probe: probePiCodexDurableServiceLifecycle(body.project_root, body)
        };
      }
    ],
    [
      "POST /release/pi-codex-lifecycle/codex-api-probe",
      async (payload) => {
        const body = payload as Parameters<typeof probePiCodexProductionCodexAccountNetwork>[1] & { project_root: string };
        return {
          probe: await probePiCodexProductionCodexAccountNetwork(body.project_root, body)
        };
      }
    ],
    [
      "POST /release/pi-codex-lifecycle/real-pi-runtime-probe",
      (payload) => {
        const body = payload as Parameters<typeof probePiCodexRealPiInstallRuntimeRegistration>[1] & { project_root: string };
        return {
          probe: probePiCodexRealPiInstallRuntimeRegistration(body.project_root, body)
        };
      }
    ],
    [
      "POST /release/pi-codex-lifecycle/review",
      (payload) => {
        const body = payload as Parameters<typeof reviewPiCodexLifecycleReadiness>[1] & { project_root: string };
        return {
          review: reviewPiCodexLifecycleReadiness(body.project_root, body)
        };
      }
    ],
    ["POST /project/open", (payload) => openProject(payload as { root_path: string })],
    [
      "GET /project/status",
      (_payload, parsedUrl) => getProjectStatus({ root_path: parsedUrl.searchParams.get("project_root") ?? "" })
    ],
    [
      "POST /claim/register",
      (payload) => {
        const body = payload as {
          project_root: string;
          project_id: string;
          statement: string;
          assumptions: string[];
          domain: string;
          actor?: string;
        };
        return {
          claim: registerClaim(body.project_root, {
            project_id: body.project_id,
            statement: body.statement,
            assumptions: body.assumptions,
            domain: body.domain,
            actor: body.actor ?? "api"
          })
        };
      }
    ],
    [
      "POST /claim/update",
      (payload) => {
        const body = payload as {
          project_root: string;
          project_id: string;
          claim_id: string;
          actor?: string;
          patch: Parameters<typeof updateClaim>[1]["patch"];
        };
        return {
          claim: updateClaim(body.project_root, {
            project_id: body.project_id,
            claim_id: body.claim_id,
            actor: body.actor ?? "api",
            patch: body.patch
          })
        };
      }
    ],
    [
      "POST /claim/link",
      (payload) => {
        const body = payload as Parameters<typeof linkClaims>[1] & { project_root: string };
        return { edge: linkClaims(body.project_root, body) };
      }
    ],
    [
      "POST /claim/promote",
      (payload) => {
        const body = payload as Parameters<typeof promoteClaim>[1] & { project_root: string };
        return promoteClaim(body.project_root, body);
      }
    ],
    [
      "GET /claim/get",
      (_payload, parsedUrl) => ({
        claim: sanitizePublicFormalAuthorityVocabulary(
          getClaim(
            parsedUrl.searchParams.get("project_root") ?? "",
            parsedUrl.searchParams.get("project_id") ?? "",
            parsedUrl.searchParams.get("claim_id") ?? ""
          )
        )
      })
    ],
    [
      "GET /claim/list",
      (_payload, parsedUrl) => ({
        claims: sanitizePublicFormalAuthorityVocabulary(
          readClaims(
            parsedUrl.searchParams.get("project_root") ?? "",
            parsedUrl.searchParams.get("project_id") ?? undefined
          )
        )
      })
    ],
    [
      "GET /evidence/list",
      (_payload, parsedUrl) => {
        const projectRoot = parsedUrl.searchParams.get("project_root") ?? "";
        const projectId = parsedUrl.searchParams.get("project_id") ?? undefined;
        const claimId = parsedUrl.searchParams.get("claim_id") ?? undefined;
        const evidence = readEvidenceRecords(projectRoot, projectId).filter(
          (record) => !claimId || record.claim_id === claimId
        );
        return { evidence: sanitizePublicFormalAuthorityVocabulary(evidence) };
      }
    ],
    [
      "GET /gate/list",
      (_payload, parsedUrl) => {
        const projectRoot = parsedUrl.searchParams.get("project_root") ?? "";
        const projectId = parsedUrl.searchParams.get("project_id") ?? undefined;
        const claimId = parsedUrl.searchParams.get("claim_id") ?? undefined;
        const gates = readGateResults(projectRoot, projectId).filter((gate) => !claimId || gate.claim_id === claimId);
        return { gates: sanitizePublicFormalAuthorityVocabulary(gates) };
      }
    ],
    [
      "POST /workstream/spawn",
      (payload) => {
        const body = payload as Parameters<typeof spawnWorkstream>[1] & { project_root: string; actor?: string };
        return {
          workstream: spawnWorkstream(body.project_root, {
            project_id: body.project_id,
            kind: body.kind,
            goal: body.goal,
            created_by: body.created_by ?? body.actor ?? "api"
          })
        };
      }
    ],
    [
      "POST /agent/run/profile",
      (payload) => {
        const body = payload as {
          project_root: string;
          project_id: string;
          campaign_id?: string;
          workstream_id: string;
          profile_id: string;
          actor: string;
        };
        const run = createAgentRunForProfile(body.project_root, {
          project_id: body.project_id,
          campaign_id: body.campaign_id,
          workstream_id: body.workstream_id,
          profile_id: body.profile_id as Parameters<typeof createAgentRunForProfile>[1]["profile_id"],
          actor: body.actor
        });
        return {
          run,
          profile: getAgentProfile(body.profile_id)
        };
      }
    ],
    [
      "POST /agent/run/profile/prepare-launch",
      (payload) => {
        const body = payload as {
          project_root: string;
          project_id: string;
          run_id: string;
          profile_id: string;
          program: string;
          goal: string;
          context_path: string;
          actor: string;
        };
        return {
          launch: buildAgentProfileLaunch(body.project_root, {
            project_id: body.project_id,
            run_id: body.run_id,
            profile_id: body.profile_id as Parameters<typeof buildAgentProfileLaunch>[1]["profile_id"],
            program: body.program,
            goal: body.goal,
            context_path: body.context_path,
            actor: body.actor
          })
        };
      }
    ],
    [
      "POST /agent/run/profile/execute",
      async (payload) => {
        const body = payload as {
          project_root: string;
          project_id: string;
          campaign_id?: string;
          workstream_id: string;
          profile_id: string;
          program: string;
          adapter_args?: string[];
          goal: string;
          context_path: string;
          actor: string;
        };
        return {
          execution: await executeProfileAgentRun(body.project_root, {
            project_id: body.project_id,
            campaign_id: body.campaign_id,
            workstream_id: body.workstream_id,
            profile_id: body.profile_id as Parameters<typeof executeProfileAgentRun>[1]["profile_id"],
            program: body.program,
            adapter_args: body.adapter_args,
            goal: body.goal,
            context_path: body.context_path,
            actor: body.actor
          })
        };
      }
    ],
    [
      "POST /agent/adapter/health",
      (payload) => {
        const body = payload as {
          project_root: string;
          project_id: string;
          profile_id: string;
          program: string;
          adapter_args?: string[];
          timeout_ms?: number;
          actor: string;
        };
        return {
          health: sanitizePublicFormalAuthorityVocabulary(
            probeAgentAdapterHealth(body.project_root, {
              project_id: body.project_id,
              profile_id: body.profile_id as Parameters<typeof probeAgentAdapterHealth>[1]["profile_id"],
              program: body.program,
              adapter_args: body.adapter_args,
              timeout_ms: body.timeout_ms,
              actor: body.actor
            })
          )
        };
      }
    ],
    [
      "POST /agent/adapter/package/prepare-launch",
      (payload) => {
        const body = payload as {
          project_root: string;
          project_id: string;
          run_id: string;
          profile_id: string;
          adapter_id: string;
          backend?: "bundled" | "external" | "codex-api";
          goal: string;
          context_path: string;
          actor: string;
        };
        return {
          prepared: buildAgentAdapterPackageLaunch(body.project_root, {
            project_id: body.project_id,
            run_id: body.run_id,
            profile_id: body.profile_id as Parameters<typeof buildAgentAdapterPackageLaunch>[1]["profile_id"],
            adapter_id: body.adapter_id as Parameters<typeof buildAgentAdapterPackageLaunch>[1]["adapter_id"],
            backend: body.backend,
            goal: body.goal,
            context_path: body.context_path,
            actor: body.actor
          })
        };
      }
    ],
    [
      "POST /agent/adapter/package/execute",
      async (payload) => {
        const body = payload as {
          project_root: string;
          project_id: string;
          campaign_id?: string;
          workstream_id: string;
          profile_id: string;
          adapter_id: string;
          backend?: "bundled" | "external" | "codex-api";
          goal: string;
          context_path: string;
          actor: string;
        };
        return {
          execution: await executeAgentAdapterPackage(body.project_root, {
            project_id: body.project_id,
            campaign_id: body.campaign_id,
            workstream_id: body.workstream_id,
            profile_id: body.profile_id as Parameters<typeof executeAgentAdapterPackage>[1]["profile_id"],
            adapter_id: body.adapter_id as Parameters<typeof executeAgentAdapterPackage>[1]["adapter_id"],
            backend: body.backend,
            goal: body.goal,
            context_path: body.context_path,
            actor: body.actor
          })
        };
      }
    ],
    [
      "POST /agent/adapter/package/validate-installed-cli",
      (payload) => {
        const body = payload as {
          project_root: string;
          project_id: string;
          profile_id: string;
          adapter_id: string;
          timeout_ms?: number;
          actor: string;
        };
        return {
          validation: validateExternalCodexCliInstallation(body.project_root, {
            project_id: body.project_id,
            profile_id: body.profile_id as Parameters<typeof validateExternalCodexCliInstallation>[1]["profile_id"],
            adapter_id: body.adapter_id as Parameters<typeof validateExternalCodexCliInstallation>[1]["adapter_id"],
            timeout_ms: body.timeout_ms,
            actor: body.actor
          })
        };
      }
    ],
    [
      "GET /workstream/status",
      (_payload, parsedUrl) => ({
        workstream: sanitizePublicFormalAuthorityVocabulary(
          getWorkstreamStatus(parsedUrl.searchParams.get("project_root") ?? "", {
            project_id: parsedUrl.searchParams.get("project_id") ?? "",
            workstream_id: parsedUrl.searchParams.get("workstream_id") ?? ""
          })
        )
      })
    ],
    [
      "GET /workstream/list",
      (_payload, parsedUrl) => ({
        workstreams: sanitizePublicFormalAuthorityVocabulary(
          listWorkstreams(
            parsedUrl.searchParams.get("project_root") ?? "",
            parsedUrl.searchParams.get("project_id") ?? ""
          )
        )
      })
    ],
    [
      "GET /workstream/bundle",
      (_payload, parsedUrl) =>
        sanitizePublicFormalAuthorityVocabulary(
          readWorkstreamBundle(parsedUrl.searchParams.get("project_root") ?? "", {
            project_id: parsedUrl.searchParams.get("project_id") ?? "",
            workstream_id: parsedUrl.searchParams.get("workstream_id") ?? ""
          })
        )
    ],
    [
      "POST /workstream/report",
      (payload) => {
        const body = payload as Parameters<typeof writeWorkstreamReport>[1] & { project_root: string };
        return {
          workstream: writeWorkstreamReport(body.project_root, body)
        };
      }
    ],
    [
      "POST /workstream/transition",
      (payload) => {
        const body = payload as Parameters<typeof transitionWorkstreamStatus>[1] & { project_root: string };
        return {
          workstream: transitionWorkstreamStatus(body.project_root, body)
        };
      }
    ],
    [
      "POST /graph-patch/propose",
      (payload) => {
        const body = payload as Parameters<typeof buildGraphPatchFromWorkstream>[1] & {
          project_root: string;
          actor?: string;
        };
        return {
          patch: buildGraphPatchFromWorkstream(body.project_root, {
            ...body,
            created_by: body.created_by ?? body.actor ?? "api"
          })
        };
      }
    ],
    [
      "POST /graph-patch/review",
      (payload) => {
        const body = payload as Parameters<typeof reviewGraphPatch>[1] & { project_root: string };
        return {
          patch: reviewGraphPatch(body.project_root, body)
        };
      }
    ],
    [
      "POST /graph-patch/apply",
      async (payload) => {
        const body = payload as Omit<Parameters<typeof applyAcceptedGraphPatch>[1], "db"> & { project_root: string };
        const db = await getMemoryDb(context, body.project_root, body.project_id);
        return applyAcceptedGraphPatch(body.project_root, { ...body, db });
      }
    ],
    [
      "POST /literature/import-bibtex",
      async (payload) => {
        const body = payload as Parameters<typeof importBibTeX>[1] & { project_root: string };
        return sanitizePublicFormalAuthorityVocabulary(await importBibTeX(body.project_root, body));
      }
    ],
    [
      "POST /literature/import-pdf",
      async (payload) => {
        const body = payload as Parameters<typeof importLiteraturePdf>[1] & { project_root: string };
        return sanitizePublicFormalAuthorityVocabulary(await importLiteraturePdf(body.project_root, body));
      }
    ],
    [
      "POST /literature/register-citation",
      (payload) => {
        const body = payload as Parameters<typeof registerCitation>[1] & { project_root: string };
        return {
          citation: sanitizePublicFormalAuthorityVocabulary(registerCitation(body.project_root, body))
        };
      }
    ],
    [
      "POST /literature/check-condition",
      (payload) => {
        const body = payload as Parameters<typeof checkCitationConditions>[1] & { project_root: string };
        return {
          match: sanitizePublicFormalAuthorityVocabulary(checkCitationConditions(body.project_root, body))
        };
      }
    ],
    [
      "GET /literature/list",
      (_payload, parsedUrl) => {
        const projectRoot = parsedUrl.searchParams.get("project_root") ?? "";
        const projectId = parsedUrl.searchParams.get("project_id") ?? "";
        return {
          citations: sanitizePublicFormalAuthorityVocabulary(listCitations(projectRoot, projectId)),
          condition_matches: sanitizePublicFormalAuthorityVocabulary(listCitationConditionMatches(projectRoot, projectId))
        };
      }
    ],
    [
      "POST /paper/init",
      (payload) => {
        const body = payload as Parameters<typeof initPaper>[1] & { project_root: string };
        return sanitizePublicFormalAuthorityVocabulary(initPaper(body.project_root, body));
      }
    ],
    [
      "GET /paper/state",
      (_payload, parsedUrl) =>
        sanitizePublicFormalAuthorityVocabulary(
          readPaperState(
            parsedUrl.searchParams.get("project_root") ?? "",
            parsedUrl.searchParams.get("project_id") ?? ""
          )
        )
    ],
    [
      "POST /paper/update-section",
      (payload) => {
        const body = payload as Parameters<typeof updatePaperSection>[1] & { project_root: string };
        return sanitizePublicFormalAuthorityVocabulary(updatePaperSection(body.project_root, body));
      }
    ],
    [
      "POST /paper/render-claim",
      (payload) => {
        const body = payload as Parameters<typeof renderClaimBlock>[1] & { project_root: string };
        return sanitizePublicFormalAuthorityVocabulary(renderClaimBlock(body.project_root, body));
      }
    ],
    [
      "GET /paper/check",
      (_payload, parsedUrl) =>
        sanitizePublicFormalAuthorityVocabulary(
          checkPaper(parsedUrl.searchParams.get("project_root") ?? "", {
            project_id: parsedUrl.searchParams.get("project_id") ?? ""
          })
        )
    ],
    [
      "POST /paper/export",
      async (payload) => {
        const body = payload as Parameters<typeof exportPaper>[1] & { project_root: string };
        return publicPaperExportRouteResult(await exportPaper(body.project_root, body));
      }
    ],
    [
      "POST /snapshot/export",
      async (payload) => {
        const body = payload as Parameters<typeof exportSnapshot>[1] & { project_root: string };
        return publicSnapshotExportRouteResult(
          body.project_root,
          await exportSnapshot(body.project_root, { ...body, audience: "public_download" })
        );
      }
    ],
    [
      "POST /snapshot/verify",
      async (payload) => {
        const body = payload as SnapshotManifestRouteBody;
        return publicSnapshotVerifyRouteResult(await verifySnapshot(routeSnapshotManifestPath(body)));
      }
    ],
    [
      "POST /snapshot/restore",
      async (payload) => {
        const body = payload as SnapshotManifestRouteBody & { target_root: string; actor: string };
        return publicSnapshotRestoreRouteResult(
          await restoreSnapshot(routeSnapshotManifestPath(body), body.target_root, { actor: body.actor })
        );
      }
    ],
    [
      "POST /replay/verify-manifest",
      async (payload) => {
        const body = payload as SnapshotManifestRouteBody;
        const result = await verifySnapshot(routeSnapshotManifestPath(body), { reexecuteRunners: true });
        return publicReplayVerifyRouteResult(result);
      }
    ]
  ]);

  const getCampaignOr404 = (projectRoot: string, campaignId: string) => {
    const campaign = getCampaign(projectRoot, campaignId);
    if (!campaign) {
      return null;
    }
    return campaign;
  };

  const dynamicRouteError = (error: unknown): InjectResponse => {
    const comathError = toComathError(error);
    return {
      status: comathError.statusCode,
      body: {
        ok: false,
        code: comathError.code,
        error: comathError.message
      }
    };
  };

  if (method.toUpperCase() === "GET") {
    const agentProfileMatch = /^\/agent\/profile\/([^/]+)$/.exec(url.pathname);
    if (agentProfileMatch && agentProfileMatch[1] !== "list") {
      try {
        return success({ profile: getAgentProfile(decodeURIComponent(agentProfileMatch[1] ?? "")) });
      } catch (error) {
        return dynamicRouteError(error);
      }
    }

    const agentRunLogsMatch = /^\/agent\/run\/([^/]+)\/logs$/.exec(url.pathname);
    if (agentRunLogsMatch) {
      try {
        const maxBytes = url.searchParams.get("max_bytes");
        return success({
          logs: sanitizePublicFormalAuthorityVocabulary(
            readAgentRunLogs(url.searchParams.get("project_root") ?? "", {
              project_id: url.searchParams.get("project_id") ?? "",
              run_id: decodeURIComponent(agentRunLogsMatch[1] ?? ""),
              max_bytes: maxBytes ? Number(maxBytes) : undefined,
              actor: url.searchParams.get("actor") ?? "api"
            })
          )
        });
      } catch (error) {
        return dynamicRouteError(error);
      }
    }

    const agentRunLogStreamMatch = /^\/agent\/run\/([^/]+)\/log-stream$/.exec(url.pathname);
    if (agentRunLogStreamMatch) {
      try {
        const maxBytes = url.searchParams.get("max_bytes");
        const stdoutCursor = url.searchParams.get("stdout_cursor");
        const stderrCursor = url.searchParams.get("stderr_cursor");
        return success({
          stream: sanitizePublicFormalAuthorityVocabulary(
            streamAgentRunLogs(url.searchParams.get("project_root") ?? "", {
              project_id: url.searchParams.get("project_id") ?? "",
              run_id: decodeURIComponent(agentRunLogStreamMatch[1] ?? ""),
              cursor: {
                stdout: stdoutCursor ? Number(stdoutCursor) : 0,
                stderr: stderrCursor ? Number(stderrCursor) : 0
              },
              max_bytes: maxBytes ? Number(maxBytes) : undefined,
              actor: url.searchParams.get("actor") ?? "api"
            })
          )
        });
      } catch (error) {
        return dynamicRouteError(error);
      }
    }

    const agentRunLogSubscriptionMatch = /^\/agent\/run\/([^/]+)\/log-subscription$/.exec(url.pathname);
    if (agentRunLogSubscriptionMatch) {
      try {
        const maxBytes = url.searchParams.get("max_bytes");
        const stdoutCursor = url.searchParams.get("stdout_cursor");
        const stderrCursor = url.searchParams.get("stderr_cursor");
        const retryMs = url.searchParams.get("retry_ms");
        const snapshot = formatAgentRunLogSseSnapshot(url.searchParams.get("project_root") ?? "", {
          project_id: url.searchParams.get("project_id") ?? "",
          run_id: decodeURIComponent(agentRunLogSubscriptionMatch[1] ?? ""),
          cursor: {
            stdout: stdoutCursor ? Number(stdoutCursor) : 0,
            stderr: stderrCursor ? Number(stderrCursor) : 0
          },
          max_bytes: maxBytes ? Number(maxBytes) : undefined,
          retry_ms: retryMs ? Number(retryMs) : undefined,
          actor: url.searchParams.get("actor") ?? "api"
        });
        return {
          status: 200,
          headers: {
            "content-type": snapshot.content_type,
            "cache-control": "no-cache",
            connection: "keep-alive"
          },
          body: sanitizePublicFormalAuthorityVocabulary(snapshot.body)
        };
      } catch (error) {
        return dynamicRouteError(error);
      }
    }

    const agentRunLogSessionMatch = /^\/agent\/run\/([^/]+)\/log-session$/.exec(url.pathname);
    if (agentRunLogSessionMatch) {
      try {
        const maxBytes = url.searchParams.get("max_bytes");
        const maxEvents = url.searchParams.get("max_events");
        const stdoutCursor = url.searchParams.get("stdout_cursor");
        const stderrCursor = url.searchParams.get("stderr_cursor");
        const retryMs = url.searchParams.get("retry_ms");
        const session = formatAgentRunLogSseSession(url.searchParams.get("project_root") ?? "", {
          project_id: url.searchParams.get("project_id") ?? "",
          run_id: decodeURIComponent(agentRunLogSessionMatch[1] ?? ""),
          cursor: {
            stdout: stdoutCursor ? Number(stdoutCursor) : 0,
            stderr: stderrCursor ? Number(stderrCursor) : 0
          },
          max_bytes: maxBytes ? Number(maxBytes) : undefined,
          max_events: maxEvents ? Number(maxEvents) : undefined,
          retry_ms: retryMs ? Number(retryMs) : undefined,
          actor: url.searchParams.get("actor") ?? "api"
        });
        return {
          status: 200,
          headers: {
            "content-type": session.content_type,
            "cache-control": "no-cache",
            connection: "keep-alive"
          },
          body: sanitizePublicFormalAuthorityVocabulary(session.body)
        };
      } catch (error) {
        return dynamicRouteError(error);
      }
    }

    const agentRunOperatorPanelMatch = /^\/agent\/run\/([^/]+)\/operator-panel$/.exec(url.pathname);
    if (agentRunOperatorPanelMatch) {
      try {
        const maxBytes = url.searchParams.get("max_bytes");
        const stdoutCursor = url.searchParams.get("stdout_cursor");
        const stderrCursor = url.searchParams.get("stderr_cursor");
        return success({
          panel: sanitizePublicFormalAuthorityVocabulary(
            readAgentRunOperatorPanel(url.searchParams.get("project_root") ?? "", {
              project_id: url.searchParams.get("project_id") ?? "",
              run_id: decodeURIComponent(agentRunOperatorPanelMatch[1] ?? ""),
              cursor: {
                stdout: stdoutCursor ? Number(stdoutCursor) : 0,
                stderr: stderrCursor ? Number(stderrCursor) : 0
              },
              max_bytes: maxBytes ? Number(maxBytes) : undefined,
              actor: url.searchParams.get("actor") ?? "api"
            })
          )
        });
      } catch (error) {
        return dynamicRouteError(error);
      }
    }

    const statusMatch = /^\/campaign\/([^/]+)\/status$/.exec(url.pathname);
    if (statusMatch) {
      try {
        const projectRoot = url.searchParams.get("project_root") ?? "";
        const campaign = getCampaignOr404(projectRoot, decodeURIComponent(statusMatch[1] ?? ""));
        return campaign
          ? success({ campaign: withPublicExternalV3TerminalState(campaign, { projectRoot }) })
          : { status: 404, body: { ok: false, code: "CAMPAIGN_NOT_FOUND", error: "campaign not found" } };
      } catch (error) {
        return dynamicRouteError(error);
      }
    }

    const nextActionsMatch = /^\/campaign\/([^/]+)\/next-actions$/.exec(url.pathname);
    if (nextActionsMatch) {
      try {
        const campaign = getCampaignOr404(
          url.searchParams.get("project_root") ?? "",
          decodeURIComponent(nextActionsMatch[1] ?? "")
        );
        return campaign
          ? success({
              campaign_id: campaign.campaign_id,
              next_actions: sanitizePublicFormalAuthorityVocabulary(campaign.next_actions),
              external_v3_terminal_state: withPublicExternalV3TerminalState(campaign, { projectRoot: url.searchParams.get("project_root") ?? "" }).external_v3_terminal_state
            })
          : { status: 404, body: { ok: false, code: "CAMPAIGN_NOT_FOUND", error: "campaign not found" } };
      } catch (error) {
        return dynamicRouteError(error);
      }
    }

    const exportMatch = /^\/campaign\/([^/]+)\/export$/.exec(url.pathname);
    if (exportMatch) {
      try {
        return success(
          exportCampaignGoalModeEvidence({
            project_root: url.searchParams.get("project_root") ?? "",
            campaign_id: decodeURIComponent(exportMatch[1] ?? ""),
            actor: url.searchParams.get("actor") ?? "api"
          })
        );
      } catch (error) {
        return dynamicRouteError(error);
      }
    }
  }

  if (method.toUpperCase() === "POST") {
    const tickMatch = /^\/campaign\/([^/]+)\/tick$/.exec(url.pathname);
    if (tickMatch) {
      try {
        const request = body as { project_root: string; actor?: string; command_id?: string };
        return success(
          withPublicExternalV3CampaignResult(
            await tickCampaign({
              project_root: request.project_root,
              campaign_id: decodeURIComponent(tickMatch[1] ?? ""),
              actor: request.actor, command_id: request.command_id
            }),
            { projectRoot: request.project_root }
          )
        );
      } catch (error) {
        return dynamicRouteError(error);
      }
    }

    const replayMatch = /^\/campaign\/([^/]+)\/replay$/.exec(url.pathname);
    if (replayMatch) {
      try {
        const request = body as { project_root: string; actor?: string };
        return success(
          withPublicExternalV3CampaignResult(
            await replayCampaign({
              project_root: request.project_root,
              campaign_id: decodeURIComponent(replayMatch[1] ?? ""),
              actor: request.actor
            }),
            { projectRoot: request.project_root }
          )
        );
      } catch (error) {
        return dynamicRouteError(error);
      }
    }

    const finalAuditMatch = /^\/campaign\/([^/]+)\/final-audit$/.exec(url.pathname);
    if (finalAuditMatch) {
      try {
        const request = body as { project_root: string; actor?: string };
        return success(
          withPublicExternalV3CampaignResult(
            await replayCampaign({
              project_root: request.project_root,
              campaign_id: decodeURIComponent(finalAuditMatch[1] ?? ""),
              actor: request.actor
            }),
            { projectRoot: request.project_root }
          )
        );
      } catch (error) {
        return dynamicRouteError(error);
      }
    }

    const agentRunCancelMatch = /^\/agent\/run\/([^/]+)\/cancel$/.exec(url.pathname);
    if (agentRunCancelMatch) {
      try {
        const request = body as { project_root: string; project_id: string; actor: string };
        return success({
          cancellation: cancelAgentRunFromOperator(request.project_root, {
            project_id: request.project_id,
            run_id: decodeURIComponent(agentRunCancelMatch[1] ?? ""),
            actor: request.actor
          })
        });
      } catch (error) {
        return dynamicRouteError(error);
      }
    }

    const pauseMatch = /^\/campaign\/([^/]+)\/pause$/.exec(url.pathname);
    if (pauseMatch) {
      try {
        const request = body as { project_root: string; actor?: string };
        const campaign = getCampaignOr404(request.project_root, decodeURIComponent(pauseMatch[1] ?? ""));
        if (!campaign) {
          return { status: 404, body: { ok: false, code: "CAMPAIGN_NOT_FOUND", error: "campaign not found" } };
        }
        if (campaign.status === "terminal") {
          return success({ campaign: withPublicExternalV3TerminalState(campaign, { projectRoot: request.project_root }) });
        }
        return success({
          campaign: withPublicExternalV3TerminalState(
            writeCampaign(request.project_root, { ...campaign, status: "paused" }, request.actor ?? "api"),
            { projectRoot: request.project_root }
          )
        });
      } catch (error) {
        return dynamicRouteError(error);
      }
    }

    const resumeMatch = /^\/campaign\/([^/]+)\/resume$/.exec(url.pathname);
    if (resumeMatch) {
      try {
        const request = body as { project_root: string; actor?: string };
        const campaign = getCampaignOr404(request.project_root, decodeURIComponent(resumeMatch[1] ?? ""));
        if (!campaign) {
          return { status: 404, body: { ok: false, code: "CAMPAIGN_NOT_FOUND", error: "campaign not found" } };
        }
        if (campaign.status === "terminal") {
          return success({ campaign: withPublicExternalV3TerminalState(campaign, { projectRoot: request.project_root }) });
        }
        if (campaign.status === "blocked") {
          return {
            status: 409,
            body: {
              ok: false,
              code: "CAMPAIGN_REPAIR_REQUIRED",
              error: "blocked campaigns require stage-gate repair evidence before resume"
            }
          };
        }
        if (campaign.status !== "paused") {
          return success({ campaign: withPublicExternalV3TerminalState(campaign, { projectRoot: request.project_root }) });
        }
        return success({
          campaign: withPublicExternalV3TerminalState(
            writeCampaign(request.project_root, { ...campaign, status: "running" }, request.actor ?? "api"),
            { projectRoot: request.project_root }
          )
        });
      } catch (error) {
        return dynamicRouteError(error);
      }
    }

    const cancelMatch = /^\/campaign\/([^/]+)\/cancel$/.exec(url.pathname);
    if (cancelMatch) {
      try {
        const request = body as { project_root: string; actor?: string };
        const campaign = getCampaignOr404(request.project_root, decodeURIComponent(cancelMatch[1] ?? ""));
        if (!campaign) {
          return { status: 404, body: { ok: false, code: "CAMPAIGN_NOT_FOUND", error: "campaign not found" } };
        }
        const runtime = getAcquiredProjectRuntime(request.project_root);
        if (runtime?.store.getCampaign(campaign.campaign_id)) {
          const bridge = getProofWorkflowBridge(runtime);
          if (!bridge) throw new ComathError("Proof workflow owner is unavailable", { code: "PROOF_WORKFLOW_OWNER_UNAVAILABLE", statusCode: 503 });
          await bridge.cancel(campaign.campaign_id, request.actor);
          return success({ campaign: withPublicExternalV3TerminalState(getCampaignOr404(request.project_root, campaign.campaign_id)!, { projectRoot: request.project_root }) });
        }
        if (campaign.status === "terminal") {
          return success({ campaign: withPublicExternalV3TerminalState(campaign, { projectRoot: request.project_root }) });
        }
        return success({
          campaign: withPublicExternalV3TerminalState(
            writeCampaign(
              request.project_root,
              { ...campaign, current_stage: "cancelled", status: "terminal", terminal_state: "cancelled_by_user" },
              request.actor ?? "api"
            ),
            { projectRoot: request.project_root }
          )
        });
      } catch (error) {
        return dynamicRouteError(error);
      }
    }

    const repairResumeMatch = /^\/campaign\/([^/]+)\/repair-resume$/.exec(url.pathname);
    if (repairResumeMatch) {
      try {
        const request = body as {
          project_root: string;
          actor?: string;
          blocker_artifact_path: string;
          repaired_artifacts: string[];
        };
        const result = repairStageGateAndResume({
          project_root: request.project_root,
          campaign_id: decodeURIComponent(repairResumeMatch[1] ?? ""),
          actor: request.actor,
          blocker_artifact_path: request.blocker_artifact_path,
          repaired_artifacts: request.repaired_artifacts
        });
        return success({
          ...result,
          campaign: withPublicExternalV3TerminalState(result.campaign, { projectRoot: request.project_root })
        });
      } catch (error) {
        return dynamicRouteError(error);
      }
    }
  }

  const handler = handlers.get(`${method.toUpperCase()} ${url.pathname}`);
  if (!handler) {
    return { status: 404, body: { ok: false, error: "not found" } };
  }

  try {
    return success(await handler(body, url));
  } catch (error) {
    const comathError = toComathError(error);
    return {
      status: comathError.statusCode,
      body: {
        ok: false,
        code: comathError.code,
        error: comathError.message
      }
    };
  }
}

async function readJson(req: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  if (chunks.length === 0) {
    return undefined;
  }
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

function writeJson(res: ServerResponse, response: InjectResponse): void {
  res.statusCode = response.status;
  if (response.headers) {
    for (const [name, value] of Object.entries(response.headers)) {
      res.setHeader(name, value);
    }
  }
  const contentType = response.headers?.["content-type"] ?? "application/json; charset=utf-8";
  res.setHeader("content-type", contentType);
  if (contentType.startsWith("text/event-stream")) {
    res.end(response.body);
    return;
  }
  res.end(`${JSON.stringify(response.body)}\n`);
}

export type ComathServer = {
  inject(request: InjectRequest): Promise<InjectResponse>;
  listen(port?: number, hostname?: string): Promise<Server>;
  close(): Promise<void>;
};

export type ComathServerOptions = { project_root?: string; config_path?: string; research?: ResearchDaemonOptions };
function canonicalServerRoot(root: string): string {
  const value = realpathSync(root); return process.platform === "win32" ? value.toLowerCase() : value;
}
function lifecycleRouteError(cause: unknown): InjectResponse {
  const error = toComathError(cause);
  return { status: error.statusCode, body: { ok: false, code: error.code, error: error.message } };
}
function readOperatorArtifact(reference: ResearchDaemonReference, artifactId: string): { bytes: Buffer; sha256: string } {
  if (!/^[A-Za-z0-9][A-Za-z0-9_-]{0,159}$/.test(artifactId)) throw new ComathError("Invalid artifact ID", { code: "RESEARCH_ARTIFACT_ID_INVALID", statusCode: 400 });
  const record = listArtifactRefs(reference.daemon.runtime.root).find(value => value.id === artifactId);
  if (!record) throw new ComathError("Artifact does not exist", { code: "RESEARCH_ARTIFACT_NOT_FOUND", statusCode: 404 });
  const taskReference = reference.daemon.runtime.store.all("SELECT task_json FROM tasks").some(row => {
    const task = JSON.parse(String(row.task_json)) as { input_refs?: { artifact_id: string; sha256: string }[]; accepted_result_id?: string; campaign_id: string };
    return task.accepted_result_id === record.id || task.input_refs?.some(value => value.artifact_id === record.id && value.sha256 === record.sha256) === true;
  });
  const checkpointReference = reference.daemon.runtime.store.all("SELECT artifact_ref FROM checkpoints").some(row => {
    try { const value = JSON.parse(String(row.artifact_ref)) as { artifact_id: string; sha256: string }; return value.artifact_id === record.id && value.sha256 === record.sha256; } catch { return false; }
  });
  if (!taskReference && !checkpointReference) throw new ComathError("Artifact is not referenced by readable research state", { code: "RESEARCH_ARTIFACT_FORBIDDEN", statusCode: 404 });
  const target = artifactPathForHash(reference.daemon.runtime.root, record.sha256);
  if (record.path.replace(/\\/g, "/") !== target.relative_path.replace(/\\/g, "/")) throw new ComathError("Artifact CAS path is invalid", { code: "RESEARCH_ARTIFACT_CORRUPT", statusCode: 409 });
  const info = statSync(target.absolute_path);
  if (!info.isFile() || info.size !== record.size_bytes || info.size > 16 * 1024 * 1024) throw new ComathError("Artifact bytes are unavailable", { code: "RESEARCH_ARTIFACT_UNAVAILABLE", statusCode: 413 });
  const bytes = readFileSync(target.absolute_path);
  if (createHash("sha256").update(bytes).digest("hex") !== record.sha256) throw new ComathError("Artifact hash is invalid", { code: "RESEARCH_ARTIFACT_CORRUPT", statusCode: 409 });
  return { bytes, sha256: record.sha256 };
}
function parseByteRange(header: string | string[] | undefined, size: number): { start: number; end: number; partial: boolean } {
  const value = Array.isArray(header) ? header[0] : header;
  if (!value) return { start: 0, end: Math.max(0, size - 1), partial: false };
  const match = /^bytes=(\d+)-(\d*)$/.exec(value);
  if (!match) throw new ComathError("Only a single bytes=start-end range is supported", { code: "RESEARCH_ARTIFACT_RANGE_INVALID", statusCode: 416 });
  const start = Number(match[1]), end = match[2] ? Number(match[2]) : size - 1;
  if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start < 0 || end < start || start >= size) throw new ComathError("Artifact byte range is unsatisfied", { code: "RESEARCH_ARTIFACT_RANGE_INVALID", statusCode: 416 });
  return { start, end: Math.min(end, size - 1), partial: true };
}

export function createComathServer(options: ComathServerOptions = {}): ComathServer {
  let server: Server | undefined;
  let starting: Promise<ResearchDaemonReference> | undefined;
  let closing: Promise<void> | undefined;
  let listening = false;
  const sseClosers = new Set<() => void>();
  if (options.project_root && !isAbsolute(options.project_root)) throw new Error("Bound project root must be absolute");
  const context: RouteContext = {
    memoryDbs: new Map(), boundRoot: options.project_root ? realpathSync(options.project_root) : undefined
  };
  function initialize(): Promise<ResearchDaemonReference> | undefined {
    if (!context.boundRoot) return;
    // Legacy embedders may already own the runtime. Their existing facade and queue stay authoritative.
    if (!starting && !options.project_root && !options.research && !options.config_path && getAcquiredProjectRuntime(context.boundRoot)) return;
    if (!starting) {
      const config = options.research?.config ?? loadConfig(context.boundRoot, { config_path: options.config_path }).research ?? researchConfigSchema.parse({});
      starting = acquireResearchDaemon(context.boundRoot, options.research ?? { config });
    }
    return starting;
  }
  async function dispatch(request: InjectRequest): Promise<InjectResponse> {
    if (closing) return { status: 503, body: { ok: false, code: "DAEMON_CLOSING", error: "Service is closing" } };
    try {
      if (!context.boundRoot && request.method === "POST" && request.path !== "/project/init") {
        const payload = request.body && typeof request.body === "object" ? request.body as Record<string, unknown> : {};
        const root = payload.project_root ?? payload.root_path;
        if (typeof root === "string" && isAbsolute(root)) context.boundRoot = realpathSync(root);
      }
      const reference = await initialize();
      if (closing) return { status: 503, body: { ok: false, code: "DAEMON_CLOSING" } };
      const work = route(request.method, request.path, request.body, context);
      reference?.daemon.trackApplicationWork(work);
      return await work;
    } catch (error) { return lifecycleRouteError(error); }
  }

  return {
    inject: dispatch,
    async listen(port = 0, hostname = "127.0.0.1") {
      if (closing || listening) throw new ComathError("Server is already listening or closing", { code: "SERVER_LIFECYCLE_CONFLICT", statusCode: 409 });
      listening = true;
      const reference = await initialize();
      await reference?.daemon.listenWorkerGateway();
      server = createServer(async (req, res) => {
        try {
          const url = new URL(req.url ?? "/", "http://localhost");
          const artifactMatch = /^\/research\/v1\/artifacts\/([^/]+)$/.exec(url.pathname);
          if (req.method === "GET" && artifactMatch && reference) {
            authenticateOperator(req.headers, reference.daemon.config);
            const artifact = readOperatorArtifact(reference, decodeURIComponent(artifactMatch[1]!)), range = parseByteRange(req.headers.range, artifact.bytes.length);
            const body = artifact.bytes.subarray(range.start, range.end + 1);
            res.writeHead(range.partial ? 206 : 200, { "content-type": "application/octet-stream", "content-length": String(body.length), "accept-ranges": "bytes",
              etag: `\"sha256-${artifact.sha256}\"`, ...(range.partial ? { "content-range": `bytes ${range.start}-${range.end}/${artifact.bytes.length}` } : {}) });
            res.end(body); return;
          }
          const hostMutation = req.method === "POST" && /^\/host\/v1\/intakes\/[^/]+\/(tickets|approve)$/.test(url.pathname);
          const operatorMutation = req.method === "POST" && (/^\/research\/v1\/campaigns\/[^/]+\/intakes$/.test(url.pathname)
            || /^\/research\/v1\/intakes\/[^/]+\/approval-requests$/.test(url.pathname)
            || /^\/research\/v1\/campaigns\/[^/]+\/(patches|budget)$/.test(url.pathname)
            || /^\/research\/v1\/campaigns\/[^/]+\/(pause|resume|cancel|finish)$/.test(url.pathname)
            || /^\/research\/v1\/tasks\/[^/]+\/(retry|cancel)$/.test(url.pathname));
          const intakeRead = req.method === "GET" && /^\/research\/v1\/intakes\/[^/]+$/.test(url.pathname);
          const operatorRead = req.method === "GET" && /^\/research\/v1\/campaigns\/[^/]+(?:\/(frontier|budget|events|dashboard))?$/.test(url.pathname);
          const taskRead = req.method === "GET" && /^\/research\/v1\/tasks\/[^/]+(?:\/checkpoint)?$/.test(url.pathname);
          const operationRead = req.method === "GET" && /^\/research\/v1\/operations\/[^/]+$/.test(url.pathname);
          if (reference && (hostMutation || operatorMutation || intakeRead || operatorRead || taskRead || operationRead)) {
            const principal = hostMutation ? authenticateHost(req.headers, reference.daemon.config)
              : intakeRead ? authenticateResearchReader(req.headers, reference.daemon.config) : authenticateOperator(req.headers, reference.daemon.config);
            const work = dispatchResearchRoute(reference.daemon, req.method ?? "GET", url,
              req.method === "GET" ? undefined : await readJson(req), principal);
            reference.daemon.trackApplicationWork(work);
            const response = await work;
            if (response) { writeJson(res, response); return; }
          }
          if (req.method === "POST" && url.pathname === "/research/v1/campaigns" && reference) {
            const result = reference.daemon.startCampaign(authenticateOperator(req.headers, reference.daemon.config), await readJson(req));
            writeJson(res, { status: 202, body: { ok: true, data: result } });
            return;
          }
          if (req.method === "GET" && url.pathname === "/research/v1/capabilities" && reference) {
            authenticateOperator(req.headers, reference.daemon.config);
            const campaign = reference.daemon.runtime.store.listCampaigns().at(0);
            writeJson(res, { status: 200, body: { ok: true, data: { protocol_version: 1, project_id: campaign?.project_id ?? null,
              control_ready: reference.daemon.config.enabled && reference.daemon.app.startup_blockers.length === 0,
              missing_configuration: reference.daemon.config.enabled ? [] : ["research.enabled"], operator_tools: [
                "research_capabilities_get", "research_campaign_list", "research_campaign_start", "research_campaign_get", "research_frontier_get",
                "research_budget_get", "research_budget_update", "research_dag_patch", "research_campaign_pause", "research_campaign_resume",
                "research_campaign_cancel", "research_campaign_finish", "research_task_get", "research_task_cancel", "research_task_retry",
                "research_checkpoint_get", "research_artifact_read", "research_events_read", "research_intake_prepare", "research_intake_request_approval",
                "research_operation_get"
              ] } } });
            return;
          }
          if (req.method === "GET" && url.pathname === "/research/v1/campaigns" && reference) {
            const principal = authenticateOperator(req.headers, reference.daemon.config);
            const offset = Number(url.searchParams.get("offset") ?? "0");
            const limit = Number(url.searchParams.get("limit") ?? "50");
            if (!Number.isSafeInteger(offset) || offset < 0 || !Number.isSafeInteger(limit) || limit < 1 || limit > 200) {
              writeJson(res, { status: 400, body: { ok: false, code: "INVALID_CAMPAIGN_PAGE" } }); return;
            }
            const commandId = url.searchParams.get("command_id");
            let campaigns = reference.daemon.runtime.store.listCampaigns();
            if (commandId !== null) {
              if (!/^[A-Za-z0-9][A-Za-z0-9_-]{0,159}$/.test(commandId)) {
                writeJson(res, { status: 400, body: { ok: false, code: "INVALID_START_COMMAND" } }); return;
              }
              const receipt = reference.daemon.runtime.store.get("SELECT principal_id,response_json,status FROM commands WHERE command_id=?", commandId);
              if (!receipt || receipt.principal_id !== `operator:${principal.id}` || receipt.status !== "committed") campaigns = [];
              else {
                try {
                  const response = JSON.parse(String(receipt.response_json)) as { campaign_id?: unknown };
                  const campaignId = typeof response.campaign_id === "string" ? response.campaign_id : undefined;
                  campaigns = campaignId ? campaigns.filter(campaign => campaign.campaign_id === campaignId) : [];
                } catch { campaigns = []; }
              }
            }
            writeJson(res, { status: 200, body: { campaigns: campaigns.slice(offset, offset + limit), offset, limit, total: campaigns.length } });
            return;
          }
          const campaignStream = /^\/research\/v1\/campaigns\/([^/]+)\/events\/stream$/.exec(url.pathname);
          if (req.method === "GET" && (url.pathname === "/research/v1/events" || campaignStream) && reference) {
            authenticateOperator(req.headers, reference.daemon.config);
            const campaignId = campaignStream ? decodeURIComponent(campaignStream[1]!) : url.searchParams.get("campaign_id") ?? undefined;
            if (campaignId) reference.daemon.app.frontier(campaignId, { limit: 1 });
            const header = req.headers["last-event-id"];
            let cursor = header === undefined ? 0 : Number(Array.isArray(header) ? header[0] : header);
            if (!Number.isSafeInteger(cursor) || cursor < 0) {
              writeJson(res, { status: 400, body: { ok: false, code: "INVALID_EVENT_CURSOR", error: "Last-Event-ID must be a nonnegative durable event sequence" } }); return;
            }
            const events = reference.daemon.app.events;
            // Validate both malformed and future cursors before committing HTTP 200.
            events.readEventsAfter({ ...(campaignId ? { campaign_id: campaignId } : {}), after_seq: cursor, limit: 1 });
            let draining = false, closed = false, heartbeat: ReturnType<typeof setInterval> | undefined, unsubscribe: (() => void) | undefined;
            const MAX_SSE_FRAME_BYTES = 240 * 1024;
            const closeStream = () => {
              if (closed) return;
              closed = true; if (heartbeat) clearInterval(heartbeat); unsubscribe?.(); sseClosers.delete(closeStream);
              res.off("drain", onDrain); if (!res.writableEnded) res.end();
            };
            const onDrain = () => { draining = false; write(); };
            const emit = (frame: string) => {
              if (Buffer.byteLength(frame, "utf8") > MAX_SSE_FRAME_BYTES) { closeStream(); return false; }
              if (!res.write(frame)) { draining = true; res.once("drain", onDrain); return false; }
              return true;
            };
            const write = () => {
              if (closed || res.writableEnded || draining) return;
              try {
                for (const event of events.readEventsAfter({ ...(campaignId ? { campaign_id: campaignId } : {}), after_seq: cursor, limit: 200 })) {
                  const frame = `id: ${event.seq}\nevent: research.event\ndata: ${JSON.stringify(event)}\n\n`;
                  if (!emit(frame)) return;
                  cursor = event.seq;
                }
              } catch { closeStream(); }
            };
            res.writeHead(200, { "content-type": "text/event-stream", "cache-control": "no-cache", connection: "keep-alive" });
            write();
            unsubscribe = events.subscribe(write);
            // Re-read after the subscription is installed: this closes the snapshot/tail race.
            write();
            heartbeat = setInterval(() => { if (!closed && !draining) emit(": heartbeat\n\n"); }, 15000);
            heartbeat.unref();
            sseClosers.add(closeStream);
            req.once("close", closeStream);
            return;
          }
          if (req.method !== "GET" && req.method !== "POST") {
            writeJson(res, { status: 405, body: { ok: false, code: "METHOD_NOT_ALLOWED" } }); return;
          }
          const response = await dispatch({ method: req.method === "POST" ? "POST" : "GET", path: req.url ?? "/", body: await readJson(req) });
          writeJson(res, response);
        } catch (error) { writeJson(res, lifecycleRouteError(error)); }
      });

      return new Promise<Server>((resolve, reject) => {
        const onError = (error: Error) => { listening = false; reject(error); };
        server!.once("error", onError);
        server!.listen(port, hostname, () => {
          server!.off("error", onError);
          reference?.daemon.start(); resolve(server as Server);
        });
      });
    },
    close() {
      if (closing) return closing;
      closing = Promise.resolve().then(async () => {
        const errors: unknown[] = [];
        try { const reference = await starting; await reference?.release(); } catch (error) { errors.push(error); }
        for (const closeStream of [...sseClosers]) closeStream();
        try {
          if (!starting && context.boundRoot) await shutdownLegacyRuntime(context.boundRoot);
          if (server?.listening) await new Promise<void>((resolve, reject) => {
            server!.close(error => error ? reject(error) : resolve()); server!.closeAllConnections();
          });
        } catch (error) { errors.push(error); }
        context.memoryDbs.clear();
        if (errors.length) throw new AggregateError(errors, "Service shutdown reported cleanup errors");
      });
      return closing;
    }
  };
}
