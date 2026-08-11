/**
 * BYO-backend example — Fastify owns HTTP; @monorch/ai owns agents/tools/graphs.
 */
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import Fastify from "fastify";
import {
  GRAPH_END,
  agent,
  callTool,
  createOtelListener,
  graph,
  inMemoryStore,
  inMemoryThreads,
  mcpHttp,
  mcpStdio,
  mcpTools,
  memorySaver,
  mock,
  mockMcp,
  tool,
  type GraphRunHandle,
} from "@monorch/ai";
import {
  ensureMonorchSchema,
  postgresCheckpointer,
  postgresStore,
  postgresThreads,
} from "@monorch/ai/postgres";
import { z } from "zod";
import { createMemorySql } from "./memory-sql.js";
import { startHttpMcpServer } from "./mcp-http-server.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);

const add = tool({
  name: "add",
  description: "Add two numbers",
  input: z.object({
    a: z.number(),
    b: z.number(),
  }),
  permission: { type: "roles", roles: ["agent"] },
  execute: ({ a, b }) => ({ sum: a + b }),
});

// MCP → local tools
const mcp = mockMcp([
  {
    name: "lookup_order",
    description: "Look up an order",
    execute: (args) => {
      const id =
        args && typeof args === "object" && "orderId" in args
          ? String((args as { orderId: unknown }).orderId)
          : "unknown";
      return { orderId: id, status: "paid" };
    },
  },
]);
const mcpToolDefs = await mcpTools(mcp, { prefix: "mcp_" });

const otelEvents: string[] = [];
const otel = createOtelListener({
  onEvent: (ev) => otelEvents.push(ev.type),
});

const memory = inMemoryStore();

let agentSeq = 0;
function createMathAgent() {
  agentSeq += 1;
  return agent({
    name: `math-${agentSeq}`,
    model: mock([
      {
        toolCalls: [{ id: "c1", name: "add", arguments: { a: 2, b: 3 } }],
      },
      { text: "2 + 3 = 5" },
    ]),
    instructions: "Use tools for math.",
    tools: [add],
    onEvent: otel,
  });
}

const billing = agent({
  name: "billing",
  model: mock([
    { text: "Refund initiated for your order." },
    { text: "Refund initiated for your order." },
  ]),
  instructions: "You handle billing and refunds.",
  onEvent: otel,
});

function createTriageAgent() {
  agentSeq += 1;
  return agent({
    name: `triage-${agentSeq}`,
    model: mock([
      {
        toolCalls: [
          {
            id: "h1",
            name: "handoff_to_billing",
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

const refund = graph("refund")
  .node("lookup", async ({ input }) => {
    const orderId = String(input["orderId"] ?? "unknown");
    await memory.put(["orders"], orderId, { lookedUp: true });
    return {
      output: `order:${orderId}`,
      state: { orderId },
    };
  })
  .interrupt("approve", { prompt: "Approve refund?" })
  .node("pay", async ({ outputs }) => `refunded:${outputs["lookup"] ?? ""}`)
  .compile({ checkpointer });

/** Branching + cycle demo */
const supportGraph = graph("support_graph")
  .node("classify", async ({ input, state }) => {
    const text = String(input["text"] ?? state["text"] ?? "");
    const intent = text.toLowerCase().includes("refund")
      ? "refund"
      : text.toLowerCase().includes("retry")
        ? "retry"
        : "faq";
    return { output: intent, state: { intent, text, hops: Number(state["hops"] ?? 0) } };
  })
  .node("refund_path", async ({ state }) => `refund-flow:${state["text"] ?? ""}`)
  .node("faq", async ({ state }) => {
    const hops = Number(state["hops"] ?? 0) + 1;
    return {
      output: `faq:${state["text"] ?? ""}`,
      state: { hops, needsRetry: hops < 2 && String(state["text"] ?? "").includes("retry") },
    };
  })
  .edge("classify", "refund_path", (ctx) => ctx.state["intent"] === "refund")
  .edge("classify", "faq", (ctx) => ctx.state["intent"] !== "refund")
  .edge("faq", "classify", (ctx) => ctx.state["needsRetry"] === true)
  .edge("faq", GRAPH_END, (ctx) => ctx.state["needsRetry"] !== true)
  .edge("refund_path", GRAPH_END)
  .compile({ maxSteps: 16 });

const refundRuns = new Map<string, GraphRunHandle>();

async function main() {
  const app = Fastify({ logger: true });

  app.get("/health", async () => ({
    ok: true,
    lib: "@monorch/ai",
    mcpTools: mcpToolDefs.map((t) => t.name),
  }));

  app.post<{ Body: { message?: string } }>("/support", async (req) => {
    const message = req.body?.message ?? "What is 2+3?";
    const result = await createMathAgent().run(message);
    return { text: result.text, runId: result.runId };
  });

  app.post<{ Body: { message?: string } }>("/support/stream", async (req, reply) => {
    const message = req.body?.message ?? "What is 2+3?";
    reply.hijack();
    reply.raw.writeHead(200, {
      "content-type": "text/event-stream",
      "cache-control": "no-cache",
      connection: "keep-alive",
    });
    const bot = createMathAgent();
    for await (const ev of bot.stream(message)) {
      reply.raw.write(`data: ${JSON.stringify(ev)}\n\n`);
    }
    reply.raw.end();
  });

  app.post<{ Body: { message?: string } }>("/handoff", async (req) => {
    const message = req.body?.message ?? "I need a refund";
    const result = await createTriageAgent().run(message);
    return { text: result.text, runId: result.runId, events: result.events.map((e) => e.type) };
  });

  app.post<{ Body: { text?: string } }>("/triage-graph", async (req) => {
    const run = await supportGraph.start({ text: req.body?.text ?? "refund please" });
    return { id: run.id, status: run.status, outputs: run.outputs, state: run.state };
  });

  app.post<{ Body: { orderId?: string; threadId?: string } }>("/refund", async (req) => {
    const threadId = req.body?.threadId ?? `refund-${Date.now()}`;
    const run = await refund.start(
      { orderId: req.body?.orderId ?? "ord_1" },
      { threadId },
    );
    refundRuns.set(run.id, run);
    return {
      id: run.id,
      threadId,
      status: run.status,
      outputs: run.outputs,
    };
  });

  app.post<{ Params: { id: string }; Body: { decision?: string } }>(
    "/refund/:id/resume",
    async (req, reply) => {
      const run = refundRuns.get(req.params.id);
      if (!run) {
        return reply.code(404).send({ error: "unknown refund run" });
      }
      const resumed = await run.resume(req.body?.decision ?? "approved");
      refundRuns.set(resumed.id, resumed);
      return {
        id: resumed.id,
        status: resumed.status,
        outputs: resumed.outputs,
      };
    },
  );

  const port = Number(process.env.PORT ?? 3000);
  await app.listen({ port, host: "127.0.0.1" });

  if (process.env.SMOKE === "1") {
    await runSmoke(port, app);
  }
}

async function runSmoke(port: number, app: { log: { info: Function }; close: () => Promise<void> }) {
  const health = await fetch(`http://127.0.0.1:${port}/health`).then((r) => r.json());
  if (!health.mcpTools?.includes("mcp_lookup_order")) {
    throw new Error(`smoke mcp missing: ${JSON.stringify(health)}`);
  }
  const mcpCall = await callTool(
    "mcp_lookup_order",
    { orderId: "ord_mcp" },
    { roles: ["agent"] },
  );
  if (!mcpCall || typeof mcpCall !== "object" || (mcpCall as { orderId?: string }).orderId !== "ord_mcp") {
    throw new Error(`smoke mcp callTool failed: ${JSON.stringify(mcpCall)}`);
  }
  app.log.info({ health, mcpCall }, "smoke /health + mcp");

  for (const label of ["/support", "/support#2"] as const) {
    const support = await fetch(`http://127.0.0.1:${port}/support`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ message: "2+3" }),
    }).then(async (r) => ({ status: r.status, body: await r.json() }));
    if (support.status !== 200 || support.body?.text !== "2 + 3 = 5") {
      throw new Error(`smoke ${label} failed: ${JSON.stringify(support)}`);
    }
    app.log.info({ support }, `smoke ${label}`);
  }

  const streamRes = await fetch(`http://127.0.0.1:${port}/support/stream`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ message: "2+3" }),
  });
  const streamText = await streamRes.text();
  if (!streamText.includes("run_start") || !streamText.includes("run_end")) {
    throw new Error(`smoke /support/stream failed: ${streamText}`);
  }
  app.log.info({ bytes: streamText.length }, "smoke /support/stream");

  const handoff = await fetch(`http://127.0.0.1:${port}/handoff`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ message: "I need a refund" }),
  }).then(async (r) => ({ status: r.status, body: await r.json() }));
  if (
    handoff.status !== 200 ||
    handoff.body?.text !== "Refund initiated for your order." ||
    !handoff.body?.events?.includes("handoff")
  ) {
    throw new Error(`smoke /handoff failed: ${JSON.stringify(handoff)}`);
  }
  app.log.info({ handoff }, "smoke /handoff");

  const branched = await fetch(`http://127.0.0.1:${port}/triage-graph`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ text: "refund please" }),
  }).then(async (r) => ({ status: r.status, body: await r.json() }));
  if (
    branched.status !== 200 ||
    branched.body?.status !== "completed" ||
    branched.body?.outputs?.refund_path !== "refund-flow:refund please"
  ) {
    throw new Error(`smoke /triage-graph failed: ${JSON.stringify(branched)}`);
  }
  app.log.info({ branched }, "smoke /triage-graph");

  const cycled = await fetch(`http://127.0.0.1:${port}/triage-graph`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ text: "retry help" }),
  }).then(async (r) => ({ status: r.status, body: await r.json() }));
  if (cycled.status !== 200 || cycled.body?.status !== "completed") {
    throw new Error(`smoke /triage-graph cycle failed: ${JSON.stringify(cycled)}`);
  }
  app.log.info({ cycled }, "smoke /triage-graph cycle");

  const started = await fetch(`http://127.0.0.1:${port}/refund`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ orderId: "ord_9", threadId: "smoke-refund" }),
  }).then(async (r) => ({ status: r.status, body: await r.json() }));
  if (started.status !== 200 || started.body?.status !== "waitingInterrupt") {
    throw new Error(`smoke /refund start failed: ${JSON.stringify(started)}`);
  }
  app.log.info({ started }, "smoke /refund start");

  const restored = await refund.restore("smoke-refund");
  if (restored.status !== "waitingInterrupt") {
    throw new Error(`checkpoint restore failed: ${JSON.stringify(restored)}`);
  }
  // Drive while waiting should re-emit wait, not fail/drop the run.
  const stillWaiting = await restored.drive();
  if (stillWaiting.status !== "waitingInterrupt") {
    throw new Error(`drive on waitingInterrupt failed: ${stillWaiting.status}`);
  }

  const resumed = await stillWaiting.resume("approved");
  if (
    resumed.status !== "completed" ||
    resumed.outputs?.pay !== "refunded:order:ord_9"
  ) {
    throw new Error(`smoke restore→resume failed: ${JSON.stringify(resumed)}`);
  }
  app.log.info({ resumed }, "smoke /refund restore→resume");
  // Keep map in sync for any late HTTP resume (should 404 / unused).
  refundRuns.set(resumed.id, resumed);

  if (!otelEvents.includes("run_start") || !otelEvents.includes("handoff")) {
    throw new Error(`otel listener missed events: ${otelEvents.join(",")}`);
  }
  app.log.info({ otelSample: otelEvents.slice(0, 12) }, "smoke otel");

  // Thread memory across turns
  const threads = inMemoryThreads();
  const memBot = agent({
    name: "mem-smoke",
    model: mock([{ text: "first" }, { text: "second" }]),
    instructions: "Remember prior turns.",
  });
  await memBot.run("hello", { threadId: "t-mem", memory: threads });
  await memBot.run("again", { threadId: "t-mem", memory: threads });
  const hist = await threads.get("t-mem");
  if (
    hist.length < 4 ||
    hist[0]?.role !== "user" ||
    hist[1]?.role !== "assistant" ||
    (hist[1] as { content?: string }).content !== "first" ||
    (hist[3] as { content?: string }).content !== "second"
  ) {
    throw new Error(`smoke thread memory failed: ${JSON.stringify(hist)}`);
  }
  app.log.info({ histLen: hist.length }, "smoke thread memory");

  // AbortSignal short-circuits before model I/O
  const ac = new AbortController();
  ac.abort();
  let aborted = false;
  try {
    await agent({
      name: "abort-smoke",
      model: mock([{ text: "should-not-run" }]),
    }).run("hi", { signal: ac.signal });
  } catch (e) {
    aborted =
      e instanceof Error &&
      (("code" in e && (e as { code: string }).code === "ABORTED") ||
        e.message.toLowerCase().includes("abort"));
  }
  if (!aborted) throw new Error("smoke abort signal failed");
  app.log.info({ aborted: true }, "smoke abort signal");

  // Checkpoint v2 includes input + defHash
  const cpBlob = await checkpointer.get("smoke-refund");
  if (
    !cpBlob ||
    typeof cpBlob !== "object" ||
    (cpBlob as { version?: number }).version !== 2 ||
    !(cpBlob as { defHash?: string }).defHash ||
    (cpBlob as { input?: { orderId?: string } }).input?.orderId !== "ord_9"
  ) {
    throw new Error(`smoke checkpoint v2 failed: ${JSON.stringify(cpBlob)}`);
  }
  app.log.info({ version: 2 }, "smoke checkpoint v2");

  // Graph hot-reload replace: in-flight run fails after def change
  const hotV1 = graph("hot_reload")
    .node("prep", async () => "v1")
    .interrupt("hold", { prompt: "hold?" })
    .compile({ replace: true });
  const hotRun = await hotV1.start({ n: 1 });
  if (hotRun.status !== "waitingInterrupt") {
    throw new Error(`smoke hot-reload expected waitingInterrupt, got ${hotRun.status}`);
  }
  graph("hot_reload")
    .node("prep", async () => "v2")
    .interrupt("hold", { prompt: "changed?" })
    .compile({ replace: true });
  let hotErr: unknown = null;
  try {
    await hotRun.resume("approved");
  } catch (e) {
    hotErr = e;
  }
  if (!hotErr) {
    throw new Error("smoke hot-reload expected resume to fail after replace");
  }
  const hotStatus = String(hotRun.status);
  if (hotStatus !== "failed") {
    throw new Error(`smoke hot-reload expected failed status, got ${hotStatus}`);
  }
  app.log.info({ err: String(hotErr), status: hotStatus }, "smoke graph replace");

  // Postgres adapters (in-memory SqlQueryable stand-in — swap for pg.Pool in prod)
  const sql = createMemorySql();
  await ensureMonorchSchema(sql);
  const pgCp = postgresCheckpointer(sql);
  const pgThreads = postgresThreads(sql);
  const pgStore = postgresStore(sql);

  await pgStore.put(["orders"], "ord_pg", { ok: true });
  const stored = await pgStore.get(["orders"], "ord_pg");
  if (!stored || (stored as { ok?: boolean }).ok !== true) {
    throw new Error(`smoke postgresStore failed: ${JSON.stringify(stored)}`);
  }

  const pgBot = agent({
    name: "pg-mem-smoke",
    model: mock([{ text: "pg-one" }, { text: "pg-two" }]),
  });
  await pgBot.run("hi", { threadId: "pg-t1", memory: pgThreads });
  await pgBot.run("again", { threadId: "pg-t1", memory: pgThreads });
  const pgHist = await pgThreads.get("pg-t1");
  if (pgHist.length < 4 || (pgHist[1] as { content?: string }).content !== "pg-one") {
    throw new Error(`smoke postgresThreads failed: ${JSON.stringify(pgHist)}`);
  }

  const pgGraph = graph("pg_refund")
    .node("lookup", async ({ input }) => `order:${input["orderId"]}`)
    .interrupt("approve", { prompt: "?" })
    .node("pay", async ({ outputs }) => `refunded:${outputs["lookup"]}`)
    .compile({ checkpointer: pgCp, replace: true });
  const pgStarted = await pgGraph.start({ orderId: "ord_pg" }, { threadId: "pg-refund" });
  if (pgStarted.status !== "waitingInterrupt") {
    throw new Error(`smoke pg checkpointer start failed: ${pgStarted.status}`);
  }
  const pgRestored = await pgGraph.restore("pg-refund");
  const pgDone = await pgRestored.resume("approved");
  if (pgDone.status !== "completed" || pgDone.outputs["pay"] !== "refunded:order:ord_pg") {
    throw new Error(`smoke pg checkpointer resume failed: ${JSON.stringify(pgDone)}`);
  }
  const listed = await pgCp.list?.("pg-refund");
  if (!listed || listed.length < 1) {
    throw new Error("smoke pg checkpointer list empty");
  }
  app.log.info({ hist: pgHist.length, checkpoints: listed.length }, "smoke postgres adapters");

  // Real MCP stdio transport
  const tsxRoot = dirname(require.resolve("tsx/package.json"));
  const tsxCli = join(tsxRoot, "dist/cli.mjs");
  const stdioSession = await mcpStdio({
    command: process.execPath,
    args: [tsxCli, join(__dirname, "mcp-demo-server.ts")],
    cwd: join(__dirname, ".."),
    stderr: "inherit",
  });
  try {
    const listedStdio = await stdioSession.listTools();
    if (!listedStdio.some((t) => t.name === "lookup_order")) {
      throw new Error(`smoke mcp stdio listTools: ${JSON.stringify(listedStdio)}`);
    }
    const stdioTools = await mcpTools(stdioSession, {
      prefix: "stdio_",
      permission: { type: "roles", roles: ["agent"] },
    });
    if (!stdioTools.some((t) => t.name === "stdio_lookup_order")) {
      throw new Error("smoke mcp stdio register missing stdio_lookup_order");
    }
    const stdioCall = await callTool(
      "stdio_lookup_order",
      { orderId: "ord_stdio" },
      { roles: ["agent"] },
    );
    if (
      !stdioCall ||
      typeof stdioCall !== "object" ||
      (stdioCall as { orderId?: string }).orderId !== "ord_stdio" ||
      (stdioCall as { source?: string }).source !== "stdio-mcp"
    ) {
      throw new Error(`smoke mcp stdio call failed: ${JSON.stringify(stdioCall)}`);
    }
    app.log.info({ tools: listedStdio.map((t) => t.name), stdioCall }, "smoke mcp stdio");
  } finally {
    await stdioSession.close();
  }

  // Real MCP Streamable HTTP transport
  const httpMcp = await startHttpMcpServer();
  try {
    const httpSession = await mcpHttp({
      url: httpMcp.url,
      transport: "streamable-http",
    });
    try {
      const listedHttp = await httpSession.listTools();
      if (!listedHttp.some((t) => t.name === "ping")) {
        throw new Error(`smoke mcp http listTools: ${JSON.stringify(listedHttp)}`);
      }
      await mcpTools(httpSession, {
        prefix: "http_",
        permission: { type: "roles", roles: ["agent"] },
      });
      const httpCall = await callTool("http_ping", { note: "hi" }, { roles: ["agent"] });
      if (
        !httpCall ||
        typeof httpCall !== "object" ||
        (httpCall as { pong?: boolean }).pong !== true ||
        (httpCall as { source?: string }).source !== "http-mcp"
      ) {
        throw new Error(`smoke mcp http call failed: ${JSON.stringify(httpCall)}`);
      }
      app.log.info({ tools: listedHttp.map((t) => t.name), httpCall }, "smoke mcp http");
    } finally {
      await httpSession.close();
    }
  } finally {
    await httpMcp.close();
  }

  // Optional live provider
  if (process.env.LIVE_SMOKE === "1") {
    const { openai } = await import("@monorch/ai/openai");
    const key = process.env.OPENAI_API_KEY ?? process.env.LITELLM_API_KEY;
    if (!key) throw new Error("LIVE_SMOKE=1 requires OPENAI_API_KEY or LITELLM_API_KEY");
    const live = agent({
      name: "live",
      model: openai(process.env.LIVE_MODEL ?? "gpt-4.1-mini", {
        apiKey: key,
        ...(process.env.LITELLM_URL ? { baseUrl: process.env.LITELLM_URL } : {}),
      }),
      instructions: "Reply with exactly: pong",
    });
    const out = await live.run("ping");
    if (!out.text.toLowerCase().includes("pong")) {
      throw new Error(`live smoke unexpected: ${out.text}`);
    }
    app.log.info({ text: out.text }, "smoke live provider");
  }

  await app.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
