# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.1] — 2026-08-12

### Changed

- Stronger npm package description, keywords, homepage/repository metadata, and package READMEs for `@monorch/ai` and `@monorch/runtime`.

## [0.1.0] — 2026-08-12

First tagged library release of `@monorch/ai` + `@monorch/runtime`.

### Added

- Agents with tool loop (Rust state) + `stream()` / `run()` AiEvent bus
- Explicit handoffs (`handoffs: [...]`, `handoff_to_*` tools)
- Graphs: nodes, conditional edges, interrupts, cycle `maxSteps`, `compile({ replace })`
- Checkpoint v2 blobs (`version`, `input`, `defHash`) + `memorySaver()`
- Postgres adapters: `postgresCheckpointer`, `postgresThreads`, `postgresStore` (`@monorch/ai/postgres`)
- Thread memory on agents: `run(input, { threadId, memory, signal })`
- MCP: `mcpStdio` / `mcpHttp` (Streamable HTTP + SSE fallback) + `mcpTools` JSON Schema → IR
- OTel hooks via `createOtelListener`
- OpenAI-compatible provider with SSE stream, AbortSignal, timeouts (`@monorch/ai/openai`)
- Fastify BYO example + `pnpm smoke` / `pnpm smoke:live`

### Notes

- Prefer `graph()` over `workflow()` (linear sugar).
- `pg` is an optional peer dependency; only needed if you import `@monorch/ai/postgres`.
- Published `@monorch/runtime` ships prebuilt N-API binaries per platform (`optionalDependencies`). See [PUBLISH.md](./PUBLISH.md).
- In the monorepo, run `pnpm build:native` for local development.
