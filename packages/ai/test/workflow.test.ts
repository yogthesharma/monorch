import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { describe, it } from "node:test";
import { workflow } from "../dist/index.js";

describe("workflow sugar", () => {
  it("emits waitingInterrupt (not waitingHuman)", async () => {
    const name = `wf_${randomUUID().slice(0, 8)}`;
    const wf = workflow(name)
      .step("a", async () => "1")
      .human("approve", { prompt: "?" })
      .step("b", async ({ outputs }) => `done:${outputs.a}`)
      .build();

    let run = await wf.start({});
    assert.equal(run.status, "waitingInterrupt");
    run = await run.resume("approved");
    assert.equal(run.status, "completed");
    assert.equal(run.outputs.b, "done:1");
  });
});
