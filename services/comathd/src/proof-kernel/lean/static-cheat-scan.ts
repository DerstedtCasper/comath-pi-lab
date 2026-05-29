import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { assertPathAllowed } from "../../security/path-policy.js";
import { listLeanProjectFiles, sha256Buffer, sha256FileSync } from "./lean-project.js";
import type { DependencyClosureV2Report } from "./dependency-closure.js";

export type StaticCheatFinding = {
  file: string;
  line: number;
  token: string;
  severity: "error";
  message: string;
};

export type StaticCheatScanReport = {
  result: "pass" | "fail";
  findings: StaticCheatFinding[];
  hard_vetoes: string[];
  warnings: string[];
  scanned_files: string[];
};

export type LeanIntegrityScannerV2Finding = StaticCheatFinding & {
  declaration_kind?: string;
};

export type LeanIntegrityScannerV2Report = {
  schema_version: "comath.lean_integrity_scan.v2";
  result: "pass" | "fail";
  findings: LeanIntegrityScannerV2Finding[];
  hard_vetoes: string[];
  warnings: string[];
  scanned_files: string[];
  target_binding: {
    fully_qualified_name: string;
    source_file?: string;
    source_hash?: string;
    declaration_kind?: "theorem" | "lemma";
    found: boolean;
  };
  imports: Record<string, string[]>;
  environment_fingerprint: string;
};

const forbidden = [
  { token: "sorry", pattern: /\bsorry\b/ },
  { token: "admit", pattern: /\badmit\b/ },
  { token: "axiom", pattern: /\baxiom\b/ },
  { token: "constant", pattern: /\bconstant\b/ },
  { token: "unsafe", pattern: /\bunsafe\b/ },
  { token: "opaque", pattern: /\bopaque\b/ }
];

function stripLeanCommentsAndStrings(line: string, inBlockComment: boolean): { code: string; inBlockComment: boolean } {
  let code = "";
  let i = 0;
  let block = inBlockComment;
  while (i < line.length) {
    const next = line.slice(i, i + 2);
    if (block) {
      if (next === "-/") {
        block = false;
        i += 2;
      } else {
        i += 1;
      }
      continue;
    }
    if (next === "--") {
      break;
    }
    if (next === "/-") {
      block = true;
      i += 2;
      continue;
    }
    if (line[i] === '"') {
      code += " ";
      i += 1;
      while (i < line.length) {
        if (line[i] === "\\") {
          i += 2;
          continue;
        }
        if (line[i] === '"') {
          i += 1;
          break;
        }
        i += 1;
      }
      continue;
    }
    code += line[i];
    i += 1;
  }
  return { code, inBlockComment: block };
}

function scanLeanAwareLines(file: string, rel: string, skeletonAllowlist: Set<string>): { findings: LeanIntegrityScannerV2Finding[]; warnings: string[] } {
  const findings: LeanIntegrityScannerV2Finding[] = [];
  const warnings: string[] = [];
  let inBlockComment = false;
  readFileSync(file, "utf8")
    .split(/\r?\n/)
    .forEach((line, index) => {
      const stripped = stripLeanCommentsAndStrings(line, inBlockComment);
      inBlockComment = stripped.inBlockComment;
      for (const rule of forbidden) {
        if (rule.pattern.test(stripped.code)) {
          if (rule.token === "sorry" && skeletonAllowlist.has(rel)) {
            warnings.push(`skeleton_sorry_allowed:${rel}:${index + 1}`);
            continue;
          }
          findings.push({
            file: rel,
            line: index + 1,
            token: rule.token,
            severity: "error",
            message: `forbidden Lean declaration or escape hatch detected: ${rule.token}`,
            declaration_kind: rule.token
          });
        }
      }
    });
  return { findings, warnings };
}

function parseImports(file: string): string[] {
  let inBlockComment = false;
  const imports: string[] = [];
  for (const line of readFileSync(file, "utf8").split(/\r?\n/)) {
    const stripped = stripLeanCommentsAndStrings(line, inBlockComment);
    inBlockComment = stripped.inBlockComment;
    const match = /^\s*import\s+(.+)$/.exec(stripped.code.trim());
    if (match) {
      imports.push(...match[1].split(/\s+/).filter(Boolean));
    }
  }
  return imports;
}

function findTargetBinding(leanRoot: string, targetTheorem: string): LeanIntegrityScannerV2Report["target_binding"] {
  const shortName = targetTheorem.split(".").at(-1) ?? targetTheorem;
  const namespace = targetTheorem.split(".").slice(0, -1).join(".");
  for (const file of listLeanProjectFiles(leanRoot).filter((item) => item.endsWith(".lean"))) {
    const rel = relative(leanRoot, file).replace(/\\/g, "/");
    const text = readFileSync(file, "utf8");
    let activeNamespace = "";
    let inBlockComment = false;
    const lines = text.split(/\r?\n/);
    for (let index = 0; index < lines.length; index += 1) {
      const stripped = stripLeanCommentsAndStrings(lines[index], inBlockComment);
      inBlockComment = stripped.inBlockComment;
      const namespaceMatch = /^\s*namespace\s+([A-Za-z_][A-Za-z0-9_'.]*)\s*$/.exec(stripped.code);
      if (namespaceMatch) {
        activeNamespace = namespaceMatch[1];
      }
      if (/^\s*end(?:\s+[A-Za-z_][A-Za-z0-9_'.]*)?\s*$/.test(stripped.code)) {
        activeNamespace = "";
      }
      const declaration = /^\s*(theorem|lemma)\s+([A-Za-z_][A-Za-z0-9_'.]*)\b/.exec(stripped.code);
      if (!declaration) {
        continue;
      }
      const declared = declaration[2].includes(".") ? declaration[2] : [activeNamespace, declaration[2]].filter(Boolean).join(".");
      if (declared === targetTheorem || (declaration[2] === shortName && activeNamespace === namespace)) {
        return {
          fully_qualified_name: targetTheorem,
          source_file: rel,
          source_hash: sha256FileSync(file).sha256,
          declaration_kind: declaration[1] as "theorem" | "lemma",
          found: true
        };
      }
    }
  }
  return { fully_qualified_name: targetTheorem, found: false };
}

function declaredNamespaces(file: string): string[] {
  let inBlockComment = false;
  const namespaces: string[] = [];
  for (const line of readFileSync(file, "utf8").split(/\r?\n/)) {
    const stripped = stripLeanCommentsAndStrings(line, inBlockComment);
    inBlockComment = stripped.inBlockComment;
    const match = /^\s*namespace\s+([A-Za-z_][A-Za-z0-9_'.]*)\s*$/.exec(stripped.code);
    if (match) {
      namespaces.push(match[1]);
    }
  }
  return namespaces;
}

export function runStaticCheatScan(input: {
  projectRoot: string;
  leanRoot: string;
  reportPath?: string;
  skeletonAllowlist?: string[];
}): StaticCheatScanReport {
  const files = listLeanProjectFiles(input.leanRoot).filter((file) => file.endsWith(".lean"));
  const findings: StaticCheatFinding[] = [];
  const warnings: string[] = [];
  const skeletonAllowlist = new Set(input.skeletonAllowlist ?? []);

  for (const file of files) {
    const rel = relative(input.leanRoot, file).replace(/\\/g, "/");
    const lines = readFileSync(file, "utf8").split(/\r?\n/);
    lines.forEach((line, index) => {
      for (const rule of forbidden) {
        if (rule.pattern.test(line)) {
          if (rule.token === "sorry" && skeletonAllowlist.has(rel)) {
            warnings.push(`skeleton_sorry_allowed:${rel}:${index + 1}`);
            continue;
          }
          findings.push({
            file: rel,
            line: index + 1,
            token: rule.token,
            severity: "error",
            message: `forbidden Lean escape hatch detected: ${rule.token}`
          });
        }
      }
    });
  }

  const report: StaticCheatScanReport = {
    result: findings.length === 0 ? "pass" : "fail",
    findings,
    hard_vetoes: findings.map((finding) => `${finding.token}_detected`),
    warnings,
    scanned_files: files.map((file) => relative(input.leanRoot, file).replace(/\\/g, "/"))
  };

  if (input.reportPath) {
    const reportPath = assertPathAllowed(input.projectRoot, input.reportPath, { purpose: "runtime-write" });
    mkdirSync(dirname(reportPath), { recursive: true });
    writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  } else {
    const reportPath = assertPathAllowed(input.projectRoot, join(".comath", "lean", "logs", "final_static_audit.json"), {
      purpose: "runtime-write"
    });
    mkdirSync(dirname(reportPath), { recursive: true });
    writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  }

  return report;
}

export function runLeanIntegrityScannerV2(input: {
  projectRoot: string;
  leanRoot: string;
  reportPath: string;
  targetTheorem: string;
  allowedImportPrefixes: string[];
  dependencyClosure?: DependencyClosureV2Report;
  skeletonAllowlist?: string[];
  structuredAudit?: { result?: string; hard_vetoes?: string[]; fully_qualified_name?: string } | null;
}): LeanIntegrityScannerV2Report {
  const files = listLeanProjectFiles(input.leanRoot).filter((file) => file.endsWith(".lean"));
  const skeletonAllowlist = new Set(input.skeletonAllowlist ?? []);
  const findings: LeanIntegrityScannerV2Finding[] = [];
  const warnings: string[] = [];
  const imports: Record<string, string[]> = {};
  const hardVetoes: string[] = [];

  for (const file of files) {
    const rel = relative(input.leanRoot, file).replace(/\\/g, "/");
    const scan = scanLeanAwareLines(file, rel, skeletonAllowlist);
    findings.push(...scan.findings);
    warnings.push(...scan.warnings);
    imports[rel] = parseImports(file);
    for (const ns of declaredNamespaces(file)) {
      if (ns === "Mathlib" || ns.startsWith("Mathlib.") || ns === "Std" || ns.startsWith("Std.")) {
        hardVetoes.push(`namespace_shadowing:${ns}`);
      }
    }
  }

  for (const finding of findings) {
    hardVetoes.push(`${finding.token}_detected`);
  }

  for (const importName of Array.from(new Set(Object.values(imports).flat())).sort()) {
    const allowed = input.allowedImportPrefixes.some((prefix) => importName === prefix || importName.startsWith(`${prefix}.`));
    if (!allowed) {
      hardVetoes.push(`import_pollution:${importName}`);
    }
  }

  if (input.dependencyClosure) {
    hardVetoes.push(...input.dependencyClosure.untracked_imports.map((name) => `import_pollution:${name}`));
    hardVetoes.push(...input.dependencyClosure.local_module_shadowing.map((name) => `local_module_shadowing:${name}`));
    hardVetoes.push(...input.dependencyClosure.symlink_escapes.map((path) => `symlink_escape:${path}`));
  }

  const targetBinding = findTargetBinding(input.leanRoot, input.targetTheorem);
  if (!targetBinding.found) {
    hardVetoes.push("target_binding_missing");
  }
  if (!input.structuredAudit) {
    hardVetoes.push("missing_structured_lean_audit");
  } else {
    if (input.structuredAudit.result !== "pass") {
      hardVetoes.push("structured_lean_audit_failed");
    }
    if (input.structuredAudit.fully_qualified_name && input.structuredAudit.fully_qualified_name !== input.targetTheorem) {
      hardVetoes.push("structured_lean_audit_target_mismatch");
    }
    hardVetoes.push(...(input.structuredAudit.hard_vetoes ?? []));
  }

  const scannedFiles = files.map((file) => relative(input.leanRoot, file).replace(/\\/g, "/"));
  const environmentFingerprint = sha256Buffer(
    JSON.stringify({
      scannedFiles,
      imports,
      dependencyGraph: input.dependencyClosure?.dependency_graph_sha256,
      targetBinding
    })
  );
  const report: LeanIntegrityScannerV2Report = {
    schema_version: "comath.lean_integrity_scan.v2",
    result: hardVetoes.length === 0 ? "pass" : "fail",
    findings,
    hard_vetoes: Array.from(new Set(hardVetoes)),
    warnings,
    scanned_files: scannedFiles,
    target_binding: targetBinding,
    imports,
    environment_fingerprint: environmentFingerprint
  };
  const reportPath = assertPathAllowed(input.projectRoot, input.reportPath, { purpose: "runtime-write" });
  mkdirSync(dirname(reportPath), { recursive: true });
  writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  return report;
}
