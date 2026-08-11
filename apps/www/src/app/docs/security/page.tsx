import Link from "next/link";
import { DocH1, DocH2, DocLead, DocP, DocTerm, DocTerms } from "@/components/docs/doc-blocks";
import { DocFaq } from "@/components/docs/doc-faq";
import { docMetadata } from "@/lib/seo";
import { docPages, siteConfig } from "@/lib/site";

const page = docPages.find((p) => p.path === "/docs/security")!;
export const metadata = docMetadata(page);

export default function SecurityPage() {
  return (
    <>
      <DocH1>Security &amp; license</DocH1>
      <DocLead>
        Monorch is an open-source library you run in your process. We do not host your prompts,
        tools, or customer data.
      </DocLead>

      <DocH2>License</DocH2>
      <DocP>
        MIT. See the LICENSE file in the repository. You may use, modify, and distribute under those
        terms.
      </DocP>

      <DocH2>Data posture</DocH2>
      <DocTerms>
        <DocTerm name="No Monorch cloud">
          There is no hosted control plane. Model HTTP, checkpointers, and memory stay in your
          infrastructure.
        </DocTerm>
        <DocTerm name="Secrets">
          API keys and DB URLs are your env. Providers read keys you pass; the engine does not phone
          home.
        </DocTerm>
        <DocTerm name="Dependencies">
          Review <code className="font-mono text-sm">@monorch/ai</code>,{" "}
          <code className="font-mono text-sm">@monorch/runtime</code>, and optional{" "}
          <code className="font-mono text-sm">pg</code> / MCP SDK peers like any other Node library.
        </DocTerm>
      </DocTerms>

      <DocH2>Reporting</DocH2>
      <DocP>
        Prefer private disclosure for security issues. Open a confidential report via GitHub Security
        Advisories on{" "}
        <a
          href={`${siteConfig.github}/security`}
          className="text-foreground underline-offset-4 hover:underline"
          target="_blank"
          rel="noreferrer"
        >
          the repository
        </a>
        , or start a{" "}
        <a
          href={siteConfig.discussions}
          className="text-foreground underline-offset-4 hover:underline"
          target="_blank"
          rel="noreferrer"
        >
          Discussion
        </a>{" "}
        for non-sensitive questions.
      </DocP>

      <DocH2>Related</DocH2>
      <DocP>
        <Link href="/docs/platforms" className="text-foreground underline-offset-4 hover:underline">
          Platforms &amp; native builds
        </Link>
        {" · "}
        <Link
          href="/docs/reference/errors"
          className="text-foreground underline-offset-4 hover:underline"
        >
          Error codes
        </Link>
      </DocP>

      <DocFaq
        path="/docs/security"
        items={[
          {
            q: "Do you train on my traffic?",
            a: "No. The library has no telemetry to Monorch. Optional OTel stays in your collectors.",
          },
          {
            q: "Is the Rust engine sandboxed?",
            a: "It validates and advances state in-process via N-API. Treat it like any native addon: keep Node updated and review tool execute paths.",
          },
        ]}
      />
    </>
  );
}
