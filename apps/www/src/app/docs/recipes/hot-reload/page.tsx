import { DocCode, DocH1, DocH2, DocLead, DocP } from "@/components/docs/doc-blocks";
import { DocFaq } from "@/components/docs/doc-faq";
import { docMetadata } from "@/lib/seo";
import { docPages } from "@/lib/site";

const page = docPages.find((p) => p.path === "/docs/recipes/hot-reload")!;
export const metadata = docMetadata(page);

export default function HotReloadRecipePage() {
  return (
    <>
      <DocH1>Graph hot-reload</DocH1>
      <DocLead>
        Swap a registered graph definition with{" "}
        <code className="font-mono text-sm">compile({"{ replace: true }"})</code>. In-flight runs
        keep their old <code className="font-mono text-sm">defHash</code> and fail on advance.
      </DocLead>

      <DocH2>Pattern</DocH2>
      <DocCode lang="typescript" filename="hot-reload.ts">{`import { graph } from "@monorch/ai";

const v1 = graph("hot")
  .node("prep", async () => "v1")
  .interrupt("hold")
  .compile({ replace: true });

const run = await v1.start({ n: 1 }); // waitingInterrupt

graph("hot")
  .node("prep", async () => "v2")
  .interrupt("hold", { prompt: "changed?" })
  .compile({ replace: true });

await run.resume("approved"); // throws — defHash mismatch
// run.status === "failed"`}</DocCode>

      <DocH2>Notes</DocH2>
      <DocP>
        Omit <code className="font-mono text-sm">replace</code> to reject duplicate graph names.
        Use replace in dev hot-reload, not for mutating live customer runs mid-flight.
      </DocP>

      <DocFaq
        path="/docs/recipes/hot-reload"
        items={[
          {
            q: "How do I migrate waiting runs?",
            a: "Finish or cancel old threads before swapping defs, or keep the old definition until they complete.",
          },
        ]}
      />
    </>
  );
}
