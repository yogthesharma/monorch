import Link from "next/link";
import { MarketingShell } from "@/components/marketing/marketing-shell";
import { MarketingPageHero } from "@/components/marketing/page-hero";
import { JsonLd, faqJsonLd } from "@/components/json-ld";
import { pageMetadata } from "@/lib/seo";
import { absoluteUrl, productPages } from "@/lib/site";

const page = productPages.find((p) => p.path === "/compare")!;
export const metadata = pageMetadata(page);

const rows = [
  {
    dim: "Shape",
    monorch: "Library",
    mastra: "Framework",
    lang: "Library / platform family",
    diy: "Your code",
  },
  {
    dim: "HTTP",
    monorch: "BYO Fastify / Hono",
    mastra: "Owns more of the app shell",
    lang: "BYO / Lang ecosystem",
    diy: "Yours",
  },
  {
    dim: "Engine",
    monorch: "Rust validate · agent · graph",
    mastra: "TypeScript-first stack",
    lang: "Python-first (+ JS ports)",
    diy: "None",
  },
  {
    dim: "Studio",
    monorch: "No",
    mastra: "Yes",
    lang: "Studio / LangSmith adjacent",
    diy: "No",
  },
  {
    dim: "Events",
    monorch: "Shared AiEvent bus",
    mastra: "Framework events / APIs",
    lang: "Graph streaming APIs",
    diy: "Ad hoc",
  },
  {
    dim: "Checkpoints",
    monorch: "memorySaver / Postgres",
    mastra: "Platform patterns",
    lang: "Built-in persistence story",
    diy: "Roll your own",
  },
  {
    dim: "MCP",
    monorch: "Thin bridge → tool()",
    mastra: "Integrations vary",
    lang: "Integrations vary",
    diy: "Roll your own",
  },
];

const faqs = [
  {
    q: "Can I use Monorch with LangChain tools?",
    plain:
      "Wrap them as tool() defs or expose them via MCP. Monorch does not vendor LangChain.",
  },
  {
    q: "Is Monorch trying to replace Temporal/Inngest?",
    plain:
      "No. Checkpoints cover light HITL across requests. Use a durable workflow engine when work must survive deploys and queues.",
  },
  {
    q: "Where do I try it?",
    plain: "Fastify in 5 minutes recipe, then examples/fastify smoke.",
  },
];

export default function ComparePage() {
  return (
    <MarketingShell>
      <JsonLd data={[faqJsonLd(faqs, absoluteUrl("/compare"))!]} />
      <MarketingPageHero
        kicker="Compare"
        title="Library vs framework vs DIY."
        lead="Monorch is a TypeScript control plane with a Rust engine. Not a Studio. Not a RAG product. Here is how that sits next to common alternatives."
        secondaryHref="/docs"
        secondaryLabel="Product lock in docs"
      />

      <section className="mx-auto max-w-6xl px-5 py-16 sm:px-6 lg:px-8 lg:py-20">
        <p className="font-mono text-xs uppercase tracking-[0.16em] text-muted-foreground">
          At a glance
        </p>
        <h2 className="mt-3 max-w-xl font-display text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
          One table. Honest columns.
        </h2>

        <div className="mt-10 overflow-x-auto">
          <table className="w-full min-w-[48rem] border-collapse text-left">
            <thead>
              <tr className="border-b border-border/80">
                <th className="py-4 pr-4 font-mono text-xs uppercase tracking-[0.14em] text-muted-foreground">
                  Dimension
                </th>
                <th className="bg-signal/10 px-4 py-4 font-display text-lg font-semibold text-ink">
                  Monorch
                </th>
                <th className="px-4 py-4 text-base font-medium text-muted-foreground">Mastra</th>
                <th className="px-4 py-4 text-base font-medium text-muted-foreground">LangGraph</th>
                <th className="px-4 py-4 text-base font-medium text-muted-foreground">DIY</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.dim} className="border-b border-border/40 align-top">
                  <td className="py-4 pr-4 font-medium text-ink">{row.dim}</td>
                  <td className="bg-signal/5 px-4 py-4 text-foreground">{row.monorch}</td>
                  <td className="px-4 py-4 text-muted-foreground">{row.mastra}</td>
                  <td className="px-4 py-4 text-muted-foreground">{row.lang}</td>
                  <td className="px-4 py-4 text-muted-foreground">{row.diy}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="border-t border-border/70 bg-card/25">
        <div className="mx-auto grid max-w-6xl gap-12 px-5 py-16 sm:px-6 lg:grid-cols-3 lg:gap-10 lg:px-8 lg:py-20">
          {[
            {
              title: "Vs Mastra",
              body: "Mastra wants to be the place you build AI apps. Monorch plugs into the server you already run. Keep routes, auth, and deploy unchanged — or choose Mastra when you want an opinionated kit with Studio.",
            },
            {
              title: "Vs LangGraph",
              body: "LangGraph is strong especially in Python, with a wide LangChain ecosystem. Monorch targets TypeScript backends with a Rust state machine for schema, permissions, agent steps, and graph cursors.",
            },
            {
              title: "Vs DIY loops",
              body: "DIY is fine until tool validation, handoffs, interrupts, checkpoints, and event streaming drift. Monorch covers that middle — not a platform, not a forever while-loop.",
            },
          ].map((block, i) => (
            <div
              key={block.title}
              className="border-l border-signal/45 pl-5"
              style={{ animationDelay: `${0.08 * i}s` }}
            >
              <h3 className="font-display text-2xl font-semibold tracking-tight text-ink">
                {block.title}
              </h3>
              <p className="mt-3 text-base leading-relaxed text-muted-foreground">{block.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 py-16 sm:px-6 lg:px-8 lg:py-20">
        <p className="font-mono text-xs uppercase tracking-[0.16em] text-muted-foreground">
          Product lock
        </p>
        <h2 className="mt-3 max-w-2xl font-display text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
          We ship the control plane. You keep the rest.
        </h2>
        <div className="mt-10 grid gap-8 sm:grid-cols-2">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.14em] text-signal">Provide</p>
            <ul className="mt-4 space-y-2 text-base text-foreground/90">
              {[
                "model / tool / agent / graph / workflow",
                "MCP → tool()",
                "memory interfaces",
                "OTel via AiEvent",
                "OpenAI-compatible providers",
              ].map((item) => (
                <li key={item} className="flex gap-2">
                  <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-signal" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.14em] text-muted-foreground">
              Do not provide
            </p>
            <ul className="mt-4 space-y-2 text-base text-muted-foreground">
              {[
                "HTTP framework",
                "ORM / auth / queues",
                "React chat UI",
                "RAG product",
                "Studio",
              ].map((item) => (
                <li key={item} className="flex gap-2">
                  <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-muted-foreground/50" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
        <p className="mt-10 text-base text-muted-foreground">
          More context in the{" "}
          <Link href="/docs" className="text-foreground underline-offset-4 hover:underline">
            Introduction
          </Link>{" "}
          and{" "}
          <Link
            href="/architecture"
            className="text-foreground underline-offset-4 hover:underline"
          >
            Architecture
          </Link>
          .
        </p>
      </section>
    </MarketingShell>
  );
}
