import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  artifactRefSchema,
  claimSchema,
  formalProofRunSchema,
  graphPatchSchema,
  mathGraphIndexHealthSchema,
  mathProveRunManifestSchema,
  memoryEdgeSchema,
  mutationQueueEntrySchema,
  paperSpanSchema,
  projectSchema,
  projectSessionLockSchema,
  provenanceEventSchema
} from "./schemas.js";

type JsonSchema = Record<string, unknown> & {
  type: "object";
  title: string;
  additionalProperties: boolean;
};

function repoRoot(): string {
  return resolve(dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..");
}

function loadJsonSchema(fileName: string): JsonSchema {
  const parsed = JSON.parse(readFileSync(resolve(repoRoot(), "schemas", fileName), "utf8")) as JsonSchema;
  if (parsed.type !== "object") {
    throw new Error(`${fileName} must be an object JSON schema`);
  }
  return parsed;
}

projectSchema.parse;
claimSchema.parse;
memoryEdgeSchema.parse;
artifactRefSchema.parse;
graphPatchSchema.parse;
formalProofRunSchema.parse;
provenanceEventSchema.parse;
paperSpanSchema.parse;
projectSessionLockSchema.parse;
mutationQueueEntrySchema.parse;
mathGraphIndexHealthSchema.parse;
mathProveRunManifestSchema.parse;

export const jsonSchemas = {
  project: loadJsonSchema("project.schema.json"),
  claim: loadJsonSchema("claim.schema.json"),
  memoryEdge: loadJsonSchema("memory-edge.schema.json"),
  artifactRef: loadJsonSchema("artifact-ref.schema.json"),
  graphPatch: loadJsonSchema("graph-patch.schema.json"),
  formalProofRun: loadJsonSchema("formal-proof-run.schema.json"),
  provenanceEvent: loadJsonSchema("provenance-event.schema.json"),
  paperSpan: loadJsonSchema("paper-span.schema.json"),
  projectSessionLock: loadJsonSchema("project-session-lock.schema.json"),
  mutationQueueEntry: loadJsonSchema("mutation-queue-entry.schema.json"),
  mathGraphIndexHealth: loadJsonSchema("math-graph-index-health.schema.json"),
  mathProveRunManifest: loadJsonSchema("mathprove-run-manifest.schema.json")
} as const;

