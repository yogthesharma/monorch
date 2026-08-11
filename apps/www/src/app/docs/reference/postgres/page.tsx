import Link from "next/link";
import { docPages } from "@/lib/site";
import { docMetadata } from "@/lib/seo";
import {
  DocCode,
  DocH1,
  DocH2,
  DocLead,
  DocP,
  DocTerm,
  DocTerms,
} from "@/components/docs/doc-blocks";
import { DocFaq } from "@/components/docs/doc-faq";

const page = docPages.find((p) => p.path === "/docs/reference/postgres")!;
export const metadata = docMetadata(page);

export default function PostgresReferencePage() {
  return (
    <>
      <DocH1>
        <code className="font-mono text-[0.9em]">@monorch/ai/postgres</code>
      </DocH1>
      <DocLead>
        Durable Checkpointer, ThreadMemory, and MemoryStore adapters over any{" "}
        <code className="font-mono text-sm">pg</code>-compatible client.{" "}
        <code className="font-mono text-sm">pg</code> is an optional peer dependency.
      </DocLead>

      <DocH2>Import</DocH2>
      <DocCode lang="typescript" filename="import.ts">{`import {
  ensureMonorchSchema,
  postgresCheckpointer,
  postgresThreads,
  postgresStore,
} from "@monorch/ai/postgres";
import pg from "pg";

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
await ensureMonorchSchema(pool);`}</DocCode>

      <DocH2>Constructors</DocH2>
      <DocTerms>
        <DocTerm name="ensureMonorchSchema(db, opts?)">
          Create tables if missing (checkpoints, thread messages, KV). Safe on boot.
        </DocTerm>
        <DocTerm name="postgresCheckpointer(db, opts?)">
          Durable graph checkpointer with <code className="font-mono text-sm">put</code>,{" "}
          <code className="font-mono text-sm">get</code>, and{" "}
          <code className="font-mono text-sm">list</code> history.
        </DocTerm>
        <DocTerm name="postgresThreads(db, opts?)">
          Durable agent <code className="font-mono text-sm">ThreadMemory</code>.
        </DocTerm>
        <DocTerm name="postgresStore(db, opts?)">
          Durable namespaced <code className="font-mono text-sm">MemoryStore</code>.
        </DocTerm>
      </DocTerms>

      <DocH2>Keywords / options</DocH2>
      <DocTerms>
        <DocTerm name="SqlQueryable">
          Minimal <code className="font-mono text-sm">query(text, values?)</code> surface. Satisfied
          by <code className="font-mono text-sm">pg.Pool</code> /{" "}
          <code className="font-mono text-sm">Client</code>, or a test stand-in.
        </DocTerm>
        <DocTerm name="PostgresAdapterOptions">
          checkpointsTable?, threadsTable?, kvTable? (validated identifiers; defaults{" "}
          <code className="font-mono text-sm">monorch_*</code>).
        </DocTerm>
      </DocTerms>

      <DocP>
        Guides:{" "}
        <Link
          href="/docs/checkpoints"
          className="text-foreground underline-offset-4 hover:underline"
        >
          Checkpoints
        </Link>
        ,{" "}
        <Link href="/docs/memory" className="text-foreground underline-offset-4 hover:underline">
          Memory
        </Link>
        .
      </DocP>

      <DocFaq
        path="/docs/reference/postgres"
        items={[
          {
            q: "Do I need Postgres for smoke?",
            a: "No. Adapters take SqlQueryable. The repo smoke uses an in-memory SQL stand-in.",
          },
          {
            q: "Is pg required always?",
            a: "Only when you import this entrypoint. It is an optional peer of @monorch/ai.",
          },
        ]}
      />
    </>
  );
}
