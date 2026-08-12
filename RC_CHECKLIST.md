# Release candidate checklist (0.9 → 1.0)

Use this before cutting `1.0.0-rc.*` or `1.0.0`. During the freeze window: **bugfixes + docs only** unless a critical production blocker forces a carefully reviewed change.

## Freeze announcement

Monorch is in **API freeze** toward 1.0. The public surface in
[`/docs/api`](https://monorch.vercel.app/docs/api) / [`docs/api`](./apps/www/src/app/docs/api)
should not change intentionally without a major bump after 1.0.

Track: [roadmap issues](https://github.com/yogthesharma/monorch/issues?q=is%3Aissue+label%3Aroadmap).

## Checklist

### Platforms (#14)

- [x] Release workflow builds all **8** triples (darwin / linux-gnu / linux-musl / win32 × x64+arm64)
- [x] Alpine musl CI smoke green (`scripts/alpine-musl-smoke.mjs`)
- [x] `scripts/npm-install-smoke.mjs` green on ubuntu + macOS + Windows (CI matrix)
- [ ] `npm view @monorch/runtime@<ver> optionalDependencies` has **8** entries after each publish (manual / release verify)

### Smokes (#15)

- [x] `pnpm smoke` (workspace Fastify) on every PR / main
- [x] `pnpm smoke:npm` against published `@monorch/ai` (skips if version not published yet)
- [x] `pnpm smoke:hono` against published `@monorch/ai`
- [x] Optional `LIVE_SMOKE=1` job on `main` when `OPENAI_API_KEY` / LiteLLM secrets are set
- [x] Release workflow fails if post-publish consumer smokes fail (`REQUIRE_PUBLISHED=1`)

### Docs & contract (#13, #17)

- [x] Public API page matches shipped exports (freeze points here)
- [x] Errors / checkpoints / recipes accurate (0.4 polish)
- [x] [UPGRADE.md](./UPGRADE.md) current for 0.x → 1.0
- [x] CHANGELOG has an Unreleased / RC section ready to stamp

### Security (#16)

- [x] [SECURITY.md](./SECURITY.md) threat model reviewed (native load, MCP, Postgres)
- [x] Site `/security` points at reporting + threat model
- [ ] No known open critical advisories blocking RC (human gate before `1.0.0-rc.*`)

### Cut RC

When the list is green:

```bash
# Prefer 1.0.0-rc.1 once checklist is done; until then keep 0.1.x patches.
node scripts/set-version.mjs 1.0.0-rc.1   # when ready
# … release PR, merge, tag v1.0.0-rc.1
```

Do **not** tag `v1.0.0` until issue [#18](https://github.com/yogthesharma/monorch/issues/18) (stability promise) is done.
