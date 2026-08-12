import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { describe, it } from "node:test";
import pg from "pg";
import { agent, graph, mock } from "../dist/index.js";
import {
  ensureMonorchSchema,
  postgresCheckpointer,
  postgresStore,
  postgresThreads,
} from "../dist/postgres.js";

const databaseUrl = process.env.DATABASE_URL;

async function withPool(run: (pool: pg.Pool) => Promise<void>): Promise<void> {
  const pool = new pg.Pool({ connectionString: databaseUrl });
  try {
    await ensureMonorchSchema(pool);
    await run(pool);
  } finally {
    await pool.end();
  }
}

describe("postgres adapters", { skip: !databaseUrl }, () => {
  it("ensureMonorchSchema is idempotent", async () => {
    await withPool(async (pool) => {
      await ensureMonorchSchema(pool);
      await ensureMonorchSchema(pool);
    });
  });

  it("postgresStore put/get/list/delete", async () => {
    await withPool(async (pool) => {
      const store = postgresStore(pool);
      const ns = ["test", randomUUID().slice(0, 8)];
      const key = "item";

      await store.put(ns, key, { ok: true, n: 1 });
      assert.deepEqual(await store.get(ns, key), { ok: true, n: 1 });

      await store.put(ns, key, { ok: true, n: 2 });
      assert.deepEqual(await store.get(ns, key), { ok: true, n: 2 });

      const keys = await store.list(ns);
      assert.ok(keys.includes(key));

      await store.delete(ns, key);
      assert.equal(await store.get(ns, key), null);
    });
  });

  it("postgresThreads persists agent turns", async () => {
    await withPool(async (pool) => {
      const threads = postgresThreads(pool);
      const threadId = `thread_${randomUUID().slice(0, 8)}`;
      const bot = agent({
        name: `pg_${threadId}`,
        model: mock([{ text: "first" }, { text: "second" }]),
      });

      await bot.run("hello", { threadId, memory: threads });
      await bot.run("again", { threadId, memory: threads });

      const hist = await threads.get(threadId);
      assert.ok(hist.length >= 4);
      assert.equal(hist[0]?.role, "user");
      assert.equal(hist[1]?.role, "assistant");
      assert.equal((hist[1] as { content?: string }).content, "first");
      assert.equal((hist[3] as { content?: string }).content, "second");

      await threads.clear(threadId);
      assert.deepEqual(await threads.get(threadId), []);
    });
  });

  it("postgresCheckpointer lists checkpoint history", async () => {
    await withPool(async (pool) => {
      const cp = postgresCheckpointer(pool);
      const threadId = `cp_${randomUUID().slice(0, 8)}`;

      await cp.put(threadId, { version: 2, note: "a" });
      await cp.put(threadId, { version: 2, note: "b" });

      const latest = await cp.get(threadId);
      assert.deepEqual(latest, { version: 2, note: "b" });

      const listed = await cp.list?.(threadId);
      assert.ok(listed && listed.length >= 2);
      assert.equal(listed[0]?.threadId, threadId);
      assert.ok(listed[0]?.checkpointId);
    });
  });

  it("graph interrupt restore resume with postgresCheckpointer", async () => {
    await withPool(async (pool) => {
      const suffix = randomUUID().slice(0, 8);
      const threadId = `graph_${suffix}`;
      const name = `pg_refund_${suffix}`;
      const checkpointer = postgresCheckpointer(pool);

      const compiled = graph(name)
        .node("lookup", async ({ input }) => ({
          output: `order:${String(input["orderId"] ?? "")}`,
          state: { orderId: input["orderId"] },
        }))
        .interrupt("approve", { prompt: "Approve refund?" })
        .node("pay", async ({ outputs }) => `refunded:${outputs["lookup"] ?? ""}`)
        .compile({ checkpointer, replace: true });

      const waiting = await compiled.start({ orderId: "ord_pg" }, { threadId });
      assert.equal(waiting.status, "waitingInterrupt");

      const blob = await checkpointer.get(threadId);
      assert.ok(blob && typeof blob === "object");
      assert.equal((blob as { version?: number }).version, 2);
      assert.equal((blob as { input?: { orderId?: string } }).input?.orderId, "ord_pg");

      const restored = await compiled.restore(threadId);
      assert.equal(restored.status, "waitingInterrupt");

      const done = await restored.resume("approved");
      assert.equal(done.status, "completed");
      assert.equal(done.outputs["pay"], "refunded:order:ord_pg");
    });
  });

  it("restores graph checkpoint across a new pool connection", async () => {
    const suffix = randomUUID().slice(0, 8);
    const threadId = `boundary_${suffix}`;
    const name = `pg_boundary_${suffix}`;

    const pool1 = new pg.Pool({ connectionString: databaseUrl });
    try {
      await ensureMonorchSchema(pool1);
      const cp1 = postgresCheckpointer(pool1);
      const compiled = graph(name)
        .node("lookup", async ({ input }) => `order:${String(input["orderId"] ?? "")}`)
        .interrupt("approve", { prompt: "?" })
        .node("pay", async ({ outputs }) => `refunded:${outputs["lookup"] ?? ""}`)
        .compile({ checkpointer: cp1, replace: true });

      const waiting = await compiled.start({ orderId: "ord_x" }, { threadId });
      assert.equal(waiting.status, "waitingInterrupt");
    } finally {
      await pool1.end();
    }

    const pool2 = new pg.Pool({ connectionString: databaseUrl });
    try {
      await ensureMonorchSchema(pool2);
      const cp2 = postgresCheckpointer(pool2);
      const compiled2 = graph(name)
        .node("lookup", async ({ input }) => `order:${String(input["orderId"] ?? "")}`)
        .interrupt("approve", { prompt: "?" })
        .node("pay", async ({ outputs }) => `refunded:${outputs["lookup"] ?? ""}`)
        .compile({ checkpointer: cp2, replace: true });

      const restored = await compiled2.restore(threadId);
      const done = await restored.resume("approved");
      assert.equal(done.status, "completed");
      assert.equal(done.outputs["pay"], "refunded:order:ord_x");
    } finally {
      await pool2.end();
    }
  });
});
