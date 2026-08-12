#!/usr/bin/env node
/**
 * Timed smoke baselines for agent tool-loop and graph advances.
 *
 * Usage:
 *   pnpm build && node scripts/bench.mjs
 *   node scripts/bench.mjs --check   # compare to benchmarks/baseline.json (CI)
 *
 * Env:
 *   BENCH_ITERS     iterations per scenario (default 40)
 *   BENCH_FAIL_MULT fail if median > baseline * mult (default 5)
 *   BENCH_WARN_MULT warn if median > baseline * mult (default 2)
 */
import { writeFileSync, readFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { createRequire } from "node:module";
import { performance } from "node:perf_hooks";
import { randomUUID } from "node:crypto";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const requireFromAi = createRequire(join(root, "packages/ai/package.json"));
const outDir = join(root, "benchmarks");
const baselinePath = join(outDir, "baseline.json");
const latestPath = join(outDir, "latest.json");

const iters = Math.max(5, Number(process.env.BENCH_ITERS ?? 40));
const failMult = Number(process.env.BENCH_FAIL_MULT ?? 5);
const warnMult = Number(process.env.BENCH_WARN_MULT ?? 2);
const checkOnly = process.argv.includes("--check");

function median(xs) {
  const s = [...xs].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

function p95(xs) {
  const s = [...xs].sort((a, b) => a - b);
  return s[Math.min(s.length - 1, Math.ceil(s.length * 0.95) - 1)];
}

async function loadApi() {
  const ai = await import(pathToFileURL(join(root, "packages/ai/dist/index.js")).href);
  const openai = await import(pathToFileURL(join(root, "packages/ai/dist/openai.js")).href);
  const zodPath = requireFromAi.resolve("zod");
  const zod = await import(pathToFileURL(zodPath).href);
  const z = zod.z ?? zod.default;
  return { ...ai, ...openai, z };
}

async function benchAgent(api) {
  const { agent, tool, mock, z } = api;
  const times = [];
  for (let i = 0; i < iters; i++) {
    const name = `bench_agent_${randomUUID().slice(0, 8)}`;
    const add = tool({
      name: `add_${name}`,
      input: z.object({ a: z.number(), b: z.number() }),
      permission: { type: "roles", roles: ["agent"] },
      execute: ({ a, b }) => ({ sum: a + b }),
    });
    const bot = agent({
      name,
      model: mock([
        {
          toolCalls: [{ id: `c_${i}`, name: add.name, arguments: { a: 2, b: 3 } }],
        },
        { text: "5" },
      ]),
      tools: [{ name: add.name }],
      maxSteps: 8,
    });
    const t0 = performance.now();
    const result = await bot.run("What is 2+3?");
    times.push(performance.now() - t0);
    if (!result.text) throw new Error("agent bench: empty text");
  }
  return { name: "agent_tool_loop_ms", samples: times, medianMs: median(times), p95Ms: p95(times) };
}

async function benchGraph(api) {
  const { graph, memorySaver } = api;
  const times = [];
  for (let i = 0; i < iters; i++) {
    const name = `bench_graph_${randomUUID().slice(0, 8)}`;
    const threadId = `t_${name}`;
    const checkpointer = memorySaver();
    const compiled = graph(name)
      .node("lookup", async ({ input }) => ({
        output: `order:${String(input.orderId ?? "")}`,
      }))
      .interrupt("approve")
      .node("pay", async ({ outputs }) => `refunded:${outputs.lookup ?? ""}`)
      .compile({ checkpointer });

    const t0 = performance.now();
    const waiting = await compiled.start({ orderId: "ord_9" }, { threadId });
    if (waiting.status !== "waitingInterrupt") {
      throw new Error(`graph bench: expected waitingInterrupt, got ${waiting.status}`);
    }
    const restored = await compiled.restore(threadId);
    const done = await restored.resume("approved");
    times.push(performance.now() - t0);
    if (done.status !== "completed") throw new Error(`graph bench: ${done.status}`);
  }
  return {
    name: "graph_interrupt_resume_ms",
    samples: times,
    medianMs: median(times),
    p95Ms: p95(times),
  };
}

async function main() {
  const api = await loadApi();
  const agentResult = await benchAgent(api);
  const graphResult = await benchGraph(api);
  const report = {
    generatedAt: new Date().toISOString(),
    iters,
    node: process.version,
    platform: `${process.platform}-${process.arch}`,
    results: [
      {
        name: agentResult.name,
        medianMs: Number(agentResult.medianMs.toFixed(3)),
        p95Ms: Number(agentResult.p95Ms.toFixed(3)),
      },
      {
        name: graphResult.name,
        medianMs: Number(graphResult.medianMs.toFixed(3)),
        p95Ms: Number(graphResult.p95Ms.toFixed(3)),
      },
    ],
  };

  mkdirSync(outDir, { recursive: true });
  writeFileSync(latestPath, `${JSON.stringify(report, null, 2)}\n`);
  console.log(JSON.stringify(report, null, 2));

  if (!checkOnly && !existsSync(baselinePath)) {
    writeFileSync(baselinePath, `${JSON.stringify(report, null, 2)}\n`);
    console.log(`Wrote initial baseline → ${baselinePath}`);
    return;
  }

  if (!existsSync(baselinePath)) {
    console.error("Missing benchmarks/baseline.json — run without --check once to seed.");
    process.exit(1);
  }

  const baseline = JSON.parse(readFileSync(baselinePath, "utf8"));
  let failed = false;
  for (const r of report.results) {
    const b = baseline.results?.find((x) => x.name === r.name);
    if (!b) {
      console.warn(`No baseline for ${r.name}`);
      continue;
    }
    const ratio = r.medianMs / Math.max(0.001, b.medianMs);
    const line = `${r.name}: median ${r.medianMs.toFixed(2)}ms vs baseline ${b.medianMs}ms (${ratio.toFixed(2)}x)`;
    if (ratio > failMult) {
      console.error(`FAIL ${line} (threshold ${failMult}x)`);
      failed = true;
    } else if (ratio > warnMult) {
      console.warn(`WARN ${line} (threshold ${warnMult}x)`);
    } else {
      console.log(`OK   ${line}`);
    }
  }
  if (failed) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
