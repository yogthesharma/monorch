# @monorch/ai

**The AI control plane for TypeScript backends.**

Agents and graphs in the server you already have. One event bus. No framework.

```bash
npm i @monorch/ai
```

## Why Monorch

| You get | You keep |
| ------- | -------- |
| Agents with a real tool loop (limits, streaming events) | Your server framework |
| Zod to validated tools | Your ORM / auth / queues |
| Graphs with interrupts and checkpoints (HITL) | Your UI |
| MCP (stdio / Streamable HTTP / SSE) | Your model host |
| OpenAI-compatible providers (SSE, AbortSignal, timeouts) | |
| Postgres adapters for checkpoints and memory | |

Runtime truth lives in Rust via [`@monorch/runtime`](https://www.npmjs.com/package/@monorch/runtime).

## Quick start

```ts
import { agent, tool } from "@monorch/ai";
import { openai } from "@monorch/ai/openai";
import { z } from "zod";

const weather = tool({
  name: "get_weather",
  description: "Get the weather for a city",
  input: z.object({ city: z.string() }),
  execute: async ({ city }) => ({ city, tempC: 22 }),
});

const assistant = agent({
  name: "assistant",
  model: openai("gpt-4.1-mini"),
  tools: [weather],
});

for await (const event of assistant.stream("What's the weather in Lisbon?")) {
  console.log(event);
}
```

Prefer `graph()` for orchestration. `workflow()` is linear sugar only.

## Packages

| Import | Purpose |
| ------ | ------- |
| `@monorch/ai` | Agents, tools, graphs, MCP, memory, OTel hooks |
| `@monorch/ai/openai` | OpenAI-compatible provider |
| `@monorch/ai/postgres` | Checkpoints, threads, store (`pg` peer) |

## Public API

Supported contract (do not deep-import `dist/`):

- **Core:** `agent`, `getAgent`, `tool`, `toolWithIr`, `callTool`, `listTools`, `graph`, `GRAPH_END`, `workflow` (sugar), `model`, `memorySaver`, `inMemoryStore`, `inMemoryThreads`, `createOtelListener`, `tapEvents`, `collectEvents`, `AiError`, `mock`, `openai`
- **MCP:** `mcpStdio`, `mcpHttp`, `mcpTools`, `mockMcp`, `jsonSchemaToIr`
- **Postgres:** `ensureMonorchSchema`, `postgresCheckpointer`, `postgresThreads`, `postgresStore`

**Not public:** `getRuntime()` / Engine methods, undocumented deep paths, relying on a single `@monorch/runtime-*` platform package from app code.

Full write-up: [Public API docs](https://monorch.vercel.app/docs/api).

## SemVer

- **0.x:** minors may add APIs; breaking changes to the public surface are allowed but changelogged.
- **1.0+:** documented public exports stay backward compatible within a major; breaking changes need `2.0`.

## Docs

- Site: [monorch.vercel.app](https://monorch.vercel.app/)
- Public API: [monorch.vercel.app/docs/api](https://monorch.vercel.app/docs/api)
- Upgrade guide: [UPGRADE.md](https://github.com/yogthesharma/monorch/blob/main/UPGRADE.md) · [docs/upgrade](https://monorch.vercel.app/docs/upgrade)
- RC checklist: [RC_CHECKLIST.md](https://github.com/yogthesharma/monorch/blob/main/RC_CHECKLIST.md)
- Errors & failure modes: [monorch.vercel.app/docs/reference/errors](https://monorch.vercel.app/docs/reference/errors)
- Docs: [monorch.vercel.app/docs](https://monorch.vercel.app/docs)
- GitHub: [yogthesharma/monorch](https://github.com/yogthesharma/monorch)
- Changelog: [CHANGELOG.md](https://github.com/yogthesharma/monorch/blob/main/CHANGELOG.md)

## License

MIT
