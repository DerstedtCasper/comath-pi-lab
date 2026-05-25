#!/usr/bin/env python3
"""Phase 11 citation condition checker stub.

The production TypeScript service owns persistence and gate integration. This
script is a conservative JSON checker for future tool parity; missing locator,
artifact, or assumptions fail closed.
"""

from __future__ import annotations

import argparse
import json
import sys
from typing import Any


def main(argv: list[str]) -> int:
    parser = argparse.ArgumentParser(description="CoMath citation condition checker")
    parser.add_argument("--input-json", required=True)
    args = parser.parse_args(argv)
    payload: dict[str, Any] = json.loads(args.input_json)
    required = [str(item).strip().lower() for item in payload.get("required_assumptions", [])]
    available = [str(item).strip().lower() for item in payload.get("citation_assumptions", [])]
    missing = [item for item in required if item not in available]
    vetoes: list[str] = []
    if not payload.get("locator"):
        vetoes.append("missing_locator")
    if not payload.get("artifact_id"):
        vetoes.append("missing_exact_citation_artifact")
    if missing:
        vetoes.append("citation_condition_mismatch")
    result = {
        "ok": not vetoes,
        "matched_conditions": [item for item in required if item in available],
        "missing_conditions": missing,
        "vetoes": vetoes,
        "warnings": [] if not vetoes else ["citation condition match failed closed"],
    }
    sys.stdout.write(json.dumps(result, sort_keys=True, separators=(",", ":")))
    sys.stdout.write("\n")
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
