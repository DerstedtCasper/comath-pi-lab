import assert from "node:assert/strict";
import { mkdtempSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { evaluatePathPolicy } from "../../dist/index.js";

const root = mkdtempSync(join(tmpdir(), "comath-path-policy-"));
const outside = mkdtempSync(join(tmpdir(), "comath-outside-"));

try {
  const inside = evaluatePathPolicy(root, "notes/claim.md", { purpose: "read" });
  assert.equal(inside.allowed, true);
  assert.equal(inside.normalized_path, resolve(root, "notes/claim.md"));

  const runtimeWrite = evaluatePathPolicy(root, ".comath/artifacts/a.txt", { purpose: "runtime-write" });
  assert.equal(runtimeWrite.allowed, true);
  assert.equal(runtimeWrite.normalized_path, resolve(root, ".comath/artifacts/a.txt"));

  for (const candidate of ["", "\0", "../outside.txt", "..\\outside.txt", "file:///tmp/x"]) {
    assert.equal(evaluatePathPolicy(root, candidate, { purpose: "read" }).allowed, false, candidate);
  }

  assert.equal(evaluatePathPolicy(root, resolve(outside, "escape.txt"), { purpose: "read" }).allowed, false);
  assert.equal(evaluatePathPolicy(root, "C:\\outside\\escape.txt", { purpose: "read" }).allowed, false);
  assert.equal(evaluatePathPolicy(root, "\\\\server\\share\\escape.txt", { purpose: "read" }).allowed, false);

  assert.equal(evaluatePathPolicy(root, ".git/config", { purpose: "read" }).allowed, false);
  assert.equal(evaluatePathPolicy(root, ".env", { purpose: "read" }).allowed, false);
  assert.equal(evaluatePathPolicy(root, "notes/a.txt", { purpose: "runtime-write" }).allowed, false);

  writeFileSync(join(outside, "target.txt"), "outside");
  const linkPath = join(root, ".comath-link");
  try {
    symlinkSync(outside, linkPath, "junction");
    const symlinkDecision = evaluatePathPolicy(root, join(".comath-link", "target.txt"), {
      purpose: "read",
      resolveRealpath: true
    });
    assert.equal(symlinkDecision.allowed, false);
  } catch (error) {
    if (error.code !== "EPERM" && error.code !== "EACCES") {
      throw error;
    }
  }

  const runtimeLinkPath = join(root, ".comath");
  try {
    symlinkSync(outside, runtimeLinkPath, "junction");
    const runtimeSymlinkDecision = evaluatePathPolicy(root, join(".comath", "artifacts", "escape.txt"), {
      purpose: "runtime-write"
    });
    assert.equal(runtimeSymlinkDecision.allowed, false);
  } catch (error) {
    if (error.code !== "EPERM" && error.code !== "EACCES") {
      throw error;
    }
  }
} finally {
  rmSync(root, { recursive: true, force: true });
  rmSync(outside, { recursive: true, force: true });
}

console.log("Phase 2 path policy tests passed.");
