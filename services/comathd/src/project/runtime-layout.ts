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
    "provenance",
    "workstreams",
    "artifacts",
    "lean",
    "session",
    "sessions",
    "snapshots"
  ]
} as const;

export type RuntimeDirectory = (typeof runtimeLayout.directories)[number];
