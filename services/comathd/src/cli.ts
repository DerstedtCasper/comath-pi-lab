#!/usr/bin/env node
import { writeFileSync } from "node:fs";
import type { Server } from "node:http";
import { createComathServer } from "./api/server.js";

type ParsedArgs = {
  positionals: string[];
  flags: Map<string, string[]>;
};

type RequestOptions = {
  method: "GET" | "POST";
  path: string;
  body?: unknown;
};

class CliError extends Error {
  readonly exitCode: number;

  constructor(message: string, exitCode = 1) {
    super(message);
    this.name = "CliError";
    this.exitCode = exitCode;
  }
}

function parseArgs(argv: string[]): ParsedArgs {
  const positionals: string[] = [];
  const flags = new Map<string, string[]>();

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith("--")) {
      positionals.push(token);
      continue;
    }

    const [rawName, inlineValue] = token.slice(2).split(/=(.*)/s, 2);
    if (!rawName) {
      throw new CliError("invalid empty flag");
    }

    let value = inlineValue;
    if (value === undefined) {
      const next = argv[index + 1];
      if (next && !next.startsWith("--")) {
        value = next;
        index += 1;
      } else {
        value = "true";
      }
    }

    const values = flags.get(rawName) ?? [];
    values.push(value);
    flags.set(rawName, values);
  }

  return { positionals, flags };
}

function readFlag(args: ParsedArgs, names: string[], fallback?: string): string | undefined {
  for (const name of names) {
    const values = args.flags.get(name);
    if (values?.length) {
      return values[values.length - 1];
    }
  }
  return fallback;
}

function readAllFlags(args: ParsedArgs, name: string): string[] {
  return args.flags.get(name) ?? [];
}

function requireFlag(args: ParsedArgs, names: string[], label = names[0]): string {
  const value = readFlag(args, names);
  if (!value || value === "true") {
    throw new CliError(`missing required ${label}`);
  }
  return value;
}

function parseJsonFlag(args: ParsedArgs, name: string, fallback: unknown): unknown {
  const value = readFlag(args, [name]);
  if (!value || value === "true") {
    return fallback;
  }
  try {
    return JSON.parse(value);
  } catch (error) {
    throw new CliError(`invalid JSON for --${name}: ${error instanceof Error ? error.message : String(error)}`);
  }
}

function baseUrl(args: ParsedArgs): string {
  const value = readFlag(args, ["base-url", "comathd"]);
  if (!value || value === "true") {
    throw new CliError("missing required base URL; pass --base-url or --comathd");
  }
  return value.replace(/\/+$/, "");
}

function encodeQuery(params: Record<string, string | undefined>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined) {
      search.set(key, value);
    }
  }
  const query = search.toString();
  return query ? `?${query}` : "";
}

async function request(base: string, options: RequestOptions): Promise<any> {
  const response = await fetch(`${base}${options.path}`, {
    method: options.method,
    headers: {
      "content-type": "application/json"
    },
    body: options.body === undefined ? undefined : JSON.stringify(options.body)
  });
  const payload = await response.json();
  if (!response.ok) {
    const detail =
      payload && typeof payload === "object" && "error" in payload ? String((payload as { error: unknown }).error) : "";
    throw new CliError(`comathd request failed (${response.status})${detail ? `: ${detail}` : ""}`);
  }
  return payload;
}

function writeJson(value: unknown): void {
  process.stdout.write(`${JSON.stringify(value, null, 2)}\n`);
}

async function serve(args: ParsedArgs): Promise<void> {
  const host = readFlag(args, ["host"], "127.0.0.1") ?? "127.0.0.1";
  const portText = readFlag(args, ["port"], "0") ?? "0";
  const port = Number.parseInt(portText, 10);
  if (!Number.isInteger(port) || port < 0 || port > 65_535) {
    throw new CliError(`invalid --port: ${portText}`);
  }

  const comathServer = createComathServer();
  const nodeServer = await comathServer.listen(port, host);
  const address = nodeServer.address();
  if (!address || typeof address === "string") {
    throw new CliError("comathd did not expose a TCP address");
  }
  const ready = {
    ok: true,
    service: "comathd",
    pid: process.pid,
    host,
    port: address.port,
    baseUrl: `http://${host}:${address.port}`
  };

  const readyFile = readFlag(args, ["ready-file"]);
  if (readyFile && readyFile !== "true") {
    writeFileSync(readyFile, `${JSON.stringify(ready, null, 2)}\n`, "utf8");
  }
  writeJson(ready);

  await new Promise<void>((resolve) => {
    const shutdown = async () => {
      await closeNodeServer(comathServer.close.bind(comathServer), nodeServer);
      resolve();
    };
    process.once("SIGINT", shutdown);
    process.once("SIGTERM", shutdown);
  });
}

async function closeNodeServer(closeComathServer: () => Promise<void>, nodeServer: Server): Promise<void> {
  if (!nodeServer.listening) {
    return;
  }
  await closeComathServer();
}

async function project(args: ParsedArgs): Promise<unknown> {
  const action = args.positionals[1];
  const root = requireFlag(args, ["root", "project-root"], "--root");
  if (action === "init") {
    return request(baseUrl(args), {
      method: "POST",
      path: "/project/init",
      body: {
        root_path: root,
        name: readFlag(args, ["name"])
      }
    });
  }
  if (action === "open") {
    return request(baseUrl(args), {
      method: "POST",
      path: "/project/open",
      body: { root_path: root }
    });
  }
  if (action === "status") {
    return request(baseUrl(args), {
      method: "GET",
      path: `/project/status${encodeQuery({ project_root: root })}`
    });
  }
  throw new CliError("usage: comath-lab project <init|open|status> --root PATH --base-url URL");
}

async function research(args: ParsedArgs): Promise<unknown> {
  const action = args.positionals[1];
  if (action !== "start") {
    throw new CliError("usage: comath-lab research start --root PATH --goal TEXT --base-url URL");
  }

  const base = baseUrl(args);
  const root = requireFlag(args, ["root", "project-root"], "--root");
  const init = await request(base, {
    method: "POST",
    path: "/project/init",
    body: {
      root_path: root,
      name: readFlag(args, ["name"])
    }
  });
  const projectId = readFlag(args, ["project-id"], init.project?.project_id);
  const goal = readFlag(args, ["goal"], "Start a CoMath mathematical research workflow.");
  const kind = readFlag(args, ["kind"], "proof_route");
  const actor = readFlag(args, ["actor"], "comath-lab-cli");
  const workstream = await request(base, {
    method: "POST",
    path: "/workstream/spawn",
    body: {
      project_root: root,
      project_id: projectId,
      kind,
      goal,
      actor,
      created_by: actor
    }
  });

  return {
    ok: true,
    headless: readFlag(args, ["headless"], "false") === "true",
    project: init.project,
    runtime_root: init.runtime_root,
    workstream: workstream.workstream
  };
}

async function claim(args: ParsedArgs): Promise<unknown> {
  const action = args.positionals[1];
  const base = baseUrl(args);
  if (action === "register") {
    return request(base, {
      method: "POST",
      path: "/claim/register",
      body: {
        project_root: requireFlag(args, ["project-root", "root"], "--project-root"),
        project_id: requireFlag(args, ["project-id"], "--project-id"),
        statement: requireFlag(args, ["statement"], "--statement"),
        assumptions: readAllFlags(args, "assumption"),
        domain: requireFlag(args, ["domain"], "--domain"),
        actor: readFlag(args, ["actor"])
      }
    });
  }
  if (action === "get") {
    return request(base, {
      method: "GET",
      path: `/claim/get${encodeQuery({
        project_root: requireFlag(args, ["project-root", "root"], "--project-root"),
        project_id: requireFlag(args, ["project-id"], "--project-id"),
        claim_id: requireFlag(args, ["claim-id"], "--claim-id")
      })}`
    });
  }
  if (action === "promote") {
    return request(base, {
      method: "POST",
      path: "/claim/promote",
      body: {
        project_root: requireFlag(args, ["project-root", "root"], "--project-root"),
        project_id: requireFlag(args, ["project-id"], "--project-id"),
        claim_id: requireFlag(args, ["claim-id"], "--claim-id"),
        target_status: requireFlag(args, ["target-status"], "--target-status"),
        evidence_ids: readAllFlags(args, "evidence-id"),
        artifact_ids: readAllFlags(args, "artifact-id"),
        actor: readFlag(args, ["actor"], "comath-lab-cli"),
        external_vetoes: readAllFlags(args, "external-veto"),
        external_warnings: readAllFlags(args, "external-warning")
      }
    });
  }
  throw new CliError("usage: comath-lab claim <register|get|promote> ...");
}

async function workstream(args: ParsedArgs): Promise<unknown> {
  const action = args.positionals[1];
  const base = baseUrl(args);
  const projectRoot = () => requireFlag(args, ["project-root", "root"], "--project-root");
  const projectId = () => requireFlag(args, ["project-id"], "--project-id");
  if (action === "spawn") {
    const actor = readFlag(args, ["actor"], "comath-lab-cli");
    return request(base, {
      method: "POST",
      path: "/workstream/spawn",
      body: {
        project_root: projectRoot(),
        project_id: projectId(),
        kind: readFlag(args, ["kind"], "proof_route"),
        goal: requireFlag(args, ["goal"], "--goal"),
        actor,
        created_by: actor
      }
    });
  }
  if (action === "list") {
    return request(base, {
      method: "GET",
      path: `/workstream/list${encodeQuery({ project_root: projectRoot(), project_id: projectId() })}`
    });
  }
  if (action === "status") {
    return request(base, {
      method: "GET",
      path: `/workstream/status${encodeQuery({
        project_root: projectRoot(),
        project_id: projectId(),
        workstream_id: requireFlag(args, ["workstream-id"], "--workstream-id")
      })}`
    });
  }
  if (action === "report") {
    return request(base, {
      method: "POST",
      path: "/workstream/report",
      body: {
        project_root: projectRoot(),
        project_id: projectId(),
        workstream_id: requireFlag(args, ["workstream-id"], "--workstream-id"),
        report_markdown: requireFlag(args, ["report", "report-markdown"], "--report"),
        status: readFlag(args, ["status"]),
        actor: readFlag(args, ["actor"])
      }
    });
  }
  if (action === "transition") {
    return request(base, {
      method: "POST",
      path: "/workstream/transition",
      body: {
        project_root: projectRoot(),
        project_id: projectId(),
        workstream_id: requireFlag(args, ["workstream-id"], "--workstream-id"),
        next_status: requireFlag(args, ["next-status"], "--next-status"),
        actor: readFlag(args, ["actor"], "comath-lab-cli"),
        notes: readFlag(args, ["notes"])
      }
    });
  }
  throw new CliError("usage: comath-lab workstream <spawn|list|status|report|transition> ...");
}

async function graphPatch(args: ParsedArgs): Promise<unknown> {
  const action = args.positionals[1];
  const base = baseUrl(args);
  if (action === "propose") {
    return request(base, {
      method: "POST",
      path: "/graph-patch/propose",
      body: {
        project_root: requireFlag(args, ["project-root", "root"], "--project-root"),
        project_id: requireFlag(args, ["project-id"], "--project-id"),
        workstream_id: requireFlag(args, ["workstream-id"], "--workstream-id"),
        created_by: readFlag(args, ["created-by", "actor"], "comath-lab-cli"),
        new_nodes: parseJsonFlag(args, "new-nodes", []),
        new_edges: parseJsonFlag(args, "new-edges", []),
        updated_nodes: parseJsonFlag(args, "updated-nodes", []),
        updated_edges: parseJsonFlag(args, "updated-edges", []),
        warnings: readAllFlags(args, "warning")
      }
    });
  }
  if (action === "review") {
    return request(base, {
      method: "POST",
      path: "/graph-patch/review",
      body: {
        project_root: requireFlag(args, ["project-root", "root"], "--project-root"),
        project_id: requireFlag(args, ["project-id"], "--project-id"),
        workstream_id: requireFlag(args, ["workstream-id"], "--workstream-id"),
        next_state: requireFlag(args, ["next-state"], "--next-state"),
        reviewer: requireFlag(args, ["reviewer"], "--reviewer"),
        notes: readFlag(args, ["notes"], "")
      }
    });
  }
  if (action === "apply") {
    return request(base, {
      method: "POST",
      path: "/graph-patch/apply",
      body: {
        project_root: requireFlag(args, ["project-root", "root"], "--project-root"),
        project_id: requireFlag(args, ["project-id"], "--project-id"),
        workstream_id: requireFlag(args, ["workstream-id"], "--workstream-id"),
        reviewer: requireFlag(args, ["reviewer"], "--reviewer")
      }
    });
  }
  throw new CliError("usage: comath-lab graph-patch <propose|review|apply> ...");
}

function toolRoute(toolName: string, payload: Record<string, unknown>): RequestOptions {
  switch (toolName) {
    case "comath.project.open":
      return { method: "POST", path: "/project/open", body: { root_path: payload.root_path } };
    case "comath.claim.register":
      return { method: "POST", path: "/claim/register", body: payload };
    case "comath.claim.get":
      return {
        method: "GET",
        path: `/claim/get${encodeQuery({
          project_root: String(payload.project_root ?? ""),
          project_id: String(payload.project_id ?? ""),
          claim_id: String(payload.claim_id ?? "")
        })}`
      };
    case "comath.claim.requestPromotion":
      return { method: "POST", path: "/claim/promote", body: payload };
    case "comath.evidence.attach":
      return { method: "POST", path: "/evidence/attach", body: payload };
    case "comath.graph.proposePatch":
      return { method: "POST", path: "/graph-patch/propose", body: normalizeGraphPatchToolPayload(payload) };
    case "comath.status.snapshot":
      return {
        method: "GET",
        path: `/status/snapshot${encodeQuery({
          project_root: String(payload.project_root ?? ""),
          project_id: String(payload.project_id ?? "")
        })}`
      };
    case "comath.paper.init":
      return { method: "POST", path: "/paper/init", body: payload };
    case "comath.paper.state":
      return {
        method: "GET",
        path: `/paper/state${encodeQuery({
          project_root: String(payload.project_root ?? ""),
          project_id: String(payload.project_id ?? "")
        })}`
      };
    case "comath.paper.updateSection":
      return { method: "POST", path: "/paper/update-section", body: payload };
    case "comath.paper.renderClaim":
      return { method: "POST", path: "/paper/render-claim", body: payload };
    case "comath.paper.check":
      return {
        method: "GET",
        path: `/paper/check${encodeQuery({
          project_root: String(payload.project_root ?? ""),
          project_id: String(payload.project_id ?? "")
        })}`
      };
    case "comath.paper.export":
      return { method: "POST", path: "/paper/export", body: payload };
    case "comath.snapshot.export":
      return { method: "POST", path: "/snapshot/export", body: payload };
    case "comath.snapshot.verify":
      return { method: "POST", path: "/snapshot/verify", body: payload };
    case "comath.snapshot.restore":
      return { method: "POST", path: "/snapshot/restore", body: payload };
    case "comath.replay.verifyManifest":
      return { method: "POST", path: "/replay/verify-manifest", body: payload };
    default:
      throw new CliError(`no comathd route mapping for tool: ${toolName}`);
  }
}

function normalizeGraphPatchToolPayload(payload: Record<string, unknown>): Record<string, unknown> {
  return {
    ...payload,
    workstream_id: payload.workstream_id ?? payload.source_workstream_id,
    created_by: payload.created_by ?? payload.actor ?? "comath-lab-cli"
  };
}

async function tool(args: ParsedArgs): Promise<unknown> {
  const action = args.positionals[1];
  if (action !== "call") {
    throw new CliError("usage: comath-lab tool call TOOL_NAME --json PAYLOAD --base-url URL");
  }
  const toolName = args.positionals[2] ?? requireFlag(args, ["tool"], "--tool");
  const payload = parseJsonFlag(args, "json", {});
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    throw new CliError("--json payload must be a JSON object");
  }
  const route = toolRoute(toolName, payload as Record<string, unknown>);
  return request(baseUrl(args), route);
}

async function dispatch(argv: string[]): Promise<void> {
  const args = parseArgs(argv);
  const command = args.positionals[0];
  if (!command || command === "help" || command === "--help") {
    writeJson({
      usage: "comath-lab <serve|health|project|research|claim|workstream|graph-patch|tool> [options]"
    });
    return;
  }

  if (command === "serve") {
    await serve(args);
    return;
  }

  let result: unknown;
  if (command === "health") {
    result = await request(baseUrl(args), { method: "GET", path: "/health" });
  } else if (command === "project") {
    result = await project(args);
  } else if (command === "research") {
    result = await research(args);
  } else if (command === "claim") {
    result = await claim(args);
  } else if (command === "workstream") {
    result = await workstream(args);
  } else if (command === "graph-patch") {
    result = await graphPatch(args);
  } else if (command === "tool" || command === "pi-tool") {
    result = await tool(args);
  } else {
    throw new CliError(`unknown command: ${command}`);
  }
  writeJson(result);
}

dispatch(process.argv.slice(2)).catch((error: unknown) => {
  const exitCode = error instanceof CliError ? error.exitCode : 1;
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`${message}\n`);
  process.exitCode = exitCode;
});
