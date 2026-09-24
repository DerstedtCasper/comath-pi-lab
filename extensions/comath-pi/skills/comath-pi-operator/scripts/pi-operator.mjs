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
function rpcResponse(value, requestId, command) {
  return value && typeof value === 'object' && value.type === 'response' && value.id === requestId && value.command === command && typeof value.success === 'boolean'
    ? value : undefined;
}
function promptResponse(value, requestId) { return rpcResponse(value, requestId, 'prompt'); }
function extensionError(value) {
  return value && typeof value === 'object' && value.type === 'extension_error'
    ? typeof value.error === 'string' ? value.error : 'unknown extension error' : undefined;
}
function pathKey(value) {
  if (typeof value !== 'string' || !value) return '';
  const path = resolve(value);
  return process.platform === 'win32' ? path.toLowerCase() : path;
}
function commandRegistrationError(value, extension) {
  const commands = value && typeof value === 'object' && Array.isArray(value.commands) ? value.commands : undefined;
  if (!commands) return 'PI_OPERATOR_COMMAND_DISCOVERY_INVALID';
  const registrations = commands.filter(command => command && typeof command === 'object' && command.name === 'cm:operator');
  if (registrations.length === 0) return 'PI_OPERATOR_COMMAND_UNAVAILABLE';
  if (registrations.length !== 1) return 'PI_OPERATOR_COMMAND_AMBIGUOUS';
  const registration = registrations[0];
  return registration.source === 'extension' && pathKey(registration.sourceInfo?.path) === pathKey(extension) ? undefined : 'PI_OPERATOR_COMMAND_ORIGIN_MISMATCH';
}
function operatorEnvironment() {
  const env = { ...process.env };
  const credentialName = /(?:^|_)(?:API|ACCESS|AUTH(?:ORIZATION)?|BEARER|CREDENTIALS?|PASSWORD|PRIVATE|SECRET|TOKEN|KEY)(?:_|$)/i;
  for (const key of Object.keys(env)) if (key !== 'COMATH_OPERATOR_TOKEN' && (credentialName.test(key) || /HOST_APPROVAL|PROVIDER|WORKER/i.test(key))) delete env[key];
  return env;
}
function packageSkillPath(extension) {
  const skill = resolve(dirname(extension), '..', 'skills', 'comath-pi-operator');
  if (!existsSync(resolve(skill, 'SKILL.md'))) throw Error('PI_OPERATOR_PACKAGE_SKILL_MISSING');
  return skill;
}
function requireAbsolutePath(value, name) {
  if (!value || !isAbsolute(value)) throw Error(`${name} must be absolute`);
  return resolve(value);
}
async function readPiVersion(pi, piArgs, timeout) {
  return await new Promise((resolveVersion, rejectVersion) => {
    const child = spawn(pi, [...(piArgs ?? []), '--version'], { env: operatorEnvironment(), stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true });
    let stdout = '', stderr = '', settled = false;
    const finish = (value, error) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      child.stdout.destroy();
      child.stderr.destroy();
      if (!child.killed) child.kill();
      if (error) rejectVersion(error); else resolveVersion(value);
    };
    const timer = setTimeout(() => finish(undefined, Error('PI_OPERATOR_VERSION_UNAVAILABLE:timed out')), Math.min(timeout, 5000));
    child.stdout.on('data', chunk => { stdout += chunk.toString('utf8'); if (Buffer.byteLength(stdout, 'utf8') > 4096) stdout = stdout.slice(-4096); });
    child.stderr.on('data', chunk => { stderr += chunk.toString('utf8'); if (Buffer.byteLength(stderr, 'utf8') > 4096) stderr = stderr.slice(-4096); });
    child.on('error', () => finish(undefined, Error('PI_OPERATOR_VERSION_UNAVAILABLE:spawn failed')));
    child.on('close', code => {
      const version = stdout.trim();
      if (code === 0 && version) finish(version);
      else finish(undefined, Error(`PI_OPERATOR_VERSION_UNAVAILABLE:${stderr.trim() || (code ?? 'no version')}`));
    });
  });
}
function configuredComathd(options) {
  const configured = options?.comathdEntry || options?.comathdConfig || options?.comathdNode;
  if (!configured) return undefined;
  if (!options?.comathdEntry || !options?.comathdConfig) throw Error('comathdEntry and comathdConfig must be configured together');
  return { entry: requireAbsolutePath(options.comathdEntry, 'comathdEntry'), config: requireAbsolutePath(options.comathdConfig, 'comathdConfig'),
    node: options.comathdNode ? requireAbsolutePath(options.comathdNode, 'comathdNode') : process.execPath };
}
async function startConfiguredComathd(service, project, timeout) {
  return await new Promise((resolveStart, rejectStart) => {
    const child = spawn(service.node, [service.entry, 'serve', '--project-root', project, '--config', service.config], {
      cwd: project, env: { ...process.env }, stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true, detached: true
    });
    let stderr = '', settled = false;
    const lines = createInterface({ input: child.stdout, crlfDelay: Infinity });
    const finish = error => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      lines.close();
      if (error) {
        if (!child.killed) child.kill();
        rejectStart(error);
      } else {
        child.unref();
        child.stdout.unref?.();
        child.stderr.unref?.();
        resolveStart();
      }
    };
    const timer = setTimeout(() => finish(Error('COMATHD_START_TIMEOUT')), Math.min(timeout, 15000));
    lines.on('line', line => {
      try {
        const message = JSON.parse(line);
        if (message?.type === 'ready' && message.service === 'comathd') return finish();
        if (message?.type === 'startup_error' && typeof message.code === 'string') return finish(Error(message.code));
      } catch { /* service diagnostics may be non-JSON. */ }
    });
    child.stderr.on('data', chunk => { stderr += chunk.toString('utf8'); if (stderr.length > 4096) stderr = stderr.slice(-4096); });
    child.on('error', () => finish(Error('COMATHD_START_FAILED')));
    child.on('close', code => { if (!settled) finish(Error(stderr.trim() || `COMATHD_START_FAILED:${code ?? 'signal'}`)); });
  });
}

/** Run exactly one Pi RPC operator command. A process exit alone is never a receipt. */
async function runOperatorRequestOnce(request, options) {
  const pi = options?.pi, extension = options?.extension, project = options?.project;
  if (!pi || !isAbsolute(pi) || !extension || !isAbsolute(extension) || !project || !isAbsolute(project)) throw Error('pi, extension, and project must be absolute paths');
  const timeout = Number.isSafeInteger(options?.timeout_ms) ? options.timeout_ms : 30000;
  if (timeout < 1 || timeout > 120000) throw Error('Invalid timeout_ms');
  await readPiVersion(pi, options?.piArgs, timeout);
  const skills = options?.loadPackageSkill === true ? ['--no-skills', '--skill', packageSkillPath(extension)] : ['--no-skills'];
  const commandDiscoveryId = `comath-operator-commands-${process.pid}-${Date.now()}`;
  const child = spawn(pi, [...(options.piArgs ?? []), '--mode', 'rpc', '--no-session', '--no-tools', '--no-extensions', ...skills, '--no-prompt-templates', '--provider', 'openai', '--model', 'gpt-4o-mini', '--extension', extension],
    { cwd: project, env: operatorEnvironment(), stdio: ['pipe', 'pipe', 'pipe'], windowsHide: true });
  let stderr = '', settled = false, timer;
  const finish = (resolve, reject, value, error) => {
    if (settled) return; settled = true; clearTimeout(timer); child.stdout.destroy(); child.stderr.destroy(); child.stdin.end();
    if (!child.killed) child.kill(); error ? reject(error) : resolve(value);
  };
  const result = await new Promise((resolve, reject) => {
    timer = setTimeout(() => finish(resolve, reject, undefined, Error('PI_OPERATOR_TIMEOUT')), timeout);
    const output = createInterface({ input: child.stdout, crlfDelay: Infinity });
    let businessReceipt, promptSucceeded = false, promptSent = false;
    const finishWhenComplete = () => {
      if (businessReceipt && promptSucceeded) finish(resolve, reject, businessReceipt);
    };
    const sendPrompt = () => {
      if (promptSent) return;
      promptSent = true;
      child.stdin.write(`${JSON.stringify({ id: request.request_id, type: 'prompt', message: `/cm:operator ${JSON.stringify(request)}` })}\n`);
    };
    output.on('line', line => {
      if (Buffer.byteLength(line, 'utf8') > MAX_LINE) return finish(resolve, reject, undefined, Error('PI_OPERATOR_PROTOCOL_LIMIT'));
      try {
        const parsed = JSON.parse(line);
        const failedExtension = extensionError(parsed);
        if (failedExtension) return finish(resolve, reject, undefined, Error(`PI_OPERATOR_EXTENSION_ERROR:${failedExtension}`));
        if (parsed && typeof parsed === 'object' && parsed.type === 'extension_ui_request' && typeof parsed.id === 'string') {
          child.stdin.write(`${JSON.stringify({ type: 'extension_ui_response', id: parsed.id, cancelled: true })}\n`);
          return;
        }
        const discovery = rpcResponse(parsed, commandDiscoveryId, 'get_commands');
        if (discovery) {
          if (!discovery.success) return finish(resolve, reject, undefined, Error(`PI_OPERATOR_COMMAND_DISCOVERY_FAILED:${typeof discovery.error === 'string' ? discovery.error : 'command discovery failed'}`));
          const commandError = commandRegistrationError(discovery.data, extension);
          if (commandError) return finish(resolve, reject, undefined, Error(commandError));
          sendPrompt();
          return;
        }
        const response = promptResponse(parsed, request.request_id);
        if (response) {
          if (!response.success) return finish(resolve, reject, undefined, Error(`PI_OPERATOR_RPC_REJECTED:${typeof response.error === 'string' ? response.error : 'prompt failed'}`));
          promptSucceeded = true;
          return finishWhenComplete();
        }
        const details = customDetails(parsed);
        if (!details || details.request_id !== request.request_id) return;
        if (details.version !== 1 || details.tool !== request.tool || !details.result) return finish(resolve, reject, undefined, Error('PI_OPERATOR_PROTOCOL_INVALID'));
        businessReceipt = details;
        finishWhenComplete();
      } catch { /* Pi diagnostics are allowed on stdout only when not JSON. */ }
    });
    child.stderr.on('data', chunk => { stderr += chunk.toString('utf8'); if (Buffer.byteLength(stderr, 'utf8') > 64 * 1024) stderr = stderr.slice(-64 * 1024); });
    child.on('error', error => finish(resolve, reject, undefined, error));
    child.on('close', code => { if (!settled) finish(resolve, reject, undefined, Error(`PI_OPERATOR_NO_RECEIPT:${code ?? 'signal'}:${stderr.slice(0, 512)}`)); });
    child.stdin.write(`${JSON.stringify({ id: commandDiscoveryId, type: 'get_commands' })}\n`);
  });
  return result;
}
export async function runOperatorRequest(raw, options) {
  const request = requireRequest(raw), service = configuredComathd(options);
  const result = await runOperatorRequestOnce(request, options);
  if (result.result.ok || result.result.code !== 'RESEARCH_OPERATOR_UNAVAILABLE' || !service) return result;
  await startConfiguredComathd(service, options.project, Number.isSafeInteger(options?.timeout_ms) ? options.timeout_ms : 30000);
  return runOperatorRequestOnce(request, options);
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
const readOnlyOperatorTools = new Set([
  'research_capabilities_get', 'research_campaign_list', 'research_campaign_get', 'research_frontier_get', 'research_budget_get', 'research_dashboard_get',
  'research_events_read', 'research_task_get', 'research_validation_intake_preparations_list', 'research_checkpoint_get', 'research_artifact_read', 'research_operation_get'
]);
function isMutationRequest(request) { return !readOnlyOperatorTools.has(request.tool); }
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
async function verifyHandoffProject(prior, options) {
  const recordedProjectRoot = pathKey(prior.project_root), currentProjectRoot = pathKey(options?.project);
  if (recordedProjectRoot && currentProjectRoot && recordedProjectRoot !== currentProjectRoot) throw Error('PI_OPERATOR_HANDOFF_PROJECT_MISMATCH');
  if (typeof prior.project_id !== 'string' || !prior.project_id) return;
  const probe = await runOperatorRequest({ version: 1, request_id: `handoff-project-${process.pid}-${Date.now()}`, tool: 'research_capabilities_get', input: {} }, options);
  const projectId = probe.result.ok && probe.result.data && typeof probe.result.data === 'object' ? probe.result.data.project_id : undefined;
  if (typeof projectId !== 'string' || !projectId) throw Error('PI_OPERATOR_HANDOFF_PROJECT_UNVERIFIED');
  if (projectId !== prior.project_id) throw Error('PI_OPERATOR_HANDOFF_PROJECT_MISMATCH');
}
function processedEventCursor(prior, options) {
  const priorCursor = Number.isSafeInteger(prior.last_event_seq) && prior.last_event_seq >= 0 ? prior.last_event_seq : 0;
  if (options?.processedEventSeq === undefined) return priorCursor;
  if (!Number.isSafeInteger(options.processedEventSeq) || options.processedEventSeq < priorCursor) throw Error('processedEventSeq must be a non-decreasing non-negative integer');
  return options.processedEventSeq;
}
/** Persist a non-authoritative recovery hint around exactly one operator request. */
export async function runWithHandoff(raw, options) {
  const request = requireRequest(raw), handoff = safeHandoffPath(options?.handoffFile, options?.project);
  return withHandoffLock(handoff, async () => {
    const prior = await readHandoff(handoff), mutation = isMutationRequest(request), pending = { tool: request.tool, input: request.input, request_id: request.request_id };
    const lastEventSeq = processedEventCursor(prior, options);
    await verifyHandoffProject(prior, options);
    if (mutation && prior.pending_mutation && !samePendingRequest(prior.pending_mutation, request)) throw Error('PI_OPERATOR_PENDING_MUTATION');
    const recovered = mutation && prior.pending_mutation ? await recoverPendingStart(prior, request, options) : undefined;
    const result = recovered ?? await (async () => {
      if (mutation) await writeHandoff(handoff, { version: 1, project_root: resolve(options.project), project_id: prior.project_id ?? null, campaign_id: prior.campaign_id ?? null,
        operation_id: prior.operation_id ?? null, start_command_id: prior.start_command_id ?? null, last_event_seq: prior.last_event_seq ?? 0, last_request_id: prior.last_request_id ?? null, pending_mutation: pending });
      return runOperatorRequest(request, options);
    })();
    // A transport failure cannot tell whether the service committed the command.
    if (mutation && !result.result.ok && result.result.code === 'RESEARCH_OPERATOR_UNAVAILABLE') return result;
    const data = result.result.ok && result.result.data && typeof result.result.data === 'object' ? result.result.data : {};
    await writeHandoff(handoff, { version: 1, project_root: resolve(options.project), project_id: data.project_id ?? prior.project_id ?? null,
      campaign_id: data.campaign_id ?? prior.campaign_id ?? null, operation_id: data.operation_id ?? prior.operation_id ?? null,
      start_command_id: request.tool === 'research_campaign_start' ? request.input?.command_id ?? null : prior.start_command_id ?? null,
      last_event_seq: lastEventSeq, last_request_id: request.request_id, pending_mutation: mutation ? null : prior.pending_mutation ?? null });
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
    else if (key === '--processed-event-seq') value.processed_event_seq = Number(args[++i]);
    else if (['--pi', '--extension', '--project', '--request-file', '--handoff-file', '--comathd-entry', '--comathd-config', '--comathd-node'].includes(key)) value[key.slice(2).replace(/-/g, '_')] = args[++i];
    else if (key === '--timeout-ms') value.timeout_ms = Number(args[++i]);
    else throw Error(`Unknown argument: ${key}`);
  }
  return value;
}
async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.processed_event_seq !== undefined && !options.handoff_file) throw Error('processedEventSeq requires handoffFile');
  const common = { pi: options.pi, piArgs: options.piArgs, extension: options.extension, project: options.project, timeout_ms: options.timeout_ms, ...(options.load_package_skill ? { loadPackageSkill: true } : {}), ...(options.handoff_file ? { handoffFile: options.handoff_file } : {}), ...(options.processed_event_seq === undefined ? {} : { processedEventSeq: options.processed_event_seq }), ...(options.comathd_entry ? { comathdEntry: options.comathd_entry } : {}), ...(options.comathd_config ? { comathdConfig: options.comathd_config } : {}), ...(options.comathd_node ? { comathdNode: options.comathd_node } : {}) };
  const execute = request => options.handoff_file ? runWithHandoff(request, common) : runOperatorRequest(request, common);
  if (options.request_file) {
    const request = JSON.parse(await readFile(requireAbsolutePath(options.request_file, 'requestFile'), 'utf8'));
    const result = await execute(request);
    process.stdout.write(`${JSON.stringify(result)}\n`);
    if (!result.result.ok) process.exitCode = 1;
    return;
  }
  if (!options.stdio) throw Error('Use --request-file or --stdio');
  const lines = createInterface({ input: process.stdin, crlfDelay: Infinity });
  for await (const line of lines) {
    try {
      const result = await execute(JSON.parse(line));
      process.stdout.write(`${JSON.stringify(result)}\n`);
      if (!result.result.ok) process.exitCode = 1;
    } catch (error) {
      process.stdout.write(`${JSON.stringify({ version: 1, request_id: 'invalid', tool: 'invalid', result: { ok: false, code: 'PI_OPERATOR_ERROR', error: error instanceof Error ? error.message : String(error) } })}\n`);
      process.exitCode = 1;
    }
  }
}
if (process.argv[1] && new URL(import.meta.url).pathname === new URL(`file://${process.argv[1].replace(/\\/g, '/')}`).pathname) {
  main().catch(error => { process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`); process.exitCode = 1; });
}
