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

/** @deprecated Use GraphRunHandle — status waitingHuman maps to waitingInterrupt */
export type WorkflowRunHandle = GraphRunHandle & {
  /** Alias for graph waitingInterrupt */
  resume(decision?: string): Promise<WorkflowRunHandle>;
};

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

/** Define a linear workflow (compiles to a path graph). */
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

      const wrap = (h: GraphRunHandle): WorkflowRunHandle => {
        const handle = h as WorkflowRunHandle;
        // Map waitingInterrupt → waitingHuman for existing callers
        if (handle.status === "waitingInterrupt") {
          (handle as { status: string }).status = "waitingHuman";
        }
        const origResume = handle.resume.bind(handle);
        handle.resume = async (decision?: string) => {
          // graph.resume accepts waitingHuman; keep alias for callers
          if (handle.status === "waitingHuman") {
            (handle as { status: string }).status = "waitingInterrupt";
          }
          const next = await origResume(decision);
          return wrap(next);
        };
        return handle;
      };

      return {
        name,
        async start(input, startOpts) {
          const run = await compiled.start(input, startOpts);
          return wrap(run);
        },
        async restore(threadId) {
          return wrap(await compiled.restore(threadId));
        },
      };
    },
  };

  return builder;
}
