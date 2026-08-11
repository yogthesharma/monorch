import { docPages } from "@/lib/site";
import { docMetadata } from "@/lib/seo";
import { DocCode, DocH1, DocH2, DocLead, DocNext, DocP } from "@/components/docs/doc-blocks";
import { DocFaq } from "@/components/docs/doc-faq";

const page = docPages.find((p) => p.path === "/docs/getting-started")!;
export const metadata = docMetadata(page);

export default function GettingStartedPage() {
  return (
    <>
      <DocH1>Getting started</DocH1>
      <DocLead>
        Build the native runtime, run the Fastify smoke, then copy the smallest agent and graph
        patterns into your app.
      </DocLead>

      <DocH2>Install and build</DocH2>
      <DocP>
        From the monorepo root. Native bindings compile with N-API; TypeScript builds into{" "}
        <code className="font-mono text-sm">packages/ai/dist</code>.
      </DocP>
      <DocCode lang="bash" filename="terminal">{`pnpm install
pnpm build          # @monorch/runtime + @monorch/ai
pnpm smoke          # Fastify agent + graph + MCP + stream
pnpm ci             # engine tests + build + typecheck + smoke
pnpm dev:www        # docs site on :3100`}</DocCode>

      <DocH2>Minimal agent</DocH2>
      <DocP>
        Register a tool, create an agent, call <code className="font-mono text-sm">run</code> or{" "}
        <code className="font-mono text-sm">stream</code>. Tool args are authorized and parsed in
        Rust before your execute callback runs.
      </DocP>
      <DocCode lang="typescript" filename="math-agent.ts">{`import { agent, tool, mock } from "@monorch/ai";
import { z } from "zod";

const add = tool({
  name: "add",
  description: "Add two numbers",
  input: z.object({ a: z.number(), b: z.number() }),
  permission: { type: "roles", roles: ["agent"] },
  execute: ({ a, b }) => ({ sum: a + b }),
});

const math = agent({
  name: "math",
  model: mock([
    { toolCalls: [{ id: "c1", name: "add", arguments: { a: 2, b: 3 } }] },
    { text: "2 + 3 = 5" },
  ]),
  tools: [add],
  instructions: "Use tools for math.",
});

const result = await math.run("What is 2+3?");
// { text, runId, events }`}</DocCode>

      <DocH2>Interruptible graph</DocH2>
      <DocP>
        Prefer <code className="font-mono text-sm">graph()</code> for orchestration. Pass a{" "}
        <code className="font-mono text-sm">threadId</code> when you need to restore after an
        interrupt.
      </DocP>
      <DocCode lang="typescript" filename="refund.ts">{`import { graph, memorySaver } from "@monorch/ai";

const refund = graph("refund")
  .node("lookup", async ({ input }) => ({
    output: \`order:\${input.orderId}\`,
    state: { orderId: input.orderId },
  }))
  .interrupt("approve", { prompt: "Approve refund?" })
  .node("pay", async ({ outputs }) => \`refunded:\${outputs.lookup}\`)
  .compile({ checkpointer: memorySaver() });

let run = await refund.start({ orderId: "ord_9" }, { threadId: "t1" });
if (run.status === "waitingInterrupt") {
  run = await run.resume("approved");
  // or later: await refund.restore("t1") then resume
}`}</DocCode>

      <DocH2>Reference example</DocH2>
      <DocP>
        <code className="font-mono text-sm">examples/fastify</code> covers agent run, SSE stream,
        handoffs, MCP tools, OTel listener, branching/cycles, checkpoint v2 restore, idempotent{" "}
        <code className="font-mono text-sm">drive()</code> while waiting, thread memory, abort, graph{" "}
        <code className="font-mono text-sm">replace</code>, Postgres adapters (in-memory SQL
        stand-in), and optional <code className="font-mono text-sm">LIVE_SMOKE=1</code>.
      </DocP>

      <DocFaq
        path="/docs/getting-started"
        items={[
          {
            q: "pnpm build fails on the native package. What now?",
            a: "You need a working Rust toolchain (rustc/cargo) and a Node version >= 20. Re-run pnpm build:native from the repo root and read the napi error first.",
          },
          {
            q: "Can I use this outside the monorepo?",
            a: "Yes once you publish or path-link @monorch/ai and @monorch/runtime. Today the intended path is workspace packages from this repo.",
          },
          {
            q: "Why does smoke use mock instead of OpenAI?",
            a: "Deterministic CI. Swap mock for openai(\"model\", { baseUrl }) when you have keys. Same agent API.",
          },
          {
            q: "Should I start with workflow() or graph()?",
            a: "Use graph(). workflow() is linear sugar for simple step chains and maps human() to interrupt.",
          },
        ]}
      />

      <DocNext href="/docs/architecture" label="Architecture" />
    </>
  );
}
