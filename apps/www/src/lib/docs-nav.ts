export type DocNavItem = {
  title: string;
  description?: string;
  href: string;
};

export type DocNavGroup = {
  title: string;
  items: DocNavItem[];
};

export const docsNav: DocNavGroup[] = [
  {
    title: "Start",
    items: [
      { title: "Introduction", href: "/docs", description: "What Monorch is" },
      {
        title: "Getting started",
        href: "/docs/getting-started",
        description: "Install and smoke",
      },
      {
        title: "Public API",
        href: "/docs/api",
        description: "Supported exports + SemVer",
      },
      {
        title: "Upgrade guide",
        href: "/docs/upgrade",
        description: "0.x → 1.0 notes",
      },
      {
        title: "Release candidate",
        href: "/docs/rc",
        description: "API freeze + checklist",
      },
    ],
  },
  {
    title: "Core",
    items: [
      { title: "Agents", href: "/docs/agents", description: "run, stream, handoffs" },
      { title: "Tools", href: "/docs/tools", description: "Zod tools + permissions" },
      { title: "Graphs", href: "/docs/graphs", description: "Nodes, edges, interrupt" },
      { title: "Checkpoints", href: "/docs/checkpoints", description: "Persist and restore" },
      { title: "Streaming", href: "/docs/streaming", description: "AiEvent bus" },
      { title: "Workflows", href: "/docs/workflows", description: "Linear graph sugar" },
    ],
  },
  {
    title: "Integrations",
    items: [
      { title: "Providers", href: "/docs/providers", description: "openai + mock" },
      { title: "MCP", href: "/docs/mcp", description: "stdio / HTTP tools" },
      { title: "Memory", href: "/docs/memory", description: "Store + threads" },
      { title: "Observability", href: "/docs/observability", description: "OTel via AiEvent" },
    ],
  },
  {
    title: "Recipes",
    items: [
      {
        title: "HTTP with Fastify",
        href: "/docs/recipes/fastify",
        description: "BYO HTTP (Fastify)",
      },
      {
        title: "HTTP with Hono",
        href: "/docs/recipes/hono",
        description: "BYO HTTP from npm",
      },
      {
        title: "HITL refund",
        href: "/docs/recipes/hitl-refund",
        description: "Interrupt + checkpoint resume",
      },
      {
        title: "Multi-agent handoff",
        href: "/docs/recipes/handoff",
        description: "triage → billing",
      },
      {
        title: "MCP stdio / HTTP",
        href: "/docs/recipes/mcp-stdio",
        description: "Local or remote MCP tools",
      },
      {
        title: "LiteLLM proxy",
        href: "/docs/recipes/litellm",
        description: "OpenAI-compatible baseUrl",
      },
      {
        title: "Abort + timeouts",
        href: "/docs/recipes/abort",
        description: "AbortSignal and timeoutMs",
      },
      {
        title: "Structured output",
        href: "/docs/recipes/structured-output",
        description: "Zod → IR → Rust validate",
      },
      {
        title: "Graph hot-reload",
        href: "/docs/recipes/hot-reload",
        description: "compile({ replace })",
      },
    ],
  },
  {
    title: "Reference",
    items: [
      { title: "@monorch/ai", href: "/docs/reference/ai", description: "Main package surface" },
      {
        title: "@monorch/ai/openai",
        href: "/docs/reference/openai",
        description: "Provider constructors",
      },
      {
        title: "@monorch/ai/postgres",
        href: "/docs/reference/postgres",
        description: "Durable adapters",
      },
      {
        title: "@monorch/runtime",
        href: "/docs/reference/runtime",
        description: "N-API engine binding",
      },
      {
        title: "Error codes",
        href: "/docs/reference/errors",
        description: "Failure modes and AiError codes",
      },
    ],
  },
];

export function findDocTitle(pathname: string): string {
  const normalized = pathname.replace(/\/$/, "") || "/";
  for (const group of docsNav) {
    const hit = group.items.find((i) => i.href === normalized);
    if (hit) return hit.title;
  }
  return "Docs";
}

export function flattenDocsNav(): DocNavItem[] {
  return docsNav.flatMap((g) => g.items);
}

export function docsNavNeighbors(pathname: string): {
  prev: DocNavItem | null;
  next: DocNavItem | null;
} {
  const normalized = pathname.replace(/\/$/, "") || "/";
  const flat = flattenDocsNav();
  const idx = flat.findIndex((i) => i.href === normalized);
  if (idx < 0) return { prev: null, next: null };
  return {
    prev: idx > 0 ? flat[idx - 1]! : null,
    next: idx < flat.length - 1 ? flat[idx + 1]! : null,
  };
}

export function slugifyHeading(input: string): string {
  return input
    .toLowerCase()
    .replace(/&amp;/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}
