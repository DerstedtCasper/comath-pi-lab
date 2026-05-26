import assert from "node:assert/strict";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  acquireProjectSessionLock,
  appendMutationQueueEntry,
  initProject,
  readMutationQueue,
  readProjectSessionLock,
  releaseProjectSessionLock
} from "../../dist/index.js";

function expectRecoveryActive(error) {
  assert.equal(error?.code, "SESSION_LOCK_RECOVERY_ACTIVE");
  assert.match(String(error.message), /recovery already in progress/);
  return true;
}

const projectRoot = mkdtempSync(join(tmpdir(), "comath-session-"));

try {
  const { project } = initProject({ name: "Session Project", root_path: projectRoot });
  const first = acquireProjectSessionLock(projectRoot, {
    project_id: project.project_id,
    owner: "phase21-a",
    reason: "unit test",
    ttl_ms: 60_000
  });
  assert.equal(first.owner, "phase21-a");
  assert.match(first.lock_id, /^LOCK-\d{4,}$/);
  assert.equal(existsSync(join(projectRoot, ".comath", "session", "lock.json")), true);
  assert.throws(
    () =>
      acquireProjectSessionLock(projectRoot, {
        project_id: project.project_id,
        owner: "phase21-b",
        reason: "second owner",
        ttl_ms: 60_000
      }),
    /active session lock/
  );
  assert.throws(
    () =>
      releaseProjectSessionLock(projectRoot, {
        project_id: project.project_id,
        owner: "phase21-a"
      }),
    /session lock token required/
  );
  assert.throws(
    () =>
      releaseProjectSessionLock(projectRoot, {
        project_id: project.project_id,
        owner: "phase21-b",
        lock_id: first.lock_id
      }),
    /session lock owner mismatch/
  );
  assert.equal(readProjectSessionLock(projectRoot)?.owner, "phase21-a");
  assert.throws(
    () =>
      releaseProjectSessionLock(projectRoot, {
        project_id: project.project_id,
        owner: "phase21-a",
        lock_id: "LOCK-9999",
        acquired_at: "2026-05-26T00:00:00.000Z"
      }),
    /session lock token mismatch/
  );
  releaseProjectSessionLock(projectRoot, {
    project_id: project.project_id,
    owner: "phase21-a",
    lock_id: first.lock_id,
    acquired_at: first.acquired_at,
    expires_at: first.expires_at
  });
  assert.equal(readProjectSessionLock(projectRoot), null);

  const stale = acquireProjectSessionLock(projectRoot, {
    project_id: project.project_id,
    owner: "phase21-stale",
    reason: "stale fixture",
    ttl_ms: -1
  });
  assert.equal(stale.owner, "phase21-stale");
  const lockPath = join(projectRoot, ".comath", "session", "lock.json");
  const recoveryPath = join(projectRoot, ".comath", "session", "lock.recovery");
  writeFileSync(recoveryPath, "phase21-other-recovery\n", "utf8");
  rmSync(lockPath, { force: true });
  assert.throws(
    () =>
      acquireProjectSessionLock(projectRoot, {
        project_id: project.project_id,
        owner: "phase21-no-active-lock",
        reason: "blocked by release guard",
        ttl_ms: 60_000
      }),
    expectRecoveryActive
  );
  writeFileSync(lockPath, `${JSON.stringify(stale, null, 2)}\n`, "utf8");
  assert.throws(
    () =>
      acquireProjectSessionLock(projectRoot, {
        project_id: project.project_id,
        owner: "phase21-blocked-recovery",
        reason: "blocked recovery",
        ttl_ms: 60_000,
        allow_stale_recovery: true
      }),
    expectRecoveryActive
  );
  assert.equal(JSON.parse(readFileSync(lockPath, "utf8")).owner, "phase21-stale");
  rmSync(recoveryPath, { force: true });
  const recovered = acquireProjectSessionLock(projectRoot, {
    project_id: project.project_id,
    owner: "phase21-recovered",
    reason: "recover stale",
    ttl_ms: 60_000,
    allow_stale_recovery: true
  });
  assert.equal(recovered.owner, "phase21-recovered");
  releaseProjectSessionLock(projectRoot, {
    project_id: project.project_id,
    owner: "phase21-recovered",
    lock_id: recovered.lock_id
  });
  writeFileSync(lockPath, "{ malformed lock json\n", "utf8");
  assert.throws(
    () =>
      releaseProjectSessionLock(projectRoot, {
        project_id: project.project_id,
        owner: "phase21-corrupt",
        lock_id: "LOCK-9999"
      }),
    /JSON|Expected|Unexpected/
  );
  assert.equal(existsSync(recoveryPath), false, "failed release must clean up recovery sentinel");

  const mutation = appendMutationQueueEntry(projectRoot, {
    project_id: project.project_id,
    actor: "phase21-test",
    operation: "claim.promote",
    target_id: "C-0001",
    audit_event_id: "AE-0001",
    payload: { target_status: "formally_checked" }
  });
  assert.match(mutation.id, /^MQ-\d{4,}$/);
  const secondMutation = appendMutationQueueEntry(projectRoot, {
    project_id: project.project_id,
    actor: "phase21-test",
    operation: "claim.audit",
    target_id: "C-0001",
    audit_event_id: "AE-0002",
    payload: { audit_state: "audit_passed" }
  });
  assert.match(secondMutation.id, /^MQ-\d{4,}$/);
  assert.notEqual(secondMutation.id, mutation.id);
  assert.equal(readMutationQueue(projectRoot, project.project_id).length, 2);
  assert.equal(existsSync(join(projectRoot, ".comath", "session", "mutations.jsonl")), true);
} finally {
  rmSync(projectRoot, { recursive: true, force: true });
}

console.log("Phase 21 session lock tests passed.");
