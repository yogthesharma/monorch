import Link from "next/link";
import { ArrowRight, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { CapabilityStrip } from "@/components/capability-strip";
import { CodeBlock } from "@/components/code-block";
import { HeroDiagram, HeroPlane } from "@/components/hero-plane";
import {
  JsonLd,
  faqJsonLd,
  organizationJsonLd,
  softwareJsonLd,
  websiteJsonLd,
} from "@/components/json-ld";
import { MonorchLogo } from "@/components/monorch-logo";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { SmokeDemo } from "@/components/smoke-demo";
import { pageMetadata } from "@/lib/seo";
import { absoluteUrl, installSnippet, siteConfig } from "@/lib/site";

const homeFaqs = [
  {
    q: "How is this different from Mastra?",
    plain:
      "Mastra is a framework. Monorch is a library. You keep your server, router, and auth. We ship agents, tools, and graphs with a Rust engine for validation and state.",
  },
  {
    q: "What is the unlock?",
    plain:
      "One event stream for agents and graphs, interrupts you can checkpoint across HTTP requests, MCP tools that become normal tool() defs, and OTel hooks that reuse those same events. No Studio required.",
  },
  {
    q: "Why Rust?",
    plain:
      "Schema parse, permissions, agent steps, and graph cursors live in engine/. TypeScript stays thin: providers, node execute, checkpointers, and transports.",
  },
];

export const metadata = pageMetadata({
  title: { absolute: `${siteConfig.name} | ${siteConfig.tagline}` },
  description: siteConfig.description,
  path: "/",
});

const installCode = installSnippet();

const agentSnippet = `import { agent, tool, createOtelListener } from "@monorch/ai";
import { openai } from "@monorch/ai/openai";
import { z } from "zod";

const otel = createOtelListener({ serviceName: "support" });

const add = tool({
  name: "add",
  input: z.object({ a: z.number(), b: z.number() }),
  execute: ({ a, b }) => ({ sum: a + b }),
});

const bot = agent({
  model: openai("gpt-4.1-mini"),
  tools: [add],
  instructions: "Use tools for math.",
  onEvent: otel,
});

for await (const ev of bot.stream("What is 2+3?")) {
  // run_start | tool_call | text | run_end
}`;

const graphSnippet = `import { graph, memorySaver, inMemoryStore } from "@monorch/ai";

const memory = inMemoryStore();
const refund = graph("refund")
  .node("lookup", async ({ input }) => {
    await memory.put(["orders"], String(input.orderId), { ok: true });
    return { output: \`order:\${input.orderId}\`, state: { orderId: input.orderId } };
  })
  .interrupt("approve", { prompt: "Approve refund?" })
  .node("pay", async ({ outputs }) => \`refunded:\${outputs.lookup}\`)
  .compile({ checkpointer: memorySaver() });

let run = await refund.start({ orderId: "ord_9" }, { threadId: "t1" });
if (run.status === "waitingInterrupt") {
  run = await run.resume("approved");
}`;

const mcpSnippet = `import { mcpTools, mockMcp, agent } from "@monorch/ai";

const remote = mockMcp([
  {
    name: "lookup_order",
    description: "Look up an order",
    execute: (args) => ({ orderId: args.orderId, status: "paid" }),
  },
]);

const tools = await mcpTools(remote, { prefix: "mcp_" });
const bot = agent({ model, tools, instructions: "Use MCP tools when needed." });`;

export default async function HomePage() {
  return (
    <div className="min-h-screen">
      <JsonLd
        data={[
          websiteJsonLd(),
          organizationJsonLd(),
          softwareJsonLd(),
          faqJsonLd(homeFaqs, absoluteUrl("/"))!,
        ]}
      />
      <SiteHeader />

      <main>
        {/* First viewport: brand, one claim, one support line, one CTA group, diagram */}
        <section className="relative isolate min-h-[calc(100svh-4rem)] overflow-hidden">
          <HeroPlane />
          <div className="relative mx-auto grid min-h-[calc(100svh-4rem)] max-w-6xl items-center gap-10 px-5 py-14 sm:px-6 lg:grid-cols-[1fr_1fr] lg:gap-14 lg:px-8 lg:py-16">
            <div className="max-w-xl">
              <p className="animate-rise flex items-center gap-4 font-display text-6xl font-bold tracking-tight text-ink sm:gap-5 sm:text-7xl lg:gap-6 lg:text-8xl">
                <MonorchLogo className="h-[0.85em] w-auto text-signal" />
                <span>Monorch</span>
              </p>
              <h1 className="animate-rise-delay mt-5 text-balance text-3xl font-medium leading-tight text-foreground sm:text-4xl lg:text-[2.6rem]">
                The AI control plane for TypeScript backends.
              </h1>
              <p className="animate-rise-delay-2 mt-4 max-w-md text-lg leading-relaxed text-muted-foreground">
                Agents and graphs in the server you already have. One event bus. No framework.
              </p>
              <div className="animate-rise-delay-2 mt-8 flex flex-wrap items-center gap-3">
                <Button asChild size="lg" className="h-12 rounded-md px-7 text-base">
                  <Link href="/docs/getting-started">
                    Get started
                    <ArrowRight className="ml-1.5 h-4 w-4" />
                  </Link>
                </Button>
                <Button
                  asChild
                  variant="ghost"
                  size="lg"
                  className="h-12 rounded-md px-5 text-base text-muted-foreground hover:text-foreground"
                >
                  <Link href="/compare">
                    <BookOpen className="mr-1.5 h-4 w-4" />
                    Compare
                  </Link>
                </Button>
              </div>
              <p className="animate-rise-delay-2 mt-4 font-mono text-xs text-muted-foreground/90">
                {siteConfig.npmPublished ? (
                  <>
                    <Link
                      href={siteConfig.npm}
                      className="text-foreground/90 underline-offset-4 hover:underline"
                    >
                      @monorch/ai@{siteConfig.version}
                    </Link>
                    {" · pnpm add @monorch/ai"}
                  </>
                ) : (
                  <>
                    v{siteConfig.version}
                    {" · build from source (monorepo)"}
                  </>
                )}
              </p>
            </div>

            <HeroDiagram />
          </div>
        </section>

        <CapabilityStrip />

        <section className="border-t border-border/70 bg-card/30">
          <div className="mx-auto grid max-w-6xl items-center gap-10 px-5 py-20 sm:px-6 lg:grid-cols-[0.95fr_1.05fr] lg:gap-14 lg:px-8">
            <div>
              <p className="font-mono text-xs uppercase tracking-[0.16em] text-muted-foreground">
                Smoke path
              </p>
              <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
                What a library smoke looks like.
              </h2>
              <p className="mt-4 max-w-md text-lg leading-relaxed text-muted-foreground">
                SSE from <code className="font-mono text-sm">agent.stream</code>, then interrupt,
                checkpoint, and resume. Same events you wire to OTel. Not a Studio.
              </p>
              <Button asChild variant="outline" className="mt-8">
                <Link href="/docs/getting-started">
                  Run the smoke
                  <ArrowRight className="ml-1.5 h-4 w-4" />
                </Link>
              </Button>
            </div>
            <SmokeDemo />
          </div>
        </section>

        <section className="bg-card/40">
          <div className="mx-auto grid max-w-6xl gap-12 px-5 py-24 sm:px-6 lg:grid-cols-[1.1fr_0.9fr] lg:gap-16 lg:px-8">
            <div>
              <Badge
                variant="secondary"
                className="rounded-md px-2.5 py-1 font-mono text-xs uppercase tracking-wider"
              >
                Library, not a framework
              </Badge>
              <h2 className="mt-6 text-4xl font-semibold tracking-tight sm:text-5xl">
                What actually ships.
              </h2>
              <p className="mt-5 max-w-prose text-lg leading-relaxed text-muted-foreground">
                Tool loops with permissions, graphs you can pause and restore, a shared event
                stream, and thin bridges for MCP and OpenTelemetry. Rust keeps the state honest.
              </p>
            </div>
            <dl className="grid gap-7 sm:grid-cols-2">
              {[
                ["agent.stream", "Unified AiEvent bus for SSE and UIs"],
                ["graph + interrupt", "Human gates with thread checkpoints"],
                ["mcpTools", "Remote tools as local tool() defs"],
                ["createOtelListener", "Spans from the same events"],
                ["handoffs", "Route between named agents"],
                ["memory store", "BYO key/value and thread history"],
              ].map(([k, v]) => (
                <div key={k} className="border-l border-signal/50 pl-4">
                  <dt className="font-mono text-[0.95rem] font-medium text-ink">{k}</dt>
                  <dd className="mt-1.5 text-[0.95rem] leading-relaxed text-muted-foreground">
                    {v}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        </section>

        <section className="border-t border-border/70">
          <div className="mx-auto max-w-6xl px-5 py-24 sm:px-6 lg:px-8">
            <p className="font-mono text-xs uppercase tracking-[0.16em] text-muted-foreground">
              In your handlers
            </p>
            <h2 className="mt-3 text-4xl font-semibold tracking-tight sm:text-5xl">
              Drop in. Keep the server.
            </h2>
            <p className="mt-4 max-w-2xl text-lg text-muted-foreground">
              One package. Native runtime underneath. Prefer{" "}
              <code className="font-mono text-sm">graph()</code> for orchestration.
            </p>
            <Tabs defaultValue="graph" className="mt-10">
              <TabsList className="h-auto flex-wrap justify-start gap-1 bg-secondary/70 p-1.5">
                <TabsTrigger value="install" className="px-4 py-2 text-base">
                  Install
                </TabsTrigger>
                <TabsTrigger value="agent" className="px-4 py-2 text-base">
                  Stream + OTel
                </TabsTrigger>
                <TabsTrigger value="graph" className="px-4 py-2 text-base">
                  Graph
                </TabsTrigger>
                <TabsTrigger value="mcp" className="px-4 py-2 text-base">
                  MCP
                </TabsTrigger>
              </TabsList>
              <TabsContent value="install" className="mt-5">
                <CodeBlock code={installCode} lang="bash" filename="terminal" />
              </TabsContent>
              <TabsContent value="agent" className="mt-5">
                <CodeBlock code={agentSnippet} lang="typescript" filename="agent.ts" />
              </TabsContent>
              <TabsContent value="graph" className="mt-5">
                <CodeBlock code={graphSnippet} lang="typescript" filename="refund.ts" />
              </TabsContent>
              <TabsContent value="mcp" className="mt-5">
                <CodeBlock code={mcpSnippet} lang="typescript" filename="mcp.ts" />
              </TabsContent>
            </Tabs>
          </div>
        </section>

        <section className="border-y border-border/70 bg-secondary/30">
          <div className="mx-auto max-w-6xl px-5 py-24 sm:px-6 lg:px-8">
            <p className="font-mono text-xs uppercase tracking-[0.16em] text-muted-foreground">
              Fit
            </p>
            <h2 className="mt-3 text-4xl font-semibold tracking-tight sm:text-5xl">
              Beside your stack, not on top of it.
            </h2>
            <div className="mt-12 grid gap-10 md:grid-cols-3 md:gap-12">
              {[
                {
                  title: "HTTP",
                  body: "Your server keeps the request lifecycle — Fastify, Hono, Nest, or plain Node. Monorch runs inside handlers.",
                },
                {
                  title: "Models",
                  body: "OpenAI-compatible baseUrl. LiteLLM, OpenRouter, and local gateways work the same way.",
                },
                {
                  title: "Durability",
                  body: "Checkpoints for interrupts. BYO memory and checkpointer. Reach for Inngest or Temporal when process death is the constraint.",
                },
              ].map((item) => (
                <div key={item.title} className="border-t border-border/80 pt-5">
                  <h3 className="font-display text-xl font-semibold text-ink">{item.title}</h3>
                  <p className="mt-3 text-base leading-relaxed text-muted-foreground">{item.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-3xl px-5 py-24 sm:px-6">
          <h2 className="text-center text-4xl font-semibold tracking-tight">Straight answers</h2>
          <Accordion type="single" collapsible className="mt-12">
            <AccordionItem value="vs-mastra">
              <AccordionTrigger className="text-left text-lg">
                How is this different from Mastra?
              </AccordionTrigger>
              <AccordionContent className="text-base leading-relaxed text-muted-foreground">
                Mastra is a framework. Monorch is a library. You keep your server, router, and auth.
                We ship agents, tools, and graphs with a Rust engine for validation and state.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="exciting">
              <AccordionTrigger className="text-left text-lg">
                What is the unlock?
              </AccordionTrigger>
              <AccordionContent className="text-base leading-relaxed text-muted-foreground">
                One event stream for agents and graphs, interrupts you can checkpoint across HTTP
                requests, MCP tools that become normal{" "}
                <code className="font-mono text-sm">tool()</code> defs, and OTel hooks that reuse
                those same events. No Studio required.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="rust">
              <AccordionTrigger className="text-left text-lg">Why Rust?</AccordionTrigger>
              <AccordionContent className="text-base leading-relaxed text-muted-foreground">
                Schema parse, permissions, agent steps, and graph cursors live in{" "}
                <code className="font-mono text-sm">engine/</code>. TypeScript stays thin: providers,
                node execute, checkpointers, and transports.
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </section>

        <section className="border-t border-border/70 bg-secondary/25">
          <div className="mx-auto max-w-6xl px-5 py-16 sm:px-6 sm:py-20 lg:px-8">
            <div className="flex flex-col items-start justify-between gap-8 md:flex-row md:items-center">
              <div>
                <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
                  Drop into your handlers.
                </h2>
                <p className="mt-3 max-w-xl text-lg text-muted-foreground">
                  Start with Getting started, then pick a recipe — HTTP with Fastify is one option
                  among several.
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                <Button asChild size="lg" className="h-12 px-7 text-base">
                  <Link href="/docs/getting-started">
                    Get started
                    <ArrowRight className="ml-1.5 h-4 w-4" />
                  </Link>
                </Button>
                <Button asChild variant="outline" size="lg" className="h-12 px-7 text-base">
                  <Link href="/docs/recipes/fastify">HTTP with Fastify</Link>
                </Button>
              </div>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
