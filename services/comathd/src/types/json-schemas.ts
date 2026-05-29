import {
  artifactRefSchema,
  assumptionLedgerSchema,
  claimSchema,
  finalReplayManifestV3Schema,
  formalSpecLockSchema,
  graphPatchSchema,
  leanRunManifestV3Schema,
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
leanRunManifestV3Schema.parse;
finalReplayManifestV3Schema.parse;
memoryEdgeSchema.parse;
artifactRefSchema.parse;
graphPatchSchema.parse;

export const jsonSchemas = {
  project: objectSchema("Project"),
  claim: objectSchema("Claim"),
  formalSpecLock: objectSchema("FormalSpecLock"),
  assumptionLedger: objectSchema("AssumptionLedger"),
  leanRunManifestV3: objectSchema("LeanRunManifestV3"),
  finalReplayManifestV3: objectSchema("FinalReplayManifestV3"),
  memoryEdge: objectSchema("MemoryEdge"),
  artifactRef: objectSchema("ArtifactRef"),
  graphPatch: objectSchema("GraphPatch")
} as const;

