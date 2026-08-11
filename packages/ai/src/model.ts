import { z } from "zod";
import { AiError } from "./errors.js";
import { getRuntime } from "./native.js";
import type { GenerateOptions, GenerateResult, ModelProvider, StreamChunk } from "./types.js";
import { zodToIr } from "./zod-ir.js";

export type ModelHandle = {
  readonly provider: ModelProvider;
  generate(options: GenerateOptions & { prompt?: string }): Promise<GenerateResult>;
  stream(options: GenerateOptions & { prompt?: string }): AsyncIterable<StreamChunk>;
  generateObject<T extends z.ZodTypeAny>(options: {
    prompt?: string;
    messages?: GenerateOptions["messages"];
    output: T;
    temperature?: number;
  }): Promise<z.infer<T>>;
};

/** Wrap a provider as a model handle. */
export function model(provider: ModelProvider): ModelHandle {
  return {
    provider,
    async generate(options) {
      return provider.generate(normalize(options));
    },
    stream(options) {
      const opts = normalize(options);
      if (provider.stream) return provider.stream(opts);
      return streamFromGenerate(provider, opts);
    },
    async generateObject<T extends z.ZodTypeAny>({
      prompt,
      messages,
      output,
      temperature,
    }: {
      prompt?: string;
      messages?: GenerateOptions["messages"];
      output: T;
      temperature?: number;
    }) {
      const genOpts: GenerateOptions = {
        messages: [
          ...(messages ?? (prompt ? [{ role: "user" as const, content: prompt }] : [])),
          {
            role: "system",
            content: "Respond with JSON only matching the required schema. No markdown.",
          },
        ],
        ...(temperature !== undefined ? { temperature } : {}),
      };
      const result = await provider.generate(genOpts);
      const text = result.text?.trim();
      if (!text) throw new AiError("EMPTY_OUTPUT", "empty structured output");
      let json: unknown;
      try {
        json = JSON.parse(text) as unknown;
      } catch {
        const m = text.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
        if (!m) throw new AiError("INVALID_JSON", "model did not return JSON", { text });
        json = JSON.parse(m[0]!) as unknown;
      }
      const ir = zodToIr(output);
      const parsed = getRuntime().parse(ir, json);
      if (!parsed.ok) {
        throw new AiError("VALIDATION_FAILED", "structured output failed validation", {
          errors: parsed.errors,
        });
      }
      return parsed.value as z.infer<T>;
    },
  };
}

function normalize(options: GenerateOptions & { prompt?: string }): GenerateOptions {
  const messages =
    options.messages ??
    (options.prompt ? [{ role: "user" as const, content: options.prompt }] : []);
  const out: GenerateOptions = { messages };
  if (options.tools) out.tools = options.tools;
  if (options.temperature !== undefined) out.temperature = options.temperature;
  if (options.maxTokens !== undefined) out.maxTokens = options.maxTokens;
  if (options.toolChoice !== undefined) out.toolChoice = options.toolChoice;
  if (options.signal) out.signal = options.signal;
  if (options.timeoutMs !== undefined) out.timeoutMs = options.timeoutMs;
  return out;
}

async function* streamFromGenerate(
  provider: ModelProvider,
  options: GenerateOptions,
): AsyncIterable<StreamChunk> {
  const out = await provider.generate(options);
  if (out.text) yield { type: "text", text: out.text };
  if (out.toolCalls) {
    for (const toolCall of out.toolCalls) yield { type: "tool_call", toolCall };
  }
  yield { type: "done" };
}
