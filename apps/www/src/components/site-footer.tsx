import Link from "next/link";
import { MonorchLogo } from "@/components/monorch-logo";
import { siteConfig } from "@/lib/site";

const productLinks = [
  { href: "/docs", label: "Docs" },
  { href: "/docs/getting-started", label: "Quickstart" },
  { href: "/compare", label: "Compare" },
  { href: "/architecture", label: "Architecture" },
  { href: "/changelog", label: "Changelog" },
];

const resourceLinks = [
  { href: "/security", label: "Security" },
  { href: "/platforms", label: "Platforms" },
  { href: "/llms.txt", label: "llms.txt" },
  { href: siteConfig.github, label: "GitHub", external: true },
  ...(siteConfig.npmPublished
    ? [{ href: siteConfig.npm, label: "npm", external: true as const }]
    : []),
  { href: siteConfig.discussions, label: "Discussions", external: true },
];

function FooterLink({
  href,
  label,
  external,
}: {
  href: string;
  label: string;
  external?: boolean;
}) {
  const className = "text-sm text-muted-foreground transition-colors hover:text-foreground";
  if (external) {
    return (
      <a href={href} className={className} target="_blank" rel="noreferrer">
        {label}
      </a>
    );
  }
  return (
    <Link href={href} className={className}>
      {label}
    </Link>
  );
}

export function SiteFooter() {
  return (
    <footer className="border-t border-border/60 pb-[env(safe-area-inset-bottom)]">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 sm:gap-12 sm:px-6 sm:py-16 md:grid-cols-[1.4fr_1fr_1fr] lg:px-8">
        <div className="min-w-0">
          <Link
            href="/"
            className="inline-flex items-center gap-2.5 font-display text-xl font-bold tracking-tight text-ink"
          >
            <MonorchLogo className="h-7 w-auto text-signal" />
            Monorch
          </Link>
          <p className="mt-4 max-w-sm text-sm leading-relaxed text-muted-foreground">
            TypeScript AI control plane. Rust execution engine. Bring your own backend.
          </p>
          <p className="mt-5 font-mono text-xs text-muted-foreground/70">v{siteConfig.version}</p>
        </div>

        <div className="grid grid-cols-2 gap-8 sm:contents">
          <div>
            <p className="font-mono text-[0.7rem] uppercase tracking-[0.14em] text-muted-foreground/80">
              Product
            </p>
            <ul className="mt-4 flex flex-col gap-2.5">
              {productLinks.map((link) => (
                <li key={link.href}>
                  <FooterLink {...link} />
                </li>
              ))}
            </ul>
          </div>

          <div>
            <p className="font-mono text-[0.7rem] uppercase tracking-[0.14em] text-muted-foreground/80">
              Resources
            </p>
            <ul className="mt-4 flex flex-col gap-2.5">
              {resourceLinks.map((link) => (
                <li key={link.href}>
                  <FooterLink {...link} />
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </footer>
  );
}
