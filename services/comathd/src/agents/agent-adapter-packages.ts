import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { appendAuditEvent } from "../audit/jsonl-writer.js";
import { ComathError } from "../errors.js";
import type { AgentRun } from "../types/schemas.js";
import { createAgentRunScheduler, type AgentRunProcessResult } from "./agent-run-scheduler.js";
import {
  buildAgentProfileLaunch,
  createAgentRunForProfile,
  getAgentProfile,
  type AgentProfile,
  type AgentProfileId,
  type AgentProfileLaunch
} from "./agent-profiles.js";

export type AgentAdapterPackageId = "codex-cli";

export type AgentAdapterPackageKind = "codex_cli";

export type AgentAdapterPackage = {
  id: AgentAdapterPackageId;
  kind: AgentAdapterPackageKind;
  label: string;
  version: string;
  program: string;
  adapter_script: string;
  default_rpm: number;
  supported_profiles: AgentProfileId[];
  proof_authority: "none";
  lifecycle: {
    health_args: string[];
    launch_prefix_args: string[];
  };
};

export type BuildAgentAdapterPackageLaunchInput = {
  project_id: string;
  run_id: string;
  profile_id: AgentProfileId;
  adapter_id: AgentAdapterPackageId;
  goal: string;
  context_path: string;
  actor: string;
};

export type AgentAdapterPackageLaunch = {
  package: AgentAdapterPackage;
  profile: AgentProfile;
  launch: AgentProfileLaunch;
};

export type ExecuteAgentAdapterPackageInput = {
  project_id: string;
  campaign_id?: string;
  workstream_id: string;
  profile_id: AgentProfileId;
  adapter_id: AgentAdapterPackageId;
  goal: string;
  context_path: string;
  actor: string;
};

export type ExecuteAgentAdapterPackageResult = {
  package: AgentAdapterPackage;
  profile: AgentProfile;
  run: AgentRun;
  launch: AgentProfileLaunch;
  result: AgentRunProcessResult;
};

const moduleDir = dirname(fileURLToPath(import.meta.url));

function adapterScriptPath(): string {
  const distCandidate = join(moduleDir, "adapters", "codex-cli-adapter.mjs");
  if (existsSync(distCandidate)) {
    return distCandidate;
  }
  return join(moduleDir, "..", "src", "agents", "adapters", "codex-cli-adapter.mjs");
}

function packageRegistry(): AgentAdapterPackage[] {
  return [
    {
      id: "codex-cli",
      kind: "codex_cli",
      label: "Codex CLI Adapter",
      version: "phase43-codex-adapter-v1",
      program: process.execPath,
      adapter_script: adapterScriptPath(),
      default_rpm: 4,
      supported_profiles: [
        "coordinator",
        "librarian",
        "computation",
        "proof-route",
        "formalization",
        "reviewer",
        "graph-builder",
        "security-auditor",
        "math-integrity-auditor"
      ],
      proof_authority: "none",
      lifecycle: {
        health_args: ["--adapter-package", "codex-cli", "--health"],
        launch_prefix_args: ["--adapter-package", "codex-cli"]
      }
    }
  ];
}

function clonePackage(pkg: AgentAdapterPackage): AgentAdapterPackage {
  return {
    ...pkg,
    supported_profiles: [...pkg.supported_profiles],
    lifecycle: {
      health_args: [...pkg.lifecycle.health_args],
      launch_prefix_args: [...pkg.lifecycle.launch_prefix_args]
    }
  };
}

export function listAgentAdapterPackages(): AgentAdapterPackage[] {
  return packageRegistry().map(clonePackage);
}

export function getAgentAdapterPackage(adapterId: string): AgentAdapterPackage {
  const pkg = listAgentAdapterPackages().find((entry) => entry.id === adapterId);
  if (!pkg) {
    throw new ComathError(`unknown agent adapter package: ${adapterId}`, {
      statusCode: 400,
      code: "AGENT_ADAPTER_PACKAGE_UNKNOWN"
    });
  }
  if (!existsSync(pkg.adapter_script)) {
    throw new ComathError(`agent adapter package script is missing: ${adapterId}`, {
      statusCode: 500,
      code: "AGENT_ADAPTER_PACKAGE_SCRIPT_MISSING"
    });
  }
  return pkg;
}

function assertProfileSupported(pkg: AgentAdapterPackage, profileId: AgentProfileId): void {
  if (pkg.supported_profiles.includes(profileId)) {
    return;
  }
  throw new ComathError(`adapter package ${pkg.id} does not support profile ${profileId}`, {
    statusCode: 400,
    code: "AGENT_ADAPTER_PACKAGE_PROFILE_UNSUPPORTED"
  });
}

export function buildAgentAdapterPackageLaunch(
  projectRoot: string,
  input: BuildAgentAdapterPackageLaunchInput
): AgentAdapterPackageLaunch {
  const pkg = getAgentAdapterPackage(input.adapter_id);
  const profile = getAgentProfile(input.profile_id);
  assertProfileSupported(pkg, profile.id);
  const launch = buildAgentProfileLaunch(projectRoot, {
    project_id: input.project_id,
    run_id: input.run_id,
    profile_id: input.profile_id,
    program: pkg.program,
    goal: input.goal,
    context_path: input.context_path,
    actor: input.actor
  });
  launch.scheduler_options.rpm = Math.min(launch.scheduler_options.rpm, pkg.default_rpm);
  launch.launch_input.command.args = [
    pkg.adapter_script,
    ...pkg.lifecycle.launch_prefix_args,
    ...(launch.launch_input.command.args ?? [])
  ];
  launch.launch_input.command.env = {
    ...launch.launch_input.command.env,
    COMATH_ADAPTER_PACKAGE_ID: pkg.id,
    COMATH_ADAPTER_PACKAGE_KIND: pkg.kind,
    COMATH_PROOF_AUTHORITY: "none"
  };
  appendAuditEvent(projectRoot, {
    project_id: input.project_id,
    event_type: "agent_adapter.package_launch_prepared",
    actor: input.actor,
    target_id: input.run_id,
    payload: {
      adapter_id: pkg.id,
      profile_id: profile.id,
      program: pkg.program,
      adapter_script: pkg.adapter_script,
      rpm: launch.scheduler_options.rpm,
      proof_authority: pkg.proof_authority
    }
  });
  return { package: clonePackage(pkg), profile, launch };
}

export async function executeAgentAdapterPackage(
  projectRoot: string,
  input: ExecuteAgentAdapterPackageInput
): Promise<ExecuteAgentAdapterPackageResult> {
  const run = createAgentRunForProfile(projectRoot, {
    project_id: input.project_id,
    campaign_id: input.campaign_id,
    workstream_id: input.workstream_id,
    profile_id: input.profile_id,
    actor: input.actor
  });
  const prepared = buildAgentAdapterPackageLaunch(projectRoot, {
    project_id: input.project_id,
    run_id: run.id,
    profile_id: input.profile_id,
    adapter_id: input.adapter_id,
    goal: input.goal,
    context_path: input.context_path,
    actor: input.actor
  });
  const scheduler = createAgentRunScheduler(prepared.launch.scheduler_options);
  const result = await scheduler.launch(projectRoot, prepared.launch.launch_input);
  appendAuditEvent(projectRoot, {
    project_id: input.project_id,
    event_type: "agent_adapter.package_executed",
    actor: input.actor,
    target_id: run.id,
    payload: {
      adapter_id: prepared.package.id,
      profile_id: prepared.profile.id,
      status: result.status,
      exit_code: result.exit_code,
      report_path: result.report_path,
      proof_authority: prepared.package.proof_authority
    }
  });
  return {
    package: prepared.package,
    profile: prepared.profile,
    run: {
      ...run,
      status: result.status,
      report_path: result.report_path
    },
    launch: prepared.launch,
    result
  };
}
