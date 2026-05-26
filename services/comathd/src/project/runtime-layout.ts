export const runtimeLayout = {
  root: ".comath",
  projectFile: "project.json",
  configFile: "config.json",
  directories: [
    "lock",
    "db",
    "memory",
    "claims",
    "evidence",
    "audit",
    "workstreams",
    "campaign",
    "proof",
    "ensembles",
    "context_lake",
    "proof_memory",
    "artifacts",
    "lean",
    "sessions",
    "snapshots"
  ]
} as const;

export type RuntimeDirectory = (typeof runtimeLayout.directories)[number];
