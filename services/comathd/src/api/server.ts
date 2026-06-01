import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";
import { isAbsolute, relative, resolve } from "node:path";
import { URL } from "node:url";
import { toComathError } from "../errors.js";
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
import {
  collectPiCodexLifecycleEvidence,
  probePiCodexProductionCodexAccountNetwork,
  probePiCodexDurableServiceLifecycle,
  probePiCodexRealPiInstallRuntimeRegistration,
  reviewPiCodexLifecycleReadiness
} from "../release/pi-codex-lifecycle-readiness.js";
import {
  buildAgentProfileLaunch,
  buildAgentAdapterPackageLaunch,
  createAgentRunForProfile,
  executeAgentAdapterPackage,
  executeProfileAgentRun,
  validateExternalCodexCliInstallation,
  cancelAgentRunFromOperator,
  getAgentProfile,
  formatAgentRunLogSseSession,
  listAgentAdapterPackages,
  readAgentRunOperatorPanel,
  listAgentProfiles,
  formatAgentRunLogSseSnapshot,
  probeAgentAdapterHealth,
  readAgentRunLogs,
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
        const request = body as { project_root: string; actor?: string };
        return success(
          withPublicExternalV3CampaignResult(
            await tickCampaign({
              project_root: request.project_root,
              campaign_id: decodeURIComponent(tickMatch[1] ?? ""),
              actor: request.actor
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

export function createComathServer(): ComathServer {
  let server: Server | undefined;
  const context: RouteContext = {
    memoryDbs: new Map()
  };

  return {
    inject(request) {
      return route(request.method, request.path, request.body, context);
    },
    listen(port = 0, hostname = "127.0.0.1") {
      server = createServer(async (req, res) => {
        const response = await route(req.method ?? "GET", req.url ?? "/", await readJson(req), context);
        writeJson(res, response);
      });

      return new Promise((resolve, reject) => {
        server?.once("error", reject);
        server?.listen(port, hostname, () => resolve(server as Server));
      });
    },
    close() {
      if (!server?.listening) {
        return Promise.resolve();
      }
      return new Promise((resolve, reject) => {
        server?.close((error) => {
          if (error) {
            reject(error);
            return;
          }
          resolve();
        });
      });
    }
  };
}
