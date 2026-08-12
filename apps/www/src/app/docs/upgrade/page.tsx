import Link from "next/link";
import { DocCode, DocH1, DocH2, DocLead, DocP } from "@/components/docs/doc-blocks";
import { DocFaq } from "@/components/docs/doc-faq";
import { docMetadata } from "@/lib/seo";
import { docPages } from "@/lib/site";

const page = docPages.find((p) => p.path === "/docs/upgrade")!;
export const metadata = docMetadata(page);

export default function UpgradeGuidePage() {
  return (
    <>
      <DocH1>Upgrade (0.x → 1.0)</DocH1>
      <DocLead>
        Move between published <code className="font-mono text-sm">0.1.x</code> releases and prepare
        for the 1.0 stability promise. Monorch stays a library — no framework codemod.
      </DocLead>

      <DocH2>Defaults</DocH2>
      <DocP>
        Install <code className="font-mono text-sm">@monorch/ai</code>, use Postgres checkpoints in
        prod, call <code className="font-mono text-sm">ensureMonorchSchema</code> once at boot, and
        pass <code className="font-mono text-sm">AbortSignal</code> /{" "}
        <code className="font-mono text-sm">timeoutMs</code> on long runs. Full table:{" "}
        <a
          href="https://github.com/yogthesharma/monorch/blob/main/UPGRADE.md"
          className="text-foreground underline-offset-4 hover:underline"
          target="_blank"
          rel="noreferrer"
        >
          UPGRADE.md
        </a>
        .
      </DocP>

      <DocH2>Watch when bumping</DocH2>
      <DocCode lang="text" filename="notes.txt">{`Checkpoint v2 blobs (version, input, defHash) — graph changes break old threads.
generateObject → AiError INVALID_JSON / EMPTY_OUTPUT / VALIDATION_FAILED.
Eight @monorch/runtime platform optionals (gnu + musl).
mcpStdio spawns your command; mcpHttp trusts the URL + headers you pass.`}</DocCode>

      <DocH2>Related</DocH2>
      <DocP>
        <Link href="/docs/api" className="text-foreground underline-offset-4 hover:underline">
          Public API
        </Link>
        {" · "}
        <Link
          href="/docs/checkpoints"
          className="text-foreground underline-offset-4 hover:underline"
        >
          Checkpoints
        </Link>
        {" · "}
        <Link
          href="/docs/reference/errors"
          className="text-foreground underline-offset-4 hover:underline"
        >
          Errors
        </Link>
        {" · "}
        <Link href="/security" className="text-foreground underline-offset-4 hover:underline">
          Security
        </Link>
        {" · "}
        <Link href="/docs/rc" className="text-foreground underline-offset-4 hover:underline">
          RC checklist
        </Link>
        .
      </DocP>

      <DocFaq
        path="/docs/upgrade"
        items={[
          {
            q: "Are there breaking removals in 0.1.x?",
            a: "No intentional public API removals through 0.1.4. Read CHANGELOG for behavior fixes (e.g. INVALID_JSON fencing).",
          },
          {
            q: "When is 1.0?",
            a: "After the RC checklist is green and the stability promise issue lands. Prefer 1.0.0-rc.* tags first.",
          },
        ]}
      />
    </>
  );
}
