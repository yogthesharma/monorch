import Link from "next/link";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { MonorchLogo } from "@/components/monorch-logo";
import { cn } from "@/lib/utils";
import { siteConfig } from "@/lib/site";

const links = [
  { href: "/docs/recipes/fastify", label: "Quickstart" },
  { href: "/docs", label: "Docs" },
  { href: "/docs/compare", label: "Compare" },
  { href: "/docs/changelog", label: "Changelog" },
];

export function SiteHeader({ className }: { className?: string }) {
  return (
    <header
      className={cn(
        "sticky top-0 z-40 border-b border-border/50 bg-background/70 backdrop-blur-md",
        className,
      )}
    >
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5 sm:px-6 lg:px-8">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="flex items-center gap-2.5 font-display text-xl font-bold tracking-tight text-ink"
          >
            <MonorchLogo className="h-7 w-auto text-signal" />
            <span>Monorch</span>
          </Link>
          <Link href="/docs/changelog" className="hidden sm:inline-flex">
            <Badge
              variant="secondary"
              className="rounded-md px-2 py-0.5 font-mono text-[0.7rem] uppercase tracking-wider text-muted-foreground"
            >
              v{siteConfig.version}
            </Badge>
          </Link>
        </div>

        <nav className="hidden items-center gap-7 md:flex">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-base text-muted-foreground transition-colors hover:text-foreground"
            >
              {link.label}
            </Link>
          ))}
          <a
            href={siteConfig.github}
            target="_blank"
            rel="noreferrer"
            className="text-base text-muted-foreground transition-colors hover:text-foreground"
          >
            GitHub
          </a>
          <Button asChild size="default" className="rounded-md text-base">
            <Link href="/docs/recipes/fastify">Get started</Link>
          </Button>
        </nav>

        <Sheet>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="md:hidden" aria-label="Open menu">
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-[280px]">
            <SheetHeader>
              <SheetTitle className="flex items-center gap-2.5 font-display text-left">
                <MonorchLogo className="h-6 w-auto text-signal" />
                Monorch
              </SheetTitle>
            </SheetHeader>
            <div className="mt-8 flex flex-col gap-4">
              <Badge variant="secondary" className="w-fit font-mono text-xs">
                v{siteConfig.version}
              </Badge>
              {links.map((link) => (
                <Link key={link.href} href={link.href} className="text-base text-foreground">
                  {link.label}
                </Link>
              ))}
              <a
                href={siteConfig.github}
                target="_blank"
                rel="noreferrer"
                className="text-base text-foreground"
              >
                GitHub
              </a>
              <Button asChild className="mt-2">
                <Link href="/docs/recipes/fastify">Get started</Link>
              </Button>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  );
}
