import { createHash, timingSafeEqual } from "node:crypto";
import type { IncomingHttpHeaders } from "node:http";
import { ComathError } from "../errors.js";
import type { ResearchConfig } from "../config/config.js";

export type AuthenticatedOperator = { kind: "operator"; id: string };
export type AuthenticatedHost = { kind: "host"; id: string };
export type AuthenticatedResearchPrincipal = AuthenticatedOperator | AuthenticatedHost;

function fail(code: string, message: string, statusCode: number): never {
  throw new ComathError(message, { code, statusCode });
}

function bearer(headers: IncomingHttpHeaders): string | undefined {
  const value = headers.authorization;
  const source = Array.isArray(value) ? value[0] : value;
  const match = /^Bearer ([^\s]+)$/.exec(source ?? "");
  return match?.[1];
}
function sameCredential(left: string | undefined, right: string | undefined): boolean {
  if (!left || !right) return false;
  const leftBytes = Buffer.from(left), rightBytes = Buffer.from(right);
  return leftBytes.length === rightBytes.length && timingSafeEqual(leftBytes, rightBytes);
}
function hostCredentialCollidesWithOperator(config: ResearchConfig): boolean {
  return sameCredential(config.operator_token_env && process.env[config.operator_token_env], config.host_approval_token_env && process.env[config.host_approval_token_env]);
}

/**
 * Credentials are host configuration, never JSON request fields.  The stable
 * command principal is a token digest, so neither the credential nor a raw
 * session token is persisted in the durable command receipt.
 */
function authenticate(headers: IncomingHttpHeaders, variable: string | undefined, kind: "operator" | "host"): AuthenticatedResearchPrincipal {
  const prefix = kind === "operator" ? "OPERATOR" : "HOST_APPROVAL";
  if (!variable) fail(`${prefix}_AUTH_UNCONFIGURED`, `${kind === "operator" ? "Operator" : "Host approval"} authentication is not configured`, 503);
  const expected = process.env[variable];
  if (!expected) fail(`${prefix}_AUTH_UNAVAILABLE`, `Configured ${kind === "operator" ? "operator" : "host approval"} credential is unavailable`, 503);
  const supplied = bearer(headers);
  if (!supplied) fail(`${prefix}_AUTH_REQUIRED`, `A bearer ${kind === "operator" ? "operator" : "host approval"} credential is required`, 403);
  const expectedBytes = Buffer.from(expected), suppliedBytes = Buffer.from(supplied);
  if (expectedBytes.length !== suppliedBytes.length || !timingSafeEqual(expectedBytes, suppliedBytes)) {
    fail(`${prefix}_AUTH_FORBIDDEN`, `${kind === "operator" ? "Operator" : "Host approval"} credential was rejected`, 403);
  }
  return { kind, id: `${kind}-${createHash("sha256").update(expected).digest("hex").slice(0, 24)}` };
}
export function authenticateOperator(headers: IncomingHttpHeaders, config: ResearchConfig): AuthenticatedOperator {
  return authenticate(headers, config.operator_token_env, "operator") as AuthenticatedOperator;
}
export function authenticateHost(headers: IncomingHttpHeaders, config: ResearchConfig): AuthenticatedHost {
  if (hostCredentialCollidesWithOperator(config)) {
    fail("HOST_APPROVAL_CREDENTIAL_COLLISION", "Host approval and operator credentials must resolve to different values", 503);
  }
  return authenticate(headers, config.host_approval_token_env, "host") as AuthenticatedHost;
}
/** A read may be made by either configured principal; mutations choose one explicitly. */
export function authenticateResearchReader(headers: IncomingHttpHeaders, config: ResearchConfig): AuthenticatedResearchPrincipal {
  const token = bearer(headers);
  if (!token) fail("RESEARCH_AUTH_REQUIRED", "A bearer research credential is required", 403);
  const matches = (variable: string | undefined) => {
    const expected = variable && process.env[variable];
    if (!expected) return false;
    const left = Buffer.from(expected), right = Buffer.from(token);
    return left.length === right.length && timingSafeEqual(left, right);
  };
  if (matches(config.operator_token_env)) return authenticateOperator(headers, config);
  if (matches(config.host_approval_token_env)) return authenticateHost(headers, config);
  return authenticateOperator(headers, config);
}
