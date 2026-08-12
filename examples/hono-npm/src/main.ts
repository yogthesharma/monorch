/**
 * Published-package Hono consumer example.
 * Depends on @monorch/ai from the npm registry (not workspace:*).
 *
 *   cd examples/hono-npm && npm install && npm run smoke
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { streamSSE } from "hono/streaming";
import {
  agent,
  getRuntime,
  graph,
  memorySaver,
  mock,
  tool,
} from "@monorch/ai";
import { z } from "zod";

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(msg);
}

function packageRootFromEntry(entryUrl: string): string {
  const entry = fileURLToPath(entryUrl);
  const dir = dirname(entry);
  try {
    readFileSync(join(dir, "package.json"), "utf8");
    return dir;
  } catch {
    return join(dir, "..");
  }
}

const add = tool({
  name: "hono_npm_add",
  description: "Add two numbers",
  input: z.object({ a: z.number(), b: z.number() }),
  permission: { type: "roles", roles: ["agent"] },
  execute: ({ a, b }) => ({ sum: a + b }),
});

function createMathAgent() {
  return agent({
    name: `hono-math-${Date.now()}`,
    model: mock([
      {
        toolCalls: [{ id: "c1", name: "hono_npm_add", arguments: { a: 2, b: 3 } }],
      },
      { text: "2 + 3 = 5" },
    ]),
    instructions: "Use tools for math.",
    tools: [add],
  });
}

const checkpointer = memorySaver();
const refund = graph("hono_npm_refund")
  .node("lookup", async ({ input }) => {
    const orderId = String(input["orderId"] ?? "unknown");
    return { output: `order:${orderId}`, state: { orderId } };
  })
  .interrupt("approve", { prompt: "Approve refund?" })
  .node("pay", async ({ outputs }) => `refunded:${outputs["lookup"] ?? ""}`)
  .compile({ checkpointer });

async function main() {
  const runtime = getRuntime();
  assert(typeof runtime.toolRegister === "function", "native runtime missing toolRegister");

  const aiEntry = import.meta.resolve("@monorch/ai");
  const runtimeEntry = import.meta.resolve("@monorch/runtime");
  const aiRoot = packageRootFromEntry(aiEntry);
  const runtimeRoot = packageRootFromEntry(runtimeEntry);
  assert(!aiRoot.includes("/packages/ai"), `expected npm install, got workspace path: ${aiRoot}`);
  assert(
    !runtimeRoot.includes("/bindings/node"),
    `expected npm @monorch/runtime, got: ${runtimeRoot}`,
  );
  const aiVersion = JSON.parse(readFileSync(join(aiRoot, "package.json"), "utf8")).version as string;
  assert(aiVersion === "0.1.3", `expected @monorch/ai@0.1.3, got ${aiVersion} from ${aiRoot}`);

  const app = new Hono();

  app.get("/health", (c) =>
    c.json({
      ok: true,
      source: "npm",
      framework: "hono",
      version: aiVersion,
      ai: aiRoot,
      runtime: runtimeRoot,
    }),
  );

  app.post("/support", async (c) => {
    const body = (await c.req.json().catch(() => ({}))) as { message?: string };
    const result = await createMathAgent().run(body.message ?? "What is 2+3?");
    return c.json({ text: result.text, runId: result.runId });
  });

  app.post("/support/stream", async (c) => {
    const body = (await c.req.json().catch(() => ({}))) as { message?: string };
    return streamSSE(c, async (stream) => {
      for await (const ev of createMathAgent().stream(body.message ?? "2+3")) {
        await stream.writeSSE({ data: JSON.stringify(ev) });
      }
    });
  });

  app.post("/refund", async (c) => {
    const body = (await c.req.json().catch(() => ({}))) as {
      orderId?: string;
      threadId?: string;
    };
    const threadId = body.threadId ?? `hono-refund-${Date.now()}`;
    const run = await refund.start({ orderId: body.orderId ?? "ord_1" }, { threadId });
    return c.json({ id: run.id, threadId, status: run.status, outputs: run.outputs });
  });

  app.post("/refund/:threadId/resume", async (c) => {
    const threadId = c.req.param("threadId");
    const body = (await c.req.json().catch(() => ({}))) as { decision?: string };
    const restored = await refund.restore(threadId);
    const resumed = await restored.resume(body.decision ?? "approved");
    return c.json({ id: resumed.id, status: resumed.status, outputs: resumed.outputs });
  });

  const port = Number(process.env.PORT ?? 3200);
  const server = serve({ fetch: app.fetch, port, hostname: "127.0.0.1" });

  if (process.env.SMOKE === "1") {
    await runSmoke(port);
    server.close();
    process.exit(0);
  }

  console.log(`hono-npm listening on http://127.0.0.1:${port}`);
}

async function runSmoke(port: number) {
  const base = `http://127.0.0.1:${port}`;

  const health = await fetch(`${base}/health`).then((r) => r.json());
  assert(
    health.ok === true && health.source === "npm" && health.framework === "hono",
    `health failed: ${JSON.stringify(health)}`,
  );
  console.log("hono-npm /health", health);

  const streamText = await fetch(`${base}/support/stream`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ message: "2+3" }),
  }).then((r) => r.text());
  assert(
    streamText.includes("run_start") && streamText.includes("run_end"),
    `stream failed: ${streamText}`,
  );
  console.log("hono-npm /support/stream", { bytes: streamText.length });

  const threadId = "hono-npm-refund";
  const started = await fetch(`${base}/refund`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ orderId: "ord_9", threadId }),
  }).then(async (r) => ({ status: r.status, body: await r.json() }));
  assert(
    started.status === 200 && started.body?.status === "waitingInterrupt",
    `refund start failed: ${JSON.stringify(started)}`,
  );

  const resumed = await fetch(`${base}/refund/${threadId}/resume`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ decision: "approved" }),
  }).then(async (r) => ({ status: r.status, body: await r.json() }));
  assert(
    resumed.status === 200 &&
      resumed.body?.status === "completed" &&
      resumed.body?.outputs?.pay === "refunded:order:ord_9",
    `refund resume failed: ${JSON.stringify(resumed)}`,
  );
  console.log("hono-npm refund HITL", { started: started.body, resumed: resumed.body });
  console.log("hono-npm OK (published @monorch/ai + Hono)");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
