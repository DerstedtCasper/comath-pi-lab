import { createHash } from "node:crypto";

export function normalizeStatement(input: string): string {
  return input.replace(/\s+/g, " ").trim();
}

export function statementHash(input: string): string {
  return createHash("sha256").update(normalizeStatement(input), "utf8").digest("hex");
}

