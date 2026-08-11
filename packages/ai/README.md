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

## Packages

| Import | Purpose |
| ------ | ------- |
| `@monorch/ai` | Agents, tools, graphs, MCP, memory, OTel hooks |
| `@monorch/ai/openai` | OpenAI-compatible provider |
| `@monorch/ai/postgres` | Checkpoints, threads, store (`pg` peer) |

## Docs

- Site: [monorch.vercel.app](https://monorch.vercel.app/)
- Docs: [monorch.vercel.app/docs](https://monorch.vercel.app/docs)
- GitHub: [yogthesharma/monorch](https://github.com/yogthesharma/monorch)
- Changelog: [CHANGELOG.md](https://github.com/yogthesharma/monorch/blob/main/CHANGELOG.md)

## License

MIT
