import { docPages } from "@/lib/site";
import { docMetadata } from "@/lib/seo";
import { DocCode, DocH1, DocH2, DocLead, DocNext } from "@/components/docs/doc-blocks";
import { DocFaq } from "@/components/docs/doc-faq";

const page = docPages.find((p) => p.path === "/docs/streaming")!;
export const metadata = docMetadata(page);

export default function StreamingPage() {
  return (
    <>
      <DocH1>Streaming</DocH1>
      <DocLead>
        Agents and graphs emit a shared <code className="font-mono text-sm">AiEvent</code> stream.
        Pipe it to SSE, websockets, logs, or OpenTelemetry.
      </DocLead>

      <DocH2>Agent SSE</DocH2>
      <DocCode lang="typescript" filename="sse.ts">{`reply.hijack();
reply.raw.writeHead(200, {
  "content-type": "text/event-stream",
  "cache-control": "no-cache",
  connection: "keep-alive",
});

for await (const ev of bot.stream(message)) {
  reply.raw.write(\`data: \${JSON.stringify(ev)}\\n\\n\`);
}
reply.raw.end();`}</DocCode>

      <DocH2>Event union</DocH2>
      <DocCode lang="typescript" filename="events.ts">{`type AiEvent =
  | { type: "run_start"; runId: string; kind: "agent" | "graph"; name: string }
  | { type: "text"; runId: string; text: string }
  | { type: "tool_call"; runId: string; toolCall: AiToolCall }
  | { type: "tool_result"; runId: string; toolCallId: string; name: string; content: string }
  | { type: "node_start"; runId: string; nodeId: string; nodeType: string }
  | { type: "node_end"; runId: string; nodeId: string; output?: string }
  | { type: "interrupt"; runId: string; nodeId: string; prompt: string }
  | { type: "handoff"; runId: string; from: string; to: string }
  | { type: "error"; runId: string; error: string }
  | {
      type: "run_end";
      runId: string;
      status: "completed" | "failed" | "waitingInterrupt" | "handed_off" | "aborted";
      result?: JsonValue;
    };`}</DocCode>

      <DocH2>Helpers</DocH2>
      <DocCode lang="typescript" filename="helpers.ts">{`import { collectEvents, tapEvents, createOtelListener } from "@monorch/ai";

const events = await collectEvents(bot.stream("hi"));

for await (const ev of tapEvents(bot.stream("hi"), createOtelListener())) {
  // same events, plus OTel side effects
}`}</DocCode>

      <DocFaq
        path="/docs/streaming"
        items={[
          {
            q: "Is this token streaming from the model?",
            a: "Both layers exist. openai() streams provider SSE tokens. When the provider implements stream(), agents prefer it and emit progressive text AiEvents (plus tool_call chunks). AiEvent also covers tools, nodes, handoffs, and run lifecycle.",
          },
          {
            q: "Do graphs and agents share the same event types?",
            a: "Yes. kind on run_start tells you which. Graphs add node_* and interrupt events.",
          },
          {
            q: "How do I test streams?",
            plain: "Collect events from agent.stream or graph start into an array in tests. Prefer mock providers for determinism.",
            a: (
              <>
                Use <code className="font-mono text-sm">collectEvents</code> and assert on types
                like run_start / tool_call / run_end.
              </>
            ),
          },
          {
            q: "Can onEvent and stream both fire?",
            a: "Yes. onEvent is a sink during the loop. stream() yields the same progressive events to the caller.",
          },
          {
            q: "What closes an SSE response?",
            a: "When the async iterator completes (run_end). Always end the response in a finally block if you add cancel paths.",
          },
        ]}
      />

      <DocNext href="/docs/workflows" label="Workflows" />
    </>
  );
}
