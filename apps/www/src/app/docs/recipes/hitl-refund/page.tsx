import Link from "next/link";
import { DocCode, DocH1, DocH2, DocLead, DocP } from "@/components/docs/doc-blocks";
import { DocFaq } from "@/components/docs/doc-faq";
import { docMetadata } from "@/lib/seo";
import { docPages } from "@/lib/site";

const page = docPages.find((p) => p.path === "/docs/recipes/hitl-refund")!;
export const metadata = docMetadata(page);

export default function HitlRefundRecipePage() {
  return (
    <>
      <DocH1>HITL refund</DocH1>
      <DocLead>
        Pause a graph at an interrupt, persist the checkpoint, resume later from another HTTP
        request. Works the same in Fastify, Hono, or any BYO server.
      </DocLead>

      <DocH2>Pattern</DocH2>
      <DocCode lang="typescript" filename="hitl-refund.ts">{`import { graph, memorySaver } from "@monorch/ai";
// import { postgresCheckpointer, ensureMonorchSchema } from "@monorch/ai/postgres";

const checkpointer = memorySaver(); // or postgresCheckpointer(pool) after ensureMonorchSchema

const refund = graph("refund")
  .node("lookup", async ({ input }) => ({
    output: \`order:\${input.orderId}\`,
    state: { orderId: input.orderId },
  }))
  .interrupt("approve", { prompt: "Approve refund?" })
  .node("pay", async ({ outputs }) => \`refunded:\${outputs.lookup}\`)
  .compile({ checkpointer });

// request A
const started = await refund.start({ orderId: "ord_9" }, { threadId: "t1" });
// started.status === "waitingInterrupt"

// request B (minutes later)
const run = await refund.restore("t1");
await run.drive(); // idempotent while waiting
const done = await run.resume("approved");`}</DocCode>

      <DocH2>Notes</DocH2>
      <DocP>
        Always pass <code className="font-mono text-sm">threadId</code> on start when you need
        restore. Without a checkpointer, restore throws{" "}
        <code className="font-mono text-sm">CHECKPOINT_MISSING</code>. See{" "}
        <Link
          href="/docs/checkpoints"
          className="text-foreground underline-offset-4 hover:underline"
        >
          Checkpoints
        </Link>{" "}
        and{" "}
        <Link
          href="/docs/reference/errors"
          className="text-foreground underline-offset-4 hover:underline"
        >
          Errors
        </Link>
        .
      </DocP>
      <DocP>
        End-to-end HTTP samples:{" "}
        <Link
          href="/docs/recipes/fastify"
          className="text-foreground underline-offset-4 hover:underline"
        >
          Fastify
        </Link>
        ,{" "}
        <Link href="/docs/recipes/hono" className="text-foreground underline-offset-4 hover:underline">
          Hono
        </Link>{" "}
        (<code className="font-mono text-sm">examples/hono-npm</code>).
      </DocP>

      <DocFaq
        path="/docs/recipes/hitl-refund"
        items={[
          {
            q: "Can drive() break a waiting run?",
            a: "No. waitingInterrupt advance re-emits wait. Call resume(decision) to continue.",
          },
          {
            q: "What if the graph definition changed?",
            a: "defHash mismatch fails restore/resume. Keep the old definition registered or start a new threadId — see Checkpoints migration.",
          },
        ]}
      />
    </>
  );
}
