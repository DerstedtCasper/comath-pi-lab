import { createServer, type IncomingMessage } from "node:http";
import { createHash, randomUUID } from "node:crypto";
import { mkdir, readFile, stat, unlink, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import type { AddressInfo } from "node:net";
import { z } from "zod";
import { listArtifactRefs } from "../artifacts/store.js";
import { ComathError, toComathError } from "../errors.js";
import { createCheckpointStore, researchCheckpointSchema } from "../research/checkpoint-store.js";
import { prepareArtifact, commitArtifactReference } from "../research/research-artifacts.js";
import { resolveProjectCommitPath, withProjectCommit } from "../research/project-commit.js";
import type { ProjectRuntime } from "../research/project-runtime.js";
import type { ArtifactPointer } from "../research/research-schemas.js";
import { authenticateWorker, requireWorkerIdentity, type WorkerPrincipal } from "./worker-auth.js";

const identity = { command_id: z.string().min(1).max(160), task_id: z.string().min(1).max(160), generation: z.number().int().positive() };
const checkpointRequest = z.strictObject({ ...identity, checkpoint: researchCheckpointSchema });
const artifactRequest = z.strictObject({ ...identity, content_base64: z.string().max(900000), kind: z.literal("other").default("other") });
const commandRequest = z.strictObject({ ...identity, payload: z.json() });
export type WorkerGatewayOptions = {
  authorizeArtifact: (attemptKey: string, ref: ArtifactPointer) => boolean;
  context?: (principal: WorkerPrincipal) => unknown | Promise<unknown>;
  result?: (principal: WorkerPrincipal, body: unknown) => unknown | Promise<unknown>;
  failure?: (principal: WorkerPrincipal, body: unknown) => unknown | Promise<unknown>;
  proposal?: (principal: WorkerPrincipal, body: unknown) => unknown | Promise<unknown>;
  tool?: (principal: WorkerPrincipal, toolId: string, body: unknown, signal: AbortSignal) => unknown | Promise<unknown>;
  onArtifactCommitted?: (principal: WorkerPrincipal, ref: ArtifactPointer) => void;
};
async function readBody(request: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = []; let size = 0;
  for await (const chunk of request) {
    size += chunk.length;
    if (size > 1024 * 1024) throw new ComathError("Worker body exceeds 1 MiB", { code: "WORKER_BODY_TOO_LARGE", statusCode: 413 });
    chunks.push(Buffer.from(chunk));
  }
  try { return JSON.parse(Buffer.concat(chunks).toString("utf8")); }
  catch { throw new ComathError("Worker request must contain JSON", { code: "WORKER_BODY_INVALID", statusCode: 400 }); }
}
function unavailable(): never { throw new ComathError("Requested worker capability is not configured", { code: "WORKER_CAPABILITY_UNAVAILABLE", statusCode: 503 }); }

/** Dedicated listener: operator/host routes are never registered here. */
export function createWorkerGateway(runtime: ProjectRuntime, options: WorkerGatewayOptions) {
  const checkpoints = createCheckpointStore(runtime, options);
  const activeTools = new Set<AbortController>();
  const server = createServer(async (request, response) => {
    try {
      const url = new URL(request.url ?? "/", "http://worker.local");
      const checkpointRoute = url.pathname === "/worker/v1/checkpoints";
      const artifactPut = url.pathname === "/worker/v1/artifacts";
      const artifactRead = /^\/worker\/v1\/artifacts\/([^/]+)$/.exec(url.pathname);
      const tool = /^\/worker\/v1\/tools\/([A-Za-z0-9_.-]+)$/.exec(url.pathname);
      const get = request.method === "GET", post = request.method === "POST";
      if (!(get && (url.pathname === "/worker/v1/context" || artifactRead)
        || post && (checkpointRoute || artifactPut || tool || ["/worker/v1/results", "/worker/v1/failures", "/worker/v1/proposals"].includes(url.pathname)))) {
        throw new ComathError("Route not found", { code: "NOT_FOUND", statusCode: 404 });
      }
      if (request.headers.origin) throw new ComathError("Browser origins are not accepted by worker transport", { code: "WORKER_ORIGIN_DENIED", statusCode: 403 });
      const principal = authenticateWorker(runtime, request.headers.authorization, checkpointRoute || artifactPut);
      let data: unknown;
      if (get && url.pathname === "/worker/v1/context") data = options.context ? await options.context(principal) : unavailable();
      else if (get && artifactRead) {
        const id = decodeURIComponent(artifactRead[1]);
        const ref = listArtifactRefs(runtime.root).find(ref => ref.id === id);
        if (!ref || !options.authorizeArtifact(principal.attempt_key, { artifact_id: ref.id, sha256: ref.sha256 })) throw new ComathError("Artifact is not visible to this worker", { code: "WORKER_ARTIFACT_DENIED", statusCode: 403 });
        const artifactPath = resolveProjectCommitPath(runtime.root, ref.path);
        if ((await stat(artifactPath)).size > 512 * 1024) throw new ComathError("Artifact requires bounded range reading", { code: "WORKER_ARTIFACT_TOO_LARGE", statusCode: 413 });
        const bytes = await readFile(artifactPath);
        authenticateWorker(runtime, request.headers.authorization);
        if (createHash("sha256").update(bytes).digest("hex") !== ref.sha256) throw new ComathError("Artifact integrity mismatch", { code: "WORKER_ARTIFACT_CORRUPT", statusCode: 409 });
        data = { artifact_id: ref.id, sha256: ref.sha256, content_base64: bytes.toString("base64") };
      } else {
        const raw = await readBody(request);
        if (!raw || typeof raw !== "object") throw new ComathError("Expected worker request object", { statusCode: 400 });
        requireWorkerIdentity(principal, raw);
        authenticateWorker(runtime, request.headers.authorization, checkpointRoute || artifactPut);
        if (checkpointRoute) {
          const body = checkpointRequest.parse(raw);
          data = await checkpoints.commitCheckpoint({ ...body, lease_token: request.headers.authorization!.slice(7) });
        } else if (artifactPut) {
          const body = artifactRequest.parse(raw);
          const bytes = Buffer.from(body.content_base64, "base64");
          if (bytes.toString("base64") !== body.content_base64) throw new ComathError("Artifact must use canonical base64", { statusCode: 400 });
          const temp = resolveProjectCommitPath(runtime.root, `.tmp/comath/worker-upload/${randomUUID()}`);
          await mkdir(dirname(temp), { recursive: true }); await writeFile(temp, bytes, { flag: "wx", flush: true });
          try {
            const projectId = runtime.store.getCampaign(principal.campaign_id)!.project_id;
            const prepared = await prepareArtifact({ projectRoot: runtime.root, project_id: projectId, source_path: temp, kind: "other", actor: "worker-gateway" });
            const ref = withProjectCommit(runtime.root, { operation_id: `worker-artifact:${principal.task_id}:${body.command_id}`, campaign_id: principal.campaign_id,
              request: { generation: principal.generation, sha256: prepared.sha256 } }, () => {
              authenticateWorker(runtime, request.headers.authorization, true);
              return commitArtifactReference(runtime.root, prepared);
            });
            const pointer = { artifact_id: ref.id, sha256: ref.sha256 }; options.onArtifactCommitted?.(principal, pointer);
            data = { ...pointer, proof_authority: "none" };
          } finally { await unlink(temp); }
        } else if (url.pathname === "/worker/v1/results") {
          data = options.result ? await options.result(principal, raw) : unavailable();
        } else {
          const body = commandRequest.parse(raw);
          if (tool) {
            if (!options.tool) unavailable();
            const controller = new AbortController(); activeTools.add(controller);
            request.once("aborted", () => controller.abort());
            try { data = await options.tool(principal, tool[1], body, controller.signal); }
            finally { activeTools.delete(controller); }
          } else if (url.pathname === "/worker/v1/failures") data = options.failure ? await options.failure(principal, body) : unavailable();
          else data = options.proposal ? await options.proposal(principal, body) : unavailable();
        }
      }
      response.writeHead(200, { "Content-Type": "application/json", "Cache-Control": "no-store" });
      response.end(JSON.stringify({ ok: true, data }));
    } catch (cause) {
      const error = toComathError(cause);
      if (!response.headersSent) response.writeHead(error.statusCode, { "Content-Type": "application/json", "Cache-Control": "no-store" });
      // Do not expose host paths, raw upstream errors, or capabilities in worker-visible diagnostics.
      response.end(JSON.stringify({ ok: false, code: error.code, error: error.statusCode >= 500 ? "Worker operation is unavailable" : "Worker request rejected" }));
    }
  });
  server.requestTimeout = 30000; server.headersTimeout = 10000;
  return {
    listen: (address: { host: string; port: number }) => new Promise<void>((resolve, reject) => {
      server.once("error", reject); server.listen(address.port, address.host, () => { server.off("error", reject); resolve(); });
    }),
    address: () => server.address() as AddressInfo,
    close: () => new Promise<void>((resolve, reject) => {
      for (const controller of activeTools) controller.abort();
      server.close(error => error ? reject(error) : resolve()); server.closeAllConnections();
    })
  };
}
