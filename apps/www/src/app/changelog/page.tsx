import { MarketingShell } from "@/components/marketing/marketing-shell";
import { MarketingPageHero } from "@/components/marketing/page-hero";
import { pageMetadata } from "@/lib/seo";
import { productPages, siteConfig } from "@/lib/site";

const page = productPages.find((p) => p.path === "/changelog")!;
export const metadata = pageMetadata(page);

type Release = {
  version: string;
  date: string;
  summary: string;
  items: string[];
};

/** Keep in sync with packages/ai/CHANGELOG.md / monorepo CHANGELOG. */
const releases: Release[] = [
  {
    version: "0.1.2",
    date: "2026-08-12",
    summary: "Homepage and package metadata polish.",
    items: [
      "Homepage set to https://monorch.vercel.app/",
      "Package description without em dashes for npm listings",
    ],
  },
  {
    version: "0.1.1",
    date: "2026-08-12",
    summary: "Clearer npm description, keywords, and README.",
    items: [
      "Docs/metadata: clearer npm description and keywords",
      "README updates for @monorch/ai and @monorch/runtime",
    ],
  },
  {
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
      "BYO HTTP example (examples/fastify) + pnpm smoke / smoke:live",
    ],
  },
];

export default function ChangelogPage() {
  return (
    <MarketingShell>
      <MarketingPageHero
        kicker="Changelog"
        title={
          <>
            Latest is{" "}
            <span className="font-mono text-[0.85em] text-signal">v{siteConfig.version}</span>
          </>
        }
        lead={
          <>
            Release notes for <code className="font-mono text-[0.9em]">@monorch/ai</code> and{" "}
            <code className="font-mono text-[0.9em]">@monorch/runtime</code>. Site badge tracks{" "}
            <code className="font-mono text-[0.9em]">packages/ai/package.json</code> (publish that
            version to npm to match installs).
          </>
        }
        secondaryHref={`${siteConfig.github}/blob/main/CHANGELOG.md`}
        secondaryLabel="Repo CHANGELOG.md"
      />

      <section className="mx-auto max-w-6xl px-5 py-16 sm:px-6 lg:px-8 lg:py-20">
        <ol className="space-y-16">
          {releases.map((release, index) => (
            <li key={release.version} className="relative border-l border-signal/40 pl-8 sm:pl-10">
              <span
                aria-hidden
                className="absolute -left-[5px] top-2 h-2.5 w-2.5 rounded-full bg-signal shadow-[0_0_0_4px_hsl(var(--background))]"
              />
              <div className="flex flex-wrap items-baseline gap-x-4 gap-y-2">
                <h2 className="font-display text-4xl font-semibold tracking-tight text-ink sm:text-5xl">
                  <span className="font-mono">{release.version}</span>
                </h2>
                <time className="font-mono text-sm text-muted-foreground">{release.date}</time>
                {index === 0 ? (
                  <span className="font-mono text-xs uppercase tracking-[0.14em] text-signal">
                    current
                  </span>
                ) : null}
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
            </li>
          ))}
        </ol>
        <p className="mt-14 max-w-2xl text-base leading-relaxed text-muted-foreground">
          Prefer <code className="font-mono text-sm">graph()</code> over{" "}
          <code className="font-mono text-sm">workflow()</code>.{" "}
          <code className="font-mono text-sm">pg</code> is optional for Postgres adapters. Install
          with <code className="font-mono text-sm">pnpm add @monorch/ai</code>.
        </p>
      </section>
    </MarketingShell>
  );
}
