# Hono + published npm consumer

Installs **`@monorch/ai@0.1.3` from the npm registry**, not the monorepo workspace — same pattern as `examples/npm-smoke`, but with **Hono** instead of Fastify.

```bash
cd examples/hono-npm
npm install
npm run smoke
```

From the repo root:

```bash
pnpm smoke:hono
```

Covers: native runtime load from npm, agent SSE stream, graph interrupt + checkpoint resume.
