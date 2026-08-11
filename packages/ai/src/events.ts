/**
 * Unified event bus for agents + graphs.
 * Streaming and (later) OTel both consume these.
 */

import type { AiToolCall, JsonValue } from "./types.js";

export type AiEvent =
  | { type: "run_start"; runId: string; kind: "agent" | "graph"; name: string }
  | { type: "text"; runId: string; text: string }
  | { type: "tool_call"; runId: string; toolCall: AiToolCall }
  | {
      type: "tool_result";
      runId: string;
      toolCallId: string;
      name: string;
      content: string;
    }
  | { type: "node_start"; runId: string; nodeId: string; nodeType: string }
  | { type: "node_end"; runId: string; nodeId: string; output?: string }
  | {
      type: "interrupt";
      runId: string;
      nodeId: string;
      prompt: string;
    }
  | { type: "handoff"; runId: string; from: string; to: string }
  | { type: "error"; runId: string; error: string }
  | {
      type: "run_end";
      runId: string;
      status: "completed" | "failed" | "waitingInterrupt" | "handed_off" | "aborted";
      result?: JsonValue;
    };

export type AiEventListener = (event: AiEvent) => void;

/** Collect an async iterable of events into an array. */
export async function collectEvents(
  events: AsyncIterable<AiEvent>,
): Promise<AiEvent[]> {
  const out: AiEvent[] = [];
  for await (const ev of events) out.push(ev);
  return out;
}
