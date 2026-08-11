import Link from "next/link";
import { docPages } from "@/lib/site";
import { docMetadata } from "@/lib/seo";
import {
  DocCode,
  DocH1,
  DocH2,
  DocLead,
  DocP,
  DocTerm,
  DocTerms,
} from "@/components/docs/doc-blocks";
import { DocFaq } from "@/components/docs/doc-faq";

const page = docPages.find((p) => p.path === "/docs/reference/runtime")!;
export const metadata = docMetadata(page);

export default function RuntimeReferencePage() {
  return (
    <>
      <DocH1>
        <code className="font-mono text-[0.9em]">@monorch/runtime</code>
      </DocH1>
      <DocLead>
        N-API binding to the Rust engine. No business logic in this package. Application code should
        use <code className="font-mono text-sm">@monorch/ai</code>; this page is for build and FFI
        context.
      </DocLead>

      <DocH2>Role</DocH2>
      <DocP>
        Loads the platform native binary and exposes an{" "}
        <code className="font-mono text-sm">Engine</code> class.{" "}
        <code className="font-mono text-sm">@monorch/ai</code> wraps it via{" "}
        <code className="font-mono text-sm">getRuntime()</code> for schema parse, tool prepare, agent
        steps, and graph advance.
      </DocP>

      <DocH2>Build</DocH2>
      <DocCode lang="bash" filename="shell">{`pnpm build:native   # from monorepo root
# requires rustc/cargo + Node >= 20`}</DocCode>

      <DocH2>Surface (via @monorch/ai)</DocH2>
      <DocTerms>
        <DocTerm name="getRuntime()">
          Returns the shared Engine instance used by tools, agents, and graphs.
        </DocTerm>
        <DocTerm name="NativeEngine">
          Constructor from the binding. Prefer getRuntime() over constructing yourself.
        </DocTerm>
      </DocTerms>

      <DocP>
        Architecture:{" "}
        <Link
          href="/architecture"
          className="text-foreground underline-offset-4 hover:underline"
        >
          Architecture
        </Link>
        . Primary API:{" "}
        <Link
          href="/docs/reference/ai"
          className="text-foreground underline-offset-4 hover:underline"
        >
          @monorch/ai
        </Link>
        .
      </DocP>

      <DocFaq
        path="/docs/reference/runtime"
        items={[
          {
            q: "Should my Fastify app import @monorch/runtime?",
            a: "No. Import @monorch/ai. Runtime is a dependency of the AI package.",
          },
          {
            q: "Where does Rust live?",
            a: "engine/ in the monorepo. bindings/node is the N-API crate that publishes as @monorch/runtime.",
          },
          {
            q: "What if the native binary is missing?",
            a: "Build fails or load throws at import time. Run pnpm build:native for your platform.",
          },
        ]}
      />
    </>
  );
}
