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

  it("extracts JSON from markdown fences", async () => {
    const Schema = z.object({ n: z.number() });
    const handle = model(
      mock([{ text: '```json\n{"n": 7}\n```' }]),
    );
    assert.deepEqual(await handle.generateObject({ prompt: "x", output: Schema }), { n: 7 });
  });

  it("throws INVALID_JSON when a fence-like substring is still invalid JSON", async () => {
    const Schema = z.object({ n: z.number() });
    const handle = model(mock([{ text: 'prefix {"n":} suffix' }]));
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

  it("maps email/uuid/int checks into IR validation", () => {
    const Schema = z.object({
      email: z.string().email(),
      id: z.string().uuid(),
      n: z.number().int(),
    });
    const ir = zodToIr(Schema);
    const good = getRuntime().parse(ir, {
      email: "a@b.co",
      id: "550e8400-e29b-41d4-a716-446655440000",
      n: 3,
    });
    assert.equal(good.ok, true);

    const badEmail = getRuntime().parse(ir, {
      email: "nope",
      id: "550e8400-e29b-41d4-a716-446655440000",
      n: 3,
    });
    assert.equal(badEmail.ok, false);

    const badInt = getRuntime().parse(ir, {
      email: "a@b.co",
      id: "550e8400-e29b-41d4-a716-446655440000",
      n: 3.5,
    });
    assert.equal(badInt.ok, false);
  });

  it("throws SCHEMA_UNSUPPORTED for ZodEffects", () => {
    const Schema = z.string().refine((s) => s.length > 0);
    assert.throws(
      () => zodToIr(Schema),
      (err: unknown) => {
        assert.ok(err instanceof AiError);
        assert.equal(err.code, "SCHEMA_UNSUPPORTED");
        return true;
      },
    );
  });
});
