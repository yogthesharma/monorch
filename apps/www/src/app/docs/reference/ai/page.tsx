import Link from "next/link";
import { docPages } from "@/lib/site";
import { docMetadata } from "@/lib/seo";
import {
  DocCode,
  DocH1,
  DocH2,
  DocH3,
  DocLead,
  DocP,
  DocTerm,
  DocTerms,
} from "@/components/docs/doc-blocks";
import { DocFaq } from "@/components/docs/doc-faq";

const page = docPages.find((p) => p.path === "/docs/reference/ai")!;
export const metadata = docMetadata(page);

export default function AiReferencePage() {
  return (
    <>
      <DocH1>
        <code className="font-mono text-[0.9em]">@monorch/ai</code>
      </DocH1>
      <DocLead>
        Sole user-facing TypeScript API. Agents, tools, graphs, memory helpers, MCP bridges, events,
        and errors. Guides under Core / Integrations own the tutorials; this page is the package
        surface.
      </DocLead>

      <DocH2>Install</DocH2>
      <DocCode lang="bash" filename="shell">{`pnpm add @monorch/ai
# peer: zod; native: @monorch/runtime (workspace / published platform package)`}</DocCode>

      <DocH2>Constructors</DocH2>
      <DocTerms>
        <DocTerm name="tool(def)">
          Register a Zod-validated tool. Also{" "}
          <code className="font-mono text-sm">toolWithIr</code> +{" "}
          <code className="font-mono text-sm">jsonSchemaToIr</code> when you already have JSON
          Schema (see Tools).
        </DocTerm>
        <DocTerm name="agent(options)">
          Create/register an agent. Methods:{" "}
          <code className="font-mono text-sm">run</code>,{" "}
          <code className="font-mono text-sm">stream</code>,{" "}
          <code className="font-mono text-sm">handoff</code>.
        </DocTerm>
        <DocTerm name="graph(name)">
          Graph builder. Prefer over <code className="font-mono text-sm">workflow()</code>.
        </DocTerm>
        <DocTerm name="workflow(name?)">
          Linear sugar over graph. <code className="font-mono text-sm">maxRetries</code> is a no-op;
          use <code className="font-mono text-sm">maxSteps</code>.
        </DocTerm>
        <DocTerm name="model(provider)">
          Handle with <code className="font-mono text-sm">generate</code> /{" "}
          <code className="font-mono text-sm">stream</code> /{" "}
          <code className="font-mono text-sm">generateObject</code>.
        </DocTerm>
        <DocTerm name="openai / mock">
          Re-exported from{" "}
          <Link
            href="/docs/reference/openai"
            className="text-foreground underline-offset-4 hover:underline"
          >
            @monorch/ai/openai
          </Link>{" "}
          for convenience.
        </DocTerm>
      </DocTerms>

      <DocH2>Helpers</DocH2>
      <DocTerms>
        <DocTerm name="getAgent(name)">Process agent registry lookup.</DocTerm>
        <DocTerm name="callTool / listTools">Execute or list registered tools.</DocTerm>
        <DocTerm name="memorySaver()">In-process checkpointer.</DocTerm>
        <DocTerm name="inMemoryStore / inMemoryThreads">
          Process-local helpers. Store is BYO from nodes/tools; threads wire into{" "}
          <code className="font-mono text-sm">agent.run</code> via{" "}
          <code className="font-mono text-sm">threadId</code> +{" "}
          <code className="font-mono text-sm">memory</code>.
        </DocTerm>
        <DocTerm name="mcpTools / mockMcp / mcpStdio / mcpHttp">
          MCP → <code className="font-mono text-sm">tool()</code>. See{" "}
          <Link href="/docs/mcp" className="text-foreground underline-offset-4 hover:underline">
            MCP
          </Link>
          .
        </DocTerm>
        <DocTerm name="jsonSchemaToIr / zodToIr">Schema IR for Rust validation.</DocTerm>
        <DocTerm name="createOtelListener / tapEvents / collectEvents">
          Observability and test helpers on AiEvent.
        </DocTerm>
        <DocTerm name="getRuntime()">Native Engine escape hatch.</DocTerm>
        <DocTerm name="AiError">Typed error with <code className="font-mono text-sm">code</code>.</DocTerm>
      </DocTerms>

      <DocH2>Graph builder API</DocH2>
      <DocTerms>
        <DocTerm name=".node / .agentNode / .interrupt / .edge / .compile">
          Define and register a graph. Compile options:{" "}
          <code className="font-mono text-sm">checkpointer?</code>,{" "}
          <code className="font-mono text-sm">maxSteps?</code>,{" "}
          <code className="font-mono text-sm">replace?</code>.
        </DocTerm>
        <DocTerm name="start / restore / drive / resume / stream / checkpoint">
          Compiled graph and run-handle methods.
        </DocTerm>
        <DocTerm name="GRAPH_END">
          Constant <code className="font-mono text-sm">&quot;__end__&quot;</code> edge target.
        </DocTerm>
      </DocTerms>

      <DocH2>Keywords</DocH2>
      <DocH3>GraphRunStatus</DocH3>
      <DocP>
        <code className="font-mono text-sm">pending</code>,{" "}
        <code className="font-mono text-sm">running</code>,{" "}
        <code className="font-mono text-sm">waitingInterrupt</code>,{" "}
        <code className="font-mono text-sm">needsRoute</code>,{" "}
        <code className="font-mono text-sm">completed</code>,{" "}
        <code className="font-mono text-sm">failed</code>. Workflows may still surface{" "}
        <code className="font-mono text-sm">waitingHuman</code>.
      </DocP>

      <DocH3>run_end.status</DocH3>
      <DocP>
        <code className="font-mono text-sm">completed</code>,{" "}
        <code className="font-mono text-sm">failed</code>,{" "}
        <code className="font-mono text-sm">handed_off</code>,{" "}
        <code className="font-mono text-sm">aborted</code>,{" "}
        <code className="font-mono text-sm">waitingInterrupt</code>.
      </DocP>

      <DocH3>AiEvent.type</DocH3>
      <DocCode lang="typescript" filename="events.ts">{`run_start | text | tool_call | tool_result
| node_start | node_end | interrupt | handoff
| error | run_end`}</DocCode>

      <DocH3>Option keys</DocH3>
      <DocTerms>
        <DocTerm name="AgentOptions">
          name?, model, instructions?, tools?, handoffs?, maxSteps?, onEvent?
        </DocTerm>
        <DocTerm name="AgentRunOptions">threadId?, memory?, signal?</DocTerm>
        <DocTerm name="ToolDefinition">
          name, description?, input, permission? (allow | deny | roles), execute
        </DocTerm>
        <DocTerm name="ToolPermission">
          <code className="font-mono text-sm">{`{ type: "allow" }`}</code>,{" "}
          <code className="font-mono text-sm">{`{ type: "deny" }`}</code>, or{" "}
          <code className="font-mono text-sm">{`{ type: "roles", roles: string[] }`}</code>
        </DocTerm>
      </DocTerms>

      <DocH3>Common AiError codes</DocH3>
      <DocP>
        <code className="font-mono text-sm">ABORTED</code>,{" "}
        <code className="font-mono text-sm">AGENT_FAILED</code>,{" "}
        <code className="font-mono text-sm">AGENT_MISSING</code>,{" "}
        <code className="font-mono text-sm">HANDOFF_DENIED</code>,{" "}
        <code className="font-mono text-sm">GRAPH_FAILED</code>,{" "}
        <code className="font-mono text-sm">GRAPH_ROUTE</code>,{" "}
        <code className="font-mono text-sm">CHECKPOINT_NOT_FOUND</code>,{" "}
        <code className="font-mono text-sm">VALIDATION_FAILED</code>,{" "}
        <code className="font-mono text-sm">NODE_MISSING</code>.
      </DocP>

      <DocFaq
        path="/docs/reference/ai"
        items={[
          {
            q: "Is this a tutorial?",
            a: "No. Use Core and Integrations for how-to. This page is the package map for @monorch/ai.",
          },
          {
            q: "Where are openai() and postgres adapters documented?",
            a: "Sibling Reference pages for @monorch/ai/openai and @monorch/ai/postgres. Error codes have their own Reference page.",
          },
          {
            q: "Do I import @monorch/runtime directly?",
            a: "Almost never. @monorch/ai loads it. See the runtime reference if you are debugging the FFI.",
          },
        ]}
      />
    </>
  );
}
