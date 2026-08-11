# Deploying apps/www

Checklist for putting the Monorch site on **monorch.ai** (or your domain).

## Env

| Variable | Purpose |
| -------- | ------- |
| `NEXT_PUBLIC_SITE_URL` | Canonical origin, e.g. `https://monorch.ai` (drives metadata, sitemap, OG) |
| `NEXT_PUBLIC_GITHUB_URL` | Optional override; default `https://github.com/monorch/monorch` |
| `NEXT_PUBLIC_DISCUSSIONS_URL` | Optional Discussions URL |
| `NEXT_PUBLIC_NPM_PUBLISHED=1` | Flip when `@monorch/ai` is on the public npm registry |

## Build

```bash
pnpm --filter @monorch/www build
pnpm --filter @monorch/www start   # or deploy .next to your host
```

## DNS / host

1. Point `monorch.ai` (and `www` if needed) at your host (Vercel, Cloudflare, etc.).
2. Set `NEXT_PUBLIC_SITE_URL` to the production HTTPS origin before build.
3. Confirm `/robots.txt`, `/sitemap.xml`, `/llms.txt`, `/opengraph-image` respond 200.
4. Share a link once and verify OG preview (title, description, image).

## Post-deploy smoke

- [ ] `/` hero loads, logo + CTA → `/docs/getting-started`
- [ ] Docs search filters nav
- [ ] `/changelog` matches `siteConfig.version`
- [ ] Footer GitHub / Discussions open the real repo
- [ ] JSON-LD present on home (view-source)
