import { existsSync, mkdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import { arch, platform, version as nodeVersion } from "node:process";
import { assertPathAllowed } from "../security/path-policy.js";

export type TriviumNativeModule = Record<string, unknown>;

export type TriviumCapabilityReport = {
  available: boolean;
  packageName: "triviumdb";
  packageVersion?: string;
  platform: string;
  arch: string;
  nodeVersion: string;
  loadError?: string;
  canOpenDatabase: boolean;
  ffiDisabled: boolean;
  fallbackBackend: "memory";
  diagnostics: string[];
  nativeModule?: TriviumNativeModule;
};

export type TriviumCapabilityProbeOptions = {
  ffiDisabled?: boolean;
  loader?: () => Promise<unknown>;
  openProbeProjectRoot?: string;
};

const packageName = "triviumdb" as const;

function runtimeInfo() {
  return {
    platform,
    arch,
    nodeVersion
  };
}

async function defaultLoader(): Promise<unknown> {
  const dynamicImport = new Function("specifier", "return import(specifier)") as (specifier: string) => Promise<unknown>;
  return dynamicImport(packageName);
}

function asNativeModule(value: unknown): TriviumNativeModule {
  if (!value || typeof value !== "object") {
    return {};
  }
  return value as TriviumNativeModule;
}

function packageVersion(nativeModule: TriviumNativeModule): string | undefined {
  for (const key of ["version", "VERSION", "packageVersion"]) {
    const value = nativeModule[key];
    if (typeof value === "string" && value.length > 0) {
      return value;
    }
  }
  return undefined;
}

function getDatabaseConstructor(nativeModule: TriviumNativeModule): unknown {
  const defaultExport = nativeModule.default;
  if (nativeModule.Database) {
    return nativeModule.Database;
  }
  if (nativeModule.TriviumDB) {
    return nativeModule.TriviumDB;
  }
  if (defaultExport && typeof defaultExport === "object" && "Database" in defaultExport) {
    return (defaultExport as { Database?: unknown }).Database;
  }
  if (defaultExport && typeof defaultExport === "object" && "TriviumDB" in defaultExport) {
    return (defaultExport as { TriviumDB?: unknown }).TriviumDB;
  }
  return undefined;
}

async function maybeOpenDatabase(nativeModule: TriviumNativeModule, projectRoot?: string): Promise<boolean> {
  if (!projectRoot) {
    return true;
  }
  const dbDir = assertPathAllowed(projectRoot, join(".comath", "db"), { purpose: "runtime-write" });
  mkdirSync(dbDir, { recursive: true });
  const probePath = join(dbDir, "capability-probe.tdb");
  const Database = getDatabaseConstructor(nativeModule);
  if (typeof Database !== "function") {
    return false;
  }

  let opened: unknown;
  try {
    const ctor = Database as {
      open?: (path: string) => unknown;
      new (path: string, dim?: number): unknown;
    };
    opened = typeof ctor.open === "function" ? await ctor.open(probePath) : new ctor(probePath, 4);
    const close = opened && typeof opened === "object" && "close" in opened ? (opened as { close?: () => unknown }).close : undefined;
    if (typeof close === "function") {
      await close.call(opened);
    }
    return true;
  } finally {
    if (existsSync(probePath)) {
      rmSync(probePath, { force: true });
    }
  }
}

export async function probeTriviumCapability(
  options: TriviumCapabilityProbeOptions = {}
): Promise<TriviumCapabilityReport> {
  const info = runtimeInfo();
  const base = {
    packageName,
    platform: info.platform,
    arch: info.arch,
    nodeVersion: info.nodeVersion,
    fallbackBackend: "memory" as const,
    ffiDisabled: options.ffiDisabled ?? false
  };

  if (options.ffiDisabled) {
    return {
      ...base,
      available: false,
      canOpenDatabase: false,
      loadError: "TriviumDB FFI disabled by configuration",
      diagnostics: ["ffi disabled before native module load"]
    };
  }

  try {
    const nativeModule = asNativeModule(await (options.loader ?? defaultLoader)());
    const canOpenDatabase = await maybeOpenDatabase(nativeModule, options.openProbeProjectRoot);
    return {
      ...base,
      available: canOpenDatabase,
      packageVersion: packageVersion(nativeModule),
      canOpenDatabase,
      nativeModule,
      diagnostics: canOpenDatabase
        ? ["native module loaded", "database open probe passed"]
        : ["native module loaded", "database constructor/open probe unavailable"]
    };
  } catch (error) {
    return {
      ...base,
      available: false,
      canOpenDatabase: false,
      loadError: error instanceof Error ? error.message : String(error),
      diagnostics: ["native module load failed"]
    };
  }
}
