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
import { appendAuditEvent, readAuditEvents } from "../../audit/jsonl-writer.js";
import { hasLeanRunManifestProvenanceIndexV1, verifyLeanRunManifestV3Evidence } from "./lean-run-manifest-v3.js";
import { dependencyClosureV2PackagesToExternalRevisions } from "./dependency-closure.js";

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

function isSha256(value: unknown): value is string {
  return typeof value === "string" && /^[a-f0-9]{64}$/.test(value);
}

function stringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function normalizedStoredPath(path: string): string {
  return path.replace(/\\/g, "/");
}

export function finalReplayLeanRunManifestSemanticallyBoundV3(
  finalReplayManifest: unknown,
  leanRunManifest: unknown
): boolean {
  const finalReplay = finalReplayManifest && typeof finalReplayManifest === "object"
    ? (finalReplayManifest as Record<string, unknown>)
    : {};
  const record = leanRunManifest && typeof leanRunManifest === "object" ? (leanRunManifest as Record<string, unknown>) : {};
  const finalReplayCommand = stringArray(finalReplay.command);
  const leanRunCommand = stringArray(record.command);
  return (
    finalReplay.schema_version === "comath.final_replay_manifest.v3" &&
    record.schema_version === "comath.lean_run_manifest.v3" &&
    record.runner === "comathd.LeanRunner" &&
    record.claim_id === finalReplay.claim_id &&
    record.campaign_id === finalReplay.campaign_id &&
    record.purpose === "final_replay" &&
    record.exit_code === 0 &&
    record.proof_authority === "lean_kernel_check" &&
    record.network_policy === "disabled" &&
    normalizedStoredPath(String(record.cwd ?? "")) === normalizedStoredPath(String(finalReplay.clean_workspace_path ?? "")) &&
    canonicalJson(leanRunCommand) === canonicalJson(finalReplayCommand)
  );
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
      const path = join(dir, entry.name);
      const stat = lstatSync(path);
      if (stat.isSymbolicLink()) {
        throw new Error("final_replay_symlink_escape");
      }
      if (entry.name === ".lake") {
        const mathlibPackageRoot = join(path, "packages", "mathlib");
        if (existsSync(mathlibPackageRoot)) {
          visit(mathlibPackageRoot);
        }
        continue;
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

function readJsonInsideProject(projectRoot: string, path: string): unknown {
  const absolute = assertPathAllowed(projectRoot, path, { purpose: "read", resolveRealpath: true });
  return JSON.parse(readFileSync(absolute, "utf8"));
}

function dependencyLockFileHashVetoes(projectRoot: string, manifest: FinalReplayManifestV3): string[] {
  const checks: Array<[string, string, string, string]> = [
    ["lean_toolchain", "lean-toolchain", manifest.dependency_lock.lean_toolchain_path, manifest.dependency_lock.lean_toolchain_sha256],
    ["lake_manifest", "lake-manifest.json", manifest.dependency_lock.lake_manifest_path, manifest.dependency_lock.lake_manifest_sha256],
    ["lakefile", "lakefile.lean", manifest.dependency_lock.lakefile_path, manifest.dependency_lock.lakefile_sha256]
  ];
  const vetoes: string[] = [];
  for (const [name, cleanWorkspaceRel, path, expected] of checks) {
    const expectedPath = normalizedStoredPath(join(manifest.clean_workspace_path, cleanWorkspaceRel));
    if (normalizedStoredPath(path) !== expectedPath) {
      vetoes.push(`final_replay_dependency_lock_path_mismatch:${name}`);
    }
    try {
      const absolute = assertPathAllowed(projectRoot, path, { purpose: "read", resolveRealpath: true });
      if (name === "lean_toolchain" && readFileSync(absolute, "utf8").trim() !== manifest.dependency_lock.lean_toolchain) {
        vetoes.push("final_replay_dependency_lock_toolchain_mismatch");
      }
      if (sha256FileSync(absolute).sha256 !== expected) {
        vetoes.push(`final_replay_dependency_lock_hash_mismatch:${name}`);
      }
    } catch {
      vetoes.push(`final_replay_dependency_lock_unreadable:${name}`);
    }
  }
  if (sha256Text(canonicalJson(manifest.dependency_lock.external_revisions)) !== manifest.dependency_lock.external_revisions_sha256) {
    vetoes.push("final_replay_dependency_lock_external_revisions_hash_mismatch");
  }
  return vetoes;
}

function dependencyClosureV2ExternalRevisionVetoes(projectRoot: string, manifest: FinalReplayManifestV3): string[] {
  try {
    const report = readJsonInsideProject(projectRoot, manifest.report_paths.dependency_closure);
    if (!report || typeof report !== "object") {
      return [];
    }
    const record = report as Record<string, unknown>;
    if (record.schema_version !== "comath.dependency_closure.v2" || !Array.isArray(record.packages)) {
      return [];
    }
    const expectedExternalRevisions = dependencyClosureV2PackagesToExternalRevisions(
      record.packages.filter((pkg): pkg is { name: string } & Record<string, unknown> => (
        Boolean(pkg) && typeof pkg === "object" && typeof (pkg as Record<string, unknown>).name === "string"
      ))
    );
    if (canonicalJson(expectedExternalRevisions) !== canonicalJson(manifest.dependency_lock.external_revisions)) {
      return ["final_replay_dependency_lock_external_revisions_mismatch"];
    }
    return [];
  } catch {
    return ["final_replay_dependency_closure_unreadable"];
  }
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
    import_graph_diagnostic?: string;
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
    statement_equivalence: rel(input.projectRoot, input.report_paths.statement_equivalence),
    ...(input.report_paths.import_graph_diagnostic
      ? { import_graph_diagnostic: rel(input.projectRoot, input.report_paths.import_graph_diagnostic) }
      : {})
  };
  const artifact_hashes = {
    stdout: reportHash(input.projectRoot, input.stdout_path),
    stderr: reportHash(input.projectRoot, input.stderr_path),
    static_audit: reportHash(input.projectRoot, input.report_paths.static_audit),
    axiom_profile: reportHash(input.projectRoot, input.report_paths.axiom_profile),
    dependency_closure: reportHash(input.projectRoot, input.report_paths.dependency_closure),
    statement_equivalence: reportHash(input.projectRoot, input.report_paths.statement_equivalence),
    ...(input.report_paths.import_graph_diagnostic
      ? { import_graph_diagnostic: reportHash(input.projectRoot, input.report_paths.import_graph_diagnostic) }
      : {})
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
  manifest: FinalReplayManifestV3,
  provenance?: { project_id: string; actor: string; source?: string }
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
  const entrySha256 = sha256Text(line);
  mkdirSync(dirname(registryPath), { recursive: true });
  appendFileSync(registryPath, `${line}\n`, "utf8");
  const registry_path = registryRel.replace(/\\/g, "/");
  if (provenance) {
    appendAuditEvent(projectRoot, {
      project_id: provenance.project_id,
      event_type: "lean.final_replay_registry_appended",
      actor: provenance.actor,
      target_id: manifest.claim_id,
      payload: {
        claim_id: manifest.claim_id,
        replay_id: manifest.replay_id,
        registry_path,
        entry_sha256: entrySha256,
        manifest_sha256: entrySha256,
        runner: manifest.runner,
        proof_authority: manifest.proof_authority,
        source: provenance.source ?? "comathd.LeanAuthority",
        service_owned_clean_replay_provenance: true
      }
    });
  }
  return { registry_path, entry_sha256: entrySha256 };
}

export function hasFinalReplayRegistryProvenanceV3(projectRoot: string, candidate: unknown): boolean {
  const parsed = finalReplayManifestV3Schema.safeParse(candidate);
  if (!parsed.success) {
    return false;
  }
  const registryRel = join(".comath", "evidence", parsed.data.claim_id, "lean", "final_replay_registry.jsonl");
  let registryPath: string;
  try {
    registryPath = assertPathAllowed(projectRoot, registryRel, { purpose: "read", resolveRealpath: true });
  } catch {
    return false;
  }
  if (!existsSync(registryPath)) {
    return false;
  }
  const expected = canonicalJson(parsed.data);
  const expectedSha256 = sha256Text(expected);
  const hasRegistryLine = readFileSync(registryPath, "utf8")
    .split(/\r?\n/)
    .filter(Boolean)
    .some((line) => {
      try {
        const entry = JSON.parse(line);
        return canonicalJson(entry) === expected;
      } catch {
        return false;
      }
    });
  if (!hasRegistryLine) {
    return false;
  }
  return readAuditEvents(projectRoot).some((event) => {
    const payload = event.payload as Record<string, unknown>;
    return (
      event.event_type === "lean.final_replay_registry_appended" &&
      event.target_id === parsed.data.claim_id &&
      payload.claim_id === parsed.data.claim_id &&
      payload.replay_id === parsed.data.replay_id &&
      payload.registry_path === registryRel.replace(/\\/g, "/") &&
      payload.entry_sha256 === expectedSha256 &&
      payload.manifest_sha256 === expectedSha256 &&
      payload.runner === "comathd.LeanAuthority" &&
      payload.proof_authority === "lean_kernel_clean_replay" &&
      payload.service_owned_clean_replay_provenance === true
    );
  });
}

export function hasLeanLakeBinaryHashProvenanceV3(projectRoot: string, candidate: unknown): boolean {
  const parsed = finalReplayManifestV3Schema.safeParse(candidate);
  if (!parsed.success) {
    return false;
  }
  const binaryHashes = parsed.data.binary_hashes && typeof parsed.data.binary_hashes === "object"
    ? parsed.data.binary_hashes
    : {};
  const leanHash = binaryHashes.lean;
  const lakeHash = binaryHashes.lake;
  if (!isSha256(leanHash) || !isSha256(lakeHash)) {
    return false;
  }

  const replayPaths = stringArray(parsed.data.lean_run_manifest_paths).map(normalizedStoredPath);
  if (replayPaths.length === 0) {
    return false;
  }

  return replayPaths.some((manifestPath) => {
    const manifest = readJsonInsideProject(projectRoot, manifestPath);
    if (!manifest || typeof manifest !== "object") {
      return false;
    }
    const record = manifest as Record<string, unknown>;
    return (
      finalReplayLeanRunManifestSemanticallyBoundV3(parsed.data, manifest) &&
      record.lean_binary_sha256 === leanHash &&
      record.lake_binary_sha256 === lakeHash &&
      verifyLeanRunManifestV3Evidence(projectRoot, manifest).ok &&
      hasLeanRunManifestProvenanceIndexV1({ projectRoot, manifest, manifest_path: manifestPath })
    );
  });
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
  vetoes.push(...dependencyLockFileHashVetoes(projectRoot, manifest));
  vetoes.push(...dependencyClosureV2ExternalRevisionVetoes(projectRoot, manifest));

  const artifactPaths: Record<string, string> = {
    stdout: manifest.stdout_path,
    stderr: manifest.stderr_path,
    static_audit: manifest.report_paths.static_audit,
    axiom_profile: manifest.report_paths.axiom_profile,
    dependency_closure: manifest.report_paths.dependency_closure,
    statement_equivalence: manifest.report_paths.statement_equivalence,
    ...(manifest.report_paths.import_graph_diagnostic ? { import_graph_diagnostic: manifest.report_paths.import_graph_diagnostic } : {})
  };
  for (const [key, relativePath] of Object.entries(artifactPaths)) {
    const expected = manifest.artifact_hashes[key as keyof typeof manifest.artifact_hashes];
    if (!expected) {
      vetoes.push("final_replay_artifact_hash_missing");
      continue;
    }
    try {
      const actual = reportHash(projectRoot, relativePath);
      if (actual.sha256 !== expected.sha256 || actual.size_bytes !== expected.size_bytes) {
        vetoes.push("final_replay_artifact_hash_mismatch");
      }
    } catch {
      vetoes.push("final_replay_artifact_unreadable");
    }
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
    report_paths: manifest.report_paths,
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
