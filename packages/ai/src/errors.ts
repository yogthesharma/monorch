export class AiError extends Error {
  readonly code: string;
  readonly details?: Record<string, unknown>;

  constructor(code: string, message: string, details?: Record<string, unknown>) {
    super(message);
    this.name = "AiError";
    this.code = code;
    if (details) this.details = details;
  }
}
