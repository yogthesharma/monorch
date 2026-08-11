import Link from "next/link";
import { docPages } from "@/lib/site";
import { docMetadata } from "@/lib/seo";
import { DocCode, DocH1, DocH2, DocLead, DocP } from "@/components/docs/doc-blocks";
import { DocFaq } from "@/components/docs/doc-faq";

const page = docPages.find((p) => p.path === "/docs/workflows")!;
export const metadata = docMetadata(page);

export default function WorkflowsPage() {
  return (
    <>
      <DocH1>Workflows</DocH1>
      <DocLead>
        Linear sugar over <code className="font-mono text-sm">graph()</code>. Kept for simple step
        chains. <strong>Prefer graphs</strong> for new code (branching, cycles, interrupts,
        checkpoints). See the{" "}
        <Link href="/docs/api" className="text-foreground underline-offset-4 hover:underline">
          Public API
        </Link>{" "}
        contract.
      </DocLead>

      <DocH2>Builder</DocH2>
      <DocCode lang="typescript" filename="refund-workflow.ts">{`import { workflow, memorySaver } from "@monorch/ai";

const refund = workflow("refund", { maxSteps: 16 })
  .step("lookup", async ({ input }) => \`order:\${input.orderId}\`)
  .human("approve", { prompt: "Approve refund?" })
  .step("pay", async ({ outputs }) => \`refunded:\${outputs.lookup}\`)
  .build({ checkpointer: memorySaver() });

let run = await refund.start({ orderId: "ord_9" }, { threadId: "t1" });
if (run.status === "waitingInterrupt") {
  run = await run.resume("approved");
}`}</DocCode>

      <DocH2>Mapping to graph</DocH2>
      <DocP>
        <code className="font-mono text-sm">step</code> →{" "}
        <code className="font-mono text-sm">node</code>.{" "}
        <code className="font-mono text-sm">agentStep</code> →{" "}
        <code className="font-mono text-sm">agentNode</code>.{" "}
        <code className="font-mono text-sm">human</code> →{" "}
        <code className="font-mono text-sm">interrupt</code>. The run handle is a{" "}
        <code className="font-mono text-sm">GraphRunHandle</code>. Status{" "}
        <code className="font-mono text-sm">waitingInterrupt</code> replaces older waitingHuman
        naming.
      </DocP>
      <DocP>
        <code className="font-mono text-sm">workflow(name, {"{ maxRetries }"})</code> accepts{" "}
        <code className="font-mono text-sm">maxRetries</code> for API compatibility but it is a{" "}
        <strong>no-op</strong> today — the builder compiles to{" "}
        <code className="font-mono text-sm">graph()</code> and uses fail-fast +{" "}
        <code className="font-mono text-sm">maxSteps</code>. Pass{" "}
        <code className="font-mono text-sm">maxSteps</code> on{" "}
        <code className="font-mono text-sm">workflow()</code> or{" "}
        <code className="font-mono text-sm">build()</code> for step budgets.
      </DocP>

      <DocFaq
        path="/docs/workflows"
        items={[
          {
            q: "Should new code use workflow()?",
            a: "No for anything beyond a dead-simple linear chain. Start with graph() so you do not rewrite later. workflow() remains supported sugar under the Public API policy.",
          },
          {
            q: "Does maxRetries still apply?",
            a: "No. It is ignored. Use maxSteps (and graph() for real control). Retries are not automatic.",
          },
          {
            q: "Can workflows branch?",
            a: "Not meaningfully. Use graph().edge(...) for conditions and cycles.",
          },
          {
            q: "Is workflow() part of the public API?",
            a: "Yes, as documented sugar. Stability follows the Public API / SemVer page. Graphs are still the source of truth in STRUCTURE.md.",
          },
        ]}
      />
    </>
  );
}
