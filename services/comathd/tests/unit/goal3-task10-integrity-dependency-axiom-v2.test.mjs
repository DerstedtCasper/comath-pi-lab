import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import {
  checkAxiomProfileV2,
  checkDependencyClosureV2,
  runLeanIntegrityScannerV2,
  verifyAxiomProfileV2Evidence
} from "../../dist/index.js";

const projectRoot = mkdtempSync(join(tmpdir(), "comath-goal3-task10-"));

function writeProjectFile(relativePath, content) {
  const path = join(projectRoot, relativePath);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, content, "utf8");
  return path;
}

function readJson(relativePath) {
  return JSON.parse(readFileSync(join(projectRoot, relativePath), "utf8"));
}

try {
  const leanRoot = join(projectRoot, ".comath", "lean-v2");
  const toolchain = writeProjectFile(".comath/lean-v2/lean-toolchain", "leanprover/lean4:v4.23.0\n");
  const lakefile = writeProjectFile(".comath/lean-v2/lakefile.lean", "import Lake\nopen Lake DSL\npackage MathResearch\n");
  const lakeManifest = writeProjectFile(
    ".comath/lean-v2/lake-manifest.json",
    `${JSON.stringify(
      {
        packages: [
          {
            name: "mathlib",
            url: "https://github.com/leanprover-community/mathlib4.git",
            rev: "0123456789abcdef0123456789abcdef01234567",
            license: "Apache-2.0",
            inputRev: "0123456789abcdef0123456789abcdef01234567"
          }
        ]
      },
      null,
      2
    )}\n`
  );

  writeProjectFile(
    ".comath/lean-v2/MathResearch/Target.lean",
    [
      "import Mathlib.Data.Nat.Basic",
      "import Evil.Backdoor",
      "namespace MathResearch",
      "-- sorry admit axiom constant unsafe opaque inside comments must be ignored",
      "def quoted : String := \"sorry admit axiom constant unsafe opaque inside strings must be ignored\"",
      "theorem C0001 (n : Nat) : n + 0 = n := by",
      "  sorry",
      "axiom injected : False",
      "constant fakeTheorem : True",
      "unsafe def risky : Nat := 0",
      "opaque hidden : Nat := 1",
      "end MathResearch",
      "namespace Mathlib",
      "theorem namespace_shadow : True := by trivial",
      "end Mathlib"
    ].join("\n")
  );
  writeProjectFile(".comath/lean-v2/Mathlib/Data/Nat/Basic.lean", "namespace Mathlib\ndef shadow := 1\nend Mathlib\n");

  const dependency = checkDependencyClosureV2({
    projectRoot,
    leanRoot,
    toolchainFile: toolchain,
    lakefile,
    lakeManifestFile: lakeManifest,
    reportPath: join(".comath", "evidence", "CLM-0001", "lean", "dependency_closure_v2.json"),
    allowedImportPrefixes: ["Mathlib", "Std", "MathResearch"],
    trustedExternalDependencies: ["mathlib"]
  });

  assert.equal(dependency.schema_version, "comath.dependency_closure.v2");
  assert.equal(dependency.result, "fail");
  assert.equal(dependency.hard_vetoes.includes("untracked_import:Evil.Backdoor"), true);
  assert.equal(dependency.hard_vetoes.includes("local_module_shadowing:Mathlib.Data.Nat.Basic"), true);
  assert.equal(dependency.packages.some((pkg) => pkg.name === "mathlib" && pkg.revision === "0123456789abcdef0123456789abcdef01234567"), true);
  assert.equal(readJson(".comath/evidence/CLM-0001/lean/dependency_closure_v2.json").result, "fail");

  const integrity = runLeanIntegrityScannerV2({
    projectRoot,
    leanRoot,
    reportPath: join(".comath", "evidence", "CLM-0001", "lean", "lean_integrity_scan_v2.json"),
    targetTheorem: "MathResearch.C0001",
    allowedImportPrefixes: ["Mathlib", "Std", "MathResearch"],
    dependencyClosure: dependency,
    structuredAudit: null
  });

  assert.equal(integrity.schema_version, "comath.lean_integrity_scan.v2");
  assert.equal(integrity.result, "fail");
  assert.equal(integrity.hard_vetoes.includes("sorry_detected"), true);
  assert.equal(integrity.hard_vetoes.includes("admit_detected"), false);
  assert.equal(integrity.hard_vetoes.includes("axiom_detected"), true);
  assert.equal(integrity.hard_vetoes.includes("constant_detected"), true);
  assert.equal(integrity.hard_vetoes.includes("unsafe_detected"), true);
  assert.equal(integrity.hard_vetoes.includes("opaque_detected"), true);
  assert.equal(integrity.hard_vetoes.includes("import_pollution:Evil.Backdoor"), true);
  assert.equal(integrity.hard_vetoes.includes("local_module_shadowing:Mathlib.Data.Nat.Basic"), true);
  assert.equal(integrity.hard_vetoes.includes("namespace_shadowing:Mathlib"), true);
  assert.equal(integrity.hard_vetoes.includes("missing_structured_lean_audit"), true);
  assert.equal(integrity.target_binding.fully_qualified_name, "MathResearch.C0001");
  assert.match(integrity.environment_fingerprint, /^[a-f0-9]{64}$/);

  const structuredAudit = {
    schema_version: "comath.structured_lean_audit.v3",
    theorem_name: "C0001",
    fully_qualified_name: "MathResearch.C0001",
    theorem_type_pretty: "(n : Nat) : n + 0 = n",
    theorem_type_elaborated_hash: "a".repeat(64),
    source_file: "MathResearch/Target.lean",
    source_file_sha256: integrity.target_binding.source_hash,
    imports: ["Mathlib.Data.Nat.Basic"],
    axiom_profile: ["Classical.choice"],
    environment_fingerprint: integrity.environment_fingerprint,
    generated_by_run_id: "LRUN-0003",
    result: "pass",
    hard_vetoes: []
  };
  const axiomProfile = checkAxiomProfileV2({
    projectRoot,
    reportPath: join(".comath", "evidence", "CLM-0001", "lean", "axiom_profile_v2.json"),
    theoremName: "MathResearch.C0001",
    theoremTypeHash: structuredAudit.theorem_type_elaborated_hash,
    sourceFile: join(leanRoot, "MathResearch", "Target.lean"),
    environmentFingerprint: integrity.environment_fingerprint,
    leanRunManifestId: "LRUN-0003",
    structuredAudit,
    rawOutput: "MathResearch.C0001 does not depend on any axioms",
    trustProfile: {
      profile_id: "constructive_goal3_task10",
      allowed_axioms: ["propext"],
      require_print_axioms: true
    }
  });

  assert.equal(axiomProfile.schema_version, "comath.axiom_profile.v2");
  assert.equal(axiomProfile.result, "fail");
  assert.equal(axiomProfile.detected_axioms.includes("Classical.choice"), true);
  assert.equal(axiomProfile.hard_vetoes.includes("unauthorized_axiom:Classical.choice"), true);
  assert.equal(axiomProfile.hard_vetoes.includes("raw_stdout_axiom_spoof_mismatch"), true);
  assert.equal(axiomProfile.generated_by_run_id, "LRUN-0003");
  assert.match(axiomProfile.source_hash, /^[a-f0-9]{64}$/);

  const verified = verifyAxiomProfileV2Evidence({
    theoremName: "MathResearch.C0001",
    theoremTypeHash: structuredAudit.theorem_type_elaborated_hash,
    sourceHash: axiomProfile.source_hash,
    environmentFingerprint: integrity.environment_fingerprint,
    leanRunManifestId: "LRUN-0003",
    profile: axiomProfile
  });
  assert.equal(verified.ok, false);
  assert.equal(verified.vetoes.includes("unauthorized_axiom:Classical.choice"), true);

  const missingStructured = checkAxiomProfileV2({
    projectRoot,
    reportPath: join(".comath", "evidence", "CLM-0001", "lean", "axiom_profile_v2_missing.json"),
    theoremName: "MathResearch.C0001",
    theoremTypeHash: "b".repeat(64),
    sourceFile: join(leanRoot, "MathResearch", "Target.lean"),
    environmentFingerprint: integrity.environment_fingerprint,
    leanRunManifestId: "LRUN-0004",
    structuredAudit: null,
    rawOutput: "MathResearch.C0001 does not depend on any axioms"
  });

  assert.equal(missingStructured.result, "fail");
  assert.equal(missingStructured.hard_vetoes.includes("missing_structured_lean_audit"), true);
} finally {
  rmSync(projectRoot, { recursive: true, force: true });
}

console.log("Goal 3 Task 10 integrity/dependency/axiom v2 tests passed.");
