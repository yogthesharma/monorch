import { docPages } from "@/lib/site";
import { docMetadata } from "@/lib/seo";
import { DocCode, DocH1, DocH2, DocLead, DocP } from "@/components/docs/doc-blocks";
import { DocFaq } from "@/components/docs/doc-faq";

const page = docPages.find((p) => p.path === "/docs/mcp")!;
export const metadata = docMetadata(page);

export default function McpPage() {
  return (
    <>
      <DocH1>MCP</DocH1>
      <DocLead>
        Connect Model Context Protocol servers over <strong>stdio</strong> or{" "}
        <strong>Streamable HTTP</strong> (with SSE fallback), then register their tools as normal{" "}
        <code className="font-mono text-sm">tool()</code> definitions.
      </DocLead>

      <DocH2>Stdio transport</DocH2>
      <DocP>
        Spawns a local MCP server process. Use this for filesystem / desktop-style servers.
      </DocP>
      <DocCode lang="typescript" filename="mcp-stdio.ts">{`import { mcpStdio, mcpTools, agent } from "@monorch/ai";

const session = await mcpStdio({
  command: "npx",
  args: ["-y", "@modelcontextprotocol/server-filesystem", "/tmp"],
});

const tools = await mcpTools(session, {
  prefix: "fs_",
  permission: { type: "roles", roles: ["agent"] },
});

const bot = agent({
  model,
  tools,
  instructions: "Use filesystem tools when needed.",
});

// later
await session.close();`}</DocCode>

      <DocH2>HTTP transport</DocH2>
      <DocP>
        Connects to a remote MCP endpoint. Default mode tries Streamable HTTP, then falls back to
        legacy SSE.
      </DocP>
      <DocCode lang="typescript" filename="mcp-http.ts">{`import { mcpHttp, mcpTools } from "@monorch/ai";

const session = await mcpHttp({
  url: "https://mcp.example.com/mcp",
  headers: { authorization: \`Bearer \${token}\` },
  // transport: "streamable-http" | "sse" | "auto" (default)
});

const tools = await mcpTools(session, { prefix: "remote_" });
await session.close();`}</DocCode>

      <DocH2>Mock transport (tests)</DocH2>
      <DocCode lang="typescript" filename="mcp-mock.ts">{`import { mcpTools, mockMcp } from "@monorch/ai";

const remote = mockMcp([
  {
    name: "lookup_order",
    description: "Look up an order",
    inputSchema: {
      type: "object",
      properties: { orderId: { type: "string" } },
      required: ["orderId"],
    },
    execute: (args) => ({ orderId: args.orderId, status: "paid" }),
  },
]);

await mcpTools(remote, { prefix: "mcp_" });
// registers mcp_lookup_order with JSON Schema → Rust IR`}</DocCode>

      <DocH2>Transport shape</DocH2>
      <DocCode lang="typescript" filename="transport.ts">{`type McpTransport = {
  listTools(): Promise<McpToolInfo[]> | McpToolInfo[];
  callTool(name: string, args: unknown): Promise<JsonValue> | JsonValue;
};

type McpSession = McpTransport & { close(): Promise<void> };`}</DocCode>
      <DocP>
        BYO transports still work — implement list/call yourself if you already wrap another SDK.
      </DocP>

      <DocFaq
        path="/docs/mcp"
        items={[
          {
            q: "Which MCP SDK does Monorch use?",
            a: "@modelcontextprotocol/sdk (client stdio + Streamable HTTP + SSE). Server packages are only needed if you author MCP servers.",
          },
          {
            q: "Are MCP input schemas validated?",
            a: "Yes. mcpTools maps JSON Schema inputSchema into the Rust IR when possible (object/string/number/boolean/array/enum/union).",
          },
          {
            q: "Do prefixes matter?",
            a: "Yes for avoiding collisions with local tools. Default prefix is mcp_.",
          },
          {
            q: "Can agents mix local and MCP tools?",
            a: "Yes. Pass [...localTools, ...mcpTools] into agent({ tools }).",
          },
          {
            q: "Where is this smoked?",
            a: "The repo smoke covers mock MCP, a real stdio demo server, and a Streamable HTTP demo server.",
          },
          {
            q: "When do I call close()?",
            a: "When you are done with a stdio/HTTP session — especially stdio, which holds a child process.",
          },
        ]}
      />
    </>
  );
}
