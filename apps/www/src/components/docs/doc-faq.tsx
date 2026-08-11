import type { ReactNode } from "react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { faqJsonLd, JsonLd } from "@/components/json-ld";
import { absoluteUrl } from "@/lib/site";

export type FaqItem = {
  q: string;
  a: ReactNode;
  /** Plain-text answer for FAQPage JSON-LD (SEO + GEO). Falls back to `a` when it is a string. */
  plain?: string;
};

function plainAnswers(items: FaqItem[]): { q: string; plain: string }[] {
  return items
    .map((item) => {
      const plain = item.plain ?? (typeof item.a === "string" ? item.a : null);
      return plain ? { q: item.q, plain } : null;
    })
    .filter((x): x is { q: string; plain: string } => Boolean(x));
}

export function DocFaq({
  items,
  path,
}: {
  items: FaqItem[];
  /** Canonical path for FAQPage schema, e.g. `/docs/agents`. */
  path?: string;
}) {
  const schemaItems = plainAnswers(items);
  const schema =
    path && schemaItems.length > 0 ? faqJsonLd(schemaItems, absoluteUrl(path)) : null;

  return (
    <section className="mt-16 border-t border-border/70 pt-10">
      {schema ? <JsonLd data={schema} /> : null}
      <h2 className="font-display text-3xl font-semibold tracking-tight text-ink">FAQ</h2>
      <Accordion type="multiple" className="mt-6">
        {items.map((item, i) => (
          <AccordionItem key={item.q} value={`faq-${i}`}>
            <AccordionTrigger className="text-left text-lg">{item.q}</AccordionTrigger>
            <AccordionContent className="text-base leading-relaxed text-muted-foreground">
              {item.a}
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </section>
  );
}
