"use client";

import { useState } from "react";
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

const mobileLinks = [
  { href: "/docs", label: "Docs" },
  { href: "/docs/getting-started", label: "Get started" },
  { href: "/compare", label: "Compare" },
  { href: "/architecture", label: "Architecture" },
  { href: "/changelog", label: "Changelog" },
  { href: "/platforms", label: "Platforms" },
  { href: "/security", label: "Security" },
];

export function SiteHeader({ className }: { className?: string }) {
  const [open, setOpen] = useState(false);

  return (
    <header
      className={cn(
        "sticky top-0 z-40 border-b border-border/50 bg-background/70 backdrop-blur-md",
        "pt-[env(safe-area-inset-top)]",
        className,
      )}
    >
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-3 px-4 sm:h-16 sm:px-6 lg:px-8">
        <div className="flex min-w-0 items-center gap-2.5 sm:gap-3">
          <Link
            href="/"
            className="flex min-w-0 items-center gap-2 font-display text-lg font-bold tracking-tight text-ink sm:gap-2.5 sm:text-xl"
          >
            <MonorchLogo className="h-6 w-auto shrink-0 text-signal sm:h-7" />
            <span className="truncate">Monorch</span>
          </Link>
          <Link href="/changelog" className="hidden shrink-0 sm:inline-flex">
            <Badge
              variant="secondary"
              className="rounded-md px-2 py-0.5 font-mono text-[0.7rem] uppercase tracking-wider text-muted-foreground"
            >
              v{siteConfig.version}
            </Badge>
          </Link>
        </div>

        <nav className="hidden items-center gap-7 md:flex">
          <Link
            href="/docs"
            className="text-base text-muted-foreground transition-colors hover:text-foreground"
          >
            Docs
          </Link>
          <a
            href={siteConfig.github}
            target="_blank"
            rel="noreferrer"
            className="text-base text-muted-foreground transition-colors hover:text-foreground"
          >
            GitHub
          </a>
          <Button asChild size="default" className="rounded-md text-base">
            <Link href="/docs/getting-started">Get started</Link>
          </Button>
        </nav>

        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="shrink-0 md:hidden"
              aria-label="Open menu"
            >
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent
            side="right"
            className="flex w-[min(100vw-2rem,20rem)] flex-col gap-0 p-0 sm:max-w-sm"
          >
            <SheetHeader className="border-b border-border/60 px-5 py-5 text-left">
              <SheetTitle className="flex items-center gap-2.5 font-display">
                <MonorchLogo className="h-6 w-auto text-signal" />
                Monorch
              </SheetTitle>
            </SheetHeader>
            <div className="flex flex-1 flex-col gap-1 overflow-y-auto px-3 py-4">
              <Badge variant="secondary" className="mb-3 ml-2 w-fit font-mono text-xs">
                v{siteConfig.version}
              </Badge>
              {mobileLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setOpen(false)}
                  className="rounded-md px-3 py-2.5 text-base text-foreground transition-colors hover:bg-secondary/70"
                >
                  {link.label}
                </Link>
              ))}
              <a
                href={siteConfig.github}
                target="_blank"
                rel="noreferrer"
                onClick={() => setOpen(false)}
                className="rounded-md px-3 py-2.5 text-base text-foreground transition-colors hover:bg-secondary/70"
              >
                GitHub
              </a>
              <Button asChild className="mx-2 mt-4">
                <Link href="/docs/getting-started" onClick={() => setOpen(false)}>
                  Get started
                </Link>
              </Button>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  );
}
