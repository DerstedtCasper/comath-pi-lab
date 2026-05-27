import type {
  BlockerItem,
  ClaimBoardItem,
  DashboardSnapshot,
  EvidenceBoardItem,
  GateBoardItem,
  PaperDashboardState,
  TuiDashboardModel,
  WorkstreamBoardItem
} from "./widgets.js";

type ReadonlyClient = {
  get(path: string): Promise<any>;
};

export type DashboardSnapshotInput = {
  project_root: string;
  project_id: string;
};

function encodeQuery(input: Record<string, string>): string {
  return new URLSearchParams(input).toString();
}

function asArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

function normalizePaperState(payload: any): Pick<PaperDashboardState, "manifest" | "margin_notes"> {
  return {
    manifest: payload?.manifest,
    margin_notes: asArray(payload?.margin_notes).map((note: any) => ({
      id: typeof note.id === "string" ? note.id : undefined,
      claim_id: typeof note.claim_id === "string" ? note.claim_id : undefined,
      evidence_ids: asArray<string>(note.evidence_ids).filter((item) => typeof item === "string"),
      source_workstreams: asArray<string>(note.source_workstreams).filter((item) => typeof item === "string"),
      warnings: asArray<string>(note.warnings).filter((item) => typeof item === "string"),
      blockers: asArray<string>(note.blockers).filter((item) => typeof item === "string")
    }))
  };
}

function normalizePaperCheck(payload: any): PaperDashboardState["check"] {
  return {
    ok: payload?.ok === true,
    vetoes: asArray<string>(payload?.vetoes).filter((item) => typeof item === "string"),
    warnings: asArray<string>(payload?.warnings).filter((item) => typeof item === "string"),
    notes: asArray<string>(payload?.notes).filter((item) => typeof item === "string")
  };
}

function normalizeClaims(payload: any): ClaimBoardItem[] {
  const byClaim = new Map<string, ClaimBoardItem>();
  for (const item of asArray<any>(payload?.claims)) {
    if (typeof item.id !== "string") {
      continue;
    }
    byClaim.set(item.id, {
      id: item.id,
      status: typeof item.status === "string" ? item.status : "unknown",
      statement: typeof item.statement === "string" ? item.statement : undefined,
      evidence_ids: [],
      source_workstreams: [],
      warnings: [],
      blockers: []
    });
  }
  return [...byClaim.values()].sort((left, right) => left.id.localeCompare(right.id));
}

function evidenceSource(kind: string | undefined): EvidenceBoardItem["source"] {
  if (kind === "literature") {
    return "literature";
  }
  if (kind === "lean" || kind === "symbolic" || kind === "computation" || kind === "counterexample" || kind === "audit") {
    return "runner";
  }
  return "unknown";
}

function normalizeEvidence(payload: any): EvidenceBoardItem[] {
  const evidence = new Map<string, EvidenceBoardItem>();
  for (const item of asArray<any>(payload?.evidence)) {
    if (typeof item.id !== "string") {
      continue;
    }
    evidence.set(item.id, {
      id: item.id,
      claim_id: typeof item.claim_id === "string" ? item.claim_id : undefined,
      source: evidenceSource(typeof item.kind === "string" ? item.kind : undefined)
    });
  }
  return [...evidence.values()].sort((left, right) => left.id.localeCompare(right.id));
}

function normalizeGates(payload: any): GateBoardItem[] {
  return asArray<any>(payload?.gates)
    .map((item): GateBoardItem | null => {
      const id = typeof item.id === "string" ? item.id : typeof item.gate_id === "string" ? item.gate_id : undefined;
      if (!id) {
        return null;
      }
      return {
        id,
        claim_id: typeof item.claim_id === "string" ? item.claim_id : undefined,
        ok: item.ok === true,
        target_status: typeof item.target_status === "string" ? item.target_status : undefined,
        vetoes: asArray<string>(item.vetoes).filter((entry) => typeof entry === "string"),
        warnings: asArray<string>(item.warnings).filter((entry) => typeof entry === "string")
      };
    })
    .filter((item): item is GateBoardItem => Boolean(item))
    .sort((left, right) => left.id.localeCompare(right.id));
}

export function summarizeDashboardBlockers(snapshot: DashboardSnapshot): BlockerItem[] {
  const blockers: BlockerItem[] = [];
  for (const veto of snapshot.paper.check.vetoes) {
    blockers.push({ source: "paper", reason: veto });
  }
  for (const note of snapshot.paper.margin_notes) {
    for (const blocker of note.blockers ?? []) {
      blockers.push({ source: "margin_note", reason: blocker, target_id: note.claim_id });
    }
  }
  for (const workstream of snapshot.workstreams) {
    if (workstream.status === "blocked" || workstream.last_error) {
      blockers.push({
        source: "workstream",
        reason: workstream.last_error ?? `workstream ${workstream.status}`,
        target_id: workstream.id
      });
    }
  }
  for (const gate of snapshot.gates ?? []) {
    if (!gate.ok) {
      for (const veto of gate.vetoes) {
        blockers.push({ source: "gate", reason: veto, target_id: gate.claim_id });
      }
    }
  }
  for (const degraded of snapshot.degraded) {
    blockers.push({ source: "degraded", reason: degraded });
  }
  return blockers;
}

export async function aggregateDashboardSnapshot(
  client: ReadonlyClient,
  input: DashboardSnapshotInput
): Promise<DashboardSnapshot> {
  const query = encodeQuery({ project_root: input.project_root, project_id: input.project_id });
  const projectStatus = await client.get(`/project/status?project_root=${encodeURIComponent(input.project_root)}`);
  const workstreamList = await client.get(`/workstream/list?${query}`);
  const claimList = await client.get(`/claim/list?${query}`);
  const evidenceList = await client.get(`/evidence/list?${query}`);
  const gateList = await client.get(`/gate/list?${query}`);
  const paperStateRaw = await client.get(`/paper/state?${query}`);
  const paperCheckRaw = await client.get(`/paper/check?${query}`);

  const paper: PaperDashboardState = {
    ...normalizePaperState(paperStateRaw),
    check: normalizePaperCheck(paperCheckRaw)
  };
  const claims = normalizeClaims(claimList);
  const workstreams: WorkstreamBoardItem[] = asArray<any>(workstreamList?.workstreams).map((item) => ({
    id: String(item.id),
    status: String(item.status),
    goal: typeof item.goal === "string" ? item.goal : undefined,
    last_error: typeof item.last_error === "string" ? item.last_error : undefined
  }));
  const evidence = normalizeEvidence(evidenceList);
  const gates = normalizeGates(gateList);
  const snapshot: DashboardSnapshot = {
    project: {
      project_id: projectStatus?.project?.project_id ?? input.project_id,
      name: projectStatus?.project?.name,
      initialized: projectStatus?.runtime?.initialized
    },
    claims,
    workstreams,
    evidence,
    gates,
    paper,
    blockers: [],
    generated_at: new Date().toISOString(),
    degraded: []
  };
  return {
    ...snapshot,
    blockers: summarizeDashboardBlockers(snapshot)
  };
}

function linesOrNone(rows: string[]): string {
  return rows.length ? rows.join("\n") : "none";
}

export function renderDashboardText(snapshot: DashboardSnapshot): string {
  const projectLabel = `${snapshot.project.project_id}${snapshot.project.name ? ` ${snapshot.project.name}` : ""}`;
  const claims = snapshot.claims.map((claim) => {
    const evidence = claim.evidence_ids.length ? ` evidence:${claim.evidence_ids.join(",")}` : "";
    const workstreams = claim.source_workstreams.length ? ` workstreams:${claim.source_workstreams.join(",")}` : "";
    return `${claim.id} [${claim.status}]${evidence}${workstreams}`;
  });
  const workstreams = snapshot.workstreams.map((item) => `${item.id} [${item.status}] ${item.goal ?? ""}`.trim());
  const evidence = snapshot.evidence.map((item) => `${item.id}${item.claim_id ? ` claim:${item.claim_id}` : ""} ${item.source}`);
  const gates = (snapshot.gates ?? []).map(
    (item) =>
      `${item.id}${item.claim_id ? ` claim:${item.claim_id}` : ""} ${item.ok ? "pass" : "blocked"}${
        item.target_status ? ` target:${item.target_status}` : ""
      }${item.vetoes.length ? ` vetoes:${item.vetoes.join(";")}` : ""}`
  );
  const paperRows = [
    `check:${snapshot.paper.check.ok ? "ok" : "blocked"}`,
    ...snapshot.paper.check.vetoes.map((veto) => `veto:${veto}`),
    ...snapshot.paper.margin_notes.map(
      (note) =>
        `margin:${note.claim_id ?? "unlinked"} evidence:${(note.evidence_ids ?? []).join(",") || "none"} workstreams:${
          (note.source_workstreams ?? []).join(",") || "none"
        } warnings:${(note.warnings ?? []).join(";") || "none"} blockers:${(note.blockers ?? []).join(";") || "none"}`
    )
  ];
  const blockers = snapshot.blockers.map((blocker) => `${blocker.source}:${blocker.target_id ? `${blocker.target_id}:` : ""}${blocker.reason}`);
  return [
    `CoMath Dashboard: ${projectLabel}`,
    `Generated: ${snapshot.generated_at}`,
    "",
    "Claims",
    linesOrNone(claims),
    "",
    "Workstreams",
    linesOrNone(workstreams),
    "",
    "Evidence",
    linesOrNone(evidence),
    "",
    "Gate Results",
    linesOrNone(gates),
    "",
    "Paper",
    linesOrNone(paperRows),
    "",
    "Blockers",
    linesOrNone(blockers),
    "",
    "Degraded",
    linesOrNone(snapshot.degraded)
  ].join("\n");
}

export function renderTuiDashboard(snapshot: DashboardSnapshot): TuiDashboardModel {
  return {
    kind: "dashboard",
    generated_at: snapshot.generated_at,
    sections: [
      {
        id: "claims",
        title: "Claims",
        rows: snapshot.claims.length ? snapshot.claims.map((claim) => `${claim.id} ${claim.status}`) : ["none"]
      },
      {
        id: "workstreams",
        title: "Workstreams",
        rows: snapshot.workstreams.length ? snapshot.workstreams.map((item) => `${item.id} ${item.status}`) : ["none"]
      },
      {
        id: "evidence",
        title: "Evidence",
        rows: snapshot.evidence.length ? snapshot.evidence.map((item) => `${item.id} ${item.source}`) : ["none"]
      },
      {
        id: "gates",
        title: "Gate Results",
        rows: (snapshot.gates ?? []).length
          ? (snapshot.gates ?? []).map((item) => `${item.id} ${item.ok ? "pass" : "blocked"}`)
          : ["none"]
      },
      {
        id: "paper",
        title: "Paper",
        rows: [
          `check ${snapshot.paper.check.ok ? "ok" : "blocked"}`,
          ...snapshot.paper.check.vetoes,
          ...snapshot.paper.margin_notes.flatMap((note) => note.blockers ?? [])
        ]
      },
      {
        id: "blockers",
        title: "Blockers",
        rows: snapshot.blockers.length ? snapshot.blockers.map((item) => `${item.source} ${item.reason}`) : ["none"]
      }
    ]
  };
}
