import { readFileSync, statSync } from "node:fs";

export type SecretScanStubResult = {
  status: "stub";
  blocks_import: false;
  warnings: string[];
};

export function scanForSecretsStub(_path: string): SecretScanStubResult {
  return {
    status: "stub",
    blocks_import: false,
    warnings: ["secret scanning is a Phase 3 stub; replay/export gates remain deferred"]
  };
}

export type SecretFinding = {
  kind: string;
  line: number;
  redacted: string;
};

export type SecretScanResult = {
  status: "clean" | "blocked";
  blocks_export: boolean;
  blocks_import: boolean;
  findings: SecretFinding[];
  scanned_bytes: number;
  warnings: string[];
};

const MAX_SCAN_BYTES = 2 * 1024 * 1024;

const secretPatterns: Array<{ kind: string; pattern: RegExp }> = [
  { kind: "openai_api_key", pattern: /\bsk-(?:proj-)?[A-Za-z0-9_-]{20,}\b/g },
  { kind: "private_key", pattern: /-----BEGIN [A-Z0-9 ]*PRIVATE KEY-----/g },
  { kind: "aws_access_key", pattern: /\bAKIA[0-9A-Z]{16}\b/g },
  { kind: "github_token", pattern: /\bgh[pousr]_[A-Za-z0-9_]{30,}\b/g },
  { kind: "generic_secret_assignment", pattern: /\b(?:api[_-]?key|secret|token|password)\s*=\s*["']?[^"'\s]{16,}/gi }
];

function redacted(value: string): string {
  if (value.length <= 12) {
    return "<redacted>";
  }
  return `${value.slice(0, 6)}...${value.slice(-4)}`;
}

function lineNumberForOffset(text: string, offset: number): number {
  return text.slice(0, offset).split(/\r?\n/).length;
}

export function scanForSecrets(path: string): SecretScanResult {
  const size = statSync(path).size;
  const bytesToRead = Math.min(size, MAX_SCAN_BYTES);
  const buffer = readFileSync(path).subarray(0, bytesToRead);
  const text = buffer.toString("utf8");
  const warnings: string[] = [];
  const findings: SecretFinding[] = [];
  if (size > MAX_SCAN_BYTES) {
    warnings.push("secret scan truncated large file");
    findings.push({
      kind: "scan_truncated",
      line: 1,
      redacted: "<file exceeds scan limit>"
    });
  }

  for (const { kind, pattern } of secretPatterns) {
    pattern.lastIndex = 0;
    for (const match of text.matchAll(pattern)) {
      findings.push({
        kind,
        line: lineNumberForOffset(text, match.index ?? 0),
        redacted: redacted(match[0])
      });
    }
  }

  const blocked = findings.length > 0;
  return {
    status: blocked ? "blocked" : "clean",
    blocks_export: blocked,
    blocks_import: blocked,
    findings,
    scanned_bytes: bytesToRead,
    warnings
  };
}
