# @monorch/runtime

N-API bindings for the Monorch Rust engine. Used by `@monorch/ai`.

## Install

```bash
pnpm add @monorch/ai   # pulls @monorch/runtime + the matching platform binary
```

Published builds ship **prebuilt** `.node` files via `optionalDependencies`
(`@monorch/runtime-darwin-arm64`, `…-linux-x64-gnu`, etc.).

## Develop (monorepo)

```bash
pnpm build   # napi build --platform --release
```
