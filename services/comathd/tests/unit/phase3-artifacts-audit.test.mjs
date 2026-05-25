import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, join } from "node:path";
import {
  appendAuditEvent,
  artifactPathForHash,
  auditEventSchema,
  createSnapshotManifestStub,
  importArtifact,
  initProject,
  listArtifactRefs,
  readAuditEvents,
  scanForSecrets,
  scanForSecretsStub,
  sha256File
} from "../../dist/index.js";

const projectRoot = mkdtempSync(join(tmpdir(), "comath-artifact-"));
const outsideRoot = mkdtempSync(join(tmpdir(), "comath-artifact-outside-"));

try {
  const { project } = initProject({ name: "Artifact Project", root_path: projectRoot });
  const sourceA = join(projectRoot, "output.txt");
  const sourceBDir = join(projectRoot, "nested");
  const sourceB = join(sourceBDir, "output.txt");
  const duplicate = join(projectRoot, "renamed.log");
  const secretSource = join(projectRoot, "secret.env");
  const outside = join(outsideRoot, "outside.txt");

  writeFileSync(sourceA, "alpha\n", "utf8");
  mkdirSync(sourceBDir, { recursive: true });
  writeFileSync(sourceB, "beta\n", "utf8");
  writeFileSync(duplicate, "alpha\n", "utf8");
  writeFileSync(secretSource, "OPENAI_API_KEY=sk-proj-abcdefghijklmnopqrstuvwxyz123456\n", "utf8");
  writeFileSync(outside, "outside\n", "utf8");

  const expectedAlpha = createHash("sha256").update("alpha\n").digest("hex");
  assert.deepEqual(await sha256File(sourceA), { sha256: expectedAlpha, size_bytes: 6 });

  const importedA = await importArtifact({
    projectRoot,
    project_id: project.project_id,
    source_path: sourceA,
    kind: "log",
    actor: "phase3-test"
  });
  const importedB = await importArtifact({
    projectRoot,
    project_id: project.project_id,
    source_path: sourceB,
    kind: "log",
    actor: "phase3-test"
  });
  const importedDuplicate = await importArtifact({
    projectRoot,
    project_id: project.project_id,
    source_path: duplicate,
    kind: "log",
    actor: "phase3-test"
  });

  assert.equal(importedA.sha256, expectedAlpha);
  assert.notEqual(importedA.path, importedB.path);
  assert.equal(importedA.path, importedDuplicate.path);
  assert.equal(importedA.path.includes(basename(sourceA)), false, "artifact path must not trust source basename");
  assert.equal(existsSync(join(projectRoot, importedA.path)), true);

  const hashPath = artifactPathForHash(projectRoot, importedA.sha256);
  assert.equal(hashPath.relative_path, importedA.path);
  assert.equal(hashPath.absolute_path, join(projectRoot, importedA.path));

  await assert.rejects(
    () =>
      importArtifact({
        projectRoot,
        project_id: project.project_id,
        source_path: outside,
        kind: "log",
        actor: "phase3-test"
      }),
    /escapes project root/
  );

  const secretScan = scanForSecrets(secretSource);
  assert.equal(secretScan.status, "blocked");
  assert.equal(secretScan.blocks_import, true);
  await assert.rejects(
    () =>
      importArtifact({
        projectRoot,
        project_id: project.project_id,
        source_path: secretSource,
        kind: "log",
        actor: "phase3-test"
      }),
    /secret scan blocked artifact import/
  );
  assert.equal(listArtifactRefs(projectRoot).length, 3, "blocked secret import must not append artifact metadata");

  await appendAuditEvent(projectRoot, {
    project_id: project.project_id,
    event_type: "phase3.manual_event",
    actor: "phase3-test",
    payload: { note: "schema valid" }
  });

  const events = readAuditEvents(projectRoot);
  assert.equal(events.length >= 4, true);
  for (const event of events) {
    auditEventSchema.parse(event);
  }
  assert.equal(events.some((event) => event.event_type === "artifact.imported"), true);
  assert.equal(
    events.some((event) => JSON.stringify(event.payload).includes(basename(sourceA))),
    false,
    "audit payload must not preserve source basename"
  );

  const scan = scanForSecretsStub(sourceA);
  assert.equal(scan.status, "stub");
  assert.equal(scan.blocks_import, false);

  const manifest = createSnapshotManifestStub(projectRoot, project.project_id, [importedA, importedB]);
  assert.equal(manifest.stub, true);
  assert.equal(manifest.can_restore, false);
  assert.deepEqual(
    manifest.artifacts.map((artifact) => artifact.sha256).sort(),
    [importedA.sha256, importedB.sha256].sort()
  );
} finally {
  rmSync(projectRoot, { recursive: true, force: true });
  rmSync(outsideRoot, { recursive: true, force: true });
}

console.log("Phase 3 artifact/audit tests passed.");
