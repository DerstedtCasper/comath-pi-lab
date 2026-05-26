import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { spawnSync } from "node:child_process";
import { assertPathAllowed } from "../../security/path-policy.js";

export type LeanFormalSpec = {
  claim_id: string;
  theorem_name: string;
  namespace: string;
  normalized_statement: string;
  locked_statement_hash: string;
};

export type LeanProjectFiles = {
  projectRoot: string;
  leanRoot: string;
  theoremFile: string;
  formalSpecFile: string;
  auditFile: string;
  lakefile: string;
  toolchainFile: string;
  theoremName: string;
  formalSpec: LeanFormalSpec;
};

export function sha256Buffer(data: Buffer | string): string {
  return createHash("sha256").update(data).digest("hex");
}

export function sha256FileSync(path: string): { sha256: string; size_bytes: number } {
  const data = readFileSync(path);
  return {
    sha256: sha256Buffer(data),
    size_bytes: statSync(path).size
  };
}

export function currentLeanToolchain(): string {
  const result = spawnSync("lean", ["--version"], { encoding: "utf8" });
  const match = /version\s+([0-9]+\.[0-9]+\.[0-9]+)/i.exec(`${result.stdout}\n${result.stderr}`);
  return `leanprover/lean4:v${match?.[1] ?? "4.27.0"}`;
}

function writeUtf8(path: string, content: string): void {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, content, "utf8");
}

export function createNatAddZeroLeanProject(input: {
  projectRoot: string;
  claim_id: string;
  locked_statement_hash: string;
}): LeanProjectFiles {
  const leanRoot = assertPathAllowed(input.projectRoot, join(".comath", "lean"), { purpose: "runtime-write" });
  const theoremFile = assertPathAllowed(input.projectRoot, join(".comath", "lean", "MathResearch", "C0001.lean"), {
    purpose: "runtime-write"
  });
  const formalSpecFile = assertPathAllowed(input.projectRoot, join(".comath", "lean", "FormalSpec", "C0001.json"), {
    purpose: "runtime-write"
  });
  const auditFile = assertPathAllowed(input.projectRoot, join(".comath", "lean", "Audit", "C0001.lean"), {
    purpose: "runtime-write"
  });
  const lakefile = assertPathAllowed(input.projectRoot, join(".comath", "lean", "lakefile.lean"), {
    purpose: "runtime-write"
  });
  const toolchainFile = assertPathAllowed(input.projectRoot, join(".comath", "lean", "lean-toolchain"), {
    purpose: "runtime-write"
  });
  const theoremName = "MathResearch.C0001";
  const formalSpec: LeanFormalSpec = {
    claim_id: input.claim_id,
    theorem_name: theoremName,
    namespace: "MathResearch",
    normalized_statement: "MathResearch.C0001 (n : Nat) : n + 0 = n",
    locked_statement_hash: input.locked_statement_hash
  };

  writeUtf8(toolchainFile, `${currentLeanToolchain()}\n`);
  writeUtf8(
    lakefile,
    [
      "import Lake",
      "open Lake DSL",
      "",
      "package MathResearch where",
      "",
      "lean_lib MathResearch where",
      "",
      "lean_lib Audit where",
      ""
    ].join("\n")
  );
  writeUtf8(
    theoremFile,
    [
      "namespace MathResearch",
      "",
      "theorem C0001 (n : Nat) : n + 0 = n := Nat.add_zero n",
      "",
      "#check C0001",
      "#print axioms C0001",
      "",
      "end MathResearch",
      ""
    ].join("\n")
  );
  writeUtf8(
    auditFile,
    ["import MathResearch.C0001", "", "#check MathResearch.C0001", "#print axioms MathResearch.C0001", ""].join("\n")
  );
  writeUtf8(formalSpecFile, `${JSON.stringify(formalSpec, null, 2)}\n`);

  return {
    projectRoot: input.projectRoot,
    leanRoot,
    theoremFile,
    formalSpecFile,
    auditFile,
    lakefile,
    toolchainFile,
    theoremName,
    formalSpec
  };
}

export function listLeanProjectFiles(leanRoot: string): string[] {
  const files: string[] = [];
  const visit = (dir: string) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const path = join(dir, entry.name);
      if (entry.isDirectory()) {
        if (entry.name === ".lake" || entry.name === "final_replay") {
          continue;
        }
        visit(path);
      } else if (entry.isFile()) {
        files.push(path);
      }
    }
  };
  if (existsSync(leanRoot)) {
    visit(leanRoot);
  }
  return files.sort();
}

export function hashLeanProjectFiles(leanRoot: string): Record<string, string> {
  const hashes: Record<string, string> = {};
  for (const file of listLeanProjectFiles(leanRoot)) {
    hashes[relative(leanRoot, file).replace(/\\/g, "/")] = sha256FileSync(file).sha256;
  }
  return hashes;
}
