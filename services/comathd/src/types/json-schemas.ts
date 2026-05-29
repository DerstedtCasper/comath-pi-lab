import {
  artifactRefSchema,
  assumptionLedgerSchema,
  claimSchema,
  formalSpecLockSchema,
  graphPatchSchema,
  memoryEdgeSchema,
  projectSchema
} from "./schemas.js";

type JsonSchema = {
  type: "object";
  title: string;
  additionalProperties: boolean;
};

function objectSchema(title: string): JsonSchema {
  return {
    type: "object",
    title,
    additionalProperties: false
  };
}

projectSchema.parse;
claimSchema.parse;
formalSpecLockSchema.parse;
assumptionLedgerSchema.parse;
memoryEdgeSchema.parse;
artifactRefSchema.parse;
graphPatchSchema.parse;

export const jsonSchemas = {
  project: objectSchema("Project"),
  claim: objectSchema("Claim"),
  formalSpecLock: objectSchema("FormalSpecLock"),
  assumptionLedger: objectSchema("AssumptionLedger"),
  memoryEdge: objectSchema("MemoryEdge"),
  artifactRef: objectSchema("ArtifactRef"),
  graphPatch: objectSchema("GraphPatch")
} as const;

