export const siteConfig = {
  name: "Monorch",
  tagline: "AI control plane for TypeScript",
  description:
    "Agents, tools, graphs, and workflows as a TypeScript library with a Rust execution engine. Bring your own Fastify or Hono.",
  /** Keep in sync with packages/ai package.json */
  version: "0.1.0",
  /**
   * Flip to true when `@monorch/ai` is on the public npm registry.
   * Until then the site shows monorepo / git install paths only.
   */
  npmPublished: process.env.NEXT_PUBLIC_NPM_PUBLISHED === "1",
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "https://monorch.ai",
  locale: "en_US",
  twitter: "@monorch",
  github: process.env.NEXT_PUBLIC_GITHUB_URL ?? "https://github.com/monorch/monorch",
  npm: "https://www.npmjs.com/package/@monorch/ai",
  discussions:
    process.env.NEXT_PUBLIC_DISCUSSIONS_URL ??
    "https://github.com/monorch/monorch/discussions",
  keywords: [
    "Monorch",
    "TypeScript AI agents",
    "Rust AI engine",
    "agent workflow library",
    "MCP tools",
    "graph checkpoints",
    "OpenAI compatible",
    "Fastify AI",
    "Hono AI",
    "AiEvent streaming",
  ],
};

export type DocPageMeta = {
  title: string;
  description: string;
  path: string;
};

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
      "Install, build the native runtime, run the Fastify smoke, and copy the smallest agent and graph patterns.",
  },
  {
    title: "Fastify in 5 minutes",
    path: "/docs/recipes/fastify",
    description:
      "End-to-end Fastify recipe: install, agent SSE, interrupt + resume, and Postgres adapters.",
  },
  {
    title: "Compare",
    path: "/docs/compare",
    description:
      "Monorch vs Mastra, LangGraph, and DIY agent loops. Library positioning and product lock.",
  },
  {
    title: "Changelog",
    path: "/docs/changelog",
    description: "Release notes for @monorch/ai and @monorch/runtime.",
  },
  {
    title: "Architecture",
    path: "/docs/architecture",
    description:
      "How @monorch/ai, @monorch/runtime, and the Rust engine split responsibilities across TypeScript and native code.",
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
];

export function absoluteUrl(path = "/") {
  const base = siteConfig.url.replace(/\/$/, "");
  if (!path || path === "/") return base;
  return `${base}${path.startsWith("/") ? path : `/${path}`}`;
}

/** Install snippet for homepage / docs — honest about publish state. */
export function installSnippet(): string {
  if (siteConfig.npmPublished) {
    return `pnpm add @monorch/ai
# optional: pnpm add pg   # only for @monorch/ai/postgres`;
  }
  return `# Packages are developed in the monorepo (npm publish may not be live yet).
git clone ${siteConfig.github}.git
cd monorch
pnpm install
pnpm build          # includes native @monorch/runtime
pnpm smoke          # Fastify example

# App code imports workspace packages:
#   "@monorch/ai": "workspace:*"`;
}
