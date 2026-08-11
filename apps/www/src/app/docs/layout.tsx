import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { DocsBreadcrumb } from "@/components/docs/docs-breadcrumb";
import { DocsSidebar } from "@/components/docs/docs-sidebar";
import { DocsMobileNav } from "@/components/docs/docs-mobile-nav";
import { DocsPager } from "@/components/docs/docs-pager";
import { DocsToc } from "@/components/docs/docs-toc";
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
            <DocsBreadcrumb />
            <DocsMobileNav />
          </div>
          <Separator className="mb-8" />
          <div className="xl:grid xl:grid-cols-[minmax(0,1fr)_12rem] xl:gap-10">
            <article className="prose-docs max-w-3xl pb-8">
              {children}
              <DocsPager />
            </article>
            <aside className="sticky top-24 hidden self-start xl:block">
              <DocsToc />
            </aside>
          </div>
        </div>
      </div>
      <SiteFooter />
    </div>
  );
}
