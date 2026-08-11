import { docPages } from "@/lib/site";
import { docMetadata } from "@/lib/seo";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { DocH1, DocH2, DocLead, DocNext, DocP } from "@/components/docs/doc-blocks";
import { DocFaq } from "@/components/docs/doc-faq";

const page = docPages.find((p) => p.path === "/docs")!;
export const metadata = docMetadata(page);

export default function DocsIntroPage() {
  return (
    <>
      <DocH1>Introduction</DocH1>
      <DocLead>
        Monorch is a TypeScript AI control-plane library backed by a Rust execution engine. It is
        not a framework and not an HTTP stack.
      </DocLead>

      <Alert className="mt-8">
        <AlertTitle>Product lock</AlertTitle>
        <AlertDescription>
          Agents, tools, graphs, checkpoints, AiEvent streaming, MCP bridges, memory interfaces, and
          OTel hooks. Not an HTTP framework, Studio, or RAG product.
        </AlertDescription>
      </Alert>

      <DocH2>What you get</DocH2>
      <DocP>
        <code className="font-mono text-sm">@monorch/ai</code> is the sole user-facing package.
        Validation, tool authorization, agent run state, and graph orchestration live in Rust and
        surface through <code className="font-mono text-sm">@monorch/runtime</code>.
      </DocP>

      <DocH2>Mental model</DocH2>
      <DocP>
        Your Fastify or Hono handler owns HTTP. Monorch owns the agent loop and graph cursor. Model
        HTTP, tool <code className="font-mono text-sm">execute</code>, edge predicates, and
        checkpointer I/O stay in TypeScript. One <code className="font-mono text-sm">AiEvent</code>{" "}
        stream feeds SSE, logs, and optional OpenTelemetry.
      </DocP>

      <DocH2>What feels different</DocH2>
      <DocP>
        Interruptible graphs you can checkpoint across requests. MCP tools that become normal{" "}
        <code className="font-mono text-sm">tool()</code> defs. Handoffs between named agents.
        Observability that reuses the same events you already stream to the UI.
      </DocP>

      <DocFaq
        path="/docs"
        items={[
          {
            q: "Is Monorch a framework like Mastra or Nest?",
            a: "No. It is a library. You keep your server, router, auth, and deployment. Monorch plugs into handlers.",
          },
          {
            q: "Do I need to rewrite my app around Monorch?",
            a: "No. Call agent.run, agent.stream, or graph.start from the routes you already have.",
          },
          {
            q: "Where does Rust show up for me?",
            plain: "Through @monorch/runtime. You rarely touch it directly. Schema parse, permissions, agent steps, and graph advance run there.",
            a: (
              <>
                Through <code className="font-mono text-sm">@monorch/runtime</code>. You rarely
                touch it directly. Schema parse, permissions, agent steps, and graph advance run
                there.
              </>
            ),
          },
          {
            q: "What should I learn first?",
            a: "Tools, then agents with stream, then a linear graph with interrupt + memorySaver. Use Reference for package surfaces (@monorch/ai, openai, postgres, runtime).",
          },
        ]}
      />

      <DocNext href="/docs/getting-started" label="Getting started" />
    </>
  );
}
