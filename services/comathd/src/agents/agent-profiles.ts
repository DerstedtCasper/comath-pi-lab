import { appendAuditEvent } from "../audit/jsonl-writer.js";
import { ComathError } from "../errors.js";
import type { AgentRun, AgentRole } from "../types/schemas.js";
import { createAgentRun } from "./agent-run-store.js";
import {
  createAgentRunScheduler,
  type AgentRunLaunchInput,
  type AgentRunProcessResult,
  type AgentRunSchedulerOptions
} from "./agent-run-scheduler.js";

export type AgentProfileId =
  | "coordinator"
  | "librarian"
  | "computation"
  | "proof-route"
  | "formalization"
  | "reviewer"
  | "graph-builder"
  | "security-auditor"
  | "math-integrity-auditor";

export type AgentProfile = {
  id: AgentProfileId;
  role: AgentRole;
  model_profile: string;
  tool_profile: string;
  allowed_tools: string[];
  forbidden_tools: string[];
  write_scope_templates: string[];
  may_mutate_trusted_state: false;
  proof_authority: "none";
  max_rounds: number;
  retry_policy: {
    max_retries: number;
    retry_on: string[];
  };
  scheduler: {
    max_concurrent: number;
    rpm: number;
    timeout_ms: number;
  };
};

export type AgentProfileValidation = {
  ok: boolean;
  vetoes: Array<{ code: string; profile_id?: string; message: string }>;
  warnings: string[];
};

export type CreateAgentRunForProfileInput = {
  project_id: string;
  campaign_id?: string;
  workstream_id: string;
  profile_id: AgentProfileId;
  actor: string;
};

export type BuildAgentProfileLaunchInput = {
  project_id: string;
  run_id: string;
  profile_id: AgentProfileId;
  program: string;
  goal: string;
  context_path: string;
  actor: string;
};

export type AgentProfileLaunch = {
  profile: AgentProfile;
  scheduler_options: AgentRunSchedulerOptions;
  launch_input: AgentRunLaunchInput;
};

export type ExecuteProfileAgentRunInput = {
  project_id: string;
  campaign_id?: string;
  workstream_id: string;
  profile_id: AgentProfileId;
  program: string;
  adapter_args?: string[];
  goal: string;
  context_path: string;
  actor: string;
};

export type ExecuteProfileAgentRunResult = {
  profile: AgentProfile;
  run: AgentRun;
  launch: AgentProfileLaunch;
  result: AgentRunProcessResult;
};

const globalForbiddenTools = [
  "claim.promote.direct",
  "graph_patch.apply.direct",
  "trusted_db.write.direct",
  "shell.unrestricted",
  "proof_authority.override"
];

const baseAllowedTools = [
  "agent_run.report.submit",
  "artifact.write.scoped",
  "graph_patch.propose",
  "memory.failure.record",
  "workstream.read",
  "workstream.write.scoped"
];

const profiles: AgentProfile[] = [
  {
    id: "coordinator",
    role: "coordinator",
    model_profile: "strong_coordinator",
    tool_profile: "profile:coordinator",
    allowed_tools: [...baseAllowedTools, "campaign.next_actions", "workstream.spawn"],
    forbidden_tools: [...globalForbiddenTools],
    write_scope_templates: [".comath/workstreams/${WS_ID}/", ".tmp/comath/${ARUN_ID}/"],
    may_mutate_trusted_state: false,
    proof_authority: "none",
    max_rounds: 8,
    retry_policy: { max_retries: 1, retry_on: ["tool_runtime_failure"] },
    scheduler: { max_concurrent: 1, rpm: 4, timeout_ms: 600_000 }
  },
  {
    id: "librarian",
    role: "librarian",
    model_profile: "retrieval_strong",
    tool_profile: "profile:librarian",
    allowed_tools: [...baseAllowedTools, "literature.search", "citation.condition_check"],
    forbidden_tools: [...globalForbiddenTools],
    write_scope_templates: [".comath/workstreams/${WS_ID}/", ".tmp/comath/${ARUN_ID}/"],
    may_mutate_trusted_state: false,
    proof_authority: "none",
    max_rounds: 6,
    retry_policy: { max_retries: 1, retry_on: ["retrieval_timeout"] },
    scheduler: { max_concurrent: 1, rpm: 4, timeout_ms: 600_000 }
  },
  {
    id: "computation",
    role: "computation",
    model_profile: "symbolic_reasoning",
    tool_profile: "profile:computation",
    allowed_tools: [...baseAllowedTools, "runner.sympy_exact", "runner.counterexample_search"],
    forbidden_tools: [...globalForbiddenTools],
    write_scope_templates: [".comath/workstreams/${WS_ID}/", ".tmp/comath/${ARUN_ID}/"],
    may_mutate_trusted_state: false,
    proof_authority: "none",
    max_rounds: 6,
    retry_policy: { max_retries: 1, retry_on: ["runner_timeout"] },
    scheduler: { max_concurrent: 1, rpm: 4, timeout_ms: 600_000 }
  },
  {
    id: "proof-route",
    role: "proof_route",
    model_profile: "strongest_lean",
    tool_profile: "profile:proof-route",
    allowed_tools: [...baseAllowedTools, "lean.skeleton.write", "proof_memory.read"],
    forbidden_tools: [...globalForbiddenTools],
    write_scope_templates: [".comath/workstreams/${WS_ID}/", ".tmp/comath/${ARUN_ID}/"],
    may_mutate_trusted_state: false,
    proof_authority: "none",
    max_rounds: 8,
    retry_policy: { max_retries: 1, retry_on: ["lean_timeout"] },
    scheduler: { max_concurrent: 1, rpm: 4, timeout_ms: 600_000 }
  },
  {
    id: "formalization",
    role: "formalization",
    model_profile: "lean_strong",
    tool_profile: "profile:formalization",
    allowed_tools: [...baseAllowedTools, "lean.file.write.scoped", "lean.check.scoped"],
    forbidden_tools: [...globalForbiddenTools],
    write_scope_templates: [".comath/workstreams/${WS_ID}/", ".tmp/comath/${ARUN_ID}/"],
    may_mutate_trusted_state: false,
    proof_authority: "none",
    max_rounds: 8,
    retry_policy: { max_retries: 1, retry_on: ["lean_timeout"] },
    scheduler: { max_concurrent: 1, rpm: 4, timeout_ms: 600_000 }
  },
  {
    id: "reviewer",
    role: "reviewer",
    model_profile: "strong_auditor",
    tool_profile: "profile:reviewer",
    allowed_tools: [...baseAllowedTools, "review.read_artifacts", "review.write_audit"],
    forbidden_tools: [...globalForbiddenTools],
    write_scope_templates: [".comath/workstreams/${WS_ID}/", ".tmp/comath/${ARUN_ID}/"],
    may_mutate_trusted_state: false,
    proof_authority: "none",
    max_rounds: 4,
    retry_policy: { max_retries: 0, retry_on: [] },
    scheduler: { max_concurrent: 1, rpm: 4, timeout_ms: 600_000 }
  },
  {
    id: "graph-builder",
    role: "graph_builder",
    model_profile: "planning_strong",
    tool_profile: "profile:graph-builder",
    allowed_tools: [...baseAllowedTools, "graph_patch.propose"],
    forbidden_tools: [...globalForbiddenTools],
    write_scope_templates: [".comath/workstreams/${WS_ID}/", ".tmp/comath/${ARUN_ID}/"],
    may_mutate_trusted_state: false,
    proof_authority: "none",
    max_rounds: 4,
    retry_policy: { max_retries: 0, retry_on: [] },
    scheduler: { max_concurrent: 1, rpm: 4, timeout_ms: 600_000 }
  },
  {
    id: "security-auditor",
    role: "security_auditor",
    model_profile: "strong_auditor",
    tool_profile: "profile:security-auditor",
    allowed_tools: [...baseAllowedTools, "security.scan_paths", "security.review_logs"],
    forbidden_tools: [...globalForbiddenTools],
    write_scope_templates: [".comath/workstreams/${WS_ID}/", ".tmp/comath/${ARUN_ID}/"],
    may_mutate_trusted_state: false,
    proof_authority: "none",
    max_rounds: 4,
    retry_policy: { max_retries: 0, retry_on: [] },
    scheduler: { max_concurrent: 1, rpm: 4, timeout_ms: 600_000 }
  },
  {
    id: "math-integrity-auditor",
    role: "math_integrity_auditor",
    model_profile: "formal_spec_strong",
    tool_profile: "profile:math-integrity-auditor",
    allowed_tools: [...baseAllowedTools, "math_integrity.check", "lean.audit.read"],
    forbidden_tools: [...globalForbiddenTools],
    write_scope_templates: [".comath/workstreams/${WS_ID}/", ".tmp/comath/${ARUN_ID}/"],
    may_mutate_trusted_state: false,
    proof_authority: "none",
    max_rounds: 4,
    retry_policy: { max_retries: 0, retry_on: [] },
    scheduler: { max_concurrent: 1, rpm: 4, timeout_ms: 600_000 }
  }
];

export function listAgentProfiles(): AgentProfile[] {
  return profiles.map((profile) => ({
    ...profile,
    allowed_tools: [...profile.allowed_tools],
    forbidden_tools: [...profile.forbidden_tools],
    write_scope_templates: [...profile.write_scope_templates],
    retry_policy: {
      max_retries: profile.retry_policy.max_retries,
      retry_on: [...profile.retry_policy.retry_on]
    },
    scheduler: { ...profile.scheduler }
  }));
}

export function getAgentProfile(profileId: string): AgentProfile {
  const profile = listAgentProfiles().find((candidate) => candidate.id === profileId);
  if (!profile) {
    throw new ComathError(`unknown agent profile: ${profileId}`, { statusCode: 400, code: "AGENT_PROFILE_UNKNOWN" });
  }
  return profile;
}

export function validateAgentProfiles(inputProfiles: AgentProfile[], options: { global_rpm: number }): AgentProfileValidation {
  const vetoes: AgentProfileValidation["vetoes"] = [];
  const seen = new Set<string>();

  for (const profile of inputProfiles) {
    if (seen.has(profile.id)) {
      vetoes.push({ code: "duplicate_profile_id", profile_id: profile.id, message: `duplicate profile: ${profile.id}` });
    }
    seen.add(profile.id);
    if (profile.may_mutate_trusted_state !== false) {
      vetoes.push({ code: "profile_mutates_trusted_state", profile_id: profile.id, message: "profile may mutate trusted state" });
    }
    if (profile.proof_authority !== "none") {
      vetoes.push({ code: "profile_claims_proof_authority", profile_id: profile.id, message: "profile claims proof authority" });
    }
    if (profile.scheduler.rpm > options.global_rpm) {
      vetoes.push({ code: "profile_rpm_exceeds_global", profile_id: profile.id, message: "profile rpm exceeds global rpm" });
    }
    for (const forbidden of profile.forbidden_tools) {
      if (profile.allowed_tools.includes(forbidden)) {
        vetoes.push({ code: "profile_allows_forbidden_tool", profile_id: profile.id, message: `profile allows ${forbidden}` });
      }
    }
    for (const requiredScope of [".comath/workstreams/${WS_ID}/", ".tmp/comath/${ARUN_ID}/"]) {
      if (!profile.write_scope_templates.includes(requiredScope)) {
        vetoes.push({ code: "profile_missing_write_scope", profile_id: profile.id, message: `missing ${requiredScope}` });
      }
    }
  }

  return { ok: vetoes.length === 0, vetoes, warnings: [] };
}

export function createAgentRunForProfile(projectRoot: string, input: CreateAgentRunForProfileInput): AgentRun {
  const profile = getAgentProfile(input.profile_id);
  const run = createAgentRun(projectRoot, {
    project_id: input.project_id,
    campaign_id: input.campaign_id,
    workstream_id: input.workstream_id,
    role: profile.role,
    model: profile.model_profile,
    tool_profile: profile.tool_profile,
    actor: input.actor
  });
  appendAuditEvent(projectRoot, {
    project_id: input.project_id,
    event_type: "agent_run.profile_bound",
    actor: input.actor,
    target_id: run.id,
    payload: {
      profile_id: profile.id,
      model_profile: profile.model_profile,
      tool_profile: profile.tool_profile,
      proof_authority: profile.proof_authority
    }
  });
  return run;
}

export function buildAgentProfileLaunch(projectRoot: string, input: BuildAgentProfileLaunchInput): AgentProfileLaunch {
  const profile = getAgentProfile(input.profile_id);
  const launch: AgentProfileLaunch = {
    profile,
    scheduler_options: {
      max_concurrent: profile.scheduler.max_concurrent,
      rpm: profile.scheduler.rpm,
      allowed_programs: [input.program]
    },
    launch_input: {
      project_id: input.project_id,
      run_id: input.run_id,
      command: {
        program: input.program,
        args: [
          "--profile",
          profile.id,
          "--role",
          profile.role,
          "--goal",
          input.goal,
          "--context",
          input.context_path
        ],
        env: {
          COMATH_AGENT_PROFILE_ID: profile.id,
          COMATH_AGENT_MODEL_PROFILE: profile.model_profile,
          COMATH_AGENT_TOOL_PROFILE: profile.tool_profile,
          COMATH_PROOF_AUTHORITY: profile.proof_authority
        }
      },
      timeout_ms: profile.scheduler.timeout_ms,
      actor: input.actor
    }
  };
  appendAuditEvent(projectRoot, {
    project_id: input.project_id,
    event_type: "agent_run.profile_launch_prepared",
    actor: input.actor,
    target_id: input.run_id,
    payload: {
      profile_id: profile.id,
      scheduler: launch.scheduler_options,
      timeout_ms: launch.launch_input.timeout_ms
    }
  });
  return launch;
}

export async function executeProfileAgentRun(
  projectRoot: string,
  input: ExecuteProfileAgentRunInput
): Promise<ExecuteProfileAgentRunResult> {
  const run = createAgentRunForProfile(projectRoot, {
    project_id: input.project_id,
    campaign_id: input.campaign_id,
    workstream_id: input.workstream_id,
    profile_id: input.profile_id,
    actor: input.actor
  });
  const launch = buildAgentProfileLaunch(projectRoot, {
    project_id: input.project_id,
    run_id: run.id,
    profile_id: input.profile_id,
    program: input.program,
    goal: input.goal,
    context_path: input.context_path,
    actor: input.actor
  });
  launch.launch_input.command.args = [
    ...(input.adapter_args ?? []),
    ...(launch.launch_input.command.args ?? [])
  ];
  const scheduler = createAgentRunScheduler(launch.scheduler_options);
  const result = await scheduler.launch(projectRoot, launch.launch_input);
  appendAuditEvent(projectRoot, {
    project_id: input.project_id,
    event_type: "agent_run.profile_executed",
    actor: input.actor,
    target_id: run.id,
    payload: {
      profile_id: launch.profile.id,
      status: result.status,
      exit_code: result.exit_code,
      report_path: result.report_path,
      proof_authority: launch.profile.proof_authority
    }
  });
  return {
    profile: launch.profile,
    run: {
      ...run,
      status: result.status,
      report_path: result.report_path
    },
    launch,
    result
  };
}
