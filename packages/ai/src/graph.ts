import { getAgent } from "./agent.js";
import type { Checkpointer } from "./checkpointer.js";
import type { AiEvent } from "./events.js";
import { AiError } from "./errors.js";
import { getRuntime } from "./native.js";
import type { Awaitable, JsonValue } from "./types.js";

export const GRAPH_END = "__end__";

export type GraphContext = {
  state: Record<string, unknown>;
  outputs: Record<string, string>;
  input: Record<string, unknown>;
};

type NodeFn = (
  ctx: GraphContext,
) => Awaitable<{ output?: string; state?: Record<string, unknown> } | string | void>;

type ConditionFn = (ctx: GraphContext) => boolean;

type NodeLocal =
  | { type: "task"; id: string; run: NodeFn }
  | {
      type: "agent";
      id: string;
      agent: string;
      prompt?: string | ((ctx: GraphContext) => string);
    }
  | { type: "interrupt"; id: string; prompt: string };

type EdgeLocal = { from: string; to: string; condition?: string };

export type GraphRunStatus =
  | "pending"
  | "running"
  | "waitingInterrupt"
  | "needsRoute"
  | "completed"
  | "failed";

export type GraphRunHandle = {
  id: string;
  graph: string;
  status: GraphRunStatus | string;
  state: Record<string, unknown>;
  outputs: Record<string, string>;
  threadId?: string;
  drive(): Promise<GraphRunHandle>;
  resume(decision?: string): Promise<GraphRunHandle>;
  stream(): AsyncGenerator<AiEvent, GraphRunHandle>;
  checkpoint(): Promise<JsonValue>;
};

export type CompiledGraph = {
  name: string;
  start(
    input?: Record<string, unknown>,
    opts?: { threadId?: string },
  ): Promise<GraphRunHandle>;
  restore(threadId: string): Promise<GraphRunHandle>;
};

export type GraphBuilder = {
  node(id: string, run: NodeFn): GraphBuilder;
  agentNode(
    id: string,
    agentName: string,
    prompt?: string | ((ctx: GraphContext) => string),
  ): GraphBuilder;
  interrupt(id: string, opts?: { prompt?: string }): GraphBuilder;
  edge(from: string, to: string, condition?: ConditionFn): GraphBuilder;
  compile(opts?: {
    checkpointer?: Checkpointer;
    maxSteps?: number;
    /** Replace an existing graph definition (hot-reload). In-flight runs with old def_hash fail. */
    replace?: boolean;
  }): CompiledGraph;
};

type RustRun = {
  id: string;
  graph: string;
  status: string;
  input?: Record<string, unknown> | null;
  state?: Record<string, unknown> | null;
  outputs?: Record<string, string>;
  defHash?: string;
};

type RustAdvance = {
  type: string;
  node?: { type: string; id: string; agent?: string; prompt?: string };
  from?: string;
  edges?: Array<{ from: string; to: string; condition?: string }>;
  error?: string;
};

const locals = new Map<
  string,
  { nodes: Map<string, NodeLocal>; conditions: Map<string, ConditionFn> }
>();

/** Define an orchestration graph (branch / interrupt / cycle limits in Rust). */
export function graph(name: string): GraphBuilder {
  const nodes: NodeLocal[] = [];
  const edges: EdgeLocal[] = [];
  const conditions = new Map<string, ConditionFn>();
  let condSeq = 0;
  let entry: string | null = null;

  const builder: GraphBuilder = {
    node(id, run) {
      if (!entry) entry = id;
      nodes.push({ type: "task", id, run });
      return builder;
    },
    agentNode(id, agentName, prompt) {
      if (!entry) entry = id;
      const n: NodeLocal = { type: "agent", id, agent: agentName };
      if (prompt !== undefined) (n as { prompt?: typeof prompt }).prompt = prompt;
      nodes.push(n);
      return builder;
    },
    interrupt(id, opts) {
      if (!entry) entry = id;
      nodes.push({ type: "interrupt", id, prompt: opts?.prompt ?? "Approve?" });
      return builder;
    },
    edge(from, to, condition) {
      if (condition) {
        const cid = `cond_${++condSeq}`;
        conditions.set(cid, condition);
        edges.push({ from, to, condition: cid });
      } else {
        edges.push({ from, to });
      }
      return builder;
    },
    compile(opts) {
      if (!entry) throw new AiError("GRAPH_EMPTY", "graph has no nodes");

      let finalEdges = edges;
      if (finalEdges.length === 0 && nodes.length > 0) {
        finalEdges = nodes.map((n, i) => ({
          from: n.id,
          to: i + 1 < nodes.length ? nodes[i + 1]!.id : GRAPH_END,
        }));
      }

      getRuntime().graphRegisterWith(
        {
          name,
          entry,
          maxSteps: opts?.maxSteps ?? 64,
          nodes: nodes.map((n) => {
            if (n.type === "task") return { type: "task", id: n.id };
            if (n.type === "agent") return { type: "agent", id: n.id, agent: n.agent };
            return { type: "interrupt", id: n.id, prompt: n.prompt };
          }),
          edges: finalEdges.map((e) => ({
            from: e.from,
            to: e.to,
            ...(e.condition ? { condition: e.condition } : {}),
          })),
        },
        opts?.replace ?? false,
      );

      locals.set(name, {
        nodes: new Map(nodes.map((n) => [n.id, n])),
        conditions,
      });

      const checkpointer = opts?.checkpointer;

      return {
        name,
        async start(input = {}, startOpts) {
          const run = getRuntime().graphStart(name, input) as RustRun;
          const handle = createHandle(run, input, checkpointer, startOpts?.threadId);
          return handle.drive();
        },
        async restore(threadId) {
          if (!checkpointer) {
            throw new AiError("CHECKPOINT_MISSING", "compile with checkpointer to restore");
          }
          const blob = await checkpointer.get(threadId);
          if (!blob) {
            throw new AiError("CHECKPOINT_NOT_FOUND", `no checkpoint for ${threadId}`);
          }
          const run = getRuntime().graphCheckpointRestore(blob) as RustRun;
          const input = (run.input ?? run.state ?? {}) as Record<string, unknown>;
          return createHandle(run, input, checkpointer, threadId);
        },
      };
    },
  };

  return builder;
}

function syncHandle(handle: GraphRunHandle, run: RustRun): void {
  handle.id = run.id;
  handle.graph = run.graph;
  handle.status = run.status;
  handle.state = (run.state as Record<string, unknown>) ?? handle.state;
  handle.outputs = run.outputs ?? {};
}

function ctxOf(handle: GraphRunHandle, input: Record<string, unknown>): GraphContext {
  return { state: handle.state, outputs: handle.outputs, input };
}

async function persist(
  handle: GraphRunHandle,
  checkpointer?: Checkpointer,
  threadId?: string,
): Promise<void> {
  if (!checkpointer || !threadId) return;
  const blob = getRuntime().graphCheckpointExport(handle.id) as JsonValue;
  await checkpointer.put(threadId, blob);
}

async function executeNode(
  handle: GraphRunHandle,
  input: Record<string, unknown>,
  nodeId: string,
): Promise<{ output?: string; state?: Record<string, unknown> }> {
  const def = locals.get(handle.graph)?.nodes.get(nodeId);
  const ctx = ctxOf(handle, input);
  if (!def) {
    throw new AiError("NODE_MISSING", `graph node handler missing: ${nodeId}`, {
      graph: handle.graph,
    });
  }
  if (def.type === "task") {
    const res = await def.run(ctx);
    if (res == null) return {};
    if (typeof res === "string") return { output: res };
    return {
      ...(res.output !== undefined ? { output: res.output } : {}),
      ...(res.state !== undefined ? { state: res.state } : {}),
    };
  }
  if (def.type === "agent") {
    const ag = getAgent(def.agent);
    if (!ag) throw new AiError("AGENT_MISSING", `agent not found: ${def.agent}`);
    const prompt =
      def.prompt === undefined
        ? `Continue graph node ${nodeId}`
        : typeof def.prompt === "function"
          ? def.prompt(ctx)
          : def.prompt;
    const result = await ag.run(prompt);
    return { output: result.text };
  }
  return {};
}

async function driveWithEvents(
  handle: GraphRunHandle,
  input: Record<string, unknown>,
  checkpointer: Checkpointer | undefined,
  threadId: string | undefined,
  onEvent: (ev: AiEvent) => Awaitable<void>,
  initialAdvance?: RustAdvance,
): Promise<GraphRunHandle> {
  let pending: RustAdvance | undefined = initialAdvance;

  for (;;) {
    let advance: RustAdvance;
    if (pending) {
      advance = pending;
      pending = undefined;
    } else {
      const stepped = getRuntime().graphAdvance(handle.id) as {
        run: RustRun;
        advance: RustAdvance;
      };
      syncHandle(handle, stepped.run);
      advance = stepped.advance;
    }

    if (advance.type === "done") {
      await onEvent({
        type: "run_end",
        runId: handle.id,
        status: "completed",
        result: {
          outputs: handle.outputs,
          state: handle.state,
        } as JsonValue,
      });
      await persist(handle, checkpointer, threadId);
      getRuntime().graphDrop(handle.id);
      return handle;
    }
    if (advance.type === "failed") {
      await onEvent({
        type: "error",
        runId: handle.id,
        error: advance.error ?? "graph failed",
      });
      await onEvent({ type: "run_end", runId: handle.id, status: "failed" });
      await persist(handle, checkpointer, threadId);
      getRuntime().graphDrop(handle.id);
      throw new AiError("GRAPH_FAILED", advance.error ?? "graph failed", {
        runId: handle.id,
      });
    }
    if (advance.type === "wait_interrupt" && advance.node) {
      await onEvent({
        type: "interrupt",
        runId: handle.id,
        nodeId: advance.node.id,
        prompt: advance.node.prompt ?? "Approve?",
      });
      await onEvent({
        type: "run_end",
        runId: handle.id,
        status: "waitingInterrupt",
      });
      await persist(handle, checkpointer, threadId);
      return handle;
    }

    if (advance.type === "need_route" && advance.from && advance.edges) {
      const ctx = ctxOf(handle, input);
      const local = locals.get(handle.graph);
      let chosen: string | null = null;
      // Evaluate conditional edges first; unconditional is fallback only.
      for (const e of advance.edges) {
        if (!e.condition) continue;
        const pred = local?.conditions.get(e.condition);
        if (!pred) {
          throw new AiError(
            "GRAPH_ROUTE",
            `missing condition handler: ${e.condition}`,
            { runId: handle.id },
          );
        }
        if (pred(ctx)) {
          chosen = e.to;
          break;
        }
      }
      if (!chosen) {
        const fallback = advance.edges.find((e) => !e.condition);
        chosen = fallback?.to ?? null;
      }
      if (!chosen) {
        throw new AiError("GRAPH_ROUTE", `no edge matched from ${advance.from}`, {
          runId: handle.id,
        });
      }
      const routed = getRuntime().graphRoute(handle.id, chosen) as {
        run: RustRun;
        advance: RustAdvance;
      };
      syncHandle(handle, routed.run);
      pending = routed.advance;
      continue;
    }

    if (advance.type === "next" && advance.node) {
      const node = advance.node;
      await onEvent({
        type: "node_start",
        runId: handle.id,
        nodeId: node.id,
        nodeType: node.type,
      });
      try {
        const out = await executeNode(handle, input, node.id);
        const completed = getRuntime().graphCompleteNode(
          handle.id,
          node.id,
          out.output ?? null,
          out.state ?? null,
        ) as { run: RustRun; advance: RustAdvance };
        syncHandle(handle, completed.run);
        await onEvent({
          type: "node_end",
          runId: handle.id,
          nodeId: node.id,
          ...(out.output !== undefined ? { output: out.output } : {}),
        });
        await persist(handle, checkpointer, threadId);
        pending = completed.advance;
        continue;
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        getRuntime().graphFailNode(handle.id, message);
        await persist(handle, checkpointer, threadId);
        getRuntime().graphDrop(handle.id);
        await onEvent({ type: "error", runId: handle.id, error: message });
        await onEvent({ type: "run_end", runId: handle.id, status: "failed" });
        throw new AiError("GRAPH_FAILED", message, { runId: handle.id });
      }
    }

    throw new AiError("GRAPH_FAILED", `unexpected advance: ${advance.type}`, {
      runId: handle.id,
    });
  }
}

function createHandle(
  run: RustRun,
  input: Record<string, unknown>,
  checkpointer?: Checkpointer,
  threadId?: string,
): GraphRunHandle {
  const handle: GraphRunHandle = {
    id: run.id,
    graph: run.graph,
    status: run.status,
    state: (run.state as Record<string, unknown>) ?? { ...input },
    outputs: run.outputs ?? {},
    ...(threadId ? { threadId } : {}),
    async checkpoint() {
      const blob = getRuntime().graphCheckpointExport(handle.id) as JsonValue;
      if (checkpointer && threadId) await checkpointer.put(threadId, blob);
      return blob;
    },
    async drive() {
      return driveWithEvents(handle, input, checkpointer, threadId, async () => {});
    },
    async *stream() {
      yield {
        type: "run_start",
        runId: handle.id,
        kind: "graph",
        name: handle.graph,
      } satisfies AiEvent;

      const queue: AiEvent[] = [];
      let wake: (() => void) | null = null;
      let done = false;
      let failure: unknown = null;
      let result: GraphRunHandle | null = null;

      const kick = () => {
        wake?.();
        wake = null;
      };

      const running = driveWithEvents(handle, input, checkpointer, threadId, async (ev) => {
        queue.push(ev);
        kick();
      }).then(
        (h) => {
          result = h;
          done = true;
          kick();
        },
        (err) => {
          failure = err;
          done = true;
          kick();
        },
      );

      while (!done || queue.length) {
        while (queue.length) yield queue.shift()!;
        if (!done) {
          await new Promise<void>((r) => {
            wake = r;
          });
        }
      }
      await running;
      if (failure) throw failure;
      return result!;
    },
    async resume(decision = "approved") {
      if (handle.status !== "waitingInterrupt" && handle.status !== "waitingHuman") {
        throw new AiError(
          "GRAPH_RESUME_INVALID",
          `resume requires waitingInterrupt (got ${handle.status})`,
          { runId: handle.id },
        );
      }
      try {
        getRuntime().graphResumeInterrupt(handle.id);
        const stepped = getRuntime().graphCompleteInterrupt(handle.id, decision) as {
          run: RustRun;
          advance: RustAdvance;
        };
        syncHandle(handle, stepped.run);
        await persist(handle, checkpointer, threadId);
        return driveWithEvents(
          handle,
          input,
          checkpointer,
          threadId,
          async () => {},
          stepped.advance,
        );
      } catch (err) {
        const current = getRuntime().graphGet(handle.id) as RustRun | null;
        if (current) syncHandle(handle, current);
        throw err instanceof AiError
          ? err
          : new AiError(
              "GRAPH_FAILED",
              err instanceof Error ? err.message : String(err),
              { runId: handle.id },
            );
      }
    },
  };
  return handle;
}
