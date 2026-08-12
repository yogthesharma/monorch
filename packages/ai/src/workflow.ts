/**
 * Linear workflow sugar over `graph()`.
 * Prefer `graph()` for branching / cycles / checkpoints.
 */
import {
  graph,
  type GraphRunHandle,
  type CompiledGraph,
  type GraphContext,
} from "./graph.js";
import type { Checkpointer } from "./checkpointer.js";
import type { Awaitable } from "./types.js";

export type WorkflowContext = {
  input: Record<string, unknown>;
  outputs: Record<string, string>;
  state: Record<string, unknown>;
};

export type WorkflowBuilder = {
  step(
    id: string,
    run: (ctx: WorkflowContext) => Awaitable<string>,
  ): WorkflowBuilder;
  agentStep(
    id: string,
    agentName: string,
    prompt?: string | ((ctx: WorkflowContext) => string),
  ): WorkflowBuilder;
  human(id: string, opts?: { prompt?: string }): WorkflowBuilder;
  build(opts?: { checkpointer?: Checkpointer; maxSteps?: number }): Workflow;
};

/** Alias of GraphRunHandle — status uses `waitingInterrupt` (same as graphs). */
export type WorkflowRunHandle = GraphRunHandle;

export type Workflow = {
  name: string;
  start(
    input?: Record<string, unknown>,
    opts?: { threadId?: string },
  ): Promise<WorkflowRunHandle>;
  restore(threadId: string): Promise<WorkflowRunHandle>;
};

function toWfCtx(ctx: GraphContext): WorkflowContext {
  return { input: ctx.input, outputs: ctx.outputs, state: ctx.state };
}

/**
 * Linear workflow sugar over {@link graph}.
 * Prefer `graph()` for branching, cycles, interrupts, and checkpoints.
 * `workflow()` remains a supported public API (see docs/api SemVer policy).
 *
 * Status strings match graphs (`waitingInterrupt`). Older `waitingHuman` is only
 * accepted by `resume()` for backwards compatibility — it is never emitted.
 */
export function workflow(
  name: string,
  opts?: { maxRetries?: number; maxSteps?: number },
): WorkflowBuilder {
  void opts?.maxRetries; // retained for API compat; graph uses fail-fast + maxSteps
  const g = graph(name);
  let lastId: string | null = null;

  const link = (id: string) => {
    if (lastId) g.edge(lastId, id);
    lastId = id;
  };

  const builder: WorkflowBuilder = {
    step(id, run) {
      g.node(id, async (ctx) => run(toWfCtx(ctx)));
      link(id);
      return builder;
    },
    agentStep(id, agentName, prompt) {
      g.agentNode(
        id,
        agentName,
        prompt === undefined
          ? undefined
          : typeof prompt === "function"
            ? (ctx) => prompt(toWfCtx(ctx))
            : prompt,
      );
      link(id);
      return builder;
    },
    human(id, humanOpts) {
      g.interrupt(id, humanOpts);
      link(id);
      return builder;
    },
    build(buildOpts) {
      // Close the linear path once; avoid duplicate END edges on re-build.
      if (lastId) {
        g.edge(lastId, "__end__");
        lastId = null;
      }
      const compiled: CompiledGraph = g.compile({
        maxSteps: buildOpts?.maxSteps ?? opts?.maxSteps ?? 64,
        ...(buildOpts?.checkpointer
          ? { checkpointer: buildOpts.checkpointer }
          : {}),
      });

      return {
        name,
        start: (input, startOpts) => compiled.start(input, startOpts),
        restore: (threadId) => compiled.restore(threadId),
      };
    },
  };

  return builder;
}
