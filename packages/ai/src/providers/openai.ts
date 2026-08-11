import { AiError } from "../errors.js";
import type {
  AiMessage,
  AiToolCall,
  GenerateOptions,
  GenerateResult,
  JsonValue,
  ModelProvider,
  StreamChunk,
} from "../types.js";

export type OpenAiOptions = {
  apiKey?: string;
  /** OpenAI-compatible base URL (OpenAI, LiteLLM, OpenRouter, vLLM, …). */
  baseUrl?: string;
  defaultHeaders?: Record<string, string>;
  /** Default request timeout in ms (AbortSignal.timeout). */
  timeoutMs?: number;
};

/**
 * OpenAI-compatible chat provider with SSE streaming + abort.
 * Point `baseUrl` at LiteLLM / OpenRouter / local gateways.
 */
export function openai(modelId: string, options: OpenAiOptions = {}): ModelProvider {
  const apiKey = options.apiKey ?? process.env.OPENAI_API_KEY ?? process.env.LITELLM_API_KEY ?? "";
  const baseUrl = (options.baseUrl ?? process.env.LITELLM_URL ?? "https://api.openai.com/v1").replace(
    /\/$/,
    "",
  );
  const defaultTimeout = options.timeoutMs ?? 60_000;

  return {
    name: "openai-compatible",
    modelId,
    async generate(opts: GenerateOptions): Promise<GenerateResult> {
      const data = await chatCompletions(modelId, apiKey, baseUrl, options, opts, false, defaultTimeout);
      const msg = data.choices?.[0]?.message;
      const toolCalls: AiToolCall[] | undefined = msg?.tool_calls?.map((c) => ({
        id: c.id,
        name: c.function.name,
        arguments: safeJson(c.function.arguments),
      }));
      const out: GenerateResult = { raw: data };
      if (msg?.content) out.text = msg.content;
      if (toolCalls?.length) out.toolCalls = toolCalls;
      return out;
    },
    async *stream(opts: GenerateOptions): AsyncIterable<StreamChunk> {
      const res = await chatCompletionsRaw(
        modelId,
        apiKey,
        baseUrl,
        options,
        opts,
        true,
        defaultTimeout,
      );
      if (!res.body) throw new AiError("OPENAI_STREAM", "response body missing");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      const toolAcc = new Map<
        number,
        { id: string; name: string; arguments: string }
      >();

      try {
        for (;;) {
          let done: boolean;
          let value: Uint8Array | undefined;
          try {
            ({ done, value } = await reader.read());
          } catch (err) {
            throw mapFetchAbort(err);
          }
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";
          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed.startsWith("data:")) continue;
            const payload = trimmed.slice(5).trim();
            if (payload === "[DONE]") {
              for (const t of toolAcc.values()) {
                yield {
                  type: "tool_call",
                  toolCall: {
                    id: t.id,
                    name: t.name,
                    arguments: safeJson(t.arguments),
                  },
                };
              }
              yield { type: "done" };
              return;
            }
            let parsed: {
              choices?: Array<{
                delta?: {
                  content?: string | null;
                  tool_calls?: Array<{
                    index?: number;
                    id?: string;
                    function?: { name?: string; arguments?: string };
                  }>;
                };
              }>;
            };
            try {
              parsed = JSON.parse(payload) as typeof parsed;
            } catch {
              continue;
            }
            const delta = parsed.choices?.[0]?.delta;
            if (delta?.content) yield { type: "text", text: delta.content };
            if (delta?.tool_calls) {
              for (const tc of delta.tool_calls) {
                const idx = tc.index ?? 0;
                const cur = toolAcc.get(idx) ?? { id: "", name: "", arguments: "" };
                if (tc.id) cur.id = tc.id;
                if (tc.function?.name) cur.name = tc.function.name;
                if (tc.function?.arguments) cur.arguments += tc.function.arguments;
                toolAcc.set(idx, cur);
              }
            }
          }
        }
        for (const t of toolAcc.values()) {
          yield {
            type: "tool_call",
            toolCall: {
              id: t.id || `call_${t.name}`,
              name: t.name,
              arguments: safeJson(t.arguments),
            },
          };
        }
        yield { type: "done" };
      } finally {
        reader.releaseLock();
      }
    },
  };
}

type ChatResponse = {
  choices?: Array<{
    message?: {
      content?: string | null;
      tool_calls?: Array<{
        id: string;
        function: { name: string; arguments: string };
      }>;
    };
  }>;
};

async function chatCompletions(
  modelId: string,
  apiKey: string,
  baseUrl: string,
  options: OpenAiOptions,
  opts: GenerateOptions,
  stream: boolean,
  defaultTimeout: number,
): Promise<ChatResponse> {
  const res = await chatCompletionsRaw(
    modelId,
    apiKey,
    baseUrl,
    options,
    opts,
    stream,
    defaultTimeout,
  );
  return (await res.json()) as ChatResponse;
}

async function chatCompletionsRaw(
  modelId: string,
  apiKey: string,
  baseUrl: string,
  options: OpenAiOptions,
  opts: GenerateOptions,
  stream: boolean,
  defaultTimeout: number,
): Promise<Response> {
  if (!apiKey && !baseUrl.includes("localhost") && !baseUrl.includes("127.0.0.1")) {
    throw new AiError("OPENAI_AUTH", "OPENAI_API_KEY (or LITELLM_API_KEY) missing");
  }
  const body: Record<string, unknown> = {
    model: modelId,
    messages: opts.messages.map(toOpenAiMessage),
    temperature: opts.temperature ?? 0,
    stream,
  };
  if (opts.maxTokens !== undefined) body.max_tokens = opts.maxTokens;
  if (opts.toolChoice !== undefined) body.tool_choice = opts.toolChoice;
  if (opts.tools?.length) {
    body.tools = opts.tools.map((t) => ({
      type: "function",
      function: {
        name: t.name,
        description: t.description,
        parameters: t.parameters,
      },
    }));
  }

  const signal = mergeAbort(opts.signal, opts.timeoutMs ?? defaultTimeout);
  let res: Response;
  try {
    res = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        authorization: apiKey ? `Bearer ${apiKey}` : "",
        "content-type": "application/json",
        ...(stream ? { accept: "text/event-stream" } : {}),
        ...(options.defaultHeaders ?? {}),
      },
      body: JSON.stringify(body),
      signal,
    });
  } catch (err) {
    throw mapFetchAbort(err);
  }
  if (!res.ok) {
    throw new AiError(
      "OPENAI_HTTP",
      `openai-compatible ${res.status}: ${await res.text()}`,
    );
  }
  return res;
}

function mapFetchAbort(err: unknown): Error {
  if (err instanceof AiError) return err;
  if (err && typeof err === "object") {
    const name = "name" in err ? String((err as { name: unknown }).name) : "";
    if (name === "AbortError" || name === "TimeoutError") {
      const message = err instanceof Error ? err.message : "aborted";
      return new AiError("ABORTED", message);
    }
  }
  return err instanceof Error ? err : new Error(String(err));
}

function mergeAbort(signal: AbortSignal | undefined, timeoutMs: number): AbortSignal {
  const timeout = AbortSignal.timeout(timeoutMs);
  if (!signal) return timeout;
  if (typeof AbortSignal.any === "function") {
    return AbortSignal.any([signal, timeout]);
  }
  const ctrl = new AbortController();
  const onAbort = () => ctrl.abort();
  if (signal.aborted || timeout.aborted) ctrl.abort();
  else {
    signal.addEventListener("abort", onAbort, { once: true });
    timeout.addEventListener("abort", onAbort, { once: true });
  }
  return ctrl.signal;
}

function safeJson(text: string): JsonValue {
  try {
    return JSON.parse(text) as JsonValue;
  } catch {
    return { _raw: text };
  }
}

function toOpenAiMessage(m: AiMessage): Record<string, unknown> {
  if (m.role === "tool") {
    return { role: "tool", tool_call_id: m.toolCallId, name: m.name, content: m.content };
  }
  if (m.role === "assistant") {
    const out: Record<string, unknown> = { role: "assistant", content: m.content ?? null };
    if (m.toolCalls?.length) {
      out.tool_calls = m.toolCalls.map((c) => ({
        id: c.id,
        type: "function",
        function: { name: c.name, arguments: JSON.stringify(c.arguments ?? {}) },
      }));
    }
    return out;
  }
  return { role: m.role, content: m.content };
}

/** Deterministic provider for tests / offline smoke. */
export function mock(script?: GenerateResult[]): ModelProvider {
  let i = 0;
  const turns = script ?? [{ text: "ok" }];
  return {
    name: "mock",
    modelId: "mock",
    generate(opts) {
      if (opts.signal?.aborted) throw new AiError("ABORTED", "mock aborted");
      if (i >= turns.length) {
        throw new Error(`mock script exhausted after ${turns.length} turn(s)`);
      }
      const out = turns[i]!;
      i += 1;
      return out;
    },
    async *stream(options): AsyncIterable<StreamChunk> {
      const out = await this.generate(options);
      if (out.text) yield { type: "text", text: out.text };
      if (out.toolCalls) {
        for (const toolCall of out.toolCalls) yield { type: "tool_call", toolCall };
      }
      yield { type: "done" };
    },
  };
}
