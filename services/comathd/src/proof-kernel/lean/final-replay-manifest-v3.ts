import { createHash } from "node:crypto";
import {
  copyFileSync,
  existsSync,
  lstatSync,
  mkdirSync,
  appendFileSync,
  readFileSync,
  readdirSync,
  realpathSync,
  statSync,
  writeFileSync
} from "node:fs";
import { dirname, isAbsolute, join, relative, resolve } from "node:path";
import { assertPathAllowed } from "../../security/path-policy.js";
import { finalReplayManifestV3Schema, type FinalReplayManifestV3 } from "../../types/schemas.js";
import { sha256Buffer, sha256FileSync } from "./lean-project.js";

type HashRef = { sha256: string; size_bytes: number };

function rel(projectRoot: string, path: string): string {
  const absolute = isAbsolute(path) ? resolve(path) : resolve(projectRoot, path);
  return relative(resolve(projectRoot), absolute).replace(/\\/g, "/") || ".";
}

function relFrom(root: string, path: string): string {
  return relative(resolve(root), resolve(path)).replace(/\\/g, "/") || ".";
}

function canonicalJson(value: unknown): string {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map((item) => canonicalJson(item)).join(",")}]`;
  }
  const entries = Object.entries(value as Record<string, unknown>)
    .filter(([, item]) => item !== undefined)
    .sort(([left], [right]) => left.localeCompare(right));
  return `{${entries.map(([key, item]) => `${JSON.stringify(key)}:${canonicalJson(item)}`).join(",")}}`;
}

function sha256Text(text: string): string {
  return createHash("sha256").update(text).digest("hex");
}

function assertInside(root: string, candidate: string): void {
  const rootReal = realpathSync.native(root);
  const candidateReal = realpathSync.native(candidate);
  const relativePath = relative(rootReal, candidateReal);
  if (relativePath.startsWith("..") || isAbsolute(relativePath)) {
    throw new Error("final_replay_symlink_escape");
  }
}

function listWorkspaceFiles(cleanRoot: string): string[] {
  const files: string[] = [];
  const visit = (dir: string) => {
    assertInside(cleanRoot, dir);
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (entry.name === ".lake") {
        continue;
      }
      const path = join(dir, entry.name);
      const stat = lstatSync(path);
      if (stat.isSymbolicLink()) {
        throw new Error("final_replay_symlink_escape");
      }
      if (entry.isDirectory()) {
        visit(path);
      } else if (entry.isFile()) {
        assertInside(cleanRoot, path);
        files.push(path);
      }
    }
  };
  visit(cleanRoot);
  return files.sort();
}

function hashWorkspaceFiles(cleanRoot: string): Record<string, HashRef> {
  const hashes: Record<string, HashRef> = {};
  for (const file of listWorkspaceFiles(cleanRoot)) {
    hashes[relFrom(cleanRoot, file)] = sha256FileSync(file);
  }
  return hashes;
}

function workspaceDigest(hashes: Record<string, HashRef>): string {
  return sha256Buffer(canonicalJson(hashes));
}

function reportHash(projectRoot: string, path: string): HashRef {
  return sha256FileSync(assertPathAllowed(projectRoot, path, { purpose: "read", resolveRealpath: true }));
}

function dependencyLock(input: {
  projectRoot: string;
  lean_toolchain_path: string;
  lake_manifest_path: string;
  lakefile_path: string;
  external_revisions: unknown[];
}): FinalReplayManifestV3["dependency_lock"] {
  const leanToolchainPath = assertPathAllowed(input.projectRoot, input.lean_toolchain_path, {
    purpose: "read",
    resolveRealpath: true
  });
  const lakeManifestPath = assertPathAllowed(input.projectRoot, input.lake_manifest_path, {
    purpose: "read",
    resolveRealpath: true
  });
  const lakefilePath = assertPathAllowed(input.projectRoot, input.lakefile_path, { purpose: "read", resolveRealpath: true });
  return {
    lean_toolchain_path: rel(input.projectRoot, leanToolchainPath),
    lean_toolchain: readFileSync(leanToolchainPath, "utf8").trim(),
    lean_toolchain_sha256: sha256FileSync(leanToolchainPath).sha256,
    lake_manifest_path: rel(input.projectRoot, lakeManifestPath),
    lake_manifest_sha256: sha256FileSync(lakeManifestPath).sha256,
    lakefile_path: rel(input.projectRoot, lakefilePath),
    lakefile_sha256: sha256FileSync(lakefilePath).sha256,
    external_revisions: input.external_revisions,
    external_revisions_sha256: sha256Text(canonicalJson(input.external_revisions))
  };
}

export function createFinalReplayManifestV3(input: {
  projectRoot: string;
  replay_id: string;
  campaign_id: string;
  claim_id: string;
  theorem_name: string;
  clean_workspace_path: string;
  command: string[];
  exit_code: number;
  result: "pass" | "fail";
  source_hashes_before: Record<string, HashRef>;
  stdout_path: string;
  stderr_path: string;
  report_paths: {
    static_audit: string;
    axiom_profile: string;
    dependency_closure: string;
    statement_equivalence: string;
  };
  lean_run_manifest_paths: string[];
  dependency_lock: {
    lean_toolchain_path: string;
    lake_manifest_path: string;
    lakefile_path: string;
    external_revisions: unknown[];
  };
  network_policy: "disabled" | "dependency_fetch_only" | "unknown";
  sandbox_policy: {
    network: "disabled" | "dependency_fetch_only" | "unknown";
    os_isolation: string;
  };
  resource_budget: {
    timeout_ms: number;
    max_stdout_bytes: number;
    max_stderr_bytes: number;
  };
  binary_hashes?: Record<string, string>;
}): FinalReplayManifestV3 {
  const cleanRoot = assertPathAllowed(input.projectRoot, input.clean_workspace_path, { purpose: "read", resolveRealpath: true });
  const sourceHashesAfter = hashWorkspaceFiles(cleanRoot);
  const cleanWorkspaceSha256 = workspaceDigest(sourceHashesAfter);
  const report_paths = {
    static_audit: rel(input.projectRoot, input.report_paths.static_audit),
    axiom_profile: rel(input.projectRoot, input.report_paths.axiom_profile),
    dependency_closure: rel(input.projectRoot, input.report_paths.dependency_closure),
    statement_equivalence: rel(input.projectRoot, input.report_paths.statement_equivalence)
  };
  const artifact_hashes = {
    stdout: reportHash(input.projectRoot, input.stdout_path),
    stderr: reportHash(input.projectRoot, input.stderr_path),
    static_audit: reportHash(input.projectRoot, input.report_paths.static_audit),
    axiom_profile: reportHash(input.projectRoot, input.report_paths.axiom_profile),
    dependency_closure: reportHash(input.projectRoot, input.report_paths.dependency_closure),
    statement_equivalence: reportHash(input.projectRoot, input.report_paths.statement_equivalence)
  };

  return finalReplayManifestV3Schema.parse({
    schema_version: "comath.final_replay_manifest.v3",
    replay_id: input.replay_id,
    campaign_id: input.campaign_id,
    claim_id: input.claim_id,
    theorem_name: input.theorem_name,
    runner: "comathd.LeanAuthority",
    proof_authority: "lean_kernel_clean_replay",
    clean_workspace_path: rel(input.projectRoot, cleanRoot),
    clean_workspace_sha256: cleanWorkspaceSha256,
    source_hashes_before: input.source_hashes_before,
    source_hashes_after: sourceHashesAfter,
    command: input.command,
    exit_code: input.exit_code,
    result: input.result,
    stdout_path: rel(input.projectRoot, input.stdout_path),
    stderr_path: rel(input.projectRoot, input.stderr_path),
    report_paths,
    artifact_hashes,
    lean_run_manifest_paths: input.lean_run_manifest_paths.map((path) => rel(input.projectRoot, path)),
    dependency_lock: dependencyLock({ projectRoot: input.projectRoot, ...input.dependency_lock }),
    network_policy: input.network_policy,
    sandbox_policy: input.sandbox_policy,
    resource_budget: input.resource_budget,
    binary_hashes: input.binary_hashes ?? {},
    no_symlink_escape: true,
    third_party_replay_command: input.command,
    created_at: new Date().toISOString()
  });
}

export function appendFinalReplayRegistryEntryV3(
  projectRoot: string,
  manifest: FinalReplayManifestV3
): { registry_path: string; entry_sha256: string } {
  const registryRel = join(".comath", "evidence", manifest.claim_id, "lean", "final_replay_registry.jsonl");
  const registryPath = assertPathAllowed(projectRoot, registryRel, { purpose: "runtime-write" });
  const existing = existsSync(registryPath)
    ? readFileSync(registryPath, "utf8")
        .split(/\r?\n/)
        .filter(Boolean)
        .map((line) => JSON.parse(line) as { replay_id?: string })
    : [];
  if (existing.some((entry) => entry.replay_id === manifest.replay_id)) {
    throw new Error("final_replay_registry_append_only_violation");
  }
  const line = canonicalJson(manifest);
  mkdirSync(dirname(registryPath), { recursive: true });
  appendFileSync(registryPath, `${line}\n`, "utf8");
  return { registry_path: registryRel.replace(/\\/g, "/"), entry_sha256: sha256Text(line) };
}

export function verifyFinalReplayManifestV3(
  projectRoot: string,
  candidate: unknown
): { ok: boolean; vetoes: string[] } {
  const parsed = finalReplayManifestV3Schema.safeParse(candidate);
  const vetoes: string[] = [];
  const raw = candidate && typeof candidate === "object" ? (candidate as Record<string, unknown>) : {};
  if (raw.runner !== "comathd.LeanAuthority") {
    vetoes.push("final_replay_manifest_not_service_owned");
  }
  const rawDependencyLock = raw.dependency_lock && typeof raw.dependency_lock === "object" ? (raw.dependency_lock as Record<string, unknown>) : {};
  if (
    typeof rawDependencyLock.lean_toolchain_sha256 !== "string" ||
    typeof rawDependencyLock.lake_manifest_sha256 !== "string" ||
    typeof rawDependencyLock.lakefile_sha256 !== "string"
  ) {
    vetoes.push("final_replay_dependency_unpinned");
  }
  if (!parsed.success) {
    vetoes.push("final_replay_manifest_parse_failure");
    return { ok: false, vetoes: Array.from(new Set(vetoes)) };
  }
  const manifest = parsed.data;
  if (manifest.network_policy !== "disabled" || manifest.sandbox_policy.network !== "disabled") {
    vetoes.push("final_replay_network_policy_untrusted");
  }
  if (!manifest.no_symlink_escape) {
    vetoes.push("final_replay_symlink_escape");
  }
  if (
    !manifest.dependency_lock.lean_toolchain_sha256 ||
    !manifest.dependency_lock.lake_manifest_sha256 ||
    !manifest.dependency_lock.lakefile_sha256
  ) {
    vetoes.push("final_replay_dependency_unpinned");
  }
  try {
    const cleanRoot = assertPathAllowed(projectRoot, manifest.clean_workspace_path, { purpose: "read", resolveRealpath: true });
    const currentSourceHashes = hashWorkspaceFiles(cleanRoot);
    if (workspaceDigest(currentSourceHashes) !== manifest.clean_workspace_sha256) {
      vetoes.push("final_replay_clean_workspace_hash_mismatch");
    }
    if (canonicalJson(currentSourceHashes) !== canonicalJson(manifest.source_hashes_after)) {
      vetoes.push("final_replay_source_hash_after_mismatch");
    }
  } catch (error) {
    vetoes.push(error instanceof Error ? error.message : "final_replay_clean_workspace_unreadable");
  }

  return { ok: vetoes.length === 0, vetoes: Array.from(new Set(vetoes)) };
}

export function writeThirdPartyReplayPackV3(
  projectRoot: string,
  manifest: FinalReplayManifestV3
): { pack_path: string; expected_hashes_sha256: string; manifest_sha256: string } {
  const packRel = join(".comath", "evidence", manifest.claim_id, "lean", "replay_pack", manifest.replay_id);
  const packRoot = assertPathAllowed(projectRoot, packRel, { purpose: "runtime-write" });
  mkdirSync(packRoot, { recursive: true });
  const manifestText = `${JSON.stringify(manifest, null, 2)}\n`;
  const expectedHashes = {
    clean_workspace_sha256: manifest.clean_workspace_sha256,
    source_hashes_after: manifest.source_hashes_after,
    artifact_hashes: manifest.artifact_hashes,
    dependency_lock: manifest.dependency_lock,
    lean_run_manifest_paths: manifest.lean_run_manifest_paths
  };
  const expectedText = `${JSON.stringify(expectedHashes, null, 2)}\n`;
  writeFileSync(join(packRoot, "FinalReplayManifest.json"), manifestText, "utf8");
  writeFileSync(join(packRoot, "expected_hashes.json"), expectedText, "utf8");
  writeFileSync(
    join(packRoot, "README_REPLAY.md"),
    [
      "# CoMath Final Replay Pack",
      "",
      `Replay id: ${manifest.replay_id}`,
      `Claim id: ${manifest.claim_id}`,
      `Theorem: ${manifest.theorem_name}`,
      "",
      "## Replay",
      "",
      `Command: ${manifest.third_party_replay_command.join(" ")}`,
      "Network policy: disabled for final proof replay.",
      "Verify `expected_hashes.json` against the clean workspace before trusting the result.",
      ""
    ].join("\n"),
    "utf8"
  );

  const cleanRoot = assertPathAllowed(projectRoot, manifest.clean_workspace_path, { purpose: "read", resolveRealpath: true });
  for (const [relativePath] of Object.entries(manifest.source_hashes_after)) {
    const source = assertPathAllowed(cleanRoot, relativePath, { purpose: "read", resolveRealpath: true });
    const target = join(packRoot, "clean", relativePath);
    mkdirSync(dirname(target), { recursive: true });
    copyFileSync(source, target);
  }

  return {
    pack_path: packRel.replace(/\\/g, "/"),
    expected_hashes_sha256: sha256Text(expectedText),
    manifest_sha256: sha256Text(manifestText)
  };
}
