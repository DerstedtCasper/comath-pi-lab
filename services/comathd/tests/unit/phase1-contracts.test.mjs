import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  artifactRefSchema,
  claimSchema,
  formalProofRunSchema,
  graphPatchSchema,
  jsonSchemas,
  mathGraphIndexHealthSchema,
  mathProveRunManifestSchema,
  memoryEdgeSchema,
  mutationQueueEntrySchema,
  nextSequentialId,
  normalizeStatement,
  paperSpanSchema,
  projectSchema,
  projectSessionLockSchema,
  provenanceEventSchema,
  statementHash
} from "../../dist/index.js";

const testDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(testDir, "..", "..", "..", "..");
const timestamp = "2026-05-25T00:00:00.000Z";

assert.throws(
  () =>
    claimSchema.parse({
      id: "C-0001",
      project_id: "PRJ-0001",
      statement: "x = x",
      statement_hash: "abc",
      status: "proved",
      evidence_level: 0,
      assumptions: [],
      domain: "algebra",
      created_at: timestamp,
      updated_at: timestamp
    }),
  /status/
);

assert.throws(
  () =>
    projectSchema.parse({
      id: "PRJ-0001",
      name: "Missing project id field contract",
      root_path: "D:/MATH _Studio/comath-pi-lab",
      created_at: timestamp,
      updated_at: timestamp
    }),
  /project_id/
);

assert.throws(
  () =>
    memoryEdgeSchema.parse({
      id: "EDGE-0001",
      project_id: "PRJ-0001",
      source_id: "C-0001",
      target_id: "E-0001",
      label: "magically_proves",
      created_at: timestamp
    }),
  /label/
);

assert.throws(
  () =>
    artifactRefSchema.parse({
      id: "AR-0001",
      project_id: "PRJ-0001",
      path: ".comath/artifacts/output.txt",
      kind: "log",
      created_at: timestamp
    }),
  /sha256/
);

assert.equal(nextSequentialId("C", ["C-0001", "C-0007", "E-0009"]), "C-0008");
assert.equal(nextSequentialId("WS", []), "WS-0001");

assert.equal(normalizeStatement("  For all   x,\r\n x = x.  "), "For all x, x = x.");
assert.equal(
  statementHash("For all x, x = x."),
  statementHash("  For all   x,\n x = x.  ")
);
assert.notEqual(statementHash("x = x"), statementHash("x = y"));

assert.throws(
  () =>
    graphPatchSchema.parse({
      patch_id: "GP-0001",
      project_id: "PRJ-0001",
      state: "proposed",
      provenance: {
        created_by: "WS-0001",
        created_at: timestamp
      },
      new_nodes: [],
      new_edges: [],
      updated_nodes: [],
      candidate_conflicts: [],
      warnings: [],
      promotes_claims: ["C-0001"]
    }),
  /promotes_claims/
);

for (const protectedField of ["status", "evidence_level", "gate_result_id", "formalization_status", "audit_state"]) {
  assert.throws(
    () =>
      graphPatchSchema.parse({
        patch_id: "GP-0002",
        project_id: "PRJ-0001",
        state: "proposed",
        provenance: {
          created_by: "WS-0001",
          created_at: timestamp
        },
        new_nodes: [],
        new_edges: [],
        updated_nodes: [
          {
            id: "C-0001",
            [protectedField]: protectedField === "evidence_level" ? 5 : "formally_checked"
          }
        ],
        candidate_conflicts: [],
        warnings: []
      }),
    new RegExp(protectedField)
  );
}

assert.throws(
  () =>
    graphPatchSchema.parse({
      patch_id: "GP-0003",
      project_id: "PRJ-0001",
      state: "proposed",
      provenance: {
        created_by: "WS-0001",
        created_at: timestamp
      },
      new_nodes: [
        {
          id: "MN-0001",
          project_id: "PRJ-0001",
          type: "Claim",
          title: "Injected claim",
          payload: {
            status: "formally_checked"
          },
          created_at: timestamp,
          updated_at: timestamp
        }
      ],
      new_edges: [],
      updated_nodes: [],
      candidate_conflicts: [],
      warnings: []
    }),
  /privileged claim status/
);

assert.throws(
  () =>
    claimSchema.parse({
      id: "C-0002",
      project_id: "PRJ-0001",
      statement: "x = x",
      statement_hash: "abc",
      status: "formally_checked",
      evidence_level: 5,
      assumptions: [],
      domain: "algebra",
      created_at: timestamp,
      updated_at: timestamp
    }),
  /gate_result_id/
);

const productionContractSchemas = {
  formalProofRun: formalProofRunSchema,
  provenanceEvent: provenanceEventSchema,
  paperSpan: paperSpanSchema,
  projectSessionLock: projectSessionLockSchema,
  mutationQueueEntry: mutationQueueEntrySchema,
  mathGraphIndexHealth: mathGraphIndexHealthSchema,
  mathProveRunManifest: mathProveRunManifestSchema
};

for (const [name, schema] of Object.entries(productionContractSchemas)) {
  assert.equal(typeof schema.parse, "function", `${name} Zod schema must be exported`);
}

for (const name of [
  "project",
  "claim",
  "memoryEdge",
  "artifactRef",
  "graphPatch",
  "formalProofRun",
  "provenanceEvent",
  "paperSpan",
  "projectSessionLock",
  "mutationQueueEntry",
  "mathGraphIndexHealth",
  "mathProveRunManifest"
]) {
  assert.equal(jsonSchemas[name].type, "object", `${name} JSON schema must be an object schema`);
}

const jsonSchemaFiles = {
  project: "project.schema.json",
  claim: "claim.schema.json",
  memoryEdge: "memory-edge.schema.json",
  artifactRef: "artifact-ref.schema.json",
  graphPatch: "graph-patch.schema.json",
  formalProofRun: "formal-proof-run.schema.json",
  provenanceEvent: "provenance-event.schema.json",
  paperSpan: "paper-span.schema.json",
  projectSessionLock: "project-session-lock.schema.json",
  mutationQueueEntry: "mutation-queue-entry.schema.json",
  mathGraphIndexHealth: "math-graph-index-health.schema.json",
  mathProveRunManifest: "mathprove-run-manifest.schema.json"
};

for (const [name, file] of Object.entries(jsonSchemaFiles)) {
  const schemaPath = resolve(repoRoot, "schemas", file);
  assert.equal(existsSync(schemaPath), true, `${file} must exist in root schemas/`);
  const rootSchema = JSON.parse(readFileSync(schemaPath, "utf8"));
  assert.equal(rootSchema.type, "object", `${file} must be an object schema`);
  assert.deepEqual(jsonSchemas[name], rootSchema, `${name} runtime JSON schema must match root schema artifact`);
}

const claimJsonSchema = JSON.parse(readFileSync(resolve(repoRoot, "schemas", "claim.schema.json"), "utf8"));
const claimSchemaText = JSON.stringify(claimJsonSchema);
for (const privilegedStatus of [
  "literature_supported",
  "computationally_supported",
  "symbolically_checked",
  "lean_skeleton",
  "formally_checked",
  "human_accepted"
]) {
  assert.match(claimSchemaText, new RegExp(privilegedStatus), `claim JSON schema must mention ${privilegedStatus}`);
}
assert.match(claimSchemaText, /gate_result_id/, "claim JSON schema must require gate_result_id for privileged statuses");
assert.match(claimSchemaText, /kernel_checked/, "claim JSON schema must bind formally_checked to kernel_checked");
assert.match(claimSchemaText, /all_dependencies_present/, "claim JSON schema must bind formally_checked to dependency closure");
assert.match(claimSchemaText, /audit_passed/, "claim JSON schema must bind formally_checked to audit_passed");

console.log("Phase 1 contract/schema tests passed.");
