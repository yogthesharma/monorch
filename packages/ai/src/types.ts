export type JsonPrimitive = string | number | boolean | null;
export type JsonValue = JsonPrimitive | JsonObject | JsonValue[];
export type JsonObject = { [key: string]: JsonValue };

export type Awaitable<T> = T | Promise<T>;

export type AiMessage =
  | { role: "system"; content: string }
  | { role: "user"; content: string }
  | { role: "assistant"; content?: string; toolCalls?: AiToolCall[] }
  | { role: "tool"; toolCallId: string; name: string; content: string };

export type AiToolCall = {
  id: string;
  name: string;
  arguments: JsonValue;
};

export type GenerateOptions = {
  messages: AiMessage[];
  tools?: Array<{ name: string; description: string; parameters: unknown }>;
  temperature?: number;
  maxTokens?: number;
  toolChoice?: "auto" | "none" | "required" | { type: "function"; function: { name: string } };
  /** Abort in-flight provider calls. */
  signal?: AbortSignal;
  /** Per-call timeout override (ms). */
  timeoutMs?: number;
};

export type GenerateResult = {
  text?: string;
  toolCalls?: AiToolCall[];
  raw?: unknown;
};

export type StreamChunk =
  | { type: "text"; text: string }
  | { type: "tool_call"; toolCall: AiToolCall }
  | { type: "done" };

export type ModelProvider = {
  name: string;
  modelId: string;
  generate(options: GenerateOptions): Awaitable<GenerateResult>;
  stream?(options: GenerateOptions): AsyncIterable<StreamChunk>;
};
