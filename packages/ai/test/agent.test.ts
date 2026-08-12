import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { describe, it } from "node:test";
import { z } from "zod";
import { AiError, agent, tool } from "../dist/index.js";
import { mock } from "../dist/openai.js";

describe("agent orchestration", () => {
  it("runs tool loop and finishes with model text", async () => {
    const suffix = randomUUID().slice(0, 8);
    const addName = `add_${suffix}`;
    tool({
      name: addName,
      description: "Add numbers",
      input: z.object({ a: z.number(), b: z.number() }),
      execute: ({ a, b }) => ({ sum: a + b }),
    });

    const bot = agent({
      name: `math_${suffix}`,
      model: mock([
        {
          toolCalls: [{ id: "c1", name: addName, arguments: { a: 2, b: 3 } }],
        },
        { text: "2 + 3 = 5" },
      ]),
      tools: [{ name: addName }],
    });

    const result = await bot.run("2+3");
    assert.equal(result.text, "2 + 3 = 5");
    assert.ok(result.events.some((e) => e.type === "tool_result"));
  });

  it("handoffs to a declared target agent", async () => {
    const suffix = randomUUID().slice(0, 8);
    const billing = agent({
      name: `billing_${suffix}`,
      model: mock([{ text: "Refund initiated." }]),
      instructions: "Handle billing.",
    });
    const triage = agent({
      name: `triage_${suffix}`,
      model: mock([
        {
          toolCalls: [
            {
              id: "h1",
              name: `handoff_to_billing_${suffix}`,
              arguments: { message: "Customer wants refund" },
            },
          ],
        },
      ]),
      handoffs: [billing],
    });

    const result = await triage.run("I need a refund");
    assert.equal(result.text, "Refund initiated.");
    assert.ok(result.events.some((e) => e.type === "handoff"));
  });

  it("honors AbortSignal before model I/O", async () => {
    const ac = new AbortController();
    ac.abort();

    await assert.rejects(
      () =>
        agent({
          name: `abort_${randomUUID().slice(0, 8)}`,
          model: mock([{ text: "should-not-run" }]),
        }).run("hi", { signal: ac.signal }),
      (err: unknown) => {
        assert.ok(err instanceof AiError);
        assert.equal(err.code, "ABORTED");
        return true;
      },
    );
  });

  it("fails when maxSteps is exceeded", async () => {
    const suffix = randomUUID().slice(0, 8);
    const noopName = `noop_${suffix}`;
    tool({
      name: noopName,
      description: "noop",
      input: z.object({}),
      execute: () => ({}),
    });

    const bot = agent({
      name: `limit_${suffix}`,
      model: mock([
        { toolCalls: [{ id: "1", name: noopName, arguments: {} }] },
        { toolCalls: [{ id: "2", name: noopName, arguments: {} }] },
        { toolCalls: [{ id: "3", name: noopName, arguments: {} }] },
      ]),
      tools: [{ name: noopName }],
      maxSteps: 2,
    });

    await assert.rejects(
      () => bot.run("loop"),
      (err: unknown) => {
        assert.ok(err instanceof AiError);
        assert.equal(err.code, "AGENT_FAILED");
        return true;
      },
    );
  });

  it("surfaces tool prepare errors in the loop", async () => {
    const suffix = randomUUID().slice(0, 8);
    const secretName = `secret_${suffix}`;
    tool({
      name: secretName,
      description: "secret",
      input: z.object({}),
      permission: { type: "deny" },
      execute: () => ({}),
    });

    const bot = agent({
      name: `deny_${suffix}`,
      model: mock([
        { toolCalls: [{ id: "c1", name: secretName, arguments: {} }] },
        { text: "done anyway" },
      ]),
      tools: [{ name: secretName }],
    });

    const result = await bot.run("try secret");
    assert.equal(result.text, "done anyway");
    assert.ok(result.events.some((e) => e.type === "tool_result"));
    // Ensure prepare failed but loop continued with error payload in tool_result
    const denied = result.events.find(
      (e) => e.type === "tool_result" && e.name === secretName,
    );
    assert.ok(denied && "content" in denied);
    assert.match(String(denied.content), /error/i);
  });
});
