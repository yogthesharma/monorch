import { DocCode, DocH1, DocH2, DocLead, DocP } from "@/components/docs/doc-blocks";
import { DocFaq } from "@/components/docs/doc-faq";
import { docMetadata } from "@/lib/seo";
import { docPages } from "@/lib/site";

const page = docPages.find((p) => p.path === "/docs/recipes/mcp-stdio")!;
export const metadata = docMetadata(page);

export default function McpStdioRecipePage() {
  return (
    <>
      <DocH1>MCP stdio</DocH1>
      <DocLead>
        Spawn a local MCP server over stdio and register its tools as Monorch{" "}
        <code className="font-mono text-sm">tool()</code> defs.
      </DocLead>

      <DocH2>Pattern</DocH2>
      <DocCode lang="typescript" filename="mcp-stdio.ts">{`import { agent, mcpStdio, mcpTools } from "@monorch/ai";
import { openai } from "@monorch/ai/openai";

const session = await mcpStdio({
  command: "npx",
  args: ["-y", "@modelcontextprotocol/server-filesystem", "/tmp"],
});

const tools = await mcpTools(session, { prefix: "mcp_" });
const bot = agent({
  name: "files",
  model: openai("gpt-4.1-mini"),
  tools,
  instructions: "Use MCP tools when needed.",
});

await bot.run("List files in /tmp");
await session.close();`}</DocCode>

      <DocH2>Notes</DocH2>
      <DocP>
        Prefer a prefix to avoid colliding with local tool names. For tests,{" "}
        <code className="font-mono text-sm">mockMcp</code> skips a real process.
      </DocP>

      <DocFaq
        path="/docs/recipes/mcp-stdio"
        items={[
          {
            q: "HTTP MCP instead?",
            a: "Use mcpHttp({ url }) for Streamable HTTP / SSE transports. Same mcpTools bridge.",
          },
        ]}
      />
    </>
  );
}
