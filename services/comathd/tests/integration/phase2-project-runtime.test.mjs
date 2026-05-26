import assert from "node:assert/strict";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { getProjectStatus, initProject, openProject, runtimeLayout } from "../../dist/index.js";

const projectRoot = mkdtempSync(join(tmpdir(), "comath-project-"));
const uninitializedRoot = mkdtempSync(join(tmpdir(), "comath-project-uninit-"));
const escapeName = `escape-${Date.now()}-${Math.random().toString(16).slice(2)}`;
const escapeRoot = join(projectRoot, "..", escapeName);

try {
  const initialized = initProject({ name: "Phase 2 Temp Project", root_path: projectRoot });
  assert.equal(initialized.project.root_path, projectRoot);
  assert.equal(initialized.created, true);

  for (const directory of runtimeLayout.directories) {
    assert.equal(existsSync(join(projectRoot, ".comath", directory)), true, directory);
  }
  assert.equal(runtimeLayout.directories.includes("provenance"), true, "runtime layout must reserve provenance/");
  assert.equal(runtimeLayout.directories.includes("session"), true, "runtime layout must reserve session/");
  assert.equal(existsSync(join(projectRoot, ".comath", "project.json")), true);
  assert.equal(existsSync(join(projectRoot, ".comath", "config.json")), true);
  assert.equal(existsSync(join(process.cwd(), ".comath")), false, "tests must not create repository runtime state");

  const projectJson = join(projectRoot, ".comath", "project.json");
  const before = readFileSync(projectJson, "utf8");
  const second = initProject({ name: "Changed Name Must Not Overwrite", root_path: projectRoot });
  const after = readFileSync(projectJson, "utf8");
  assert.equal(second.created, false);
  assert.equal(after, before);

  assert.throws(() => openProject({ root_path: uninitializedRoot }), /not initialized/);

  const opened = openProject({ root_path: projectRoot });
  assert.equal(opened.project.project_id, initialized.project.project_id);

  const status = getProjectStatus({ root_path: projectRoot });
  assert.equal(status.initialized, true);
  assert.equal(status.project?.project_id, initialized.project.project_id);
  assert.equal(status.runtime_root, join(projectRoot, ".comath"));

  assert.throws(() => initProject({ name: "Bad", root_path: `${projectRoot}\\..\\${escapeName}` }), /outside allowed workspace/);

  const escapePath = join(escapeRoot, ".comath", "project.json");
  assert.equal(existsSync(escapePath), false);
} finally {
  rmSync(projectRoot, { recursive: true, force: true });
  rmSync(uninitializedRoot, { recursive: true, force: true });
  rmSync(escapeRoot, { recursive: true, force: true });
}

console.log("Phase 2 project runtime tests passed.");
