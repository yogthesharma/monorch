import { createRequire } from "node:module";
import type { AiEvent, AiEventListener } from "./events.js";

export type OtelHooks = {
  onEvent?: AiEventListener;
  serviceName?: string;
};

type SpanLike = {
  setAttribute(key: string, value: string | number | boolean): void;
  addEvent(name: string, attributes?: Record<string, string>): void;
  recordException?(err: Error): void;
  end(): void;
};

type TracerLike = {
  startSpan(name: string): SpanLike;
};

const require = createRequire(import.meta.url);

function tryLoadTracer(serviceName: string): TracerLike | null {
  try {
    const api = require("@opentelemetry/api") as {
      trace: {
        getTracer(name: string): TracerLike;
      };
    };
    return api.trace.getTracer(serviceName);
  } catch {
    return null;
  }
}

/**
 * Bridge AiEvent → OpenTelemetry spans when `@opentelemetry/api` is installed.
 * Safe without the peer dep — falls back to `onEvent` only.
 */
export function createOtelListener(hooks: OtelHooks = {}): AiEventListener {
  const serviceName = hooks.serviceName ?? "monorch";
  const tracer = tryLoadTracer(serviceName);
  const runs = new Map<string, SpanLike>();

  return (event: AiEvent) => {
    hooks.onEvent?.(event);
    if (!tracer) return;

    if (event.type === "run_start") {
      const span = tracer.startSpan(`${event.kind}.${event.name}`);
      span.setAttribute("monorch.run_id", event.runId);
      span.setAttribute("monorch.kind", event.kind);
      span.setAttribute("monorch.name", event.name);
      runs.set(event.runId, span);
      return;
    }

    const span = runs.get(event.runId);
    if (!span) return;

    switch (event.type) {
      case "text":
        span.addEvent("text", { length: String(event.text.length) });
        break;
      case "tool_call":
        span.addEvent("tool_call", { name: event.toolCall.name });
        break;
      case "tool_result":
        span.addEvent("tool_result", { name: event.name });
        break;
      case "node_start":
        span.addEvent("node_start", { nodeId: event.nodeId, nodeType: event.nodeType });
        break;
      case "node_end":
        span.addEvent("node_end", { nodeId: event.nodeId });
        break;
      case "interrupt":
        span.addEvent("interrupt", { nodeId: event.nodeId });
        break;
      case "handoff":
        span.addEvent("handoff", { from: event.from, to: event.to });
        span.setAttribute("monorch.status", "handed_off");
        span.end();
        runs.delete(event.runId);
        break;
      case "error":
        span.recordException?.(new Error(event.error));
        span.addEvent("error", { message: event.error });
        break;
      case "run_end":
        span.setAttribute("monorch.status", event.status);
        span.end();
        runs.delete(event.runId);
        break;
      default:
        break;
    }
  };
}

/** Pipe an async event stream through a listener. */
export async function* tapEvents(
  events: AsyncIterable<AiEvent>,
  listener: AiEventListener,
): AsyncGenerator<AiEvent> {
  for await (const ev of events) {
    listener(ev);
    yield ev;
  }
}
