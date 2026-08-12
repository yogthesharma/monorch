import { MarketingShell } from "@/components/marketing/marketing-shell";
import { MarketingPageHero } from "@/components/marketing/page-hero";
import { pageMetadata } from "@/lib/seo";
import { productPages, siteConfig } from "@/lib/site";

const page = productPages.find((p) => p.path === "/platforms")!;
export const metadata = pageMetadata(page);

const targets = [
  { os: "darwin", arch: "arm64", note: "Apple Silicon" },
  { os: "darwin", arch: "x64", note: "Intel Mac" },
  { os: "linux", arch: "arm64-gnu", note: "Graviton / aarch64 (glibc)" },
  { os: "linux", arch: "x64-gnu", note: "Most cloud VMs (glibc)" },
  { os: "linux", arch: "arm64-musl", note: "Alpine / musl aarch64" },
  { os: "linux", arch: "x64-musl", note: "Alpine / musl Docker" },
  { os: "win32", arch: "x64", note: "Windows servers" },
  { os: "win32", arch: "arm64", note: "Windows on ARM" },
];

export default function PlatformsPage() {
  return (
    <MarketingShell>
      <MarketingPageHero
        kicker="Platforms"
        title="Native runtime. Node stays familiar."
        lead={
          <>
            <code className="font-mono text-[0.9em]">@monorch/runtime</code> ships N-API binaries.
            App code stays on <code className="font-mono text-[0.9em]">@monorch/ai</code>.
          </>
        }
        secondaryHref="/docs/getting-started"
        secondaryLabel="Install guide"
      />

      <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8 lg:py-20">
        <p className="font-mono text-xs uppercase tracking-[0.16em] text-muted-foreground">
          Requirements
        </p>
        <h2 className="mt-3 max-w-xl font-display text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
          What you need to run.
        </h2>
        <dl className="mt-12 grid gap-10 sm:grid-cols-3">
          {[
            {
              dt: "Node",
              dd: "20 or newer. Same engines field as the packages.",
            },
            {
              dt: "Local monorepo",
              dd: "Rust toolchain for pnpm build:native when developing the engine.",
            },
            {
              dt: "Published runtime",
              dd: "Prebuilt optionalDependencies per platform when packages ship on npm.",
            },
          ].map((item) => (
            <div key={item.dt} className="border-t border-signal/40 pt-5">
              <dt className="font-display text-xl font-semibold text-ink">{item.dt}</dt>
              <dd className="mt-3 text-base leading-relaxed text-muted-foreground">{item.dd}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="border-t border-border/70 bg-card/25">
        <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8 lg:py-20">
          <p className="font-mono text-xs uppercase tracking-[0.16em] text-muted-foreground">
            Targets
          </p>
          <h2 className="mt-3 max-w-xl font-display text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
            Desktop and server triples.
          </h2>
          <p className="mt-4 max-w-2xl text-lg text-muted-foreground">
            Exact matrix follows the bindings package optionalDependencies as they are published.
          </p>
          <ul className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {targets.map((t) => (
              <li
                key={`${t.os}-${t.arch}`}
                className="border border-border/60 bg-background/40 px-5 py-5"
              >
                <p className="font-mono text-base text-ink">
                  {t.os}-{t.arch}
                </p>
                <p className="mt-2 text-sm text-muted-foreground">{t.note}</p>
              </li>
            ))}
          </ul>

          <div className="mt-14 overflow-hidden border border-border/60 bg-[#0a1410]">
            <div className="border-b border-border/50 px-4 py-2.5">
              <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
                terminal
              </p>
            </div>
            <pre className="overflow-x-auto p-3 font-mono text-xs leading-relaxed text-foreground/90 sm:p-5 sm:text-sm">
              <code>{`pnpm build:native   # from monorepo root
pnpm build
pnpm test:engine    # Rust unit tests
pnpm test:ai        # @monorch/ai TS tests
pnpm smoke          # examples/fastify
pnpm smoke:npm      # published @monorch/ai consumer smoke
pnpm smoke:hono     # Hono published consumer
pnpm smoke:npm-install`}</code>
            </pre>
          </div>

          <p className="mt-10 text-base text-muted-foreground">
            Watch CI on{" "}
            <a
              href={siteConfig.github}
              className="text-foreground underline-offset-4 hover:underline"
              target="_blank"
              rel="noreferrer"
            >
              {siteConfig.github.replace("https://", "")}
            </a>{" "}
            for build, test, and smoke status. GNU vs musl Linux is selected automatically
            at runtime (`@monorch/runtime-linux-*-gnu` vs `...-musl`).
          </p>
        </div>
      </section>
    </MarketingShell>
  );
}
