import { realpath, stat } from "node:fs/promises";
import { z } from "zod";
import { sha256File } from "../artifacts/hash.js";
import { researchConfigSchema, type ComathConfig } from "../config/config.js";
import { ComathError } from "../errors.js";
import { probeResearchLayout } from "../research/research-migration.js";

const configSchema = z.strictObject({ version: z.number().int().positive(), allowShell: z.literal(false), research: researchConfigSchema.optional() });
export type CredentialPresence = { configured: boolean; present: boolean };
export type RuntimeBinaryInspection = {
  configured: boolean;
  status: "not_configured" | "verified" | "missing" | "not_file" | "unreadable" | "changed_during_read";
  sha256?: string; size_bytes?: number; code?: string;
};
export type RuntimeDoctorReport = {
  schema_version: 1; project_root: string;
  layout: { status: "ok" | "error"; kind?: "fresh" | "legacy" | "current" | "partial"; schema_version?: number; code?: string };
  sqlite: { available: boolean; node_version: string; version?: string; code?: string };
  runtimes: Record<string, {
    kind: string; binary: RuntimeBinaryInspection; credentials: CredentialPresence; model_policy_ids: string[];
    sandbox: { requested: "deferred" | "native"; readiness: "deferred" | "unverified"; verified: false };
    live_verified: false;
  }>;
  credentials: { operator: CredentialPresence; host_approval: CredentialPresence };
  research_enabled: boolean; live_enabled: false; proof_authority: "none";
};
function presence(environmentName?: string): CredentialPresence {
  return { configured: environmentName !== undefined, present: environmentName !== undefined && Boolean(process.env[environmentName]?.trim()) };
}
function fileErrorCode(error: unknown): string {
  const code = (error as NodeJS.ErrnoException | undefined)?.code;
  return typeof code === "string" && /^[A-Z][A-Z0-9_]{0,63}$/.test(code) ? code : "FILE_READ_FAILED";
}
async function inspectBinary(path?: string): Promise<RuntimeBinaryInspection> {
  if (path === undefined) return { configured: false, status: "not_configured" };
  try {
    const canonical = await realpath(path), before = await stat(canonical);
    if (!before.isFile()) return { configured: true, status: "not_file", code: "RUNTIME_BINARY_NOT_FILE" };
    const digest = await sha256File(canonical), after = await stat(canonical);
    if (before.size !== after.size || before.mtimeMs !== after.mtimeMs || before.ino !== after.ino || before.dev !== after.dev || digest.size_bytes !== after.size) {
      return { configured: true, status: "changed_during_read", code: "RUNTIME_BINARY_CHANGED" };
    }
    return { configured: true, status: "verified", sha256: digest.sha256, size_bytes: digest.size_bytes };
  } catch (error) {
    const code = fileErrorCode(error);
    return { configured: true, status: code === "ENOENT" || code === "ENOTDIR" ? "missing" : "unreadable", code };
  }
}
async function inspectSqlite(): Promise<RuntimeDoctorReport["sqlite"]> {
  try {
    const { DatabaseSync } = await import("node:sqlite");
    const database = new DatabaseSync(":memory:");
    try {
      const row = database.prepare("SELECT sqlite_version() AS version").get();
      if (!row || typeof row.version !== "string") return { available: false, node_version: process.versions.node, code: "SQLITE_PROBE_INVALID" };
      return { available: true, node_version: process.versions.node, version: row.version };
    } finally { database.close(); }
  } catch {
    return { available: false, node_version: process.versions.node, code: "SQLITE_UNAVAILABLE" };
  }
}

/** Read-only local evidence. No configured binary, provider, model, operator or sandbox is launched. */
export async function inspectRuntimeDoctor(projectRoot: string, input: ComathConfig): Promise<RuntimeDoctorReport> {
  const parsed = configSchema.safeParse(input);
  if (!parsed.success) throw new ComathError("Runtime doctor received invalid configuration or unresolved model/provider/runtime references", { code: "RUNTIME_DOCTOR_CONFIG_INVALID", statusCode: 400 });
  let root: string;
  try {
    root = await realpath(projectRoot);
    if (!(await stat(root)).isDirectory()) throw new Error("not a directory");
  } catch {
    throw new ComathError("Runtime doctor project root is missing, unreadable or not a directory", { code: "RUNTIME_DOCTOR_ROOT_INVALID", statusCode: 400 });
  }
  const config = parsed.data, research = config.research;
  let layout: RuntimeDoctorReport["layout"];
  try {
    const probed = probeResearchLayout(root, { strictReadOnly: true });
    layout = { status: "ok", kind: probed.kind, schema_version: probed.schemaVersion };
  } catch (error) {
    // Migration errors can contain invalid JSON snippets. Report their code, never their raw message.
    layout = { status: "error", code: error instanceof ComathError ? error.code : "RUNTIME_LAYOUT_UNREADABLE" };
  }
  const sqlite = await inspectSqlite();
  const runtimes = Object.fromEntries(await Promise.all(Object.entries(research?.runtimes ?? {}).map(async ([id, runtime]) => [id, {
    kind: runtime.kind,
    binary: await inspectBinary(runtime.binary),
    credentials: presence(runtime.provider_secret_env),
    model_policy_ids: Object.entries(research?.model_policies ?? {}).filter(([, model]) => model.runtime_id === id).map(([modelId]) => modelId).sort(),
    sandbox: { requested: runtime.sandbox_mode, readiness: runtime.sandbox_mode === "deferred" ? "deferred" as const : "unverified" as const, verified: false as const },
    live_verified: false as const
  }])));
  return { schema_version: 1, project_root: root, layout, sqlite, runtimes,
    credentials: { operator: presence(research?.operator_token_env), host_approval: presence(research?.host_approval_token_env) },
    research_enabled: research?.enabled ?? false, live_enabled: false, proof_authority: "none" };
}
