import Link from "next/link";
import { docPages } from "@/lib/site";
import { docMetadata } from "@/lib/seo";
import {
  DocCode,
  DocH1,
  DocH2,
  DocLead,
  DocNext,
  DocP,
  DocTerm,
  DocTerms,
} from "@/components/docs/doc-blocks";
import { DocFaq } from "@/components/docs/doc-faq";

const page = docPages.find((p) => p.path === "/docs/reference/openai")!;
export const metadata = docMetadata(page);

export default function OpenaiReferencePage() {
  return (
    <>
      <DocH1>
        <code className="font-mono text-[0.9em]">@monorch/ai/openai</code>
      </DocH1>
      <DocLead>
        OpenAI-compatible chat completions provider and a scripted mock for tests. Also re-exported
        from <code className="font-mono text-sm">@monorch/ai</code>.
      </DocLead>

      <DocH2>Import</DocH2>
      <DocCode lang="typescript" filename="import.ts">{`import { openai, mock } from "@monorch/ai/openai";
// or: import { openai, mock } from "@monorch/ai";`}</DocCode>

      <DocH2>Constructors</DocH2>
      <DocTerms>
        <DocTerm name="openai(modelId, options?)">
          Returns a <code className="font-mono text-sm">ModelProvider</code> with{" "}
          <code className="font-mono text-sm">generate</code> and SSE{" "}
          <code className="font-mono text-sm">stream</code>. Point{" "}
          <code className="font-mono text-sm">baseUrl</code> at LiteLLM, OpenRouter, Azure-compatible,
          or local gateways.
        </DocTerm>
        <DocTerm name="mock(script?)">
          Scripted turns for smoke and unit tests. Each generate consumes the next{" "}
          <code className="font-mono text-sm">GenerateResult</code>. Respects abort.
        </DocTerm>
      </DocTerms>

      <DocH2>OpenAiOptions</DocH2>
      <DocTerms>
        <DocTerm name="apiKey?">Bearer token. Falls back to env conventions in examples.</DocTerm>
        <DocTerm name="baseUrl?">
          API root ending in <code className="font-mono text-sm">/v1</code> style chat completions.
        </DocTerm>
        <DocTerm name="timeoutMs?">Default 60_000. Merged with AbortSignal on fetch.</DocTerm>
        <DocTerm name="defaultHeaders?">Extra headers on every request.</DocTerm>
      </DocTerms>

      <DocH2>Keywords</DocH2>
      <DocP>
        Provider stream chunks: <code className="font-mono text-sm">text</code>,{" "}
        <code className="font-mono text-sm">tool_call</code>,{" "}
        <code className="font-mono text-sm">done</code>. Agent loops prefer provider{" "}
        <code className="font-mono text-sm">stream()</code> when present and emit progressive{" "}
        <code className="font-mono text-sm">text</code> AiEvents.
      </DocP>
      <DocP>
        Guide:{" "}
        <Link href="/docs/providers" className="text-foreground underline-offset-4 hover:underline">
          Providers
        </Link>
        .
      </DocP>

      <DocFaq
        path="/docs/reference/openai"
        items={[
          {
            q: "Is this a full OpenAI SDK?",
            a: "No. It is a thin ModelProvider for chat completions plus SSE. Bring Anthropic via LiteLLM or your own provider.",
          },
          {
            q: "How do I cancel?",
            a: "Pass signal on generate/stream, or agent.run(..., { signal }). Timeouts use the same AbortController path.",
          },
        ]}
      />

      <DocNext href="/docs/reference/postgres" label="@monorch/ai/postgres" />
    </>
  );
}
