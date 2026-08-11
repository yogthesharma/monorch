# @monorch/runtime

Prebuilt **N-API** bindings for the Monorch Rust engine.

You usually install this transitively:

```bash
npm i @monorch/ai
```

That pulls `@monorch/runtime` plus the matching platform binary
(`@monorch/runtime-darwin-arm64`, `...-linux-x64-gnu`, `...-win32-x64-msvc`, and so on).

## What this package is

- Loader + TypeScript types for the native addon
- No business logic: agents, tools, and graphs live in Rust and are exposed through [`@monorch/ai`](https://www.npmjs.com/package/@monorch/ai)

## Supported platforms

- macOS `x64` / `arm64`
- Linux GNU `x64` / `arm64`
- Windows `x64` / `arm64`

## Docs

- Site: [monorch.vercel.app](https://monorch.vercel.app/)
- GitHub: [yogthesharma/monorch](https://github.com/yogthesharma/monorch)

## License

MIT
