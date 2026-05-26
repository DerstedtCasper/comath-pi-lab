import type { ArtifactRef } from "../types/schemas.js";

export type SnapshotManifestStub = {
  schema_version: 1;
  project_id: string;
  created_at: string;
  stub: true;
  can_restore: false;
  warnings: string[];
  artifacts: Array<{
    id: string;
    path: string;
    kind: ArtifactRef["kind"];
    sha256: string;
    size_bytes?: number;
  }>;
};

export function createSnapshotManifestStub(
  _projectRoot: string,
  projectId: string,
  artifacts: ArtifactRef[]
): SnapshotManifestStub {
  return {
    schema_version: 1,
    project_id: projectId,
    created_at: new Date().toISOString(),
    stub: true,
    can_restore: false,
    warnings: ["Phase 3 snapshot manifest is not a restore or replay artifact"],
    artifacts: artifacts.map((artifact) => ({
      id: artifact.id,
      path: artifact.path,
      kind: artifact.kind,
      sha256: artifact.sha256,
      size_bytes: artifact.size_bytes
    }))
  };
}
