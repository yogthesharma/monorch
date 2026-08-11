# @monorch/ai

TypeScript AI control-plane library. Runtime truth lives in Rust (`@monorch/runtime`).

```bash
pnpm add @monorch/ai
# build native bindings in monorepo: pnpm build:native
```

```ts
import { agent, tool, mcpStdio, mcpTools } from "@monorch/ai";
import { openai } from "@monorch/ai/openai";
import { postgresCheckpointer, ensureMonorchSchema } from "@monorch/ai/postgres";
```

See the monorepo [README](../../README.md) and [CHANGELOG](../../CHANGELOG.md).
