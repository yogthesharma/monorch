# Release candidate checklist (0.9 → 1.0)

Use this before cutting `1.0.0-rc.*` or `1.0.0`. During the freeze window: **bugfixes + docs only** unless a critical production blocker forces a carefully reviewed change.

## Freeze announcement

Monorch is in **API freeze** toward 1.0. The public surface in
[`/docs/api`](https://monorch.vercel.app/docs/api) / [`docs/api`](./apps/www/src/app/docs/api)
should not change intentionally without a major bump after 1.0.

Track: [roadmap issues](https://github.com/yogthesharma/monorch/issues?q=is%3Aissue+label%3Aroadmap).

## Checklist

### Platforms (#14)

- [ ] Release workflow builds all **8** triples (darwin / linux-gnu / linux-musl / win32 × x64+arm64)
- [ ] Alpine musl CI smoke green (`scripts/alpine-musl-smoke.mjs`)
- [ ] `scripts/npm-install-smoke.mjs` green on ubuntu + macOS + Windows (CI matrix)
- [ ] `npm view @monorch/runtime@<ver> optionalDependencies` has **8** entries after publish

### Smokes (#15)

- [ ] `pnpm smoke` (workspace Fastify) on every PR / main
- [ ] `pnpm smoke:npm` against published `@monorch/ai`
- [ ] `pnpm smoke:hono` against published `@monorch/ai`
- [ ] Optional `LIVE_SMOKE=1` job when `OPENAI_API_KEY` / LiteLLM secrets are set
- [ ] Release workflow fails if post-publish consumer smokes fail

### Docs & contract (#13, #17)

- [ ] Public API page matches shipped exports
- [ ] Errors / checkpoints / recipes accurate
- [ ] [UPGRADE.md](./UPGRADE.md) current for 0.x → 1.0
- [ ] CHANGELOG has an Unreleased / RC section ready to stamp

### Security (#16)

- [ ] [SECURITY.md](./SECURITY.md) threat model reviewed (native load, MCP, Postgres)
- [ ] Site `/security` points at reporting + threat model
- [ ] No known open critical advisories blocking RC

### Cut RC

When the list is green:

```bash
# Prefer 1.0.0-rc.1 once checklist is done; until then keep 0.1.x patches.
node scripts/set-version.mjs 1.0.0-rc.1   # when ready
# … release PR, merge, tag v1.0.0-rc.1
```

Do **not** tag `v1.0.0` until issue [#18](https://github.com/yogthesharma/monorch/issues/18) (stability promise) is done.
