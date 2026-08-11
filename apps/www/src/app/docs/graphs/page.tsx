import { docPages } from "@/lib/site";
import { docMetadata } from "@/lib/seo";
import { DocCode, DocH1, DocH2, DocLead, DocP } from "@/components/docs/doc-blocks";
import { DocFaq } from "@/components/docs/doc-faq";

const page = docPages.find((p) => p.path === "/docs/graphs")!;
export const metadata = docMetadata(page);

export default function GraphsPage() {
  return (
    <>
      <DocH1>Graphs</DocH1>
      <DocLead>
        Primary orchestration API. Nodes, conditional edges, interrupts, cycle limits, and
        checkpoints. State advances in Rust. Node execute and edge predicates run in TypeScript.
      </DocLead>

      <DocH2>Linear graph</DocH2>
      <DocP>
        If you omit <code className="font-mono text-sm">edge()</code>, Monorch wires nodes in
        declaration order to <code className="font-mono text-sm">GRAPH_END</code>.
      </DocP>
      <DocCode lang="typescript" filename="refund-graph.ts">{`import { graph, memorySaver } from "@monorch/ai";

const refund = graph("refund")
  .node("lookup", async ({ input }) => ({
    output: \`order:\${input.orderId}\`,
    state: { orderId: input.orderId },
  }))
  .interrupt("approve", { prompt: "Approve refund?" })
  .node("pay", async ({ outputs }) => \`refunded:\${outputs.lookup}\`)
  .compile({ checkpointer: memorySaver(), maxSteps: 32 });

const run = await refund.start({ orderId: "ord_9" }, { threadId: "customer-42" });
if (run.status === "waitingInterrupt") {
  await run.resume("approved");
}`}</DocCode>

      <DocH2>Branching and cycles</DocH2>
      <DocCode lang="typescript" filename="support-graph.ts">{`import { GRAPH_END, graph } from "@monorch/ai";

const supportGraph = graph("support_graph")
  .node("classify", async ({ input, state }) => {
    const text = String(input.text ?? state.text ?? "");
    const intent = text.includes("refund") ? "refund" : "faq";
    return { output: intent, state: { intent, text, hops: Number(state.hops ?? 0) } };
  })
  .node("refund_path", async ({ state }) => \`refund:\${state.text}\`)
  .node("faq", async ({ state }) => {
    const hops = Number(state.hops ?? 0) + 1;
    return {
      output: \`faq:\${state.text}\`,
      state: { hops, needsRetry: hops < 2 },
    };
  })
  .edge("classify", "refund_path", (ctx) => ctx.state.intent === "refund")
  .edge("classify", "faq", (ctx) => ctx.state.intent !== "refund")
  .edge("faq", "classify", (ctx) => ctx.state.needsRetry === true)
  .edge("faq", GRAPH_END, (ctx) => ctx.state.needsRetry !== true)
  .edge("refund_path", GRAPH_END)
  .compile({ maxSteps: 16 });`}</DocCode>

      <DocH2>Node kinds</DocH2>
      <DocP>
        <code className="font-mono text-sm">node</code> for tasks,{" "}
        <code className="font-mono text-sm">agentNode</code> to call a registered agent,{" "}
        <code className="font-mono text-sm">interrupt</code> for human or external gates. Node
        functions may return a string, void, or{" "}
        <code className="font-mono text-sm">{`{ output, state }`}</code>.
      </DocP>
      <DocCode lang="typescript" filename="agent-node.ts">{`import { agent, graph } from "@monorch/ai";

agent({ name: "writer", model, instructions: "Draft a short reply." });

const draft = graph("draft")
  .node("prep", async ({ input }) => ({ state: { topic: input.topic } }))
  .agentNode("write", "writer", (ctx) => \`Write about \${ctx.state.topic}\`)
  .compile();

const run = await draft.start({ topic: "refunds" });
// write output is the agent text`}</DocCode>

      <DocH2>Compile options</DocH2>
      <DocP>
        <code className="font-mono text-sm">checkpointer</code>,{" "}
        <code className="font-mono text-sm">maxSteps</code> (default 64),{" "}
        <code className="font-mono text-sm">replace</code> to hot-reload a definition. In-flight runs
        with an old def hash fail after replace.
      </DocP>
      <DocCode lang="typescript" filename="hot-reload.ts">{`const v1 = graph("hot")
  .node("prep", async () => "v1")
  .interrupt("hold")
  .compile({ replace: true });

const run = await v1.start({ n: 1 }); // waitingInterrupt

graph("hot")
  .node("prep", async () => "v2")
  .interrupt("hold", { prompt: "changed?" })
  .compile({ replace: true });

await run.resume("approved"); // throws — defHash no longer matches`}</DocCode>

      <DocH2>Run handle</DocH2>
      <DocP>
        <code className="font-mono text-sm">drive()</code> advances until done, interrupt, or
        failure. Calling <code className="font-mono text-sm">drive()</code> again while{" "}
        <code className="font-mono text-sm">waitingInterrupt</code> is idempotent: it re-emits wait
        instead of failing. Use <code className="font-mono text-sm">resume(decision)</code> to
        continue.
      </DocP>
      <DocCode lang="typescript" filename="handle.ts">{`// status: pending | running | waitingInterrupt | needsRoute | completed | failed
run.drive();
run.resume(decision?);
run.stream();      // AiEvent async generator
run.checkpoint();  // blob for checkpointer.put
refund.restore(threadId);`}</DocCode>

      <DocFaq
        path="/docs/graphs"
        items={[
          {
            q: "When do I need explicit edge() calls?",
            a: "Whenever you branch, cycle, or skip nodes. Linear pipelines can rely on auto-wiring.",
          },
          {
            q: "What is waitingInterrupt vs needsRoute?",
            a: "waitingInterrupt means an interrupt node is waiting for resume(decision). needsRoute means Rust returned multiple edges and TypeScript must pick via predicates.",
          },
          {
            q: "What does compile({ replace: true }) do?",
            a: "It swaps the registered graph definition for that name. Existing runs keep their old defHash and fail if you try to advance them after the swap. Omit replace to reject duplicate names.",
          },
          {
            q: "Can node state merge across steps?",
            a: "Yes. Returned state is merged into the run state that later nodes see through GraphContext.",
          },
          {
            q: "How do I stream graph progress?",
            plain:
              "Use for await (const ev of run.stream()). You get node_start, node_end, interrupt, run_end, and errors.",
            a: (
              <>
                Use <code className="font-mono text-sm">for await (const ev of run.stream())</code>.
                You get node_start, node_end, interrupt, run_end, and errors.
              </>
            ),
          },
          {
            q: "Can I call drive() after restore while waiting?",
            a: "Yes. drive() on waitingInterrupt re-emits the wait and returns the same status. Smoke covers restore → drive → resume.",
          },
          {
            q: "How does agentNode find the agent?",
            a: "By name via getAgent. Create the agent before compile/start so the registry has that name.",
          },
          {
            q: "Is workflow() still supported?",
            a: "Yes as sugar. Prefer graph() for anything non-linear.",
          },
        ]}
      />
    </>
  );
}
