import Link from "next/link";
import { docPages } from "@/lib/site";
import { docMetadata } from "@/lib/seo";
import { DocCode, DocH1, DocH2, DocLead, DocP } from "@/components/docs/doc-blocks";
import { DocFaq } from "@/components/docs/doc-faq";

const page = docPages.find((p) => p.path === "/docs/checkpoints")!;
export const metadata = docMetadata(page);

export default function CheckpointsPage() {
  return (
    <>
      <DocH1>Checkpoints</DocH1>
      <DocLead>
        Persist graph runs across HTTP requests with a checkpointer. Use{" "}
        <code className="font-mono text-sm">memorySaver()</code> for demos, or implement{" "}
        <code className="font-mono text-sm">Checkpointer</code> against your store.
      </DocLead>

      <DocH2>memorySaver</DocH2>
      <DocCode lang="typescript" filename="checkpointer.ts">{`import { graph, memorySaver } from "@monorch/ai";

const checkpointer = memorySaver();

const refund = graph("refund")
  .node("lookup", async ({ input }) => \`order:\${input.orderId}\`)
  .interrupt("approve")
  .node("pay", async ({ outputs }) => \`refunded:\${outputs.lookup}\`)
  .compile({ checkpointer });

await refund.start({ orderId: "ord_9" }, { threadId: "t1" });

// later request
const run = await refund.restore("t1");
await run.resume("approved");`}</DocCode>

      <DocH2>Postgres adapter</DocH2>
      <DocP>
        Use <code className="font-mono text-sm">@monorch/ai/postgres</code> with a{" "}
        <code className="font-mono text-sm">pg</code> pool (optional peer dependency). Call{" "}
        <code className="font-mono text-sm">ensureMonorchSchema</code> once on boot.
      </DocP>
      <DocCode lang="typescript" filename="postgres-checkpointer.ts">{`import pg from "pg";
import { graph } from "@monorch/ai";
import { ensureMonorchSchema, postgresCheckpointer } from "@monorch/ai/postgres";

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
await ensureMonorchSchema(pool);

const refund = graph("refund")
  .node("lookup", async ({ input }) => \`order:\${input.orderId}\`)
  .interrupt("approve")
  .node("pay", async ({ outputs }) => \`refunded:\${outputs.lookup}\`)
  .compile({ checkpointer: postgresCheckpointer(pool) });`}</DocCode>

      <DocH2>Checkpointer interface</DocH2>
      <DocCode lang="typescript" filename="interface.ts">{`type Checkpointer = {
  put(threadId: string, blob: JsonValue): Promise<CheckpointTuple> | CheckpointTuple;
  get(threadId: string): Promise<JsonValue | null> | JsonValue | null;
  list?(threadId: string): Promise<CheckpointTuple[]> | CheckpointTuple[];
};`}</DocCode>

      <DocH2>BYO store</DocH2>
      <DocCode lang="typescript" filename="redis-checkpointer.ts">{`export function redisCheckpointer(redis: Redis): Checkpointer {
  return {
    async put(threadId, blob) {
      const checkpointId = crypto.randomUUID();
      await redis.set(\`cp:\${threadId}\`, JSON.stringify({ checkpointId, blob }));
      return { threadId, checkpointId, blob, createdAt: new Date().toISOString() };
    },
    async get(threadId) {
      const raw = await redis.get(\`cp:\${threadId}\`);
      return raw ? JSON.parse(raw).blob : null;
    },
  };
}`}</DocCode>

      <DocH2>Thread ids</DocH2>
      <DocP>
        Pass <code className="font-mono text-sm">threadId</code> on{" "}
        <code className="font-mono text-sm">start</code>. Without a checkpointer, restore throws.
        Without a thread id, in-process handles still work until the process dies.
      </DocP>

      <DocH2>Checkpoint blob v2</DocH2>
      <DocP>
        Every export writes <code className="font-mono text-sm">version: 2</code>. Fields (camelCase
        in JSON):
      </DocP>
      <DocCode lang="typescript" filename="blob-v2.ts">{`{
  version: 2,
  defHash: "…",           // FNV-1a fingerprint of the compiled GraphDef
  input: { orderId: "ord_9" }, // original start input
  run: {
    id, graph, status, cursor, steps,
    input, state, defHash, outputs, error?, routeFrom?
  }
}`}</DocCode>
      <DocP>
        After a definition replace, restore / resume can fail on hash mismatch. Codes and recovery:{" "}
        <Link
          href="/docs/reference/errors"
          className="text-foreground underline-offset-4 hover:underline"
        >
          Errors &amp; failure modes
        </Link>
        .
      </DocP>

      <DocH2>Migration &amp; compatibility</DocH2>
      <DocP>
        <strong>Reading:</strong> the engine accepts checkpoint{" "}
        <code className="font-mono text-sm">version</code> <code className="font-mono text-sm">1</code>{" "}
        and <code className="font-mono text-sm">2</code>. Unknown versions are rejected. On import,
        missing top-level <code className="font-mono text-sm">input</code> /{" "}
        <code className="font-mono text-sm">defHash</code> are backfilled from{" "}
        <code className="font-mono text-sm">run</code> (the v1 shape).
      </DocP>
      <DocP>
        <strong>Writing:</strong> new checkpoints are always v2. You do not need an offline rewrite
        job for v1 blobs — restore still works if the graph is registered and{" "}
        <code className="font-mono text-sm">defHash</code> matches.
      </DocP>
      <DocP>
        <strong>Empty defHash:</strong> restore fails. Re-run or re-checkpoint after upgrading from
        a build that did not stamp hashes.
      </DocP>
      <DocP>
        <strong>Graph shape changes (app-level):</strong>
      </DocP>
      <DocCode lang="typescript" filename="migrate-thread.ts">{`// When you must change nodes / interrupts incompatible with old defHash:
// 1. Keep the old graph name registered until waiting threads finish, OR
// 2. Start a new threadId for the new definition and mark the old one abandoned.
//
// Avoid compile({ replace: true }) while production threads still wait on the old hash
// unless you accept restore/resume failures (GRAPH_FAILED / def_hash mismatch).

async function resumeOrRestart(compiled: CompiledGraph, threadId: string, input: object) {
  try {
    const run = await compiled.restore(threadId);
    return run.resume("approved");
  } catch {
    // def_hash mismatch or missing blob → start fresh for this customer
    return compiled.start(input, { threadId: \`\${threadId}:vNext\` });
  }
}`}</DocCode>
      <DocP>
        Prefer additive graph changes (new optional nodes behind edges) over renames. Treat{" "}
        <code className="font-mono text-sm">defHash</code> as the contract between stored threads
        and the compiled definition.
      </DocP>
      <DocP>
        Future formats (v3+) will be documented here with an explicit read path. Until then, only
        v1 and v2 are supported.
      </DocP>

      <DocFaq
        path="/docs/checkpoints"
        items={[
          {
            q: "Do I need the pg package?",
            a: "Only when importing @monorch/ai/postgres. It is an optional peer dependency; memorySaver needs nothing extra.",
          },
          {
            q: "Is this the same as MemoryStore?",
            a: "No. Checkpoints serialize graph run cursor/state for resume. MemoryStore is app key/value. ThreadMemory is chat history for agents.",
          },
          {
            q: "When is put() called?",
            a: "When the run checkpoints (notably around interrupts). You can also call run.checkpoint() yourself.",
          },
          {
            q: "What is defHash for?",
            a: "It fingerprints the compiled graph. After compile({ replace: true }), in-flight runs whose hash no longer matches fail on resume instead of silently continuing on a new definition.",
          },
          {
            q: "What if restore finds nothing?",
            plain:
              "Monorch throws CHECKPOINT_NOT_FOUND. Start a new run for that thread. See Errors & failure modes.",
            a: (
              <>
                Monorch throws <code className="font-mono text-sm">CHECKPOINT_NOT_FOUND</code>. Start
                a new run for that thread. Catalog:{" "}
                <Link
                  href="/docs/reference/errors"
                  className="text-foreground underline-offset-4 hover:underline"
                >
                  Errors &amp; failure modes
                </Link>
                .
              </>
            ),
          },
          {
            q: "Is drive() safe after restore while waiting?",
            a: "Yes. waitingInterrupt advance is idempotent: drive() re-emits wait. Call resume(decision) when the human or system decides.",
          },
          {
            q: "Can I restore a v1 checkpoint?",
            a: "Yes. Import accepts version 1 and 2. Missing top-level input/defHash are backfilled from run. Exports always write version 2.",
          },
          {
            q: "Can I keep checkpoint history?",
            a: "postgresCheckpointer.list returns full history. memorySaver keeps an in-memory list per thread and get() returns the latest blob. For Redis, implement list() yourself.",
          },
          {
            q: "Do I still need Inngest/Temporal?",
            a: "For light HITL across requests, checkpoints are enough. Use a durable workflow engine when work must survive deploys, queues, and multi-service orchestration.",
          },
        ]}
      />
    </>
  );
}
