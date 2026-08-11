import { docPages } from "@/lib/site";
import { docMetadata } from "@/lib/seo";
import { DocCode, DocH1, DocH2, DocLead, DocP } from "@/components/docs/doc-blocks";
import { DocFaq } from "@/components/docs/doc-faq";

const page = docPages.find((p) => p.path === "/docs/memory")!;
export const metadata = docMetadata(page);

export default function MemoryPage() {
  return (
    <>
      <DocH1>Memory</DocH1>
      <DocLead>
        Two thin interfaces: key/value <code className="font-mono text-sm">MemoryStore</code> and
        conversation <code className="font-mono text-sm">ThreadMemory</code>. Distinct from graph
        checkpoints.
      </DocLead>

      <DocH2>Key/value store</DocH2>
      <DocP>
        <code className="font-mono text-sm">MemoryStore</code> is a BYO interface. Agents and graphs
        do <strong>not</strong> auto-read it — call{" "}
        <code className="font-mono text-sm">put</code> /{" "}
        <code className="font-mono text-sm">get</code> from tool{" "}
        <code className="font-mono text-sm">execute</code> or graph node handlers. Prefer{" "}
        <code className="font-mono text-sm">ThreadMemory</code> for chat history.
      </DocP>
      <DocCode lang="typescript" filename="memory.ts">{`import { inMemoryStore } from "@monorch/ai";

const memory = inMemoryStore();
await memory.put(["orders"], "ord_9", { lookedUp: true });
const row = await memory.get(["orders"], "ord_9");
await memory.delete?.(["orders"], "ord_9");
const keys = await memory.list?.(["orders"]);`}</DocCode>

      <DocH2>Thread messages with agents</DocH2>
      <DocP>
        Pass <code className="font-mono text-sm">threadId</code> +{" "}
        <code className="font-mono text-sm">memory</code> on each{" "}
        <code className="font-mono text-sm">run</code> /{" "}
        <code className="font-mono text-sm">stream</code>. Monorch loads prior turns into the Rust
        message list and appends the new user/assistant turns when the run succeeds.
      </DocP>
      <DocCode lang="typescript" filename="threads.ts">{`import { agent, inMemoryThreads, mock } from "@monorch/ai";

const threads = inMemoryThreads();
const bot = agent({
  name: "mem",
  model: mock([{ text: "first" }, { text: "second" }]),
  instructions: "Remember prior turns.",
});

await bot.run("hello", { threadId: "t-mem", memory: threads });
await bot.run("again", { threadId: "t-mem", memory: threads });
const hist = await threads.get("t-mem");
// user, assistant("first"), user, assistant("second")`}</DocCode>

      <DocH2>With graphs</DocH2>
      <DocP>
        Call <code className="font-mono text-sm">MemoryStore</code> from node execute for app facts.
        Checkpoints still own interrupt resume. ThreadMemory is for agent chat transcripts.
      </DocP>
      <DocCode lang="typescript" filename="graph-memory.ts">{`.node("lookup", async ({ input }) => {
  await memory.put(["orders"], String(input.orderId), { lookedUp: true });
  return { output: \`order:\${input.orderId}\`, state: { orderId: input.orderId } };
})`}</DocCode>

      <DocH2>Postgres adapters</DocH2>
      <DocP>
        Durable <code className="font-mono text-sm">ThreadMemory</code> and{" "}
        <code className="font-mono text-sm">MemoryStore</code> over the same schema helper as
        checkpoints.
      </DocP>
      <DocCode lang="typescript" filename="postgres-memory.ts">{`import {
  ensureMonorchSchema,
  postgresStore,
  postgresThreads,
} from "@monorch/ai/postgres";

await ensureMonorchSchema(pool);
const threads = postgresThreads(pool);
const store = postgresStore(pool);

await bot.run("hello", { threadId: "t1", memory: threads });
await store.put(["orders"], "ord_9", { lookedUp: true });`}</DocCode>

      <DocFaq
        path="/docs/memory"
        items={[
          {
            q: "Is inMemoryStore / inMemoryThreads production ready?",
            a: "No. They are process-local. Use postgresStore / postgresThreads (or implement the interfaces on Redis) for multi-instance apps.",
          },
          {
            q: "Checkpoint vs memory vs threads?",
            a: "Checkpoint = graph cursor resume. MemoryStore = namespaced KV you call yourself. ThreadMemory = message lists per thread id for agents.",
          },
          {
            q: "Does MemoryStore plug into agent.run automatically?",
            a: "No. Only ThreadMemory loads/appends when you pass threadId + memory. MemoryStore is for your node/tool code.",
          },
          {
            q: "Does the agent automatically load ThreadMemory?",
            plain: "Yes when you pass both threadId and memory into agent.run or agent.stream.",
            a: (
              <>
                Yes when you pass both <code className="font-mono text-sm">threadId</code> and{" "}
                <code className="font-mono text-sm">memory</code> in run/stream options.
              </>
            ),
          },
          {
            q: "What if I only pass threadId?",
            a: "Nothing is loaded or appended. Both fields are required together.",
          },
          {
            q: "Can namespaces nest?",
            a: 'Yes. Namespaces are string arrays, e.g. ["tenant", "orders"].',
          },
          {
            q: "Do I need a real Postgres for local smoke?",
            a: "No. Adapters take any SqlQueryable. The Fastify smoke uses an in-memory SQL stand-in; point a pg.Pool at DATABASE_URL in production.",
          },
        ]}
      />
    </>
  );
}
