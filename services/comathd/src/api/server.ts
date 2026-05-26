import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";
import { URL } from "node:url";
import { appendAuditEvent, readAuditEvents } from "../audit/jsonl-writer.js";
import { toComathError } from "../errors.js";
import { getComathdStatus } from "../status.js";
import { getProjectStatus, initProject, openProject } from "../project/project-store.js";
import { getClaim, linkClaims, readClaims, registerClaim, updateClaim } from "../claim/claim-store.js";
import { appendEvidenceRecord, readEvidenceRecords } from "../evidence/store.js";
import { promoteClaim } from "../verification/gate.js";
import {
  checkPaper,
  exportPaper,
  initPaper,
  readPaperState,
  renderClaimBlock,
  updatePaperSection
} from "../artifacts/paper.js";
import { importArtifact, listArtifactRefs } from "../artifacts/store.js";
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
import { createMathGraphIndex, type MathGraphIndex } from "../memory/math-graph-index.js";
import {
  getWorkstreamStatus,
  listWorkstreams,
  readWorkstreamBundle,
  spawnWorkstream,
  transitionWorkstreamStatus,
  writeWorkstreamReport
} from "../workstream/workstream-store.js";

export type InjectRequest = {
  method: "GET" | "POST";
  path: string;
  body?: unknown;
};

export type InjectResponse = {
  status: number;
  body: any;
};

type RouteHandler = (body: unknown, url: URL) => unknown | Promise<unknown>;

type RouteContext = {
  memoryDbs: Map<string, InMemoryResearchMemoryDB>;
  graphIndexes: Map<string, MathGraphIndex>;
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

async function getMathGraphIndex(context: RouteContext, projectRoot: string, projectId: string): Promise<MathGraphIndex> {
  const key = memoryKey(projectRoot, projectId);
  const existing = context.graphIndexes.get(key);
  if (existing) {
    return existing;
  }
  const db = await getMemoryDb(context, projectRoot, projectId);
  const index = createMathGraphIndex({
    db,
    backend: "memory",
    projectRoot,
    projectId
  });
  await index.init(projectRoot, projectId);
  context.graphIndexes.set(key, index);
  return index;
}

function success(body: unknown): InjectResponse {
  return { status: 200, body };
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
    ["POST /project/init", (payload) => initProject(payload as { name?: string; root_path: string })],
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
        claim: getClaim(
          parsedUrl.searchParams.get("project_root") ?? "",
          parsedUrl.searchParams.get("project_id") ?? "",
          parsedUrl.searchParams.get("claim_id") ?? ""
        )
      })
    ],
    [
      "POST /evidence/attach",
      (payload) => {
        const body = payload as {
          project_root: string;
          project_id: string;
          claim_id?: string;
          kind: "literature" | "computation" | "symbolic" | "lean" | "counterexample" | "audit" | "other";
          summary: string;
          artifact_ids?: string[];
          actor?: string;
        };
        const evidence = appendEvidenceRecord(body.project_root, {
          project_id: body.project_id,
          claim_id: body.claim_id,
          kind: body.kind,
          summary: body.summary,
          artifact_ids: body.artifact_ids ?? []
        });
        appendAuditEvent(body.project_root, {
          project_id: body.project_id,
          event_type: "evidence.attached",
          actor: body.actor ?? "api",
          target_id: body.claim_id,
          payload: {
            evidence_id: evidence.id,
            kind: evidence.kind,
            artifact_ids: evidence.artifact_ids
          }
        });
        return { evidence };
      }
    ],
    [
      "GET /status/snapshot",
      (_payload, parsedUrl) => {
        const projectRoot = parsedUrl.searchParams.get("project_root") ?? "";
        const projectId = parsedUrl.searchParams.get("project_id") ?? "";
        return {
          service: getComathdStatus(),
          project: getProjectStatus({ root_path: projectRoot }),
          claims: readClaims(projectRoot, projectId),
          evidence: readEvidenceRecords(projectRoot, projectId),
          workstreams: listWorkstreams(projectRoot, projectId),
          audit_event_count: readAuditEvents(projectRoot).filter((event) => event.project_id === projectId).length
        };
      }
    ],
    [
      "POST /artifact/import",
      async (payload) => {
        const body = payload as {
          project_root: string;
          project_id: string;
          source_path: string;
          kind: Parameters<typeof importArtifact>[0]["kind"];
          actor: string;
        };
        return {
          artifact: await importArtifact({
            projectRoot: body.project_root,
            project_id: body.project_id,
            source_path: body.source_path,
            kind: body.kind,
            actor: body.actor
          })
        };
      }
    ],
    [
      "GET /artifact/list",
      (_payload, parsedUrl) => {
        const projectRoot = parsedUrl.searchParams.get("project_root") ?? "";
        const projectId = parsedUrl.searchParams.get("project_id") ?? "";
        const artifacts = listArtifactRefs(projectRoot).filter((artifact) => !projectId || artifact.project_id === projectId);
        return { artifacts };
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
      "GET /workstream/status",
      (_payload, parsedUrl) => ({
        workstream: getWorkstreamStatus(parsedUrl.searchParams.get("project_root") ?? "", {
          project_id: parsedUrl.searchParams.get("project_id") ?? "",
          workstream_id: parsedUrl.searchParams.get("workstream_id") ?? ""
        })
      })
    ],
    [
      "GET /workstream/list",
      (_payload, parsedUrl) => ({
        workstreams: listWorkstreams(
          parsedUrl.searchParams.get("project_root") ?? "",
          parsedUrl.searchParams.get("project_id") ?? ""
        )
      })
    ],
    [
      "GET /workstream/bundle",
      (_payload, parsedUrl) =>
        readWorkstreamBundle(parsedUrl.searchParams.get("project_root") ?? "", {
          project_id: parsedUrl.searchParams.get("project_id") ?? "",
          workstream_id: parsedUrl.searchParams.get("workstream_id") ?? ""
        })
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
        const body = payload as Parameters<typeof buildGraphPatchFromWorkstream>[1] & { project_root: string };
        return {
          patch: buildGraphPatchFromWorkstream(body.project_root, body)
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
      "GET /memory/health",
      async (_payload, parsedUrl) => {
        const projectRoot = parsedUrl.searchParams.get("project_root") ?? "";
        const projectId = parsedUrl.searchParams.get("project_id") ?? "";
        const index = await getMathGraphIndex(context, projectRoot, projectId);
        return { health: await index.health() };
      }
    ],
    [
      "POST /memory/rebuild",
      async (payload) => {
        const body = payload as { project_root: string; project_id: string };
        const index = await getMathGraphIndex(context, body.project_root, body.project_id);
        return { health: await index.rebuildFromLedger() };
      }
    ],
    [
      "POST /memory/search",
      async (payload) => {
        const body = payload as {
          project_root: string;
          project_id: string;
          query: string;
          limit?: number;
          node_types?: Parameters<InMemoryResearchMemoryDB["search"]>[0]["node_types"];
        };
        const db = await getMemoryDb(context, body.project_root, body.project_id);
        return {
          results: await db.search({
            project_id: body.project_id,
            query: body.query,
            limit: body.limit,
            node_types: body.node_types
          })
        };
      }
    ],
    [
      "POST /memory/context-pack",
      async (payload) => {
        const body = payload as {
          project_root: string;
          project_id: string;
          seed_ids: string[];
          depth?: number;
          limit?: number;
        };
        const db = await getMemoryDb(context, body.project_root, body.project_id);
        return {
          context_pack: await db.contextPack({
            project_id: body.project_id,
            seed_ids: body.seed_ids,
            depth: body.depth,
            limit: body.limit
          })
        };
      }
    ],
    [
      "POST /literature/import-bibtex",
      (payload) => {
        const body = payload as Parameters<typeof importBibTeX>[1] & { project_root: string };
        return importBibTeX(body.project_root, body);
      }
    ],
    [
      "POST /literature/import-pdf",
      (payload) => {
        const body = payload as Parameters<typeof importLiteraturePdf>[1] & { project_root: string };
        return importLiteraturePdf(body.project_root, body);
      }
    ],
    [
      "POST /literature/register-citation",
      (payload) => {
        const body = payload as Parameters<typeof registerCitation>[1] & { project_root: string };
        return { citation: registerCitation(body.project_root, body) };
      }
    ],
    [
      "POST /literature/check-condition",
      (payload) => {
        const body = payload as Parameters<typeof checkCitationConditions>[1] & { project_root: string };
        return { match: checkCitationConditions(body.project_root, body) };
      }
    ],
    [
      "GET /literature/list",
      (_payload, parsedUrl) => {
        const projectRoot = parsedUrl.searchParams.get("project_root") ?? "";
        const projectId = parsedUrl.searchParams.get("project_id") ?? "";
        return {
          citations: listCitations(projectRoot, projectId),
          condition_matches: listCitationConditionMatches(projectRoot, projectId)
        };
      }
    ],
    [
      "POST /paper/init",
      (payload) => {
        const body = payload as Parameters<typeof initPaper>[1] & { project_root: string };
        return initPaper(body.project_root, body);
      }
    ],
    [
      "GET /paper/state",
      (_payload, parsedUrl) =>
        readPaperState(
          parsedUrl.searchParams.get("project_root") ?? "",
          parsedUrl.searchParams.get("project_id") ?? ""
        )
    ],
    [
      "POST /paper/update-section",
      (payload) => {
        const body = payload as Parameters<typeof updatePaperSection>[1] & { project_root: string };
        return updatePaperSection(body.project_root, body);
      }
    ],
    [
      "POST /paper/render-claim",
      (payload) => {
        const body = payload as Parameters<typeof renderClaimBlock>[1] & { project_root: string };
        return renderClaimBlock(body.project_root, body);
      }
    ],
    [
      "GET /paper/check",
      (_payload, parsedUrl) =>
        checkPaper(parsedUrl.searchParams.get("project_root") ?? "", {
          project_id: parsedUrl.searchParams.get("project_id") ?? ""
        })
    ],
    [
      "POST /paper/export",
      (payload) => {
        const body = payload as Parameters<typeof exportPaper>[1] & { project_root: string };
        return exportPaper(body.project_root, body);
      }
    ],
    [
      "POST /snapshot/export",
      (payload) => {
        const body = payload as Parameters<typeof exportSnapshot>[1] & { project_root: string };
        return exportSnapshot(body.project_root, body);
      }
    ],
    [
      "POST /snapshot/verify",
      (payload) => {
        const body = payload as { manifest_path: string };
        return verifySnapshot(body.manifest_path);
      }
    ],
    [
      "POST /snapshot/restore",
      (payload) => {
        const body = payload as { manifest_path: string; target_root: string; actor: string };
        return restoreSnapshot(body.manifest_path, body.target_root, { actor: body.actor });
      }
    ],
    [
      "POST /replay/verify-manifest",
      async (payload) => {
        const body = payload as { manifest_path: string };
        const result = await verifySnapshot(body.manifest_path);
        return {
          ...result,
          replay: result.manifest?.replay ?? null
        };
      }
    ]
  ]);

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
  res.setHeader("content-type", "application/json; charset=utf-8");
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
    memoryDbs: new Map(),
    graphIndexes: new Map()
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
