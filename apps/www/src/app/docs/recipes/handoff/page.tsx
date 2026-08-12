import Link from "next/link";
import { DocCode, DocH1, DocH2, DocLead, DocP } from "@/components/docs/doc-blocks";
import { DocFaq } from "@/components/docs/doc-faq";
import { docMetadata } from "@/lib/seo";
import { docPages } from "@/lib/site";

const page = docPages.find((p) => p.path === "/docs/recipes/handoff")!;
export const metadata = docMetadata(page);

export default function HandoffRecipePage() {
  return (
    <>
      <DocH1>Multi-agent handoff</DocH1>
      <DocLead>
        Declare handoff targets on an agent. The model gets{" "}
        <code className="font-mono text-sm">handoff_to_&lt;name&gt;</code> tools, or you force a
        transfer with <code className="font-mono text-sm">handoff()</code>.
      </DocLead>

      <DocH2>Pattern</DocH2>
      <DocCode lang="typescript" filename="handoff.ts">{`import { agent, mock } from "@monorch/ai";

const billing = agent({
  name: "billing",
  model: mock([{ text: "Refund initiated." }]),
  instructions: "Handle billing.",
});

const triage = agent({
  name: "triage",
  model: mock([
    {
      toolCalls: [
        {
          id: "h1",
          name: "handoff_to_billing",
          arguments: { message: "Customer wants a refund" },
        },
      ],
    },
  ]),
  instructions: "Route billing issues to billing.",
  handoffs: [billing],
});

const result = await triage.run("I need a refund");
// events include handoff; billing run continues; run_end status handed_off then completed

// or force:
await triage.handoff(billing, "Customer wants a refund");`}</DocCode>

      <DocH2>Notes</DocH2>
      <DocP>
        Target must be listed in <code className="font-mono text-sm">handoffs</code>. Unique agent
        names matter; <code className="font-mono text-sm">getAgent</code> resolves by name. Denied
        targets throw <code className="font-mono text-sm">HANDOFF_DENIED</code> —{" "}
        <Link
          href="/docs/reference/errors"
          className="text-foreground underline-offset-4 hover:underline"
        >
          error codes
        </Link>
        .
      </DocP>

      <DocFaq
        path="/docs/recipes/handoff"
        items={[
          {
            q: "Can handoff mix with other tools?",
            a: "Not in the same model turn. Monorch throws HANDOFF_MIXED.",
          },
          {
            q: "Where is this smoked?",
            a: "examples/npm-smoke /handoff and the Fastify smoke cover handoff events end-to-end.",
          },
        ]}
      />
    </>
  );
}
