import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { assertPathAllowed } from "../security/path-policy.js";
import { nextSequentialId } from "../utils/id.js";

export type ProjectSessionLock = {
  session_id: string;
  token: string;
  owner: string;
  acquired_at: string;
  heartbeat_at: string;
  stale_after_ms: number;
  previous_session_id?: string;
  released_at?: string;
};

export type ProjectSessionLockAcquireOptions = {
  owner: string;
  staleAfterMs?: number;
  now?: () => string;
};

export type ProjectSessionLockAcquireResult =
  | {
      acquired: true;
      lock_path: string;
      lock: ProjectSessionLock;
      replaced_stale_session_id?: string;
    }
  | {
      acquired: false;
      lock_path: string;
      reason: "active_writer_session_lock_exists";
      lock: ProjectSessionLock;
    };

export type ProjectSessionLockReleaseResult = {
  released: true;
  lock_path: string;
  lock: ProjectSessionLock;
};

const lockPath = ".comath/sessions/writer.lock.json";

function nowIso(now: (() => string) | undefined): string {
  return now ? now() : new Date().toISOString();
}

function absoluteLockPath(projectRoot: string): string {
  return assertPathAllowed(projectRoot, lockPath, { purpose: "runtime-write" });
}

function generateToken(input: { sessionId: string; owner: string; acquiredAt: string }): string {
  return Buffer.from(`${input.sessionId}:${input.owner}:${input.acquiredAt}:${Math.random().toString(16).slice(2)}`).toString("base64url");
}

function readLockFile(path: string): ProjectSessionLock | null {
  if (!existsSync(path)) {
    return null;
  }
  try {
    return JSON.parse(readFileSync(path, "utf8")) as ProjectSessionLock;
  } catch (error) {
    throw new Error(`active writer session lock is unreadable: ${error instanceof Error ? error.message : String(error)}`);
  }
}

function writeLockFile(path: string, lock: ProjectSessionLock, flag: "w" | "wx" = "w"): void {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(lock, null, 2)}\n`, { encoding: "utf8", flag });
}

function isActive(lock: ProjectSessionLock, at: string): boolean {
  if (lock.released_at) {
    return false;
  }
  const heartbeatMs = Date.parse(lock.heartbeat_at);
  const atMs = Date.parse(at);
  if (!Number.isFinite(heartbeatMs) || !Number.isFinite(atMs)) {
    return true;
  }
  return atMs - heartbeatMs <= lock.stale_after_ms;
}

function makeLock(input: {
  existing: ProjectSessionLock | null;
  owner: string;
  staleAfterMs: number;
  acquiredAt: string;
}): ProjectSessionLock {
  const session_id = nextSequentialId("SESS", input.existing ? [input.existing.session_id] : []);
  return {
    session_id,
    token: generateToken({ sessionId: session_id, owner: input.owner, acquiredAt: input.acquiredAt }),
    owner: input.owner,
    acquired_at: input.acquiredAt,
    heartbeat_at: input.acquiredAt,
    stale_after_ms: input.staleAfterMs,
    ...(input.existing?.session_id ? { previous_session_id: input.existing.session_id } : {})
  };
}

export function readProjectSessionLock(projectRoot: string): ProjectSessionLock | null {
  return readLockFile(absoluteLockPath(projectRoot));
}

export function acquireProjectSessionLock(
  projectRoot: string,
  options: ProjectSessionLockAcquireOptions
): ProjectSessionLockAcquireResult {
  const path = absoluteLockPath(projectRoot);
  const at = nowIso(options.now);
  const staleAfterMs = options.staleAfterMs ?? 5 * 60_000;
  const existing = readLockFile(path);
  if (existing && isActive(existing, at)) {
    return {
      acquired: false,
      lock_path: lockPath,
      reason: "active_writer_session_lock_exists",
      lock: existing
    };
  }

  const lock = makeLock({ existing, owner: options.owner, staleAfterMs, acquiredAt: at });
  writeLockFile(path, lock, existing ? "w" : "wx");
  return {
    acquired: true,
    lock_path: lockPath,
    lock,
    ...(existing && !existing.released_at ? { replaced_stale_session_id: existing.session_id } : {})
  };
}

export function releaseProjectSessionLock(
  projectRoot: string,
  options: { sessionId: string; token: string; now?: () => string }
): ProjectSessionLockReleaseResult {
  const path = absoluteLockPath(projectRoot);
  const lock = readLockFile(path);
  if (!lock || lock.session_id !== options.sessionId) {
    throw new Error("session lock not found");
  }
  if (lock.token !== options.token) {
    throw new Error("session lock token mismatch");
  }
  const released = {
    ...lock,
    released_at: nowIso(options.now)
  };
  writeLockFile(path, released);
  return { released: true, lock_path: lockPath, lock: released };
}
