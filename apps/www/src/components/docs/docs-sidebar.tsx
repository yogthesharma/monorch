"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Search } from "lucide-react";
import { docsNav, flattenDocsNav } from "@/lib/docs-nav";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";

export function DocsSidebar({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const current = pathname.replace(/\/$/, "") || "/";
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return null;
    return flattenDocsNav().filter((item) => {
      const hay = `${item.title} ${item.description ?? ""} ${item.href}`.toLowerCase();
      return hay.includes(q);
    });
  }, [query]);

  return (
    <ScrollArea className="h-[calc(100svh-4rem)] pr-3">
      <div className="space-y-6 py-6">
        <div className="relative px-2">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search docs…"
            className="h-10 pl-9 text-base"
            aria-label="Search docs"
          />
        </div>

        {filtered ? (
          <div>
            <p className="mb-3 px-2 font-mono text-xs uppercase tracking-[0.14em] text-muted-foreground">
              Results
            </p>
            {filtered.length === 0 ? (
              <p className="px-2 text-sm text-muted-foreground">No matches.</p>
            ) : (
              <ul className="space-y-1">
                {filtered.map((item) => {
                  const active = current === item.href;
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        onClick={onNavigate}
                        className={cn(
                          "block rounded-md px-2 py-2 text-base transition-colors",
                          active
                            ? "bg-secondary font-medium text-foreground"
                            : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground",
                        )}
                      >
                        <span className="block">{item.title}</span>
                        {item.description ? (
                          <span className="mt-0.5 block text-sm text-muted-foreground/80">
                            {item.description}
                          </span>
                        ) : null}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        ) : (
          docsNav.map((group) => (
            <div key={group.title}>
              <p className="mb-3 px-2 font-mono text-xs uppercase tracking-[0.14em] text-muted-foreground">
                {group.title}
              </p>
              <ul className="space-y-1">
                {group.items.map((item) => {
                  const active = current === item.href;
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        onClick={onNavigate}
                        className={cn(
                          "block rounded-md px-2 py-2 text-base transition-colors",
                          active
                            ? "bg-secondary font-medium text-foreground"
                            : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground",
                        )}
                      >
                        {item.title}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))
        )}
      </div>
    </ScrollArea>
  );
}
