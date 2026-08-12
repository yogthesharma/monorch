import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { MonorchLogo } from "@/components/monorch-logo";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

function CtaLink({
  href,
  children,
  className,
}: {
  href: string;
  children: ReactNode;
  className?: string;
}) {
  const external = /^https?:\/\//i.test(href);
  if (external) {
    return (
      <a href={href} target="_blank" rel="noreferrer" className={className}>
        {children}
      </a>
    );
  }
  return (
    <Link href={href} className={className}>
      {children}
    </Link>
  );
}

export function MarketingPageHero({
  kicker,
  title,
  lead,
  primaryHref = "/docs/getting-started",
  primaryLabel = "Get started",
  secondaryHref = "/docs",
  secondaryLabel = "Read the docs",
  className,
}: {
  kicker: string;
  title: ReactNode;
  lead: ReactNode;
  primaryHref?: string;
  primaryLabel?: string;
  secondaryHref?: string;
  secondaryLabel?: string;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "relative isolate overflow-hidden border-b border-border/60",
        className,
      )}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 grid-haze opacity-60"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -right-16 top-0 h-56 w-56 rounded-full bg-signal/10 blur-3xl animate-drift sm:-right-24 sm:h-[28rem] sm:w-[28rem]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -left-12 bottom-0 h-48 w-48 rounded-full bg-[hsl(198_55%_40%/0.12)] blur-3xl animate-pulse-soft sm:-left-16 sm:h-[22rem] sm:w-[22rem]"
      />

      <div className="relative mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-20 lg:px-8 lg:py-24">
        <p className="animate-rise flex items-center gap-2.5 font-display text-3xl font-bold tracking-tight text-ink sm:gap-3 sm:text-5xl">
          <MonorchLogo className="h-[0.85em] w-auto shrink-0 text-signal" />
          <span className="min-w-0 truncate">Monorch</span>
        </p>
        <p className="animate-rise-delay mt-6 font-mono text-xs uppercase tracking-[0.18em] text-muted-foreground sm:mt-8">
          {kicker}
        </p>
        <h1 className="animate-rise-delay mt-3 max-w-3xl text-balance font-display text-3xl font-semibold tracking-tight text-ink sm:mt-4 sm:text-5xl lg:text-6xl">
          {title}
        </h1>
        <p className="animate-rise-delay-2 mt-4 max-w-2xl text-base leading-relaxed text-muted-foreground sm:mt-5 sm:text-xl">
          {lead}
        </p>
        <div className="animate-rise-delay-2 mt-8 flex w-full flex-col gap-3 sm:mt-9 sm:w-auto sm:flex-row sm:flex-wrap sm:items-center">
          <Button asChild size="lg" className="h-12 w-full rounded-md px-7 text-base sm:w-auto">
            <CtaLink href={primaryHref}>
              {primaryLabel}
              <ArrowRight className="ml-1.5 inline h-4 w-4" />
            </CtaLink>
          </Button>
          <Button
            asChild
            variant="ghost"
            size="lg"
            className="h-12 w-full rounded-md px-5 text-base text-muted-foreground hover:text-foreground sm:w-auto"
          >
            <CtaLink href={secondaryHref}>{secondaryLabel}</CtaLink>
          </Button>
        </div>
      </div>
    </section>
  );
}
