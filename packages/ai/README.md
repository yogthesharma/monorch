# @monorch/ai

**Typed AI agents & graphs for Node.js** — with a Rust execution engine.

Not a framework. Not an HTTP stack. Bring Fastify, Hono, Nest, or anything else.

```bash
npm i @monorch/ai
```

## Why Monorch

| You get | You keep |
| ------- | -------- |
| Agents with a real tool loop (limits, streaming events) | Your server framework |
| Zod → validated tools | Your ORM / auth / queues |
| Graphs with interrupts & checkpoints (HITL) | Your UI |
| MCP (stdio / Streamable HTTP / SSE) | Your model host |
| OpenAI-compatible providers (SSE, AbortSignal, timeouts) | |
| Postgres adapters for checkpoints & memory | |

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

## Packages

| Import | Purpose |
| ------ | ------- |
| `@monorch/ai` | Agents, tools, graphs, MCP, memory, OTel hooks |
| `@monorch/ai/openai` | OpenAI-compatible provider |
| `@monorch/ai/postgres` | Checkpoints, threads, store (`pg` peer) |

## Docs

- Site: [monorch.ai](https://monorch.ai)
- Docs: [monorch.ai/docs](https://monorch.ai/docs)
- GitHub: [yogthesharma/monorch](https://github.com/yogthesharma/monorch)
- Changelog: [CHANGELOG.md](https://github.com/yogthesharma/monorch/blob/main/CHANGELOG.md)

## License

MIT
