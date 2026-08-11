import Link from "next/link";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { DocsSidebar } from "@/components/docs/docs-sidebar";
import { DocsMobileNav } from "@/components/docs/docs-mobile-nav";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Separator } from "@/components/ui/separator";

export default function DocsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen">
      <SiteHeader />
      <div className="mx-auto flex w-full max-w-6xl gap-8 px-4 sm:px-6">
        <aside className="sticky top-16 hidden h-[calc(100svh-4rem)] w-56 shrink-0 border-r border-border/70 lg:block">
          <DocsSidebar />
        </aside>
        <div className="min-w-0 flex-1 py-8">
          <div className="mb-6 flex items-center justify-between gap-4">
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem>
                  <BreadcrumbLink asChild>
                    <Link href="/">Home</Link>
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbPage>Docs</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
            <DocsMobileNav />
          </div>
          <Separator className="mb-8" />
          <article className="prose-docs max-w-3xl pb-20">{children}</article>
        </div>
      </div>
      <SiteFooter />
    </div>
  );
}
