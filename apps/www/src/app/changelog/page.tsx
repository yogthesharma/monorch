import { MarketingShell } from "@/components/marketing/marketing-shell";
import { MarketingPageHero } from "@/components/marketing/page-hero";
import { pageMetadata } from "@/lib/seo";
import { productPages, siteConfig } from "@/lib/site";

const page = productPages.find((p) => p.path === "/changelog")!;
export const metadata = pageMetadata(page);

const release = {
  version: "0.1.0",
  date: "2026-08-12",
  summary: "First tagged library release.",
  items: [
    "Agents with tool loop (Rust state) + stream() / run() AiEvent bus",
    "Explicit handoffs (handoffs: [...], handoff_to_* tools)",
    "Graphs: nodes, conditional edges, interrupts, cycle maxSteps, compile({ replace })",
    "Checkpoint v2 blobs (version, input, defHash) + memorySaver()",
    "Postgres adapters: postgresCheckpointer, postgresThreads, postgresStore",
    "Thread memory: agent.run(input, { threadId, memory, signal })",
    "MCP: mcpStdio / mcpHttp + mcpTools JSON Schema → IR",
    "OTel hooks via createOtelListener",
    "OpenAI-compatible provider with SSE, AbortSignal, timeouts",
    "Fastify BYO example + pnpm smoke / smoke:live",
  ],
};

export default function ChangelogPage() {
  return (
    <MarketingShell>
      <MarketingPageHero
        kicker="Changelog"
        title={
          <>
            What shipped in{" "}
            <span className="font-mono text-[0.85em] text-signal">v{siteConfig.version}</span>
          </>
        }
        lead={
          <>
            Release notes for <code className="font-mono text-[0.9em]">@monorch/ai</code> and{" "}
            <code className="font-mono text-[0.9em]">@monorch/runtime</code>. Semver applies to
            published packages.
          </>
        }
        secondaryHref={`${siteConfig.github}/blob/main/CHANGELOG.md`}
        secondaryLabel="Repo CHANGELOG.md"
      />

      <section className="mx-auto max-w-6xl px-5 py-16 sm:px-6 lg:px-8 lg:py-20">
        <div className="relative border-l border-signal/40 pl-8 sm:pl-10">
          <span
            aria-hidden
            className="absolute -left-[5px] top-2 h-2.5 w-2.5 rounded-full bg-signal shadow-[0_0_0_4px_hsl(var(--background))]"
          />
          <div className="flex flex-wrap items-baseline gap-x-4 gap-y-2">
            <h2 className="font-display text-4xl font-semibold tracking-tight text-ink sm:text-5xl">
              <span className="font-mono">{release.version}</span>
            </h2>
            <time className="font-mono text-sm text-muted-foreground">{release.date}</time>
          </div>
          <p className="mt-4 max-w-2xl text-lg text-muted-foreground">{release.summary}</p>
          <ul className="mt-8 max-w-3xl space-y-3">
            {release.items.map((item) => (
              <li
                key={item}
                className="border-t border-border/50 pt-3 text-base leading-relaxed text-foreground/90 first:border-t-0 first:pt-0"
              >
                {item}
              </li>
            ))}
          </ul>
          <p className="mt-10 max-w-2xl text-base leading-relaxed text-muted-foreground">
            Prefer <code className="font-mono text-sm">graph()</code> over{" "}
            <code className="font-mono text-sm">workflow()</code>.{" "}
            <code className="font-mono text-sm">pg</code> is optional for Postgres adapters. In the
            monorepo, run <code className="font-mono text-sm">pnpm build:native</code> for local
            development.
          </p>
        </div>
      </section>
    </MarketingShell>
  );
}
