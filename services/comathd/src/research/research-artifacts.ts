import { createHash, randomUUID } from "node:crypto";
import { copyFile, link, mkdir, open, unlink } from "node:fs/promises";
import { dirname } from "node:path";
import { closeSync, openSync, readSync, realpathSync } from "node:fs";
import { appendAuditEvent } from "../audit/jsonl-writer.js";
import { artifactPathForHash, listArtifactRefs, registerArtifact, type ImportArtifactInput } from "../artifacts/store.js";
import { sha256File } from "../artifacts/hash.js";
import { ComathError } from "../errors.js";
import { assertPathAllowed } from "../security/path-policy.js";
import { scanForSecrets } from "../security/secret-scan.js";
import { artifactRefSchema, type ArtifactRef } from "../types/schemas.js";
import { nextSequentialId } from "../utils/id.js";
import { allocateProjectId, assertProjectReadable, projectCommitTime, resolveProjectCommitPath, withTrustedWriter } from "./project-commit.js";

export type PreparedArtifact = Readonly<{ sha256: string; size_bytes: number; relative_path: string; kind: ArtifactRef["kind"] }>;
type PreparedDetails = { root: string; project_id: string; actor: string; scan: ReturnType<typeof scanForSecrets> };
const preparedArtifacts = new WeakMap<PreparedArtifact, PreparedDetails>();

/** Copy/scan/hash outside the short metadata commit. Only copied bytes become the CAS object. */
export async function prepareArtifact(input: ImportArtifactInput): Promise<PreparedArtifact> {
  const root = realpathSync(input.projectRoot);
  assertProjectReadable(root);
  const source = assertPathAllowed(root, input.source_path, { purpose: "read", resolveRealpath: true });
  const quarantine = resolveProjectCommitPath(root, `.comath/artifacts/quarantine/${randomUUID()}`);
  await mkdir(dirname(quarantine), { recursive: true });
  await copyFile(source, quarantine);
  try {
    const scan = scanForSecrets(quarantine);
    if (scan.blocks_import) {
      appendAuditEvent(root, { project_id: input.project_id, event_type: "artifact.import_blocked", actor: input.actor,
        payload: { reason: "secret_scan", secret_scan: scan.status, findings: scan.findings, warnings: scan.warnings, source_descriptor: "policy-approved-file" } });
      throw new ComathError("secret scan blocked artifact import", { code: "ARTIFACT_SECRET_SCAN_BLOCKED" });
    }
    const digest = await sha256File(quarantine);
    assertProjectReadable(root);
    const target = artifactPathForHash(root, digest.sha256);
    resolveProjectCommitPath(root, target.relative_path);
    await mkdir(dirname(target.absolute_path), { recursive: true });
    const file = await open(quarantine, "r+"); try { await file.sync(); } finally { await file.close(); }
    // A hard link atomically publishes fully copied/fsynced bytes without overwriting an existing CAS object.
    try { await link(quarantine, target.absolute_path); }
    catch (cause) { if ((cause as NodeJS.ErrnoException).code !== "EEXIST") throw cause; }
    const installed = await sha256File(target.absolute_path);
    if (installed.sha256 !== digest.sha256 || installed.size_bytes !== digest.size_bytes) throw new ComathError("Existing artifact CAS bytes are corrupt", { code: "ARTIFACT_CAS_CORRUPT", statusCode: 409 });
    const prepared = Object.freeze({ sha256: digest.sha256, size_bytes: digest.size_bytes, relative_path: target.relative_path, kind: input.kind });
    preparedArtifacts.set(prepared, { root, project_id: input.project_id, actor: input.actor, scan });
    return prepared;
  } finally { await unlink(quarantine).catch(cause => { if ((cause as NodeJS.ErrnoException).code !== "ENOENT") throw cause; }); }
}
export function commitArtifactReference(root: string, prepared: PreparedArtifact): ArtifactRef {
  const details = preparedArtifacts.get(prepared);
  if (!details || details.root !== realpathSync(root)) throw new ComathError("Artifact must be prepared by this service for this project", { code: "ARTIFACT_NOT_PREPARED" });
  const fd = openSync(resolveProjectCommitPath(root, prepared.relative_path), "r"), digest = createHash("sha256"), chunk = Buffer.alloc(65536);
  let total = 0;
  try { let read: number; while ((read = readSync(fd, chunk, 0, chunk.length, null)) > 0) { digest.update(chunk.subarray(0, read)); total += read; } }
  finally { closeSync(fd); }
  if (digest.digest("hex") !== prepared.sha256 || total !== prepared.size_bytes) throw new ComathError("Prepared CAS bytes changed", { code: "ARTIFACT_CAS_CORRUPT", statusCode: 409 });
  return withTrustedWriter(root, "artifact.commit", { project_id: details.project_id, sha256: prepared.sha256, kind: prepared.kind }, () => {
    const existing = listArtifactRefs(root);
    const duplicate = existing.find(ref => ref.project_id === details.project_id && ref.sha256 === prepared.sha256 && ref.kind === prepared.kind);
    if (duplicate) return duplicate;
    const artifact = artifactRefSchema.parse({ id: allocateProjectId(root, "AR", () => nextSequentialId("AR", existing.map(ref => ref.id))),
      project_id: details.project_id, path: prepared.relative_path, kind: prepared.kind, sha256: prepared.sha256,
      size_bytes: prepared.size_bytes, created_at: projectCommitTime(root) });
    registerArtifact(root, artifact);
    appendAuditEvent(root, { project_id: details.project_id, event_type: "artifact.imported", actor: details.actor, target_id: artifact.id,
      payload: { kind: artifact.kind, sha256: artifact.sha256, size_bytes: artifact.size_bytes, artifact_path: artifact.path,
        secret_scan: details.scan.status, source_descriptor: "policy-approved-file" } });
    return artifact;
  });
}
