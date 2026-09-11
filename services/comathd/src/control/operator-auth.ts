import { createHash, timingSafeEqual } from "node:crypto";
import type { IncomingHttpHeaders } from "node:http";
import { ComathError } from "../errors.js";
import type { ResearchConfig } from "../config/config.js";

export type AuthenticatedOperator = { kind: "operator"; id: string };

function fail(code: string, message: string, statusCode: number): never {
  throw new ComathError(message, { code, statusCode });
}

function bearer(headers: IncomingHttpHeaders): string | undefined {
  const value = headers.authorization;
  const source = Array.isArray(value) ? value[0] : value;
  const match = /^Bearer ([^\s]+)$/.exec(source ?? "");
  return match?.[1];
}

/**
 * Credentials are host configuration, never JSON request fields.  The stable
 * command principal is a token digest, so neither the credential nor a raw
 * session token is persisted in the durable command receipt.
 */
export function authenticateOperator(headers: IncomingHttpHeaders, config: ResearchConfig): AuthenticatedOperator {
  const variable = config.operator_token_env;
  if (!variable) fail("OPERATOR_AUTH_UNCONFIGURED", "Operator authentication is not configured", 503);
  const expected = process.env[variable];
  if (!expected) fail("OPERATOR_AUTH_UNAVAILABLE", "Configured operator credential is unavailable", 503);
  const supplied = bearer(headers);
  if (!supplied) fail("OPERATOR_AUTH_REQUIRED", "A bearer operator credential is required", 403);
  const expectedBytes = Buffer.from(expected), suppliedBytes = Buffer.from(supplied);
  if (expectedBytes.length !== suppliedBytes.length || !timingSafeEqual(expectedBytes, suppliedBytes)) {
    fail("OPERATOR_AUTH_FORBIDDEN", "Operator credential was rejected", 403);
  }
  return { kind: "operator", id: `operator-${createHash("sha256").update(expected).digest("hex").slice(0, 24)}` };
}
