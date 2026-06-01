import assert from "node:assert/strict";
import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { isAbsolute, join } from "node:path";
import { createComathServer, exportPaper, initPaper, initProject, updatePaperSection } from "../../dist/index.js";

const projectRoot = mkdtempSync(join(tmpdir(), "comath-goal3-task137-paper-export-path-"));
const server = createComathServer();

try {
  const { project } = initProject({ name: "Task137 Paper Export Path Contract", root_path: projectRoot });
  initPaper(projectRoot, {
    project_id: project.project_id,
    title: "Task137 Public Export Contract",
    actor: "goal3-task137"
  });
  updatePaperSection(projectRoot, {
    project_id: project.project_id,
    section_id: "public-contract",
    title: "Public Contract",
    markdown: "This working note is public diagnostic material only.",
    actor: "goal3-task137"
  });

  const internalExport = await exportPaper(projectRoot, {
    project_id: project.project_id,
    format: "md",
    actor: "goal3-task137-internal"
  });
  assert.equal(isAbsolute(internalExport.path), true, "internal export preserves its local source path");
  assert.equal(existsSync(internalExport.path), true, "internal export path still points at the local paper file");

  const routeExport = await server.inject({
    method: "POST",
    path: "/paper/export",
    body: {
      project_root: projectRoot,
      project_id: project.project_id,
      format: "md",
      actor: "goal3-task137-route"
    }
  });
  assert.equal(routeExport.status, 200, JSON.stringify(routeExport.body));
  assert.equal("path" in routeExport.body, false, "public paper export route must not expose host absolute paths");
  assert.equal(
    routeExport.body.exported_relative_path,
    routeExport.body.artifact.path,
    "public paper export route should expose the project-relative artifact path"
  );
  assert.equal(isAbsolute(routeExport.body.exported_relative_path), false);
  assert.equal(routeExport.body.exported_relative_path.startsWith(".comath/"), true);
  assert.equal(JSON.stringify(routeExport.body).includes(projectRoot), false);
  assert.equal(routeExport.body.public_archive_contract.proof_authority, "none");
  assert.equal(routeExport.body.public_archive_contract.exposes_host_paths, false);
  assert.equal(routeExport.body.public_archive_contract.can_restore, false);
} finally {
  await server.close();
  rmSync(projectRoot, { recursive: true, force: true });
}

console.log("Goal 3 Task137 public paper export path contract test passed.");
