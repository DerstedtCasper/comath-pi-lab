import { spawn } from 'node:child_process';
import { createInterface } from 'node:readline';
import { existsSync } from 'node:fs';
import { readFile, writeFile, rename, mkdir, unlink } from 'node:fs/promises';
import { dirname, isAbsolute, relative, resolve } from 'node:path';

const MAX_LINE = 1024 * 1024;
function requireRequest(value) {
  if (!value || value.version !== 1 || typeof value.request_id !== 'string' || !value.request_id || typeof value.tool !== 'string' || !value.tool) throw Error('Invalid Pi operator request');
  return value;
}
function customDetails(value) {
  if (!value || typeof value !== 'object') return undefined;
  if (value.customType === 'comath.operator.response.v1' && value.details) return value.details;
  for (const key of ['message', 'data', 'params', 'payload']) {
    const found = customDetails(value[key]); if (found) return found;
  }
  return undefined;
}
function operatorEnvironment() {
  const env = { ...process.env };
  for (const key of Object.keys(env)) if (/HOST_APPROVAL|PROVIDER.*(KEY|TOKEN|SECRET)|WORKER.*(TOKEN|KEY|SECRET)/i.test(key)) delete env[key];
  return env;
}
function packageSkillPath(extension) {
  const skill = resolve(dirname(extension), '..', 'skills', 'comath-pi-operator');
  if (!existsSync(resolve(skill, 'SKILL.md'))) throw Error('PI_OPERATOR_PACKAGE_SKILL_MISSING');
  return skill;
}

/** Run exactly one Pi RPC operator command. A process exit alone is never a receipt. */
export async function runOperatorRequest(raw, options) {
  const request = requireRequest(raw), pi = options?.pi, extension = options?.extension, project = options?.project;
  if (!pi || !isAbsolute(pi) || !extension || !isAbsolute(extension) || !project || !isAbsolute(project)) throw Error('pi, extension, and project must be absolute paths');
  const timeout = Number.isSafeInteger(options?.timeout_ms) ? options.timeout_ms : 30000;
  if (timeout < 1 || timeout > 120000) throw Error('Invalid timeout_ms');
  const skills = options?.loadPackageSkill === true ? ['--no-skills', '--skill', packageSkillPath(extension)] : ['--no-skills'];
  const child = spawn(pi, [...(options.piArgs ?? []), '--mode', 'rpc', '--no-session', '--no-tools', ...skills, '--no-prompt-templates', '--provider', 'openai', '--model', 'gpt-4o-mini', '--extension', extension],
    { cwd: project, env: operatorEnvironment(), stdio: ['pipe', 'pipe', 'pipe'], windowsHide: true });
  let stderr = '', settled = false, timer;
  const finish = (resolve, reject, value, error) => {
    if (settled) return; settled = true; clearTimeout(timer); child.stdout.destroy(); child.stderr.destroy(); child.stdin.end();
    if (!child.killed) child.kill(); error ? reject(error) : resolve(value);
  };
  const result = await new Promise((resolve, reject) => {
    timer = setTimeout(() => finish(resolve, reject, undefined, Error('PI_OPERATOR_TIMEOUT')), timeout);
    const output = createInterface({ input: child.stdout, crlfDelay: Infinity });
    output.on('line', line => {
      if (Buffer.byteLength(line, 'utf8') > MAX_LINE) return finish(resolve, reject, undefined, Error('PI_OPERATOR_PROTOCOL_LIMIT'));
      try {
        const details = customDetails(JSON.parse(line));
        if (!details || details.request_id !== request.request_id) return;
        if (details.version !== 1 || details.tool !== request.tool || !details.result) return finish(resolve, reject, undefined, Error('PI_OPERATOR_PROTOCOL_INVALID'));
        finish(resolve, reject, details);
      } catch { /* Pi diagnostics are allowed on stdout only when not JSON. */ }
    });
    child.stderr.on('data', chunk => { stderr += chunk.toString('utf8'); if (Buffer.byteLength(stderr, 'utf8') > 64 * 1024) stderr = stderr.slice(-64 * 1024); });
    child.on('error', error => finish(resolve, reject, undefined, error));
    child.on('close', code => { if (!settled) finish(resolve, reject, undefined, Error(`PI_OPERATOR_NO_RECEIPT:${code ?? 'signal'}:${stderr.slice(0, 512)}`)); });
    child.stdin.write(`${JSON.stringify({ id: request.request_id, type: 'prompt', message: `/cm:operator ${JSON.stringify(request)}` })}\n`);
  });
  return result;
}

function safeHandoffPath(file, project) {
  if (!file || !isAbsolute(file)) throw Error('handoffFile must be absolute');
  const target = resolve(file), control = resolve(project, '.comath'), inside = relative(control, target);
  if (inside === '' || (!inside.startsWith('..') && !isAbsolute(inside))) throw Error('handoffFile must not be inside .comath');
  return target;
}
async function readHandoff(path) {
  try { const value = JSON.parse(await readFile(path, 'utf8')); return value && value.version === 1 ? value : {}; } catch (error) { if (error?.code === 'ENOENT') return {}; throw Error('PI_OPERATOR_HANDOFF_INVALID'); }
}
async function writeHandoff(path, state) {
  await mkdir(dirname(path), { recursive: true }); const temporary = `${path}.${process.pid}.${Date.now()}.tmp`;
  await writeFile(temporary, `${JSON.stringify(state)}\n`, { encoding: 'utf8', flag: 'wx' }); await rename(temporary, path);
}
async function withHandoffLock(path, work) {
  const lock = `${path}.lock`; await mkdir(dirname(path), { recursive: true });
  try { await writeFile(lock, `${process.pid}\n`, { encoding: 'utf8', flag: 'wx' }); }
  catch (error) { if (error?.code === 'EEXIST') throw Error('PI_OPERATOR_HANDOFF_BUSY'); throw error; }
  try { return await work(); } finally { await unlink(lock).catch(error => { if (error?.code !== 'ENOENT') throw error; }); }
}
function canonicalJson(value) {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
  if (value && typeof value === 'object') return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${canonicalJson(value[key])}`).join(',')}}`;
  return JSON.stringify(value);
}
function samePendingRequest(pending, request) {
  return pending && pending.tool === request.tool && canonicalJson(pending.input) === canonicalJson(request.input);
}
function startCommandId(request) {
  const value = request?.tool === 'research_campaign_start' && request.input && typeof request.input === 'object' ? request.input.command_id : undefined;
  return typeof value === 'string' && value ? value : undefined;
}
async function recoverPendingStart(prior, request, options) {
  const commandId = startCommandId(request), pendingCommandId = startCommandId(prior.pending_mutation);
  if (!commandId || commandId !== pendingCommandId) return undefined;
  const lookup = await runOperatorRequest({ version: 1, request_id: `${request.request_id}-recover`, tool: 'research_campaign_list', input: { command_id: commandId, limit: 2 } }, options).catch(() => undefined);
  const campaigns = lookup?.result?.ok && lookup.result.data && typeof lookup.result.data === 'object' && Array.isArray(lookup.result.data.campaigns) ? lookup.result.data.campaigns : [];
  if (campaigns.length !== 1 || !campaigns[0] || typeof campaigns[0].campaign_id !== 'string') return undefined;
  return { version: 1, request_id: request.request_id, tool: request.tool, result: { ok: true, data: campaigns[0] } };
}
/** Persist a non-authoritative recovery hint around exactly one operator request. */
export async function runWithHandoff(raw, options) {
  const request = requireRequest(raw), handoff = safeHandoffPath(options?.handoffFile, options?.project);
  return withHandoffLock(handoff, async () => {
    const prior = await readHandoff(handoff), pending = { tool: request.tool, input: request.input, request_id: request.request_id };
    if (prior.pending_mutation && !samePendingRequest(prior.pending_mutation, request)) throw Error('PI_OPERATOR_PENDING_MUTATION');
    const recovered = prior.pending_mutation ? await recoverPendingStart(prior, request, options) : undefined;
    const result = recovered ?? await (async () => {
      await writeHandoff(handoff, { version: 1, project_root: resolve(options.project), project_id: prior.project_id ?? null, campaign_id: prior.campaign_id ?? null,
        start_command_id: prior.start_command_id ?? null, last_event_seq: prior.last_event_seq ?? 0, last_request_id: prior.last_request_id ?? null, pending_mutation: pending });
      return runOperatorRequest(request, options);
    })();
    const data = result.result.ok && result.result.data && typeof result.result.data === 'object' ? result.result.data : {};
    await writeHandoff(handoff, { version: 1, project_root: resolve(options.project), project_id: data.project_id ?? prior.project_id ?? null,
      campaign_id: data.campaign_id ?? prior.campaign_id ?? null, start_command_id: request.tool === 'research_campaign_start' ? request.input?.command_id ?? null : prior.start_command_id ?? null,
      last_event_seq: Number.isSafeInteger(data.snapshot_seq) ? data.snapshot_seq : prior.last_event_seq ?? 0, last_request_id: request.request_id, pending_mutation: null });
    return result;
  });
}

function parseArgs(args) {
  const value = { piArgs: [] };
  for (let i = 0; i < args.length; i++) {
    const key = args[i];
    if (key === '--stdio') value.stdio = true;
    else if (key === '--load-package-skill') value.load_package_skill = true;
    else if (key === '--pi-arg') value.piArgs.push(args[++i]);
    else if (['--pi', '--extension', '--project', '--request-file', '--handoff-file'].includes(key)) value[key.slice(2).replace(/-/g, '_')] = args[++i];
    else if (key === '--timeout-ms') value.timeout_ms = Number(args[++i]);
    else throw Error(`Unknown argument: ${key}`);
  }
  return value;
}
async function main() {
  const options = parseArgs(process.argv.slice(2));
  const common = { pi: options.pi, piArgs: options.piArgs, extension: options.extension, project: options.project, timeout_ms: options.timeout_ms, ...(options.load_package_skill ? { loadPackageSkill: true } : {}), ...(options.handoff_file ? { handoffFile: options.handoff_file } : {}) };
  const execute = request => options.handoff_file ? runWithHandoff(request, common) : runOperatorRequest(request, common);
  if (options.request_file) {
    const request = JSON.parse(await readFile(resolve(options.request_file), 'utf8')); process.stdout.write(`${JSON.stringify(await execute(request))}\n`); return;
  }
  if (!options.stdio) throw Error('Use --request-file or --stdio');
  const lines = createInterface({ input: process.stdin, crlfDelay: Infinity });
  for await (const line of lines) {
    try { process.stdout.write(`${JSON.stringify(await execute(JSON.parse(line)))}\n`); }
    catch (error) { process.stdout.write(`${JSON.stringify({ version: 1, request_id: 'invalid', tool: 'invalid', result: { ok: false, code: 'PI_OPERATOR_ERROR', error: error instanceof Error ? error.message : String(error) } })}\n`); }
  }
}
if (process.argv[1] && new URL(import.meta.url).pathname === new URL(`file://${process.argv[1].replace(/\\/g, '/')}`).pathname) {
  main().catch(error => { process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`); process.exitCode = 1; });
}
