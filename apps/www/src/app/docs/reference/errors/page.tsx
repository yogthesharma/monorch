import { DocH1, DocH2, DocLead, DocP, DocTerm, DocTerms } from "@/components/docs/doc-blocks";
import { DocFaq } from "@/components/docs/doc-faq";
import { docMetadata } from "@/lib/seo";
import { docPages } from "@/lib/site";

const page = docPages.find((p) => p.path === "/docs/reference/errors")!;
export const metadata = docMetadata(page);

export default function ErrorsReferencePage() {
  return (
    <>
      <DocH1>Error codes</DocH1>
      <DocLead>
        <code className="font-mono text-sm">AiError</code> carries a string{" "}
        <code className="font-mono text-sm">code</code> plus optional{" "}
        <code className="font-mono text-sm">details</code>. Match on{" "}
        <code className="font-mono text-sm">code</code> in handlers.
      </DocLead>

      <DocH2>Agents &amp; handoffs</DocH2>
      <DocTerms>
        <DocTerm name="ABORTED">
          AbortSignal fired. run_end status is aborted. Check caller cancellation / timeouts.
        </DocTerm>
        <DocTerm name="AGENT_FAILED">
          Rust agent loop failed (maxSteps, unexpected outcome). Inspect details.runId and prior
          events.
        </DocTerm>
        <DocTerm name="AGENT_MISSING">
          getAgent / handoff / agentNode could not find the named agent. Register before use; unique
          names.
        </DocTerm>
        <DocTerm name="HANDOFF_DENIED">
          Target not listed in handoffs: [...]. Add the agent to the array.
        </DocTerm>
        <DocTerm name="HANDOFF_MIXED">
          Model returned handoff_to_* with other tool calls in the same turn. Fix prompting or
          provider tool choice.
        </DocTerm>
        <DocTerm name="HANDOFF_FAILED">Forced handoff did not complete in the engine.</DocTerm>
      </DocTerms>

      <DocH2>Tools</DocH2>
      <DocTerms>
        <DocTerm name="TOOL_MISSING">
          callTool hit a name with no local execute registry entry.
        </DocTerm>
        <DocTerm name="TOOL_PREPARE_FAILED">
          Rust prepare failed (auth or schema). Align permission roles and Zod input.
        </DocTerm>
      </DocTerms>

      <DocH2>Graphs &amp; checkpoints</DocH2>
      <DocTerms>
        <DocTerm name="GRAPH_EMPTY">compile() with no nodes.</DocTerm>
        <DocTerm name="GRAPH_FAILED">
          Advance failed, node threw, or defHash mismatch after replace. See message / details.runId.
        </DocTerm>
        <DocTerm name="GRAPH_ROUTE">
          needsRoute with no matching predicate and no unconditional fallback edge.
        </DocTerm>
        <DocTerm name="GRAPH_RESUME_INVALID">
          resume() called when status is not waitingInterrupt.
        </DocTerm>
        <DocTerm name="NODE_MISSING">
          Engine asked for a node id with no TypeScript handler map entry.
        </DocTerm>
        <DocTerm name="CHECKPOINT_MISSING">
          restore() without compile({"{"} checkpointer {"}"}).
        </DocTerm>
        <DocTerm name="CHECKPOINT_NOT_FOUND">No blob for that threadId in the checkpointer.</DocTerm>
      </DocTerms>

      <DocH2>Model / structured output</DocH2>
      <DocTerms>
        <DocTerm name="EMPTY_OUTPUT">generateObject got empty text.</DocTerm>
        <DocTerm name="INVALID_JSON">Model text was not parseable JSON.</DocTerm>
        <DocTerm name="VALIDATION_FAILED">JSON failed Rust schema validation against Zod IR.</DocTerm>
        <DocTerm name="OPENAI_AUTH">API key missing for openai().</DocTerm>
        <DocTerm name="OPENAI_HTTP">
          Provider returned a non-OK HTTP status from chat completions. Check baseUrl, model id,
          quotas, and the response body in details when present.
        </DocTerm>
        <DocTerm name="OPENAI_STREAM">SSE body missing or stream error.</DocTerm>
      </DocTerms>

      <DocH2>MCP</DocH2>
      <DocTerms>
        <DocTerm name="MCP_CONNECT">
          mcpHttp could not open Streamable HTTP or SSE. Verify URL, headers, and that the server
          speaks one of those transports.
        </DocTerm>
        <DocTerm name="MCP_TOOL_MISSING">Requested MCP tool name not in listTools.</DocTerm>
        <DocTerm name="MCP_TOOL_ERROR">Remote tool returned isError / failed payload.</DocTerm>
      </DocTerms>

      <DocH2>Handling</DocH2>
      <DocP>
        Prefer <code className="font-mono text-sm">e instanceof AiError</code> then branch on{" "}
        <code className="font-mono text-sm">e.code</code>. Do not parse message strings.
      </DocP>

      <DocFaq
        path="/docs/reference/errors"
        items={[
          {
            q: "Are codes stable?",
            a: "Treat them as part of the public surface for 0.x; changelog notes removals.",
          },
          {
            q: "Where are they thrown from?",
            a: "packages/ai (agents, graphs, tools, providers, MCP). Rust failures surface as GRAPH_FAILED / AGENT_FAILED with messages.",
          },
        ]}
      />
    </>
  );
}
