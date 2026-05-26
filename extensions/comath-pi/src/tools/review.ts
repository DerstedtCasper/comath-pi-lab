import type { DashboardSnapshot, BlockerItem } from "../widgets.js";

export type ReviewQueueItem = {
  id: string;
  source: BlockerItem["source"];
  reason: string;
  target_id?: string;
  severity: "info" | "warning" | "blocking";
};

export function buildDashboardReviewQueue(snapshot: DashboardSnapshot): ReviewQueueItem[] {
  return snapshot.blockers.map((blocker, index) => ({
    id: `DRV-${String(index + 1).padStart(4, "0")}`,
    source: blocker.source,
    reason: blocker.reason,
    target_id: blocker.target_id,
    severity: blocker.source === "degraded" ? "warning" : "blocking"
  }));
}
