# Monorch AI

**TypeScript AI control-plane library** with a **Rust execution engine**.

Not a framework. Not an HTTP stack. Bring your own Fastify/Hono/Nest.

**Current:** `0.1.0` — see [CHANGELOG.md](./CHANGELOG.md).

## Product lock

| We provide | We do not provide |
| ---------- | ----------------- |
| `model` / structured output (Zod → Rust validate) | HTTP framework |
| `tool` + permissions | ORM / auth / queues |
| `agent` (loop, limits, `stream` → AiEvent) | React chat UI |
| `graph` (nodes, edges, interrupt, checkpoints) | RAG product / Studio |
| `workflow` (linear sugar over graph) | |
| MCP transports (stdio / Streamable HTTP / SSE) → `tool()` | Integration zoo |
| OTel hooks via AiEvent | |
| Memory store / thread interfaces (BYO) — `agent.run(input, { threadId, memory })` | |
| Postgres adapters (`@monorch/ai/postgres`) | Hosted DB |
| OpenAI-compatible providers (SSE stream, AbortSignal / timeouts) | Replacing Zod |

**Replaces:** DIY agent loops, ad-hoc tool validation, light workflow state machines.

**Integrates with:** Zod, Fastify/Hono, LiteLLM proxy, `pg`, Vercel AI SDK UI (bring your own).

## Layout

```text
monorch/
├── engine/                 # Rust — source of truth (validate, tools, agent, workflow)
├── bindings/node/          # @monorch/runtime — N-API only (no business logic)
├── packages/ai/            # @monorch/ai — sole TypeScript user API
├── examples/fastify/       # BYO-backend example
└── apps/www/               # Homepage + docs (Next.js + shadcn)
```

See `STRUCTURE.md` for folder rules.

## Quick start

```bash
pnpm install
pnpm build
pnpm smoke              # Fastify agent + graph smoke
pnpm smoke:live         # optional live provider (needs API key)
pnpm dev:www            # homepage + docs on :3100
```

```ts
import { agent, tool } from "@monorch/ai";
import { openai } from "@monorch/ai/openai";
import { z } from "zod";

const add = tool({
  name: "add",
  input: z.object({ a: z.number(), b: z.number() }),
  execute: ({ a, b }) => ({ sum: a + b }),
});

const bot = agent({
  model: openai("gpt-4.1-mini"), // or LiteLLM baseUrl
  tools: [add],
  instructions: "Use tools for math.",
});

await bot.run("What is 2+3?");
```

### Durable checkpoints (Postgres)

```ts
import pg from "pg";
import { ensureMonorchSchema, postgresCheckpointer } from "@monorch/ai/postgres";

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
await ensureMonorchSchema(pool);
const checkpointer = postgresCheckpointer(pool);
```

`pg` is an optional peer dependency — only required when importing `@monorch/ai/postgres`.

## Publishing

See [PUBLISH.md](./PUBLISH.md) for npm release (multi-platform natives + pack checks).
