#!/usr/bin/env python3
"""Phase 10 exact SymPy runner.

The script accepts canonical JSON via --input-json and emits JSON only.
It rejects unsafe expression syntax and float-contaminated expressions.
"""

from __future__ import annotations

import argparse
import json
import re
import sys
from typing import Any

import sympy as sp


SAFE_EXPR_RE = re.compile(r"^[A-Za-z0-9_+\-*/^()., <>=!]+$")
DECIMAL_RE = re.compile(r"(?<![A-Za-z_])\d+\.\d+")


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="CoMath exact SymPy runner")
    parser.add_argument("--input-json", required=True)
    return parser


def result(
    ok: bool,
    exactness: str,
    supports_status: str,
    payload: Any,
    vetoes: list[str] | None = None,
    warnings: list[str] | None = None,
) -> dict[str, Any]:
    return {
        "ok": ok,
        "runner_id": "sympy-exact",
        "exactness": exactness,
        "supports_status": supports_status,
        "result": payload,
        "vetoes": vetoes or [],
        "warnings": warnings or [],
    }


def has_float(expr: sp.Basic) -> bool:
    return bool(expr.atoms(sp.Float))


def validate_expression(expr: str) -> list[str]:
    vetoes: list[str] = []
    if not SAFE_EXPR_RE.fullmatch(expr):
        vetoes.append("unsafe_expression_syntax")
    if ";" in expr or "__" in expr or "import" in expr.lower() or "eval" in expr.lower():
        vetoes.append("unsafe_expression_syntax")
    if DECIMAL_RE.search(expr):
        vetoes.append("float_contamination")
    return sorted(set(vetoes))


def main(argv: list[str]) -> int:
    args = build_parser().parse_args(argv)
    envelope = json.loads(args.input_json)
    input_payload = envelope.get("input", {})
    expression = str(input_payload.get("expression", ""))
    expected = str(input_payload.get("expected", "0"))
    variables = input_payload.get("variables", [])

    if not isinstance(variables, list) or not all(isinstance(item, str) for item in variables):
        print(json.dumps(result(False, "not_applicable", "none", None, ["invalid_variables"]), sort_keys=True))
        return 0

    vetoes = validate_expression(expression) + validate_expression(expected)
    if vetoes:
        exactness = "inexact" if "float_contamination" in vetoes else "not_applicable"
        print(json.dumps(result(False, exactness, "none", None, sorted(set(vetoes))), sort_keys=True))
        return 0

    locals_map = {name: sp.Symbol(name, integer=True) for name in variables}
    try:
        expr = sp.sympify(expression.replace("^", "**"), locals=locals_map)
        expected_expr = sp.sympify(expected.replace("^", "**"), locals=locals_map)
    except Exception as exc:  # noqa: BLE001 - structured failure is the contract
        print(json.dumps(result(False, "not_applicable", "none", {"error": str(exc)}, ["parse_failed"]), sort_keys=True))
        return 0

    if has_float(expr) or has_float(expected_expr):
        print(json.dumps(result(False, "inexact", "none", None, ["float_contamination"]), sort_keys=True))
        return 0

    simplified = sp.simplify(expr - expected_expr)
    ok = simplified == 0
    payload = {
        "expression": str(expr),
        "expected": str(expected_expr),
        "simplified_difference": str(simplified),
    }
    vetoes = [] if ok else ["symbolic_check_failed"]
    print(
        json.dumps(
            result(ok, "exact_symbolic", "symbolically_checked" if ok else "none", payload, vetoes),
            sort_keys=True,
            separators=(",", ":"),
        )
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
