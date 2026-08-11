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

const page = docPages.find((p) => p.path === "/docs/api")!;
export const metadata = docMetadata(page);

export default function PublicApiPage() {
  return (
    <>
      <DocH1>Public API</DocH1>
      <DocLead>
        The supported contract for <code className="font-mono text-sm">@monorch/ai</code>{" "}
        consumers. Anything not listed here is internal and may change without a major bump.
      </DocLead>

      <DocH2>Entrypoints</DocH2>
      <DocTerms>
        <DocTerm name="@monorch/ai">
          Main control-plane API (agents, tools, graphs, events, MCP bridges, memory helpers). Full
          map:{" "}
          <Link
            href="/docs/reference/ai"
            className="text-foreground underline-offset-4 hover:underline"
          >
            package reference
          </Link>
          .
        </DocTerm>
        <DocTerm name="@monorch/ai/openai">
          <code className="font-mono text-sm">openai()</code> and{" "}
          <code className="font-mono text-sm">mock()</code> providers. Also re-exported from the
          main entry for convenience.
        </DocTerm>
        <DocTerm name="@monorch/ai/postgres">
          <code className="font-mono text-sm">ensureMonorchSchema</code>,{" "}
          <code className="font-mono text-sm">postgresCheckpointer</code>,{" "}
          <code className="font-mono text-sm">postgresThreads</code>,{" "}
          <code className="font-mono text-sm">postgresStore</code>. Optional peer:{" "}
          <code className="font-mono text-sm">pg</code>.
        </DocTerm>
        <DocTerm name="@monorch/runtime">
          N-API binding. Install transitively via{" "}
          <code className="font-mono text-sm">@monorch/ai</code>. Do not call it from app code
          unless debugging.
        </DocTerm>
      </DocTerms>

      <DocH2>Stable surface (pre-1.0 intent)</DocH2>
      <DocP>
        These symbols are the product. We will not rename or remove them casually before 1.0; after
        1.0, removals require a major version.
      </DocP>

      <DocH3>Core</DocH3>
      <DocCode lang="typescript" filename="public-core.ts">{`import {
  agent, getAgent,
  tool, toolWithIr, callTool, listTools,
  graph, GRAPH_END,
  workflow,           // linear sugar — prefer graph()
  model,
  memorySaver,
  inMemoryStore, inMemoryThreads,
  createOtelListener, tapEvents, collectEvents,
  AiError,
  mock, openai,       // also from @monorch/ai/openai
} from "@monorch/ai";`}</DocCode>

      <DocH3>MCP</DocH3>
      <DocCode lang="typescript" filename="public-mcp.ts">{`import {
  mcpStdio, mcpHttp, mcpTools, mockMcp, jsonSchemaToIr,
} from "@monorch/ai";`}</DocCode>

      <DocH3>Postgres</DocH3>
      <DocCode lang="typescript" filename="public-postgres.ts">{`import {
  ensureMonorchSchema,
  postgresCheckpointer,
  postgresThreads,
  postgresStore,
} from "@monorch/ai/postgres";`}</DocCode>

      <DocH3>Prefer graph()</DocH3>
      <DocP>
        <code className="font-mono text-sm">workflow()</code> is{" "}
        <strong>linear sugar</strong> over <code className="font-mono text-sm">graph()</code>. New
        code should use <code className="font-mono text-sm">graph()</code> for branching, cycles,
        interrupts, and checkpoints. See{" "}
        <Link href="/docs/workflows" className="text-foreground underline-offset-4 hover:underline">
          Workflows
        </Link>
        .
      </DocP>

      <DocH2>SemVer policy</DocH2>
      <DocTerms>
        <DocTerm name="Before 1.0 (0.x)">
          Minor versions may add APIs. Breaking changes to the public surface are allowed but will
          be called out in the changelog. Patch versions are fixes and docs.
        </DocTerm>
        <DocTerm name="At / after 1.0">
          Documented public exports keep backward compatibility within a major. Breaking changes
          require <code className="font-mono text-sm">2.0</code>. Additive exports are fine in
          minors.
        </DocTerm>
        <DocTerm name="Types">
          Exported TypeScript types that appear in public function signatures are part of the
          contract. Narrowing types in a non-breaking way is allowed; removing fields is breaking.
        </DocTerm>
        <DocTerm name="AiError codes">
          String codes on <code className="font-mono text-sm">AiError</code> that are documented
          under{" "}
          <Link
            href="/docs/reference/errors"
            className="text-foreground underline-offset-4 hover:underline"
          >
            Error codes
          </Link>{" "}
          are stable once listed. New codes may be added anytime.
        </DocTerm>
        <DocTerm name="Checkpoint blobs">
          On-disk / DB checkpoint shape is versioned (
          <code className="font-mono text-sm">version</code> field). Readers must tolerate documented
          versions; dropping a version is a major or an explicit migration guide.
        </DocTerm>
      </DocTerms>

      <DocH2>Not public (do not depend on these)</DocH2>
      <DocTerms>
        <DocTerm name="getRuntime() / Engine methods">
          Escape hatch for the native addon. Shape follows Rust and may change without a major.
        </DocTerm>
        <DocTerm name="Module-private paths">
          Deep imports like <code className="font-mono text-sm">@monorch/ai/dist/...</code> or files
          not listed in <code className="font-mono text-sm">package.json#exports</code> are
          unsupported.
        </DocTerm>
        <DocTerm name="Undocumented helpers">
          Anything exported only for tests or examples without docs coverage is not a stability
          promise. Prefer the symbols on this page.
        </DocTerm>
        <DocTerm name="zodToIr">
          Exported for advanced IR use (for example MCP). Prefer{" "}
          <code className="font-mono text-sm">tool()</code> /{" "}
          <code className="font-mono text-sm">toolWithIr()</code> in app code. IR shape may evolve.
        </DocTerm>
        <DocTerm name="@monorch/runtime platform packages">
          <code className="font-mono text-sm">@monorch/runtime-*</code> packages are optional
          binaries. Depend on <code className="font-mono text-sm">@monorch/ai</code> /{" "}
          <code className="font-mono text-sm">@monorch/runtime</code>, not a single platform package,
          unless you know you need it.
        </DocTerm>
      </DocTerms>

      <DocH2>Product lock (unchanged)</DocH2>
      <DocP>
        Monorch is a library, not an HTTP framework, ORM, Studio, or RAG product. The public API
        stays control-plane shaped: agents, tools, graphs, events, and thin adapters.
      </DocP>

      <DocFaq
        path="/docs/api"
        items={[
          {
            q: "Is workflow() going away?",
            a: "Not in 0.x without a changelog note. It stays as linear sugar. Prefer graph() for new work so you do not rewrite later.",
          },
          {
            q: "Can I import from @monorch/ai/src/…?",
            a: "No. Only package.json exports are supported: ., ./openai, ./postgres.",
          },
          {
            q: "Where is the exhaustive symbol list?",
            a: "This page is the contract. /docs/reference/ai is the detailed package map.",
          },
        ]}
      />
    </>
  );
}
