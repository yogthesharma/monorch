/**
 * Published-package consumer example.
 * Depends on @monorch/ai from the npm registry (not workspace:*).
 *
 *   cd examples/npm-smoke && npm install && npm run smoke
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import Fastify from "fastify";
import {
  agent,
  createOtelListener,
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
    // e.g. .../ai/dist/index.js → .../ai
    return join(dir, "..");
  }
}

const add = tool({
  name: "npm_smoke_add",
  description: "Add two numbers",
  input: z.object({ a: z.number(), b: z.number() }),
  permission: { type: "roles", roles: ["agent"] },
  execute: ({ a, b }) => ({ sum: a + b }),
});

const otelEvents: string[] = [];
const otel = createOtelListener({
  onEvent: (ev) => otelEvents.push(ev.type),
});

function createMathAgent() {
  return agent({
    name: `npm-math-${Date.now()}`,
    model: mock([
      {
        toolCalls: [{ id: "c1", name: "npm_smoke_add", arguments: { a: 2, b: 3 } }],
      },
      { text: "2 + 3 = 5" },
    ]),
    instructions: "Use tools for math.",
    tools: [add],
    onEvent: otel,
  });
}

const billing = agent({
  name: "npm-billing",
  model: mock([{ text: "Refund initiated for your order." }]),
  instructions: "You handle billing and refunds.",
  onEvent: otel,
});

function createTriageAgent() {
  return agent({
    name: `npm-triage-${Date.now()}`,
    model: mock([
      {
        toolCalls: [
          {
            id: "h1",
            name: "handoff_to_npm-billing",
            arguments: { message: "Customer wants a refund" },
          },
        ],
      },
    ]),
    instructions: "Route billing issues to billing.",
    handoffs: [billing],
    onEvent: otel,
  });
}

const checkpointer = memorySaver();
const refund = graph("npm_refund")
  .node("lookup", async ({ input }) => {
    const orderId = String(input["orderId"] ?? "unknown");
    return { output: `order:${orderId}`, state: { orderId } };
  })
  .interrupt("approve", { prompt: "Approve refund?" })
  .node("pay", async ({ outputs }) => `refunded:${outputs["lookup"] ?? ""}`)
  .compile({ checkpointer });

async function main() {
  // Prove the published native addon actually loaded.
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
  assert(aiVersion === "0.1.2", `expected @monorch/ai@0.1.2, got ${aiVersion} from ${aiRoot}`);

  const app = Fastify({ logger: true });

  app.get("/health", async () => ({
    ok: true,
    source: "npm",
    version: aiVersion,
    ai: aiRoot,
    runtime: runtimeRoot,
  }));

  app.post<{ Body: { message?: string } }>("/support", async (req) => {
    const result = await createMathAgent().run(req.body?.message ?? "What is 2+3?");
    return { text: result.text, runId: result.runId };
  });

  app.post<{ Body: { message?: string } }>("/support/stream", async (req, reply) => {
    reply.hijack();
    reply.raw.writeHead(200, {
      "content-type": "text/event-stream",
      "cache-control": "no-cache",
      connection: "keep-alive",
    });
    for await (const ev of createMathAgent().stream(req.body?.message ?? "2+3")) {
      reply.raw.write(`data: ${JSON.stringify(ev)}\n\n`);
    }
    reply.raw.end();
  });

  app.post<{ Body: { message?: string } }>("/handoff", async (req) => {
    const result = await createTriageAgent().run(req.body?.message ?? "I need a refund");
    return { text: result.text, runId: result.runId, events: result.events.map((e) => e.type) };
  });

  app.post<{ Body: { orderId?: string; threadId?: string } }>("/refund", async (req) => {
    const threadId = req.body?.threadId ?? `npm-refund-${Date.now()}`;
    const run = await refund.start({ orderId: req.body?.orderId ?? "ord_1" }, { threadId });
    return { id: run.id, threadId, status: run.status, outputs: run.outputs };
  });

  app.post<{ Params: { threadId: string }; Body: { decision?: string } }>(
    "/refund/:threadId/resume",
    async (req, reply) => {
      const restored = await refund.restore(req.params.threadId);
      if (!restored) return reply.code(404).send({ error: "unknown thread" });
      const resumed = await restored.resume(req.body?.decision ?? "approved");
      return { id: resumed.id, status: resumed.status, outputs: resumed.outputs };
    },
  );

  const port = Number(process.env.PORT ?? 3100);
  await app.listen({ port, host: "127.0.0.1" });

  if (process.env.SMOKE === "1") {
    await runSmoke(port, app);
  }
}

async function runSmoke(port: number, app: { log: { info: Function }; close: () => Promise<void> }) {
  const base = `http://127.0.0.1:${port}`;

  const health = await fetch(`${base}/health`).then((r) => r.json());
  assert(health.ok === true && health.source === "npm", `health failed: ${JSON.stringify(health)}`);
  app.log.info({ health }, "npm-smoke /health");

  const support = await fetch(`${base}/support`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ message: "2+3" }),
  }).then(async (r) => ({ status: r.status, body: await r.json() }));
  assert(
    support.status === 200 && support.body?.text === "2 + 3 = 5",
    `support failed: ${JSON.stringify(support)}`,
  );
  app.log.info({ support }, "npm-smoke /support");

  const streamText = await fetch(`${base}/support/stream`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ message: "2+3" }),
  }).then((r) => r.text());
  assert(
    streamText.includes("run_start") && streamText.includes("run_end"),
    `stream failed: ${streamText}`,
  );
  app.log.info({ bytes: streamText.length }, "npm-smoke /support/stream");

  const handoff = await fetch(`${base}/handoff`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ message: "I need a refund" }),
  }).then(async (r) => ({ status: r.status, body: await r.json() }));
  assert(
    handoff.status === 200 &&
      handoff.body?.text === "Refund initiated for your order." &&
      handoff.body?.events?.includes("handoff"),
    `handoff failed: ${JSON.stringify(handoff)}`,
  );
  app.log.info({ handoff }, "npm-smoke /handoff");

  const threadId = "npm-smoke-refund";
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
  app.log.info({ started, resumed, otelSample: otelEvents.slice(0, 10) }, "npm-smoke refund HITL");

  app.log.info("npm-smoke OK (published @monorch/ai)");
  await app.close();
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
