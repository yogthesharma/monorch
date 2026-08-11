/**
 * Demo MCP server (stdio) — used by Fastify smoke via mcpStdio().
 * Tools: lookup_order, echo.
 */
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

const server = new McpServer({ name: "monorch-demo", version: "0.1.0" });

server.registerTool(
  "lookup_order",
  {
    description: "Look up an order by id",
    inputSchema: {
      orderId: z.string().describe("Order id"),
    },
  },
  async ({ orderId }) => ({
    content: [
      {
        type: "text",
        text: JSON.stringify({ orderId, status: "paid", source: "stdio-mcp" }),
      },
    ],
  }),
);

server.registerTool(
  "echo",
  {
    description: "Echo a message",
    inputSchema: {
      message: z.string(),
    },
  },
  async ({ message }) => ({
    content: [{ type: "text", text: JSON.stringify({ echo: message }) }],
  }),
);

const transport = new StdioServerTransport();
await server.connect(transport);
