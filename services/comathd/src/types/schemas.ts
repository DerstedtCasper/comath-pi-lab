import { z } from "zod";

const isoTimestamp = z.string().datetime();
const stableId = z.string().regex(/^[A-Z]+-\d{4,}$/);
const sha256 = z.string().regex(/^[a-f0-9]{64}$/);

export const claimStatusSchema = z.enum([
  "draft",
  "conjectural",
  "literature_supported",
  "computationally_supported",
  "symbolically_checked",
  "lean_skeleton",
  "formally_checked",
  "refuted",
  "blocked",
  "retracted",
  "human_accepted"
]);

const privilegedClaimStatuses = new Set<string>([
  "literature_supported",
  "computationally_supported",
  "symbolically_checked",
  "lean_skeleton",
  "formally_checked",
  "human_accepted"
]);

const graphPatchProtectedClaimFields = new Set([
  "status",
  "evidence_level",
  "gate_result_id",
  "formalization_status",
  "audit_state"
]);

export const memoryNodeTypeSchema = z.enum([
  "Claim",
  "Definition",
  "Notation",
  "TheoremReference",
  "ProofStep",
  "Evidence",
  "Counterexample",
  "FailureRoute",
  "Workstream",
  "ReflectionReport",
  "Artifact",
  "Citation",
  "DomainObject"
]);

export const memoryEdgeLabelSchema = z.enum([
  "depends_on",
  "supports",
  "refutes",
  "contradicts",
  "cites",
  "proved_by",
  "blocked_by",
  "same_as",
  "supersedes",
  "retracts",
  "derived_from",
  "produced_by"
]);

export const artifactKindSchema = z.enum([
  "log",
  "paper",
  "tex",
  "bibtex",
  "pdf",
  "notebook",
  "code",
  "screenshot",
  "runner_output",
  "snapshot",
  "other"
]);

export const projectSchema = z
  .object({
    project_id: stableId,
    name: z.string().min(1),
    root_path: z.string().min(1),
    created_at: isoTimestamp,
    updated_at: isoTimestamp
  })
  .strict();

export const artifactRefSchema = z
  .object({
    id: stableId,
    project_id: stableId,
    path: z.string().min(1),
    kind: artifactKindSchema,
    sha256,
    size_bytes: z.number().int().nonnegative().optional(),
    created_at: isoTimestamp
  })
  .strict();

export const evidenceSchema = z
  .object({
    id: stableId,
    project_id: stableId,
    claim_id: stableId.optional(),
    kind: z.enum(["literature", "computation", "symbolic", "lean", "counterexample", "audit", "other"]),
    summary: z.string(),
    artifact_ids: z.array(stableId).default([]),
    created_at: isoTimestamp
  })
  .strict();

export const claimSchema = z
  .object({
    id: stableId,
    project_id: stableId,
    statement: z.string().min(1),
    statement_hash: z.string().min(1),
    status: claimStatusSchema,
    evidence_level: z.union([z.literal(0), z.literal(1), z.literal(2), z.literal(3), z.literal(4), z.literal(5)]),
    assumptions: z.array(z.string()),
    domain: z.string().min(1),
    gate_result_id: stableId.optional(),
    dependency_closure_status: z
      .enum(["unchecked", "partial", "all_dependencies_present", "dependency_blocked", "cycle_detected"])
      .default("unchecked"),
    formalization_status: z
      .enum(["none", "statement_only", "skeleton_with_sorry", "kernel_checked", "failed"])
      .default("none"),
    audit_state: z.enum(["not_audited", "under_review", "audit_failed", "audit_passed"]).default("not_audited"),
    created_at: isoTimestamp,
    updated_at: isoTimestamp
  })
  .strict()
  .superRefine((claim, ctx) => {
    if (privilegedClaimStatuses.has(claim.status) && !claim.gate_result_id) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `${claim.status} claims require gate_result_id`,
        path: ["gate_result_id"]
      });
    }

    if (claim.status !== "formally_checked") {
      return;
    }

    if (claim.formalization_status !== "kernel_checked") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "formally_checked claims require kernel_checked formalization",
        path: ["formalization_status"]
      });
    }
    if (claim.dependency_closure_status !== "all_dependencies_present") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "formally_checked claims require complete dependency closure",
        path: ["dependency_closure_status"]
      });
    }
    if (claim.audit_state !== "audit_passed") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "formally_checked claims require audit_passed",
        path: ["audit_state"]
      });
    }
  });

export const memoryNodeSchema = z
  .object({
    id: stableId,
    project_id: stableId,
    type: memoryNodeTypeSchema,
    title: z.string().min(1),
    payload: z.record(z.string(), z.unknown()).default({}),
    payload_hash: z.string().min(1).optional(),
    created_at: isoTimestamp,
    updated_at: isoTimestamp
  })
  .strict();

export const memoryEdgeSchema = z
  .object({
    id: stableId,
    project_id: stableId,
    source_id: stableId,
    target_id: stableId,
    label: memoryEdgeLabelSchema,
    created_at: isoTimestamp
  })
  .strict();

export const workstreamSchema = z
  .object({
    id: stableId,
    project_id: stableId,
    kind: z.enum(["literature", "computation", "proof_route", "formalization", "review", "domain", "other"]),
    status: z.enum(["queued", "running", "reviewing", "accepted", "failed", "blocked", "archived"]),
    goal: z.string().min(1),
    created_at: isoTimestamp,
    updated_at: isoTimestamp
  })
  .strict();

export const auditEventSchema = z
  .object({
    id: stableId,
    project_id: stableId,
    event_type: z.string().min(1),
    actor: z.string().min(1),
    target_id: stableId.optional(),
    payload: z.record(z.string(), z.unknown()).default({}),
    created_at: isoTimestamp
  })
  .strict();

export const pathPolicyDecisionSchema = z
  .object({
    allowed: z.boolean(),
    reason: z.string(),
    normalized_path: z.string().optional()
  })
  .strict();

export const runnerPermissionEnvelopeSchema = z
  .object({
    command: z.string().min(1),
    cwd: z.string().min(1),
    timeout_ms: z.number().int().positive(),
    network: z.boolean().default(false),
    env_allowlist: z.array(z.string()).default([])
  })
  .strict();

export const stableIdMapEntrySchema = z
  .object({
    project_id: stableId,
    stable_id: stableId,
    trivium_id: z.number().int().nonnegative(),
    node_type: memoryNodeTypeSchema,
    payload_hash: z.string().min(1),
    created_at: isoTimestamp,
    updated_at: isoTimestamp
  })
  .strict();

export const gateResultSchema = z
  .object({
    id: stableId,
    project_id: stableId,
    claim_id: stableId,
    ok: z.boolean(),
    target_status: claimStatusSchema,
    vetoes: z.array(z.string()).default([]),
    warnings: z.array(z.string()).default([]),
    evidence_ids: z.array(stableId).default([]),
    artifact_ids: z.array(stableId).default([]),
    created_at: isoTimestamp
  })
  .strict();

export const citationRecordSchema = z
  .object({
    id: stableId,
    project_id: stableId,
    title: z.string().min(1),
    authors: z.array(z.string()).default([]),
    year: z.number().int().optional(),
    locator: z.string().optional(),
    artifact_id: stableId.optional(),
    created_at: isoTimestamp
  })
  .strict();

export const paperMarginNoteSchema = z
  .object({
    id: stableId,
    project_id: stableId,
    claim_id: stableId.optional(),
    evidence_ids: z.array(stableId).default([]),
    displayed_evidence_ids: z.array(stableId).default([]),
    source_workstreams: z.array(stableId).default([]),
    wording: z.enum(["theorem", "lemma", "proposition", "conjecture", "claim", "remark"]).optional(),
    statement_hash: z.string().min(1).optional(),
    rendered_block_sha256: sha256.optional(),
    warnings: z.array(z.string()).default([]),
    blockers: z.array(z.string()).default([]),
    created_at: isoTimestamp
  })
  .strict();

export const formalProofSystemSchema = z.enum(["lean4"]);

export const formalProofStatusSchema = z.enum([
  "not_run",
  "toolchain_missing",
  "failed",
  "skeleton_only",
  "kernel_checked"
]);

export const formalProofRunSchema = z
  .object({
    id: stableId,
    project_id: stableId,
    claim_id: stableId,
    system: formalProofSystemSchema,
    status: formalProofStatusSchema,
    proof_artifact_id: stableId.optional(),
    log_artifact_id: stableId.optional(),
    theorem_name: z.string().min(1).optional(),
    statement_hash: sha256.optional(),
    toolchain_version: z.string().min(1).optional(),
    dependency_hash: z.string().min(1).optional(),
    contains_sorry: z.boolean(),
    contains_admit: z.boolean(),
    kernel_checked: z.boolean(),
    exit_code: z.number().int().optional(),
    vetoes: z.array(z.string()).default([]),
    warnings: z.array(z.string()).default([]),
    created_at: isoTimestamp
  })
  .strict()
  .superRefine((run, ctx) => {
    if (run.status !== "kernel_checked") {
      return;
    }
    if (!run.proof_artifact_id) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "kernel_checked formal proof runs require proof_artifact_id",
        path: ["proof_artifact_id"]
      });
    }
    if (!run.log_artifact_id) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "kernel_checked formal proof runs require log_artifact_id",
        path: ["log_artifact_id"]
      });
    }
    if (!run.theorem_name) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "kernel_checked formal proof runs require theorem_name",
        path: ["theorem_name"]
      });
    }
    if (!run.statement_hash) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "kernel_checked formal proof runs require statement_hash",
        path: ["statement_hash"]
      });
    }
    if (!run.dependency_hash) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "kernel_checked formal proof runs require dependency_hash",
        path: ["dependency_hash"]
      });
    }
    if (!run.kernel_checked) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "kernel_checked formal proof runs require kernel_checked=true",
        path: ["kernel_checked"]
      });
    }
    if (run.contains_sorry) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "kernel_checked formal proof runs cannot contain sorry",
        path: ["contains_sorry"]
      });
    }
    if (run.contains_admit) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "kernel_checked formal proof runs cannot contain admit",
        path: ["contains_admit"]
      });
    }
  });

export const provenanceEventSchema = z
  .object({
    id: stableId,
    project_id: stableId,
    event_type: z.string().min(1),
    actor: z.string().min(1),
    target_id: stableId.optional(),
    payload: z.record(z.string(), z.unknown()).default({}),
    created_at: isoTimestamp
  })
  .strict();

export const paperSpanSchema = z
  .object({
    id: stableId,
    project_id: stableId,
    paper_id: z.string().regex(/^PAPER-\d{4,}$/),
    section_id: z.string().min(1),
    claim_id: stableId.optional(),
    text_sha256: sha256,
    margin_note_ids: z.array(stableId).default([]),
    evidence_ids: z.array(stableId).default([]),
    workstream_ids: z.array(stableId).default([]),
    status: z.enum(["draft", "blocked", "reviewing", "accepted", "stale"]),
    created_at: isoTimestamp,
    updated_at: isoTimestamp
  })
  .strict();

export const projectSessionLockSchema = z
  .object({
    lock_id: stableId,
    project_id: stableId,
    owner: z.string().min(1),
    reason: z.string().min(1),
    acquired_at: isoTimestamp,
    expires_at: isoTimestamp
  })
  .strict();

export const mutationQueueEntrySchema = z
  .object({
    id: stableId,
    project_id: stableId,
    actor: z.string().min(1),
    operation: z.string().min(1),
    target_id: stableId.optional(),
    audit_event_id: stableId.optional(),
    payload: z.record(z.string(), z.unknown()).default({}),
    created_at: isoTimestamp
  })
  .strict();

export const mathGraphIndexHealthSchema = z
  .object({
    backend: z.string().min(1),
    truth_source: z.literal("provenance-ledger"),
    derived_index: z.literal(true),
    degraded: z.boolean(),
    rebuildable: z.boolean(),
    last_rebuild: z
      .object({
        indexed_nodes: z.number().int().nonnegative(),
        indexed_edges: z.number().int().nonnegative(),
        warnings: z.array(z.string()).default([])
      })
      .strict()
      .optional()
  })
  .strict();

export const mathProveRunManifestSchema = z
  .object({
    id: stableId,
    project_id: stableId,
    claim_id: stableId,
    mode: z.enum(["plan", "route", "final_audit"]),
    run_root: z.string().min(1),
    status: z.enum(["created", "running", "failed", "approved"]),
    target_status: claimStatusSchema.optional(),
    status_json_artifact_id: stableId.optional(),
    final_audit_artifact_id: stableId.optional(),
    solution_artifact_id: stableId.optional(),
    evidence_ids: z.array(stableId).default([]),
    artifact_ids: z.array(stableId).default([]),
    vetoes: z.array(z.string()).default([]),
    warnings: z.array(z.string()).default([]),
    created_at: isoTimestamp,
    updated_at: isoTimestamp
  })
  .strict();

export const graphPatchUpdatedNodeSchema = z.record(z.string(), z.unknown()).superRefine((node, ctx) => {
  for (const field of graphPatchProtectedClaimFields) {
    if (Object.prototype.hasOwnProperty.call(node, field)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `GraphPatch updated_nodes cannot mutate protected claim field ${field}`,
        path: [field]
      });
    }
  }
});

export const graphPatchSchema = z
  .object({
    patch_id: stableId,
    project_id: stableId,
    source_workstream_id: stableId.optional(),
    state: z.enum(["proposed", "under_review", "accepted", "rejected", "partially_applied", "superseded"]),
    provenance: z
      .object({
        created_by: z.string().min(1),
        created_at: isoTimestamp
      })
      .strict(),
    new_nodes: z.array(memoryNodeSchema),
    new_edges: z.array(memoryEdgeSchema),
    updated_nodes: z.array(graphPatchUpdatedNodeSchema),
    candidate_conflicts: z.array(z.record(z.string(), z.unknown())),
    warnings: z.array(z.string()),
    reviewer_notes: z.string().optional(),
    apply_preconditions: z.array(z.string()).default([])
  })
  .strict()
  .superRefine((patch, ctx) => {
    patch.new_nodes.forEach((node, index) => {
      if (node.type !== "Claim") {
        return;
      }

      const status = node.payload.status;
      if (typeof status === "string" && privilegedClaimStatuses.has(status)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "GraphPatch new Claim nodes cannot preload privileged claim status",
          path: ["new_nodes", index, "payload", "status"]
        });
      }

      for (const field of graphPatchProtectedClaimFields) {
        if (field !== "status" && Object.prototype.hasOwnProperty.call(node.payload, field)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `GraphPatch new Claim nodes cannot set protected claim field ${field}`,
            path: ["new_nodes", index, "payload", field]
          });
        }
      }
    });
  });

export type ClaimStatus = z.infer<typeof claimStatusSchema>;
export type MemoryNodeType = z.infer<typeof memoryNodeTypeSchema>;
export type MemoryEdgeLabel = z.infer<typeof memoryEdgeLabelSchema>;
export type Project = z.infer<typeof projectSchema>;
export type ArtifactRef = z.infer<typeof artifactRefSchema>;
export type Evidence = z.infer<typeof evidenceSchema>;
export type Claim = z.infer<typeof claimSchema>;
export type MemoryNode = z.infer<typeof memoryNodeSchema>;
export type MemoryEdge = z.infer<typeof memoryEdgeSchema>;
export type Workstream = z.infer<typeof workstreamSchema>;
export type AuditEvent = z.infer<typeof auditEventSchema>;
export type PathPolicyDecision = z.infer<typeof pathPolicyDecisionSchema>;
export type RunnerPermissionEnvelope = z.infer<typeof runnerPermissionEnvelopeSchema>;
export type StableIdMapEntry = z.infer<typeof stableIdMapEntrySchema>;
export type GateResult = z.infer<typeof gateResultSchema>;
export type CitationRecord = z.infer<typeof citationRecordSchema>;
export type PaperMarginNote = z.infer<typeof paperMarginNoteSchema>;
export type FormalProofRun = z.infer<typeof formalProofRunSchema>;
export type ProvenanceEvent = z.infer<typeof provenanceEventSchema>;
export type PaperSpan = z.infer<typeof paperSpanSchema>;
export type ProjectSessionLock = z.infer<typeof projectSessionLockSchema>;
export type MutationQueueEntry = z.infer<typeof mutationQueueEntrySchema>;
export type MathGraphIndexHealth = z.infer<typeof mathGraphIndexHealthSchema>;
export type MathProveRunManifest = z.infer<typeof mathProveRunManifestSchema>;
export type GraphPatchUpdatedNode = z.infer<typeof graphPatchUpdatedNodeSchema>;
export type GraphPatch = z.infer<typeof graphPatchSchema>;
