import type { ReactNode } from "react";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { cn } from "@/lib/utils";

export function MarketingShell({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className={cn(className)}>{children}</main>
      <SiteFooter />
    </div>
  );
}
