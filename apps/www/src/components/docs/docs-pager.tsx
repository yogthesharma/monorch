"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { docsNavNeighbors } from "@/lib/docs-nav";
import { Button } from "@/components/ui/button";

export function DocsPager() {
  const pathname = usePathname();
  const { prev, next } = docsNavNeighbors(pathname);

  if (!prev && !next) return null;

  return (
    <nav
      aria-label="Docs pagination"
      className="mt-16 flex flex-col gap-3 border-t border-border/70 pt-8 sm:flex-row sm:items-stretch sm:justify-between"
    >
      {prev ? (
        <Button asChild variant="outline" size="lg" className="h-auto justify-start px-4 py-3 text-left">
          <Link href={prev.href}>
            <span className="flex flex-col gap-1">
              <span className="flex items-center gap-1.5 text-xs uppercase tracking-wider text-muted-foreground">
                <ArrowLeft className="h-3.5 w-3.5" />
                Previous
              </span>
              <span className="text-base font-medium text-foreground">{prev.title}</span>
            </span>
          </Link>
        </Button>
      ) : (
        <span />
      )}
      {next ? (
        <Button asChild variant="outline" size="lg" className="h-auto justify-end px-4 py-3 text-right">
          <Link href={next.href}>
            <span className="flex flex-col items-end gap-1">
              <span className="flex items-center gap-1.5 text-xs uppercase tracking-wider text-muted-foreground">
                Next
                <ArrowRight className="h-3.5 w-3.5" />
              </span>
              <span className="text-base font-medium text-foreground">{next.title}</span>
            </span>
          </Link>
        </Button>
      ) : null}
    </nav>
  );
}
