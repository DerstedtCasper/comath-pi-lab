import { join } from "node:path";
import { ComathError } from "../errors.js";
import { assertPathAllowed } from "../security/path-policy.js";
import { artifactRefSchema, type ArtifactRef } from "../types/schemas.js";
import { existsCommittedFile, readCommittedFile, writeCommittedFile, withTrustedWriter } from "../research/project-commit.js";
import { prepareArtifact, commitArtifactReference } from "../research/research-artifacts.js";

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
  if (!existsCommittedFile(projectRoot, path)) {
    return [];
  }
  return readCommittedFile(projectRoot, path)
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
  return commitArtifactReference(input.projectRoot, await prepareArtifact(input));
}

export function registerArtifact(projectRoot: string, artifact: ArtifactRef): ArtifactRef {
  return withTrustedWriter(projectRoot, "artifact.register", artifact, () => {
  const parsed = artifactRefSchema.parse(artifact);
  const previous = readArtifactRefs(projectRoot).find(ref => ref.id === parsed.id);
  if (previous) {
    if (JSON.stringify(previous) !== JSON.stringify(parsed)) throw new ComathError("Artifact ID already refers to different metadata", { code: "ARTIFACT_ID_CONFLICT", statusCode: 409 });
    return previous;
  }
  const path = metadataPath(projectRoot);
  const before = existsCommittedFile(projectRoot, path) ? readCommittedFile(projectRoot, path) : "";
  writeCommittedFile(projectRoot, path, `${before}${JSON.stringify(parsed)}\n`);
  return parsed;
  });
}

export function listArtifactRefs(projectRoot: string): ArtifactRef[] {
  return readArtifactRefs(projectRoot);
}
