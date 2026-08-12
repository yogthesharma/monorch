# Published npm consumer smoke

This example installs **`@monorch/ai@0.1.5` from the npm registry**, not the monorepo workspace.

It is excluded from the pnpm workspace so installs cannot accidentally link `packages/ai`.

```bash
cd examples/npm-smoke
npm install
npm run smoke
```

From the repo root:

```bash
pnpm smoke:npm
```

Covers: native runtime load, agent tool loop, SSE stream, handoff, graph interrupt + checkpoint resume.
