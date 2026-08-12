import { MarketingShell } from "@/components/marketing/marketing-shell";
import { MarketingPageHero } from "@/components/marketing/page-hero";
import { pageMetadata } from "@/lib/seo";
import { productPages } from "@/lib/site";

const page = productPages.find((p) => p.path === "/architecture")!;
export const metadata = pageMetadata(page);

const layers = [
  {
    name: "apps/www",
    role: "Marketing + docs only",
    detail: "Never imports engine internals. Not a Studio.",
  },
  {
    name: "examples/fastify",
    role: "BYO HTTP smoke",
    detail: "Full handler sample (Fastify host). Same APIs for Hono or Nest.",
  },
  {
    name: "examples/npm-smoke",
    role: "Published npm smoke",
    detail: "Installs @monorch/ai from the registry — validates tarball + native load without workspace link.",
  },
  {
    name: "packages/ai",
    role: "@monorch/ai",
    detail: "Sole TypeScript user API: agents, tools, graphs, memory, MCP, OTel.",
  },
  {
    name: "bindings/node",
    role: "@monorch/runtime",
    detail: "N-API only. No business logic in the binding crate.",
  },
  {
    name: "engine/",
    role: "Rust source of truth",
    detail: "Schema, tool auth, agent run state, graph cursor.",
  },
];

const rules = [
  "Validate, auth, agent, and graph state live in Rust only.",
  "Provider HTTP, node execute, edge predicates, and checkpointer I/O live in TypeScript.",
  "Prefer graph() over workflow() for new code — see /docs/api for the public contract.",
  "Examples never become frameworks.",
];

export default function ArchitecturePage() {
  return (
    <MarketingShell>
      <MarketingPageHero
        kicker="Architecture"
        title="Four trees. Rust owns truth."
        lead="TypeScript owns I/O. One user package. No parallel APIs. The engine advances runs; your handlers stream AiEvent."
        secondaryHref="/docs/getting-started"
        secondaryLabel="Getting started"
      />

      <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8 lg:py-20">
        <p className="font-mono text-xs uppercase tracking-[0.16em] text-muted-foreground">
          Stack
        </p>
        <h2 className="mt-3 max-w-xl font-display text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
          From marketing down to the engine.
        </h2>
        <ol className="mt-12 space-y-0">
          {layers.map((layer, i) => (
            <li
              key={layer.name}
              className="grid gap-4 border-t border-border/60 py-6 sm:grid-cols-[minmax(0,12rem)_minmax(0,1fr)] sm:items-start lg:grid-cols-[minmax(0,14rem)_minmax(0,12rem)_minmax(0,1fr)]"
            >
              <p className="font-mono text-sm text-signal">
                <span className="mr-2 text-muted-foreground">{String(i + 1).padStart(2, "0")}</span>
                {layer.name}
              </p>
              <p className="font-display text-xl font-semibold tracking-tight text-ink">
                {layer.role}
              </p>
              <p className="text-base leading-relaxed text-muted-foreground sm:col-span-2 lg:col-span-1">
                {layer.detail}
              </p>
            </li>
          ))}
        </ol>
      </section>

      <section className="border-t border-border/70 bg-card/25">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 sm:gap-14 sm:px-6 sm:py-16 lg:grid-cols-2 lg:px-8 lg:py-20">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.16em] text-muted-foreground">
              Rules
            </p>
            <h2 className="mt-3 font-display text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
              Hard boundaries.
            </h2>
            <ul className="mt-8 space-y-4">
              {rules.map((rule, i) => (
                <li key={rule} className="flex gap-3 text-base leading-relaxed text-foreground/90 sm:gap-4">
                  <span className="shrink-0 font-mono text-sm text-signal">{String(i + 1).padStart(2, "0")}</span>
                  <span className="min-w-0">{rule}</span>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.16em] text-muted-foreground">
              Request path
            </p>
            <h2 className="mt-3 font-display text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
              Handler → engine → events.
            </h2>
            <p className="mt-6 text-base leading-relaxed text-muted-foreground sm:text-lg">
              Your route calls <code className="font-mono text-sm">agent.stream</code> or{" "}
              <code className="font-mono text-sm">graph.start</code>. TypeScript talks to the model
              and runs node callbacks. Rust advances the run, prepares tool args, and stores status.
              Events leave as <code className="font-mono text-sm">AiEvent</code> for SSE, logs, and
              OTel.
            </p>
          </div>
        </div>
      </section>
    </MarketingShell>
  );
}
