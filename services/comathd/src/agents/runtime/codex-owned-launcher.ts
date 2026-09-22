import { createHash, timingSafeEqual } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { isAbsolute, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { ComathError } from "../../errors.js";
import type { ResearchConfig } from "../../config/config.js";
import type { ProjectRuntime } from "../../research/project-runtime.js";
import type { ResearchGrant } from "../../research/portfolio-scheduler.js";
import { canonicalJson } from "../../verification/runner-contracts.js";
import { describeNativeWorkspace, requireNativeSandboxReady } from "./native-workspace.js";
import { buildOciCodexCommand, removeOciContainer } from "./oci-workspace.js";
import { startOwnedProcessSession } from "./owned-process-session.js";
import { createCodexAppServerAdapter, type CodexOwnedTransport } from "./codex-app-server-adapter.js";
import type { AgentRuntimeAdapter, StartWorkerInput } from "./agent-runtime-adapter.js";

const digest = (value: string) => createHash("sha256").update(value).digest("hex");
function fail(code: string): never { throw new ComathError(code, { code, statusCode: 409 }); }
const tomlString = (value: string) => {
  if (typeof value !== "string" || /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/u.test(value)) fail("CODEX_HOST_CONFIG_INVALID");
  return JSON.stringify(value);
};

/** Secret-free generation configuration, usable by host tooling before sandbox rollout. */
export function renderCodexWorkerConfig(input: { model: string; provider: string; endpoint: string; workspace: string;
  node_binary: string; worker_mcp_script: string }): string {
  if (!/^[A-Za-z][A-Za-z0-9_-]{0,63}$/.test(input.provider) || !input.model.trim()
    || ![input.workspace, input.node_binary, input.worker_mcp_script].every(isAbsolute)) fail("CODEX_HOST_CONFIG_INVALID");
  let endpoint: URL; try { endpoint = new URL(input.endpoint); } catch { fail("CODEX_HOST_CONFIG_INVALID"); }
  if (!["http:", "https:"].includes(endpoint.protocol) || endpoint.username || endpoint.password || endpoint.search || endpoint.hash) fail("CODEX_HOST_CONFIG_INVALID");
  return [
    `model = ${tomlString(input.model)}`, `model_provider = ${tomlString(input.provider)}`,
    'approval_policy = "never"', 'sandbox_mode = "workspace-write"', 'cli_auth_credentials_store = "ephemeral"',
    'web_search = "disabled"', 'check_for_update_on_startup = false',
    '[history]', 'persistence = "none"', '[agents]', 'enabled = false',
    '[features]', 'multi_agent = false', 'shell_tool = false', 'apps = false', 'hooks = false', 'memories = false',
    'remote_plugin = false', 'goals = false', '[sandbox_workspace_write]', 'network_access = false',
    `writable_roots = [${tomlString(input.workspace)}]`, '[shell_environment_policy]', 'inherit = "none"',
    `[model_providers.${input.provider}]`, `name = ${tomlString(input.provider)}`, `base_url = ${tomlString(endpoint.href)}`,
    'wire_api = "responses"', 'env_key = "COMATH_PROVIDER_API_KEY"', 'requires_openai_auth = false',
    'request_max_retries = 0', 'stream_max_retries = 0',
    '[mcp_servers.comath_worker]', `command = ${tomlString(input.node_binary)}`,
    `args = [${tomlString(input.worker_mcp_script)}]`, `cwd = ${tomlString(input.workspace)}`,
    'env_vars = ["COMATH_WORKER_GATEWAY_URL", "COMATH_WORKER_TOKEN", "COMATH_TASK_ID", "COMATH_GENERATION"]',
    'required = true', ''
  ].join("\n");
}

export function createConfiguredCodexAdapter(runtime: ProjectRuntime, config: ResearchConfig, options: {
  buildPrompt: (input: StartWorkerInput) => Promise<string>;
  gatewayUrl: (sandboxMode: "deferred" | "native" | "oci") => string;
}): AgentRuntimeAdapter {
  function selection(input: StartWorkerInput) {
    const attempt = runtime.store.get("SELECT * FROM attempts WHERE attempt_key=?", input.attempt_key);
    const task = attempt && runtime.store.getTask(String(attempt.task_id));
    const supplied = Buffer.from(digest(input.lease_capability), "hex");
    const expected = Buffer.from(String(attempt?.lease_token_hash ?? ""), "hex");
    if (!task || !attempt || expected.length !== supplied.length || !timingSafeEqual(expected, supplied)
      || task.generation !== Number(attempt.generation) || !["leased", "running"].includes(task.status)
      || !["leased", "running"].includes(String(attempt.state)) || attempt.fenced_at || attempt.stop_requested_at
      || Date.parse(String(attempt.expires_at)) <= runtime.clock.now()
      || task.model_policy_id !== input.approved_model_policy_id || task.tool_policy_id !== input.approved_tool_policy_id
      || canonicalJson(task.scope) !== canonicalJson(input.scope) || canonicalJson(task.budget) !== canonicalJson(input.budget)
      || !runtime.store.get("SELECT attempt_key FROM permits WHERE attempt_key=? AND resource_key='worker:deployment'", input.attempt_key)) fail("CODEX_LAUNCH_SCOPE_DENIED");
    const model = config.model_policies[task.model_policy_id], host = model && config.runtimes[model.runtime_id];
    if (!model || !host || host.kind !== "codex-app-server") fail("CODEX_HOST_CONFIG_INVALID");
    const workspace = describeNativeWorkspace(runtime.root, { campaign_id: task.campaign_id, task_id: task.task_id, generation: task.generation });
    if (resolve(input.workspace.workspace_path) !== workspace.workspace || resolve(input.workspace.context_path) !== join(workspace.context, "context.json")) fail("CODEX_LAUNCH_SCOPE_DENIED");
    return { attempt, task, model, host, workspace };
  }
  async function launch(input: StartWorkerInput): Promise<CodexOwnedTransport> {
    input.signal.throwIfAborted();
    const { attempt, task, model, host, workspace } = selection(input);
    const useOci = host.sandbox_mode === "oci";
    // Deferred/native paths retain the fail-closed guard. OCI needs an explicit
    // immutable image and is the only path allowed to bypass it.
    if (!useOci) requireNativeSandboxReady(workspace);
    if ((!useOci && !host.binary) || !host.provider_endpoint || !host.provider_secret_env) fail("CODEX_HOST_CONFIG_INVALID");
    const oci = useOci ? host.oci : undefined;
    if (useOci && !oci) fail("OCI_RUNTIME_CONFIG_INVALID");
    const credential = process.env[host.provider_secret_env];
    if (!credential) fail("CODEX_PROVIDER_CREDENTIAL_UNAVAILABLE");
    const gateway = new URL(options.gatewayUrl(host.sandbox_mode));
    if (!["http:", "https:"].includes(gateway.protocol) || gateway.username || gateway.password || gateway.search || gateway.hash) fail("CODEX_GATEWAY_UNAVAILABLE");
    const workerPaths = useOci
      ? { workspace: "/work", runtime_home: "/runtime/codex", node_binary: "/usr/local/bin/node", worker_mcp_script: "/opt/comath/dist/control/worker-mcp.js" }
      : { workspace: workspace.workspace, runtime_home: workspace.runtime_home, node_binary: process.execPath,
        worker_mcp_script: fileURLToPath(new URL("../../control/worker-mcp.js", import.meta.url)) };
    const contents = renderCodexWorkerConfig({ model: model.model, provider: host.model_provider, endpoint: host.provider_endpoint,
      workspace: workerPaths.workspace, node_binary: workerPaths.node_binary, worker_mcp_script: workerPaths.worker_mcp_script });
    await mkdir(workspace.runtime_home, { recursive: true });
    await writeFile(join(workspace.runtime_home, "config.toml"), contents, { flag: "wx", flush: true });
    input.signal.throwIfAborted(); selection(input);
    const grant: ResearchGrant = { task_id: task.task_id, campaign_id: task.campaign_id, generation: task.generation,
      attempt_key: input.attempt_key, run_id: String(attempt.run_id), lease_token: input.lease_capability,
      expires_at: String(attempt.expires_at), provider_id: model.provider_id, runtime_id: model.runtime_id, model_policy_id: task.model_policy_id };
    const ociPlan = useOci ? buildOciCodexCommand({ engine_binary: oci!.engine_binary, image_id: oci!.image_id, container_user: oci!.container_user,
      campaign_id: task.campaign_id, task_id: task.task_id, generation: task.generation, workspace: workspace.workspace, context: workspace.context,
      runtime_home: workspace.runtime_home, gateway_url: gateway.href, host_platform: process.platform, memory_mb: oci!.memory_mb,
      cpu_count: oci!.cpu_count, pids_limit: oci!.pids_limit }) : undefined;
    const command = ociPlan ?? { program: host.binary!, args: ["app-server", "--strict-config", "--listen", "stdio://"] };
    const session = await startOwnedProcessSession({ runtime, grant, command,
      cwd: workspace.workspace, allowed_programs: [command.program], signal: input.signal, interactive: true,
      startup_timeout_ms: 30000, attempt_timeout_ms: task.budget.wall_ms, stop_timeout_ms: Math.min(120000, config.stop_grace_ms),
      onStarted: handle => {
        // Adapter handles replace runtime_handle_json later; retain independent process identity for recovery.
        const value = canonicalJson(handle);
        runtime.store.run("INSERT INTO commands(command_id,principal_id,request_sha256,response_json,status) VALUES (?,'service:owned-process',?,?,'committed')",
          `owned-process:${handle.nonce}`, digest(value), value);
      }
    }, { environment: { CODEX_HOME: workerPaths.runtime_home, COMATH_PROVIDER_API_KEY: credential,
      COMATH_WORKER_TOKEN: input.lease_capability, COMATH_WORKER_GATEWAY_URL: gateway.href,
      COMATH_TASK_ID: task.task_id, COMATH_GENERATION: String(task.generation) } });
    session.stderr.resume();
    return { stdin: session.stdin, stdout: session.stdout, owned_handle_id: session.handle.nonce, workspace_path: workerPaths.workspace,
      terminate: async () => {
        const processTerminated = await session.terminate();
        return processTerminated && (!ociPlan || await removeOciContainer(ociPlan, Math.min(120000, config.stop_grace_ms)));
      } };
  }
  const codexHosts = Object.values(config.runtimes).filter(host => host.kind === "codex-app-server");
  const isolation = codexHosts.length > 0 && codexHosts.every(host => host.sandbox_mode === "oci") ? "oci" as const : "process_boundary_only" as const;
  return createCodexAppServerAdapter({ model: "host-selected", model_provider: "host-selected", launch,
    resolvePolicy: input => { const selected = selection(input); return { model: selected.model.model, model_provider: selected.host.model_provider }; },
    buildPrompt: options.buildPrompt, isolation });
}
