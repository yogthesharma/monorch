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
  primaryHref = "/docs/recipes/fastify",
  primaryLabel = "Fastify in 5 minutes",
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
        className="pointer-events-none absolute -right-24 top-0 h-[28rem] w-[28rem] rounded-full bg-signal/10 blur-3xl animate-drift"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -left-16 bottom-0 h-[22rem] w-[22rem] rounded-full bg-[hsl(198_55%_40%/0.12)] blur-3xl animate-pulse-soft"
      />

      <div className="relative mx-auto max-w-6xl px-5 py-16 sm:px-6 sm:py-20 lg:px-8 lg:py-24">
        <p className="animate-rise flex items-center gap-3 font-display text-4xl font-bold tracking-tight text-ink sm:text-5xl">
          <MonorchLogo className="h-[0.85em] w-auto text-signal" />
          <span>Monorch</span>
        </p>
        <p className="animate-rise-delay mt-8 font-mono text-xs uppercase tracking-[0.18em] text-muted-foreground">
          {kicker}
        </p>
        <h1 className="animate-rise-delay mt-4 max-w-3xl text-balance font-display text-4xl font-semibold tracking-tight text-ink sm:text-5xl lg:text-6xl">
          {title}
        </h1>
        <p className="animate-rise-delay-2 mt-5 max-w-2xl text-lg leading-relaxed text-muted-foreground sm:text-xl">
          {lead}
        </p>
        <div className="animate-rise-delay-2 mt-9 flex flex-wrap items-center gap-3">
          <Button asChild size="lg" className="h-12 rounded-md px-7 text-base">
            <CtaLink href={primaryHref}>
              {primaryLabel}
              <ArrowRight className="ml-1.5 inline h-4 w-4" />
            </CtaLink>
          </Button>
          <Button
            asChild
            variant="ghost"
            size="lg"
            className="h-12 rounded-md px-5 text-base text-muted-foreground hover:text-foreground"
          >
            <CtaLink href={secondaryHref}>{secondaryLabel}</CtaLink>
          </Button>
        </div>
      </div>
    </section>
  );
}
