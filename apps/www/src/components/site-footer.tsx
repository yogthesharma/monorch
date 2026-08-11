import Link from "next/link";
import { siteConfig } from "@/lib/site";

export function SiteFooter() {
  return (
    <footer className="border-t border-border/60 bg-card/30">
      <div className="mx-auto flex max-w-6xl flex-col gap-8 px-5 py-14 sm:px-6 md:flex-row md:items-end md:justify-between lg:px-8">
        <div>
          <p className="font-display text-2xl text-ink">Monorch</p>
          <p className="mt-3 max-w-md text-base text-muted-foreground">
            TypeScript AI control plane. Rust execution engine. Bring your own backend.
          </p>
          <p className="mt-2 font-mono text-xs text-muted-foreground/80">v{siteConfig.version}</p>
        </div>
        <div className="flex flex-wrap gap-6 text-base text-muted-foreground">
          <Link href="/docs/recipes/fastify" className="hover:text-foreground">
            Quickstart
          </Link>
          <Link href="/docs" className="hover:text-foreground">
            Docs
          </Link>
          <Link href="/docs/compare" className="hover:text-foreground">
            Compare
          </Link>
          <Link href="/docs/changelog" className="hover:text-foreground">
            Changelog
          </Link>
          <Link href="/llms.txt" className="hover:text-foreground">
            llms.txt
          </Link>
          <a
            href={siteConfig.github}
            className="hover:text-foreground"
            target="_blank"
            rel="noreferrer"
          >
            GitHub
          </a>
          {siteConfig.npmPublished ? (
            <a
              href={siteConfig.npm}
              className="hover:text-foreground"
              target="_blank"
              rel="noreferrer"
            >
              npm
            </a>
          ) : null}
          <a
            href={siteConfig.discussions}
            className="hover:text-foreground"
            target="_blank"
            rel="noreferrer"
          >
            Discussions
          </a>
        </div>
      </div>
    </footer>
  );
}
