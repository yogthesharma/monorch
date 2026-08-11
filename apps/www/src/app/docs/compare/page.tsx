import Link from "next/link";
import { docPages } from "@/lib/site";
import { docMetadata } from "@/lib/seo";
import { DocH1, DocH2, DocLead, DocNext, DocP } from "@/components/docs/doc-blocks";
import { DocFaq } from "@/components/docs/doc-faq";

const page = docPages.find((p) => p.path === "/docs/compare")!;
export const metadata = docMetadata(page);

export default function ComparePage() {
  return (
    <>
      <DocH1>Compare</DocH1>
      <DocLead>
        Monorch is a TypeScript library with a Rust engine. It is not a framework, Studio, or RAG
        product. Here is how that differs from common alternatives.
      </DocLead>

      <DocH2>At a glance</DocH2>
      <div className="mt-6 overflow-x-auto">
        <table className="w-full min-w-[36rem] border-collapse text-left text-base">
          <thead>
            <tr className="border-b border-border/80 text-muted-foreground">
              <th className="py-3 pr-4 font-medium">Dimension</th>
              <th className="py-3 pr-4 font-medium">Monorch</th>
              <th className="py-3 pr-4 font-medium">Mastra</th>
              <th className="py-3 pr-4 font-medium">LangGraph</th>
              <th className="py-3 font-medium">DIY loop</th>
            </tr>
          </thead>
          <tbody className="text-foreground/90">
            {[
              ["Shape", "Library", "Framework", "Library / platform family", "Your code"],
              ["HTTP", "BYO Fastify/Hono", "Owns more of the app shell", "BYO / Lang ecosystem", "Yours"],
              ["Engine", "Rust (validate, agent, graph)", "TypeScript-first stack", "Python-first (+ JS ports)", "None"],
              ["Studio", "No", "Yes (product surface)", "Studio / LangSmith adjacent", "No"],
              ["Events", "AiEvent bus", "Framework events / APIs", "Graph streaming APIs", "Ad hoc"],
              ["Checkpoints", "BYO + memorySaver / Postgres", "Platform patterns", "Built-in persistence story", "Roll your own"],
              ["MCP", "Thin bridge → tool()", "Integrations vary", "Integrations vary", "Roll your own"],
            ].map((row) => (
              <tr key={row[0]} className="border-b border-border/50 align-top">
                {row.map((cell, i) => (
                  <td
                    key={`${row[0]}-${i}`}
                    className={`py-3 pr-4 ${i === 0 ? "font-medium text-ink" : "text-muted-foreground"}`}
                  >
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <DocH2>Vs Mastra</DocH2>
      <DocP>
        Mastra is a framework: it wants to be the place you build AI apps. Monorch plugs into the
        server you already run. If you want routes, auth, and deployment unchanged, prefer a library.
        If you want an opinionated AI app kit with Studio, evaluate Mastra on those terms.
      </DocP>

      <DocH2>Vs LangGraph</DocH2>
      <DocP>
        LangGraph is a strong graph runtime, especially in Python, with a wider LangChain ecosystem.
        Monorch targets TypeScript backends with a Rust state machine for schema, permissions, agent
        steps, and graph cursors. Choose LangGraph when you are deep in that ecosystem; choose
        Monorch when you want a thin TS control plane beside Fastify/Hono without adopting the full
        Lang stack.
      </DocP>

      <DocH2>Vs DIY agent loops</DocH2>
      <DocP>
        DIY is fine until tool validation, handoffs, interrupts, checkpoints, and event streaming
        drift. Monorch exists for that middle: not a platform, not a 200-line while-loop forever.
      </DocP>

      <DocH2>Product lock (honest)</DocH2>
      <DocP>
        We provide model/tool/agent/graph, MCP → tool, memory interfaces, OTel via AiEvent,
        OpenAI-compatible providers. We do not provide HTTP framework, ORM/auth/queues, React chat
        UI, RAG product, or Studio. See{" "}
        <Link href="/docs" className="text-foreground underline-offset-4 hover:underline">
          Introduction
        </Link>
        .
      </DocP>

      <DocFaq
        path="/docs/compare"
        items={[
          {
            q: "Can I use Monorch with LangChain tools?",
            a: "Wrap them as tool() defs or expose them via MCP. Monorch does not vendor LangChain.",
          },
          {
            q: "Is Monorch trying to replace Temporal/Inngest?",
            a: "No. Checkpoints cover light HITL across requests. Use a durable workflow engine when work must survive deploys and queues.",
          },
          {
            q: "Where do I try it?",
            a: "Fastify in 5 minutes recipe, then examples/fastify smoke.",
          },
        ]}
      />

      <DocNext href="/docs/changelog" label="Changelog" />
    </>
  );
}
