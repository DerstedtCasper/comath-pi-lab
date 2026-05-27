import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { checkAxiomProfile, runStaticCheatScan } from "../../dist/index.js";

const projectRoot = mkdtempSync(join(tmpdir(), "comath-lean-trust-profile-"));

function writeProjectFile(relativePath, content) {
  const path = join(projectRoot, relativePath);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, content, "utf8");
  return path;
}

try {
  const classicalDisallowed = checkAxiomProfile({
    projectRoot,
    reportPath: join(".comath", "evidence", "C-0001", "lean", "axiom_profile_constructive.json"),
    theorem_name: "MathResearch.C0001",
    raw_output: "MathResearch.C0001 depends on axioms: [propext, Classical.choice]",
    trust_profile: {
      profile_id: "constructive",
      allowed_axioms: ["propext"],
      require_print_axioms: true
    }
  });

  assert.equal(classicalDisallowed.result, "fail");
  assert.equal(classicalDisallowed.trust_profile.profile_id, "constructive");
  assert.deepEqual(classicalDisallowed.detected_axioms.sort(), ["Classical.choice", "propext"].sort());
  assert.equal(classicalDisallowed.hard_vetoes.includes("unauthorized_axiom:Classical.choice"), true);

  const classicalAllowed = checkAxiomProfile({
    projectRoot,
    reportPath: join(".comath", "evidence", "C-0001", "lean", "axiom_profile_classical.json"),
    theorem_name: "MathResearch.C0001",
    raw_output: "MathResearch.C0001 depends on axioms: [propext, Classical.choice]",
    trust_profile: {
      profile_id: "ordinary_classical",
      allowed_axioms: ["propext", "Classical.choice"],
      require_print_axioms: true
    }
  });

  assert.equal(classicalAllowed.result, "pass");
  assert.equal(classicalAllowed.hard_vetoes.length, 0);

  const missingAxiomReport = checkAxiomProfile({
    projectRoot,
    reportPath: join(".comath", "evidence", "C-0001", "lean", "axiom_profile_missing_report.json"),
    theorem_name: "MathResearch.C0001",
    raw_output: "#check MathResearch.C0001\nMathResearch.C0001 : (n : Nat) : n + 0 = n\n",
    trust_profile: {
      profile_id: "ordinary_classical",
      allowed_axioms: ["propext", "Classical.choice"],
      require_print_axioms: true
    }
  });

  assert.equal(missingAxiomReport.result, "fail");
  assert.equal(missingAxiomReport.hard_vetoes.includes("missing_target_axiom_report"), true);

  const leanRoot = join(projectRoot, ".comath", "lean-profile-scan");
  writeProjectFile(
    join(".comath", "lean-profile-scan", "Skeleton.lean"),
    "namespace MathResearch\n\ntheorem planned (n : Nat) : n + 0 = n := by sorry\n\nend MathResearch\n"
  );
  writeProjectFile(
    join(".comath", "lean-profile-scan", "Final.lean"),
    "namespace MathResearch\n\ntheorem final_bad (n : Nat) : n + 0 = n := by sorry\n\nend MathResearch\n"
  );

  const scan = runStaticCheatScan({
    projectRoot,
    leanRoot,
    skeletonAllowlist: ["Skeleton.lean"],
    reportPath: join(".comath", "evidence", "C-0001", "lean", "skeleton_aware_static_audit.json")
  });

  assert.equal(scan.result, "fail");
  assert.deepEqual(scan.findings.map((finding) => finding.file), ["Final.lean"]);
  assert.equal(scan.hard_vetoes.includes("sorry_detected"), true);
  assert.equal(scan.warnings.includes("skeleton_sorry_allowed:Skeleton.lean:3"), true);
} finally {
  rmSync(projectRoot, { recursive: true, force: true });
}

console.log("Phase 31 Lean trust profile tests passed.");
