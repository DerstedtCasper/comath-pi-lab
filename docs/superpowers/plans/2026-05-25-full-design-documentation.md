# Full Design Documentation Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Complete the CoMath Pi Lab project design and target goal documentation without implementing Phase 1 runtime behavior.

**Architecture:** The design is split into canonical root documents plus companion architecture documents. The smoke test verifies that the design document set exists and contains key sections, while implementation remains constrained to Phase 0 skeleton code.

**Tech Stack:** Markdown documentation, Node.js smoke test, pnpm workspace.

---

## Chunk 1: Canonical Root Documents

### Task 1: Complete Development Plan

**Files:**
- Modify: `COMATH_PI_LAB_DEV_PLAN.md`

- [x] Add product thesis, goals, non-goals, invariants.
- [x] Add architecture, runtime layout, data model, claim discipline, memory, verification, compute, literature, paper, domain, security.
- [x] Add Phase 0-17 roadmap and milestones.
- [x] Add design completion criteria.

### Task 2: Complete Goal Runbook

**Files:**
- Modify: `CODEX_GOAL_RUNBOOK.md`

- [x] Add Phase 0-17 scoped goals.
- [x] Add validation and stop rules.
- [x] Add subagent matrix and anti-patterns.

## Chunk 2: Companion Design Documents

### Task 3: Add Architecture Companions

**Files:**
- Create: `docs/architecture/end-state-blueprint.md`
- Create: `docs/architecture/acceptance-matrix.md`
- Create: `docs/architecture/risk-register.md`
- Create: `docs/architecture/agent-operating-model.md`

- [x] Define final system behavior.
- [x] Define phase acceptance evidence.
- [x] Define risk register.
- [x] Define agent collaboration model.

### Task 4: Add Handoff

**Files:**
- Create: `docs/progress/design-handoff.md`
- Modify: `TODO.md`
- Modify: `REVIEW.md`

- [x] Record current state and next action.
- [x] Mark design documentation goal items complete.
- [x] Record added design artifacts.

## Chunk 3: Verification

### Task 5: Extend Smoke Test

**Files:**
- Modify: `scripts/phase0-smoke.mjs`

- [x] Require design companion files.
- [x] Assert key sections exist in canonical docs.
- [x] Run `corepack pnpm test`.
