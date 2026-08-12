# Deploying apps/www

**Current production:** [https://monorch.vercel.app](https://monorch.vercel.app)

Custom domain (`monorch.ai`) is optional later — until then keep `NEXT_PUBLIC_SITE_URL` on the Vercel origin.

## Env

| Variable | Purpose |
| -------- | ------- |
| `NEXT_PUBLIC_SITE_URL` | Canonical origin, e.g. `https://monorch.vercel.app` (metadata, sitemap, OG) |
| `NEXT_PUBLIC_GITHUB_URL` | Optional override; default `https://github.com/yogthesharma/monorch` |
| `NEXT_PUBLIC_DISCUSSIONS_URL` | Optional Discussions URL |
| `NEXT_PUBLIC_NPM_PUBLISHED=0` | Force monorepo/git install copy (default: npm install paths — packages are published) |

Site version badge is injected from `packages/ai/package.json` at build time (`NEXT_PUBLIC_MONORCH_VERSION`). Keep that file aligned with the npm release you want advertised.

## Build

```bash
pnpm --filter @monorch/www build
pnpm --filter @monorch/www start   # or deploy .next to your host
```

## Host / domain

1. Deploy `apps/www` to Vercel (already live at `monorch.vercel.app`).
2. Set `NEXT_PUBLIC_SITE_URL` to that HTTPS origin before build (or to `https://monorch.ai` once DNS is attached).
3. Confirm `/robots.txt`, `/sitemap.xml`, `/llms.txt`, `/opengraph-image` respond 200.
4. Share a link once and verify OG preview (title, description, image).

## Post-deploy smoke

- [ ] `/` hero loads, logo + CTA → `/docs/getting-started`
- [ ] Docs search filters nav
- [ ] `/changelog` current badge matches `packages/ai` version (injected at build)
- [ ] Footer GitHub / Discussions open the real repo
- [ ] JSON-LD present on home (view-source)
