import { existsSync, lstatSync, mkdirSync, readFileSync, readdirSync, realpathSync, writeFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { assertPathAllowed } from "../../security/path-policy.js";
import { hashLeanProjectFiles, listLeanProjectFiles, sha256Buffer, sha256FileSync } from "./lean-project.js";

export type DependencyClosureReport = {
  result: "pass" | "fail";
  lean_toolchain: string;
  lakefile_hash: string;
  local_file_hashes: Record<string, string>;
  imports: Record<string, string[]>;
  hard_vetoes: string[];
};

export type DependencyClosureV2Package = {
  name: string;
  revision?: string;
  url?: string;
  license: string;
  source: "lake-manifest" | "local" | "unknown";
  trusted: boolean;
  build_status: "checked" | "blocked" | "unknown";
  materialized_package_root?: string;
  materialized_package_hash?: string;
  materialized_file_hashes?: Record<string, string>;
  materialized_symlinks?: string[];
};

export type DependencyClosureV2Report = {
  schema_version: "comath.dependency_closure.v2";
  result: "pass" | "fail";
  lean_toolchain: string;
  lakefile_hash: string;
  lake_manifest_hash: string;
  dependency_graph_sha256: string;
  packages: DependencyClosureV2Package[];
  local_file_hashes: Record<string, string>;
  imports: Record<string, string[]>;
  import_closure: string[];
  allowed_import_prefixes: string[];
  untracked_imports: string[];
  local_module_shadowing: string[];
  symlink_escapes: string[];
  build_status: "checked" | "blocked" | "unknown";
  hard_vetoes: string[];
  warnings: string[];
};

function parseLeanImports(path: string): string[] {
  return readFileSync(path, "utf8")
    .split(/\r?\n/)
    .map((line) => /^import\s+(.+)$/.exec(line.trim())?.[1])
    .filter((item): item is string => Boolean(item))
    .flatMap((line) => line.split(/\s+/).map((part) => part.trim()).filter(Boolean));
}

function moduleNameFromRelativeLeanPath(rel: string): string | undefined {
  if (!rel.endsWith(".lean")) {
    return undefined;
  }
  const withoutExtension = rel.slice(0, -".lean".length);
  const parts = withoutExtension.split("/");
  if (parts.some((part) => !/^[A-Za-z_][A-Za-z0-9_']*$/.test(part))) {
    return undefined;
  }
  return parts.join(".");
}

function localModuleSet(leanRoot: string): Set<string> {
  return new Set(
    listLeanProjectFiles(leanRoot)
      .filter((file) => file.endsWith(".lean"))
      .map((file) => moduleNameFromRelativeLeanPath(relative(leanRoot, file).replace(/\\/g, "/")))
      .filter((item): item is string => Boolean(item))
  );
}

function hashMaterializedPackageFiles(manifestDir: string, packageRelRoot: string): Record<string, string> {
  const packageRoot = join(manifestDir, packageRelRoot);
  const hashes: Record<string, string> = {};
  if (existsSync(packageRoot) && lstatSync(packageRoot).isSymbolicLink()) {
    return hashes;
  }
  const visit = (dir: string, relDir: string) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (entry.name === ".git") {
        continue;
      }
      const path = join(dir, entry.name);
      const rel = join(relDir, entry.name).replace(/\\/g, "/");
      if (entry.isSymbolicLink()) {
        continue;
      }
      if (entry.isDirectory()) {
        visit(path, rel);
      } else if (entry.isFile()) {
        hashes[rel] = sha256FileSync(path).sha256;
      }
    }
  };
  if (existsSync(packageRoot)) {
    visit(packageRoot, packageRelRoot);
  }
  return Object.fromEntries(Object.entries(hashes).sort(([left], [right]) => left.localeCompare(right)));
}

function collectMaterializedPackageSymlinks(manifestDir: string, packageRelRoot: string): string[] {
  const packageRoot = join(manifestDir, packageRelRoot);
  const symlinks: string[] = [];
  if (existsSync(packageRoot) && lstatSync(packageRoot).isSymbolicLink()) {
    return [packageRelRoot];
  }
  const visit = (dir: string, relDir: string) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const path = join(dir, entry.name);
      const rel = join(relDir, entry.name).replace(/\\/g, "/");
      if (entry.isSymbolicLink()) {
        symlinks.push(rel);
        continue;
      }
      if (entry.isDirectory()) {
        visit(path, rel);
      }
    }
  };
  if (existsSync(packageRoot)) {
    visit(packageRoot, packageRelRoot);
  }
  return symlinks.sort();
}

function materializedPackageForManifestPackage(manifestDir: string, name: string): {
  root?: string;
  hash?: string;
  file_hashes?: Record<string, string>;
  symlinks?: string[];
} {
  if (name !== "mathlib") {
    return {};
  }
  const root = ".lake/packages/mathlib";
  const packageRoot = join(manifestDir, root);
  if (!existsSync(packageRoot)) {
    return {};
  }
  const file_hashes = hashMaterializedPackageFiles(manifestDir, root);
  const symlinks = collectMaterializedPackageSymlinks(manifestDir, root);
  const hash = Object.keys(file_hashes).length > 0 ? sha256Buffer(JSON.stringify({ root, files: file_hashes })) : undefined;
  return { root, hash, file_hashes, symlinks };
}

function parseLakeManifestPackages(path: string, trustedNames: Set<string>): DependencyClosureV2Package[] {
  const parsed = JSON.parse(readFileSync(path, "utf8")) as { packages?: Array<Record<string, unknown>> };
  const manifestDir = dirname(path);
  return (parsed.packages ?? []).map((pkg) => {
    const name = typeof pkg.name === "string" ? pkg.name : "unknown";
    const revision = typeof pkg.rev === "string" ? pkg.rev : typeof pkg.inputRev === "string" ? pkg.inputRev : undefined;
    const url = typeof pkg.url === "string" ? pkg.url : undefined;
    const license = typeof pkg.license === "string" && pkg.license.trim() ? pkg.license.trim() : "unknown";
    const materialized = materializedPackageForManifestPackage(manifestDir, name);
    const materializationRequired = trustedNames.has(name) && name === "mathlib";
    const materializationChecked = !materializationRequired || Boolean(materialized.hash);
    return {
      name,
      revision,
      url,
      license,
      source: "lake-manifest" as const,
      trusted: trustedNames.has(name),
      build_status: revision && license !== "unknown" && materializationChecked ? "checked" : "blocked",
      ...(materialized.root ? { materialized_package_root: materialized.root } : {}),
      ...(materialized.hash ? { materialized_package_hash: materialized.hash } : {}),
      ...(materialized.file_hashes ? { materialized_file_hashes: materialized.file_hashes } : {}),
      ...(materialized.symlinks && materialized.symlinks.length > 0 ? { materialized_symlinks: materialized.symlinks } : {})
    };
  });
}

function collectSymlinkEscapes(root: string): string[] {
  const escapes: string[] = [];
  const resolvedRoot = realpathSync(root);
  const visit = (dir: string) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const path = join(dir, entry.name);
      const stat = lstatSync(path);
      if (stat.isSymbolicLink()) {
        const target = realpathSync(path);
        const rel = relative(resolvedRoot, target).replace(/\\/g, "/");
        if (rel.startsWith("..") || resolve(target) === resolve(resolvedRoot)) {
          escapes.push(relative(root, path).replace(/\\/g, "/"));
        }
        continue;
      }
      if (stat.isDirectory()) {
        if (entry.name === ".lake" || entry.name === "final_replay") {
          continue;
        }
        visit(path);
      }
    }
  };
  visit(root);
  return escapes.sort();
}

function moduleAllowed(moduleName: string, prefixes: string[]): boolean {
  return prefixes.some((prefix) => moduleName === prefix || moduleName.startsWith(`${prefix}.`));
}

function packageProvidesModule(moduleName: string, packages: DependencyClosureV2Package[]): boolean {
  return packages.some((pkg) => {
    if (!pkg.trusted) {
      return false;
    }
    if (pkg.name === "mathlib") {
      return moduleName === "Mathlib" || moduleName.startsWith("Mathlib.");
    }
    return moduleName === pkg.name || moduleName.startsWith(`${pkg.name}.`);
  });
}

function isLeanToolchainModule(moduleName: string): boolean {
  return (
    moduleName === "Init" ||
    moduleName.startsWith("Init.") ||
    moduleName === "Std" ||
    moduleName.startsWith("Std.") ||
    moduleName === "Lake" ||
    moduleName.startsWith("Lake.")
  );
}

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

export function checkDependencyClosureV2(input: {
  projectRoot: string;
  leanRoot: string;
  toolchainFile: string;
  lakefile: string;
  lakeManifestFile: string;
  reportPath: string;
  allowedImportPrefixes: string[];
  trustedExternalDependencies?: string[];
  buildStatus?: "checked" | "blocked" | "unknown";
}): DependencyClosureV2Report {
  const local_file_hashes = hashLeanProjectFiles(input.leanRoot);
  const imports: Record<string, string[]> = {};
  for (const file of listLeanProjectFiles(input.leanRoot).filter((item) => item.endsWith(".lean"))) {
    const rel = relative(input.leanRoot, file).replace(/\\/g, "/");
    imports[rel] = parseLeanImports(file);
  }

  const trustedNames = new Set(input.trustedExternalDependencies ?? []);
  const packages = parseLakeManifestPackages(input.lakeManifestFile, trustedNames);
  const localModules = localModuleSet(input.leanRoot);
  const importClosure = Array.from(new Set(Object.values(imports).flat())).sort();
  const untrackedImports = importClosure.filter((moduleName) => {
    if (isLeanToolchainModule(moduleName)) {
      return false;
    }
    if (!moduleAllowed(moduleName, input.allowedImportPrefixes)) {
      return true;
    }
    if (localModules.has(moduleName)) {
      return false;
    }
    return !packageProvidesModule(moduleName, packages);
  });
  const externalRoots = packages
    .filter((pkg) => pkg.trusted)
    .flatMap((pkg) => (pkg.name === "mathlib" ? ["Mathlib"] : [pkg.name]));
  const localShadowing = Array.from(localModules)
    .filter((moduleName) => externalRoots.some((root) => moduleName === root || moduleName.startsWith(`${root}.`)))
    .sort();
  const symlinkEscapes = collectSymlinkEscapes(input.leanRoot);
  const packageVetoes = packages.flatMap((pkg) => {
    const vetoes: string[] = [];
    if (!pkg.trusted) {
      vetoes.push(`untrusted_dependency:${pkg.name}`);
    }
    if (!pkg.revision) {
      vetoes.push(`unpinned_dependency:${pkg.name}`);
    }
    if (pkg.license === "unknown") {
      vetoes.push(`unknown_license:${pkg.name}`);
    }
    if (pkg.trusted && pkg.name === "mathlib" && !pkg.materialized_package_hash) {
      vetoes.push(`dependency_material_missing:${pkg.name}`);
    }
    for (const rel of pkg.materialized_symlinks ?? []) {
      const symlinkKind = rel === pkg.materialized_package_root ? "root_symlink" : "symlink";
      vetoes.push(`dependency_material_${symlinkKind}:${pkg.name}:${rel}`);
    }
    return vetoes;
  });
  const hard_vetoes = [
    ...(Object.keys(local_file_hashes).length === 0 ? ["dependency_closure_empty"] : []),
    ...untrackedImports.map((name) => `untracked_import:${name}`),
    ...localShadowing.map((name) => `local_module_shadowing:${name}`),
    ...symlinkEscapes.map((path) => `symlink_escape:${path}`),
    ...packageVetoes,
    ...(input.buildStatus === "blocked" ? ["build_status_blocked"] : [])
  ];
  const graphMaterial = JSON.stringify({ imports, packages, local_file_hashes, allowed: input.allowedImportPrefixes });
  const report: DependencyClosureV2Report = {
    schema_version: "comath.dependency_closure.v2",
    result: hard_vetoes.length === 0 ? "pass" : "fail",
    lean_toolchain: readFileSync(input.toolchainFile, "utf8").trim(),
    lakefile_hash: sha256FileSync(input.lakefile).sha256,
    lake_manifest_hash: sha256FileSync(input.lakeManifestFile).sha256,
    dependency_graph_sha256: sha256Buffer(graphMaterial),
    packages,
    local_file_hashes,
    imports,
    import_closure: importClosure,
    allowed_import_prefixes: [...input.allowedImportPrefixes],
    untracked_imports: untrackedImports,
    local_module_shadowing: localShadowing,
    symlink_escapes: symlinkEscapes,
    build_status: input.buildStatus ?? (hard_vetoes.length === 0 ? "checked" : "blocked"),
    hard_vetoes: Array.from(new Set(hard_vetoes)),
    warnings: []
  };
  const path = assertPathAllowed(input.projectRoot, input.reportPath, { purpose: "runtime-write" });
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  return report;
}
