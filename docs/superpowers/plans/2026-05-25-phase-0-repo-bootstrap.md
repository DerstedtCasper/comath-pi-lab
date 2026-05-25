# Phase 0 Repo Bootstrap Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the CoMath Pi Lab repository skeleton with canonical docs, package-manager assumptions, and verifiable Phase 0 checks.

**Architecture:** A pnpm monorepo rooted at `D:\MATH _Studio\comath-pi-lab`, with `services/comathd` as the first package and documentation contracts at the root. Runtime state is excluded from Git and no mathematical runtime behavior is implemented in Phase 0.

**Tech Stack:** Node.js `>=22.19.0`, Corepack, `pnpm@11.3.0`, TypeScript.

---

## Chunk 1: Repository Contract

### Task 1: Root Workspace

**Files:**
- Create: `.gitignore`
- Create: `.npmrc`
- Create: `package.json`
- Create: `pnpm-workspace.yaml`
- Create: `tsconfig.json`

- [x] **Step 1: Create root package files**
- [x] **Step 2: Pin Node and pnpm assumptions**
- [x] **Step 3: Run install and verify lockfile generation**
- [x] **Step 4: Run build and typecheck**

### Task 2: Canonical Documents

**Files:**
- Create: `README.md`
- Create: `COMATH_PI_LAB_DEV_PLAN.md`
- Create: `CODEX_GOAL_RUNBOOK.md`
- Create: `AGENTS.md`
- Create: `TODO.md`
- Create: `REVIEW.md`
- Create: `SECURITY_REVIEW.md`
- Create: `MATH_INTEGRITY_REVIEW.md`

- [x] **Step 1: Create document schemas and phase rules**
- [x] **Step 2: Record external integration boundaries**
- [x] **Step 3: Update validation evidence after commands run**

## Chunk 2: Skeleton Packages

### Task 3: comathd Package Skeleton

**Files:**
- Create: `services/comathd/package.json`
- Create: `services/comathd/tsconfig.json`
- Create: `services/comathd/src/index.ts`
- Create: `services/comathd/tests/phase0-smoke.test.mjs`

- [x] **Step 1: Create TypeScript package skeleton**
- [x] **Step 2: Verify package build**
- [x] **Step 3: Verify package smoke test**

### Task 4: Repository Smoke Test

**Files:**
- Create: `scripts/phase0-smoke.mjs`
- Create: `extensions/README.md`
- Create: `schemas/README.md`
- Create: `tests/README.md`

- [x] **Step 1: Create non-fake smoke test that checks required Phase 0 files and invariants**
- [x] **Step 2: Run `corepack pnpm test`**
- [x] **Step 3: Record results in `REVIEW.md`**

## Stop Condition

Stop after Phase 0. Do not implement Phase 1 contracts until a new goal authorizes it.
