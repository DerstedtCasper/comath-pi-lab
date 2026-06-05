import assert from "node:assert/strict";
import { chmodSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { delimiter, dirname, join } from "node:path";
import { getComathdStatus, runCleanLeanReplay, statementHash } from "../../dist/index.js";

const projectRoot = mkdtempSync(join(tmpdir(), "comath-goal3-task215-final-replay-deps-v2-"));
const oldPath = process.env.PATH;
const theoremName = "MathResearch.Goal3Task215";
const claimId = "CLM-0215";
const campaignId = "CAM-0215";
const mathlibRev = "0123456789abcdef0123456789abcdef01234567";

function writeProjectFile(relativePath, text) {
  const absolute = join(projectRoot, relativePath);
  mkdirSync(dirname(absolute), { recursive: true });
  writeFileSync(absolute, text, "utf8");
  return absolute;
}

function writeJsonProjectFile(relativePath, value) {
  return writeProjectFile(relativePath, `${JSON.stringify(value, null, 2)}\n`);
}

function readJsonProjectFile(relativePath) {
  return JSON.parse(readFileSync(join(projectRoot, relativePath), "utf8"));
}

function installFakeLeanAndLake() {
  const bin = join(projectRoot, ".comath", "fake-bin-task215");
  mkdirSync(bin, { recursive: true });
  const lakeOutputLines = [
    `${theoremName} : True`,
    `${theoremName} does not depend on any axioms`
  ];
  writeFileSync(
    join(bin, "lean.cmd"),
    "@echo off\r\necho Lean (version 4.23.0, x86_64-pc-windows-msvc, commit task215)\r\nexit /b 0\r\n",
    "utf8"
  );
  writeFileSync(
    join(bin, "lake.cmd"),
    [
      "@echo off",
      "if \"%1\"==\"--version\" (",
      "  echo Lake version 5.0.0",
      "  exit /b 0",
      ")",
      ...lakeOutputLines.map((line) => `echo ${line}`),
      "exit /b 0",
      ""
    ].join("\r\n"),
    "utf8"
  );
  const leanSh = join(bin, "lean");
  const lakeSh = join(bin, "lake");
  writeFileSync(leanSh, "#!/bin/sh\necho 'Lean (version 4.23.0, x86_64-unknown-linux-gnu, commit task215)'\n", "utf8");
  writeFileSync(
    lakeSh,
    [
      "#!/bin/sh",
      "if [ \"$1\" = \"--version\" ]; then",
      "  echo 'Lake version 5.0.0'",
      "  exit 0",
      "fi",
      ...lakeOutputLines.map((line) => `echo '${line}'`),
      ""
    ].join("\n"),
    "utf8"
  );
  chmodSync(leanSh, 0o755);
  chmodSync(lakeSh, 0o755);
  process.env.PATH = `${bin}${delimiter}${process.env.PATH ?? ""}`;
}

try {
  installFakeLeanAndLake();

  const normalizedStatement = `${theoremName} : True`;
  const lockedStatementHash = statementHash(normalizedStatement);
  const leanRootRel = ".comath/lean/task215-final-replay-deps-v2";
  const theoremFile = writeProjectFile(
    `${leanRootRel}/MathResearch/Target.lean`,
    [
      "import Evil.Backdoor",
      "import MathResearch.Missing",
      "",
      "namespace MathResearch",
      "",
      "theorem Goal3Task215 : True := by",
      "  trivial",
      "",
      "#check Goal3Task215",
      "#print axioms Goal3Task215",
      "",
      "end MathResearch",
      ""
    ].join("\n")
  );
  const auditFile = writeProjectFile(
    `${leanRootRel}/Audit/TargetAudit.lean`,
    "import MathResearch.Target\n#check MathResearch.Goal3Task215\n#print axioms MathResearch.Goal3Task215\n"
  );
  writeJsonProjectFile(`${leanRootRel}/FormalSpec/formal_spec_lock.json`, {
    schema_version: "comath.formal_spec_lock.v2",
    binding_scope: "campaign",
    campaign_id: campaignId,
    claim_id: claimId,
    namespace: "MathResearch",
    theorem_name: "Goal3Task215",
    theorem_header: "theorem Goal3Task215 : True",
    statement_hash: lockedStatementHash,
    proof_authority: "none"
  });
  writeJsonProjectFile(`${leanRootRel}/FormalSpec/assumption_ledger.json`, {
    schema_version: "comath.assumption_ledger.v1",
    binding_scope: "campaign",
    campaign_id: campaignId,
    claim_id: claimId,
    formal_spec_lock_hash: lockedStatementHash,
    entries: [],
    proof_authority: "none"
  });
  writeJsonProjectFile(`${leanRootRel}/FormalSpec/target.json`, {
    schema_version: "comath.formal_target.v1",
    claim_id: claimId,
    theorem_name: theoremName,
    normalized_statement: normalizedStatement,
    locked_statement_hash: lockedStatementHash
  });
  const lakefile = writeProjectFile(
    `${leanRootRel}/lakefile.lean`,
    [
      "import Lake",
      "open Lake DSL",
      "package MathResearch where",
      `require mathlib from git "https://github.com/leanprover-community/mathlib4" @ "${mathlibRev}"`,
      "lean_lib MathResearch where",
      "  roots := #[`MathResearch.Target]",
      ""
    ].join("\n")
  );
  const toolchainFile = writeProjectFile(`${leanRootRel}/lean-toolchain`, "leanprover/lean4:v4.23.0\n");
  writeJsonProjectFile(`${leanRootRel}/lake-manifest.json`, {
    version: 7,
    packages: [
      {
        name: "mathlib",
        url: "https://github.com/leanprover-community/mathlib4",
        rev: mathlibRev,
        license: "Apache-2.0"
      }
    ]
  });

  const result = runCleanLeanReplay({
    projectRoot,
    project_id: "PRJ-0215",
    actor: "goal3-task215",
    campaign_id: campaignId,
    claim_id: claimId,
    leanProject: {
      projectRoot,
      leanRoot: join(projectRoot, leanRootRel),
      theoremFile,
      theoremFileRel: "MathResearch/Target.lean",
      formalSpecFile: join(projectRoot, leanRootRel, "FormalSpec", "formal_spec_lock.json"),
      auditFile,
      auditFileRel: "Audit/TargetAudit.lean",
      lakefile,
      toolchainFile,
      theoremName,
      theoremFamilyId: campaignId,
      canonicalProposition: "True",
      buildTargets: ["MathResearch"],
      replayCommand: "lake build MathResearch",
      primaryDependency: "Mathlib",
      formalSpec: {
        claim_id: claimId,
        theorem_name: "Goal3Task215",
        namespace: "MathResearch",
        normalized_statement: normalizedStatement,
        locked_statement_hash: lockedStatementHash
      }
    }
  });

  assert.equal(result.final_replay.result, "fail");
  assert.equal(result.dependency_closure.schema_version, "comath.dependency_closure.v2");
  assert.equal(result.dependency_closure.result, "fail");
  assert.equal(result.dependency_closure.hard_vetoes.includes("untracked_import:Evil.Backdoor"), true);
  assert.equal(result.dependency_closure.hard_vetoes.includes("untracked_import:MathResearch.Missing"), true);

  const dependencyClosure = readJsonProjectFile(result.final_replay.dependency_closure_path);
  assert.equal(dependencyClosure.schema_version, "comath.dependency_closure.v2");
  assert.equal(dependencyClosure.hard_vetoes.includes("untracked_import:Evil.Backdoor"), true);
  assert.equal(dependencyClosure.hard_vetoes.includes("untracked_import:MathResearch.Missing"), true);
  assert.equal(dependencyClosure.packages.some((pkg) => pkg.name === "mathlib" && pkg.revision === mathlibRev), true);

  assert.equal(typeof result.final_replay_manifest_v3_path, "string");
  const finalReplayManifest = readJsonProjectFile(result.final_replay_manifest_v3_path);
  assert.equal(finalReplayManifest.result, "fail");
  assert.equal(finalReplayManifest.report_paths.dependency_closure, result.final_replay.dependency_closure_path);
  assert.equal(
    finalReplayManifest.dependency_lock.external_revisions.some(
      (revision) => revision.name === "mathlib" && revision.revision === mathlibRev && revision.trusted === true
    ),
    true
  );
  assert.equal(
    getComathdStatus().capabilities.includes("final_replay_dependency_closure_v2_binding"),
    true
  );
} finally {
  process.env.PATH = oldPath;
  rmSync(projectRoot, { recursive: true, force: true });
}

console.log("Goal 3 Task215 final replay DependencyClosureV2 binding tests passed.");
