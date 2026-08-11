/**
 * Minimal Streamable HTTP MCP server for smoke tests (stateless, per-request).
 */
import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { z } from "zod";

export type HttpMcpHandle = {
  url: string;
  close(): Promise<void>;
};

function createDemoServer(): McpServer {
  const mcp = new McpServer({ name: "monorch-http-demo", version: "0.1.0" });
  mcp.registerTool(
    "ping",
    {
      description: "Return pong with optional note",
      inputSchema: {
        note: z.string().optional(),
      },
    },
    async ({ note }) => ({
      content: [
        {
          type: "text",
          text: JSON.stringify({ pong: true, note: note ?? null, source: "http-mcp" }),
        },
      ],
    }),
  );
  return mcp;
}

async function readJsonBody(req: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  if (!chunks.length) return undefined;
  const raw = Buffer.concat(chunks).toString("utf8");
  if (!raw) return undefined;
  return JSON.parse(raw) as unknown;
}

export async function startHttpMcpServer(port = 0): Promise<HttpMcpHandle> {
  const server: Server = createServer((req, res) => {
    void handle(req, res);
  });

  async function handle(req: IncomingMessage, res: ServerResponse) {
    const url = new URL(req.url ?? "/", "http://127.0.0.1");
    if (url.pathname !== "/mcp") {
      res.writeHead(404).end("not found");
      return;
    }
    if (req.method === "GET" || req.method === "DELETE") {
      res.writeHead(405, { "content-type": "application/json" });
      res.end(
        JSON.stringify({
          jsonrpc: "2.0",
          error: { code: -32000, message: "Method not allowed." },
          id: null,
        }),
      );
      return;
    }
    if (req.method !== "POST") {
      res.writeHead(405).end();
      return;
    }

    const mcp = createDemoServer();
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
      enableJsonResponse: true,
    });
    try {
      const body = await readJsonBody(req);
      await mcp.connect(transport);
      await transport.handleRequest(req, res, body);
      res.on("close", () => {
        void transport.close();
        void mcp.close();
      });
    } catch (err) {
      if (!res.headersSent) {
        res.writeHead(500, { "content-type": "application/json" });
        res.end(
          JSON.stringify({
            jsonrpc: "2.0",
            error: { code: -32603, message: String(err) },
            id: null,
          }),
        );
      }
      await transport.close().catch(() => {});
      await mcp.close().catch(() => {});
    }
  }

  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, "127.0.0.1", () => resolve());
  });

  const address = server.address();
  if (!address || typeof address === "string") {
    throw new Error("http mcp server failed to bind");
  }

  return {
    url: `http://127.0.0.1:${address.port}/mcp`,
    async close() {
      await new Promise<void>((resolve, reject) => {
        server.close((err) => (err ? reject(err) : resolve()));
      });
    },
  };
}
