import { existsSync, realpathSync } from "node:fs";
import { dirname, isAbsolute, relative, resolve } from "node:path";
import { pathPolicyDecisionSchema, type PathPolicyDecision } from "../types/schemas.js";

export type PathPolicyPurpose = "read" | "runtime-write";

export type PathPolicyOptions = {
  purpose?: PathPolicyPurpose;
  resolveRealpath?: boolean;
};

const sensitiveRoots = new Set([".git", ".env"]);

function hasUrlShape(input: string): boolean {
  return /^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//.test(input);
}

function hasWindowsDeviceOrUncShape(input: string): boolean {
  return input.startsWith("\\\\") || input.startsWith("//") || input.startsWith("\\\\.\\") || input.startsWith("\\\\?\\");
}

function hasAlternateDataStreamShape(input: string): boolean {
  const withoutDrive = input.replace(/^[a-zA-Z]:[\\/]/, "");
  return withoutDrive.includes(":");
}

function isInsideRoot(root: string, candidate: string): boolean {
  const rel = relative(root, candidate);
  return rel === "" || (!rel.startsWith("..") && !isAbsolute(rel));
}

function firstPathSegment(root: string, candidate: string): string {
  const rel = relative(root, candidate);
  return rel.split(/[\\/]/)[0] ?? "";
}

function denied(reason: string): PathPolicyDecision {
  return pathPolicyDecisionSchema.parse({ allowed: false, reason });
}

function nearestExistingAncestor(path: string): string | null {
  let current = path;
  while (!existsSync(current)) {
    const parent = dirname(current);
    if (parent === current) {
      return null;
    }
    current = parent;
  }
  return current;
}

export function evaluatePathPolicy(
  projectRoot: string,
  candidatePath: string,
  options: PathPolicyOptions = {}
): PathPolicyDecision {
  const purpose = options.purpose ?? "read";

  if (!candidatePath || candidatePath.includes("\0")) {
    return denied("path is empty or contains NUL byte");
  }
  if (hasUrlShape(candidatePath)) {
    return denied("URL-shaped paths are not allowed");
  }
  if (hasWindowsDeviceOrUncShape(candidatePath)) {
    return denied("UNC and device paths are not allowed");
  }
  if (hasAlternateDataStreamShape(candidatePath)) {
    return denied("alternate data stream syntax is not allowed");
  }

  const normalizedRoot = resolve(projectRoot);
  const normalizedCandidate = isAbsolute(candidatePath) ? resolve(candidatePath) : resolve(normalizedRoot, candidatePath);

  if (!isInsideRoot(normalizedRoot, normalizedCandidate)) {
    return denied("path escapes project root");
  }

  const firstSegment = firstPathSegment(normalizedRoot, normalizedCandidate);
  if (sensitiveRoots.has(firstSegment)) {
    return denied("sensitive repository path is not allowed");
  }

  const runtimeRoot = resolve(normalizedRoot, ".comath");
  if (purpose === "runtime-write" && !isInsideRoot(runtimeRoot, normalizedCandidate)) {
    return denied("runtime writes are restricted to .comath");
  }

  if (purpose === "runtime-write") {
    const realRoot = existsSync(normalizedRoot) ? realpathSync.native(normalizedRoot) : normalizedRoot;
    if (existsSync(runtimeRoot)) {
      const realRuntimeRoot = realpathSync.native(runtimeRoot);
      if (!isInsideRoot(realRoot, realRuntimeRoot)) {
        return denied("runtime root realpath escapes project root");
      }

      const existingAncestor = nearestExistingAncestor(normalizedCandidate);
      if (existingAncestor) {
        const realExistingAncestor = realpathSync.native(existingAncestor);
        if (!isInsideRoot(realRuntimeRoot, realExistingAncestor)) {
          return denied("runtime write realpath escapes .comath");
        }
      }
    }
  }

  if (options.resolveRealpath && existsSync(normalizedCandidate)) {
    const realCandidate = realpathSync.native(normalizedCandidate);
    const realRoot = existsSync(normalizedRoot) ? realpathSync.native(normalizedRoot) : normalizedRoot;
    if (!isInsideRoot(realRoot, realCandidate)) {
      return denied("realpath escapes project root");
    }
  }

  return pathPolicyDecisionSchema.parse({
    allowed: true,
    reason: "allowed",
    normalized_path: normalizedCandidate
  });
}

export function assertPathAllowed(projectRoot: string, candidatePath: string, options: PathPolicyOptions = {}): string {
  const decision = evaluatePathPolicy(projectRoot, candidatePath, options);
  if (!decision.allowed || !decision.normalized_path) {
    throw new Error(decision.reason);
  }
  return decision.normalized_path;
}
