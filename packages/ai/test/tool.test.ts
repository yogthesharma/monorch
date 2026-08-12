import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { describe, it } from "node:test";
import { z } from "zod";
import { AiError, callTool, tool } from "../dist/index.js";

describe("tool permissions", () => {
  it("denies callTool when permission is deny", async () => {
    const name = `deny_${randomUUID().slice(0, 8)}`;
    tool({
      name,
      description: "denied tool",
      input: z.object({}),
      permission: { type: "deny" },
      execute: () => ({ ok: true }),
    });

    await assert.rejects(
      () => callTool(name, {}, { roles: ["agent"] }),
      (err: unknown) => {
        assert.ok(err instanceof AiError);
        assert.equal(err.code, "TOOL_PREPARE_FAILED");
        return true;
      },
    );
  });

  it("requires matching role for roles permission", async () => {
    const name = `roles_${randomUUID().slice(0, 8)}`;
    tool({
      name,
      description: "roles tool",
      input: z.object({ n: z.number() }),
      permission: { type: "roles", roles: ["agent"] },
      execute: ({ n }) => ({ n: n * 2 }),
    });

    await assert.rejects(() => callTool(name, { n: 1 }, { roles: ["viewer"] }));

    const out = await callTool(name, { n: 3 }, { roles: ["agent"] });
    assert.deepEqual(out, { n: 6 });
  });

  it("rejects duplicate tool names unless replace: true", async () => {
    const name = `dup_${randomUUID().slice(0, 8)}`;
    tool({
      name,
      input: z.object({}),
      execute: () => ({ v: 1 }),
    });
    assert.throws(
      () =>
        tool({
          name,
          input: z.object({}),
          execute: () => ({ v: 2 }),
        }),
      (err: unknown) => {
        assert.ok(err instanceof AiError);
        assert.equal(err.code, "TOOL_ALREADY_REGISTERED");
        return true;
      },
    );

    tool(
      {
        name,
        input: z.object({}),
        execute: () => ({ v: 3 }),
      },
      { replace: true },
    );
    assert.deepEqual(await callTool(name, {}), { v: 3 });
  });
});
