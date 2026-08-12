import Link from "next/link";
import { DocCode, DocH1, DocH2, DocLead, DocP } from "@/components/docs/doc-blocks";
import { DocFaq } from "@/components/docs/doc-faq";
import { docMetadata } from "@/lib/seo";
import { docPages, siteConfig } from "@/lib/site";

const page = docPages.find((p) => p.path === "/docs/rc")!;
export const metadata = docMetadata(page);

export default function RcChecklistPage() {
  return (
    <>
      <DocH1>Release candidate</DocH1>
      <DocLead>
        Monorch is in an <strong>API freeze</strong> toward 1.0: bugfixes and docs only unless a
        critical production blocker requires a carefully reviewed change. Public surface:{" "}
        <Link href="/docs/api" className="text-foreground underline-offset-4 hover:underline">
          Public API
        </Link>
        .
      </DocLead>

      <DocH2>What must be green</DocH2>
      <DocP>
        Platforms (8 triples + musl + install matrix), consumer smokes (
        <code className="font-mono text-sm">smoke</code> /{" "}
        <code className="font-mono text-sm">smoke:npm</code> /{" "}
        <code className="font-mono text-sm">smoke:hono</code>), docs, and the security pass. Full
        checklist:{" "}
        <a
          href={`${siteConfig.github}/blob/main/RC_CHECKLIST.md`}
          className="text-foreground underline-offset-4 hover:underline"
          target="_blank"
          rel="noreferrer"
        >
          RC_CHECKLIST.md
        </a>
        .
      </DocP>

      <DocH2>Verify locally</DocH2>
      <DocCode lang="bash" filename="terminal">{`pnpm smoke
pnpm smoke:npm
pnpm smoke:hono
pnpm smoke:npm-install   # registry install + native load
# optional:
# LIVE_SMOKE=1 OPENAI_API_KEY=… pnpm smoke:live`}</DocCode>

      <DocH2>Related</DocH2>
      <DocP>
        <Link href="/docs/upgrade" className="text-foreground underline-offset-4 hover:underline">
          Upgrade guide
        </Link>
        {" · "}
        <Link href="/platforms" className="text-foreground underline-offset-4 hover:underline">
          Platforms
        </Link>
        {" · "}
        <Link href="/security" className="text-foreground underline-offset-4 hover:underline">
          Security
        </Link>
        .
      </DocP>

      <DocFaq
        path="/docs/rc"
        items={[
          {
            q: "Does merging a PR publish npm?",
            a: "No. Only pushing a v* tag (or Release workflow_dispatch with dry_run=false) publishes.",
          },
          {
            q: "Can I still open feature PRs?",
            a: "Prefer bugfixes and docs during freeze. New surface area waits for post-1.0 minors unless critical.",
          },
        ]}
      />
    </>
  );
}
