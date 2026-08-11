/**
 * @monorch/ai — TypeScript AI control-plane library.
 * Runtime truth lives in Rust (`engine/` via `@monorch/runtime`).
 */

export { model } from "./model.js";
export type { ModelHandle } from "./model.js";

export { tool, toolWithIr, callTool, listTools } from "./tool.js";
export type { ToolCaller, ToolDefinition, ToolPermission } from "./tool.js";

export { agent, getAgent } from "./agent.js";
export type { Agent, AgentOptions, AgentResult, AgentRunOptions } from "./agent.js";

export { graph, GRAPH_END } from "./graph.js";
export type {
  CompiledGraph,
  GraphBuilder,
  GraphContext,
  GraphRunHandle,
  GraphRunStatus,
} from "./graph.js";

export { workflow } from "./workflow.js";
export type {
  Workflow,
  WorkflowBuilder,
  WorkflowContext,
  WorkflowRunHandle,
} from "./workflow.js";

export { memorySaver } from "./checkpointer.js";
export type { Checkpointer, CheckpointTuple } from "./checkpointer.js";

export { inMemoryStore, inMemoryThreads } from "./memory.js";
export type { MemoryStore, ThreadMemory } from "./memory.js";

export { mcpTools, mockMcp, mcpStdio, mcpHttp, jsonSchemaToIr } from "./mcp.js";
export type {
  McpHttpOptions,
  McpSession,
  McpStdioOptions,
  McpToolInfo,
  McpToolsOptions,
  McpTransport,
} from "./mcp.js";

export { createOtelListener, tapEvents } from "./otel.js";
export type { OtelHooks } from "./otel.js";

export { collectEvents } from "./events.js";
export type { AiEvent, AiEventListener } from "./events.js";

export { AiError } from "./errors.js";
export { getRuntime } from "./native.js";
export { zodToIr } from "./zod-ir.js";

export type {
  AiMessage,
  AiToolCall,
  Awaitable,
  GenerateOptions,
  GenerateResult,
  JsonObject,
  JsonPrimitive,
  JsonValue,
  ModelProvider,
  StreamChunk,
} from "./types.js";

export { mock, openai } from "./providers/openai.js";
