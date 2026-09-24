import { createHash } from "node:crypto";
import { closeSync, existsSync, mkdtempSync, openSync, readFileSync, readdirSync, readSync, realpathSync, renameSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, relative, resolve, sep } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { z } from "zod";
import { exportSnapshot, restoreSnapshot, verifySnapshot } from "../artifacts/snapshots.js";
import { ComathError } from "../errors.js";
import { resolveResearchControlPath, withDaemonOwnerMaintenance, type DaemonOwner } from "./daemon-owner.js";
import { researchDatabasePath, RESEARCH_SCHEMA_VERSION, type ResearchClock } from "./research-store.js";

const receiptSchema = z.strictObject({ schema_version: z.literal(1), database_schema_version: z.literal(1),
  root: z.string(), origin: z.enum(["fresh", "legacy"]), created_at: z.iso.datetime(),
  snapshot_manifest_path: z.string().optional(), snapshot_manifest_sha256: z.string().regex(/^[a-f0-9]{64}$/).optional(),
  restore_verified_at: z.iso.datetime().optional() });
const journalSchema = receiptSchema.extend({ phase: z.enum(["started", "backup_created", "restore_verified"]) });
const rollbackIntentSchema = z.strictObject({ schema_version: z.literal(1), root: z.string(), project_id: z.string(),
  snapshot_manifest_path: z.string(), snapshot_manifest_sha256: z.string().regex(/^[a-f0-9]{64}$/),
  control_backup_manifest_path: z.string(), control_backup_manifest_sha256: z.string().regex(/^[a-f0-9]{64}$/),
  migration_receipt_sha256: z.string().regex(/^[a-f0-9]{64}$/), phase: z.enum(["restoring", "restored"]), created_at: z.iso.datetime() });
export type ResearchMigrationReceipt = z.infer<typeof receiptSchema>;
type MigrationJournal = z.infer<typeof journalSchema>;
type ResearchRollbackIntent = z.infer<typeof rollbackIntentSchema>;
export type ResearchLayout = { kind: "fresh" | "legacy" | "current" | "partial"; root: string; schemaVersion: number;
  receipt?: ResearchMigrationReceipt; journal?: MigrationJournal };
export type MigrationQuiescence = {
  admissions_stopped: boolean; workers_stopped: boolean; tools_stopped: boolean;
  writers_quiet: boolean; pending_commits_reconciled: boolean;
};
export type ResearchMigrationOptions = {
  /** Trusted service executor must actually drain/reconcile old writers before confirming. */
  quiesce?: (root: string) => Promise<MigrationQuiescence>;
  /** Service lifecycle hook, also permits deterministic crash injection before schema creation. */
  afterRestoreVerified?: (receipt: ResearchMigrationReceipt) => void | Promise<void>;
};
export type ResearchRollbackResult = { restored_entries: number; target_root: string; project_id: string; database_schema_version: number };
function migrationFile(root: string, name: "journal" | "receipt"): string {
  return resolveResearchControlPath(root, `migration-${name}.json`);
}
function rollbackIntentFile(root: string): string { return resolveResearchControlPath(root, "migration-rollback.json"); }
function blocked(message: string): ComathError { return new ComathError(message, { code: "MIGRATION_BLOCKED", statusCode: 409 }); }
function readVersion(root: string, strictReadOnly = false): number {
  const path = researchDatabasePath(root); if (!existsSync(path)) return 0;
  if (strictReadOnly) {
    const wal = resolveResearchControlPath(root, "research.sqlite-wal");
    const requireNoWalFrames = () => {
      if (existsSync(wal) && statSync(wal).size > 0) throw new ComathError("An existing WAL requires a consistent snapshot before its schema can be inspected", { code: "LAYOUT_PROBE_REQUIRES_SNAPSHOT", statusCode: 409 });
    };
    requireNoWalFrames();
    const before = statSync(path), header = Buffer.alloc(100), fd = openSync(path, "r");
    let bytes: number;
    try { bytes = readSync(fd, header, 0, header.length, 0); } finally { closeSync(fd); }
    if (!before.isFile() || bytes !== 100 || !header.subarray(0, 16).equals(Buffer.from("SQLite format 3\0", "ascii"))) {
      throw new ComathError("Research database does not have a valid SQLite header", { code: "LAYOUT_SQLITE_HEADER_INVALID", statusCode: 409 });
    }
    const encodedPageSize = header.readUInt16BE(16), pageSize = encodedPageSize === 1 ? 65536 : encodedPageSize;
    if (pageSize < 512 || pageSize > 65536 || (pageSize & (pageSize - 1)) !== 0 || ![1, 2].includes(header[18]) || ![1, 2].includes(header[19])) {
      throw new ComathError("Research database has invalid SQLite format metadata", { code: "LAYOUT_SQLITE_HEADER_INVALID", statusCode: 409 });
    }
    requireNoWalFrames();
    const after = statSync(path);
    if (before.ino !== after.ino || before.dev !== after.dev || before.size !== after.size || before.mtimeMs !== after.mtimeMs) {
      throw new ComathError("Research database changed during inspection", { code: "LAYOUT_PROBE_REQUIRES_SNAPSHOT", statusCode: 409 });
    }
    return header.readInt32BE(60);
  }
  const db = new DatabaseSync(path, { readOnly: true });
  try { return Number(db.prepare("PRAGMA user_version").get()?.user_version); } finally { db.close(); }
}
function writeAtomic(path: string, value: unknown): void {
  const temp = `${path}.tmp`;
  writeFileSync(temp, JSON.stringify(value, null, 2) + "\n", { encoding: "utf8", flush: true });
  renameSync(temp, path);
}
/** Read-only, and deliberately called before owner acquisition creates .comath/control. */
export function probeResearchLayout(projectRoot: string, options: { strictReadOnly?: boolean } = {}): ResearchLayout {
  const root = realpathSync(projectRoot);
  const schemaVersion = readVersion(root, options.strictReadOnly);
  const receiptPath = migrationFile(root, "receipt"), journalPath = migrationFile(root, "journal");
  try {
    if (existsSync(receiptPath)) {
      const receipt = receiptSchema.parse(JSON.parse(readFileSync(receiptPath, "utf8")));
      if (receipt.root !== root) throw blocked("Migration receipt belongs to another root");
      if (receipt.origin === "legacy" && (!receipt.snapshot_manifest_path || !receipt.snapshot_manifest_sha256 || !receipt.restore_verified_at)) throw blocked("Incomplete legacy migration receipt");
      if (schemaVersion === RESEARCH_SCHEMA_VERSION) return { kind: "current", root, schemaVersion, receipt };
      // A receipt cannot authorize creating a missing database or an unknown upgrade.
      return { kind: "legacy", root, schemaVersion };
    }
    if (existsSync(journalPath)) {
      const journal = journalSchema.parse(JSON.parse(readFileSync(journalPath, "utf8")));
      if (journal.root !== root) throw blocked("Migration journal belongs to another root");
      return { kind: "partial", root, schemaVersion, journal };
    }
  } catch (error) { if (error instanceof ComathError) throw error; throw blocked(`Invalid migration metadata: ${String(error)}`); }
  const runtime = join(root, ".comath");
  const onlyOwner = existsSync(join(runtime, "control")) && readdirSync(runtime).every(name => name === "control")
    && readdirSync(join(runtime, "control")).every(name => /^owner\.sqlite(?:-journal|-wal|-shm)?$/.test(name));
  return { kind: !existsSync(runtime) || onlyOwner ? "fresh" : "legacy", root, schemaVersion };
}
async function requireQuiescence(root: string, options: ResearchMigrationOptions): Promise<void> {
  if (!options.quiesce) throw blocked("Legacy migration requires confirmed worker/tool/writer quiescence and pending commit reconciliation");
  let result: MigrationQuiescence;
  try { result = await options.quiesce(root); }
  catch (error) { throw blocked(`Cannot confirm migration quiescence: ${String(error)}`); }
  if (![result.admissions_stopped, result.workers_stopped, result.tools_stopped, result.writers_quiet, result.pending_commits_reconciled].every(value => value === true)) throw blocked("Legacy writers or executions have not been confirmed quiet");
  const path = researchDatabasePath(root);
  if (existsSync(path)) {
    const db = new DatabaseSync(path);
    try {
      db.exec("PRAGMA busy_timeout=1000");
      const checkpoint = db.prepare("PRAGMA wal_checkpoint(TRUNCATE)").get();
      if (Number(checkpoint?.busy) !== 0) throw blocked("Research WAL checkpoint could not complete");
    } finally { db.close(); }
  }
}
function snapshotHash(path: string): string { return createHash("sha256").update(readFileSync(path)).digest("hex"); }
function checkedSnapshotPath(root: string, path: string): string {
  const allowed = resolve(root, ".comath", "snapshots");
  const canonical = realpathSync(path);
  const rel = relative(allowed, canonical);
  if (!rel || rel.startsWith("..") || resolve(allowed, rel) !== canonical) throw blocked("Migration snapshot is outside project snapshots");
  return canonical;
}
async function verifyRestorableBackup(root: string, journal: MigrationJournal, clock: ResearchClock): Promise<void> {
  let temporary: string | undefined;
  try {
    if (!journal.snapshot_manifest_path || !journal.snapshot_manifest_sha256) throw blocked("Migration backup reference is incomplete");
    const path = checkedSnapshotPath(root, journal.snapshot_manifest_path);
    if (snapshotHash(path) !== journal.snapshot_manifest_sha256) throw blocked("Migration backup manifest hash changed");
    const verification = await verifySnapshot(path);
    if (!verification.ok || !verification.manifest?.can_restore || verification.manifest.snapshot_kind !== "internal_restore") throw blocked("Migration backup failed snapshot/replay verification");
    temporary = mkdtempSync(join(tmpdir(), "comath-migration-restore-"));
    await restoreSnapshot(path, temporary, { actor: "research-migration" });
    // Restore performs the original snapshot/replay verifier; also verify every installed byte.
    for (const entry of verification.manifest.entries) {
      const restored = resolve(temporary, entry.relative_path);
      if (!restored.startsWith(resolve(temporary) + sep) || snapshotHash(restored) !== entry.sha256) throw blocked("Restored migration bytes do not match snapshot");
    }
    journal.restore_verified_at = new Date(clock.now()).toISOString();
    journal.phase = "restore_verified";
    writeAtomic(migrationFile(root, "journal"), journal);
  } catch (error) { if (error instanceof ComathError && error.code === "MIGRATION_BLOCKED") throw error; throw blocked(`Migration restore verification failed: ${String(error)}`); }
  finally {
    if (temporary && resolve(temporary).startsWith(resolve(tmpdir()) + sep)) rmSync(temporary, { recursive: true, force: true });
  }
}
/** Does not create/upgrade research schema. The returned receipt authorizes that next short step. */
export async function ensureResearchControlReady(layout: ResearchLayout, owner: DaemonOwner, clock: ResearchClock,
  options: ResearchMigrationOptions = {}): Promise<ResearchMigrationReceipt> {
  if (owner.root !== layout.root) throw blocked("Migration requires the same project's owner");
  if (layout.kind === "current" && layout.receipt) return layout.receipt;
  if (layout.schemaVersion > RESEARCH_SCHEMA_VERSION) throw blocked(`Unsupported future research schema ${layout.schemaVersion}`);
  const root = layout.root;
  let journal = layout.journal;
  if (!journal) {
    journal = { schema_version: 1, database_schema_version: 1, root, origin: layout.kind === "fresh" ? "fresh" : "legacy",
      created_at: new Date(clock.now()).toISOString(), phase: "started" };
    writeAtomic(migrationFile(root, "journal"), journal);
  }
  if (journal.origin === "legacy") {
    await requireQuiescence(root, options);
    if (!journal.snapshot_manifest_path) {
      try {
        const metadata = JSON.parse(readFileSync(join(root, ".comath", "project.json"), "utf8")) as { project_id?: string };
        if (!metadata.project_id) throw blocked("Legacy project metadata is missing its project ID");
        const snapshot = await withDaemonOwnerMaintenance(owner, () => exportSnapshot(root, { project_id: metadata.project_id!, actor: "research-migration", audience: "internal_restore" }));
        journal.snapshot_manifest_path = snapshot.manifest_path;
        journal.snapshot_manifest_sha256 = snapshotHash(snapshot.manifest_path);
        journal.phase = "backup_created";
        writeAtomic(migrationFile(root, "journal"), journal);
      } catch (error) { if (error instanceof ComathError && error.code === "MIGRATION_BLOCKED") throw error; throw blocked(`Migration snapshot failed: ${String(error)}`); }
    }
    await verifyRestorableBackup(root, journal, clock);
    const { phase: _phase, ...receipt } = journal;
    await options.afterRestoreVerified?.(receipt);
  }
  const { phase: _phase, ...receipt } = journal;
  return receipt;
}
/** Called only after the schema transaction and legacy ID import completed successfully. */
export function finalizeResearchMigration(root: string, receipt: ResearchMigrationReceipt): void {
  if (receipt.root !== root || readVersion(root) !== RESEARCH_SCHEMA_VERSION) throw blocked("Schema is not ready for migration receipt");
  writeAtomic(migrationFile(root, "receipt"), receiptSchema.parse(receipt));
}

/**
 * Restore a verified internal snapshot only while the caller holds the project
 * owner. Callers must stop the new daemon before acquiring that owner; this is
 * deliberately not a binary-replacement shortcut or a public download import.
 */
export async function rollbackResearchControlSnapshot(projectRoot: string, manifestPath: string, owner: DaemonOwner): Promise<ResearchRollbackResult> {
  const root = realpathSync(projectRoot);
  if (owner.root !== root) throw blocked("Rollback owner belongs to another root");
  const snapshot = checkedSnapshotPath(root, manifestPath);
  const verification = await verifySnapshot(snapshot);
  if (!verification.ok || !verification.manifest) throw new ComathError("Rollback snapshot verification failed", { code: "SNAPSHOT_VERIFICATION_FAILED", statusCode: 409 });
  if (!verification.manifest.can_restore || verification.manifest.snapshot_kind !== "internal_restore") {
    throw new ComathError("Public snapshot downloads cannot be used for rollback", { code: "SNAPSHOT_PUBLIC_DOWNLOAD_NOT_RESTORABLE", statusCode: 409 });
  }
  const snapshotHasDatabase = verification.manifest.entries.some(entry => entry.relative_path === ".comath/control/research.sqlite");
  const rollbackPath = rollbackIntentFile(root);
  let rollbackIntent: ResearchRollbackIntent | undefined;
  if (!snapshotHasDatabase && existsSync(rollbackPath)) {
    try { rollbackIntent = rollbackIntentSchema.parse(JSON.parse(readFileSync(rollbackPath, "utf8"))); }
    catch { throw blocked("Rollback recovery intent is invalid"); }
    const backupPath = checkedSnapshotPath(root, rollbackIntent.control_backup_manifest_path);
    const backupVerification = await verifySnapshot(backupPath);
    if (rollbackIntent.root !== root || rollbackIntent.project_id !== verification.manifest.project_id
      || checkedSnapshotPath(root, rollbackIntent.snapshot_manifest_path) !== snapshot
      || rollbackIntent.snapshot_manifest_sha256 !== snapshotHash(snapshot)
      || snapshotHash(backupPath) !== rollbackIntent.control_backup_manifest_sha256
      || !backupVerification.ok || !backupVerification.manifest?.can_restore || backupVerification.manifest.snapshot_kind !== "internal_restore"
      || backupVerification.manifest.project_id !== rollbackIntent.project_id
      || !backupVerification.manifest.entries.some(entry => entry.relative_path === ".comath/control/research.sqlite")) {
      throw blocked("Rollback recovery intent no longer matches its verified snapshots");
    }
    const receiptPath = migrationFile(root, "receipt");
    if (rollbackIntent.phase === "restoring" && (!existsSync(receiptPath)
      || snapshotHash(receiptPath) !== rollbackIntent.migration_receipt_sha256
      || readVersion(root, true) !== RESEARCH_SCHEMA_VERSION)) throw blocked("Interrupted rollback lost its migration authorization state");
    if (existsSync(receiptPath) && snapshotHash(receiptPath) !== rollbackIntent.migration_receipt_sha256) throw blocked("Rollback migration receipt changed during recovery");
  }
  if (!snapshotHasDatabase && !rollbackIntent) {
    const receiptPath = migrationFile(root, "receipt");
    if (!existsSync(receiptPath)) throw blocked("Rollback snapshot has no research control database");
    let receipt: ResearchMigrationReceipt;
    try { receipt = receiptSchema.parse(JSON.parse(readFileSync(receiptPath, "utf8"))); }
    catch { throw blocked("Rollback migration receipt is invalid"); }
    if (receipt.root !== root || receipt.origin !== "legacy" || !receipt.restore_verified_at
      || !receipt.snapshot_manifest_path || !receipt.snapshot_manifest_sha256
      || checkedSnapshotPath(root, receipt.snapshot_manifest_path) !== snapshot
      || snapshotHash(snapshot) !== receipt.snapshot_manifest_sha256
      || readVersion(root, true) !== RESEARCH_SCHEMA_VERSION) {
      throw blocked("Rollback snapshot is not the verified pre-migration backup");
    }
    const metadata = JSON.parse(readFileSync(join(root, ".comath", "project.json"), "utf8")) as { project_id?: string };
    if (metadata.project_id !== verification.manifest.project_id) throw blocked("Rollback snapshot belongs to another project");
  }
  let staging: string | undefined;
  try {
    staging = mkdtempSync(join(tmpdir(), "comath-rollback-verify-"));
    await restoreSnapshot(snapshot, staging, { actor: "research-rollback-verify" });
    if (existsSync(researchDatabasePath(staging)) !== snapshotHasDatabase) throw blocked("Rollback staging control database differs from snapshot");
    return await withDaemonOwnerMaintenance(owner, async () => {
      if (!snapshotHasDatabase && !rollbackIntent) {
        // Preserve the v1 control state before returning a pre-schema project to the old binary.
        const backup = await exportSnapshot(root, { project_id: verification.manifest!.project_id, actor: "research-rollback", audience: "internal_restore" });
        const checked = await verifySnapshot(backup.manifest_path);
        if (!checked.ok || !checked.manifest?.can_restore || !checked.manifest.entries.some(entry => entry.relative_path === ".comath/control/research.sqlite")) {
          throw blocked("New research control backup failed verification");
        }
        const backupStaging = mkdtempSync(join(tmpdir(), "comath-rollback-backup-"));
        try {
          await restoreSnapshot(backup.manifest_path, backupStaging, { actor: "research-rollback-backup-verify" });
          if (readVersion(backupStaging, true) !== RESEARCH_SCHEMA_VERSION) throw blocked("New research control backup cannot restore its schema");
        } finally { rmSync(backupStaging, { recursive: true, force: true }); }
        rollbackIntent = rollbackIntentSchema.parse({ schema_version: 1, root, project_id: verification.manifest!.project_id,
          snapshot_manifest_path: snapshot, snapshot_manifest_sha256: snapshotHash(snapshot),
          control_backup_manifest_path: backup.manifest_path, control_backup_manifest_sha256: snapshotHash(backup.manifest_path),
          migration_receipt_sha256: snapshotHash(migrationFile(root, "receipt")), phase: "restoring", created_at: new Date().toISOString() });
        writeAtomic(rollbackPath, rollbackIntent);
      }
      // SQLite sidecars from the newer daemon must never accompany old bytes.
      if (snapshotHasDatabase) for (const path of [researchDatabasePath(root), resolveResearchControlPath(root, "research.sqlite-wal"), resolveResearchControlPath(root, "research.sqlite-shm"),
        migrationFile(root, "receipt"), migrationFile(root, "journal")]) rmSync(path, { force: true });
      const restored = await restoreSnapshot(snapshot, root, { actor: "research-rollback" });
      if (snapshotHasDatabase && !existsSync(researchDatabasePath(root))) throw blocked("Rollback restore did not install the selected control database state");
      if (!snapshotHasDatabase) {
        if (!rollbackIntent) throw blocked("Pre-schema rollback intent is unavailable");
        rollbackIntent = rollbackIntentSchema.parse({ ...rollbackIntent, phase: "restored" });
        writeAtomic(rollbackPath, rollbackIntent);
        for (const path of [researchDatabasePath(root), resolveResearchControlPath(root, "research.sqlite-wal"), resolveResearchControlPath(root, "research.sqlite-shm"),
          migrationFile(root, "receipt"), migrationFile(root, "journal")]) rmSync(path, { force: true });
        if (existsSync(researchDatabasePath(root))) throw blocked("Pre-schema rollback retained the newer control database");
        rmSync(rollbackPath, { force: true });
      }
      return { ...restored, database_schema_version: snapshotHasDatabase ? readVersion(root, true) : 0 };
    });
  } finally {
    if (staging && resolve(staging).startsWith(resolve(tmpdir()) + sep)) rmSync(staging, { recursive: true, force: true });
  }
}
