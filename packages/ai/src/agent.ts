import { randomUUID } from "node:crypto";
import type { AiEvent, AiEventListener } from "./events.js";
import { AiError } from "./errors.js";
import type { ThreadMemory } from "./memory.js";
import type { ModelHandle } from "./model.js";
import { model as wrapModel } from "./model.js";
import { getRuntime } from "./native.js";
import { callTool, getTool, listTools, toolParameters } from "./tool.js";
import type {
  AiMessage,
  AiToolCall,
  GenerateOptions,
  GenerateResult,
  JsonValue,
  ModelProvider,
} from "./types.js";

export type AgentOptions = {
  name?: string;
  model: ModelProvider | ModelHandle;
  instructions?: string;
  tools?: Array<{ name: string }>;
  /** Agents this one may transfer control to (shared message state). */
  handoffs?: Agent[];
  maxSteps?: number;
  /** Optional event sink (OTel, logging). */
  onEvent?: AiEventListener;
};

export type AgentRunOptions = {
  /** Conversation thread id (with `memory`). */
  threadId?: string;
  /** Thread message store — prior turns are loaded; new turns appended on success. */
  memory?: ThreadMemory;
  /** Abort in-flight model calls / stop the loop. */
  signal?: AbortSignal;
};

export type AgentResult = {
  text: string;
  runId: string;
  events: AiEvent[];
};

export type Agent = {
  name: string;
  run(input: string, opts?: AgentRunOptions): Promise<AgentResult>;
  stream(input: string, opts?: AgentRunOptions): AsyncGenerator<AiEvent, AgentResult>;
  /** Transfer control to another agent with a fresh user turn (uses Rust handoff). */
  handoff(target: Agent, input: string, opts?: AgentRunOptions): Promise<AgentResult>;
};

type AgentInternal = {
  options: AgentOptions;
  model: ModelHandle;
  toolNames: string[];
  handoffTargets: string[];
};

const registry = new Map<string, Agent>();
const internals = new Map<string, AgentInternal>();

function resolveModel(model: ModelProvider | ModelHandle): ModelHandle {
  return "provider" in model && "generate" in model
    ? (model as ModelHandle)
    : wrapModel(model as ModelProvider);
}

function buildToolSpecs(toolNames: string[], handoffTargets: string[]) {
  const specs = toolNames.map((n) => {
    const meta = listTools().find((t) => t.name === n) ?? getTool(n);
    return {
      name: n,
      description:
        meta && "description" in meta && meta.description
          ? String(meta.description)
          : n,
      parameters: toolParameters(n),
    };
  });
  for (const target of handoffTargets) {
    specs.push({
      name: `handoff_to_${target}`,
      description: `Transfer this conversation to the ${target} agent.`,
      parameters: {
        type: "object",
        properties: {
          message: { type: "string", description: "Context for the next agent" },
        },
        additionalProperties: false,
      },
    });
  }
  return specs;
}

function rustConfig(name: string, internal: AgentInternal) {
  return {
    name,
    system: internal.options.instructions ?? "You are a helpful assistant.",
    tools: internal.toolNames,
    handoffs: internal.handoffTargets,
    maxSteps: internal.options.maxSteps ?? 8,
  };
}

/** Create an agent. Tool loop state lives in Rust; model I/O in JS. */
export function agent(options: AgentOptions): Agent {
  const name = options.name ?? "agent";
  const modelHandle = resolveModel(options.model);
  const toolNames = (options.tools ?? []).map((t) => t.name);
  const handoffTargets = (options.handoffs ?? []).map((a) => a.name);

  const internal: AgentInternal = {
    options,
    model: modelHandle,
    toolNames,
    handoffTargets,
  };

  const self: Agent = {
    name,
    async run(input: string, opts?: AgentRunOptions) {
      const gen = self.stream(input, opts);
      let step = await gen.next();
      while (!step.done) step = await gen.next();
      return step.value;
    },
    async *stream(input: string, opts?: AgentRunOptions): AsyncGenerator<AiEvent, AgentResult> {
      const gen = runAgentLoop(name, internal, { kind: "start", input }, opts);
      let step = await gen.next();
      while (!step.done) {
        yield step.value;
        step = await gen.next();
      }
      return step.value;
    },
    async handoff(target, input, opts) {
      const fromInternal = internals.get(name);
      if (!fromInternal) {
        throw new AiError("AGENT_MISSING", `agent internal missing: ${name}`);
      }
      if (!fromInternal.handoffTargets.includes(target.name)) {
        throw new AiError(
          "HANDOFF_DENIED",
          `handoff target not allowed: ${target.name} (declare in handoffs: [...])`,
        );
      }
      const gen = runAgentLoop(
        name,
        fromInternal,
        {
          kind: "force_handoff",
          input,
          target: target.name,
        },
        opts,
      );
      let step = await gen.next();
      while (!step.done) step = await gen.next();
      return step.value;
    },
  };

  registry.set(name, self);
  internals.set(name, internal);
  return self;
}

export function getAgent(name: string): Agent | undefined {
  return registry.get(name);
}

type LoopStart =
  | { kind: "start"; input: string }
  | { kind: "force_handoff"; input: string; target: string };

async function* runAgentLoop(
  startName: string,
  startInternal: AgentInternal,
  start: LoopStart,
  opts?: AgentRunOptions,
): AsyncGenerator<AiEvent, AgentResult> {
  let currentName = startName;
  let current = startInternal;
  let model = current.model;
  let toolSpecs = buildToolSpecs(current.toolNames, current.handoffTargets);

  let run: { id: string } | undefined;
  const events: AiEvent[] = [];
  const emit = (ev: AiEvent): AiEvent => {
    events.push(ev);
    current.options.onEvent?.(ev);
    return ev;
  };

  const signal = opts?.signal;
  const priorNonSystem = await loadPriorMessages(opts);
  const priorLen = priorNonSystem.length;

  let activeId: string | null = null;
  const dropActive = () => {
    if (!activeId) return;
    try {
      getRuntime().agentDrop(activeId);
    } catch {
      // best-effort cleanup
    }
    activeId = null;
  };

  throwIfAborted(signal);

  try {
    if (start.kind === "start") {
      run = beginRun(currentName, current, start.input, priorNonSystem);
      activeId = run.id;
      yield emit({ type: "run_start", runId: run.id, kind: "agent", name: currentName });
    } else {
      // Force handoff: start with a placeholder turn, transfer with a fixed note + context.
      run = beginRun(currentName, current, start.input, priorNonSystem);
      activeId = run.id;
      yield emit({ type: "run_start", runId: run.id, kind: "agent", name: currentName });
      const forced = getRuntime().agentDecide(run.id, {
        type: "handoff",
        target: start.target,
        // Avoid duplicating the same user text (engine already has the start user turn).
        message: undefined,
      }) as {
        run: { id: string };
        outcome: {
          type: string;
          target?: string;
          messages?: unknown[];
          error?: string;
        };
      };
      if (forced.outcome.type !== "handoff" || !forced.outcome.target) {
        throw new AiError(
          "HANDOFF_FAILED",
          forced.outcome.error ?? "forced handoff failed",
        );
      }
      yield emit({
        type: "handoff",
        runId: run.id,
        from: currentName,
        to: forced.outcome.target,
      });
      yield emit({
        type: "run_end",
        runId: run.id,
        status: "handed_off",
      });
      dropActive();
      const next = switchToTarget(forced.outcome.target, forced.outcome.messages ?? []);
      currentName = next.name;
      current = next.internal;
      model = current.model;
      toolSpecs = buildToolSpecs(current.toolNames, current.handoffTargets);
      run = next.run;
      activeId = run.id;
      yield emit({
        type: "run_start",
        runId: run.id,
        kind: "agent",
        name: currentName,
      });
    }

    for (;;) {
      throwIfAborted(signal);
      const stored = getRuntime().agentGet(run!.id) as { messages: unknown[] };
      const messages = toAiMessages(stored.messages);
      const genOpts: GenerateOptions = { messages };
      if (toolSpecs.length) genOpts.tools = toolSpecs;
      if (signal) genOpts.signal = signal;

      const before = events.length;
      const genIter = generateOnce(model, genOpts, run!.id, emit);
      let genStep = await genIter.next();
      while (!genStep.done) {
        yield genStep.value;
        genStep = await genIter.next();
      }
      const gen = genStep.value;
      for (const ev of events.slice(before)) {
        // already yielded live; skip re-yield
        void ev;
      }

      const decision = toDecision(gen, current.handoffTargets);

      const stepped = getRuntime().agentDecide(run!.id, decision) as {
        run: { id: string };
        outcome: {
          type: string;
          content?: string;
          error?: string;
          target?: string;
          messages?: unknown[];
          calls?: Array<{ id: string; name: string; arguments: JsonValue }>;
        };
      };
      run = stepped.run;
      activeId = run.id;

      if (stepped.outcome.type === "done") {
        const text = stepped.outcome.content ?? "";
        await persistThread(opts, priorLen, run.id);
        yield emit({
          type: "run_end",
          runId: run.id,
          status: "completed",
          result: { text },
        });
        dropActive();
        return { text, runId: run.id, events };
      }
      if (stepped.outcome.type === "failed") {
        const error = stepped.outcome.error ?? "agent failed";
        yield emit({ type: "error", runId: run.id, error });
        yield emit({ type: "run_end", runId: run.id, status: "failed" });
        dropActive();
        throw new AiError("AGENT_FAILED", error, { runId: run.id });
      }
      if (stepped.outcome.type === "handoff" && stepped.outcome.target) {
        yield emit({
          type: "handoff",
          runId: run.id,
          from: currentName,
          to: stepped.outcome.target,
        });
        yield emit({
          type: "run_end",
          runId: run.id,
          status: "handed_off",
        });
        dropActive();
        const next = switchToTarget(
          stepped.outcome.target,
          stepped.outcome.messages ?? [],
        );
        currentName = next.name;
        current = next.internal;
        model = current.model;
        toolSpecs = buildToolSpecs(current.toolNames, current.handoffTargets);
        run = next.run;
        activeId = run.id;
        yield emit({
          type: "run_start",
          runId: run.id,
          kind: "agent",
          name: currentName,
        });
        continue;
      }
      if (stepped.outcome.type === "need_tools") {
        const results = [];
        for (const call of stepped.outcome.calls ?? []) {
          throwIfAborted(signal);
          try {
            const value = await callTool(call.name, call.arguments, {
              roles: ["agent"],
            });
            const content =
              typeof value === "string" ? value : JSON.stringify(value ?? null);
            results.push({ toolCallId: call.id, name: call.name, content });
            yield emit({
              type: "tool_result",
              runId: run.id,
              toolCallId: call.id,
              name: call.name,
              content,
            });
          } catch (err) {
            const message = err instanceof Error ? err.message : String(err);
            const content = JSON.stringify({ error: message });
            results.push({ toolCallId: call.id, name: call.name, content });
            yield emit({
              type: "tool_result",
              runId: run.id,
              toolCallId: call.id,
              name: call.name,
              content,
            });
          }
        }
        const applied = getRuntime().agentToolResults(run.id, results) as {
          outcome: { type: string; error?: string };
        };
        if (applied.outcome.type === "failed") {
          const error = applied.outcome.error ?? "tool results failed";
          yield emit({ type: "error", runId: run.id, error });
          yield emit({ type: "run_end", runId: run.id, status: "failed" });
          dropActive();
          throw new AiError("AGENT_FAILED", error, { runId: run.id });
        }
        continue;
      }
      throw new AiError(
        "AGENT_FAILED",
        `unexpected agent outcome: ${String(stepped.outcome.type)}`,
        { runId: run.id },
      );
    }
  } catch (err) {
    const stillActive = activeId !== null;
    const runId = activeId ?? run?.id ?? "unknown";
    dropActive();
    if (stillActive) {
      const aborted =
        (err instanceof AiError && err.code === "ABORTED") || isAbortError(err);
      const message = err instanceof Error ? err.message : String(err);
      if (!aborted) {
        yield emit({ type: "error", runId, error: message });
      }
      yield emit({
        type: "run_end",
        runId,
        status: aborted ? "aborted" : "failed",
      });
      if (aborted && !(err instanceof AiError)) {
        throw new AiError("ABORTED", message, { runId });
      }
    }
    throw err;
  }
}

function beginRun(
  name: string,
  internal: AgentInternal,
  input: string,
  prior: AiMessage[],
): { id: string } {
  if (prior.length) {
    const msgs = [...toRustMessages(prior), { role: "user", content: input }];
    return getRuntime().agentContinue(rustConfig(name, internal), msgs) as {
      id: string;
    };
  }
  return getRuntime().agentStart(rustConfig(name, internal), input) as {
    id: string;
  };
}

async function loadPriorMessages(opts?: AgentRunOptions): Promise<AiMessage[]> {
  if (!opts?.threadId || !opts.memory) return [];
  const prior = await Promise.resolve(opts.memory.get(opts.threadId));
  return prior.filter((m) => m.role !== "system");
}

async function persistThread(
  opts: AgentRunOptions | undefined,
  priorLen: number,
  runId: string,
): Promise<void> {
  if (!opts?.threadId || !opts.memory) return;
  const stored = getRuntime().agentGet(runId) as { messages: unknown[] };
  const all = toAiMessages(stored.messages).filter((m) => m.role !== "system");
  const added = all.slice(priorLen);
  if (added.length) await Promise.resolve(opts.memory.append(opts.threadId, added));
}

function throwIfAborted(signal?: AbortSignal): void {
  if (!signal?.aborted) return;
  const reason = signal.reason;
  const message =
    reason instanceof Error
      ? reason.message
      : reason != null
        ? String(reason)
        : "aborted";
  throw new AiError("ABORTED", message);
}

function isAbortError(err: unknown): boolean {
  if (err instanceof AiError && err.code === "ABORTED") return true;
  if (!err || typeof err !== "object") return false;
  const name = "name" in err ? String((err as { name: unknown }).name) : "";
  return name === "AbortError" || name === "TimeoutError";
}

function switchToTarget(target: string, messages: unknown[]) {
  const internal = internals.get(target);
  if (!internal) {
    throw new AiError("AGENT_MISSING", `handoff target not found: ${target}`);
  }
  const run = getRuntime().agentContinue(rustConfig(target, internal), messages) as {
    id: string;
  };
  return { name: target, internal, run };
}

function toDecision(gen: GenerateResult, handoffTargets: string[]) {
  const calls = gen.toolCalls ?? [];
  const handoffCalls = calls.filter((c) => c.name.startsWith("handoff_to_"));
  const otherCalls = calls.filter((c) => !c.name.startsWith("handoff_to_"));
  if (handoffCalls.length && otherCalls.length) {
    throw new AiError(
      "HANDOFF_MIXED",
      "handoff cannot be mixed with other tool calls in the same turn",
    );
  }
  if (handoffCalls.length) {
    const handoffCall = handoffCalls[0]!;
    const target = handoffCall.name.slice("handoff_to_".length);
    if (!handoffTargets.includes(target)) {
      throw new AiError("HANDOFF_DENIED", `handoff target not allowed: ${target}`);
    }
    const args = handoffCall.arguments;
    const message =
      args && typeof args === "object" && !Array.isArray(args) && "message" in args
        ? String((args as { message: unknown }).message)
        : undefined;
    return {
      type: "handoff",
      target,
      ...(message !== undefined ? { message } : {}),
    };
  }
  if (calls.length) {
    return {
      type: "tool_calls",
      calls: calls.map((c) => ({
        id: c.id || randomUUID(),
        name: c.name,
        arguments: c.arguments ?? {},
      })),
    };
  }
  return { type: "text", content: gen.text ?? "" };
}

async function* generateOnce(
  handle: ModelHandle,
  genOpts: GenerateOptions,
  runId: string,
  emit: (ev: AiEvent) => AiEvent,
): AsyncGenerator<AiEvent, GenerateResult> {
  if (!handle.stream) {
    const generated = await handle.generate(genOpts);
    if (generated.text) yield emit({ type: "text", runId, text: generated.text });
    if (generated.toolCalls) {
      for (const tc of generated.toolCalls) {
        yield emit({ type: "tool_call", runId, toolCall: tc });
      }
    }
    return generated;
  }

  let textAcc = "";
  const toolCalls: AiToolCall[] = [];
  for await (const chunk of handle.stream(genOpts)) {
    if (chunk.type === "text") {
      textAcc += chunk.text;
      yield emit({ type: "text", runId, text: chunk.text });
    } else if (chunk.type === "tool_call") {
      toolCalls.push(chunk.toolCall);
      yield emit({ type: "tool_call", runId, toolCall: chunk.toolCall });
    }
  }
  const out: GenerateResult = {};
  if (textAcc) out.text = textAcc;
  if (toolCalls.length) out.toolCalls = toolCalls;
  return out;
}

function toRustMessages(messages: AiMessage[]): unknown[] {
  return messages.map((m) => {
    if (m.role === "system") return { role: "system", content: m.content };
    if (m.role === "user") return { role: "user", content: m.content };
    if (m.role === "tool") {
      return {
        role: "tool",
        toolCallId: m.toolCallId,
        name: m.name,
        content: m.content,
      };
    }
    return {
      role: "assistant",
      ...(m.content != null ? { content: m.content } : { content: null }),
      toolCalls: (m.toolCalls ?? []).map((c) => ({
        id: c.id,
        name: c.name,
        arguments: c.arguments ?? {},
      })),
    };
  });
}

function toAiMessages(messages: unknown[]): AiMessage[] {
  const out: AiMessage[] = [];
  for (const m of messages) {
    const msg = m as Record<string, unknown>;
    const role = String(msg.role);
    if (role === "system") {
      out.push({ role: "system", content: String(msg.content ?? "") });
      continue;
    }
    if (role === "user") {
      out.push({ role: "user", content: String(msg.content ?? "") });
      continue;
    }
    if (role === "tool") {
      out.push({
        role: "tool",
        toolCallId: String(msg.toolCallId ?? ""),
        name: String(msg.name ?? ""),
        content: String(msg.content ?? ""),
      });
      continue;
    }
    const assistant: Extract<AiMessage, { role: "assistant" }> = { role: "assistant" };
    if (msg.content != null) assistant.content = String(msg.content);
    if (Array.isArray(msg.toolCalls)) {
      assistant.toolCalls = (msg.toolCalls as AiToolCall[]).map((c) => ({
        id: c.id,
        name: c.name,
        arguments: c.arguments,
      }));
    }
    out.push(assistant);
  }
  return out;
}
