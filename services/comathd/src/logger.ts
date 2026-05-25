export type LogLevel = "debug" | "info" | "warn" | "error";

export type Logger = {
  log(level: LogLevel, message: string, fields?: Record<string, unknown>): void;
};

export const noopLogger: Logger = {
  log() {
    // Intentionally no-op for Phase 2; audit JSONL belongs to Phase 3.
  }
};
