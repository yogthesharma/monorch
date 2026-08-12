import Link from "next/link";
import { DocCode, DocH1, DocH2, DocLead, DocP } from "@/components/docs/doc-blocks";
import { DocFaq } from "@/components/docs/doc-faq";
import { docMetadata } from "@/lib/seo";
import { docPages } from "@/lib/site";

const page = docPages.find((p) => p.path === "/docs/recipes/abort")!;
export const metadata = docMetadata(page);

export default function AbortRecipePage() {
  return (
    <>
      <DocH1>Abort + timeouts</DocH1>
      <DocLead>
        Cancel agent loops and provider calls with{" "}
        <code className="font-mono text-sm">AbortSignal</code>. Timeouts share the same path and
        surface as <code className="font-mono text-sm">AiError</code> code{" "}
        <code className="font-mono text-sm">ABORTED</code>.
      </DocLead>

      <DocH2>Agent abort</DocH2>
      <DocCode lang="typescript" filename="abort-agent.ts">{`import { agent, AiError, mock } from "@monorch/ai";

const bot = agent({ name: "abortable", model: mock([{ text: "hi" }]) });
const ctrl = new AbortController();

const pending = bot.stream("long task", { signal: ctrl.signal });
ctrl.abort();

try {
  for await (const _ of pending) {
    // may not yield if aborted early
  }
} catch (e) {
  if (e instanceof AiError && e.code === "ABORTED") {
    // run_end status was "aborted"
  }
}`}</DocCode>

      <DocH2>Provider timeout</DocH2>
      <DocCode lang="typescript" filename="timeout.ts">{`import { openai } from "@monorch/ai/openai";

const model = openai("gpt-4.1-mini", { timeoutMs: 15_000 });
// or per call:
await model.generate({
  messages: [{ role: "user", content: "hi" }],
  timeoutMs: 5_000,
});`}</DocCode>

      <DocH2>Notes</DocH2>
      <DocP>
        Default openai timeout is 60s. Pre-aborted signals throw before model I/O. Full catalog:{" "}
        <Link
          href="/docs/reference/errors"
          className="text-foreground underline-offset-4 hover:underline"
        >
          Errors &amp; failure modes
        </Link>
        .
      </DocP>

      <DocFaq
        path="/docs/recipes/abort"
        items={[
          {
            q: "Does abort clear thread memory?",
            a: "No. Thread append only runs on successful completion.",
          },
        ]}
      />
    </>
  );
}
