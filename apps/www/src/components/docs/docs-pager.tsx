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
      className="mt-12 flex flex-col gap-3 border-t border-border/70 pt-8 sm:mt-16 sm:flex-row sm:items-stretch sm:justify-between"
    >
      {prev ? (
        <Button
          asChild
          variant="outline"
          size="lg"
          className="h-auto w-full min-w-0 justify-start px-4 py-3 text-left sm:max-w-[48%]"
        >
          <Link href={prev.href} className="min-w-0">
            <span className="flex min-w-0 flex-col gap-1">
              <span className="flex items-center gap-1.5 text-xs uppercase tracking-wider text-muted-foreground">
                <ArrowLeft className="h-3.5 w-3.5 shrink-0" />
                Previous
              </span>
              <span className="truncate text-base font-medium text-foreground">{prev.title}</span>
            </span>
          </Link>
        </Button>
      ) : (
        <span className="hidden sm:block sm:max-w-[48%]" />
      )}
      {next ? (
        <Button
          asChild
          variant="outline"
          size="lg"
          className="h-auto w-full min-w-0 justify-end px-4 py-3 text-right sm:ml-auto sm:max-w-[48%]"
        >
          <Link href={next.href} className="min-w-0">
            <span className="flex min-w-0 flex-col items-end gap-1">
              <span className="flex items-center gap-1.5 text-xs uppercase tracking-wider text-muted-foreground">
                Next
                <ArrowRight className="h-3.5 w-3.5 shrink-0" />
              </span>
              <span className="truncate text-base font-medium text-foreground">{next.title}</span>
            </span>
          </Link>
        </Button>
      ) : null}
    </nav>
  );
}
