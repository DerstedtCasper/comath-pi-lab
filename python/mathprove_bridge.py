#!/usr/bin/env python3
"""Phase 9 MathProve bridge mock.

This bridge is deliberately non-authoritative. It emits structured JSON that
the service can archive, audit, and feed into the promotion gate as vetoes.
It never mutates `.comath` state and never claims proof authority.
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path


CLAIM_STATUSES = {
    "draft",
    "conjectural",
    "literature_supported",
    "computationally_supported",
    "symbolically_checked",
    "lean_skeleton",
    "formally_checked",
    "refuted",
    "blocked",
    "retracted",
    "human_accepted",
}

MODE_VETOES = {
    "plan": ["mathprove_mock_plan_only"],
    "route": ["mathprove_mock_route_not_checked"],
    "final_audit": ["mathprove_mock_final_audit_not_approved"],
}

TARGET_VETOES = {
    "formally_checked": [
        "mathprove_mock_no_kernel_proof",
        "missing_kernel_checked_artifact",
        "missing_dependency_closure_audit",
    ],
    "symbolically_checked": [
        "missing_exact_symbolic_artifact",
        "float_only_exact_proof",
    ],
    "literature_supported": [
        "missing_exact_citation_artifact",
        "citation_condition_mismatch",
    ],
    "computationally_supported": [
        "missing_replayable_compute_artifact",
    ],
    "lean_skeleton": [
        "missing_lean_skeleton_artifact",
    ],
    "human_accepted": [
        "human_acceptance_is_not_mathematical_evidence",
    ],
}


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="CoMath Phase 9 MathProve bridge mock")
    parser.add_argument("--project-root", required=True)
    parser.add_argument("--claim", required=True)
    parser.add_argument("--mode", choices=["plan", "route", "final_audit"], required=True)
    parser.add_argument("--target-status", choices=sorted(CLAIM_STATUSES), required=True)
    return parser


def unique(items: list[str]) -> list[str]:
    seen: set[str] = set()
    output: list[str] = []
    for item in items:
        if item not in seen:
            seen.add(item)
            output.append(item)
    return output


def main(argv: list[str]) -> int:
    args = build_parser().parse_args(argv)
    # Resolve for validation only. The mock must not create or write anything.
    Path(args.project_root).expanduser().resolve()

    vetoes = unique(["not_implemented", *MODE_VETOES[args.mode], *TARGET_VETOES.get(args.target_status, [])])
    result = {
        "ok": False,
        "bridge_version": "phase9-mock",
        "mode": args.mode,
        "claim_id": args.claim,
        "target_status": args.target_status,
        "gate_result": "failed",
        "evidence": [],
        "artifacts": [],
        "vetoes": vetoes,
        "warnings": [
            "phase9 mock is not proof evidence",
            "MathProve bridge is a gate input, not a claim status authority",
        ],
    }
    sys.stdout.write(json.dumps(result, sort_keys=True, separators=(",", ":")))
    sys.stdout.write("\n")
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
