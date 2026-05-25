import { appendFileSync, copyFileSync, existsSync, mkdirSync, readFileSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { appendAuditEvent } from "../audit/jsonl-writer.js";
import { ComathError } from "../errors.js";
import { scanForSecrets } from "../security/secret-scan.js";
import { assertPathAllowed } from "../security/path-policy.js";
import { artifactRefSchema, type ArtifactRef } from "../types/schemas.js";
import { nextSequentialId } from "../utils/id.js";
import { sha256File } from "./hash.js";

export type ArtifactPath = {
  relative_path: string;
  absolute_path: string;
};

export type ImportArtifactInput = {
  projectRoot: string;
  project_id: string;
  source_path: string;
  kind: ArtifactRef["kind"];
  actor: string;
};

function metadataPath(projectRoot: string): string {
  return assertPathAllowed(projectRoot, join(".comath", "artifacts", "artifacts.jsonl"), { purpose: "runtime-write" });
}

function readArtifactRefs(projectRoot: string): ArtifactRef[] {
  const path = metadataPath(projectRoot);
  if (!existsSync(path)) {
    return [];
  }
  return readFileSync(path, "utf8")
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line) => artifactRefSchema.parse(JSON.parse(line)));
}

export function artifactPathForHash(projectRoot: string, sha256: string): ArtifactPath {
  if (!/^[a-f0-9]{64}$/.test(sha256)) {
    throw new Error("artifact sha256 must be lowercase hex");
  }

  const relative_path = join(".comath", "artifacts", "sha256", sha256.slice(0, 2), sha256);
  const absolute_path = assertPathAllowed(projectRoot, relative_path, { purpose: "runtime-write" });
  return { relative_path, absolute_path };
}

export async function importArtifact(input: ImportArtifactInput): Promise<ArtifactRef> {
  const source = assertPathAllowed(input.projectRoot, input.source_path, { purpose: "read", resolveRealpath: true });
  const quarantine = assertPathAllowed(
    input.projectRoot,
    join(".comath", "artifacts", "quarantine", `${Date.now()}-${Math.random().toString(16).slice(2)}`),
    { purpose: "runtime-write" }
  );
  mkdirSync(dirname(quarantine), { recursive: true });
  copyFileSync(source, quarantine);

  const scan = scanForSecrets(quarantine);
  if (scan.blocks_import) {
    rmSync(quarantine, { force: true });
    appendAuditEvent(input.projectRoot, {
      project_id: input.project_id,
      event_type: "artifact.import_blocked",
      actor: input.actor,
      payload: {
        reason: "secret_scan",
        secret_scan: scan.status,
        findings: scan.findings,
        warnings: scan.warnings,
        source_descriptor: "policy-approved-file"
      }
    });
    throw new ComathError("secret scan blocked artifact import", {
      statusCode: 400,
      code: "ARTIFACT_SECRET_SCAN_BLOCKED"
    });
  }

  const hash = await sha256File(quarantine);
  const target = artifactPathForHash(input.projectRoot, hash.sha256);
  mkdirSync(dirname(target.absolute_path), { recursive: true });
  if (!existsSync(target.absolute_path)) {
    copyFileSync(quarantine, target.absolute_path);
  }
  rmSync(quarantine, { force: true });

  const existingRefs = readArtifactRefs(input.projectRoot);
  const artifact = artifactRefSchema.parse({
    id: nextSequentialId("AR", existingRefs.map((item) => item.id)),
    project_id: input.project_id,
    path: target.relative_path,
    kind: input.kind,
    sha256: hash.sha256,
    size_bytes: hash.size_bytes,
    created_at: new Date().toISOString()
  });

  registerArtifact(input.projectRoot, artifact);
  appendAuditEvent(input.projectRoot, {
    project_id: input.project_id,
    event_type: "artifact.imported",
    actor: input.actor,
    target_id: artifact.id,
    payload: {
      kind: artifact.kind,
      sha256: artifact.sha256,
      size_bytes: artifact.size_bytes,
      artifact_path: artifact.path,
      secret_scan: scan.status,
      source_descriptor: "policy-approved-file"
    }
  });

  return artifact;
}

export function registerArtifact(projectRoot: string, artifact: ArtifactRef): ArtifactRef {
  const parsed = artifactRefSchema.parse(artifact);
  const path = metadataPath(projectRoot);
  mkdirSync(dirname(path), { recursive: true });
  appendFileSync(path, `${JSON.stringify(parsed)}\n`, "utf8");
  return parsed;
}

export function listArtifactRefs(projectRoot: string): ArtifactRef[] {
  return readArtifactRefs(projectRoot);
}
