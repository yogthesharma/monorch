import { docPages } from "@/lib/site";
import { docMetadata } from "@/lib/seo";
import { DocCode, DocH1, DocH2, DocLead, DocNext, DocP } from "@/components/docs/doc-blocks";
import { DocFaq } from "@/components/docs/doc-faq";

const page = docPages.find((p) => p.path === "/docs/architecture")!;
export const metadata = docMetadata(page);

export default function ArchitecturePage() {
  return (
    <>
      <DocH1>Architecture</DocH1>
      <DocLead>
        Four trees. No parallel packages. Rust owns truth. TypeScript owns I/O.
      </DocLead>

      <DocCode lang="text" filename="monorch/">{`monorch/
├── engine/           # Rust: schema, tools, agent, graph
├── bindings/node/    # @monorch/runtime (N-API only)
├── packages/ai/      # @monorch/ai (sole user TS API)
├── examples/fastify/ # BYO HTTP example
└── apps/www/         # Homepage + docs`}</DocCode>

      <DocH2>Rules</DocH2>
      <DocP>
        1. Validate, auth, agent, and graph state live in Rust only.
        <br />
        2. Provider HTTP, node execute, edge predicates, and checkpointer I/O live in TypeScript.
        <br />
        3. Prefer <code className="font-mono text-sm">graph()</code> over{" "}
        <code className="font-mono text-sm">workflow()</code> for new code.
        <br />
        4. Examples never become frameworks. <code className="font-mono text-sm">apps/www</code> is
        marketing and docs only.
      </DocP>

      <DocH2>Request path</DocH2>
      <DocP>
        Handler calls <code className="font-mono text-sm">agent.stream</code> or{" "}
        <code className="font-mono text-sm">graph.start</code>. TS talks to the model and runs node
        callbacks. Rust advances the run, prepares tool args, and stores status. Events leave as{" "}
        <code className="font-mono text-sm">AiEvent</code>.
      </DocP>

      <DocH2>Package map</DocH2>
      <DocP>
        <code className="font-mono text-sm">@monorch/ai</code> exports model, tool, agent, graph,
        workflow, memorySaver, inMemoryStore, mcpTools, createOtelListener, and events.{" "}
        <code className="font-mono text-sm">@monorch/runtime</code> is the Engine FFI. Do not put
        business logic in the binding crate.
      </DocP>

      <DocFaq
        path="/docs/architecture"
        items={[
          {
            q: "Why not put LLM calls in Rust?",
            a: "Provider SDKs, streaming fetch, and app secrets already live in Node. Rust owns deterministic state machines and validation.",
          },
          {
            q: "Can I add another user package like @monorch/agents?",
            a: "Not until release cadence forces it. Keep one user API surface.",
          },
          {
            q: "Is apps/www part of the product runtime?",
            a: "No. It must not import engine internals or become a Studio.",
          },
          {
            q: "Where do graph definitions live after compile?",
            a: "Registered in the Rust engine for the process. TypeScript keeps local node execute and condition maps keyed by graph name.",
          },
        ]}
      />

      <DocNext href="/docs/agents" label="Agents" />
    </>
  );
}
