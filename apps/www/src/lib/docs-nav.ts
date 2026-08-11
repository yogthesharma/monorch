export type DocNavItem = {
  title: string;
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
      { title: "Introduction", href: "/docs" },
      { title: "Getting started", href: "/docs/getting-started" },
      { title: "Fastify in 5 minutes", href: "/docs/recipes/fastify" },
      { title: "Compare", href: "/docs/compare" },
      { title: "Changelog", href: "/docs/changelog" },
      { title: "Architecture", href: "/docs/architecture" },
    ],
  },
  {
    title: "Core",
    items: [
      { title: "Agents", href: "/docs/agents" },
      { title: "Tools", href: "/docs/tools" },
      { title: "Graphs", href: "/docs/graphs" },
      { title: "Checkpoints", href: "/docs/checkpoints" },
      { title: "Streaming", href: "/docs/streaming" },
      { title: "Workflows", href: "/docs/workflows" },
    ],
  },
  {
    title: "Integrations",
    items: [
      { title: "Providers", href: "/docs/providers" },
      { title: "MCP", href: "/docs/mcp" },
      { title: "Memory", href: "/docs/memory" },
      { title: "Observability", href: "/docs/observability" },
    ],
  },
  {
    title: "Reference",
    items: [
      { title: "@monorch/ai", href: "/docs/reference/ai" },
      { title: "@monorch/ai/openai", href: "/docs/reference/openai" },
      { title: "@monorch/ai/postgres", href: "/docs/reference/postgres" },
      { title: "@monorch/runtime", href: "/docs/reference/runtime" },
    ],
  },
];

export function findDocTitle(pathname: string): string {
  for (const group of docsNav) {
    const hit = group.items.find((i) => i.href === pathname);
    if (hit) return hit.title;
  }
  return "Docs";
}

export function flattenDocsNav(): DocNavItem[] {
  return docsNav.flatMap((g) => g.items);
}
