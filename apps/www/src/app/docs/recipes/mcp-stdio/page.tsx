import Link from "next/link";
import { DocCode, DocH1, DocH2, DocLead, DocP } from "@/components/docs/doc-blocks";
import { DocFaq } from "@/components/docs/doc-faq";
import { docMetadata } from "@/lib/seo";
import { docPages } from "@/lib/site";

const page = docPages.find((p) => p.path === "/docs/recipes/mcp-stdio")!;
export const metadata = docMetadata(page);

export default function McpStdioRecipePage() {
  return (
    <>
      <DocH1>MCP stdio / HTTP</DocH1>
      <DocLead>
        Bridge MCP tools into Monorch{" "}
        <code className="font-mono text-sm">tool()</code> defs via{" "}
        <code className="font-mono text-sm">mcpTools</code>. Use stdio for local processes or{" "}
        <code className="font-mono text-sm">mcpHttp</code> for Streamable HTTP / SSE.
      </DocLead>

      <DocH2>stdio</DocH2>
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

      <DocH2>HTTP (Streamable + SSE fallback)</DocH2>
      <DocCode lang="typescript" filename="mcp-http.ts">{`import { agent, mcpHttp, mcpTools } from "@monorch/ai";
import { openai } from "@monorch/ai/openai";

const session = await mcpHttp({
  url: process.env.MCP_URL ?? "http://127.0.0.1:3101/mcp",
  // headers?: { authorization: "Bearer …" }
});

const tools = await mcpTools(session, { prefix: "remote_" });
const bot = agent({
  name: "remote",
  model: openai("gpt-4.1-mini"),
  tools,
});

await bot.run("Call the remote ping tool");
await session.close();`}</DocCode>

      <DocH2>Notes</DocH2>
      <DocP>
        Prefer a prefix to avoid colliding with local tool names. For tests,{" "}
        <code className="font-mono text-sm">mockMcp</code> skips a real process. Connect failures
        surface as <code className="font-mono text-sm">MCP_CONNECT</code> — see{" "}
        <Link
          href="/docs/reference/errors"
          className="text-foreground underline-offset-4 hover:underline"
        >
          Errors &amp; failure modes
        </Link>
        .
      </DocP>

      <DocFaq
        path="/docs/recipes/mcp-stdio"
        items={[
          {
            q: "Does mcpTools use the same prepare path?",
            a: "Yes. mcpTools uses toolWithIr + jsonSchemaToIr so remote tools register like local tools.",
          },
          {
            q: "What if Streamable HTTP fails?",
            a: "mcpHttp tries Streamable HTTP then falls back to SSE before throwing MCP_CONNECT.",
          },
        ]}
      />
    </>
  );
}
