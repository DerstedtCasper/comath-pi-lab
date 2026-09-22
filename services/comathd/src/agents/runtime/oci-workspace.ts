import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { isAbsolute, relative, resolve } from "node:path";
import { ComathError } from "../../errors.js";

const scopePart = /^[A-Za-z0-9_-]{1,160}$/;
const digestImage = /^(?:[a-z0-9][a-z0-9._/:-]*@)?sha256:[a-f0-9]{64}$/;
const containerUser = /^[1-9][0-9]{0,9}:[1-9][0-9]{0,9}$/;
const environmentNames = ["CODEX_HOME", "COMATH_PROVIDER_API_KEY", "COMATH_WORKER_TOKEN", "COMATH_WORKER_GATEWAY_URL", "COMATH_TASK_ID", "COMATH_GENERATION"] as const;

export type OciCodexCommand = { program: string; args: string[]; container_name: string; environment_names: readonly string[] };
export type OciCodexCommandInput = {
  engine_binary: string; image_id: string; container_user: string;
  campaign_id: string; task_id: string; generation: number;
  workspace: string; context: string; runtime_home: string; gateway_url: string;
  host_platform: NodeJS.Platform; memory_mb?: number; cpu_count?: number; pids_limit?: number;
};

function fail(code: string): never { throw new ComathError(code, { code, statusCode: 409 }); }
function pathKey(value: string): string { const resolved = resolve(value); return process.platform === "win32" ? resolved.toLowerCase() : resolved; }
function overlaps(left: string, right: string): boolean {
  const rel = relative(left, right);
  return rel === "" || (!rel.startsWith(`..${String.fromCharCode(92)}`) && rel !== ".." && !rel.startsWith("../") && !isAbsolute(rel));
}
function requirePath(value: string): string {
  if (typeof value !== "string" || !isAbsolute(value) || value.includes("\0") || value.includes(",")) fail("OCI_WORKSPACE_LAYOUT_INVALID");
  return resolve(value);
}
function requireBounded(value: number | undefined, fallback: number, min: number, max: number): number {
  const selected = value ?? fallback;
  if (!Number.isSafeInteger(selected) || selected < min || selected > max) fail("OCI_RESOURCE_LIMIT_INVALID");
  return selected;
}

/**
 * Renders the only supported OCI worker command. The caller cannot add mounts,
 * credentials, a shell, or an alternate in-container program.
 */
export function buildOciCodexCommand(input: OciCodexCommandInput): OciCodexCommand {
  if (typeof input.engine_binary !== "string" || !isAbsolute(input.engine_binary) || input.engine_binary.includes("\0")) fail("OCI_ENGINE_CONFIG_INVALID");
  if (typeof input.image_id !== "string" || !digestImage.test(input.image_id)) fail("OCI_IMAGE_NOT_IMMUTABLE");
  if (typeof input.container_user !== "string" || !containerUser.test(input.container_user)) fail("OCI_CONTAINER_USER_INVALID");
  if (![input.campaign_id, input.task_id].every(value => typeof value === "string" && scopePart.test(value))
    || !Number.isSafeInteger(input.generation) || input.generation < 1) fail("OCI_WORKSPACE_LAYOUT_INVALID");
  const workspace = requirePath(input.workspace), context = requirePath(input.context), runtimeHome = requirePath(input.runtime_home);
  const keys = [pathKey(workspace), pathKey(context), pathKey(runtimeHome)];
  if (new Set(keys).size !== keys.length || overlaps(workspace, context) || overlaps(workspace, runtimeHome) || overlaps(context, runtimeHome)) fail("OCI_WORKSPACE_LAYOUT_INVALID");
  let gateway: URL;
  try { gateway = new URL(input.gateway_url); } catch { fail("OCI_GATEWAY_UNAVAILABLE"); }
  if (!["http:", "https:"].includes(gateway.protocol) || gateway.hostname !== "host.docker.internal" || gateway.username || gateway.password || gateway.search || gateway.hash) {
    fail("OCI_GATEWAY_UNAVAILABLE");
  }
  const memoryMb = requireBounded(input.memory_mb, 2048, 128, 65536);
  const cpuCount = requireBounded(input.cpu_count, 2, 1, 64);
  const pidsLimit = requireBounded(input.pids_limit, 256, 32, 8192);
  const containerName = `comath-${createHash("sha256").update(`${input.campaign_id}\0${input.task_id}\0${input.generation}`).digest("hex").slice(0, 32)}`;
  const mount = (source: string, target: string, readOnly: boolean) => `type=bind,src=${source},dst=${target}${readOnly ? ",readonly" : ""},bind-propagation=rprivate`;
  const args = [
    "run", "--rm", "--init", "--interactive", "--name", containerName,
    "--label", "comath.managed=true", "--label", `comath.campaign_id=${input.campaign_id}`,
    "--label", `comath.task_id=${input.task_id}`, "--label", `comath.generation=${input.generation}`,
    "--read-only", "--user", input.container_user, "--cap-drop", "ALL", "--security-opt", "no-new-privileges",
    "--pids-limit", String(pidsLimit), "--memory", `${memoryMb}m`, "--cpus", String(cpuCount), "--network", "bridge",
    "--tmpfs", "/tmp:rw,nosuid,nodev,noexec,size=64m",
    "--mount", mount(workspace, "/work", false), "--mount", mount(context, "/context", true), "--mount", mount(runtimeHome, "/runtime/codex", false),
    "--workdir", "/work",
    ...(input.host_platform === "win32" ? [] : ["--add-host", "host.docker.internal:host-gateway"]),
    ...environmentNames.flatMap(name => ["--env", name]),
    input.image_id, "/usr/local/bin/codex", "app-server", "--strict-config", "--listen", "stdio://"
  ];
  return { program: input.engine_binary, args, container_name: containerName, environment_names: environmentNames };
}

type EngineResult = { code: number | null; output: string };
function runEngine(program: string, args: string[], timeoutMs: number): Promise<EngineResult> {
  return new Promise(resolveResult => {
    let output = "", settled = false;
    const settle = (value: EngineResult) => { if (!settled) { settled = true; resolveResult(value); } };
    let child;
    try { child = spawn(program, args, { shell: false, windowsHide: true, stdio: ["ignore", "ignore", "pipe"] }); }
    catch { settle({ code: null, output: "" }); return; }
    const timer = setTimeout(() => { child.kill(); settle({ code: null, output }); }, timeoutMs);
    child.stderr.on("data", chunk => { if (output.length < 4096) output += String(chunk).slice(0, 4096 - output.length); });
    child.once("error", () => { clearTimeout(timer); settle({ code: null, output }); });
    child.once("exit", code => { clearTimeout(timer); settle({ code, output }); });
  });
}

/** A docker-client exit alone is insufficient; confirm the named owned container is gone. */
export async function removeOciContainer(plan: Pick<OciCodexCommand, "program" | "container_name">, timeoutMs: number): Promise<boolean> {
  if (!Number.isSafeInteger(timeoutMs) || timeoutMs < 1 || timeoutMs > 120000) fail("OCI_RESOURCE_LIMIT_INVALID");
  const removed = await runEngine(plan.program, ["container", "rm", "--force", plan.container_name], timeoutMs);
  if (removed.code === 0) return true;
  const inspected = await runEngine(plan.program, ["container", "inspect", plan.container_name], timeoutMs);
  return inspected.code !== 0 && /no such (?:container|object)/i.test(`${removed.output}\n${inspected.output}`);
}
