import { docPages, siteConfig } from "@/lib/site";
import { docMetadata } from "@/lib/seo";
import { DocH1, DocH2, DocLead, DocNext, DocP } from "@/components/docs/doc-blocks";
import { DocFaq } from "@/components/docs/doc-faq";

const page = docPages.find((p) => p.path === "/docs/changelog")!;
export const metadata = docMetadata(page);

export default function ChangelogPage() {
  return (
    <>
      <DocH1>Changelog</DocH1>
      <DocLead>
        Release notes for <code className="font-mono text-sm">@monorch/ai</code> and{" "}
        <code className="font-mono text-sm">@monorch/runtime</code>. Current site version{" "}
        <code className="font-mono text-sm">v{siteConfig.version}</code>.
      </DocLead>

      <DocH2>
        <span className="font-mono text-[0.85em]">0.1.0</span>
        <span className="ml-3 text-lg font-normal text-muted-foreground">2026-08-12</span>
      </DocH2>
      <DocP>First tagged library release.</DocP>
      <ul className="mt-5 list-disc space-y-2 pl-6 text-base leading-relaxed text-foreground/90">
        <li>Agents with tool loop (Rust state) + stream() / run() AiEvent bus</li>
        <li>Explicit handoffs (handoffs: [...], handoff_to_* tools)</li>
        <li>Graphs: nodes, conditional edges, interrupts, cycle maxSteps, compile({"{"} replace {"}"})</li>
        <li>Checkpoint v2 blobs (version, input, defHash) + memorySaver()</li>
        <li>Postgres adapters: postgresCheckpointer, postgresThreads, postgresStore</li>
        <li>Thread memory: agent.run(input, {"{"} threadId, memory, signal {"}"})</li>
        <li>MCP: mcpStdio / mcpHttp + mcpTools JSON Schema → IR</li>
        <li>OTel hooks via createOtelListener</li>
        <li>OpenAI-compatible provider with SSE, AbortSignal, timeouts</li>
        <li>Fastify BYO example + pnpm smoke / smoke:live</li>
      </ul>
      <DocP>
        Prefer <code className="font-mono text-sm">graph()</code> over{" "}
        <code className="font-mono text-sm">workflow()</code>.{" "}
        <code className="font-mono text-sm">pg</code> is optional for Postgres adapters. In the
        monorepo, run <code className="font-mono text-sm">pnpm build:native</code> for local
        development.
      </DocP>
      <DocP>
        Source of truth in the repo:{" "}
        <a
          href={`${siteConfig.github}/blob/main/CHANGELOG.md`}
          className="text-foreground underline-offset-4 hover:underline"
          target="_blank"
          rel="noreferrer"
        >
          CHANGELOG.md
        </a>
        .
      </DocP>

      <DocFaq
        path="/docs/changelog"
        items={[
          {
            q: "How is the header version chosen?",
            a: "siteConfig.version in apps/www, kept in sync with packages/ai @ 0.1.0.",
          },
          {
            q: "Where are breaking changes announced?",
            a: "This page and the repo CHANGELOG. Semver applies to published packages.",
          },
        ]}
      />

      <DocNext href="/docs/architecture" label="Architecture" />
    </>
  );
}
