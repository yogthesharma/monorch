<p align="center">
  <img src="assets/logo.svg" alt="Monorch" width="72" />
</p>

# Monorch AI

**TypeScript AI control-plane library** with a **Rust execution engine**.

Not a framework. Not an HTTP stack. Bring your own Fastify/Hono/Nest.

**Current:** `0.1.6` — see [CHANGELOG.md](./CHANGELOG.md). Path to v1: [ROADMAP.md](./ROADMAP.md).

**API freeze (0.9 RC):** toward 1.0 we only take bugfixes and docs unless something is critically broken. See [RC_CHECKLIST.md](./RC_CHECKLIST.md) and [UPGRADE.md](./UPGRADE.md).

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
├── examples/fastify/       # BYO-backend example (workspace @monorch/ai)
├── examples/npm-smoke/     # Consumer smoke using published npm @monorch/ai
└── apps/www/               # Homepage + docs (Next.js + shadcn)
```

See `STRUCTURE.md` for folder rules.

## Quick start

```bash
pnpm install
pnpm build
pnpm smoke              # Fastify agent + graph smoke (workspace)
pnpm smoke:npm          # consumer smoke against published @monorch/ai on npm
pnpm smoke:hono         # same pattern with Hono (examples/hono-npm)
pnpm smoke:npm-install  # temp-dir registry install + native load
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

## Community

| | |
| --- | --- |
| **Questions** | [Discussions → Q&A](https://github.com/yogthesharma/monorch/discussions/categories/q-a) |
| **Ideas** | [Discussions → Ideas](https://github.com/yogthesharma/monorch/discussions/categories/ideas) |
| **Bugs** | [Issues](https://github.com/yogthesharma/monorch/issues) |
| **Security** | [Private advisories](https://github.com/yogthesharma/monorch/security/advisories/new) · [SECURITY.md](./SECURITY.md) |
| **Upgrade / RC** | [UPGRADE.md](./UPGRADE.md) · [RC_CHECKLIST.md](./RC_CHECKLIST.md) |
| **Contributing** | [CONTRIBUTING.md](./CONTRIBUTING.md) · [Code of Conduct](./CODE_OF_CONDUCT.md) |

Start here: [Welcome to Monorch Discussions](https://github.com/yogthesharma/monorch/discussions/19).

## Publishing

See [PUBLISH.md](./PUBLISH.md) for npm release (multi-platform natives + pack checks).
