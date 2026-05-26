export type DashboardProject = {
  project_id: string;
  name?: string;
  initialized?: boolean;
};

export type ClaimBoardItem = {
  id: string;
  status: string;
  statement?: string;
  evidence_ids: string[];
  source_workstreams: string[];
  warnings: string[];
  blockers: string[];
};

export type WorkstreamBoardItem = {
  id: string;
  status: string;
  goal?: string;
  last_error?: string;
};

export type EvidenceBoardItem = {
  id: string;
  claim_id?: string;
  source: "margin_note" | "artifact" | "runner" | "literature" | "unknown";
};

export type PaperDashboardState = {
  manifest?: unknown;
  margin_notes: Array<{
    id?: string;
    claim_id?: string;
    evidence_ids?: string[];
    source_workstreams?: string[];
    warnings?: string[];
    blockers?: string[];
  }>;
  check: {
    ok: boolean;
    vetoes: string[];
    warnings: string[];
    notes: string[];
  };
};

export type BlockerItem = {
  source: "paper" | "margin_note" | "workstream" | "degraded";
  reason: string;
  target_id?: string;
};

export type DashboardSnapshot = {
  project: DashboardProject;
  claims: ClaimBoardItem[];
  workstreams: WorkstreamBoardItem[];
  evidence: EvidenceBoardItem[];
  paper: PaperDashboardState;
  blockers: BlockerItem[];
  generated_at: string;
  degraded: string[];
};

export type TuiDashboardSection = {
  id: string;
  title: string;
  rows: string[];
};

export type TuiDashboardModel = {
  kind: "dashboard";
  generated_at: string;
  sections: TuiDashboardSection[];
};
