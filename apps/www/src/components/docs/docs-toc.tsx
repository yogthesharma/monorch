"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

type TocItem = { id: string; text: string; level: 2 | 3 };

export function DocsToc({ articleSelector = "article.prose-docs" }: { articleSelector?: string }) {
  const pathname = usePathname();
  const [items, setItems] = useState<TocItem[]>([]);
  const [activeId, setActiveId] = useState<string>("");

  useEffect(() => {
    const article = document.querySelector(articleSelector);
    if (!article) {
      setItems([]);
      return;
    }

    const headings = Array.from(article.querySelectorAll("h2[id], h3[id]")) as HTMLElement[];
    const next: TocItem[] = headings.map((el) => ({
      id: el.id,
      text: el.textContent?.trim() ?? el.id,
      level: el.tagName === "H3" ? 3 : 2,
    }));
    setItems(next);
    setActiveId("");

    if (!next.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]?.target.id) setActiveId(visible[0].target.id);
      },
      { rootMargin: "-20% 0px -70% 0px", threshold: [0, 1] },
    );

    for (const el of headings) observer.observe(el);
    return () => observer.disconnect();
  }, [articleSelector, pathname]);

  if (items.length < 2) return null;

  return (
    <nav aria-label="On this page" className="space-y-3">
      <p className="font-mono text-xs uppercase tracking-[0.14em] text-muted-foreground">
        On this page
      </p>
      <ul className="space-y-1.5 border-l border-border/70">
        {items.map((item) => (
          <li key={item.id}>
            <a
              href={`#${item.id}`}
              className={cn(
                "block border-l-2 border-transparent py-1 text-sm transition-colors",
                item.level === 3 ? "pl-5" : "pl-3",
                activeId === item.id
                  ? "-ml-px border-signal text-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {item.text}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
