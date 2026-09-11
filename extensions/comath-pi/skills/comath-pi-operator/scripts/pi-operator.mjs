import { spawn } from 'node:child_process';
import { createInterface } from 'node:readline';
import { readFile } from 'node:fs/promises';
import { isAbsolute, resolve } from 'node:path';

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

/** Run exactly one Pi RPC operator command. A process exit alone is never a receipt. */
export async function runOperatorRequest(raw, options) {
  const request = requireRequest(raw), pi = options?.pi, extension = options?.extension, project = options?.project;
  if (!pi || !isAbsolute(pi) || !extension || !isAbsolute(extension) || !project || !isAbsolute(project)) throw Error('pi, extension, and project must be absolute paths');
  const timeout = Number.isSafeInteger(options?.timeout_ms) ? options.timeout_ms : 30000;
  if (timeout < 1 || timeout > 120000) throw Error('Invalid timeout_ms');
  const child = spawn(pi, [...(options.piArgs ?? []), '--mode', 'rpc', '--no-session', '--no-tools', '--no-skills', '--no-prompt-templates', '--provider', 'openai', '--model', 'gpt-4o-mini', '--extension', extension],
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

function parseArgs(args) {
  const value = { piArgs: [] };
  for (let i = 0; i < args.length; i++) {
    const key = args[i];
    if (key === '--stdio') value.stdio = true;
    else if (key === '--pi-arg') value.piArgs.push(args[++i]);
    else if (['--pi', '--extension', '--project', '--request-file'].includes(key)) value[key.slice(2).replace('-', '_')] = args[++i];
    else if (key === '--timeout-ms') value.timeout_ms = Number(args[++i]);
    else throw Error(`Unknown argument: ${key}`);
  }
  return value;
}
async function main() {
  const options = parseArgs(process.argv.slice(2));
  const common = { pi: options.pi, piArgs: options.piArgs, extension: options.extension, project: options.project, timeout_ms: options.timeout_ms };
  if (options.request_file) {
    const request = JSON.parse(await readFile(resolve(options.request_file), 'utf8')); process.stdout.write(`${JSON.stringify(await runOperatorRequest(request, common))}\n`); return;
  }
  if (!options.stdio) throw Error('Use --request-file or --stdio');
  const lines = createInterface({ input: process.stdin, crlfDelay: Infinity });
  for await (const line of lines) {
    try { process.stdout.write(`${JSON.stringify(await runOperatorRequest(JSON.parse(line), common))}\n`); }
    catch (error) { process.stdout.write(`${JSON.stringify({ version: 1, request_id: 'invalid', tool: 'invalid', result: { ok: false, code: 'PI_OPERATOR_ERROR', error: error instanceof Error ? error.message : String(error) } })}\n`); }
  }
}
if (process.argv[1] && new URL(import.meta.url).pathname === new URL(`file://${process.argv[1].replace(/\\/g, '/')}`).pathname) {
  main().catch(error => { process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`); process.exitCode = 1; });
}
