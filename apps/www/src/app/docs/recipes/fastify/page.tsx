import { docPages, installSnippet, siteConfig } from "@/lib/site";
import { docMetadata } from "@/lib/seo";
import { DocCode, DocH1, DocH2, DocLead, DocP } from "@/components/docs/doc-blocks";
import { DocFaq } from "@/components/docs/doc-faq";

const page = docPages.find((p) => p.path === "/docs/recipes/fastify")!;
export const metadata = docMetadata(page);

export default function FastifyRecipePage() {
  return (
    <>
      <DocH1>HTTP with Fastify</DocH1>
      <DocLead>
        One concrete BYO HTTP recipe: agent SSE, interruptible graph, and durable Postgres adapters.
        Fastify is the sample server — the same patterns drop into Hono, Nest, or plain Node.
      </DocLead>

      <DocH2>1. Install</DocH2>
      <DocP>
        Install from{" "}
        <a href={siteConfig.npm} className="underline-offset-4 hover:underline">
          npm
        </a>{" "}
        (<code className="font-mono text-sm">@monorch/ai@{siteConfig.version}</code>). Native
        binaries for <code className="font-mono text-sm">@monorch/runtime</code> ship as optional
        platform packages — see{" "}
        <a href="/platforms" className="underline-offset-4 hover:underline">
          platforms
        </a>
        .
      </DocP>
      <DocCode lang="bash" filename="terminal">
        {installSnippet()}
      </DocCode>

      <DocH2>2. Agent + SSE</DocH2>
      <DocCode lang="typescript" filename="support.ts">{`import Fastify from "fastify";
import { agent, tool } from "@monorch/ai";
import { openai, mock } from "@monorch/ai/openai";
import { z } from "zod";

const add = tool({
  name: "add",
  input: z.object({ a: z.number(), b: z.number() }),
  permission: { type: "roles", roles: ["agent"] },
  execute: ({ a, b }) => ({ sum: a + b }),
});

const bot = agent({
  name: "math",
  model: process.env.OPENAI_API_KEY
    ? openai("gpt-4.1-mini")
    : mock([
        { toolCalls: [{ id: "1", name: "add", arguments: { a: 2, b: 3 } }] },
        { text: "2 + 3 = 5" },
      ]),
  tools: [add],
  instructions: "Use tools for math.",
});

const app = Fastify();

app.post("/support/stream", async (req, reply) => {
  const message = (req.body as { message?: string })?.message ?? "2+3";
  reply.hijack();
  reply.raw.writeHead(200, {
    "content-type": "text/event-stream",
    "cache-control": "no-cache",
    connection: "keep-alive",
  });
  for await (const ev of bot.stream(message)) {
    reply.raw.write(\`data: \${JSON.stringify(ev)}\\n\\n\`);
  }
  reply.raw.end();
});`}</DocCode>

      <DocH2>3. Interrupt + resume</DocH2>
      <DocCode lang="typescript" filename="refund.ts">{`import { graph, memorySaver } from "@monorch/ai";

const checkpointer = memorySaver();

const refund = graph("refund")
  .node("lookup", async ({ input }) => ({
    output: \`order:\${input.orderId}\`,
    state: { orderId: input.orderId },
  }))
  .interrupt("approve", { prompt: "Approve refund?" })
  .node("pay", async ({ outputs }) => \`refunded:\${outputs.lookup}\`)
  .compile({ checkpointer });

app.post("/refund", async (req) => {
  const body = req.body as { orderId?: string; threadId?: string };
  const threadId = body.threadId ?? \`refund-\${Date.now()}\`;
  const run = await refund.start(
    { orderId: body.orderId ?? "ord_1" },
    { threadId },
  );
  return { id: run.id, threadId, status: run.status };
});

app.post("/refund/:threadId/resume", async (req) => {
  const run = await refund.restore((req.params as { threadId: string }).threadId);
  const resumed = await run.resume("approved");
  return { id: resumed.id, status: resumed.status, outputs: resumed.outputs };
});`}</DocCode>

      <DocH2>4. Postgres (optional)</DocH2>
      <DocP>
        Swap in-memory helpers for durable adapters.{" "}
        <code className="font-mono text-sm">pg</code> is an optional peer.
      </DocP>
      <DocCode lang="typescript" filename="postgres.ts">{`import pg from "pg";
import {
  ensureMonorchSchema,
  postgresCheckpointer,
  postgresThreads,
} from "@monorch/ai/postgres";

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
await ensureMonorchSchema(pool);

const checkpointer = postgresCheckpointer(pool);
const threads = postgresThreads(pool);

// graph compile({ checkpointer })
// agent.run(msg, { threadId: "t1", memory: threads })`}</DocCode>

      <DocH2>5. Smoke</DocH2>
      <DocCode lang="bash" filename="terminal">{`pnpm smoke
# optional live provider:
# LIVE_SMOKE=1 OPENAI_API_KEY=... pnpm smoke:live`}</DocCode>
      <DocP>
        The repo smoke at <code className="font-mono text-sm">examples/fastify</code> covers
        handoffs, MCP, OTel, branching, abort, hot-reload, and Postgres stand-ins — Fastify is only
        the sample host.
      </DocP>

      <DocFaq
        path="/docs/recipes/fastify"
        items={[
          {
            q: "Do I need Fastify specifically?",
            a: "No. Same agent.stream / graph.start patterns work in Hono, Nest, or plain Node. See also the Hono recipe (examples/hono-npm) for a second published-npm host.",
          },
          {
            q: "Why mock instead of OpenAI first?",
            a: "Deterministic local smoke. Swap mock for openai() when you have a key or LiteLLM baseUrl.",
          },
          {
            q: "Where next?",
            a: "Getting started, then Agents and Graphs. Compare if you are choosing vs Mastra or LangGraph.",
          },
        ]}
      />
    </>
  );
}
