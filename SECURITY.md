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

## Secret handling

API keys and database URLs are expected to live in **your** environment. Providers and adapters read credentials you pass; the engine does not phone home.

If you discover a secret accidentally committed to **this** repository, report it privately as above. GitHub secret scanning is also enabled.

## Non-security bugs

For non-sensitive bugs and questions, use [GitHub Discussions](https://github.com/yogthesharma/monorch/discussions) or a normal issue.
