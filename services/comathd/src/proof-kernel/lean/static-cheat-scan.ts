import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { assertPathAllowed } from "../../security/path-policy.js";
import { listLeanProjectFiles } from "./lean-project.js";

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

const forbidden = [
  { token: "sorry", pattern: /\bsorry\b/ },
  { token: "admit", pattern: /\badmit\b/ },
  { token: "axiom", pattern: /\baxiom\b/ },
  { token: "constant", pattern: /\bconstant\b/ },
  { token: "unsafe", pattern: /\bunsafe\b/ },
  { token: "opaque", pattern: /\bopaque\b/ }
];

export function runStaticCheatScan(input: { projectRoot: string; leanRoot: string; reportPath?: string }): StaticCheatScanReport {
  const files = listLeanProjectFiles(input.leanRoot).filter((file) => file.endsWith(".lean"));
  const findings: StaticCheatFinding[] = [];

  for (const file of files) {
    const rel = relative(input.leanRoot, file).replace(/\\/g, "/");
    const lines = readFileSync(file, "utf8").split(/\r?\n/);
    lines.forEach((line, index) => {
      for (const rule of forbidden) {
        if (rule.pattern.test(line)) {
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
    warnings: [],
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
