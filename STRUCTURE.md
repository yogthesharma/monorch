# Product lock

## What we are

A **TypeScript library** (`@monorch/ai`) + **Rust execution engine** (`engine/` via `@monorch/runtime`).

## Folder structure (do not invent parallel trees)

```text
monorch/
├── engine/                 # Rust source of truth
│   └── src/
│       ├── lib.rs          # Engine facade
│       ├── schema.rs       # IR + validate/parse
│       ├── tools.rs        # registry + permissions
│       ├── agent.rs        # agent state machine
│       ├── graph.rs        # graph orchestration + checkpoints
│       └── workflow.rs     # legacy linear helpers (prefer graph)
├── bindings/node/          # @monorch/runtime — N-API only
├── packages/ai/            # @monorch/ai — sole TypeScript user API
│   └── src/
│       ├── index.ts
│       ├── events.ts       # AiEvent bus
│       ├── model.ts
│       ├── tool.ts
│       ├── agent.ts
│       ├── graph.ts        # graph().node().edge().compile()
│       ├── checkpointer.ts # memorySaver + Checkpointer
│       ├── memory.ts       # MemoryStore + ThreadMemory
│       ├── mcp.ts          # mcpStdio / mcpHttp / mcpTools / mockMcp
│       ├── postgres.ts     # postgresCheckpointer / Threads / Store
│       ├── otel.ts         # createOtelListener()
│       ├── workflow.ts     # linear sugar over graph
│       ├── zod-ir.ts
│       ├── native.ts
│       └── providers/
├── examples/fastify/       # BYO HTTP example (not part of the lib)
└── apps/www/               # Standalone Next.js — homepage + docs only
```

## Rules

1. Business logic for validate / auth / agent / graph state → **Rust only**.
2. Provider HTTP (OpenAI/LiteLLM), node execute, edge predicates → **TS only**.
3. No second user package (`@monorch/agents` etc.) until release cadence forces it.
4. Examples never become frameworks — they only show Fastify/Hono importing the lib.
5. `apps/www` is marketing/docs only — it must not import engine internals or become a product Studio.
6. Prefer `graph()` over `workflow()` for new code; workflow is sugar.
