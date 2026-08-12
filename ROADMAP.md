# Roadmap to v1.0

Current release: **`@monorch/ai@0.1.2`** ([npm](https://www.npmjs.com/package/@monorch/ai), [site](https://monorch.vercel.app/)).

**v1 gate:** someone can run Monorch in a real Fastify/Hono service with Postgres checkpoints, MCP tools, and an OpenAI-compatible model, and the documented public API stays stable without a breaking change for normal production use.

We stay a **library**, not a framework / Studio / RAG product. See [STRUCTURE.md](./STRUCTURE.md).

Tracking: [issues labeled `roadmap`](https://github.com/yogthesharma/monorch/issues?q=is%3Aissue+is%3Aopen+label%3Aroadmap).

## Milestones

| Milestone | Goal | Issues |
| --------- | ---- | ------ |
| [0.2](#02--harden-the-contract) | Harden the contract | #1–#5 |
| [0.3](#03--production-ops) | Production ops | #6–#9 |
| [0.4](#04--ecosystem-confidence) | Ecosystem confidence | #10–#12 |
| [0.9](#09--release-candidate) | Release candidate | #13–#17 |
| [1.0](#10--ship) | Ship | #18 |

---

## 0.2 — Harden the contract

- [x] [#1](https://github.com/yogthesharma/monorch/issues/1) Freeze and document the public API surface
- [x] [#2](https://github.com/yogthesharma/monorch/issues/2) Expand engine and TypeScript tests beyond smoke
- [ ] [#3](https://github.com/yogthesharma/monorch/issues/3) Add linux-musl prebuilds for Alpine/Docker
- [ ] [#4](https://github.com/yogthesharma/monorch/issues/4) Postgres integration tests in CI
- [ ] [#5](https://github.com/yogthesharma/monorch/issues/5) Fix site copy for published npm status

## 0.3 — Production ops

- [ ] [#6](https://github.com/yogthesharma/monorch/issues/6) Document failure modes and stable AiError codes
- [ ] [#7](https://github.com/yogthesharma/monorch/issues/7) Checkpoint migration story (v2 and beyond)
- [ ] [#8](https://github.com/yogthesharma/monorch/issues/8) npm provenance and release integrity
- [ ] [#9](https://github.com/yogthesharma/monorch/issues/9) Performance baselines for agent loop and graphs

## 0.4 — Ecosystem confidence

- [ ] [#10](https://github.com/yogthesharma/monorch/issues/10) Second BYO example (Hono or Nest) on published package
- [ ] [#11](https://github.com/yogthesharma/monorch/issues/11) Polish docs recipes (HITL, handoff, MCP, LiteLLM, abort)
- [ ] [#12](https://github.com/yogthesharma/monorch/issues/12) End-to-end structured output path (Zod → IR → validate)

## 0.9 — Release candidate

- [ ] [#13](https://github.com/yogthesharma/monorch/issues/13) API freeze window and RC checklist
- [ ] [#14](https://github.com/yogthesharma/monorch/issues/14) Full platform matrix green including musl
- [ ] [#15](https://github.com/yogthesharma/monorch/issues/15) CI gates: smoke, smoke:npm, and live provider smoke
- [ ] [#16](https://github.com/yogthesharma/monorch/issues/16) Security pass: native load, MCP spawn, Postgres adapters
- [ ] [#17](https://github.com/yogthesharma/monorch/issues/17) Changelog and 0.x → 1.0 upgrade guide

## 1.0 — Ship

- [ ] [#18](https://github.com/yogthesharma/monorch/issues/18) Ship v1.0.0 and stability promise

---

## Non-goals for v1

- Hosted control plane / Studio UI
- Built-in RAG product
- Replacing Zod or owning the HTTP stack
- Huge integration zoo (providers stay OpenAI-compatible + BYO)

## How to work this list

1. Pick a `roadmap` issue for the current milestone.
2. Open a PR that references the issue.
3. Keep examples and docs in sync with any API change.
4. Cut a semver release when a milestone’s “must ship” items are done (`0.2.0`, `0.3.0`, …).
