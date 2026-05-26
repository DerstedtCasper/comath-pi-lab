import { randomInt } from "node:crypto";

export function nextSequentialId(prefix: string, existingIds: readonly string[]): string {
  const escapedPrefix = prefix.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pattern = new RegExp(`^${escapedPrefix}-(\\d+)$`);
  let max = 0;

  for (const id of existingIds) {
    const match = pattern.exec(id);
    if (!match) {
      continue;
    }
    max = Math.max(max, Number.parseInt(match[1] ?? "0", 10));
  }

  return `${prefix}-${String(max + 1).padStart(4, "0")}`;
}

export function appendOnlyRuntimeId(prefix: string): string {
  return `${prefix}-${Date.now()}${randomInt(1_000_000_000, 10_000_000_000)}`;
}
