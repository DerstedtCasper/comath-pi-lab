import { ZodError } from "zod";

export class ComathError extends Error {
  readonly statusCode: number;
  readonly code: string;

  constructor(message: string, options: { statusCode?: number; code?: string } = {}) {
    super(message);
    this.name = "ComathError";
    this.statusCode = options.statusCode ?? 400;
    this.code = options.code ?? "COMATH_ERROR";
  }
}

export function toComathError(error: unknown): ComathError {
  if (error instanceof ComathError) {
    return error;
  }
  if (error instanceof ZodError) {
    return new ComathError(error.message, { statusCode: 400, code: "VALIDATION_ERROR" });
  }
  if (error instanceof Error) {
    return new ComathError(error.message, { statusCode: 500, code: "INTERNAL_ERROR" });
  }
  return new ComathError("Unknown error", { statusCode: 500, code: "INTERNAL_ERROR" });
}
