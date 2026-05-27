import assert from "node:assert/strict";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  acquireProjectSessionLock,
  initProject,
  readProjectSessionLock,
  releaseProjectSessionLock
} from "../../dist/index.js";

const projectRoot = mkdtempSync(join(tmpdir(), "comath-session-lock-"));

try {
  assert.equal(typeof acquireProjectSessionLock, "function", "Phase 39 must export acquireProjectSessionLock");
  initProject({ name: "Session Lock Project", root_path: projectRoot });

  const first = acquireProjectSessionLock(projectRoot, {
    owner: "phase39-primary",
    staleAfterMs: 60_000,
    now: () => "2026-05-28T00:00:00.000Z"
  });
  assert.equal(first.acquired, true);
  assert.match(first.lock.session_id, /^SESS-\d{4,}$/);
  assert.equal(first.lock.owner, "phase39-primary");
  assert.equal(first.lock.released_at, undefined);
  assert.equal(first.lock_path, ".comath/sessions/writer.lock.json");
  assert.equal(existsSync(join(projectRoot, first.lock_path)), true);

  const second = acquireProjectSessionLock(projectRoot, {
    owner: "phase39-contender",
    staleAfterMs: 60_000,
    now: () => "2026-05-28T00:00:01.000Z"
  });
  assert.equal(second.acquired, false);
  assert.equal(second.reason, "active_writer_session_lock_exists");
  assert.equal(second.lock.session_id, first.lock.session_id);

  assert.throws(
    () => releaseProjectSessionLock(projectRoot, { sessionId: first.lock.session_id, token: "wrong-token" }),
    /session lock token mismatch/
  );

  const released = releaseProjectSessionLock(projectRoot, {
    sessionId: first.lock.session_id,
    token: first.lock.token,
    now: () => "2026-05-28T00:00:02.000Z"
  });
  assert.equal(released.released, true);
  assert.equal(readProjectSessionLock(projectRoot)?.released_at, "2026-05-28T00:00:02.000Z");

  const afterRelease = acquireProjectSessionLock(projectRoot, {
    owner: "phase39-after-release",
    staleAfterMs: 60_000,
    now: () => "2026-05-28T00:00:03.000Z"
  });
  assert.equal(afterRelease.acquired, true);
  assert.notEqual(afterRelease.lock.session_id, first.lock.session_id);

  const staleLockPath = join(projectRoot, afterRelease.lock_path);
  const stale = JSON.parse(readFileSync(staleLockPath, "utf8"));
  stale.heartbeat_at = "2026-05-28T00:00:00.000Z";
  stale.stale_after_ms = 1;
  stale.released_at = undefined;
  await import("node:fs/promises").then(({ writeFile }) => writeFile(staleLockPath, `${JSON.stringify(stale, null, 2)}\n`, "utf8"));

  const takeover = acquireProjectSessionLock(projectRoot, {
    owner: "phase39-takeover",
    staleAfterMs: 60_000,
    now: () => "2026-05-28T00:00:10.000Z"
  });
  assert.equal(takeover.acquired, true);
  assert.equal(takeover.lock.owner, "phase39-takeover");
  assert.equal(takeover.replaced_stale_session_id, afterRelease.lock.session_id);
  assert.equal(takeover.lock.previous_session_id, afterRelease.lock.session_id);

  const malformedRoot = mkdtempSync(join(tmpdir(), "comath-session-lock-malformed-"));
  try {
    initProject({ name: "Malformed Lock Project", root_path: malformedRoot });
    const malformedPath = join(malformedRoot, ".comath", "sessions", "writer.lock.json");
    writeFileSync(malformedPath, "{not-json", { encoding: "utf8", flag: "w" });
    assert.throws(
      () =>
        acquireProjectSessionLock(malformedRoot, {
          owner: "phase39-malformed-contender",
          staleAfterMs: 1,
          now: () => "2026-05-28T00:00:20.000Z"
        }),
      /active writer session lock is unreadable/
    );
    assert.equal(readFileSync(malformedPath, "utf8"), "{not-json");
  } finally {
    rmSync(malformedRoot, { recursive: true, force: true });
  }
} finally {
  rmSync(projectRoot, { recursive: true, force: true });
}

console.log("Phase 39 project session lock tests passed.");
