import Link from "next/link";
import { DocCode, DocH1, DocH2, DocLead, DocP } from "@/components/docs/doc-blocks";
import { DocFaq } from "@/components/docs/doc-faq";
import { docMetadata } from "@/lib/seo";
import { docPages, siteConfig } from "@/lib/site";

const page = docPages.find((p) => p.path === "/docs/recipes/hono")!;
export const metadata = docMetadata(page);

export default function HonoRecipePage() {
  return (
    <>
      <DocH1>HTTP with Hono</DocH1>
      <DocLead>
        Second BYO HTTP stack: agent SSE and interruptible graph resume on Hono, installing{" "}
        <code className="font-mono text-sm">@monorch/ai</code> from npm (not the monorepo
        workspace).
      </DocLead>

      <DocH2>1. Install (published package)</DocH2>
      <DocP>
        Clone the repo example or copy the pattern into your app. The example lives outside the
        pnpm workspace so it cannot accidentally link{" "}
        <code className="font-mono text-sm">packages/ai</code>.
      </DocP>
      <DocCode lang="bash" filename="terminal">{`cd examples/hono-npm
npm install          # pulls @monorch/ai@${siteConfig.version} from the registry
npm run smoke        # or: pnpm smoke:hono from the monorepo root`}</DocCode>

      <DocH2>2. Agent + SSE</DocH2>
      <DocCode lang="typescript" filename="stream.ts">{`import { Hono } from "hono";
import { streamSSE } from "hono/streaming";
import { agent, mock, tool } from "@monorch/ai";
import { z } from "zod";

const add = tool({
  name: "add",
  input: z.object({ a: z.number(), b: z.number() }),
  permission: { type: "roles", roles: ["agent"] },
  execute: ({ a, b }) => ({ sum: a + b }),
});

const app = new Hono();

app.post("/support/stream", async (c) => {
  const bot = agent({
    name: "support",
    model: mock([
      { toolCalls: [{ id: "c1", name: "add", arguments: { a: 2, b: 3 } }] },
      { text: "2 + 3 = 5" },
    ]),
    tools: [add],
  });
  return streamSSE(c, async (stream) => {
    for await (const ev of bot.stream("2+3")) {
      await stream.writeSSE({ data: JSON.stringify(ev) });
    }
  });
});`}</DocCode>

      <DocH2>3. Interrupt + resume</DocH2>
      <DocCode lang="typescript" filename="refund.ts">{`import { graph, memorySaver } from "@monorch/ai";

const refund = graph("refund")
  .node("lookup", async ({ input }) => \`order:\${input.orderId}\`)
  .interrupt("approve")
  .node("pay", async ({ outputs }) => \`refunded:\${outputs.lookup}\`)
  .compile({ checkpointer: memorySaver() });

app.post("/refund", async (c) => {
  const { orderId, threadId } = await c.req.json();
  const run = await refund.start({ orderId }, { threadId });
  return c.json({ status: run.status, threadId });
});

app.post("/refund/:threadId/resume", async (c) => {
  const run = await refund.restore(c.req.param("threadId"));
  const done = await run.resume("approved");
  return c.json({ status: done.status, outputs: done.outputs });
});`}</DocCode>

      <DocH2>Related</DocH2>
      <DocP>
        Fastify variant:{" "}
        <Link href="/docs/recipes/fastify" className="text-foreground underline-offset-4 hover:underline">
          HTTP with Fastify
        </Link>
        . HITL details:{" "}
        <Link
          href="/docs/recipes/hitl-refund"
          className="text-foreground underline-offset-4 hover:underline"
        >
          HITL refund
        </Link>
        . Failure codes:{" "}
        <Link
          href="/docs/reference/errors"
          className="text-foreground underline-offset-4 hover:underline"
        >
          Errors &amp; failure modes
        </Link>
        .
      </DocP>

      <DocFaq
        path="/docs/recipes/hono"
        items={[
          {
            q: "Why not put this in the pnpm workspace?",
            a: "Workspace linking would hide registry/native install bugs. Like examples/npm-smoke, this example must resolve @monorch/ai from npm.",
          },
          {
            q: "Does agentNode forward AbortSignal?",
            a: "No. Use a plain node() that calls getAgent().run(..., { signal }) if you need abort on graph agent steps.",
          },
        ]}
      />
    </>
  );
}
