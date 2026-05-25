import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  artifactRefSchema,
  claimSchema,
  graphPatchSchema,
  jsonSchemas,
  memoryEdgeSchema,
  nextSequentialId,
  normalizeStatement,
  projectSchema,
  statementHash
} from "../../dist/index.js";

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

for (const name of ["project", "claim", "memoryEdge", "artifactRef", "graphPatch"]) {
  assert.equal(jsonSchemas[name].type, "object", `${name} JSON schema must be an object schema`);
}

for (const file of [
  "project.schema.json",
  "claim.schema.json",
  "memory-edge.schema.json",
  "artifact-ref.schema.json",
  "graph-patch.schema.json"
]) {
  const schemaPath = resolve(process.cwd(), "../../schemas", file);
  assert.equal(existsSync(schemaPath), true, `${file} must exist in root schemas/`);
  assert.equal(JSON.parse(readFileSync(schemaPath, "utf8")).type, "object", `${file} must be an object schema`);
}

console.log("Phase 1 contract/schema tests passed.");
