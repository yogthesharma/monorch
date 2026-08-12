import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { z } from "zod";
import { AiError, model, mock, zodToIr } from "../dist/index.js";
import { getRuntime } from "../dist/native.js";

describe("structured output (Zod → IR → validate)", () => {
  it("generateObject returns typed data on valid JSON", async () => {
    const Weather = z.object({
      city: z.string(),
      tempC: z.number(),
    });
    const handle = model(mock([{ text: JSON.stringify({ city: "Lisbon", tempC: 22 }) }]));
    const weather = await handle.generateObject({
      prompt: "weather",
      output: Weather,
    });
    assert.deepEqual(weather, { city: "Lisbon", tempC: 22 });
  });

  it("throws INVALID_JSON when the model returns non-JSON", async () => {
    const Schema = z.object({ n: z.number() });
    const handle = model(mock([{ text: "definitely not json" }]));
    await assert.rejects(
      () => handle.generateObject({ prompt: "x", output: Schema }),
      (err: unknown) => {
        assert.ok(err instanceof AiError);
        assert.equal(err.code, "INVALID_JSON");
        return true;
      },
    );
  });

  it("throws VALIDATION_FAILED when JSON fails the schema", async () => {
    const Schema = z.object({ n: z.number() });
    const handle = model(mock([{ text: JSON.stringify({ n: "nope" }) }]));
    await assert.rejects(
      () => handle.generateObject({ prompt: "x", output: Schema }),
      (err: unknown) => {
        assert.ok(err instanceof AiError);
        assert.equal(err.code, "VALIDATION_FAILED");
        assert.ok(err.details?.errors);
        return true;
      },
    );
  });

  it("throws EMPTY_OUTPUT when the model returns blank text", async () => {
    const Schema = z.object({ n: z.number() });
    const handle = model(mock([{ text: "   " }]));
    await assert.rejects(
      () => handle.generateObject({ prompt: "x", output: Schema }),
      (err: unknown) => {
        assert.ok(err instanceof AiError);
        assert.equal(err.code, "EMPTY_OUTPUT");
        return true;
      },
    );
  });

  it("zodToIr + runtime.parse matches generateObject validation", () => {
    const Schema = z.object({
      tags: z.array(z.string()),
      ok: z.boolean(),
    });
    const ir = zodToIr(Schema);
    const parsed = getRuntime().parse(ir, { tags: ["a"], ok: true });
    assert.equal(parsed.ok, true);
    assert.deepEqual(parsed.value, { tags: ["a"], ok: true });

    const bad = getRuntime().parse(ir, { tags: "nope", ok: true });
    assert.equal(bad.ok, false);
  });
});
