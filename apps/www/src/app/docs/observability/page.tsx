import { docPages } from "@/lib/site";
import { docMetadata } from "@/lib/seo";
import { DocCode, DocH1, DocH2, DocLead, DocP } from "@/components/docs/doc-blocks";
import { DocFaq } from "@/components/docs/doc-faq";

const page = docPages.find((p) => p.path === "/docs/observability")!;
export const metadata = docMetadata(page);

export default function ObservabilityPage() {
  return (
    <>
      <DocH1>Observability</DocH1>
      <DocLead>
        One event bus. Optional OpenTelemetry. Pass{" "}
        <code className="font-mono text-sm">createOtelListener</code> as{" "}
        <code className="font-mono text-sm">onEvent</code>, or tap a stream with{" "}
        <code className="font-mono text-sm">tapEvents</code>.
      </DocLead>

      <DocH2>OTel listener</DocH2>
      <DocCode lang="typescript" filename="otel.ts">{`import { agent, createOtelListener } from "@monorch/ai";

const otel = createOtelListener({
  serviceName: "monorch-support",
  onEvent: (ev) => console.debug(ev.type),
});

const bot = agent({
  model,
  tools,
  onEvent: otel,
});`}</DocCode>

      <DocH2>Tap a stream</DocH2>
      <DocCode lang="typescript" filename="tap.ts">{`import { tapEvents, createOtelListener } from "@monorch/ai";

for await (const ev of tapEvents(bot.stream(msg), createOtelListener())) {
  sendSse(ev);
}`}</DocCode>

      <DocH2>Peer dependency</DocH2>
      <DocP>
        Install <code className="font-mono text-sm">@opentelemetry/api</code> when you want spans.
        Without it, the listener still forwards to your{" "}
        <code className="font-mono text-sm">onEvent</code> hook safely.
      </DocP>

      <DocFaq
        path="/docs/observability"
        items={[
          {
            q: "Do I need a collector to use createOtelListener?",
            a: "For real spans, yes (or any OTel SDK setup). Without @opentelemetry/api, hooks still run.",
          },
          {
            q: "Which events become spans?",
            a: "Run boundaries and notable steps (tools/nodes) are attributed when a tracer is available. Treat AiEvent as the source of truth.",
          },
          {
            q: "Can I send events to Langfuse?",
            a: "Yes via OTel exporters or by mapping AiEvent in onEvent. Monorch does not vendor Langfuse.",
          },
          {
            q: "Does this replace logging?",
            a: "No. Use onEvent for structured logs if you want. Keep Pino/your logger for HTTP.",
          },
          {
            q: "Where is this smoked?",
            a: "The repo smoke (examples/fastify) attaches createOtelListener and records event types during agent runs.",
          },
        ]}
      />
    </>
  );
}
