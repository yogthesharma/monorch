#!/usr/bin/env node
/**
 * Minimal native load smoke for linux-x64-musl (Alpine/Docker).
 * Expects monorch-runtime.linux-x64-musl.node in bindings/node (CI builds it first).
 */
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const runtimeEntry = join(root, "bindings/node/index.js");
const require = createRequire(runtimeEntry);

const { Engine } = require(runtimeEntry);
const engine = new Engine();
const run = engine.agentStart(
  { name: "alpine-smoke", system: "test", tools: [], handoffs: [], maxSteps: 2 },
  "hi",
);
if (!run?.id) throw new Error("agentStart returned no run id");
console.log("alpine-musl-smoke ok", run.id);
