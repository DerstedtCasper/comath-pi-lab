import { mkdirSync, writeFileSync } from "node:fs";
import { join, relative } from "node:path";
import {
  assertPathAllowed,
  candidateManifestSchema,
  candidateRunSchema,
  defaultVariants,
  dialecticalStressSchema
} from "../../../dist/index.js";

const natAddZeroSmokeFamily = {
  id: "nat_add_zero_smoke_fixture",
  proposition: "n + 0 = n",
  dependency: "Nat.add_zero"
};

function candidateWorkspaceRel(campaign, obligationId, variantSlug) {
  return join(".comath", "campaign", campaign.campaign_id, "ensembles", "lemma_sprint", obligationId, variantSlug);
}

function writeJson(projectRoot, relativePath, value) {
  const path = assertPathAllowed(projectRoot, relativePath, { purpose: "runtime-write" });
  mkdirSync(join(path, ".."), { recursive: true });
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  return path;
}

function writeCandidateAuditArtifacts({ projectRoot, workspaceRel, manifest }) {
  writeJson(projectRoot, join(workspaceRel, "dependency_delta.json"), {
    candidate_id: manifest.candidate_id,
    introduced_dependencies: manifest.introduced_dependencies,
    removed_dependencies: [],
    dependency_closure_required: false
  });
  writeJson(projectRoot, join(workspaceRel, "assumption_delta.json"), {
    candidate_id: manifest.candidate_id,
    introduced_assumptions: manifest.introduced_assumptions,
    hidden_assumption_warnings: []
  });
  writeJson(projectRoot, join(workspaceRel, "replay_commands.json"), {
    candidate_id: manifest.candidate_id,
    commands: [],
    replayable: false
  });
  writeJson(projectRoot, join(workspaceRel, "failure_routes.json"), {
    candidate_id: manifest.candidate_id,
    failures: manifest.failures,
    hard_vetoes: manifest.hard_vetoes,
    recovery_hints: ["preserve as failed-route memory", "rerun only after real LeanRunner replay evidence exists"]
  });
  writeJson(projectRoot, join(workspaceRel, "graph_patch.json"), {
    patch_id: null,
    state: "candidate_output_only",
    candidate_id: manifest.candidate_id,
    trusted_mutation: false,
    new_nodes: [],
    new_edges: [],
    updated_nodes: [],
    apply_preconditions: ["reviewed_by_coordinator", "submitted_through_comathd_graph_patch_route"]
  });
}

function writeDialecticalStressArtifact({ projectRoot, workspaceRel, manifest, obligation }) {
  const artifact = dialecticalStressSchema.parse({
    candidate_id: manifest.candidate_id,
    variant_id: manifest.variant_id,
    stage: manifest.stage,
    obligation_id: manifest.obligation_id,
    locked_statement_hash: manifest.locked_statement_hash,
    P: obligation.locked_statement_nl,
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
    U: [obligation.locked_statement_nl],
    proof_authority: "none",
    must_be_checked_by: ["Lean", "exact computation", "citation gate"]
  });
  writeJson(projectRoot, join(workspaceRel, "dialectical_stress.json"), artifact);
}

export function runTrivialNatAddZeroCandidates({ projectRoot, campaign, obligation }) {
  const candidates = [];
  const manifests = [];

  defaultVariants.forEach((variant, index) => {
    const candidateId = `CAND-${String(index + 1).padStart(4, "0")}`;
    const workspaceRel = candidateWorkspaceRel(campaign, obligation.obligation_id, variant.slug);
    const workspacePath = assertPathAllowed(projectRoot, workspaceRel, { purpose: "runtime-write" });
    mkdirSync(workspacePath, { recursive: true });

    const manifest = candidateManifestSchema.parse({
      candidate_id: candidateId,
      campaign_id: campaign.campaign_id,
      variant_id: variant.variant_id,
      stage: "lemma_sprint",
      obligation_id: obligation.obligation_id,
      workspace_path: workspaceRel.replace(/\\/g, "/"),
      locked_statement_hash: obligation.statement_hash,
      candidate_statement_hash: obligation.statement_hash,
      state: "candidate_blocked",
      statement_equivalence_claim: "exact",
      theorem_family: natAddZeroSmokeFamily.id,
      canonical_proposition: natAddZeroSmokeFamily.proposition,
      primary_dependency: natAddZeroSmokeFamily.dependency,
      dependencies: [],
      assumptions: [],
      introduced_assumptions: [],
      introduced_dependencies: [],
      artifacts: [
        { path: "dependency_delta.json", kind: "dependency_delta", required_for: ["candidate_verification"] },
        { path: "assumption_delta.json", kind: "assumption_delta", required_for: ["candidate_verification"] },
        { path: "replay_commands.json", kind: "replay_commands", required_for: ["candidate_verification", "replay"] },
        { path: "failure_routes.json", kind: "failure_routes", required_for: ["failure_memory"] },
        { path: "graph_patch.json", kind: "graph_patch", required_for: ["review"] },
        { path: "report.md", kind: "report", required_for: ["review"] }
      ],
      lean_files: [],
      logs: [],
      evidence: [],
      hard_vetoes: ["business_layer_theorem_prover_forbidden"],
      failures: [
        `${variant.name} is a Nat theorem smoke fixture and cannot produce production proof-grade evidence.`,
        "A real candidate must be checked by service-owned LeanRunner replay before arbitration can select it."
      ],
      replay_command: "",
      summary: `${variant.name} retained as non-promotional Nat smoke fixture output.`,
      maintainability_notes: "Preserved as blocked fixture/failure memory until real per-candidate replay is implemented."
    });
    const manifestAbs = writeJson(projectRoot, join(workspaceRel, "candidate_manifest.json"), manifest);
    writeCandidateAuditArtifacts({ projectRoot, workspaceRel, manifest });
    if (variant.variant_id === "V8") {
      writeDialecticalStressArtifact({ projectRoot, workspaceRel, manifest, obligation });
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
        campaign_id: campaign.campaign_id,
        stage: "lemma_sprint",
        obligation_id: obligation.obligation_id,
        variant_id: variant.variant_id,
        workspace_path: relative(projectRoot, workspacePath).replace(/\\/g, "/"),
        locked_statement_hash: obligation.statement_hash,
        candidate_statement_hash: obligation.statement_hash,
        state: "candidate_blocked",
        manifest_path: relative(projectRoot, manifestAbs).replace(/\\/g, "/"),
        score: -100,
        hard_vetoes: ["business_layer_theorem_prover_forbidden"],
        artifacts: [],
        replay_command: undefined
      })
    );
  });

  return { candidates, manifests };
}
