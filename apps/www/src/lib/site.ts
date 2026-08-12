export const siteConfig = {
  name: "Monorch",
  tagline: "AI control plane for TypeScript",
  description:
    "Agents, tools, graphs, and workflows as a TypeScript library with a Rust execution engine. Bring your own HTTP server — Fastify, Hono, Nest, or anything else.",
  /**
   * Injected from packages/ai/package.json via next.config.ts.
   * Keep that package version aligned with the npm release you want the site to advertise.
   */
  version: process.env.NEXT_PUBLIC_MONORCH_VERSION ?? "0.2.0",
  /**
   * Packages are on the public npm registry. Set NEXT_PUBLIC_NPM_PUBLISHED=0 to force
   * monorepo/git install copy on the site.
   */
  npmPublished: process.env.NEXT_PUBLIC_NPM_PUBLISHED !== "0",
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "https://monorch.vercel.app",
  locale: "en_US",
  twitter: "@monorch",
  github: process.env.NEXT_PUBLIC_GITHUB_URL ?? "https://github.com/yogthesharma/monorch",
  npm: "https://www.npmjs.com/package/@monorch/ai",
  discussions:
    process.env.NEXT_PUBLIC_DISCUSSIONS_URL ??
    "https://github.com/yogthesharma/monorch/discussions",
  keywords: [
    "Monorch",
    "TypeScript AI agents",
    "Rust AI engine",
    "agent workflow library",
    "MCP tools",
    "graph checkpoints",
    "OpenAI compatible",
    "BYO HTTP",
    "Hono AI",
    "Fastify AI",
    "AiEvent streaming",
  ],
};

export type DocPageMeta = {
  title: string;
  description: string;
  path: string;
};

/** Standalone product/marketing pages (not under /docs). */
export const productPages: DocPageMeta[] = [
  {
    title: "Compare",
    path: "/compare",
    description:
      "Monorch vs Mastra, LangGraph, and DIY agent loops. Library positioning and product lock.",
  },
  {
    title: "Changelog",
    path: "/changelog",
    description: "Release notes for @monorch/ai and @monorch/runtime.",
  },
  {
    title: "Architecture",
    path: "/architecture",
    description:
      "How @monorch/ai, @monorch/runtime, and the Rust engine split responsibilities across TypeScript and native code.",
  },
  {
    title: "Platforms",
    path: "/platforms",
    description:
      "Node and native @monorch/runtime builds, supported platforms, and CI pointers.",
  },
  {
    title: "Security",
    path: "/security",
    description:
      "MIT license, threat model (native load, MCP, Postgres), and how to report vulnerabilities.",
  },
];

/** Canonical doc index for sitemap, llms.txt, and page metadata. */
export const docPages: DocPageMeta[] = [
  {
    title: "Introduction",
    path: "/docs",
    description:
      "What Monorch is: a TypeScript AI control-plane library with a Rust engine. Not a framework or HTTP stack.",
  },
  {
    title: "Getting started",
    path: "/docs/getting-started",
    description:
      "Install @monorch/ai from npm or build from the monorepo, run smoke and smoke:npm, and copy the smallest agent and graph patterns into your HTTP handlers.",
  },
  {
    title: "Public API",
    path: "/docs/api",
    description:
      "Supported @monorch/ai exports, SemVer policy, prefer graph() over workflow(), and intentional non-public surfaces.",
  },
  {
    title: "Upgrade guide",
    path: "/docs/upgrade",
    description:
      "0.x → 1.0 upgrade notes: checkpoints, structured output errors, MCP and Postgres trust boundaries.",
  },
  {
    title: "Release candidate",
    path: "/docs/rc",
    description:
      "API freeze toward 1.0, RC checklist for platforms, smokes, docs, and security.",
  },
  {
    title: "Agents",
    path: "/docs/agents",
    description:
      "Create agents with models, tools, handoffs, getAgent registry, thread memory, and AbortSignal cancellation.",
  },
  {
    title: "Tools",
    path: "/docs/tools",
    description:
      "Define Zod-validated tools with permissions. Execution stays in TypeScript; authorization and schema live in Rust.",
  },
  {
    title: "Graphs",
    path: "/docs/graphs",
    description:
      "Build branching graphs with agentNode, interrupts, cycles, checkpoints, idempotent drive, and compile({ replace }) hot-reload.",
  },
  {
    title: "Checkpoints",
    path: "/docs/checkpoints",
    description:
      "Persist and restore graph runs with memorySaver or postgresCheckpointer; checkpoint blob v2 (version, defHash, input).",
  },
  {
    title: "Streaming",
    path: "/docs/streaming",
    description:
      "Consume AiEvent streams from agent.stream and graph execution for SSE UIs, logs, and OpenTelemetry.",
  },
  {
    title: "Workflows",
    path: "/docs/workflows",
    description:
      "Linear workflow sugar over graph(). Prefer graph() when you need branching or interrupts.",
  },
  {
    title: "Providers",
    path: "/docs/providers",
    description:
      "OpenAI-compatible providers with SSE streaming, timeoutMs, AbortSignal, and model().generateObject validated in Rust.",
  },
  {
    title: "MCP",
    path: "/docs/mcp",
    description:
      "Bridge Model Context Protocol servers (stdio / HTTP) into Monorch tools with mcpStdio, mcpHttp, and mcpTools.",
  },
  {
    title: "Memory",
    path: "/docs/memory",
    description:
      "Thread memory and key-value stores: inMemory* helpers, postgresThreads / postgresStore, and agent.run({ threadId, memory }).",
  },
  {
    title: "Observability",
    path: "/docs/observability",
    description:
      "Tap AiEvent streams with createOtelListener and tapEvents for OpenTelemetry and custom sinks.",
  },
  {
    title: "HTTP with Fastify",
    path: "/docs/recipes/fastify",
    description:
      "BYO HTTP recipe using Fastify: agent SSE, interrupt + resume, and Postgres adapters.",
  },
  {
    title: "HTTP with Hono",
    path: "/docs/recipes/hono",
    description:
      "Second BYO HTTP stack on Hono using published @monorch/ai from npm (stream + HITL).",
  },
  {
    title: "HITL refund",
    path: "/docs/recipes/hitl-refund",
    description: "Interrupt + checkpoint resume across HTTP requests.",
  },
  {
    title: "Multi-agent handoff",
    path: "/docs/recipes/handoff",
    description: "triage → billing with handoffs and handoff().",
  },
  {
    title: "MCP stdio / HTTP",
    path: "/docs/recipes/mcp-stdio",
    description: "mcpStdio / mcpHttp + mcpTools bridge for remote tools.",
  },
  {
    title: "LiteLLM proxy",
    path: "/docs/recipes/litellm",
    description: "OpenAI-compatible baseUrl through LiteLLM or similar.",
  },
  {
    title: "Abort + timeouts",
    path: "/docs/recipes/abort",
    description: "AbortSignal on agents and timeoutMs on providers.",
  },
  {
    title: "Structured output",
    path: "/docs/recipes/structured-output",
    description: "Zod → IR → Rust validate via model().generateObject.",
  },
  {
    title: "Graph hot-reload",
    path: "/docs/recipes/hot-reload",
    description: "compile({ replace }) and defHash safety for in-flight runs.",
  },
  {
    title: "@monorch/ai",
    path: "/docs/reference/ai",
    description:
      "Package reference for @monorch/ai: constructors, helpers, types, statuses, and AiEvent keywords.",
  },
  {
    title: "@monorch/ai/openai",
    path: "/docs/reference/openai",
    description:
      "Package reference for openai() and mock() providers: options, streaming, abort, and timeouts.",
  },
  {
    title: "@monorch/ai/postgres",
    path: "/docs/reference/postgres",
    description:
      "Package reference for Postgres adapters: ensureMonorchSchema, checkpointer, threads, and store.",
  },
  {
    title: "@monorch/runtime",
    path: "/docs/reference/runtime",
    description:
      "Package reference for the N-API Rust engine binding. Prefer @monorch/ai in application code.",
  },
  {
    title: "Error codes",
    path: "/docs/reference/errors",
    description: "Failure modes and stable AiError codes — abort, tools, interrupt, def-hash.",
  },
];

export function absoluteUrl(path = "/") {
  const base = siteConfig.url.replace(/\/$/, "");
  if (!path || path === "/") return base;
  return `${base}${path.startsWith("/") ? path : `/${path}`}`;
}

/** Install snippet for homepage / docs — npm by default; monorepo when NEXT_PUBLIC_NPM_PUBLISHED=0. */
export function installSnippet(): string {
  if (siteConfig.npmPublished) {
    return `pnpm add @monorch/ai
# optional: pnpm add pg   # only for @monorch/ai/postgres`;
  }
  const repo = siteConfig.github.replace(/\/$/, "").replace(/\.git$/i, "");
  return `# Build from source (site preview override — packages are on npm)
git clone ${repo}.git
cd monorch
pnpm install
pnpm build          # includes native @monorch/runtime
pnpm smoke          # examples/fastify (BYO HTTP smoke)

# App code imports workspace packages:
#   "@monorch/ai": "workspace:*"`;
}
