import type { ReactNode } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { CodeBlock } from "@/components/code-block";
import type { HighlightLang } from "@/lib/highlight";
import { cn } from "@/lib/utils";

export function DocH1({ children }: { children: ReactNode }) {
  return (
    <h1 className="font-display text-4xl font-bold tracking-tight text-ink sm:text-5xl">
      {children}
    </h1>
  );
}

export function DocLead({ children }: { children: ReactNode }) {
  return <p className="mt-5 text-xl leading-relaxed text-muted-foreground">{children}</p>;
}

export function DocH2({ children }: { children: ReactNode }) {
  return (
    <h2 className="mt-14 scroll-mt-28 font-display text-3xl font-semibold tracking-tight text-ink">
      {children}
    </h2>
  );
}

export function DocH3({ children }: { children: ReactNode }) {
  return (
    <h3 className="mt-10 scroll-mt-28 font-display text-xl font-semibold tracking-tight text-ink">
      {children}
    </h3>
  );
}

export function DocP({ children }: { children: ReactNode }) {
  return <p className="mt-5 text-lg leading-relaxed text-foreground/90">{children}</p>;
}

export function DocTerm({
  name,
  children,
}: {
  name: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="mt-6 border-t border-border/60 pt-5 first:mt-4 first:border-t-0 first:pt-0">
      <dt className="font-mono text-base font-medium text-ink">{name}</dt>
      <dd className="mt-2 text-base leading-relaxed text-muted-foreground">{children}</dd>
    </div>
  );
}

export function DocTerms({ children }: { children: ReactNode }) {
  return <dl className="mt-6">{children}</dl>;
}

export async function DocCode({
  children,
  lang = "typescript",
  filename,
  className,
}: {
  children: string;
  lang?: HighlightLang;
  filename?: string;
  className?: string;
}) {
  return (
    <div className={cn("mt-6", className)}>
      <CodeBlock code={children} lang={lang} filename={filename} />
    </div>
  );
}

export function DocNext({ href, label }: { href: string; label: string }) {
  return (
    <div className="mt-16">
      <Button asChild variant="outline" size="lg" className="text-base">
        <Link href={href}>Next: {label}</Link>
      </Button>
    </div>
  );
}
