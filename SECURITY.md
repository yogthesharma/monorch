# Security Policy

## Supported versions

| Version | Supported |
| ------- | --------- |
| `0.1.x` (`@monorch/ai`, `@monorch/runtime`) | Yes |
| Older pre-release / unpublished git SHAs | Best effort |

Monorch is a **library** you run in your own process. There is no Monorch-hosted control plane, SaaS, or cloud that stores your prompts, tools, or customer data.

## Reporting a vulnerability

**Please do not open a public GitHub issue for security reports.**

Use one of these private channels:

1. **[Private vulnerability reporting](https://github.com/yogthesharma/monorch/security/advisories/new)** on this repository (preferred)
2. GitHub Security Advisories for coordinated disclosure

Include as much as you can:

- Affected package(s) and version(s) (`@monorch/ai`, `@monorch/runtime`, engine)
- Description of the issue and impact
- Steps to reproduce or a minimal proof of concept
- Whether you believe the issue is already being exploited

## What to expect

- We aim to acknowledge reports within **3 business days**
- We will keep you informed of triage and remediation progress
- Please give us a reasonable window to fix and publish before public disclosure

## Scope

**In scope (examples):**

- Memory safety or privilege issues in the Rust engine / N-API bindings that can be triggered through documented `@monorch/ai` APIs
- Logic bugs in tool permission checks, schema validation, or checkpoint restore that allow unauthorized tool execution or state corruption
- Supply-chain issues in published npm packages we control (wrong native binary, compromised release artifacts)

**Out of scope (examples):**

- Vulnerabilities in your own HTTP server, auth, ORM, or deployment
- Issues in third-party model providers, LiteLLM proxies, MCP servers, or databases you wire in
- Social engineering, denial-of-service against public docs/site only, or speculative reports without a realistic attack path
- Secrets you commit to *your* apps (API keys, `DATABASE_URL`) — those never belong in Monorch itself

## Threat model (RC security pass)

### Native `.node` load

- `@monorch/runtime` loads a platform binary from a local build artifact or an
  `optionalDependency` package (`@monorch/runtime-<platform>`).
- Trust boundary: **npm provenance + your lockfile**. Pin versions; prefer
  installs from the official registry after verifying release attestations.
- App code should not `dlopen` arbitrary paths. Use the published loader only.
- Failure mode: missing optional binary → load error at import time (fail closed).

### MCP stdio spawn

- `mcpStdio({ command, args, env, cwd, … })` **spawns a child process** with the
  privileges of your Node process (via the MCP SDK stdio transport).
- **You** choose `command` / `args` / `env` / `cwd`. Treat untrusted input here
  like `child_process.spawn` — do not pass user-controlled shell strings.
- Prefer allowlisted binaries and fixed args. Inherit stderr by default.
- Tool results from MCP are untrusted data; still run through Monorch tool
  prepare / permissions when registered via `mcpTools`.

### MCP HTTP

- `mcpHttp({ url, headers })` connects to a URL you supply (Streamable HTTP,
  with SSE fallback in `auto` mode).
- Trust boundary: TLS / network path to that host. Pass credentials only through
  explicit `headers` (e.g. `Authorization`). Do not embed secrets in tool args
  that models can echo.
- SSRF: if `url` can be influenced by end users, restrict it in your app layer
  before calling `mcpHttp`.

### Postgres adapters

- `ensureMonorchSchema` / checkpointer / threads / store use **parameterized**
  queries for values (`$1`, `$2`, …).
- Table names are restricted to `^[a-z_][a-z0-9_]*$` (no SQL identifier injection
  via options).
- Boot needs DDL privilege once (`CREATE TABLE` / `CREATE INDEX`). Runtime
  traffic needs only DML on those tables — use a least-privilege DB role after
  schema bootstrap if your ops model allows.
- Checkpoint / message JSON is application data; protect `DATABASE_URL` and DB
  network access like any other datastore holding workflow state.

### Tool permissions & schema

- Local `tool()` permissions (`deny` / `roles` / …) and Zod→IR validation run
  before `execute`. Do not bypass `callTool` with raw engine calls from app code.
- Models can request tool calls; your permission config decides whether they run.

## Secret handling

API keys and database URLs are expected to live in **your** environment. Providers and adapters read credentials you pass; the engine does not phone home.

If you discover a secret accidentally committed to **this** repository, report it privately as above. GitHub secret scanning is also enabled.

## Non-security bugs

For non-sensitive bugs and questions, use [GitHub Discussions](https://github.com/yogthesharma/monorch/discussions) or a normal issue.

## Related

- [RC checklist](./RC_CHECKLIST.md)
- [Upgrade guide](./UPGRADE.md)
- Site: [Security](https://monorch.vercel.app/security)
