import { mkdirSync, writeFileSync } from "node:fs";
import { join, relative } from "node:path";
import { assertPathAllowed } from "../../security/path-policy.js";
import {
  candidateManifestSchema,
  candidateRunSchema,
  dialecticalStressSchema,
  type CandidateManifest,
  type CandidateRun,
  type ProofObligation,
  type ResearchCampaign
} from "../../types/schemas.js";
import { getTheoremFamilyById, type TheoremFamily } from "../lean/theorem-family.js";
import { candidateWorkspaceRel } from "./paths.js";
import { defaultVariants } from "./variant-registry.js";

export type CandidateBatch = {
  candidates: CandidateRun[];
  manifests: CandidateManifest[];
};

function writeJson(projectRoot: string, relativePath: string, value: unknown): string {
  const path = assertPathAllowed(projectRoot, relativePath, { purpose: "runtime-write" });
  mkdirSync(join(path, ".."), { recursive: true });
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  return path;
}

function writeCandidateAuditArtifacts(input: {
  projectRoot: string;
  workspaceRel: string;
  manifest: CandidateManifest;
  theoremFamily: TheoremFamily;
}): void {
  writeJson(input.projectRoot, join(input.workspaceRel, "dependency_delta.json"), {
    candidate_id: input.manifest.candidate_id,
    introduced_dependencies: input.manifest.introduced_dependencies,
    removed_dependencies: [],
    dependency_closure_required: false
  });
  writeJson(input.projectRoot, join(input.workspaceRel, "assumption_delta.json"), {
    candidate_id: input.manifest.candidate_id,
    introduced_assumptions: input.manifest.introduced_assumptions,
    hidden_assumption_warnings: []
  });
  writeJson(input.projectRoot, join(input.workspaceRel, "replay_commands.json"), {
    candidate_id: input.manifest.candidate_id,
    commands: [],
    replayable: false
  });
  writeJson(input.projectRoot, join(input.workspaceRel, "failure_routes.json"), {
    candidate_id: input.manifest.candidate_id,
    failures: input.manifest.failures,
    hard_vetoes: input.manifest.hard_vetoes,
    recovery_hints: ["preserve as failed-route memory", "rerun only after real LeanRunner replay evidence exists"]
  });
  writeJson(input.projectRoot, join(input.workspaceRel, "graph_patch.json"), {
    patch_id: null,
    state: "candidate_output_only",
    candidate_id: input.manifest.candidate_id,
    trusted_mutation: false,
    new_nodes: [],
    new_edges: [],
    updated_nodes: [],
    apply_preconditions: ["reviewed_by_coordinator", "submitted_through_comathd_graph_patch_route"]
  });
}

function writeDialecticalStressArtifact(input: {
  projectRoot: string;
  workspaceRel: string;
  manifest: CandidateManifest;
  obligation: ProofObligation;
}): void {
  const artifact = dialecticalStressSchema.parse({
    candidate_id: input.manifest.candidate_id,
    variant_id: input.manifest.variant_id,
    stage: input.manifest.stage,
    obligation_id: input.manifest.obligation_id,
    locked_statement_hash: input.manifest.locked_statement_hash,
    P: input.obligation.locked_statement_nl,
    not_P: [
      "Check boundary cases before trusting the route, especially the smallest natural number.",
      "Check whether the proof attempt silently changes the order, domain, or operation in the locked statement."
    ],
    Q: [
      "Reconcile the route by proving the exact locked statement in Lean without adding assumptions.",
      "Prefer a standard library theorem only when statement equivalence and dependency closure remain exact."
    ],
    not_Q: [
      "A plausible reconciliation is still not evidence until Lean replay, static audit, and statement equivalence pass.",
      "Any revised theorem must return to problem lock before it can replace the current target."
    ],
    R: [
      "The route is admissible only if the candidate statement hash equals the locked statement hash.",
      "The route is admissible only if no unauthorized sorry, axiom, constant, unsafe, or opaque escape hatch appears."
    ],
    U: [input.obligation.locked_statement_nl],
    proof_authority: "none",
    must_be_checked_by: ["Lean", "exact computation", "citation gate"]
  });
  writeJson(input.projectRoot, join(input.workspaceRel, "dialectical_stress.json"), artifact);
}

export function runTheoremFamilyCandidates(input: {
  projectRoot: string;
  campaign: ResearchCampaign;
  obligation: ProofObligation;
  theoremFamily: TheoremFamily;
}): CandidateBatch {
  const candidates: CandidateRun[] = [];
  const manifests: CandidateManifest[] = [];

  defaultVariants.forEach((variant, index) => {
    const candidateId = `CAND-${String(index + 1).padStart(4, "0")}`;
    const workspaceRel = candidateWorkspaceRel(input.campaign, input.obligation.obligation_id, variant.slug);
    const workspacePath = assertPathAllowed(input.projectRoot, workspaceRel, { purpose: "runtime-write" });
    mkdirSync(workspacePath, { recursive: true });

    const candidateState = "candidate_blocked";
    const auditArtifacts = [
      { path: "dependency_delta.json", kind: "dependency_delta", required_for: ["candidate_verification"] },
      { path: "assumption_delta.json", kind: "assumption_delta", required_for: ["candidate_verification"] },
      { path: "replay_commands.json", kind: "replay_commands", required_for: ["candidate_verification", "replay"] },
      { path: "failure_routes.json", kind: "failure_routes", required_for: ["failure_memory"] },
      { path: "graph_patch.json", kind: "graph_patch", required_for: ["review"] },
      { path: "report.md", kind: "report", required_for: ["review"] }
    ];
    const manifest = candidateManifestSchema.parse({
      candidate_id: candidateId,
      campaign_id: input.campaign.campaign_id,
      variant_id: variant.variant_id,
      stage: "lemma_sprint",
      obligation_id: input.obligation.obligation_id,
      workspace_path: workspaceRel.replace(/\\/g, "/"),
      locked_statement_hash: input.obligation.statement_hash,
      candidate_statement_hash: input.obligation.statement_hash,
      state: candidateState,
      statement_equivalence_claim: "exact",
      theorem_family: input.theoremFamily.id,
      canonical_proposition: input.theoremFamily.proposition,
      primary_dependency: input.theoremFamily.dependency,
      dependencies: [],
      assumptions: [],
      introduced_assumptions: [],
      introduced_dependencies: [],
      artifacts: auditArtifacts,
      lean_files: [],
      logs: [],
      evidence: [],
      hard_vetoes: ["business_layer_theorem_prover_forbidden"],
      failures: [
        `${variant.name} is a theorem-family smoke fixture and cannot produce production proof-grade evidence.`,
        "A real candidate must be checked by service-owned LeanRunner replay before arbitration can select it."
      ],
      replay_command: "",
      summary: `${variant.name} retained as non-promotional theorem-family fixture output.`,
      maintainability_notes: "Preserved as blocked fixture/failure memory until real per-candidate replay is implemented."
    });
    const manifestAbs = writeJson(input.projectRoot, join(workspaceRel, "candidate_manifest.json"), manifest);
    writeCandidateAuditArtifacts({
      projectRoot: input.projectRoot,
      workspaceRel,
      manifest,
      theoremFamily: input.theoremFamily
    });
    if (variant.variant_id === "V8") {
      writeDialecticalStressArtifact({
        projectRoot: input.projectRoot,
        workspaceRel,
        manifest,
        obligation: input.obligation
      });
    }
    writeFileSync(
      join(workspacePath, "report.md"),
      [
        `# ${variant.name}`,
        "",
        `Purpose: ${variant.purpose}`,
        "",
        "Outcome: blocked fixture output; no proof-grade evidence without service-owned LeanRunner replay.",
        ""
      ].join("\n"),
      "utf8"
    );

    manifests.push(manifest);
    candidates.push(
      candidateRunSchema.parse({
        candidate_id: candidateId,
        campaign_id: input.campaign.campaign_id,
        stage: "lemma_sprint",
        obligation_id: input.obligation.obligation_id,
        variant_id: variant.variant_id,
        workspace_path: relative(input.projectRoot, workspacePath).replace(/\\/g, "/"),
        locked_statement_hash: input.obligation.statement_hash,
        candidate_statement_hash: input.obligation.statement_hash,
        state: candidateState,
        manifest_path: relative(input.projectRoot, manifestAbs).replace(/\\/g, "/"),
        score: -100,
        hard_vetoes: ["business_layer_theorem_prover_forbidden"],
        artifacts: [],
        replay_command: undefined
      })
    );
  });

  return { candidates, manifests };
}

export function runTrivialNatAddZeroCandidates(input: {
  projectRoot: string;
  campaign: ResearchCampaign;
  obligation: ProofObligation;
}): CandidateBatch {
  return runTheoremFamilyCandidates({
    ...input,
    theoremFamily: getTheoremFamilyById("nat_add_zero")
  });
}
