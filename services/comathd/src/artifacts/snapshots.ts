import {
  copyFileSync,
  existsSync,
  lstatSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  realpathSync,
  rmSync,
  writeFileSync
} from "node:fs";
import { dirname, isAbsolute, join, relative, resolve } from "node:path";
import { appendAuditEvent } from "../audit/jsonl-writer.js";
import { ComathError } from "../errors.js";
import { ensureRuntimeTree } from "../project/project-store.js";
import { assertPathAllowed } from "../security/path-policy.js";
import { scanForSecrets, type SecretScanResult } from "../security/secret-scan.js";
import { canonicalJson, sha256Text } from "../verification/runner-contracts.js";
import { sha256File } from "./hash.js";
import {
  createReplayManifest,
  replayManifestPath,
  verifyRunnerReportReplayIntegrity,
  type ReplayManifest
} from "./replay.js";

export type SnapshotEntryCategory =
  | "project"
  | "config"
  | "claim"
  | "evidence"
  | "audit"
  | "artifact_index"
  | "artifact_blob"
  | "runner_output"
  | "paper"
  | "workstream"
  | "other";

export type SnapshotEntry = {
  relative_path: string;
  snapshot_path: string;
  category: SnapshotEntryCategory;
  sha256: string;
  size_bytes: number;
};

export type SnapshotManifest = {
  schema_version: 1;
  snapshot_id: string;
  project_id: string;
  created_at: string;
  can_restore: true;
  source_runtime_root: ".comath";
  entries: SnapshotEntry[];
  replay: ReplayManifest;
  secret_scan: {
    status: SecretScanResult["status"];
    findings: SecretScanResult["findings"];
    scanned_files: number;
    warnings: string[];
  };
  integrity: {
    entries_sha256: string;
    replay_manifest_sha256: string;
    manifest_sha256: string;
  };
};

export type ExportSnapshotInput = {
  project_id: string;
  actor: string;
};

export type ExportSnapshotResult = {
  snapshot_root: string;
  manifest_path: string;
  replay_manifest_path: string;
  manifest: SnapshotManifest;
};

export type VerifySnapshotResult = {
  ok: boolean;
  vetoes: string[];
  warnings: string[];
  manifest?: SnapshotManifest;
};

export type RestoreSnapshotResult = {
  restored_entries: number;
  target_root: string;
  project_id: string;
};

const MANIFEST_FILE = "manifest.json";
const REPLAY_FILE = "replay_manifest.json";
const SNAPSHOT_FILES_DIR = "files";

function isInsideRoot(root: string, candidate: string): boolean {
  const rel = relative(root, candidate);
  return rel === "" || (!rel.startsWith("..") && !isAbsolute(rel));
}

function normalizeRelativePath(path: string): string {
  return path.replace(/\\/g, "/");
}

function realInsideRoot(root: string, candidate: string): boolean {
  try {
    const realRoot = realpathSync.native(root);
    const realCandidate = realpathSync.native(candidate);
    return isInsideRoot(realRoot, realCandidate);
  } catch {
    return false;
  }
}

function hasUnsafePathSegment(path: string): boolean {
  return path.split(/[\\/]/).some((segment) => segment === ".." || segment === "");
}

function ensureNoReparseOrSymlink(path: string): boolean {
  const parts = resolve(path).split(/[\\/]/);
  let current = parts[0] || "/";
  for (let index = 1; index < parts.length; index += 1) {
    current = join(current, parts[index]);
    if (!existsSync(current)) {
      continue;
    }
    const stat = lstatSync(current);
    if (stat.isSymbolicLink() || stat.isBlockDevice() || stat.isCharacterDevice()) {
      return false;
    }
    if ((stat as { isSymbolicLink(): boolean }).isSymbolicLink?.() === true) {
      return false;
    }
  }
  return true;
}

function snapshotId(existing: string[]): string {
  const numbers = existing
    .map((name) => /^SNAP-(\d{4,})$/.exec(name)?.[1])
    .filter((item): item is string => typeof item === "string")
    .map((item) => Number.parseInt(item, 10))
    .filter(Number.isFinite);
  const next = numbers.length ? Math.max(...numbers) + 1 : 1;
  return `SNAP-${String(next).padStart(4, "0")}`;
}

function snapshotsDir(projectRoot: string): string {
  return assertPathAllowed(projectRoot, join(".comath", "snapshots"), { purpose: "runtime-write" });
}

function categoryFor(relativePath: string): SnapshotEntryCategory {
  const path = normalizeRelativePath(relativePath);
  if (path === ".comath/project.json") {
    return "project";
  }
  if (path === ".comath/config.json") {
    return "config";
  }
  if (path.startsWith(".comath/claims/")) {
    return "claim";
  }
  if (path === ".comath/evidence/evidence.jsonl") {
    return "evidence";
  }
  if (path.includes("/runners/RUN-") && path.endsWith(".json")) {
    return "runner_output";
  }
  if (path.startsWith(".comath/evidence/")) {
    return "evidence";
  }
  if (path.startsWith(".comath/audit/")) {
    return "audit";
  }
  if (path === ".comath/artifacts/artifacts.jsonl") {
    return "artifact_index";
  }
  if (path.startsWith(".comath/artifacts/sha256/")) {
    return "artifact_blob";
  }
  if (path.startsWith(".comath/artifacts/papers/")) {
    return "paper";
  }
  if (path.startsWith(".comath/workstreams/")) {
    return "workstream";
  }
  return "other";
}

function collectRuntimeFiles(projectRoot: string): string[] {
  const root = resolve(projectRoot);
  const runtimeRoot = assertPathAllowed(root, ".comath", { purpose: "read" });
  if (!existsSync(runtimeRoot)) {
    throw new ComathError("project runtime is not initialized", { statusCode: 404, code: "PROJECT_NOT_INITIALIZED" });
  }
  if (!ensureNoReparseOrSymlink(runtimeRoot)) {
    throw new ComathError("snapshot source contains unsafe link", {
      statusCode: 400,
      code: "SNAPSHOT_SOURCE_UNSAFE_LINK"
    });
  }

  const files: string[] = [];
  const visit = (absoluteDir: string) => {
    for (const name of readdirSync(absoluteDir)) {
      if (absoluteDir === runtimeRoot && name === "snapshots") {
        continue;
      }
      const absolutePath = join(absoluteDir, name);
      const stat = lstatSync(absolutePath);
      if (stat.isSymbolicLink() || stat.isBlockDevice() || stat.isCharacterDevice()) {
        throw new ComathError("snapshot source contains unsafe link", {
          statusCode: 400,
          code: "SNAPSHOT_SOURCE_UNSAFE_LINK"
        });
      }
      if (stat.isDirectory()) {
        if (!realInsideRoot(runtimeRoot, absolutePath)) {
          throw new ComathError("snapshot source escapes runtime root", {
            statusCode: 400,
            code: "SNAPSHOT_SOURCE_TRAVERSAL"
          });
        }
        visit(absolutePath);
      } else if (stat.isFile()) {
        if (!realInsideRoot(runtimeRoot, absolutePath)) {
          throw new ComathError("snapshot source escapes runtime root", {
            statusCode: 400,
            code: "SNAPSHOT_SOURCE_TRAVERSAL"
          });
        }
        const relativePath = normalizeRelativePath(relative(root, absolutePath));
        files.push(relativePath);
      }
    }
  };
  visit(runtimeRoot);
  return files.sort();
}

function validateManifestEntryPaths(manifest: SnapshotManifest): string[] {
  const vetoes: string[] = [];
  for (const entry of manifest.entries) {
    if (!entry.relative_path.startsWith(".comath/") || entry.relative_path.startsWith(".comath/snapshots/")) {
      vetoes.push("runtime_path_out_of_scope");
    }
    if (
      hasUnsafePathSegment(entry.relative_path) ||
      hasUnsafePathSegment(entry.snapshot_path) ||
      entry.snapshot_path.includes("..") ||
      entry.snapshot_path.startsWith("/") ||
      /^[a-zA-Z]:[\\/]/.test(entry.snapshot_path) ||
      entry.snapshot_path.startsWith("\\\\")
    ) {
      vetoes.push("snapshot_path_traversal");
    }
    if (!entry.snapshot_path.startsWith(`${SNAPSHOT_FILES_DIR}/`)) {
      vetoes.push("snapshot_path_traversal");
    }
  }
  return Array.from(new Set(vetoes));
}

function materialForIntegrity(manifest: Omit<SnapshotManifest, "integrity"> & { integrity?: Partial<SnapshotManifest["integrity"]> }): Omit<SnapshotManifest, "integrity"> {
  const { integrity: _integrity, ...rest } = manifest;
  return rest;
}

function manifestHash(manifest: SnapshotManifest): string {
  return sha256Text(canonicalJson(materialForIntegrity(manifest)));
}

function readManifest(path: string): SnapshotManifest {
  return JSON.parse(readFileSync(path, "utf8")) as SnapshotManifest;
}

function writeJson(path: string, value: unknown): void {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, canonicalJson(value), "utf8");
}

function secretScanSummary(scans: SecretScanResult[]): SnapshotManifest["secret_scan"] {
  return {
    status: scans.some((scan) => scan.status === "blocked") ? "blocked" : "clean",
    findings: scans.flatMap((scan) => scan.findings),
    scanned_files: scans.length,
    warnings: scans.flatMap((scan) => scan.warnings)
  };
}

export async function exportSnapshot(projectRoot: string, input: ExportSnapshotInput): Promise<ExportSnapshotResult> {
  const root = resolve(projectRoot);
  const snapshotBase = snapshotsDir(root);
  mkdirSync(snapshotBase, { recursive: true });
  const id = snapshotId(readdirSync(snapshotBase, { withFileTypes: true }).filter((item) => item.isDirectory()).map((item) => item.name));
  const snapshotRoot = assertPathAllowed(root, join(".comath", "snapshots", id), { purpose: "runtime-write" });
  mkdirSync(join(snapshotRoot, SNAPSHOT_FILES_DIR), { recursive: true });

  const createdAt = new Date().toISOString();
  const runtimeFiles = collectRuntimeFiles(root);
  const scans = runtimeFiles.map((relativePath) => scanForSecrets(assertPathAllowed(root, relativePath, { purpose: "read", resolveRealpath: true })));
  const summary = secretScanSummary(scans);
  if (summary.status === "blocked") {
    rmSync(snapshotRoot, { recursive: true, force: true });
    throw new ComathError("secret scan blocked snapshot export", {
      statusCode: 400,
      code: "SNAPSHOT_SECRET_SCAN_BLOCKED"
    });
  }

  const entries: SnapshotEntry[] = [];
  for (const relativePath of runtimeFiles) {
    const source = assertPathAllowed(root, relativePath, { purpose: "read", resolveRealpath: true });
    const snapshotPath = normalizeRelativePath(join(SNAPSHOT_FILES_DIR, relativePath));
    const target = join(snapshotRoot, snapshotPath);
    if (!isInsideRoot(snapshotRoot, target) || !ensureNoReparseOrSymlink(dirname(target))) {
      throw new ComathError("snapshot path traversal", { statusCode: 400, code: "SNAPSHOT_PATH_TRAVERSAL" });
    }
    mkdirSync(dirname(target), { recursive: true });
    const category = categoryFor(relativePath);
    copyFileSync(source, target);
    const hash = await sha256File(target);
    entries.push({
      relative_path: normalizeRelativePath(relativePath),
      snapshot_path: snapshotPath,
      category,
      sha256: hash.sha256,
      size_bytes: hash.size_bytes
    });
  }

  entries.sort((left, right) => left.relative_path.localeCompare(right.relative_path));
  const runnerReports = entries.filter((entry) => entry.category === "runner_output").map((entry) => entry.relative_path);
  const replay = createReplayManifest(root, input.project_id, runnerReports, createdAt);
  const replayPath = replayManifestPath(snapshotRoot);
  writeJson(replayPath, replay);

  const manifestWithoutFinalHash: SnapshotManifest = {
    schema_version: 1,
    snapshot_id: id,
    project_id: input.project_id,
    created_at: createdAt,
    can_restore: true,
    source_runtime_root: ".comath",
    entries,
    replay,
    secret_scan: summary,
    integrity: {
      entries_sha256: sha256Text(canonicalJson(entries)),
      replay_manifest_sha256: sha256Text(canonicalJson(replay)),
      manifest_sha256: ""
    }
  };
  const manifest: SnapshotManifest = {
    ...manifestWithoutFinalHash,
    integrity: {
      ...manifestWithoutFinalHash.integrity,
      manifest_sha256: manifestHash(manifestWithoutFinalHash)
    }
  };
  const manifestPath = join(snapshotRoot, MANIFEST_FILE);
  writeJson(manifestPath, manifest);
  appendAuditEvent(root, {
    project_id: input.project_id,
    event_type: "snapshot.exported",
    actor: input.actor,
    target_id: id,
    payload: {
      snapshot_id: id,
      entry_count: entries.length,
      replay_runs: replay.runs.length,
      manifest_sha256: manifest.integrity.manifest_sha256
    }
  });
  return { snapshot_root: snapshotRoot, manifest_path: manifestPath, replay_manifest_path: replayPath, manifest };
}

export async function verifySnapshot(manifestPath: string): Promise<VerifySnapshotResult> {
  const vetoes: string[] = [];
  const warnings: string[] = [];
  let manifest: SnapshotManifest;
  try {
    manifest = readManifest(manifestPath);
  } catch {
    return { ok: false, vetoes: ["manifest_unreadable"], warnings };
  }

  const snapshotRoot = dirname(manifestPath);
  if (!realInsideRoot(snapshotRoot, manifestPath) || !ensureNoReparseOrSymlink(snapshotRoot)) {
    vetoes.push("snapshot_path_traversal");
  }
  vetoes.push(...validateManifestEntryPaths(manifest));
  if (manifest.integrity.entries_sha256 !== sha256Text(canonicalJson(manifest.entries))) {
    vetoes.push("entries_integrity_hash_mismatch");
  }
  if (manifest.integrity.replay_manifest_sha256 !== sha256Text(canonicalJson(manifest.replay))) {
    vetoes.push("replay_integrity_hash_mismatch");
  }
  if (manifest.replay.integrity.runs_sha256 !== sha256Text(canonicalJson(manifest.replay.runs))) {
    vetoes.push("replay_runs_hash_mismatch");
  }
  if (manifest.integrity.manifest_sha256 !== manifestHash(manifest)) {
    vetoes.push("manifest_integrity_hash_mismatch");
  }

  const replayPath = join(snapshotRoot, REPLAY_FILE);
  if (!existsSync(replayPath)) {
    vetoes.push("replay_manifest_missing");
  } else {
    try {
      const replayOnDisk = JSON.parse(readFileSync(replayPath, "utf8")) as ReplayManifest;
      if (sha256Text(canonicalJson(replayOnDisk)) !== manifest.integrity.replay_manifest_sha256) {
        vetoes.push("replay_manifest_hash_mismatch");
      }
      if (replayOnDisk.integrity.runs_sha256 !== sha256Text(canonicalJson(replayOnDisk.runs))) {
        vetoes.push("replay_runs_hash_mismatch");
      }
    } catch {
      vetoes.push("replay_manifest_unreadable");
    }
  }

  for (const entry of manifest.entries) {
    const snapshotPath = join(snapshotRoot, entry.snapshot_path);
    if (!isInsideRoot(snapshotRoot, snapshotPath)) {
      vetoes.push("snapshot_path_traversal");
      continue;
    }
    if (!existsSync(snapshotPath)) {
      vetoes.push("snapshot_entry_missing");
      continue;
    }
    if (!realInsideRoot(snapshotRoot, snapshotPath) || !ensureNoReparseOrSymlink(snapshotPath)) {
      vetoes.push("snapshot_path_traversal");
      continue;
    }
    const hash = await sha256File(snapshotPath);
    if (hash.sha256 !== entry.sha256 || hash.size_bytes !== entry.size_bytes) {
      vetoes.push("entry_hash_mismatch");
    }
    const scan = scanForSecrets(snapshotPath);
    if (scan.status === "blocked") {
      vetoes.push("snapshot_entry_secret_hit");
    }
    if (entry.category === "runner_output") {
      try {
        const report = JSON.parse(readFileSync(snapshotPath, "utf8"));
        const integrity = verifyRunnerReportReplayIntegrity(report);
        vetoes.push(...integrity.vetoes);
        warnings.push(...integrity.warnings);
      } catch {
        vetoes.push("runner_report_unreadable");
      }
    }
  }

  return { ok: vetoes.length === 0, vetoes: Array.from(new Set(vetoes)), warnings: Array.from(new Set(warnings)), manifest };
}

export async function restoreSnapshot(
  manifestPath: string,
  targetRoot: string,
  _options: { actor: string }
): Promise<RestoreSnapshotResult> {
  const verification = await verifySnapshot(manifestPath);
  if (!verification.ok || !verification.manifest) {
    throw new ComathError("snapshot verification failed", {
      statusCode: 400,
      code: "SNAPSHOT_VERIFICATION_FAILED"
    });
  }
  const manifest = verification.manifest;
  const snapshotRoot = dirname(manifestPath);
  const target = resolve(targetRoot);
  ensureRuntimeTree(target);
  if (!ensureNoReparseOrSymlink(target)) {
    throw new ComathError("restore target contains unsafe link", { statusCode: 400, code: "SNAPSHOT_RESTORE_TRAVERSAL" });
  }

  for (const entry of manifest.entries) {
    const source = join(snapshotRoot, entry.snapshot_path);
    if (!isInsideRoot(snapshotRoot, source) || !realInsideRoot(snapshotRoot, source) || !ensureNoReparseOrSymlink(source)) {
      throw new ComathError("snapshot path traversal", { statusCode: 400, code: "SNAPSHOT_PATH_TRAVERSAL" });
    }
    const destination = resolve(target, entry.relative_path);
    if (!isInsideRoot(target, destination) || !ensureNoReparseOrSymlink(dirname(destination))) {
      throw new ComathError("restore path traversal", { statusCode: 400, code: "SNAPSHOT_RESTORE_TRAVERSAL" });
    }
    if (entry.relative_path.startsWith(".comath/snapshots/")) {
      throw new ComathError("snapshot cannot restore nested snapshots", {
        statusCode: 400,
        code: "SNAPSHOT_RESTORE_TRAVERSAL"
      });
    }
    mkdirSync(dirname(destination), { recursive: true });
    copyFileSync(source, destination);
  }

  return {
    restored_entries: manifest.entries.length,
    target_root: target,
    project_id: manifest.project_id
  };
}
