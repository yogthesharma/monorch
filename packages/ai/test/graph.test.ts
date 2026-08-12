import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { describe, it } from "node:test";
import { AiError, graph, memorySaver } from "../dist/index.js";

describe("graph orchestration", () => {
  it("interrupts, restores, and resumes with checkpoint v2", async () => {
    const suffix = randomUUID().slice(0, 8);
    const name = `refund_${suffix}`;
    const threadId = `thread_${suffix}`;
    const checkpointer = memorySaver();

    const compiled = graph(name)
      .node("lookup", async ({ input }) => ({
        output: `order:${String(input["orderId"] ?? "")}`,
        state: { orderId: input["orderId"] },
      }))
      .interrupt("approve", { prompt: "Approve refund?" })
      .node("pay", async ({ outputs }) => `refunded:${outputs["lookup"] ?? ""}`)
      .compile({ checkpointer });

    const waiting = await compiled.start({ orderId: "ord_9" }, { threadId });
    assert.equal(waiting.status, "waitingInterrupt");

    const blob = await checkpointer.get(threadId);
    assert.ok(blob && typeof blob === "object");
    assert.equal((blob as { version?: number }).version, 2);
    assert.ok((blob as { defHash?: string }).defHash);
    assert.equal((blob as { input?: { orderId?: string } }).input?.orderId, "ord_9");

    const restored = await compiled.restore(threadId);
    assert.equal(restored.status, "waitingInterrupt");

    const stillWaiting = await restored.drive();
    assert.equal(stillWaiting.status, "waitingInterrupt");

    const done = await stillWaiting.resume("approved");
    assert.equal(done.status, "completed");
    assert.equal(done.outputs["pay"], "refunded:order:ord_9");
  });

  it("fails in-flight resume after hot-reload replace", async () => {
    const suffix = randomUUID().slice(0, 8);
    const name = `hot_${suffix}`;

    const v1 = graph(name)
      .node("prep", async () => "v1")
      .interrupt("hold", { prompt: "hold?" })
      .compile({ replace: true });

    const run = await v1.start({ n: 1 });
    assert.equal(run.status, "waitingInterrupt");

    graph(name)
      .node("prep", async () => "v2")
      .interrupt("hold", { prompt: "changed?" })
      .compile({ replace: true });

    await assert.rejects(() => run.resume("approved"), (err: unknown) => {
      assert.ok(err instanceof AiError);
      return true;
    });
    assert.equal(run.status, "failed");
  });

  it("restore rejects checkpoint after def-hash mismatch", async () => {
    const suffix = randomUUID().slice(0, 8);
    const name = `cp_${suffix}`;
    const threadId = `thread_${suffix}`;
    const checkpointer = memorySaver();

    const v1 = graph(name)
      .node("a", async () => ({ output: "ok" }))
      .interrupt("i", { prompt: "?" })
      .compile({ checkpointer, replace: true });

    const waiting = await v1.start({}, { threadId });
    assert.equal(waiting.status, "waitingInterrupt");

    graph(name)
      .node("a", async () => ({ output: "ok" }))
      .interrupt("i", { prompt: "changed?" })
      .compile({ checkpointer, replace: true });

    await assert.rejects(() => v1.restore(threadId), (err: unknown) => {
      assert.ok(err instanceof Error);
      assert.match(err.message, /def_hash|definition/i);
      return true;
    });
  });
});
