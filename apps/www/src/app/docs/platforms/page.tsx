import { DocCode, DocH1, DocH2, DocLead, DocP, DocTerm, DocTerms } from "@/components/docs/doc-blocks";
import { DocFaq } from "@/components/docs/doc-faq";
import { docMetadata } from "@/lib/seo";
import { docPages, siteConfig } from "@/lib/site";

const page = docPages.find((p) => p.path === "/docs/platforms")!;
export const metadata = docMetadata(page);

export default function PlatformsPage() {
  return (
    <>
      <DocH1>Platforms &amp; native builds</DocH1>
      <DocLead>
        <code className="font-mono text-sm">@monorch/runtime</code> ships N-API binaries. App code
        stays on <code className="font-mono text-sm">@monorch/ai</code>.
      </DocLead>

      <DocH2>Requirements</DocH2>
      <DocTerms>
        <DocTerm name="Node">20 or newer.</DocTerm>
        <DocTerm name="Local monorepo build">
          Rust toolchain (<code className="font-mono text-sm">rustc</code> /{" "}
          <code className="font-mono text-sm">cargo</code>) for{" "}
          <code className="font-mono text-sm">pnpm build:native</code>.
        </DocTerm>
        <DocTerm name="Published runtime">
          Prebuilt optionalDependencies per platform when packages are published (see PUBLISH.md in
          the repo).
        </DocTerm>
      </DocTerms>

      <DocH2>Supported targets</DocH2>
      <DocP>
        N-API builds target common desktop/server triples (darwin/linux/windows × arm64/x64). Exact
        matrix follows the bindings package optionalDependencies as they are published.
      </DocP>
      <DocCode lang="bash" filename="terminal">{`pnpm build:native   # from monorepo root
pnpm build
pnpm smoke`}</DocCode>

      <DocH2>CI</DocH2>
      <DocP>
        Watch GitHub Actions on{" "}
        <a
          href={siteConfig.github}
          className="text-foreground underline-offset-4 hover:underline"
          target="_blank"
          rel="noreferrer"
        >
          {siteConfig.github.replace("https://", "")}
        </a>{" "}
        for build and smoke status once the repo is public.
      </DocP>

      <DocFaq
        path="/docs/platforms"
        items={[
          {
            q: "Native load fails on import?",
            a: "Rebuild with pnpm build:native for your OS/arch, or install the matching optional platform package when using published npm.",
          },
          {
            q: "Do I need Rust in production?",
            a: "Not if you consume published prebuilt binaries. Rust is for developing/building the engine.",
          },
        ]}
      />
    </>
  );
}
