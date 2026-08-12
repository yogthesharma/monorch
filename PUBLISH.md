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
5. Workflow `permissions.id-token: write` (already set) for npm provenance / OIDC

## When publish runs (integrity)

`.github/workflows/release.yml` publishes **only** when:

| Trigger | Publishes? |
| ------- | ---------- |
| Push of tag `v*` (e.g. `v0.1.3`) | Yes |
| `workflow_dispatch` with `dry_run: false` | Yes |
| `workflow_dispatch` with `dry_run: true` (default) | Pack only — **no** npm publish |
| Push to `main` / PRs | Never |

Do not publish from a laptop against production unless recovering from a failed CI publish.

## Local pack check (this machine only)

```bash
pnpm build
node scripts/pack-check.mjs
```

This validates tarball contents for the **current** OS/arch. Full multi-platform binaries come from CI.

## Release (recommended)

```bash
# Prefer a release PR → merge to main, then:

# 1. Stamp version if needed
node scripts/set-version.mjs 0.1.4

# 2. Commit on a branch / PR, merge to main when CI is green
git tag v0.1.4
git push origin v0.1.4
```

Pushing `v*` runs `.github/workflows/release.yml`:

1. Build natives on macOS / Linux / Windows (8 targets including musl)
2. Assemble `bindings/node/npm/*` platform packages (`napi create-npm-dir` + `napi artifacts`)
3. Stamp `optionalDependencies` via `scripts/stamp-optional-deps.mjs`
4. `npm publish --provenance` platform packages → `@monorch/runtime` → `@monorch/ai`

### Dry-run from Actions

Workflow dispatch → **Release** → leave `dry_run: true` (default). Downloads `npm-packs` artifacts without publishing.

## Provenance

Release publishes with **`--provenance`** so npm attaches a Sigstore attestation that the tarball was built by this GitHub Actions workflow from this repository.

### Verify a published package

```bash
# Metadata (version + optionalDependencies)
npm view @monorch/ai@0.1.3
npm view @monorch/runtime@0.1.3 optionalDependencies

# Attestations (npm CLI 9.5+ / current npm)
npm audit signatures
# or inspect attestations for a specific package:
npm view @monorch/ai@0.1.3 dist
npx @npmcli/arborist  # optional; or use:
npm install @monorch/ai@0.1.3 --ignore-scripts
npm audit signatures
```

On [npmjs.com](https://www.npmjs.com/package/@monorch/ai) → version → look for **Provenance** / “Built and signed on GitHub Actions”.

If provenance is missing on an older release (pre-0.1.4), that version was published before `--provenance` was enabled; prefer the latest tag.

## Manual publish (if needed)

```bash
# After CI artifacts are assembled locally:
cd bindings/node && pnpm exec napi create-npm-dir -t .
pnpm exec napi artifacts --dir ../../artifacts --dist .
node ../../scripts/stamp-optional-deps.mjs
# then publish npm/* , runtime, ai
# Prefer re-running the Release workflow instead of local publish.
```

## Post-publish smoke

```bash
npm view @monorch/ai version
npm view @monorch/runtime version
npm view @monorch/runtime optionalDependencies
# Expect 8 entries (gnu + musl)
mkdir /tmp/monorch-try && cd /tmp/monorch-try
npm init -y && npm i @monorch/ai
node -e "import('@monorch/ai').then(m => console.log(Object.keys(m).slice(0,8)))"
pnpm smoke:npm   # from monorepo root
```

## Platform set

napi `triples.defaults` (x64) plus `additional` arm64:

- `darwin-x64`, `darwin-arm64`
- `linux-x64-gnu`, `linux-arm64-gnu`
- `linux-x64-musl`, `linux-arm64-musl` (Alpine / musl Docker)
- `win32-x64-msvc`, `win32-arm64-msvc`

Musl builds use `napi build --zig` with Zig on Linux CI hosts. See `.cargo/config.toml` for musl `cdylib` flags.
