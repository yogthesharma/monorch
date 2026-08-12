import Link from "next/link";
import { DocCode, DocH1, DocH2, DocLead, DocP } from "@/components/docs/doc-blocks";
import { DocFaq } from "@/components/docs/doc-faq";
import { docMetadata } from "@/lib/seo";
import { docPages } from "@/lib/site";

const page = docPages.find((p) => p.path === "/docs/recipes/litellm")!;
export const metadata = docMetadata(page);

export default function LitellmRecipePage() {
  return (
    <>
      <DocH1>LiteLLM proxy</DocH1>
      <DocLead>
        Point the OpenAI-compatible client at LiteLLM (or OpenRouter / vLLM) with{" "}
        <code className="font-mono text-sm">baseUrl</code>. Same{" "}
        <code className="font-mono text-sm">openai()</code> helper as direct OpenAI.
      </DocLead>

      <DocH2>Pattern</DocH2>
      <DocCode lang="typescript" filename="litellm.ts">{`import { agent } from "@monorch/ai";
import { openai } from "@monorch/ai/openai";

const model = openai(process.env.LIVE_MODEL ?? "gpt-4.1-mini", {
  apiKey: process.env.LITELLM_API_KEY ?? process.env.OPENAI_API_KEY,
  baseUrl: process.env.LITELLM_URL ?? "http://127.0.0.1:4000/v1",
  timeoutMs: 60_000,
});

const bot = agent({
  name: "proxy",
  model,
  instructions: "Be concise.",
});

await bot.run("ping");`}</DocCode>

      <DocH2>Notes</DocH2>
      <DocP>
        Auth missing → <code className="font-mono text-sm">OPENAI_AUTH</code>. Non-OK HTTP →{" "}
        <code className="font-mono text-sm">OPENAI_HTTP</code>. Agent{" "}
        <code className="font-mono text-sm">opts.signal</code> forwards into provider fetch. See{" "}
        <Link
          href="/docs/reference/errors"
          className="text-foreground underline-offset-4 hover:underline"
        >
          Errors
        </Link>{" "}
        and{" "}
        <Link
          href="/docs/reference/openai"
          className="text-foreground underline-offset-4 hover:underline"
        >
          openai reference
        </Link>
        .
      </DocP>

      <DocFaq
        path="/docs/recipes/litellm"
        items={[
          {
            q: "How do I smoke live?",
            a: "From the monorepo: LIVE_SMOKE=1 pnpm smoke:live with OPENAI_API_KEY or LITELLM_API_KEY / LITELLM_URL.",
          },
        ]}
      />
    </>
  );
}
