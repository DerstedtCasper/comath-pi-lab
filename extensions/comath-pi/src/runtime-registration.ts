type RuntimeToolDescriptor = {
  name: string;
  description: string;
  mutates: boolean;
  input_schema: {
    type: "object";
    required?: string[];
    properties: Record<string, unknown>;
  };
};

type RuntimeResourceDescriptor = {
  uri: string;
  kind: string;
};

type RuntimeSubagentDescriptor = {
  id: string;
};

export type PiRuntimeDetection = {
  source: "local_probe" | "user_supplied" | "unavailable";
  version: string;
  confidence: "verified" | "unverified";
};

export type PiRuntimeRegistrationOptions = {
  package_name: string;
  package_version: string;
  entrypoint: string;
  detected_pi_runtime: PiRuntimeDetection;
  rate_limit: {
    global_rpm: number;
  };
};

export type PiRuntimeRegistrationInput = {
  name: string;
  commands: string[];
  tools: RuntimeToolDescriptor[];
  resources?: RuntimeResourceDescriptor[];
  subagents?: RuntimeSubagentDescriptor[];
};

export type PiRuntimeCommandRegistration = {
  command: string;
  subcommands: string[];
  dispatch_tool?: string;
  mutates: boolean;
  requires_confirmation: boolean;
  goal_compatible: boolean;
};

export type PiRuntimeToolRegistration = RuntimeToolDescriptor & {
  requires_confirmation: boolean;
  pi_goal_continuation: boolean;
  bounded_tick: boolean;
};

export type PiRuntimeRegistration = {
  schema_version: "comath.pi.runtime.registration.v1";
  extension_id: string;
  package: {
    name: string;
    version: string;
  };
  entrypoint: string;
  detected_pi_runtime: PiRuntimeDetection;
  runtime_policy: {
    global_rpm: number;
    tick_budget: {
      default_max_ticks: number;
      per_tick_mutation_owner: "comathd";
    };
  };
  boundary: {
    trusted_state_access: "comathd_only";
    extension_writes_runtime_state: false;
    pi_session_is_math_authority: false;
  };
  service_authority: {
    comathd_owns: string[];
  };
  commands: PiRuntimeCommandRegistration[];
  tools: PiRuntimeToolRegistration[];
  resources: RuntimeResourceDescriptor[];
  subagents: string[];
  permissions: {
    default_for_mutations: "deny_until_confirmed";
    readonly_tools_allowed_without_confirmation: true;
    mutating_tools_requiring_confirmation: string[];
  };
};

export type PiRuntimeRegistrationVeto = {
  code: string;
  message: string;
};

export type PiRuntimeRegistrationValidation = {
  ok: boolean;
  vetoes: PiRuntimeRegistrationVeto[];
  warnings: string[];
};

const COMATHD_OWNED_STATE = [
  "ResearchCampaign",
  "claim_graph",
  "evidence_graph",
  "workstreams",
  "proof_memory",
  "failure_memory",
  "TriviumDB_adapter",
  "Lean_verification",
  "final_audit",
  "global_replay",
  "goal_mode_resume_state",
  "goal_mode_export_pack"
];

function stripHostInjectedConfirmation(schema: RuntimeToolDescriptor["input_schema"]): RuntimeToolDescriptor["input_schema"] {
  if (!schema.required?.includes("confirmation_id") && !Object.hasOwn(schema.properties, "confirmation_id")) {
    return schema;
  }
  const { confirmation_id: _confirmationId, ...properties } = schema.properties;
  return {
    ...schema,
    required: schema.required?.filter((field) => field !== "confirmation_id"),
    properties
  };
}

function normalizeExtensionId(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function commandMetadata(command: string): Pick<
  PiRuntimeCommandRegistration,
  "subcommands" | "dispatch_tool" | "mutates" | "goal_compatible"
> {
  if (command === "/cm:research") {
    return {
      subcommands: ["start", "--goal", "--paper", "--attach", "--workspace-ref", "--mode", "--strict", "--budget"],
      dispatch_tool: "comath.research.runCampaignLoop",
      mutates: true,
      goal_compatible: true
    };
  }
  if (command === "/cm:campaign") {
    return {
      subcommands: ["status", "tick", "next-actions", "resume", "cancel", "export", "final-audit", "replay"],
      dispatch_tool: "comath.campaign.tick",
      mutates: true,
      goal_compatible: true
    };
  }
  if (command === "/cm:agent") {
    return {
      subcommands: ["profiles", "profile", "packages", "run", "prepare-launch", "execute", "logs", "health", "prepare-package", "execute-package"],
      dispatch_tool: "comath.agent.runForProfile",
      mutates: true,
      goal_compatible: true
    };
  }
  if (command === "/cm:audit") {
    return {
      subcommands: ["final"],
      dispatch_tool: "comath.campaign.finalAudit",
      mutates: true,
      goal_compatible: false
    };
  }
  if (command === "/cm:replay") {
    return {
      subcommands: ["final", "verify", "verify-manifest"],
      dispatch_tool: "comath.campaign.replay",
      mutates: true,
      goal_compatible: false
    };
  }
  if (command === "/cm:snapshot") {
    return {
      subcommands: ["export", "verify", "restore", "verify-manifest"],
      dispatch_tool: "comath.snapshot.verify",
      mutates: true,
      goal_compatible: false
    };
  }
  if (command === "/cm:release") {
    return {
      subcommands: [
        "source-review",
        "review",
        "pi-codex-lifecycle",
        "codex-api-probe",
        "real-pi-runtime-probe",
        "lifecycle-walkthrough",
        "lifecycle-control",
        "lifecycle-session",
        "lifecycle-operator-session",
        "lifecycle-operator-transport-recovery",
        "lifecycle-operator-transport-lease",
        "lifecycle-operator-transport-heartbeat",
        "lifecycle-guided-real-pi-execution",
        "agent-adapter-os-isolation-probe",
        "agent-adapter-os-isolation-sandbox-execution",
        "agent-adapter-os-isolation-provider-host-capability-probe",
        "agent-adapter-os-isolation-provider-helper-host-validation"
      ],
      dispatch_tool: "comath.release.publicArchiveReview",
      mutates: true,
      goal_compatible: false
    };
  }
  if (command === "/cm:paper") {
    return {
      subcommands: ["init", "state", "update-section", "render-claim", "check", "export"],
      dispatch_tool: "comath.paper.state",
      mutates: true,
      goal_compatible: false
    };
  }
  if (command === "/cm:claim") {
    return {
      subcommands: ["register", "get", "request-promotion"],
      dispatch_tool: "comath.claim.get",
      mutates: true,
      goal_compatible: false
    };
  }
  return {
    subcommands: [],
    dispatch_tool: undefined,
    mutates: false,
    goal_compatible: false
  };
}

export function createPiRuntimeRegistration(
  extension: PiRuntimeRegistrationInput,
  options: PiRuntimeRegistrationOptions
): PiRuntimeRegistration {
  const tools = extension.tools.map((tool) => ({
    ...tool,
    input_schema: tool.mutates ? stripHostInjectedConfirmation(tool.input_schema) : tool.input_schema,
    requires_confirmation: tool.mutates,
    pi_goal_continuation: tool.name === "comath.research.runCampaignLoop",
    bounded_tick: tool.name === "comath.campaign.tick"
  }));
  const mutatingTools = tools.filter((tool) => tool.mutates).map((tool) => tool.name).sort();

  return {
    schema_version: "comath.pi.runtime.registration.v1",
    extension_id: normalizeExtensionId(extension.name),
    package: {
      name: options.package_name,
      version: options.package_version
    },
    entrypoint: options.entrypoint,
    detected_pi_runtime: options.detected_pi_runtime,
    runtime_policy: {
      global_rpm: options.rate_limit.global_rpm,
      tick_budget: {
        default_max_ticks: 8,
        per_tick_mutation_owner: "comathd"
      }
    },
    boundary: {
      trusted_state_access: "comathd_only",
      extension_writes_runtime_state: false,
      pi_session_is_math_authority: false
    },
    service_authority: {
      comathd_owns: [...COMATHD_OWNED_STATE]
    },
    commands: extension.commands.map((command) => {
      const metadata = commandMetadata(command);
      return {
        command,
        subcommands: metadata.subcommands,
        dispatch_tool: metadata.dispatch_tool,
        mutates: metadata.mutates,
        requires_confirmation: metadata.mutates,
        goal_compatible: metadata.goal_compatible
      };
    }),
    tools,
    resources: extension.resources ?? [],
    subagents: (extension.subagents ?? []).map((subagent) => subagent.id),
    permissions: {
      default_for_mutations: "deny_until_confirmed",
      readonly_tools_allowed_without_confirmation: true,
      mutating_tools_requiring_confirmation: mutatingTools
    }
  };
}

function addVeto(vetoes: PiRuntimeRegistrationVeto[], code: string, message: string): void {
  vetoes.push({ code, message });
}

export function validatePiRuntimeRegistration(
  registration: PiRuntimeRegistration,
  options: {
    expected_global_rpm: number;
    require_goal_continuation?: boolean;
  }
): PiRuntimeRegistrationValidation {
  const vetoes: PiRuntimeRegistrationVeto[] = [];
  const warnings: string[] = [];

  if (registration.schema_version !== "comath.pi.runtime.registration.v1") {
    addVeto(vetoes, "schema_version_mismatch", "Pi runtime registration schema version is not supported");
  }
  if (registration.runtime_policy.global_rpm !== options.expected_global_rpm) {
    addVeto(vetoes, "global_rpm_mismatch", "Pi runtime registration does not preserve the required global RPM");
  }
  if (registration.runtime_policy.tick_budget.per_tick_mutation_owner !== "comathd") {
    addVeto(vetoes, "tick_owner_not_comathd", "Campaign tick mutations must be owned by comathd");
  }
  if (
    registration.boundary.trusted_state_access !== "comathd_only" ||
    registration.boundary.extension_writes_runtime_state !== false ||
    registration.boundary.pi_session_is_math_authority !== false
  ) {
    addVeto(vetoes, "trusted_state_boundary_violation", "Pi extension registration violates the comathd authority boundary");
  }

  const owned = new Set(registration.service_authority.comathd_owns);
  for (const required of COMATHD_OWNED_STATE) {
    if (!owned.has(required)) {
      addVeto(vetoes, "missing_comathd_authority", `comathd ownership is missing: ${required}`);
    }
  }

  const confirmedMutations = new Set(registration.permissions.mutating_tools_requiring_confirmation);
  for (const tool of registration.tools) {
    if (tool.mutates && (!tool.requires_confirmation || !confirmedMutations.has(tool.name))) {
      addVeto(vetoes, "mutating_tool_without_confirmation", `Mutating tool lacks confirmation gate: ${tool.name}`);
    }
    if (!tool.mutates && tool.requires_confirmation) {
      warnings.push(`Read-only tool requires confirmation: ${tool.name}`);
    }
  }

  for (const command of registration.commands) {
    if (command.mutates && !command.requires_confirmation) {
      addVeto(vetoes, "mutating_command_without_confirmation", `Mutating command lacks confirmation gate: ${command.command}`);
    }
  }

  if (options.require_goal_continuation) {
    const researchCommand = registration.commands.find((command) => command.command === "/cm:research");
    const loopTool = registration.tools.find((tool) => tool.name === "comath.research.runCampaignLoop");
    const tickTool = registration.tools.find((tool) => tool.name === "comath.campaign.tick");
    if (
      !researchCommand ||
      researchCommand.goal_compatible !== true ||
      researchCommand.dispatch_tool !== "comath.research.runCampaignLoop"
    ) {
      addVeto(vetoes, "research_goal_command_not_registered", "The /cm:research goal continuation command is not registered");
    }
    if (!loopTool?.pi_goal_continuation) {
      addVeto(vetoes, "goal_loop_tool_not_registered", "The campaign loop tool is not registered for Pi goal continuation");
    }
    if (!tickTool?.bounded_tick) {
      addVeto(vetoes, "bounded_tick_tool_not_registered", "The campaign tick tool is not registered as a bounded tick");
    }
  }

  return {
    ok: vetoes.length === 0,
    vetoes,
    warnings
  };
}
