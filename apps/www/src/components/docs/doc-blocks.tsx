import type { ReactNode } from "react";
import { CodeBlock } from "@/components/code-block";
import type { HighlightLang } from "@/lib/highlight";
import { slugifyHeading } from "@/lib/docs-nav";
import { cn } from "@/lib/utils";

function headingText(node: ReactNode): string {
  if (node == null || typeof node === "boolean") return "";
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(headingText).join("");
  if (typeof node === "object" && node !== null && "props" in node) {
    const props = (node as { props?: { children?: ReactNode } }).props;
    return headingText(props?.children);
  }
  return "";
}

export function DocH1({ children }: { children: ReactNode }) {
  return (
    <h1 className="font-display text-3xl font-bold tracking-tight text-ink sm:text-5xl">
      {children}
    </h1>
  );
}

export function DocLead({ children }: { children: ReactNode }) {
  return (
    <p className="mt-4 text-lg leading-relaxed text-muted-foreground sm:mt-5 sm:text-xl">
      {children}
    </p>
  );
}

export function DocH2({ children, id }: { children: ReactNode; id?: string }) {
  const text = headingText(children);
  const headingId = id ?? (text ? slugifyHeading(text) : undefined);
  return (
    <h2
      id={headingId}
      className="mt-10 scroll-mt-24 font-display text-2xl font-semibold tracking-tight text-ink sm:mt-14 sm:scroll-mt-28 sm:text-3xl"
    >
      {children}
    </h2>
  );
}

export function DocH3({ children, id }: { children: ReactNode; id?: string }) {
  const text = headingText(children);
  const headingId = id ?? (text ? slugifyHeading(text) : undefined);
  return (
    <h3
      id={headingId}
      className="mt-10 scroll-mt-28 font-display text-xl font-semibold tracking-tight text-ink"
    >
      {children}
    </h3>
  );
}

export function DocP({ children }: { children: ReactNode }) {
  return (
    <p className="mt-4 text-base leading-relaxed text-foreground/90 sm:mt-5 sm:text-lg">
      {children}
    </p>
  );
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


