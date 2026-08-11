import { docPages, siteConfig } from "@/lib/site";

export const dynamic = "force-static";

function buildLlmsTxt() {
  const lines = [
    `# ${siteConfig.name}`,
    "",
    `> ${siteConfig.description}`,
    "",
    `Logo: ${siteConfig.url}/logo.svg`,
    "",
    "Monorch is a TypeScript AI control-plane library (`@monorch/ai`) backed by a Rust execution engine (`@monorch/runtime`). It is not a framework, HTTP stack, ORM, Studio, or RAG product. Bring your own Fastify or Hono.",
    "",
    "## Product lock",
    "",
    "- Provide: model/tool/agent/graph/workflow, MCP bridge, memory interfaces, OTel via AiEvent, OpenAI-compatible providers",
    "- Do not provide: HTTP framework, auth/ORM/queues, React chat UI, RAG product, Studio",
    "",
    "## Docs",
    "",
    ...docPages.map((p) => `- [${p.title}](${siteConfig.url}${p.path}): ${p.description}`),
    "",
    "## Packages",
    "",
    "- `@monorch/ai` — sole user-facing TypeScript API",
    "- `@monorch/runtime` — N-API bindings to the Rust engine (no business logic in JS)",
    "",
    "## Optional",
    "",
    `- Full machine-readable overview: ${siteConfig.url}/llms-full.txt`,
    `- Sitemap: ${siteConfig.url}/sitemap.xml`,
    "",
  ];
  return lines.join("\n");
}

export function GET() {
  return new Response(buildLlmsTxt(), {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=86400",
    },
  });
}
