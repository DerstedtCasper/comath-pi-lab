import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();

function pathOf(relativePath) {
  return join(root, relativePath);
}

function read(relativePath) {
  return readFileSync(pathOf(relativePath), "utf8");
}

function assertFile(relativePath) {
  assert.equal(existsSync(pathOf(relativePath)), true, `${relativePath} must exist`);
}

function assertContains(relativePath, text) {
  assert.equal(read(relativePath).includes(text), true, `${relativePath} must include: ${text}`);
}

function assertNoRootRuntimeState() {
  assert.equal(existsSync(pathOf(".comath")), false, "repository/worktree root must not contain .comath runtime state");
}

function assertRootScripts() {
  const pkg = JSON.parse(read("package.json"));
  assert.equal(pkg.packageManager, "pnpm@11.3.0");
  assert.equal(pkg.engines?.node, ">=22.19.0");
  assert.equal(pkg.scripts?.ci, "corepack pnpm build && corepack pnpm typecheck && corepack pnpm test");
  assert.equal(pkg.scripts?.["release:check"], "node scripts/ga-readiness.mjs");
  assert.equal(pkg.scripts?.["external:check"], "node scripts/external-runtime-validation.mjs");
}

function assertCiWorkflow() {
  assertFile(".github/workflows/ci.yml");
  assertFile(".github/workflows/release-guard.yml");
  assertFile("python/requirements.txt");
  assertFile("lean-toolchain");
  assertContains("python/requirements.txt", "sympy==1.14.0");
  assertContains("lean-toolchain", "leanprover/lean4:v4.27.0");
  for (const command of [
    "actions/setup-python@v5",
    "python-version: \"3.13\"",
    "https://elan.lean-lang.org/elan-init.ps1",
    "lean-toolchain",
    "lean.exe\" --version",
    "python -m pip install -r python/requirements.txt",
    "corepack pnpm install --frozen-lockfile",
    "corepack pnpm build",
    "corepack pnpm typecheck",
    "corepack pnpm test",
    "corepack pnpm release:check"
  ]) {
    assertContains(".github/workflows/ci.yml", command);
  }
}

function assertReleaseDocs() {
  for (const relativePath of [
    "docs/release/GA_RELEASE_CHECKLIST.md",
    "docs/release/EXTERNAL_RUNTIME_VALIDATION.md",
    "docs/release/CI.md"
  ]) {
    assertFile(relativePath);
    for (const phrase of [
      "Pi installed runtime validation",
      "MathProve workspace runner validation",
      "TriviumDB native validation",
      "runner re-execution replay validation",
      "package metadata and artifacts",
      "DLP and secret scanning",
      "locking stress"
    ]) {
      assertContains(relativePath, phrase);
    }
  }
  assertContains(".github/workflows/release-guard.yml", "corepack pnpm external:check");
  assertContains(".github/workflows/release-guard.yml", "tags:");
  assertContains(".github/workflows/release-guard.yml", "release:");
  assertContains("README.md", "Production Formal Workbench Core");
  assertContains("README.md", "not GA");
  assertContains("tests/README.md", "Release readiness");
}

assertNoRootRuntimeState();
assertRootScripts();
assertCiWorkflow();
assertReleaseDocs();

console.log("GA readiness checks passed.");
