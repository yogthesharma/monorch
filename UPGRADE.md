# Upgrade guide (0.x → 1.0)

This guide helps you move from any published `0.1.x` release toward **1.0**.
Monorch is still a **library** (BYO HTTP). There is no framework migration tool.

Current published line: see [CHANGELOG.md](./CHANGELOG.md) and
[`@monorch/ai` on npm](https://www.npmjs.com/package/@monorch/ai).

## Stability promise (intent)

After **1.0.0**:

- Symbols listed on the [Public API](https://monorch.vercel.app/docs/api) page are SemVer-stable.
- Removals / breaking renames require a **major** bump.
- Additive APIs may land in minor releases.

Until 1.0 ships, treat `0.1.x` as production-capable but still pre-1.0: we avoid
casual breaks, and the [RC checklist](./RC_CHECKLIST.md) freezes the surface.

## Recommended defaults

| Concern | Recommendation |
| ------- | -------------- |
| Install | `pnpm add @monorch/ai` (pulls `@monorch/runtime` + platform optional) |
| HTTP | Your server — Fastify / Hono recipes in docs |
| Checkpoints | Prefer `postgresCheckpointer` in prod; `memorySaver` for tests |
| Schema | Call `ensureMonorchSchema(pool)` once at boot |
| Models | `openai()` or any OpenAI-compatible `baseUrl` (LiteLLM, etc.) |
| Tools | Zod `tool()` + explicit `permission` |
| Structured output | `model(provider).generateObject({ output: zodSchema })` |
| Abort | Pass `AbortSignal` on `agent.run` / `stream`; `timeoutMs` on providers |

## Breaking / behavior notes from 0.1.x

As of **0.1.5** there are **no intentional breaking API removals** from earlier
`0.1.x` packages. Watch these behaviors when upgrading patches:

### Checkpoint blobs

- On-disk / DB blobs are **v2** (`version`, `input`, `defHash`).
- Legacy **v1** restores are supported with backfill; prefer writing v2.
- Changing a compiled graph’s structure changes `defHash` — in-flight threads
  fail restore until you start a new `threadId` or keep the old definition
  registered. See [Checkpoints](https://monorch.vercel.app/docs/checkpoints).

### Structured output

- `generateObject` validates **after** generation (Zod → IR → Rust `parse`).
- Invalid JSON (including bad markdown fences) throws `AiError` with
  `INVALID_JSON` — never a raw `SyntaxError`.
- Empty model text → `EMPTY_OUTPUT`; schema mismatch → `VALIDATION_FAILED`.

### Errors

- Prefer `e instanceof AiError` then branch on `e.code`.
- Catalog: [Errors & failure modes](https://monorch.vercel.app/docs/reference/errors).

### Native runtime

- Eight platform packages under `@monorch/runtime` `optionalDependencies`
  (gnu + musl Linux). Alpine selects musl automatically.
- Do not import `@monorch/runtime` from app code unless debugging.

### MCP

- `mcpStdio` **spawns** the process you pass (`command` / `args` / `env` / `cwd`).
  Treat that like running a shell command with your process privileges.
- `mcpHttp` talks to a URL you provide; send auth only via explicit `headers`.

### Postgres

- Table names are validated (`^[a-z_][a-z0-9_]*$`); values use parameterized queries.
- `ensureMonorchSchema` needs `CREATE TABLE` / `CREATE INDEX` privilege once.

## Checklist when bumping

1. Read [CHANGELOG.md](./CHANGELOG.md) for the versions you skip.
2. Align `@monorch/ai` and transitive `@monorch/runtime` (same semver).
3. Re-run your HITL / checkpoint restore smoke with production checkpointer.
4. Confirm platform: `node -e "import('@monorch/ai').then(m=>console.log('ok',!!m.agent))"`.
5. Optional: from this repo, `pnpm smoke:npm` / `pnpm smoke:hono`.

## Links

- [RC checklist](./RC_CHECKLIST.md)
- [SECURITY.md](./SECURITY.md) (threat model)
- [PUBLISH.md](./PUBLISH.md) (maintainers)
- [Roadmap](./ROADMAP.md)
