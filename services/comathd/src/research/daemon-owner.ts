import { lstatSync, mkdirSync, realpathSync } from "node:fs";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { ComathError } from "../errors.js";
import { assertPathAllowed } from "../security/path-policy.js";

export type DaemonOwner = { readonly root: string; readonly path: string; release(): void };

/** Check every existing ancestor, including junctions, before SQLite can create a file. */
export function resolveResearchControlPath(projectRoot: string, filename?: string): string {
  const root = realpathSync(projectRoot);
  if (filename !== undefined && !/^[a-z0-9][a-z0-9.-]*$/.test(filename)) throw new Error("Invalid research control filename");
  let path = root;
  for (const component of [".comath", "control", ...(filename ? [filename] : [])]) {
    path = join(path, component);
    if (lstatSync(path, { throwIfNoEntry: false })?.isSymbolicLink()) {
      throw new ComathError("Research control path contains an unsafe link or junction", { code: "RESEARCH_CONTROL_UNSAFE_PATH" });
    }
  }
  return assertPathAllowed(root, join(".comath", "control", ...(filename ? [filename] : [])), { purpose: "runtime-write" });
}

/** The OS owns crash recovery: this lock is never stolen using a timestamp or PID file. */
export function acquireDaemonOwner(projectRoot: string): DaemonOwner {
  const root = realpathSync(projectRoot);
  const control = resolveResearchControlPath(root);
  mkdirSync(control, { recursive: true });
  const path = resolveResearchControlPath(root, "owner.sqlite");
  const db = new DatabaseSync(path);
  try { db.exec("PRAGMA busy_timeout=0; PRAGMA journal_mode=DELETE; CREATE TABLE IF NOT EXISTS owner_guard (id INTEGER PRIMARY KEY); BEGIN EXCLUSIVE;"); }
  catch (error) {
    db.close();
    if (/locked|busy/i.test(String(error))) throw new ComathError("Another daemon owns this project", { code: "DAEMON_ALREADY_OWNS_PROJECT", statusCode: 409 });
    throw error;
  }
  let released = false;
  return { root, path, release() {
    if (released) return;
    try { db.exec("ROLLBACK"); } finally { db.close(); released = true; }
  } };
}
