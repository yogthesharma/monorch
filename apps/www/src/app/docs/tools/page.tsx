import { docPages } from "@/lib/site";
import { docMetadata } from "@/lib/seo";
import { DocCode, DocH1, DocH2, DocLead, DocNext, DocP } from "@/components/docs/doc-blocks";
import { DocFaq } from "@/components/docs/doc-faq";

const page = docPages.find((p) => p.path === "/docs/tools")!;
export const metadata = docMetadata(page);

export default function ToolsPage() {
  return (
    <>
      <DocH1>Tools</DocH1>
      <DocLead>
        Define tools with Zod. Monorch compiles to schema IR, registers in Rust, and prepares each
        call with authorization and parse before your execute callback runs.
      </DocLead>

      <DocH2>Define</DocH2>
      <DocCode lang="typescript" filename="lookup-order.ts">{`import { tool, callTool } from "@monorch/ai";
import { z } from "zod";

export const lookupOrder = tool({
  name: "lookup_order",
  description: "Fetch an order by id",
  input: z.object({ orderId: z.string().min(1) }),
  permission: { type: "roles", roles: ["agent"] },
  execute: async ({ orderId }, { caller }) => {
    return db.orders.find(orderId);
  },
});

// Manual invoke (same prepare path agents use)
const value = await callTool("lookup_order", { orderId: "ord_9" }, { roles: ["agent"] });`}</DocCode>

      <DocH2>Permissions</DocH2>
      <DocP>
        <code className="font-mono text-sm">allow</code>,{" "}
        <code className="font-mono text-sm">deny</code>, or{" "}
        <code className="font-mono text-sm">roles</code>. The agent loop passes{" "}
        <code className="font-mono text-sm">{`{ roles: ["agent"] }`}</code> unless you change it.
        Denied or invalid input fails prepare and never reaches execute.
      </DocP>

      <DocH2>Schema IR</DocH2>
      <DocP>
        Zod objects, strings, numbers, booleans, arrays, enums, optionals, and unions map through{" "}
        <code className="font-mono text-sm">zodToIr</code>. Rust strips unknown keys when{" "}
        <code className="font-mono text-sm">additionalProperties: false</code> and coerces where
        configured.
      </DocP>

      <DocH2>Listing</DocH2>
      <DocCode lang="typescript" filename="list.ts">{`import { listTools } from "@monorch/ai";

const tools = listTools(); // [{ name, description }, ...]`}</DocCode>

      <DocFaq
        path="/docs/tools"
        items={[
          {
            q: "Can I register two tools with the same name?",
            a: "No. The Rust registry rejects duplicates for the process.",
          },
          {
            q: "Where should side effects live?",
            a: "Only in execute. Prepare is pure auth + parse. That keeps retries and agent loops safer.",
          },
          {
            q: "How do MCP tools relate?",
            plain: "mcpTools wraps remote MCP tools as Monorch tool() defs so agents can call them.",
            a: (
              <>
                <code className="font-mono text-sm">mcpTools(transport)</code> calls{" "}
                <code className="font-mono text-sm">tool()</code> for each remote tool. Same
                registry, same agent loop.
              </>
            ),
          },
          {
            q: "What if Zod and Rust disagree?",
            a: "Keep schemas in the common subset (objects, primitives, arrays, enums). Exotic Zod transforms are not a full mirror.",
          },
          {
            q: "Do tools need to be async?",
            a: "execute may return a value or a Promise. Both work.",
          },
        ]}
      />

      <DocNext href="/docs/graphs" label="Graphs" />
    </>
  );
}
