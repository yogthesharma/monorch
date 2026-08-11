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
        <code className="font-mono text-sm">baseUrl</code>.
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
        Same API as direct OpenAI. Agent <code className="font-mono text-sm">opts.signal</code>{" "}
        forwards into provider fetch.
      </DocP>

      <DocFaq
        path="/docs/recipes/litellm"
        items={[
          {
            q: "How do I smoke live?",
            a: "LIVE_SMOKE=1 with OPENAI_API_KEY or LITELLM_API_KEY in examples/fastify.",
          },
        ]}
      />
    </>
  );
}
