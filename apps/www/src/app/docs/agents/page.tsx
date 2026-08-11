import { docPages } from "@/lib/site";
import { docMetadata } from "@/lib/seo";
import { DocCode, DocH1, DocH2, DocLead, DocNext, DocP } from "@/components/docs/doc-blocks";
import { DocFaq } from "@/components/docs/doc-faq";

const page = docPages.find((p) => p.path === "/docs/agents")!;
export const metadata = docMetadata(page);

export default function AgentsPage() {
  return (
    <>
      <DocH1>Agents</DocH1>
      <DocLead>
        An agent wraps a model, optional tools, instructions, handoffs, and an event sink. The tool
        loop state machine lives in Rust. Prefer <code className="font-mono text-sm">stream()</code>{" "}
        when you need progressive UI updates.
      </DocLead>

      <DocH2>Create and run</DocH2>
      <DocCode lang="typescript" filename="support-agent.ts">{`import { agent, createOtelListener } from "@monorch/ai";
import { openai } from "@monorch/ai/openai";

const otel = createOtelListener({ serviceName: "support" });

const support = agent({
  name: "support",
  model: openai("gpt-4.1-mini", { baseUrl: process.env.LITELLM_URL }),
  instructions: "Be concise. Prefer tools for facts.",
  tools: [lookupOrder],
  maxSteps: 8,
  onEvent: otel,
});

const { text, runId, events } = await support.run(userMessage);

for await (const ev of support.stream(userMessage)) {
  // run_start | text | tool_call | tool_result | handoff | run_end | error
}`}</DocCode>

      <DocH2>Per-run options</DocH2>
      <DocP>
        Both <code className="font-mono text-sm">run</code> and{" "}
        <code className="font-mono text-sm">stream</code> accept{" "}
        <code className="font-mono text-sm">AgentRunOptions</code>: load/append thread memory, and
        abort in-flight model calls.
      </DocP>
      <DocCode lang="typescript" filename="run-options.ts">{`import { agent, inMemoryThreads } from "@monorch/ai";

const threads = inMemoryThreads();
const bot = agent({ name: "mem", model, instructions: "Remember prior turns." });

await bot.run("hello", { threadId: "t1", memory: threads });
await bot.run("again", { threadId: "t1", memory: threads });

const ctrl = new AbortController();
const pending = bot.stream("long task", { signal: ctrl.signal });
ctrl.abort(); // stops the loop / aborts provider fetch`}</DocCode>

      <DocH2>Options</DocH2>
      <DocP>
        <code className="font-mono text-sm">name</code> (default{" "}
        <code className="font-mono text-sm">agent</code>),{" "}
        <code className="font-mono text-sm">model</code> (provider or model handle),{" "}
        <code className="font-mono text-sm">instructions</code>,{" "}
        <code className="font-mono text-sm">tools</code> (registered tool defs),{" "}
        <code className="font-mono text-sm">handoffs</code> (other agents),{" "}
        <code className="font-mono text-sm">maxSteps</code> (default 8),{" "}
        <code className="font-mono text-sm">onEvent</code>.
      </DocP>

      <DocH2>Registry</DocH2>
      <DocP>
        Creating an agent registers it by <code className="font-mono text-sm">name</code> (default{" "}
        <code className="font-mono text-sm">agent</code>). Use{" "}
        <code className="font-mono text-sm">getAgent(name)</code> from graphs (
        <code className="font-mono text-sm">agentNode</code>) or your own wiring. Later{" "}
        <code className="font-mono text-sm">{`agent({ name })`}</code> with the same name replaces
        the registry entry.
      </DocP>

      <DocH2>Handoffs</DocH2>
      <DocP>
        Pass <code className="font-mono text-sm">handoffs: [billing]</code>. Monorch exposes{" "}
        <code className="font-mono text-sm">handoff_to_&lt;name&gt;</code> tools to the model. You
        can also force a transfer with{" "}
        <code className="font-mono text-sm">agent.handoff(target, input)</code>. Target must be listed
        in <code className="font-mono text-sm">handoffs</code>.
      </DocP>
      <DocCode lang="typescript" filename="triage.ts">{`const billing = agent({
  name: "billing",
  model: mock([{ text: "Refund initiated." }]),
  instructions: "Handle billing.",
});

const triage = agent({
  name: "triage",
  model,
  instructions: "Route billing issues to billing.",
  handoffs: [billing],
});

// model-driven: handoff_to_billing tool
await triage.run("I need a refund");

// programmatic
await triage.handoff(billing, "Customer wants a refund");`}</DocCode>

      <DocH2>What Rust owns</DocH2>
      <DocP>
        Run id, message history, step counts, pending tool calls, handoff targets, terminal states.
        JavaScript owns model generate/stream and tool{" "}
        <code className="font-mono text-sm">execute</code>.
      </DocP>

      <DocH2>Result shape</DocH2>
      <DocCode lang="typescript" filename="result.ts">{`type AgentResult = {
  text: string;
  runId: string;
  events: AiEvent[];
};`}</DocCode>

      <DocFaq
        path="/docs/agents"
        items={[
          {
            q: "How do I keep conversation history across requests?",
            plain: "Pass { threadId, memory } into run / stream. Prior turns load automatically; successful turns append.",
            a: (
              <>
                Pass <code className="font-mono text-sm">{`{ threadId, memory }`}</code> into{" "}
                <code className="font-mono text-sm">run</code> /{" "}
                <code className="font-mono text-sm">stream</code>. Prior turns load automatically;
                successful turns append.
              </>
            ),
          },
          {
            q: "How do I cancel a run?",
            plain: "Pass an AbortSignal via opts.signal. The loop checks abort between steps and forwards the signal to the provider.",
            a: (
              <>
                Pass an <code className="font-mono text-sm">AbortSignal</code> via{" "}
                <code className="font-mono text-sm">opts.signal</code>. The loop checks abort between
                steps and forwards the signal to the provider.
              </>
            ),
          },
          {
            q: "Does run() stream under the hood?",
            a: "Yes. run() consumes stream() to completion and returns the final AgentResult, including the collected events array.",
          },
          {
            q: "How do tool permissions work during an agent loop?",
            plain: "The loop calls callTool with { roles: [\"agent\"] } by default. Match that in the tool permission roles list.",
            a: (
              <>
                The loop calls <code className="font-mono text-sm">callTool</code> with{" "}
                <code className="font-mono text-sm">{`{ roles: ["agent"] }`}</code> by default. Match
                that in the tool permission roles list.
              </>
            ),
          },
          {
            q: "What happens when maxSteps is hit?",
            a: "The Rust agent run fails. You get an AiError / failed event rather than an infinite loop.",
          },
          {
            q: "Can two agents share tools?",
            a: "Yes. Tools are process-registered by name. Pass the same tool defs to multiple agents.",
          },
          {
            q: "How do I log every event without SSE?",
            plain: "Pass onEvent or wrap the stream with tapEvents / createOtelListener.",
            a: (
              <>
                Pass <code className="font-mono text-sm">onEvent</code> or wrap the stream with{" "}
                <code className="font-mono text-sm">tapEvents</code> /{" "}
                <code className="font-mono text-sm">createOtelListener</code>.
              </>
            ),
          },
          {
            q: "What run_end status do handoffs and aborts use?",
            a: "Handoffs emit run_end with status handed_off before the target agent starts. Aborts emit run_end with status aborted and throw AiError with code ABORTED.",
          },
          {
            q: "Why do smoke tests create unique agent names?",
            a: "agent() registers by name in-process. Reusing the same name replaces the prior entry. Unique names avoid cross-test collisions when handoffs resolve getAgent targets.",
          },
        ]}
      />

      <DocNext href="/docs/tools" label="Tools" />
    </>
  );
}
