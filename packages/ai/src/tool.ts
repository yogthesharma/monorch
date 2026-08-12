import type { z } from "zod";
import { AiError } from "./errors.js";
import { getRuntime } from "./native.js";
import type { Awaitable, JsonValue } from "./types.js";
import { zodToIr } from "./zod-ir.js";

export type ToolPermission =
  | { type: "allow" }
  | { type: "deny" }
  | { type: "roles"; roles: string[] };

export type ToolCaller = {
  roles?: string[];
  subject?: string;
};

export type ToolDefinition<I extends z.ZodTypeAny = z.ZodTypeAny, O = unknown> = {
  name: string;
  description?: string;
  input: I;
  permission?: ToolPermission;
  execute: (input: z.infer<I>, ctx: { caller: ToolCaller }) => Awaitable<O>;
};

export type ToolRegisterOptions = {
  /**
   * Replace an existing tool with the same name (hot-reload / MCP re-bind).
   * Default false — duplicate names throw AiError TOOL_ALREADY_REGISTERED.
   */
  replace?: boolean;
};

export type RegisteredTool = ToolDefinition & {
  /** @internal */
  _ir: unknown;
};

const executors = new Map<string, RegisteredTool>();

function permissionToRust(p?: ToolPermission): unknown {
  if (!p || p.type === "allow") return "allow";
  if (p.type === "deny") return "deny";
  return { roles: p.roles };
}

/** Define and register a tool (validated + authorized in Rust). */
export function tool<I extends z.ZodTypeAny, O>(
  def: ToolDefinition<I, O>,
  opts?: ToolRegisterOptions,
): ToolDefinition<I, O> {
  const ir = zodToIr(def.input);
  return registerTool(def, ir, opts);
}

/**
 * Register a tool with an explicit Rust IR schema (e.g. from MCP JSON Schema).
 * `input` is only used for TypeScript typing — prefer `z.object({}).passthrough()`.
 */
export function toolWithIr<I extends z.ZodTypeAny, O>(
  def: ToolDefinition<I, O> & { inputIr: unknown },
  opts?: ToolRegisterOptions,
): ToolDefinition<I, O> {
  const { inputIr, ...rest } = def;
  return registerTool(rest, inputIr, opts);
}

function registerTool<I extends z.ZodTypeAny, O>(
  def: ToolDefinition<I, O>,
  ir: unknown,
  opts?: ToolRegisterOptions,
): ToolDefinition<I, O> {
  getRuntime().toolRegisterWith(
    {
      name: def.name,
      description: def.description ?? def.name,
      inputSchema: ir,
      permission: permissionToRust(def.permission),
    },
    opts?.replace ?? false,
  );
  const registered = { ...def, _ir: ir } as RegisteredTool;
  executors.set(def.name, registered);
  return def;
}

/** Execute a registered tool with Rust prepare (auth + parse). */
export async function callTool(
  name: string,
  args: unknown,
  caller: ToolCaller = { roles: ["agent"] },
): Promise<unknown> {
  const prepared = getRuntime().toolPrepare(name, caller, args ?? null);
  if (!prepared.ok) {
    throw new AiError("TOOL_PREPARE_FAILED", `tool prepare failed: ${name}`, {
      error: prepared.error,
    });
  }
  const exec = executors.get(name);
  if (!exec) throw new AiError("TOOL_MISSING", `tool executor missing: ${name}`);
  return exec.execute(prepared.value, { caller });
}

export function listTools(): Array<{ name: string; description: string }> {
  const raw = getRuntime().toolList() as Array<{ name: string; description: string }>;
  return raw.map((t) => ({ name: t.name, description: t.description }));
}

export function getTool(name: string): RegisteredTool | undefined {
  return executors.get(name);
}

export function toolParameters(name: string): unknown {
  const t = executors.get(name);
  const ir = t?._ir ?? { type: "object", additionalProperties: true };
  return getRuntime().toJsonSchema(ir);
}
