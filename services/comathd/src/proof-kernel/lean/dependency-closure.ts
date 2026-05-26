import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, relative } from "node:path";
import { assertPathAllowed } from "../../security/path-policy.js";
import { hashLeanProjectFiles, listLeanProjectFiles, sha256FileSync } from "./lean-project.js";

export type DependencyClosureReport = {
  result: "pass" | "fail";
  lean_toolchain: string;
  lakefile_hash: string;
  local_file_hashes: Record<string, string>;
  imports: Record<string, string[]>;
  hard_vetoes: string[];
};

export function checkDependencyClosure(input: {
  projectRoot: string;
  leanRoot: string;
  toolchainFile: string;
  lakefile: string;
  reportPath: string;
}): DependencyClosureReport {
  const local_file_hashes = hashLeanProjectFiles(input.leanRoot);
  const imports: Record<string, string[]> = {};
  for (const file of listLeanProjectFiles(input.leanRoot).filter((item) => item.endsWith(".lean"))) {
    const rel = relative(input.leanRoot, file).replace(/\\/g, "/");
    imports[rel] = readFileSync(file, "utf8")
      .split(/\r?\n/)
      .map((line) => /^import\s+(.+)$/.exec(line.trim())?.[1])
      .filter((item): item is string => Boolean(item));
  }
  const report: DependencyClosureReport = {
    result: Object.keys(local_file_hashes).length > 0 ? "pass" : "fail",
    lean_toolchain: readFileSync(input.toolchainFile, "utf8").trim(),
    lakefile_hash: sha256FileSync(input.lakefile).sha256,
    local_file_hashes,
    imports,
    hard_vetoes: Object.keys(local_file_hashes).length > 0 ? [] : ["dependency_closure_empty"]
  };
  const path = assertPathAllowed(input.projectRoot, input.reportPath, { purpose: "runtime-write" });
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  return report;
}
