import { copyFileSync, cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join, relative } from "node:path";
import { spawnSync } from "node:child_process";
import { assertPathAllowed } from "../../security/path-policy.js";
import { finalLeanReplaySchema, type FinalLeanReplay } from "../../types/schemas.js";
import { nextSequentialId } from "../../utils/id.js";
import { checkAxiomProfile } from "./axiom-profile.js";
import { checkDependencyClosure } from "./dependency-closure.js";
import { hashLeanProjectFiles, sha256FileSync, type LeanProjectFiles } from "./lean-project.js";
import { checkStatementEquivalence } from "./statement-equivalence.js";
import { runStaticCheatScan } from "./static-cheat-scan.js";

export type CleanReplayResult = {
  final_replay: FinalLeanReplay;
  static_audit: ReturnType<typeof runStaticCheatScan>;
  axiom_profile: ReturnType<typeof checkAxiomProfile>;
  dependency_closure: ReturnType<typeof checkDependencyClosure>;
  statement_equivalence: ReturnType<typeof checkStatementEquivalence>;
};

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

function write(path: string, content: string): void {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, content, "utf8");
}

export function runCleanLeanReplay(input: {
  projectRoot: string;
  campaign_id: string;
  claim_id: string;
  leanProject: LeanProjectFiles;
}): CleanReplayResult {
  const evidenceRootRel = join(".comath", "evidence", input.claim_id, "lean");
  const evidenceRoot = assertPathAllowed(input.projectRoot, evidenceRootRel, { purpose: "runtime-write" });
  mkdirSync(evidenceRoot, { recursive: true });

  const existingReplayDirs = existsSync(join(input.leanProject.leanRoot, "final_replay")) ? ["RPLY-0000"] : [];
  const replay_id = nextSequentialId("RPLY", existingReplayDirs);
  const replayRootRel = join(".comath", "lean", "final_replay", replay_id);
  const replayRoot = assertPathAllowed(input.projectRoot, replayRootRel, { purpose: "runtime-write" });
  const cleanRoot = join(replayRoot, "clean");
  rmSync(replayRoot, { recursive: true, force: true });
  mkdirSync(cleanRoot, { recursive: true });

  copyFileSync(input.leanProject.toolchainFile, join(cleanRoot, "lean-toolchain"));
  copyFileSync(input.leanProject.lakefile, join(cleanRoot, "lakefile.lean"));
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
  const leanToolchain = readFileSync(input.leanProject.toolchainFile, "utf8").trim();

  const static_audit = runStaticCheatScan({
    projectRoot: input.projectRoot,
    leanRoot: input.leanProject.leanRoot,
    reportPath: staticAuditPathRel
  });
  const dependency_closure = checkDependencyClosure({
    projectRoot: input.projectRoot,
    leanRoot: input.leanProject.leanRoot,
    toolchainFile: input.leanProject.toolchainFile,
    lakefile: input.leanProject.lakefile,
    reportPath: dependencyPathRel
  });

  const theoremCheck = runCommand("lake", ["env", "lean", input.leanProject.theoremFileRel], cleanRoot, leanToolchain);
  const build = runCommand("lake", ["build", ...input.leanProject.buildTargets], cleanRoot, leanToolchain);
  const audit = runCommand("lake", ["env", "lean", input.leanProject.auditFileRel], cleanRoot, leanToolchain);
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

  const exit_code =
    theoremCheck.exit_code === 0 && build.exit_code === 0 && audit.exit_code === 0 ? 0 : theoremCheck.exit_code || build.exit_code || audit.exit_code;
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
    result: allGatesPassed ? "pass" : "fail"
  });

  write(assertPathAllowed(input.projectRoot, manifestPathRel, { purpose: "runtime-write" }), `${JSON.stringify(final_replay, null, 2)}\n`);
  return {
    final_replay,
    static_audit,
    axiom_profile,
    dependency_closure,
    statement_equivalence
  };
}
