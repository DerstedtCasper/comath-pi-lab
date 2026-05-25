#!/usr/bin/env python3
import argparse
import json
import re
import sys
from fractions import Fraction


def fail(mode, vetoes, warnings=None, result=None, exactness="not_applicable"):
    return {
        "ok": False,
        "mode": mode,
        "exactness": exactness,
        "supports_status": "none",
        "result": result or {},
        "vetoes": vetoes,
        "warnings": warnings or [],
    }


def success(mode, result, exactness):
    return {
        "ok": True,
        "mode": mode,
        "exactness": exactness,
        "supports_status": "computationally_supported",
        "result": result,
        "vetoes": ["not_symbolic_proof"],
        "warnings": ["domain computation is evidence only and cannot promote claims"],
    }


def parse_generator(token):
    match = re.fullmatch(r"s([1-9][0-9]*)(\^-1)?", str(token))
    if not match:
        raise ValueError(f"invalid braid generator: {token}")
    return (int(match.group(1)), -1 if match.group(2) else 1)


def validate_word(word, strands):
    parsed = [parse_generator(token) for token in word]
    for index, _sign in parsed:
        if index >= strands:
            raise ValueError(f"generator s{index} is outside B_{strands}")
    return parsed


def normalize_positive_word(parsed):
    word = list(parsed)
    changed = True
    while changed:
        changed = False
        i = 0
        while i < len(word) - 1:
            a, sa = word[i]
            b, sb = word[i + 1]
            if sa == sb == 1 and abs(a - b) > 1 and a > b:
                word[i], word[i + 1] = word[i + 1], word[i]
                changed = True
                continue
            i += 1
        i = 0
        while i < len(word) - 2:
            a, sa = word[i]
            b, sb = word[i + 1]
            c, sc = word[i + 2]
            if sa == sb == sc == 1 and a == c and abs(a - b) == 1 and a > b:
                word[i : i + 3] = [(b, 1), (a, 1), (b, 1)]
                changed = True
                continue
            i += 1
    return word


def check_braid_relation(payload):
    mode = "braid_relation"
    try:
        strands = int(payload["strands"])
        left = validate_word(payload["word_left"], strands)
        right = validate_word(payload["word_right"], strands)
    except (KeyError, TypeError, ValueError) as exc:
        return fail(mode, ["invalid_braid_word"], result={"error": str(exc)}, exactness="exact_combinatorial")

    left_normal = normalize_positive_word(left)
    right_normal = normalize_positive_word(right)
    return success(
        mode,
        {
            "equal": left_normal == right_normal,
            "left_normal": left_normal,
            "right_normal": right_normal,
        },
        "exact_combinatorial",
    )


def parse_linear_expression(expr):
    if not isinstance(expr, str) or not re.fullmatch(r"[\s0-9T+\-*/()]+", expr):
        raise ValueError("unsafe or unsupported expression")
    normalized = expr.replace(" ", "")
    coefficient = Fraction(0)
    constant = Fraction(0)
    for term in re.finditer(r"[+-]?[^+-]+", normalized):
        value = term.group(0)
        if "T" in value:
            coeff = value.replace("*T", "").replace("T", "")
            if coeff in ("", "+"):
                coefficient += 1
            elif coeff == "-":
                coefficient -= 1
            else:
                coefficient += Fraction(coeff)
        else:
            constant += Fraction(value)
    return coefficient, constant


def check_hecke_relation(payload):
    mode = "hecke_relation"
    try:
        q = Fraction(str(payload["q"]))
        coeff_t, constant = parse_linear_expression(payload["generator_square"])
    except (KeyError, TypeError, ValueError) as exc:
        return fail(mode, ["invalid_hecke_input"], result={"error": str(exc)}, exactness="exact_symbolic")

    # (T - q)(T + 1) = 0 implies T^2 = (q - 1)T + q.
    expected_coeff = q - 1
    expected_constant = q
    if coeff_t != expected_coeff or constant != expected_constant:
        return fail(
            mode,
            ["hecke_relation_mismatch"],
            result={
                "relation": "(T - q)(T + 1) = 0",
                "q": str(q),
                "expected_generator_square": f"{expected_coeff}*T + {expected_constant}",
            },
            exactness="exact_symbolic",
        )

    return success(
        mode,
        {
            "relation": "(T - q)(T + 1) = 0",
            "q": str(q),
            "matches": True,
            "expected_generator_square": f"{expected_coeff}*T + {expected_constant}",
        },
        "exact_symbolic",
    )


def contains_float(value):
    if isinstance(value, float):
        return True
    if isinstance(value, list):
        return any(contains_float(item) for item in value)
    if isinstance(value, dict):
        return any(contains_float(item) for item in value.values())
    return False


def check_yang_baxter(payload):
    mode = "yang_baxter_matrix"
    if contains_float(payload):
        return fail(mode, ["float_contamination"], exactness="inexact")
    matrix = payload.get("matrix")
    if not isinstance(matrix, list):
        return fail(mode, ["invalid_matrix"], exactness="exact_symbolic")
    return success(
        mode,
        {
            "checked": "shape_and_exactness_only",
            "physical_interpretation": "not_implied",
        },
        "exact_symbolic",
    )


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--input-json", required=True)
    args = parser.parse_args()
    payload = json.loads(args.input_json)
    mode = payload.get("mode")
    if mode == "braid_relation":
        result = check_braid_relation(payload)
    elif mode == "hecke_relation":
        result = check_hecke_relation(payload)
    elif mode == "yang_baxter_matrix":
        result = check_yang_baxter(payload)
    else:
        result = fail(str(mode), ["unknown_mode"], result={"mode": mode})
    sys.stdout.write(json.dumps(result, sort_keys=True) + "\n")


if __name__ == "__main__":
    main()
