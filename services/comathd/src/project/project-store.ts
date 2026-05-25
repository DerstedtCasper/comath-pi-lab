import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename, join, resolve } from "node:path";
import { ComathError } from "../errors.js";
import { projectSchema, type Project } from "../types/schemas.js";
import { nextSequentialId } from "../utils/id.js";
import { assertPathAllowed } from "../security/path-policy.js";
import { runtimeLayout } from "./runtime-layout.js";

export type InitProjectInput = {
  name?: string;
  root_path: string;
};

export type OpenProjectInput = {
  root_path: string;
};

export type ProjectInitResult = {
  project: Project;
  created: boolean;
  runtime_root: string;
};

export type ProjectStatus = {
  initialized: boolean;
  root_path: string;
  runtime_root: string;
  project?: Project;
  missing_runtime_entries: string[];
};

function rejectSuspiciousProjectRoot(rootPath: string): void {
  if (!rootPath || rootPath.includes("\0") || /^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//.test(rootPath)) {
    throw new ComathError("invalid project root", { statusCode: 400, code: "INVALID_PROJECT_ROOT" });
  }
  if (/(^|[\\/])\.\.([\\/]|$)/.test(rootPath)) {
    throw new ComathError("project root is outside allowed workspace", {
      statusCode: 400,
      code: "PROJECT_ROOT_ESCAPE"
    });
  }
}

function canonicalRoot(rootPath: string): string {
  rejectSuspiciousProjectRoot(rootPath);
  return resolve(rootPath);
}

function runtimeRoot(projectRoot: string): string {
  return join(projectRoot, runtimeLayout.root);
}

function projectFile(projectRoot: string): string {
  return join(runtimeRoot(projectRoot), runtimeLayout.projectFile);
}

function configFile(projectRoot: string): string {
  return join(runtimeRoot(projectRoot), runtimeLayout.configFile);
}

function isoNow(): string {
  return new Date().toISOString();
}

function createProject(rootPath: string, name?: string): Project {
  const now = isoNow();
  return projectSchema.parse({
    project_id: nextSequentialId("PRJ", []),
    name: name?.trim() || basename(rootPath) || "CoMath Project",
    root_path: rootPath,
    created_at: now,
    updated_at: now
  });
}

function readProject(rootPath: string): Project {
  const file = projectFile(rootPath);
  if (!existsSync(file)) {
    throw new ComathError("project is not initialized", { statusCode: 404, code: "PROJECT_NOT_INITIALIZED" });
  }
  return projectSchema.parse(JSON.parse(readFileSync(file, "utf8")));
}

export function ensureRuntimeTree(projectRoot: string): string {
  const root = canonicalRoot(projectRoot);
  const comathRoot = assertPathAllowed(root, runtimeLayout.root, { purpose: "runtime-write" });
  mkdirSync(comathRoot, { recursive: true });

  for (const directory of runtimeLayout.directories) {
    const directoryPath = assertPathAllowed(root, join(runtimeLayout.root, directory), { purpose: "runtime-write" });
    mkdirSync(directoryPath, { recursive: true });
  }

  return comathRoot;
}

export function initProject(input: InitProjectInput): ProjectInitResult {
  const root = canonicalRoot(input.root_path);
  const comathRoot = ensureRuntimeTree(root);
  const metadataPath = assertPathAllowed(root, join(runtimeLayout.root, runtimeLayout.projectFile), {
    purpose: "runtime-write"
  });
  const configPath = assertPathAllowed(root, join(runtimeLayout.root, runtimeLayout.configFile), {
    purpose: "runtime-write"
  });

  if (existsSync(metadataPath)) {
    return {
      project: readProject(root),
      created: false,
      runtime_root: comathRoot
    };
  }

  const project = createProject(root, input.name);
  writeFileSync(metadataPath, `${JSON.stringify(project, null, 2)}\n`, "utf8");

  if (!existsSync(configPath)) {
    writeFileSync(configPath, `${JSON.stringify({ version: 1, allowShell: false }, null, 2)}\n`, "utf8");
  }

  return {
    project,
    created: true,
    runtime_root: comathRoot
  };
}

export function openProject(input: OpenProjectInput): ProjectInitResult {
  const root = canonicalRoot(input.root_path);
  const project = readProject(root);
  return {
    project,
    created: false,
    runtime_root: runtimeRoot(root)
  };
}

export function getProjectStatus(input: OpenProjectInput): ProjectStatus {
  const root = canonicalRoot(input.root_path);
  const missingRuntimeEntries = [];
  const comathRoot = runtimeRoot(root);
  const metadataPath = projectFile(root);

  for (const directory of runtimeLayout.directories) {
    if (!existsSync(join(comathRoot, directory))) {
      missingRuntimeEntries.push(directory);
    }
  }
  if (!existsSync(configFile(root))) {
    missingRuntimeEntries.push(runtimeLayout.configFile);
  }
  if (!existsSync(metadataPath)) {
    return {
      initialized: false,
      root_path: root,
      runtime_root: comathRoot,
      missing_runtime_entries: [runtimeLayout.projectFile, ...missingRuntimeEntries]
    };
  }

  return {
    initialized: true,
    root_path: root,
    runtime_root: comathRoot,
    project: readProject(root),
    missing_runtime_entries: missingRuntimeEntries
  };
}
