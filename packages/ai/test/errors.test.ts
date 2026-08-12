import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { AiError, fromNativeError } from "../dist/errors.js";

describe("fromNativeError", () => {
  it("passes through AiError", () => {
    const e = new AiError("GRAPH_FAILED", "x");
    assert.equal(fromNativeError(e), e);
  });

  it("maps def_hash messages", () => {
    const e = fromNativeError(
      new Error("checkpoint def_hash mismatch for graph 'g' (definition changed since checkpoint)"),
    );
    assert.ok(e instanceof AiError);
    assert.equal(e.code, "DEF_HASH_MISMATCH");
  });

  it("maps already registered tools/graphs", () => {
    assert.equal(fromNativeError(new Error("tool already registered: t")).code, "TOOL_ALREADY_REGISTERED");
    assert.equal(
      fromNativeError(new Error("graph already registered: g")).code,
      "GRAPH_ALREADY_REGISTERED",
    );
  });

  it("defaults to ENGINE_ERROR", () => {
    assert.equal(fromNativeError(new Error("something obscure")).code, "ENGINE_ERROR");
  });
});
