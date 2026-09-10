#!/usr/bin/env python3
"""Bounded exact scalar differences; symbolic evidence, never proof authority.

The finite AST parser never invokes eval/sympify/parse_expr. Original denominator
and conservative sufficient branch guards are saved before simplification.
A false equivalence flag means not established, not a counterexample.
"""
from __future__ import annotations

import argparse
import ast
import json
import re
import sys
from fractions import Fraction
from typing import Any

import sympy as sp

DOMAINS = {"integer", "rational", "real", "complex", "unspecified"}
FUNCTIONS = {"sin": sp.sin, "cos": sp.cos, "tan": sp.tan, "exp": sp.exp, "log": sp.log, "Abs": sp.Abs}
CONSTANTS = {"pi": sp.pi, "E": sp.E, "I": sp.I}
NAME = re.compile(r"^[A-Za-z][A-Za-z0-9_]{0,63}$")


class Rejected(ValueError):
    """Only a fixed rejection code crosses the CLI boundary."""


def result(ok: bool, exactness: str, supports_status: str, payload: Any,
           vetoes: list[str] | None = None, warnings: list[str] | None = None) -> dict[str, Any]:
    return {"ok": ok, "runner_id": "sympy-exact", "exactness": exactness,
            "supports_status": supports_status, "result": payload,
            "vetoes": vetoes or [], "warnings": warnings or []}


def variable_symbols(payload: dict[str, Any]) -> tuple[dict[str, sp.Symbol], list[dict[str, str]], str]:
    variables = payload.get("variables", [])
    if not isinstance(variables, list) or len(variables) > 32:
        raise Rejected("invalid_variables")
    policy = payload.get("domain_policy")
    if policy == "explicit":
        if not all(isinstance(item, dict) and set(item) == {"name", "domain"} for item in variables):
            raise Rejected("invalid_variables")
        declared = [dict(item) for item in variables]
    elif policy is None and all(isinstance(item, str) for item in variables):
        policy = "legacy_integer"
        declared = [{"name": item, "domain": "integer"} for item in variables]
    else:
        raise Rejected("invalid_domain_policy")
    symbols: dict[str, sp.Symbol] = {}
    for declaration in declared:
        name, domain = declaration["name"], declaration["domain"]
        if (not isinstance(name, str) or not NAME.fullmatch(name) or "__" in name
                or name in symbols or name in FUNCTIONS or name in CONSTANTS or name == "sqrt"):
            raise Rejected("invalid_variables")
        if not isinstance(domain, str) or domain not in DOMAINS:
            raise Rejected("invalid_domain")
        symbols[name] = sp.Symbol(name, **({} if domain == "unspecified" else {domain: True}))
    return symbols, declared, policy


def literal_fraction(node: ast.AST) -> Fraction | None:
    if isinstance(node, ast.Constant) and type(node.value) is int:
        if abs(node.value) > 100:
            raise Rejected("exponent_limit")
        return Fraction(node.value)
    if isinstance(node, ast.UnaryOp) and isinstance(node.op, (ast.UAdd, ast.USub)):
        value = literal_fraction(node.operand)
        return None if value is None else (-value if isinstance(node.op, ast.USub) else value)
    if isinstance(node, ast.BinOp) and isinstance(node.op, ast.Div):
        left, right = literal_fraction(node.left), literal_fraction(node.right)
        if left is not None and right is not None and right != 0:
            value = left / right
            if abs(value.numerator) > 100 or value.denominator > 100:
                raise Rejected("exponent_limit")
            return value
    return None


class ScalarParser:
    def __init__(self, symbols: dict[str, sp.Symbol]) -> None:
        self.symbols = symbols
        self.conditions: list[tuple[str, sp.Basic, str]] = []
        self.branches: list[tuple[str, sp.Basic | None, str, str]] = []

    def nonzero(self, expression: sp.Expr, source: str, kind: str) -> None:
        self.conditions.append((kind, sp.Ne(expression, 0, evaluate=False), source))

    def branch(self, expression: sp.Expr, source: str, kind: str, strict: bool = False) -> None:
        # Sufficient guards; the principal complex function may also exist elsewhere.
        if expression.is_real is True:
            guard = (sp.Gt if strict else sp.Ge)(expression, 0, evaluate=False)
            self.branches.append((kind, guard, source, "sufficient_real_branch_guard"))
        else:
            self.branches.append((kind, None, source, f"principal_branch_consistency({expression})"))

    def parse(self, text: str, source: str) -> sp.Expr:
        if not isinstance(text, str) or not text.strip() or len(text) > 4096:
            raise Rejected("invalid_expression")
        try:
            tree = ast.parse(text.replace("^", "**").strip(), mode="eval")
        except (SyntaxError, ValueError, RecursionError):
            raise Rejected("unsafe_expression_syntax") from None
        if sum(1 for _ in ast.walk(tree)) > 256:
            raise Rejected("expression_complexity_limit")
        self.numeric_size(tree.body)
        return self.build(tree.body, source, 0)

    def numeric_size(self, node: ast.AST) -> int | None:
        """Reject literal exponent towers before allocating giant integers."""
        if isinstance(node, ast.Constant) and type(node.value) is int:
            size = len(str(abs(node.value)))
            if size > 100:
                raise Rejected("integer_limit")
            return size
        if isinstance(node, ast.UnaryOp):
            return self.numeric_size(node.operand)
        if isinstance(node, ast.BinOp):
            left, right = self.numeric_size(node.left), self.numeric_size(node.right)
            if left is not None and right is not None:
                if isinstance(node.op, ast.Pow):
                    exponent = literal_fraction(node.right)
                    if exponent is None:
                        raise Rejected("unsupported_exponent")
                    size = left * max(abs(exponent.numerator), exponent.denominator, 1)
                else:
                    size = left + right + 1
                if size > 4096:
                    raise Rejected("integer_limit")
                return size
        if isinstance(node, ast.Call):
            for arg in node.args:
                self.numeric_size(arg)
        return None

    def build(self, node: ast.AST, source: str, depth: int) -> sp.Expr:
        if depth > 32:
            raise Rejected("expression_complexity_limit")
        child = lambda part, label: self.build(part, f"{source}.{label}", depth + 1)
        if isinstance(node, ast.Constant):
            if isinstance(node.value, float):
                raise Rejected("float_contamination")
            if type(node.value) is not int:
                raise Rejected("unsafe_expression_syntax")
            return sp.Integer(node.value)
        if isinstance(node, ast.Name):
            if node.id in self.symbols:
                return self.symbols[node.id]
            if node.id in CONSTANTS:
                return CONSTANTS[node.id]
            raise Rejected("undeclared_symbol")
        if isinstance(node, ast.UnaryOp) and isinstance(node.op, (ast.UAdd, ast.USub)):
            value = child(node.operand, "operand")
            return value if isinstance(node.op, ast.UAdd) else sp.Mul(-1, value, evaluate=False)
        if isinstance(node, ast.BinOp):
            if not isinstance(node.op, (ast.Add, ast.Sub, ast.Mult, ast.Div, ast.Pow)):
                raise Rejected("unsafe_expression_syntax")
            left, right = child(node.left, "left"), child(node.right, "right")
            if isinstance(node.op, ast.Add):
                return sp.Add(left, right, evaluate=False)
            if isinstance(node.op, ast.Sub):
                return sp.Add(left, sp.Mul(-1, right, evaluate=False), evaluate=False)
            if isinstance(node.op, ast.Mult):
                return sp.Mul(left, right, evaluate=False)
            if isinstance(node.op, ast.Div):
                self.nonzero(right, source, "nonzero_denominator")
                return sp.Mul(left, sp.Pow(right, -1, evaluate=False), evaluate=False)
            exponent = literal_fraction(node.right)
            if exponent is None and not (isinstance(node.right, ast.Name) and node.right.id in self.symbols):
                raise Rejected("unsupported_exponent")
            if exponent is not None:
                right = sp.Rational(exponent.numerator, exponent.denominator)
            if exponent is None or exponent <= 0:
                self.nonzero(left, source, "nonzero_power_base")
            if right.is_integer is not True:
                self.branch(left, source, "power_branch", exponent is None or exponent < 0)
            return sp.Pow(left, right, evaluate=False)
        if isinstance(node, ast.Call):
            if (not isinstance(node.func, ast.Name) or node.func.id not in {*FUNCTIONS, "sqrt"}
                    or len(node.args) != 1 or node.keywords):
                raise Rejected("unsafe_expression_syntax")
            value = child(node.args[0], "argument")
            name = node.func.id
            if name == "sqrt":
                self.branch(value, source, "sqrt_branch")
                return sp.Pow(value, sp.Rational(1, 2), evaluate=False)
            if name == "log":
                self.nonzero(value, source, "nonzero_log_argument")
                self.branch(value, source, "log_branch", strict=True)
            if name == "tan":
                self.nonzero(sp.cos(value, evaluate=False), source, "nonzero_tangent_denominator")
            return FUNCTIONS[name](value, evaluate=False)
        raise Rejected("unsafe_expression_syntax")


def condition_status(condition: sp.Basic | None) -> str:
    if condition is None:
        return "unresolved"
    try:
        simplified = sp.simplify(condition)
        if simplified is sp.true:
            return "discharged"
        if simplified is sp.false:
            return "violated"
    except Exception:
        pass
    return "unresolved"


def compute(envelope: Any) -> dict[str, Any]:
    if not isinstance(envelope, dict) or not isinstance(envelope.get("input", {}), dict):
        raise Rejected("invalid_input")
    payload = envelope.get("input", {})
    if set(payload) - {"expression", "expected", "variables", "domain_policy"}:
        raise Rejected("invalid_input")
    expression, expected = payload.get("expression", ""), payload.get("expected", "0")
    symbols, declared, policy = variable_symbols(payload)
    parser = ScalarParser(symbols)
    expr, target = parser.parse(expression, "expression"), parser.parse(expected, "expected")
    # Capture both unevaluated trees and every obligation before simplification.
    unevaluated_expression, unevaluated_expected = sp.srepr(expr), sp.srepr(target)
    conditions = [{"kind": kind, "expression": str(condition), "source": source,
                   "status": condition_status(condition)} for kind, condition, source in parser.conditions]
    branches = [{"kind": kind, "expression": str(condition) if condition is not None else note,
                 "source": source, "status": condition_status(condition), "semantics": note}
                for kind, condition, source, note in parser.branches]
    calculation_status = "evaluated"
    if any(item["status"] == "violated" for item in conditions):
        # Do not ask the simplifier to operate on an already undefined expression.
        simplified, calculation_status = sp.nan, "skipped_undefined_input"
    else:
        try:
            simplified = sp.simplify(sp.Add(expr, sp.Mul(-1, target, evaluate=False), evaluate=False))
        except Exception:
            simplified, calculation_status = sp.nan, "failed"
    defined = not simplified.has(sp.nan, sp.zoo, sp.oo, -sp.oo)
    obligations_met = all(item["status"] == "discharged" for item in conditions + branches)
    ok = bool(simplified == 0 and defined and obligations_met)
    output = {"expression": expression, "expected": expected, "domain_policy": policy,
              "declared_domains": declared, "calculation_status": calculation_status,
              "unevaluated_expression": unevaluated_expression,
              "unevaluated_expected": unevaluated_expected, "simplified_difference": str(simplified),
              "conditions": conditions, "branch_obligations": branches,
              "equivalent_on_declared_domain": ok,
              "equivalence_status": "established_symbolically" if ok else "not_established",
              "proof_authority": "none", "result_can_be_used_as_proof": False,
              "function_semantics": "SymPy principal scalar functions; branch guards are conservative sufficient conditions",
              "sympy_version": sp.__version__}
    vetoes = []
    if calculation_status == "failed":
        vetoes.append("computation_invalid")
    if not defined:
        vetoes.append("undefined_expression")
    if not obligations_met:
        vetoes.append("domain_or_branch_obligations_unresolved")
    if simplified != 0:
        vetoes.append("symbolic_check_failed")
    return result(ok, "exact_symbolic", "symbolically_checked" if ok else "none", output,
                  vetoes, ["legacy_variables_assume_integer"] if policy == "legacy_integer" else [])


def main(argv: list[str]) -> int:
    parser = argparse.ArgumentParser(description="CoMath exact SymPy runner")
    inputs = parser.add_mutually_exclusive_group(required=True)
    inputs.add_argument("--input-json")
    inputs.add_argument("--input-file")
    args = parser.parse_args(argv)
    try:
        if args.input_file:
            with open(args.input_file, "rb") as source:
                raw_input = source.read(32769)
            if len(raw_input) > 32768:
                raise Rejected("input_size_limit")
            input_json = raw_input.decode("utf8")
        else:
            input_json = args.input_json
        if len(input_json.encode("utf8")) > 32768:
            raise Rejected("input_size_limit")
        answer = compute(json.loads(input_json))
    except Rejected as exc:
        code = str(exc)
        answer = result(False, "inexact" if code == "float_contamination" else "not_applicable", "none", None, [code])
    except Exception:
        answer = result(False, "not_applicable", "none", None, ["computation_invalid"])
    print(json.dumps(answer, sort_keys=True, separators=(",", ":")))
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
