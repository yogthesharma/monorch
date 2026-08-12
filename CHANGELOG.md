# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.1.3] — 2026-08-12

### Added

- `@monorch/runtime-linux-x64-musl` and `@monorch/runtime-linux-arm64-musl` prebuilds (Alpine / musl Docker). `@monorch/runtime` now declares **8** platform `optionalDependencies` (was 6).
- Expanded engine + `@monorch/ai` unit tests and CI Postgres integration tests for `@monorch/ai/postgres`.

### Notes

- GNU vs musl Linux is selected by the N-API loader from the host libc. No app code changes required for Alpine images.
- Docs: public API surface, failure modes / `AiError` catalog on the site.

## [0.1.2] — 2026-08-12

### Changed

- npm description without em dashes; homepage and package docs point to https://monorch.vercel.app/

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
