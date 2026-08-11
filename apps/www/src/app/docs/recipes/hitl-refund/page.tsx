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
        request.
      </DocLead>

      <DocH2>Pattern</DocH2>
      <DocCode lang="typescript" filename="hitl-refund.ts">{`import { graph, memorySaver } from "@monorch/ai";

const checkpointer = memorySaver(); // or postgresCheckpointer(pool)

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
        restore. Without a checkpointer, restore throws.
      </DocP>

      <DocFaq
        path="/docs/recipes/hitl-refund"
        items={[
          {
            q: "Can drive() break a waiting run?",
            a: "No. waitingInterrupt advance re-emits wait. Call resume(decision) to continue.",
          },
        ]}
      />
    </>
  );
}
