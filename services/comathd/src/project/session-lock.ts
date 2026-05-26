import { appendFileSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { ComathError } from "../errors.js";
import { assertPathAllowed } from "../security/path-policy.js";
import {
  mutationQueueEntrySchema,
  projectSessionLockSchema,
  type MutationQueueEntry,
  type ProjectSessionLock
} from "../types/schemas.js";
import { appendOnlyRuntimeId } from "../utils/id.js";

export type AcquireProjectSessionLockInput = {
  project_id: string;
  owner: string;
  reason: string;
  ttl_ms: number;
  allow_stale_recovery?: boolean;
};

export type ReleaseProjectSessionLockInput = {
  project_id: string;
  owner: string;
  lock_id?: string;
  acquired_at?: string;
  expires_at?: string;
};

export type AppendMutationQueueEntryInput = Omit<MutationQueueEntry, "id" | "created_at"> & {
  id?: string;
  created_at?: string;
};

function lockPath(projectRoot: string): string {
  return assertPathAllowed(projectRoot, join(".comath", "session", "lock.json"), { purpose: "runtime-write" });
}

function recoveryLockPath(projectRoot: string): string {
  return assertPathAllowed(projectRoot, join(".comath", "session", "lock.recovery"), { purpose: "runtime-write" });
}

function queuePath(projectRoot: string): string {
  return assertPathAllowed(projectRoot, join(".comath", "session", "mutations.jsonl"), { purpose: "runtime-write" });
}

function isStale(lock: ProjectSessionLock, now = new Date()): boolean {
  return Date.parse(lock.expires_at) <= now.getTime();
}

function isFileExistsError(error: unknown): boolean {
  return Boolean(error && typeof error === "object" && "code" in error && (error as { code?: unknown }).code === "EEXIST");
}

function mutationQueueId(): string {
  return appendOnlyRuntimeId("MQ");
}

function sameLock(left: ProjectSessionLock, right: ProjectSessionLock): boolean {
  return (
    left.lock_id === right.lock_id &&
    left.project_id === right.project_id &&
    left.owner === right.owner &&
    left.reason === right.reason &&
    left.acquired_at === right.acquired_at &&
    left.expires_at === right.expires_at
  );
}

function writeNewLock(path: string, lock: ProjectSessionLock): void {
  try {
    writeFileSync(path, `${JSON.stringify(lock, null, 2)}\n`, { encoding: "utf8", flag: "wx" });
  } catch (error) {
    if (isFileExistsError(error)) {
      throw new ComathError("active session lock already exists", { code: "SESSION_LOCK_ACTIVE", statusCode: 409 });
    }
    throw error;
  }
}

function assertNoRecoveryInProgress(projectRoot: string): void {
  if (existsSync(recoveryLockPath(projectRoot))) {
    throw new ComathError("session lock recovery already in progress", {
      code: "SESSION_LOCK_RECOVERY_ACTIVE",
      statusCode: 409
    });
  }
}

export function readProjectSessionLock(projectRoot: string): ProjectSessionLock | null {
  const path = lockPath(projectRoot);
  if (!existsSync(path)) {
    return null;
  }
  const lock = projectSessionLockSchema.parse(JSON.parse(readFileSync(path, "utf8")));
  return isStale(lock) ? null : lock;
}

function readRawProjectSessionLock(projectRoot: string): ProjectSessionLock | null {
  const path = lockPath(projectRoot);
  if (!existsSync(path)) {
    return null;
  }
  return projectSessionLockSchema.parse(JSON.parse(readFileSync(path, "utf8")));
}

export function acquireProjectSessionLock(
  projectRoot: string,
  input: AcquireProjectSessionLockInput
): ProjectSessionLock {
  assertNoRecoveryInProgress(projectRoot);
  const existing = readRawProjectSessionLock(projectRoot);
  if (existing && !isStale(existing)) {
    throw new ComathError("active session lock already exists", { code: "SESSION_LOCK_ACTIVE", statusCode: 409 });
  }
  if (existing && isStale(existing) && !input.allow_stale_recovery) {
    throw new ComathError("stale session lock requires explicit recovery", {
      code: "SESSION_LOCK_STALE",
      statusCode: 409
    });
  }
  const acquiredAt = new Date();
  const lock = projectSessionLockSchema.parse({
    lock_id: appendOnlyRuntimeId("LOCK"),
    project_id: input.project_id,
    owner: input.owner,
    reason: input.reason,
    acquired_at: acquiredAt.toISOString(),
    expires_at: new Date(acquiredAt.getTime() + input.ttl_ms).toISOString()
  });
  const path = lockPath(projectRoot);
  mkdirSync(dirname(path), { recursive: true });

  if (!existing) {
    writeNewLock(path, lock);
    return lock;
  }

  const recoveryPath = recoveryLockPath(projectRoot);
  try {
    writeFileSync(recoveryPath, `${input.owner}:${acquiredAt.toISOString()}\n`, { encoding: "utf8", flag: "wx" });
  } catch (error) {
    if (isFileExistsError(error)) {
      throw new ComathError("session lock stale recovery already in progress", {
        code: "SESSION_LOCK_RECOVERY_ACTIVE",
        statusCode: 409
      });
    }
    throw error;
  }

  try {
    const current = readRawProjectSessionLock(projectRoot);
    if (!current) {
      writeNewLock(path, lock);
      return lock;
    }
    if (!isStale(current)) {
      throw new ComathError("active session lock already exists", { code: "SESSION_LOCK_ACTIVE", statusCode: 409 });
    }
    if (!sameLock(existing, current)) {
      throw new ComathError("session lock changed during stale recovery", {
        code: "SESSION_LOCK_CHANGED",
        statusCode: 409
      });
    }
    rmSync(path, { force: true });
    writeNewLock(path, lock);
    return lock;
  } finally {
    rmSync(recoveryPath, { force: true });
  }
}

export function releaseProjectSessionLock(projectRoot: string, input: ReleaseProjectSessionLockInput): void {
  if (!input.lock_id) {
    throw new ComathError("session lock token required", {
      code: "SESSION_LOCK_TOKEN_REQUIRED",
      statusCode: 409
    });
  }

  const releaseStartedAt = new Date().toISOString();
  const recoveryPath = recoveryLockPath(projectRoot);
  mkdirSync(dirname(recoveryPath), { recursive: true });
  try {
    writeFileSync(recoveryPath, `${input.owner}:release:${releaseStartedAt}\n`, { encoding: "utf8", flag: "wx" });
  } catch (error) {
    if (isFileExistsError(error)) {
      throw new ComathError("session lock recovery already in progress", {
        code: "SESSION_LOCK_RECOVERY_ACTIVE",
        statusCode: 409
      });
    }
    throw error;
  }

  try {
    const existing = readRawProjectSessionLock(projectRoot);
    if (!existing) {
      return;
    }
    if (existing.project_id !== input.project_id) {
      throw new ComathError("session lock project mismatch", { code: "SESSION_LOCK_PROJECT_MISMATCH", statusCode: 409 });
    }
    if (existing.owner !== input.owner) {
      throw new ComathError("session lock owner mismatch", { code: "SESSION_LOCK_OWNER_MISMATCH", statusCode: 409 });
    }
    if (
      input.lock_id !== existing.lock_id ||
      (input.acquired_at && input.acquired_at !== existing.acquired_at) ||
      (input.expires_at && input.expires_at !== existing.expires_at)
    ) {
      throw new ComathError("session lock token mismatch", { code: "SESSION_LOCK_TOKEN_MISMATCH", statusCode: 409 });
    }
    const current = readRawProjectSessionLock(projectRoot);
    if (!current || !sameLock(existing, current)) {
      throw new ComathError("session lock changed during release", {
        code: "SESSION_LOCK_CHANGED",
        statusCode: 409
      });
    }
    rmSync(lockPath(projectRoot), { force: true });
  } finally {
    rmSync(recoveryPath, { force: true });
  }
}

export function readMutationQueue(projectRoot: string, projectId?: string): MutationQueueEntry[] {
  const path = queuePath(projectRoot);
  if (!existsSync(path)) {
    return [];
  }
  const records = readFileSync(path, "utf8")
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line) => mutationQueueEntrySchema.parse(JSON.parse(line)));
  return projectId ? records.filter((record) => record.project_id === projectId) : records;
}

export function appendMutationQueueEntry(
  projectRoot: string,
  input: AppendMutationQueueEntryInput
): MutationQueueEntry {
  const entry = mutationQueueEntrySchema.parse({
    id: input.id ?? mutationQueueId(),
    project_id: input.project_id,
    actor: input.actor,
    operation: input.operation,
    target_id: input.target_id,
    audit_event_id: input.audit_event_id,
    payload: input.payload ?? {},
    created_at: input.created_at ?? new Date().toISOString()
  });
  const path = queuePath(projectRoot);
  mkdirSync(dirname(path), { recursive: true });
  appendFileSync(path, `${JSON.stringify(entry)}\n`, "utf8");
  return entry;
}
