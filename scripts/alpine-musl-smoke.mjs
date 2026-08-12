#!/usr/bin/env node
/**
 * Alpine/musl smoke: load @monorch/runtime via @monorch/ai (workspace layout).
 * Expects linux-x64-musl .node in bindings/node (CI builds it first).
 */
import { agent, mock } from "../packages/ai/dist/index.js";

const bot = agent({
  name: "alpine-smoke",
  model: mock([{ text: "ok" }]),
});
const result = await bot.run("hi");
if (result.text !== "ok") throw new Error(`unexpected: ${result.text}`);
console.log("alpine-musl-smoke ok", result.runId);
