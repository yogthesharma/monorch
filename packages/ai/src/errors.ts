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

/**
 * Map a raw N-API / Rust engine error into the public AiError catalog.
 * Native bindings currently throw plain Error with a reason string.
 */
export function fromNativeError(err: unknown): AiError {
  if (err instanceof AiError) return err;
  const message = err instanceof Error ? err.message : String(err);
  return new AiError(mapNativeMessage(message), message, {
    source: "native",
    ...(err instanceof Error && err.name ? { nativeName: err.name } : {}),
  });
}

function mapNativeMessage(message: string): string {
  const m = message.toLowerCase();

  if (m.includes("def_hash") || m.includes("definition changed")) {
    return "DEF_HASH_MISMATCH";
  }
  if (m.includes("tool already registered")) return "TOOL_ALREADY_REGISTERED";
  if (m.includes("graph already registered")) return "GRAPH_ALREADY_REGISTERED";
  if (m.includes("workflow already registered")) return "WORKFLOW_ALREADY_REGISTERED";
  if (m.includes("already registered")) return "ALREADY_REGISTERED";

  if (
    m.includes("waiting for interrupt") ||
    m.includes("waiting for human") ||
    m.includes("resume interrupt before") ||
    m.includes("no active interrupt")
  ) {
    return "GRAPH_RESUME_INVALID";
  }

  if (m.includes("needs route") || m.includes("need_route") || m.includes("invalid route")) {
    return "GRAPH_ROUTE";
  }

  if (
    m.includes("not registered") ||
    m.includes("compile first") ||
    m.includes("unknown graph")
  ) {
    return "GRAPH_NOT_REGISTERED";
  }

  if (m.includes("unsupported checkpoint") || m.includes("checkpoint missing")) {
    return "CHECKPOINT_INVALID";
  }

  if (m.includes("tool") && (m.includes("not found") || m.includes("unknown"))) {
    return "TOOL_MISSING";
  }

  if (m.includes("run finished") || m.includes("cursor mismatch")) {
    return "GRAPH_FAILED";
  }

  return "ENGINE_ERROR";
}

/** Invoke a sync native call and rethrow as AiError. */
export function nativeCall<T>(fn: () => T): T {
  try {
    return fn();
  } catch (err) {
    throw fromNativeError(err);
  }
}
