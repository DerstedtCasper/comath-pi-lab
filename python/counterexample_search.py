#!/usr/bin/env python3
"""Phase 10 deterministic counterexample search runner."""

from __future__ import annotations

import argparse
import json
import random
import re
import sys
from typing import Any

import sympy as sp


SAFE_EXPR_RE = re.compile(r"^[A-Za-z0-9_+\-*/^()., <>=!]+$")


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="CoMath counterexample search runner")
    parser.add_argument("--input-json", required=True)
    return parser


def emit(ok: bool, payload: Any, vetoes: list[str] | None = None, warnings: list[str] | None = None) -> None:
    print(
        json.dumps(
            {
                "ok": ok,
                "runner_id": "counterexample-search",
                "exactness": "numeric_search",
                "supports_status": "computationally_supported" if ok else "none",
                "result": payload,
                "vetoes": vetoes or [],
                "warnings": warnings or [],
            },
            sort_keys=True,
            separators=(",", ":"),
        )
    )


def validate_expression(expr: str) -> bool:
    return bool(SAFE_EXPR_RE.fullmatch(expr)) and ";" not in expr and "__" not in expr and "import" not in expr.lower()


def main(argv: list[str]) -> int:
    args = build_parser().parse_args(argv)
    envelope = json.loads(args.input_json)
    seed = envelope.get("seed")
    if not isinstance(seed, int):
        emit(False, None, ["missing_seed"])
        return 0

    input_payload = envelope.get("input", {})
    expression = str(input_payload.get("expression", ""))
    variables = input_payload.get("variables", [])
    integer_range = input_payload.get("integer_range", [-3, 3])
    if not validate_expression(expression):
        emit(False, None, ["unsafe_expression_syntax", "numeric_search_not_symbolic"])
        return 0
    if not isinstance(variables, list) or len(variables) != 1 or not isinstance(variables[0], str):
        emit(False, None, ["invalid_variables", "numeric_search_not_symbolic"])
        return 0
    if (
        not isinstance(integer_range, list)
        or len(integer_range) != 2
        or not all(isinstance(item, int) for item in integer_range)
        or integer_range[0] > integer_range[1]
    ):
        emit(False, None, ["invalid_integer_range", "numeric_search_not_symbolic"])
        return 0

    symbol = sp.Symbol(variables[0], integer=True)
    try:
        predicate = sp.sympify(expression.replace("^", "**"), locals={variables[0]: symbol})
    except Exception as exc:  # noqa: BLE001 - structured failure is the contract
        emit(False, {"error": str(exc)}, ["parse_failed", "numeric_search_not_symbolic"])
        return 0

    values = list(range(integer_range[0], integer_range[1] + 1))
    rng = random.Random(seed)
    rng.shuffle(values)
    samples: list[dict[str, Any]] = []
    counterexample: dict[str, Any] | None = None
    for value in values:
        evaluated = bool(predicate.subs(symbol, value))
        sample = {variables[0]: value, "holds": evaluated}
        samples.append(sample)
        if not evaluated and counterexample is None:
            counterexample = sample

    emit(
        counterexample is None,
        {
            "samples": samples,
            "counterexample": counterexample,
            "seed": seed,
        },
        ["numeric_search_not_symbolic"],
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
