import { docPages } from "@/lib/site";
import { docMetadata } from "@/lib/seo";
import { DocCode, DocH1, DocH2, DocLead, DocP } from "@/components/docs/doc-blocks";
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

      <DocH2>Permissions &amp; caller</DocH2>
      <DocP>
        Permission is <code className="font-mono text-sm">allow</code>,{" "}
        <code className="font-mono text-sm">deny</code>, or{" "}
        <code className="font-mono text-sm">roles</code>. The agent loop calls{" "}
        <code className="font-mono text-sm">callTool</code> with{" "}
        <code className="font-mono text-sm">{`{ roles: ["agent"] }`}</code> unless you invoke tools
        yourself. Denied or invalid input fails prepare and never reaches execute.
      </DocP>
      <DocP>
        <code className="font-mono text-sm">ToolCaller</code> also accepts optional{" "}
        <code className="font-mono text-sm">subject</code> (user/tenant id). Rust authorization keys
        off roles; <code className="font-mono text-sm">subject</code> is forwarded into{" "}
        <code className="font-mono text-sm">execute</code> for audit and app-level checks.
      </DocP>
      <DocCode lang="typescript" filename="caller.ts">{`await callTool(
  "lookup_order",
  { orderId: "ord_9" },
  { roles: ["agent"], subject: "user_42" },
);

// inside execute:
execute: async (input, { caller }) => {
  audit.log({ tool: "lookup_order", subject: caller.subject });
  return db.orders.find(input.orderId);
}`}</DocCode>

      <DocH2>Schema IR</DocH2>
      <DocP>
        Zod objects, strings, numbers, booleans, arrays, enums, optionals, and unions map through{" "}
        <code className="font-mono text-sm">zodToIr</code>. Rust strips unknown keys when{" "}
        <code className="font-mono text-sm">additionalProperties: false</code> and coerces where
        configured.
      </DocP>

      <DocH2>JSON Schema without Zod</DocH2>
      <DocP>
        When you already have JSON Schema (MCP, OpenAPI), use{" "}
        <code className="font-mono text-sm">jsonSchemaToIr</code> +{" "}
        <code className="font-mono text-sm">toolWithIr</code>. The Zod{" "}
        <code className="font-mono text-sm">input</code> field is typing only — prefer{" "}
        <code className="font-mono text-sm">z.object({}).passthrough()</code>.
      </DocP>
      <DocCode lang="typescript" filename="tool-with-ir.ts">{`import { jsonSchemaToIr, toolWithIr } from "@monorch/ai";
import { z } from "zod";

const inputIr = jsonSchemaToIr({
  type: "object",
  properties: { orderId: { type: "string" } },
  required: ["orderId"],
  additionalProperties: false,
});

toolWithIr({
  name: "lookup_order_ir",
  description: "Same prepare path; schema from IR",
  input: z.object({}).passthrough(),
  inputIr,
  permission: { type: "roles", roles: ["agent"] },
  execute: async (args) => db.orders.find(String((args as { orderId: string }).orderId)),
});`}</DocCode>

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
            plain:
              "mcpTools uses toolWithIr + jsonSchemaToIr so remote MCP tools register like local tools.",
            a: (
              <>
                <code className="font-mono text-sm">mcpTools(transport)</code> uses{" "}
                <code className="font-mono text-sm">toolWithIr</code> under the hood. Same registry,
                same agent loop.
              </>
            ),
          },
          {
            q: "Does subject affect allow/deny?",
            a: "Not today. Roles gate prepare. Use subject in execute (or your own wrapper) for per-user policy.",
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
    </>
  );
}
