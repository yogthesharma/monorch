import Link from "next/link";
import {
  DocCode,
  DocH1,
  DocH2,
  DocH3,
  DocLead,
  DocP,
  DocTerm,
  DocTerms,
} from "@/components/docs/doc-blocks";
import { DocFaq } from "@/components/docs/doc-faq";
import { docMetadata } from "@/lib/seo";
import { docPages } from "@/lib/site";

const page = docPages.find((p) => p.path === "/docs/reference/errors")!;
export const metadata = docMetadata(page);

export default function ErrorsReferencePage() {
  return (
    <>
      <DocH1>Errors &amp; failure modes</DocH1>
      <DocLead>
        Operators need to know what fails, how it surfaces, and how to recover.{" "}
        <code className="font-mono text-sm">AiError</code> is the stable surface: match on{" "}
        <code className="font-mono text-sm">code</code>, not message text.
      </DocLead>

      <DocH2>AiError shape</DocH2>
      <DocCode lang="typescript" filename="ai-error.ts">{`import { AiError } from "@monorch/ai";

try {
  await bot.run(input, { signal });
} catch (e) {
  if (e instanceof AiError) {
    // e.code: string — stable catalog below
    // e.message: human-readable
    // e.details?: { runId?, error?, text?, ... }
  }
  throw e;
}`}</DocCode>
      <DocP>
        Prefer <code className="font-mono text-sm">e instanceof AiError</code> then branch on{" "}
        <code className="font-mono text-sm">e.code</code>. Do not parse message strings for control
        flow.
      </DocP>

      <DocH2>Failure modes</DocH2>
      <DocP>
        These are the paths that show up in production. Related guides:{" "}
        <Link href="/docs/agents" className="text-foreground underline-offset-4 hover:underline">
          agents
        </Link>
        ,{" "}
        <Link href="/docs/tools" className="text-foreground underline-offset-4 hover:underline">
          tools
        </Link>
        ,{" "}
        <Link href="/docs/graphs" className="text-foreground underline-offset-4 hover:underline">
          graphs
        </Link>
        ,{" "}
        <Link
          href="/docs/checkpoints"
          className="text-foreground underline-offset-4 hover:underline"
        >
          checkpoints
        </Link>
        ,{" "}
        <Link
          href="/docs/recipes/abort"
          className="text-foreground underline-offset-4 hover:underline"
        >
          abort recipe
        </Link>
        .
      </DocP>

      <DocH3>Abort / cancellation</DocH3>
      <DocP>
        Pass <code className="font-mono text-sm">AbortSignal</code> on{" "}
        <code className="font-mono text-sm">agent.run</code> /{" "}
        <code className="font-mono text-sm">stream</code>. The loop checks abort between steps and
        forwards the signal to the provider. You get{" "}
        <code className="font-mono text-sm">run_end</code> with{" "}
        <code className="font-mono text-sm">status: &quot;aborted&quot;</code> and an{" "}
        <code className="font-mono text-sm">AiError</code> with code{" "}
        <code className="font-mono text-sm">ABORTED</code>. OpenAI-compatible fetch aborts map to the
        same code.
      </DocP>
      <DocP>
        <strong>Recover:</strong> treat as a clean cancel. Do not retry automatically unless the
        caller intends a new run. See the{" "}
        <Link
          href="/docs/recipes/abort"
          className="text-foreground underline-offset-4 hover:underline"
        >
          abort recipe
        </Link>
        .
      </DocP>

      <DocH3>Tool prepare / permissions</DocH3>
      <DocP>
        Every <code className="font-mono text-sm">callTool</code> (including the agent loop) goes
        through Rust prepare: authorization + schema parse. Denied roles,{" "}
        <code className="font-mono text-sm">{`{ type: "deny" }`}</code>, or invalid input never reach{" "}
        <code className="font-mono text-sm">execute</code>. That surfaces as{" "}
        <code className="font-mono text-sm">TOOL_PREPARE_FAILED</code> with{" "}
        <code className="font-mono text-sm">details.error</code> from the engine. Missing local
        executor → <code className="font-mono text-sm">TOOL_MISSING</code>.
      </DocP>
      <DocP>
        The agent loop calls tools with{" "}
        <code className="font-mono text-sm">{`{ roles: ["agent"] }`}</code> by default. Align tool{" "}
        <code className="font-mono text-sm">permission.roles</code> with that (or pass your own caller
        when invoking manually).
      </DocP>
      <DocP>
        <strong>Recover:</strong> fix roles / schema and retry the call. Do not catch and pretend
        the tool succeeded — the model needs an honest tool_result or a failed run.
      </DocP>

      <DocH3>Graph interrupt → resume</DocH3>
      <DocP>
        An <code className="font-mono text-sm">interrupt</code> node stops the run at{" "}
        <code className="font-mono text-sm">waitingInterrupt</code>, persists a checkpoint when a
        checkpointer + <code className="font-mono text-sm">threadId</code> are set, and returns the
        handle. Call <code className="font-mono text-sm">resume(decision)</code> when the human or
        system decides. Calling <code className="font-mono text-sm">drive()</code> again while waiting
        is idempotent (re-emits wait).
      </DocP>
      <DocP>
        Resume when status is not{" "}
        <code className="font-mono text-sm">waitingInterrupt</code> /{" "}
        <code className="font-mono text-sm">waitingHuman</code> →{" "}
        <code className="font-mono text-sm">GRAPH_RESUME_INVALID</code>. Restore without a
        checkpointer → <code className="font-mono text-sm">CHECKPOINT_MISSING</code>. Missing blob →{" "}
        <code className="font-mono text-sm">CHECKPOINT_NOT_FOUND</code> (start a new run for that
        thread).
      </DocP>
      <DocP>
        <strong>Recover:</strong> only call <code className="font-mono text-sm">resume</code> after
        confirming wait status (or after a successful <code className="font-mono text-sm">restore</code>
        ). Persist <code className="font-mono text-sm">threadId</code> in your HTTP session so the next
        request can restore.
      </DocP>

      <DocH3>Def-hash mismatch (hot reload)</DocH3>
      <DocP>
        Checkpoint blobs carry a <code className="font-mono text-sm">defHash</code> of the compiled
        graph. After <code className="font-mono text-sm">compile({"{"} replace: true {"}"})</code>,
        in-flight runs and stored checkpoints whose hash no longer matches fail instead of
        continuing on a new definition. That usually surfaces as{" "}
        <code className="font-mono text-sm">GRAPH_FAILED</code> on{" "}
        <code className="font-mono text-sm">resume</code>, or a restore error whose message mentions{" "}
        <code className="font-mono text-sm">def_hash</code> / definition mismatch.
      </DocP>
      <DocP>
        <strong>Recover:</strong> start a new run for that thread (or keep the old definition
        registered until waiting runs finish). See{" "}
        <Link
          href="/docs/recipes/hot-reload"
          className="text-foreground underline-offset-4 hover:underline"
        >
          hot-reload
        </Link>{" "}
        and{" "}
        <Link
          href="/docs/checkpoints"
          className="text-foreground underline-offset-4 hover:underline"
        >
          checkpoints
        </Link>
        .
      </DocP>

      <DocH3>Max steps / routing / missing nodes</DocH3>
      <DocP>
        Agent <code className="font-mono text-sm">maxSteps</code> exhaustion →{" "}
        <code className="font-mono text-sm">AGENT_FAILED</code> (with{" "}
        <code className="font-mono text-sm">details.runId</code>). Graph cycle / advance failures →{" "}
        <code className="font-mono text-sm">GRAPH_FAILED</code>. No matching conditional edge and no
        unconditional fallback → <code className="font-mono text-sm">GRAPH_ROUTE</code>. Engine asked
        for a node id with no TypeScript handler →{" "}
        <code className="font-mono text-sm">NODE_MISSING</code>.
      </DocP>
      <DocP>
        <strong>Recover:</strong> raise limits, fix edge predicates, or register the missing node /
        agent before start. Inspect prior events for the last successful step.
      </DocP>

      <DocH2>Code catalog</DocH2>
      <DocP>
        Treat codes as part of the public surface for 0.x. Removals and renames are changelogged.
      </DocP>

      <DocH3>Agents &amp; handoffs</DocH3>
      <DocTerms>
        <DocTerm name="ABORTED">
          AbortSignal fired (agent loop or provider fetch).{" "}
          <code className="font-mono text-sm">run_end.status</code> is{" "}
          <code className="font-mono text-sm">aborted</code>. Check caller cancellation / timeouts.
        </DocTerm>
        <DocTerm name="AGENT_FAILED">
          Rust agent loop failed (maxSteps, unexpected outcome). Inspect{" "}
          <code className="font-mono text-sm">details.runId</code> and prior events.
        </DocTerm>
        <DocTerm name="AGENT_MISSING">
          <code className="font-mono text-sm">getAgent</code> / handoff /{" "}
          <code className="font-mono text-sm">agentNode</code> could not find the named agent.
          Register before use; keep names unique.
        </DocTerm>
        <DocTerm name="HANDOFF_DENIED">
          Target not listed in <code className="font-mono text-sm">handoffs: [...]</code>. Add the
          agent to the array.
        </DocTerm>
        <DocTerm name="HANDOFF_MIXED">
          Model returned <code className="font-mono text-sm">handoff_to_*</code> with other tool calls
          in the same turn. Fix prompting or provider tool choice.
        </DocTerm>
        <DocTerm name="HANDOFF_FAILED">Forced handoff did not complete in the engine.</DocTerm>
      </DocTerms>

      <DocH3>Tools</DocH3>
      <DocTerms>
        <DocTerm name="TOOL_MISSING">
          <code className="font-mono text-sm">callTool</code> hit a name with no local{" "}
          <code className="font-mono text-sm">execute</code> registry entry.
        </DocTerm>
        <DocTerm name="TOOL_PREPARE_FAILED">
          Rust prepare failed (auth or schema). Align permission roles and Zod / IR input. See{" "}
          <code className="font-mono text-sm">details.error</code>.
        </DocTerm>
      </DocTerms>

      <DocH3>Graphs &amp; checkpoints</DocH3>
      <DocTerms>
        <DocTerm name="GRAPH_EMPTY">
          <code className="font-mono text-sm">compile()</code> with no nodes.
        </DocTerm>
        <DocTerm name="GRAPH_FAILED">
          Advance failed, node threw, resume after def-hash mismatch, or unexpected engine outcome.
          See message / <code className="font-mono text-sm">details.runId</code>.
        </DocTerm>
        <DocTerm name="GRAPH_ROUTE">
          <code className="font-mono text-sm">need_route</code> with a missing condition handler, or
          no matching predicate and no unconditional fallback edge.
        </DocTerm>
        <DocTerm name="GRAPH_RESUME_INVALID">
          <code className="font-mono text-sm">resume()</code> called when status is not{" "}
          <code className="font-mono text-sm">waitingInterrupt</code> /{" "}
          <code className="font-mono text-sm">waitingHuman</code>.
        </DocTerm>
        <DocTerm name="NODE_MISSING">
          Engine asked for a node id with no TypeScript handler map entry.
        </DocTerm>
        <DocTerm name="CHECKPOINT_MISSING">
          <code className="font-mono text-sm">restore()</code> without{" "}
          <code className="font-mono text-sm">compile({"{"} checkpointer {"}"})</code>.
        </DocTerm>
        <DocTerm name="CHECKPOINT_NOT_FOUND">
          No blob for that <code className="font-mono text-sm">threadId</code> in the checkpointer.
        </DocTerm>
        <DocTerm name="DEF_HASH_MISMATCH">
          Checkpoint or in-flight run{" "}
          <code className="font-mono text-sm">defHash</code> does not match the compiled graph
          (definition changed). Start a new <code className="font-mono text-sm">threadId</code> or
          keep the old definition registered.
        </DocTerm>
        <DocTerm name="GRAPH_ALREADY_REGISTERED">
          <code className="font-mono text-sm">compile()</code> without{" "}
          <code className="font-mono text-sm">replace: true</code> when the graph name exists.
        </DocTerm>
        <DocTerm name="GRAPH_NOT_REGISTERED">
          Restore/advance referenced a graph name that is not compiled in this process.
        </DocTerm>
        <DocTerm name="TOOL_ALREADY_REGISTERED">
          Second <code className="font-mono text-sm">tool()</code> with the same name (use a unique
          name or unregister policy — see roadmap).
        </DocTerm>
        <DocTerm name="ENGINE_ERROR">
          Other Rust/N-API failures remapped from a plain native{" "}
          <code className="font-mono text-sm">Error</code>. Prefer matching more specific codes when
          present; message carries the engine reason.
        </DocTerm>
      </DocTerms>

      <DocH3>Model / structured output</DocH3>
      <DocTerms>
        <DocTerm name="EMPTY_OUTPUT">
          <code className="font-mono text-sm">generateObject</code> got empty text.
        </DocTerm>
        <DocTerm name="INVALID_JSON">Model text was not parseable JSON.</DocTerm>
        <DocTerm name="VALIDATION_FAILED">
          JSON failed Rust schema validation against Zod IR.
        </DocTerm>
        <DocTerm name="OPENAI_AUTH">
          API key missing for <code className="font-mono text-sm">openai()</code>.
        </DocTerm>
        <DocTerm name="OPENAI_HTTP">
          Provider returned a non-OK HTTP status from chat completions. Check baseUrl, model id,
          quotas, and the response body in the message.
        </DocTerm>
        <DocTerm name="OPENAI_STREAM">SSE body missing or stream error.</DocTerm>
      </DocTerms>

      <DocH3>MCP</DocH3>
      <DocTerms>
        <DocTerm name="MCP_CONNECT">
          <code className="font-mono text-sm">mcpHttp</code> could not open Streamable HTTP or SSE.
          Verify URL, headers, and that the server speaks one of those transports.
        </DocTerm>
        <DocTerm name="MCP_TOOL_MISSING">Requested MCP tool name not in listTools.</DocTerm>
        <DocTerm name="MCP_TOOL_ERROR">Remote tool returned isError / failed payload.</DocTerm>
      </DocTerms>

      <DocH2>HTTP mapping (BYO)</DocH2>
      <DocCode lang="typescript" filename="map-error.ts">{`function statusFor(err: unknown): number {
  if (!(err instanceof AiError)) return 500;
  switch (err.code) {
    case "ABORTED":
      return 499; // or 408 — client cancelled
    case "OPENAI_AUTH":
      return 401;
    case "TOOL_PREPARE_FAILED":
    case "HANDOFF_DENIED":
    case "GRAPH_RESUME_INVALID":
      return 400;
    case "CHECKPOINT_NOT_FOUND":
    case "AGENT_MISSING":
    case "TOOL_MISSING":
    case "GRAPH_NOT_REGISTERED":
      return 404;
    case "DEF_HASH_MISMATCH":
    case "GRAPH_ALREADY_REGISTERED":
    case "TOOL_ALREADY_REGISTERED":
      return 409;
    default:
      return 500;
  }
}`}</DocCode>
      <DocP>
        This is illustrative — pick status codes that match your API conventions. See the{" "}
        <Link
          href="/docs/recipes/fastify"
          className="text-foreground underline-offset-4 hover:underline"
        >
          Fastify recipe
        </Link>{" "}
        for SSE + interrupt patterns.
      </DocP>

      <DocFaq
        path="/docs/reference/errors"
        items={[
          {
            q: "Are codes stable?",
            a: "Treat them as part of the public surface for 0.x; changelog notes removals or renames.",
          },
          {
            q: "Where are they thrown from?",
            a: "packages/ai (agents, graphs, tools, providers, MCP). Rust failures surface as GRAPH_FAILED / AGENT_FAILED / TOOL_PREPARE_FAILED with messages and optional details.",
          },
          {
            q: "Does run_end always mean success?",
            a: "No. run_end carries status: completed, handed_off, aborted, waitingInterrupt, or failed. Always check status (and catch AiError on the promise).",
          },
          {
            q: "How do I debug a GRAPH_FAILED after deploy?",
            a: "Check whether you used compile({ replace: true }) while old threads still wait on checkpoints. Def-hash mismatch is the usual cause.",
          },
        ]}
      />
    </>
  );
}
