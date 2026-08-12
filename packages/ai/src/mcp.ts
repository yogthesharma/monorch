import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js";
import {
  StdioClientTransport,
  type StdioServerParameters,
} from "@modelcontextprotocol/sdk/client/stdio.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import type { Transport } from "@modelcontextprotocol/sdk/shared/transport.js";
import { z } from "zod";
import { AiError } from "./errors.js";
import { toolWithIr, type ToolDefinition } from "./tool.js";
import type { JsonValue } from "./types.js";

export type McpToolInfo = {
  name: string;
  description?: string;
  /** JSON Schema for tool arguments (MCP `inputSchema`). */
  inputSchema?: Record<string, unknown>;
};

/** Minimal MCP-shaped transport — list + call. */
export type McpTransport = {
  listTools(): Promise<McpToolInfo[]> | McpToolInfo[];
  callTool(name: string, args: unknown): Promise<JsonValue> | JsonValue;
};

/** Connected MCP session (stdio / HTTP) with lifecycle. */
export type McpSession = McpTransport & {
  close(): Promise<void>;
};

export type McpToolsOptions = {
  /** Prefix tool names to avoid collisions (default: `mcp_`). */
  prefix?: string;
  permission?: ToolDefinition["permission"];
  /**
   * Replace existing tool names on re-bind (default true — MCP hot-reload).
   * Pass false to fail on duplicates like local `tool()`.
   */
  replace?: boolean;
};

export type McpStdioOptions = StdioServerParameters & {
  /** Client name advertised during initialize (default: monorch). */
  clientName?: string;
  clientVersion?: string;
};

export type McpHttpOptions = {
  url: string | URL;
  headers?: Record<string, string>;
  /**
   * Prefer legacy SSE transport (HTTP+SSE). Default tries Streamable HTTP first,
   * then falls back to SSE on failure.
   */
  transport?: "streamable-http" | "sse" | "auto";
  clientName?: string;
  clientVersion?: string;
};

/**
 * Register remote MCP tools as local `tool()` definitions.
 * Maps JSON Schema `inputSchema` into the Rust IR when possible.
 */
export async function mcpTools(
  transport: McpTransport,
  opts: McpToolsOptions = {},
): Promise<ToolDefinition[]> {
  const prefix = opts.prefix ?? "mcp_";
  const replace = opts.replace ?? true;
  const listed = await transport.listTools();
  const out: ToolDefinition[] = [];

  for (const info of listed) {
    const name = `${prefix}${info.name}`;
    const ir = jsonSchemaToIr(info.inputSchema);
    const def = toolWithIr(
      {
        name,
        description: info.description ?? info.name,
        input: z.object({}).passthrough(),
        inputIr: ir,
        ...(opts.permission ? { permission: opts.permission } : {}),
        execute: async (args) => transport.callTool(info.name, args),
      },
      { replace },
    ) as unknown as ToolDefinition;
    out.push(def);
  }
  return out;
}

/** In-process fake MCP server for tests / smoke. */
export function mockMcp(
  tools: Array<{
    name: string;
    description?: string;
    inputSchema?: Record<string, unknown>;
    execute: (args: unknown) => JsonValue | Promise<JsonValue>;
  }>,
): McpTransport {
  const map = new Map(tools.map((t) => [t.name, t]));
  return {
    listTools() {
      return tools.map((t) => ({
        name: t.name,
        ...(t.description ? { description: t.description } : {}),
        inputSchema: t.inputSchema ?? {
          type: "object",
          additionalProperties: true,
        },
      }));
    },
    async callTool(name, args) {
      const t = map.get(name);
      if (!t) throw new AiError("MCP_TOOL_MISSING", `mcp tool not found: ${name}`);
      return t.execute(args);
    },
  };
}

/** Connect to an MCP server over stdio (spawns the process). */
export async function mcpStdio(opts: McpStdioOptions): Promise<McpSession> {
  try {
    const { clientName, clientVersion, ...server } = opts;
    const transport = new StdioClientTransport({
      ...server,
      stderr: server.stderr ?? "inherit",
    });
    return await connectSession(transport, clientName, clientVersion);
  } catch (err) {
    throw asMcpConnect(err, "MCP stdio connect failed");
  }
}

/**
 * Connect to a remote MCP server over Streamable HTTP (default) or legacy SSE.
 * `transport: "auto"` tries Streamable HTTP, then falls back to SSE.
 */
export async function mcpHttp(opts: McpHttpOptions): Promise<McpSession> {
  const url = typeof opts.url === "string" ? new URL(opts.url) : opts.url;
  const mode = opts.transport ?? "auto";
  const httpOpts = opts.headers ? { requestInit: { headers: opts.headers } as RequestInit } : {};

  if (mode === "sse") {
    try {
      const transport = new SSEClientTransport(url, httpOpts);
      return await connectSession(transport as never, opts.clientName, opts.clientVersion);
    } catch (err) {
      throw asMcpConnect(err, "MCP SSE connect failed");
    }
  }

  if (mode === "streamable-http") {
    try {
      const transport = new StreamableHTTPClientTransport(url, httpOpts);
      return await connectSession(transport as never, opts.clientName, opts.clientVersion);
    } catch (err) {
      throw asMcpConnect(err, "MCP Streamable HTTP connect failed");
    }
  }

  let streamableErr: unknown;
  const streamable = new StreamableHTTPClientTransport(url, httpOpts);
  try {
    return await connectSession(streamable as never, opts.clientName, opts.clientVersion);
  } catch (err) {
    streamableErr = err;
    await closeTransport(streamable);
  }

  try {
    const sse = new SSEClientTransport(url, httpOpts);
    return await connectSession(sse as never, opts.clientName, opts.clientVersion);
  } catch (sseErr) {
    throw new AiError(
      "MCP_CONNECT",
      `MCP HTTP connect failed (streamable + sse). streamable: ${stringifyErr(streamableErr)}; sse: ${stringifyErr(sseErr)}`,
      {
        streamable: stringifyErr(streamableErr),
        sse: stringifyErr(sseErr),
      },
    );
  }
}

function asMcpConnect(err: unknown, prefix: string): AiError {
  if (err instanceof AiError && err.code === "MCP_CONNECT") return err;
  return new AiError("MCP_CONNECT", `${prefix}: ${stringifyErr(err)}`, {
    cause: stringifyErr(err),
  });
}

function stringifyErr(err: unknown): string {
  if (err instanceof Error) return err.message || err.name;
  return String(err);
}

async function closeTransport(transport: { close?: () => Promise<void> | void }): Promise<void> {
  try {
    await transport.close?.();
  } catch {
    // best-effort teardown before SSE fallback
  }
}

async function connectSession(
  transport: Transport,
  clientName = "monorch",
  clientVersion = "0.1.0",
): Promise<McpSession> {
  const client = new Client({ name: clientName, version: clientVersion });
  try {
    await client.connect(transport);
  } catch (err) {
    await closeTransport(transport);
    throw err;
  }

  return {
    async listTools() {
      const res = await client.listTools();
      return res.tools.map((t) => ({
        name: t.name,
        ...(t.description ? { description: t.description } : {}),
        ...(t.inputSchema
          ? { inputSchema: t.inputSchema as Record<string, unknown> }
          : {}),
      }));
    },
    async callTool(name, args) {
      const res = await client.callTool({
        name,
        arguments: (args ?? {}) as Record<string, unknown>,
      });
      return callResultToJson(res as {
        content?: Array<{ type: string; text?: string }>;
        structuredContent?: unknown;
        isError?: boolean;
      });
    },
    async close() {
      await client.close();
    },
  };
}

function callResultToJson(res: {
  content?: Array<{ type: string; text?: string }>;
  structuredContent?: unknown;
  isError?: boolean;
}): JsonValue {
  if (res.isError) {
    const text = (res.content ?? [])
      .filter((c) => c.type === "text" && typeof c.text === "string")
      .map((c) => c.text)
      .join("\n");
    throw new AiError("MCP_TOOL_ERROR", text || "mcp tool returned isError");
  }
  if (res.structuredContent != null) {
    return res.structuredContent as JsonValue;
  }
  const texts = (res.content ?? [])
    .filter((c) => c.type === "text" && typeof c.text === "string")
    .map((c) => String(c.text));
  if (texts.length === 1) {
    const only = texts[0]!;
    try {
      return JSON.parse(only) as JsonValue;
    } catch {
      return only;
    }
  }
  if (texts.length > 1) return texts;
  return (res.content ?? []) as unknown as JsonValue;
}

/** Best-effort JSON Schema → Monorch Rust IR. */
export function jsonSchemaToIr(schema?: Record<string, unknown>): unknown {
  if (!schema || typeof schema !== "object") {
    return { type: "object", properties: {}, required: [], additionalProperties: true };
  }
  return convertJsonSchema(schema);
}

function convertJsonSchema(schema: Record<string, unknown>): unknown {
  if (Array.isArray(schema.anyOf) && schema.anyOf.length) {
    return {
      type: "union",
      anyOf: (schema.anyOf as Record<string, unknown>[]).map(convertJsonSchema),
    };
  }
  if (Array.isArray(schema.enum) && schema.enum.length) {
    return { type: "enum", values: schema.enum };
  }

  const t = schema.type;
  if (Array.isArray(t)) {
    const variants = t.map((one) =>
      convertJsonSchema({ ...schema, type: one }),
    );
    return { type: "union", anyOf: variants };
  }

  switch (t) {
    case "string":
      return {
        type: "string",
        ...(typeof schema.minLength === "number" ? { minLength: schema.minLength } : {}),
        ...(typeof schema.maxLength === "number" ? { maxLength: schema.maxLength } : {}),
        ...(typeof schema.pattern === "string" ? { pattern: schema.pattern } : {}),
      };
    case "number":
      return {
        type: "number",
        ...(typeof schema.minimum === "number" ? { minimum: schema.minimum } : {}),
        ...(typeof schema.maximum === "number" ? { maximum: schema.maximum } : {}),
      };
    case "integer":
      return {
        type: "number",
        integer: true,
        ...(typeof schema.minimum === "number" ? { minimum: schema.minimum } : {}),
        ...(typeof schema.maximum === "number" ? { maximum: schema.maximum } : {}),
      };
    case "boolean":
      return { type: "boolean" };
    case "null":
      return { type: "null" };
    case "array": {
      const items =
        schema.items && typeof schema.items === "object" && !Array.isArray(schema.items)
          ? convertJsonSchema(schema.items as Record<string, unknown>)
          : { type: "any" };
      return {
        type: "array",
        items,
        ...(typeof schema.minItems === "number" ? { minItems: schema.minItems } : {}),
        ...(typeof schema.maxItems === "number" ? { maxItems: schema.maxItems } : {}),
      };
    }
    case "object":
    default: {
      const propsIn =
        schema.properties && typeof schema.properties === "object"
          ? (schema.properties as Record<string, Record<string, unknown>>)
          : {};
      const properties: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(propsIn)) {
        properties[k] = convertJsonSchema(v);
      }
      const required = Array.isArray(schema.required)
        ? schema.required.filter((x): x is string => typeof x === "string")
        : [];
      const additionalProperties =
        schema.additionalProperties === false
          ? false
          : schema.additionalProperties === true ||
              Object.keys(propsIn).length === 0
            ? true
            : true;
      return {
        type: "object",
        properties,
        required,
        additionalProperties,
      };
    }
  }
}
