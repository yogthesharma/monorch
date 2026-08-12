# Contributing to Monorch

Thanks for contributing. Monorch is a **library**: TypeScript control plane (`@monorch/ai`) + Rust engine (`@monorch/runtime`). Keep that product lock in mind.

## Where to talk

| Topic | Channel |
| --- | --- |
| Questions / “how do I…” | [Discussions → Q&A](https://github.com/yogthesharma/monorch/discussions/categories/q-a) |
| Feature ideas / RFCs | [Discussions → Ideas](https://github.com/yogthesharma/monorch/discussions/categories/ideas) |
| Demos & production stories | [Discussions → Show and tell](https://github.com/yogthesharma/monorch/discussions/categories/show-and-tell) |
| Bugs & regressions | [GitHub Issues](https://github.com/yogthesharma/monorch/issues) |
| Security | [Private vulnerability reporting](https://github.com/yogthesharma/monorch/security/advisories/new) — see [SECURITY.md](./SECURITY.md) |

Please do **not** open issues for support questions. Use Discussions.

## Development setup

```bash
pnpm install
pnpm build
pnpm test:engine
pnpm test:ai
pnpm smoke
```

- Node `>=20`, `pnpm@9`
- Rust stable (for `engine/` and N-API bindings)
- Docs site: `pnpm dev:www` → http://localhost:3100

Folder rules: [STRUCTURE.md](./STRUCTURE.md).

## Pull requests

1. Prefer a focused PR over a kitchen-sink change
2. Include tests when you change engine or `@monorch/ai` behavior
3. Update docs / CHANGELOG when the public API changes
4. Keep native/Rust changes paired with TypeScript surface updates when needed

Use the PR template checklist.

## Code of conduct

Be respectful. See [CODE_OF_CONDUCT.md](./CODE_OF_CONDUCT.md).
