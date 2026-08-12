import Link from "next/link";
import { MarketingShell } from "@/components/marketing/marketing-shell";
import { MarketingPageHero } from "@/components/marketing/page-hero";
import { pageMetadata } from "@/lib/seo";
import { productPages, siteConfig } from "@/lib/site";

const page = productPages.find((p) => p.path === "/security")!;
export const metadata = pageMetadata(page);

export default function SecurityPage() {
  return (
    <MarketingShell>
      <MarketingPageHero
        kicker="Security"
        title="Library in your process. No Monorch cloud."
        lead="We do not host your prompts, tools, or customer data. MIT license. Private disclosure for vulnerabilities."
        primaryHref={`${siteConfig.github}/security`}
        primaryLabel="Report a vulnerability"
        secondaryHref="/platforms"
        secondaryLabel="Platforms"
      />

      <section className="mx-auto max-w-6xl px-5 py-16 sm:px-6 lg:px-8 lg:py-20">
        <div className="grid gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:gap-16">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.16em] text-muted-foreground">
              License
            </p>
            <h2 className="mt-3 font-display text-4xl font-semibold tracking-tight text-ink">
              MIT.
            </h2>
            <p className="mt-5 text-lg leading-relaxed text-muted-foreground">
              Use, modify, and distribute under the LICENSE in the repository.
            </p>
          </div>
          <dl className="space-y-8">
            {[
              {
                dt: "No Monorch cloud",
                dd: "There is no hosted control plane. Model HTTP, checkpointers, and memory stay in your infrastructure.",
              },
              {
                dt: "Secrets stay yours",
                dd: "API keys and DB URLs are your env. Providers read keys you pass; the engine does not phone home.",
              },
              {
                dt: "Dependencies",
                dd: "Review @monorch/ai, @monorch/runtime, and optional pg / MCP SDK peers like any other Node library.",
              },
            ].map((item) => (
              <div key={item.dt} className="border-l border-signal/45 pl-5">
                <dt className="font-display text-xl font-semibold text-ink">{item.dt}</dt>
                <dd className="mt-2 text-base leading-relaxed text-muted-foreground">{item.dd}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      <section className="border-t border-border/70 bg-card/25">
        <div className="mx-auto max-w-6xl px-5 py-16 sm:px-6 lg:px-8 lg:py-20">
          <p className="font-mono text-xs uppercase tracking-[0.16em] text-muted-foreground">
            Reporting
          </p>
          <h2 className="mt-3 max-w-2xl font-display text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
            Prefer private channels for security issues.
          </h2>
          <p className="mt-5 max-w-2xl text-lg leading-relaxed text-muted-foreground">
            Prefer{" "}
            <a
              href={`${siteConfig.github}/security/advisories/new`}
              className="text-foreground underline-offset-4 hover:underline"
              target="_blank"
              rel="noreferrer"
            >
              private vulnerability reporting
            </a>{" "}
            on GitHub. See{" "}
            <a
              href={`${siteConfig.github}/blob/main/SECURITY.md`}
              className="text-foreground underline-offset-4 hover:underline"
              target="_blank"
              rel="noreferrer"
            >
              SECURITY.md
            </a>{" "}
            for scope and response expectations. Use{" "}
            <a
              href={siteConfig.discussions}
              className="text-foreground underline-offset-4 hover:underline"
              target="_blank"
              rel="noreferrer"
            >
              Discussions
            </a>{" "}
            for non-sensitive questions.
          </p>
          <p className="mt-10 text-base text-muted-foreground">
            Related:{" "}
            <Link href="/platforms" className="text-foreground underline-offset-4 hover:underline">
              Platforms
            </Link>
            {" · "}
            <Link
              href="/docs/reference/errors"
              className="text-foreground underline-offset-4 hover:underline"
            >
              Error codes
            </Link>
          </p>
        </div>
      </section>
    </MarketingShell>
  );
}
