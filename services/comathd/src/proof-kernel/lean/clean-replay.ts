import { copyFileSync, cpSync, existsSync, lstatSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { delimiter, dirname, join, relative } from "node:path";
import { spawnSync } from "node:child_process";
import { assertPathAllowed } from "../../security/path-policy.js";
import { finalLeanReplaySchema, type FinalLeanReplay } from "../../types/schemas.js";
import { nextSequentialId } from "../../utils/id.js";
import { checkAxiomProfile } from "./axiom-profile.js";
import { checkDependencyClosureV2, type DependencyClosureV2Package } from "./dependency-closure.js";
import {
  appendFinalReplayRegistryEntryV3,
  createFinalReplayManifestV3,
  writeThirdPartyReplayPackV3
} from "./final-replay-manifest-v3.js";
import { hashLeanProjectFiles, sha256FileSync, type LeanProjectFiles } from "./lean-project.js";
import { runServiceOwnedLeanCommandV3 } from "./lean-run-manifest-v3.js";
import { checkStatementEquivalence } from "./statement-equivalence.js";
import { runStaticCheatScan } from "./static-cheat-scan.js";

export type CleanReplayResult = {
  final_replay: FinalLeanReplay;
  static_audit: ReturnType<typeof runStaticCheatScan>;
  axiom_profile: ReturnType<typeof checkAxiomProfile>;
  dependency_closure: ReturnType<typeof checkDependencyClosureV2>;
  statement_equivalence: ReturnType<typeof checkStatementEquivalence>;
  lean_run_manifest_paths: string[];
  final_replay_manifest_v3_path?: string;
  third_party_replay_pack_path?: string;
};

const finalReplayAllowedImportPrefixes = ["Mathlib", "Std", "Init", "Lake", "MathResearch", "Audit"];
const finalReplayTrustedExternalDependencies = ["mathlib"];

function directElanTool(command: string, leanToolchain: string): string {
  const match = /^leanprover\/lean4:(v[0-9]+\.[0-9]+\.[0-9]+)$/.exec(leanToolchain.trim());
  if (!match || (command !== "lake" && command !== "lean")) {
    return command;
  }
  const exe = process.platform === "win32" ? `${command}.exe` : command;
  const toolchainDir = `leanprover--lean4---${match[1]}`;
  const elanHome = process.env.ELAN_HOME ?? join(homedir(), ".elan");
  const direct = join(elanHome, "toolchains", toolchainDir, "bin", exe);
  return existsSync(direct) ? direct : command;
}

function findExecutableOnPath(command: string): string | undefined {
  const pathValue = process.env.PATH ?? "";
  const extensions = process.platform === "win32" ? (process.env.PATHEXT ?? ".EXE;.CMD;.BAT;.COM").split(";") : [""];
  for (const dir of pathValue.split(delimiter).filter(Boolean)) {
    for (const extension of extensions) {
      const candidate = join(dir, process.platform === "win32" && extension && !command.toLowerCase().endsWith(extension.toLowerCase()) ? `${command}${extension}` : command);
      if (existsSync(candidate)) {
        return candidate;
      }
    }
  }
  return undefined;
}

function serviceToolBinary(command: "lean" | "lake", leanToolchain: string): string | undefined {
  const direct = directElanTool(command, leanToolchain);
  if (direct !== command && existsSync(direct)) {
    return direct;
  }
  return findExecutableOnPath(command);
}

function runCommand(
  command: string,
  args: string[],
  cwd: string,
  leanToolchain: string
): { exit_code: number; stdout: string; stderr: string } {
  const result = spawnSync(directElanTool(command, leanToolchain), args, { cwd, encoding: "utf8", timeout: 30_000 });
  return {
    exit_code: result.status ?? 1,
    stdout: result.stdout ?? "",
    stderr: result.stderr ?? (result.error ? String(result.error) : "")
  };
}

function runVersionCommand(command: string, args: string[], cwd: string, leanToolchain: string): string {
  const result = spawnSync(directElanTool(command, leanToolchain), args, { cwd, encoding: "utf8", timeout: 30_000 });
  const output = `${result.stdout ?? ""}\n${result.stderr ?? (result.error ? String(result.error) : "")}`;
  if ((result.status ?? 1) !== 0 && !output.trim()) {
    throw new Error(`${command}_version_missing`);
  }
  return output;
}

function write(path: string, content: string): void {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, content, "utf8");
}

function containsSymlink(root: string): boolean {
  if (existsSync(root) && lstatSync(root).isSymbolicLink()) {
    return true;
  }
  const visit = (dir: string): boolean => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const path = join(dir, entry.name);
      if (entry.isSymbolicLink()) {
        return true;
      }
      if (entry.isDirectory() && visit(path)) {
        return true;
      }
    }
    return false;
  };
  return existsSync(root) && visit(root);
}

function copyMaterializedMathlibPackage(sourceLeanRoot: string, cleanRoot: string): void {
  const sourceMathlibPackage = join(sourceLeanRoot, ".lake", "packages", "mathlib");
  if (!existsSync(sourceMathlibPackage)) {
    return;
  }
  if (containsSymlink(sourceMathlibPackage)) {
    return;
  }
  const targetMathlibPackage = join(cleanRoot, ".lake", "packages", "mathlib");
  mkdirSync(dirname(targetMathlibPackage), { recursive: true });
  cpSync(sourceMathlibPackage, targetMathlibPackage, { recursive: true });
}

function externalRevisionsFromDependencyClosure(packages: DependencyClosureV2Package[]): Record<string, unknown>[] {
  return packages
    .map((pkg) => ({
      name: pkg.name,
      revision: pkg.revision ?? null,
      url: pkg.url ?? null,
      license: pkg.license,
      source: pkg.source,
      trusted: pkg.trusted,
      build_status: pkg.build_status,
      ...(pkg.materialized_package_root ? { materialized_package_root: pkg.materialized_package_root } : {}),
      ...(pkg.materialized_package_hash ? { materialized_package_hash: pkg.materialized_package_hash } : {}),
      ...(pkg.materialized_file_hashes ? { materialized_file_hashes: pkg.materialized_file_hashes } : {}),
      ...(pkg.materialized_symlinks ? { materialized_symlinks: pkg.materialized_symlinks } : {})
    }))
    .sort((left, right) => String(left.name).localeCompare(String(right.name)));
}

export function runCleanLeanReplay(input: {
  projectRoot: string;
  project_id?: string;
  actor?: string;
  campaign_id: string;
  claim_id: string;
  leanProject: LeanProjectFiles;
  provisioningDiagnosticPath?: string;
}): CleanReplayResult {
  const evidenceRootRel = join(".comath", "evidence", input.claim_id, "lean");
  const evidenceRoot = assertPathAllowed(input.projectRoot, evidenceRootRel, { purpose: "runtime-write" });
  mkdirSync(evidenceRoot, { recursive: true });

  const replayBaseRel = join(".comath", "lean", "final_replay");
  const replayBase = assertPathAllowed(input.projectRoot, replayBaseRel, { purpose: "runtime-write" });
  mkdirSync(replayBase, { recursive: true });
  const existingReplayDirs = readdirSync(replayBase, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && /^RPLY-\d{4,}$/.test(entry.name))
    .map((entry) => entry.name);
  const replay_id = nextSequentialId("RPLY", existingReplayDirs);
  const replayRootRel = join(replayBaseRel, replay_id);
  const replayRoot = assertPathAllowed(input.projectRoot, replayRootRel, { purpose: "runtime-write" });
  const cleanRoot = join(replayRoot, "clean");
  if (existsSync(replayRoot)) {
    throw new Error("final_replay_registry_append_only_violation");
  }
  mkdirSync(cleanRoot, { recursive: true });

  copyFileSync(input.leanProject.toolchainFile, join(cleanRoot, "lean-toolchain"));
  copyFileSync(input.leanProject.lakefile, join(cleanRoot, "lakefile.lean"));
  const sourceLakeManifest = join(dirname(input.leanProject.lakefile), "lake-manifest.json");
  if (existsSync(sourceLakeManifest)) {
    copyFileSync(sourceLakeManifest, join(cleanRoot, "lake-manifest.json"));
  } else {
    write(join(cleanRoot, "lake-manifest.json"), `${JSON.stringify({ packages: [] }, null, 2)}\n`);
  }
  copyMaterializedMathlibPackage(input.leanProject.leanRoot, cleanRoot);
  cpSync(join(input.leanProject.leanRoot, "MathResearch"), join(cleanRoot, "MathResearch"), { recursive: true });
  cpSync(join(input.leanProject.leanRoot, "Audit"), join(cleanRoot, "Audit"), { recursive: true });
  cpSync(join(input.leanProject.leanRoot, "FormalSpec"), join(cleanRoot, "FormalSpec"), { recursive: true });

  const staticAuditPathRel = join(evidenceRootRel, "final_static_audit.json");
  const dependencyPathRel = join(evidenceRootRel, "dependency_closure.json");
  const statementPathRel = join(evidenceRootRel, "statement_equivalence.json");
  const axiomPathRel = join(evidenceRootRel, "axiom_profile.json");
  const stdoutPathRel = join(evidenceRootRel, "final_replay.log");
  const stderrPathRel = join(evidenceRootRel, "final_replay.stderr.log");
  const manifestPathRel = join(evidenceRootRel, "final_replay_manifest.json");
  const manifestV3PathRel = join(evidenceRootRel, "final_replay_manifest_v3.json");
  const leanToolchain = readFileSync(input.leanProject.toolchainFile, "utf8").trim();
  const leanBinaryFile = serviceToolBinary("lean", leanToolchain);
  const lakeBinaryFile = serviceToolBinary("lake", leanToolchain);

  const static_audit = runStaticCheatScan({
    projectRoot: input.projectRoot,
    leanRoot: cleanRoot,
    reportPath: staticAuditPathRel
  });
  const dependency_closure = checkDependencyClosureV2({
    projectRoot: input.projectRoot,
    leanRoot: cleanRoot,
    toolchainFile: join(cleanRoot, "lean-toolchain"),
    lakefile: join(cleanRoot, "lakefile.lean"),
    lakeManifestFile: join(cleanRoot, "lake-manifest.json"),
    reportPath: dependencyPathRel,
    allowedImportPrefixes: finalReplayAllowedImportPrefixes,
    trustedExternalDependencies: finalReplayTrustedExternalDependencies
  });

  const leanVersionOutput = runVersionCommand("lean", ["--version"], cleanRoot, leanToolchain);
  const lakeVersionOutput = runVersionCommand("lake", ["--version"], cleanRoot, leanToolchain);
  const cleanInputs = [
    join(cleanRoot, "lean-toolchain"),
    join(cleanRoot, "lakefile.lean"),
    join(cleanRoot, "lake-manifest.json"),
    join(cleanRoot, input.leanProject.theoremFileRel),
    join(cleanRoot, input.leanProject.auditFileRel),
    join(cleanRoot, "FormalSpec", "formal_spec_lock.json"),
    join(cleanRoot, "FormalSpec", "assumption_ledger.json"),
    join(cleanRoot, "FormalSpec", "target.json")
  ].filter((path) => existsSync(path));
  const source_hashes_before = Object.fromEntries(
    [
      join(cleanRoot, "lean-toolchain"),
      join(cleanRoot, "lakefile.lean"),
      join(cleanRoot, "lake-manifest.json"),
      join(cleanRoot, input.leanProject.theoremFileRel),
      join(cleanRoot, input.leanProject.auditFileRel),
      join(cleanRoot, "FormalSpec", "formal_spec_lock.json"),
      join(cleanRoot, "FormalSpec", "assumption_ledger.json"),
      join(cleanRoot, "FormalSpec", "target.json")
    ]
      .filter((path) => existsSync(path))
      .map((path) => [relative(cleanRoot, path).replace(/\\/g, "/"), sha256FileSync(path)])
  );

  const theoremCheck = runServiceOwnedLeanCommandV3({
    projectRoot: input.projectRoot,
    run_id: "LRUN-0001",
    claim_id: input.claim_id,
    campaign_id: input.campaign_id,
    purpose: "check",
    command: ["lake", "env", "lean", input.leanProject.theoremFileRel],
    cwd: cleanRoot,
    input_files: cleanInputs,
    leanVersionOutput,
    lakeVersionOutput,
    leanToolchain,
    lean_binary_file: leanBinaryFile,
    lake_binary_file: lakeBinaryFile,
    network_policy: "disabled",
    sandbox: "none",
    proof_authority: "lean_kernel_check",
    run: (command) => runCommand(command[0], command.slice(1), cleanRoot, leanToolchain)
  });
  const finalReplayCommand = ["lake", "build", ...input.leanProject.buildTargets];
  const build = runServiceOwnedLeanCommandV3({
    projectRoot: input.projectRoot,
    run_id: "LRUN-0002",
    claim_id: input.claim_id,
    campaign_id: input.campaign_id,
    purpose: "final_replay",
    command: finalReplayCommand,
    cwd: cleanRoot,
    input_files: cleanInputs,
    leanVersionOutput,
    lakeVersionOutput,
    leanToolchain,
    lean_binary_file: leanBinaryFile,
    lake_binary_file: lakeBinaryFile,
    network_policy: "disabled",
    sandbox: "none",
    proof_authority: "lean_kernel_check",
    run: (command) => runCommand(command[0], command.slice(1), cleanRoot, leanToolchain)
  });
  const audit = runServiceOwnedLeanCommandV3({
    projectRoot: input.projectRoot,
    run_id: "LRUN-0003",
    claim_id: input.claim_id,
    campaign_id: input.campaign_id,
    purpose: "audit",
    command: ["lake", "env", "lean", input.leanProject.auditFileRel],
    cwd: cleanRoot,
    input_files: cleanInputs,
    leanVersionOutput,
    lakeVersionOutput,
    leanToolchain,
    lean_binary_file: leanBinaryFile,
    lake_binary_file: lakeBinaryFile,
    network_policy: "disabled",
    sandbox: "none",
    proof_authority: "lean_kernel_check",
    run: (command) => runCommand(command[0], command.slice(1), cleanRoot, leanToolchain)
  });
  const stdout = [theoremCheck.stdout, build.stdout, audit.stdout].filter(Boolean).join("\n");
  const stderr = [theoremCheck.stderr, build.stderr, audit.stderr].filter(Boolean).join("\n");

  const statement_equivalence = checkStatementEquivalence({
    projectRoot: input.projectRoot,
    reportPath: statementPathRel,
    locked_statement_hash: input.leanProject.formalSpec.locked_statement_hash,
    formal_spec_statement: input.leanProject.formalSpec.normalized_statement,
    lean_check_output: stdout,
    theorem_name: input.leanProject.theoremName
  });
  const axiom_profile = checkAxiomProfile({
    projectRoot: input.projectRoot,
    reportPath: axiomPathRel,
    theorem_name: input.leanProject.theoremName,
    raw_output: stdout
  });

  write(assertPathAllowed(input.projectRoot, stdoutPathRel, { purpose: "runtime-write" }), stdout);
  write(assertPathAllowed(input.projectRoot, stderrPathRel, { purpose: "runtime-write" }), stderr);
  const artifact_hashes = {
    stdout: sha256FileSync(assertPathAllowed(input.projectRoot, stdoutPathRel, { purpose: "read", resolveRealpath: true })),
    stderr: sha256FileSync(assertPathAllowed(input.projectRoot, stderrPathRel, { purpose: "read", resolveRealpath: true })),
    static_audit: sha256FileSync(assertPathAllowed(input.projectRoot, staticAuditPathRel, { purpose: "read", resolveRealpath: true })),
    axiom_profile: sha256FileSync(assertPathAllowed(input.projectRoot, axiomPathRel, { purpose: "read", resolveRealpath: true })),
    dependency_closure: sha256FileSync(assertPathAllowed(input.projectRoot, dependencyPathRel, { purpose: "read", resolveRealpath: true })),
    statement_equivalence: sha256FileSync(assertPathAllowed(input.projectRoot, statementPathRel, { purpose: "read", resolveRealpath: true }))
  };

  const exit_code =
    theoremCheck.manifest.exit_code === 0 && build.manifest.exit_code === 0 && audit.manifest.exit_code === 0
      ? 0
      : theoremCheck.manifest.exit_code || build.manifest.exit_code || audit.manifest.exit_code;
  const allGatesPassed =
    exit_code === 0 &&
    static_audit.result === "pass" &&
    dependency_closure.result === "pass" &&
    statement_equivalence.result === "pass" &&
    axiom_profile.result === "pass";

  const final_replay = finalLeanReplaySchema.parse({
    replay_id,
    campaign_id: input.campaign_id,
    claim_id: input.claim_id,
    theorem_name: input.leanProject.theoremName,
    theorem_family: input.leanProject.theoremFamilyId,
    canonical_proposition: input.leanProject.canonicalProposition,
    normalized_statement: input.leanProject.formalSpec.normalized_statement,
    primary_dependency: input.leanProject.primaryDependency,
    locked_statement_hash: input.leanProject.formalSpec.locked_statement_hash,
    clean_workspace_path: relative(input.projectRoot, cleanRoot).replace(/\\/g, "/"),
    lean_toolchain: leanToolchain,
    lakefile_hash: sha256FileSync(input.leanProject.lakefile).sha256,
    local_file_hashes: hashLeanProjectFiles(input.leanProject.leanRoot),
    command: input.leanProject.replayCommand,
    exit_code,
    stdout_path: stdoutPathRel.replace(/\\/g, "/"),
    stderr_path: stderrPathRel.replace(/\\/g, "/"),
    static_audit_path: staticAuditPathRel.replace(/\\/g, "/"),
    axiom_profile_path: axiomPathRel.replace(/\\/g, "/"),
    dependency_closure_path: dependencyPathRel.replace(/\\/g, "/"),
    statement_equivalence_path: statementPathRel.replace(/\\/g, "/"),
    ...(input.provisioningDiagnosticPath ? { provisioning_diagnostic_path: input.provisioningDiagnosticPath } : {}),
    artifact_hashes,
    result: allGatesPassed ? "pass" : "fail"
  });

  write(assertPathAllowed(input.projectRoot, manifestPathRel, { purpose: "runtime-write" }), `${JSON.stringify(final_replay, null, 2)}\n`);
  if (existsSync(join(cleanRoot, "lake-manifest.json"))) {
    const leanRunManifestPaths = ["LRUN-0001", "LRUN-0002", "LRUN-0003"].map((runId) =>
      join(evidenceRootRel, `${runId}.manifest.json`).replace(/\\/g, "/")
    );
    const binary_hashes: Record<string, string> = {};
    if (leanBinaryFile) {
      binary_hashes.lean = sha256FileSync(leanBinaryFile).sha256;
    }
    if (lakeBinaryFile) {
      binary_hashes.lake = sha256FileSync(lakeBinaryFile).sha256;
    }
    const final_replay_v3 = createFinalReplayManifestV3({
      projectRoot: input.projectRoot,
      replay_id,
      campaign_id: input.campaign_id,
      claim_id: input.claim_id,
      theorem_name: input.leanProject.theoremName,
      clean_workspace_path: cleanRoot,
      command: finalReplayCommand,
      exit_code,
      result: allGatesPassed ? "pass" : "fail",
      source_hashes_before,
      stdout_path: stdoutPathRel,
      stderr_path: stderrPathRel,
      report_paths: {
        static_audit: staticAuditPathRel,
        axiom_profile: axiomPathRel,
        dependency_closure: dependencyPathRel,
        statement_equivalence: statementPathRel
      },
      lean_run_manifest_paths: leanRunManifestPaths,
      dependency_lock: {
        lean_toolchain_path: join(cleanRoot, "lean-toolchain"),
        lake_manifest_path: join(cleanRoot, "lake-manifest.json"),
        lakefile_path: join(cleanRoot, "lakefile.lean"),
        external_revisions: externalRevisionsFromDependencyClosure(dependency_closure.packages)
      },
      network_policy: "disabled",
      sandbox_policy: {
        network: "disabled",
        os_isolation: "process_boundary_only"
      },
      resource_budget: {
        timeout_ms: 30000,
        max_stdout_bytes: 65536,
        max_stderr_bytes: 65536
      },
      binary_hashes
    });
    write(
      assertPathAllowed(input.projectRoot, manifestV3PathRel, { purpose: "runtime-write" }),
      `${JSON.stringify(final_replay_v3, null, 2)}\n`
    );
    appendFinalReplayRegistryEntryV3(input.projectRoot, final_replay_v3, input.project_id && input.actor ? {
      project_id: input.project_id,
      actor: input.actor,
      source: "clean_replay"
    } : undefined);
    const replayPack = writeThirdPartyReplayPackV3(input.projectRoot, final_replay_v3);
    return {
      final_replay,
      static_audit,
      axiom_profile,
      dependency_closure,
      statement_equivalence,
      lean_run_manifest_paths: leanRunManifestPaths,
      final_replay_manifest_v3_path: manifestV3PathRel.replace(/\\/g, "/"),
      third_party_replay_pack_path: replayPack.pack_path
    };
  }
  return {
    final_replay,
    static_audit,
    axiom_profile,
    dependency_closure,
    statement_equivalence,
    lean_run_manifest_paths: []
  };
}
