import { docPages } from "@/lib/site";
import { docMetadata } from "@/lib/seo";
import { DocCode, DocH1, DocH2, DocLead, DocNext, DocP } from "@/components/docs/doc-blocks";
import { DocFaq } from "@/components/docs/doc-faq";

const page = docPages.find((p) => p.path === "/docs/providers")!;
export const metadata = docMetadata(page);

export default function ProvidersPage() {
  return (
    <>
      <DocH1>Providers</DocH1>
      <DocLead>
        OpenAI-compatible chat completions with SSE streaming, timeouts, and abort. Point{" "}
        <code className="font-mono text-sm">baseUrl</code> at LiteLLM, OpenRouter, or a local
        gateway. We do not rebuild a proxy.
      </DocLead>

      <DocH2>OpenAI / LiteLLM</DocH2>
      <DocCode lang="typescript" filename="model.ts">{`import { openai } from "@monorch/ai/openai";
// or: import { openai } from "@monorch/ai";

const model = openai("gpt-4.1-mini", {
  apiKey: process.env.OPENAI_API_KEY ?? process.env.LITELLM_API_KEY,
  baseUrl: process.env.LITELLM_URL ?? "https://api.openai.com/v1",
  timeoutMs: 60_000,
  defaultHeaders: { "x-custom": "1" },
});`}</DocCode>

      <DocH2>Streaming and abort</DocH2>
      <DocP>
        <code className="font-mono text-sm">openai()</code> implements provider{" "}
        <code className="font-mono text-sm">stream()</code> over SSE. Per-call{" "}
        <code className="font-mono text-sm">signal</code> and{" "}
        <code className="font-mono text-sm">timeoutMs</code> merge into the fetch abort. Agent{" "}
        <code className="font-mono text-sm">opts.signal</code> forwards here.
      </DocP>
      <DocCode lang="typescript" filename="abort.ts">{`const ctrl = new AbortController();
const handle = model(openai("gpt-4.1-mini"));

const pending = handle.generate({
  messages: [{ role: "user", content: "hi" }],
  signal: ctrl.signal,
  timeoutMs: 15_000,
});
ctrl.abort();`}</DocCode>

      <DocH2>Mock</DocH2>
      <DocP>
        Script text and tool calls in order for tests and smoke. Each{" "}
        <code className="font-mono text-sm">generate</code> consumes the next scripted turn. Mock
        also respects abort.
      </DocP>
      <DocCode lang="typescript" filename="mock-model.ts">{`import { mock } from "@monorch/ai/openai";

const model = mock([
  { toolCalls: [{ id: "1", name: "add", arguments: { a: 1, b: 2 } }] },
  { text: "done" },
]);`}</DocCode>

      <DocH2>Model handle</DocH2>
      <DocP>
        Wrap any provider with <code className="font-mono text-sm">model(provider)</code> for{" "}
        <code className="font-mono text-sm">generate</code>,{" "}
        <code className="font-mono text-sm">stream</code>, and{" "}
        <code className="font-mono text-sm">generateObject</code> (Zod → Rust validate).
      </DocP>
      <DocCode lang="typescript" filename="generate-object.ts">{`import { model } from "@monorch/ai";
import { openai } from "@monorch/ai/openai";
import { z } from "zod";

const handle = model(openai("gpt-4.1-mini"));
const reply = await handle.generateObject({
  prompt: "Classify: I want a refund",
  output: z.object({ intent: z.enum(["refund", "faq", "other"]) }),
});`}</DocCode>

      <DocH2>Live smoke</DocH2>
      <DocP>
        The Fastify example supports{" "}
        <code className="font-mono text-sm">LIVE_SMOKE=1</code> with{" "}
        <code className="font-mono text-sm">OPENAI_API_KEY</code> or{" "}
        <code className="font-mono text-sm">LITELLM_API_KEY</code> (optional{" "}
        <code className="font-mono text-sm">LITELLM_URL</code> /{" "}
        <code className="font-mono text-sm">LIVE_MODEL</code>).
      </DocP>

      <DocFaq
        path="/docs/providers"
        items={[
          {
            q: "Does Monorch call providers from Rust?",
            a: "No. All provider HTTP is TypeScript.",
          },
          {
            q: "How do I use Azure OpenAI or vLLM?",
            a: "If it speaks OpenAI chat completions, set baseUrl (and headers/key) accordingly.",
          },
          {
            q: "What is the default timeout?",
            a: "60s on openai(). Override with timeoutMs on the provider or per generate call.",
          },
          {
            q: "Is provider SSE the same as AiEvent stream?",
            a: "No. Provider stream() yields model tokens/chunks. agent.stream() yields application AiEvents (tools, handoffs, run lifecycle).",
          },
          {
            q: "Can I bring Anthropic natively?",
            a: "Implement ModelProvider yourself or route through LiteLLM. openai() is the built-in compatible client.",
          },
          {
            q: "What about structured output?",
            plain: "Pass a Zod schema through the model/agent path. Rust validates structured results against the IR schema.",
            a: (
              <>
                Use <code className="font-mono text-sm">model(provider).generateObject</code>. JSON
                is validated against Zod via the Rust schema IR.
              </>
            ),
          },
        ]}
      />

      <DocNext href="/docs/mcp" label="MCP" />
    </>
  );
}
