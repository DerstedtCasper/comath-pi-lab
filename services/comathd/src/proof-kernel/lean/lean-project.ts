import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { spawnSync } from "node:child_process";

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
  theoremFileRel: string;
  formalSpecFile: string;
  auditFile: string;
  auditFileRel: string;
  lakefile: string;
  toolchainFile: string;
  theoremName: string;
  theoremFamilyId: string;
  canonicalProposition: string;
  buildTargets: string[];
  replayCommand: string;
  primaryDependency: string;
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
