# Publishing `@monorch/ai` + `@monorch/runtime`

## What gets published

| Package | Contents |
| ------- | -------- |
| `@monorch/runtime` | N-API loader (`index.js`) + types |
| `@monorch/runtime-<platform>` | One `.node` binary each (optionalDependencies) |
| `@monorch/ai` | TypeScript API (`dist/`) |

`pnpm publish` rewrites `workspace:*` → the real version automatically.

`optionalDependencies` for platform packages are **stamped in CI** by
`scripts/stamp-optional-deps.mjs` right before pack/publish (so local/CI
installs do not need unpublished `@monorch/runtime-*` packages).

## Prerequisites

1. GitHub repo with Actions enabled
2. npm org `@monorch` (or change the scope)
3. npm **Automation** token with publish rights → Actions secret `NPM_TOKEN`
4. Green CI on `main` (`cargo test`, build, smoke)

## Local pack check (this machine only)

```bash
pnpm build
node scripts/pack-check.mjs
```

This validates tarball contents for the **current** OS/arch. Full multi-platform binaries come from CI.

## Release (recommended)

```bash
# 1. Stamp version if needed
node scripts/set-version.mjs 0.1.0

# 2. Commit + tag
git add -A && git commit -m "release: 0.1.0"
git tag v0.1.0
git push origin main --tags
```

Pushing `v*` runs `.github/workflows/release.yml`:

1. Build natives on macOS / Linux / Windows
2. Assemble `bindings/node/npm/*` platform packages (`napi create-npm-dir` + `napi artifacts`)
3. Stamp `optionalDependencies` via `scripts/stamp-optional-deps.mjs`
4. `npm publish` platform packages → `@monorch/runtime` → `@monorch/ai`

### Dry-run from Actions

Workflow dispatch → **Release** → leave `dry_run: true` (default). Downloads `npm-packs` artifacts without publishing.

## Manual publish (if needed)

```bash
# After CI artifacts are assembled locally:
cd bindings/node && pnpm exec napi create-npm-dir -t .
pnpm exec napi artifacts --dir ../../artifacts --dist .
node ../../scripts/stamp-optional-deps.mjs
# then publish npm/* , runtime, ai
```

## Post-publish smoke

```bash
npm view @monorch/ai version
npm view @monorch/runtime version
npm view @monorch/runtime optionalDependencies
mkdir /tmp/monorch-try && cd /tmp/monorch-try
npm init -y && npm i @monorch/ai
node -e "import('@monorch/ai').then(m => console.log(Object.keys(m).slice(0,8)))"
```

## First-release platform set

napi `triples.defaults` (x64) plus `additional` arm64:

- `darwin-x64`, `darwin-arm64`
- `linux-x64-gnu`, `linux-arm64-gnu`
- `linux-x64-musl`, `linux-arm64-musl` (Alpine / musl Docker)
- `win32-x64-msvc`, `win32-arm64-msvc`

Musl builds use `napi build --zig` with Zig on Linux CI hosts. See `.cargo/config.toml` for musl `cdylib` flags.
