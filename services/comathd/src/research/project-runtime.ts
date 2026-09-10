import { realpathSync } from "node:fs";
import { acquireDaemonOwner, type DaemonOwner } from "./daemon-owner.js";
import { ensureResearchControlReady, finalizeResearchMigration, probeResearchLayout,
  type ResearchMigrationOptions, type ResearchMigrationReceipt } from "./research-migration.js";
import { openResearchStore, type ResearchClock, type ResearchStore } from "./research-store.js";

export type ProjectRuntimeDependencies = {
  clock: ResearchClock;
  /** Host-owned executor collection, populated by later runtime/tool adapters. */
  executor: object;
  migration?: ResearchMigrationOptions;
};
type RegistryEntry = { dependencies: ProjectRuntimeDependencies; pending: Promise<ProjectRuntime>; runtime?: ProjectRuntime };
const registry = new Map<string, RegistryEntry>();
function canonicalKey(root: string): string { const path = realpathSync(root); return process.platform === "win32" ? path.toLowerCase() : path; }

/** One production owner/store per canonical project, shared by daemon and embedded entry points. */
export class ProjectRuntime {
  private references = 0;
  private released = false;
  private constructor(readonly root: string, readonly store: ResearchStore, readonly clock: ResearchClock,
    readonly executor: object, readonly migrationReceipt: ResearchMigrationReceipt, private readonly owner: DaemonOwner,
    private readonly key: string) {}

  static async acquire(projectRoot: string, dependencies: ProjectRuntimeDependencies): Promise<ProjectRuntime> {
    if (!dependencies?.clock || typeof dependencies.clock.now !== "function" || !dependencies.executor) throw new Error("Explicit clock and executor dependencies are required");
    const key = canonicalKey(projectRoot);
    let entry = registry.get(key);
    if (entry) {
      if (entry.dependencies.clock !== dependencies.clock || entry.dependencies.executor !== dependencies.executor) throw new Error("Project runtime already acquired with different dependencies");
    } else {
      const pending = ProjectRuntime.create(projectRoot, dependencies, key);
      entry = { dependencies, pending }; registry.set(key, entry);
      const creating = entry;
      void pending.then(runtime => { creating.runtime = runtime; }, () => { if (registry.get(key) === creating) registry.delete(key); });
    }
    const runtime = await entry.pending;
    runtime.references++;
    return runtime;
  }
  private static async create(root: string, dependencies: ProjectRuntimeDependencies, key: string): Promise<ProjectRuntime> {
    const layout = probeResearchLayout(root);
    const owner = acquireDaemonOwner(layout.root);
    let store: ResearchStore | undefined;
    try {
      const receipt = await ensureResearchControlReady(layout, owner, dependencies.clock, dependencies.migration);
      store = openResearchStore(layout.root, { clock: dependencies.clock });
      if (layout.kind !== "current") finalizeResearchMigration(layout.root, receipt);
      return new ProjectRuntime(layout.root, store, dependencies.clock, dependencies.executor, receipt, owner, key);
    } catch (error) { try { store?.close(); } finally { owner.release(); } throw error; }
  }
  get referenceCount(): number { return this.references; }
  async release(): Promise<void> {
    if (this.released || this.references === 0) throw new Error("Project runtime has already been released");
    this.references--;
    if (this.references > 0) return;
    try { this.store.close(); }
    finally { this.owner.release(); this.released = true; registry.delete(this.key); }
  }
}

/** Synchronous legacy writers may consume an acquired runtime, never silently create a new owner. */
export function getAcquiredProjectRuntime(root: string): ProjectRuntime | undefined {
  const runtime = registry.get(canonicalKey(root))?.runtime;
  return runtime && runtime.referenceCount > 0 ? runtime : undefined;
}
