import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(here, "../../../..");

function readRepoFile(relativePath) {
  return readFileSync(join(repoRoot, relativePath), "utf8");
}

function assertMacosScopedOut(relativePath) {
  const content = readRepoFile(relativePath);
  assert.match(
    content,
    /macOS is outside the current GA environment adaptation scope\./,
    `${relativePath} must explicitly mark macOS out of current GA environment adaptation scope`
  );
  const withoutScopeNotice = content.replace(
    /macOS is outside the current GA environment adaptation scope\./g,
    ""
  );
  assert.doesNotMatch(
    withoutScopeNotice,
    /\bmacOS\b|sandbox-exec(?!ution)|macos_sandbox_exec|MACOS_SANDBOX_EXEC/,
    `${relativePath} must not keep macOS/sandbox-exec as an active environment adaptation target`
  );
}

for (const relativePath of [
  "README.md",
  "AGENTS.md",
  "TODO.md",
  "config/README.md",
  "docs/architecture/adapter-contracts.md",
  "docs/architecture/ga-release-criteria.md",
  "docs/architecture/threat-model.md"
]) {
  assertMacosScopedOut(relativePath);
}

const sampleConfig = JSON.parse(readRepoFile("config/comath.sample.json"));
const providerHelpers = sampleConfig?.agentAdapterOsIsolation?.providerHelpers ?? [];
assert.equal(
  providerHelpers.some((entry) => entry?.provider === "macos_sandbox_exec"),
  false,
  "sample config must not advertise macOS sandbox-exec as a configured provider helper"
);

const phase0Smoke = readRepoFile("scripts/phase0-smoke.mjs");
assert.doesNotMatch(
  phase0Smoke,
  /goal3-task235-agent-adapter-os-isolation-macos-sandbox-exec-production-helper-profile-contract\.test\.mjs|MACOS_SANDBOX_EXEC/,
  "phase0 smoke must not keep macOS-specific helper env handles or Task235 as release-hardening scope"
);
assert.match(
  phase0Smoke,
  /goal3-task236-macos-out-of-scope-docs\.test\.mjs/,
  "phase0 smoke must track the macOS out-of-scope documentation guard"
);

console.log("Goal 3 Task236 macOS out-of-scope documentation tests passed.");
