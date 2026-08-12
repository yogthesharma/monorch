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
    <div className="min-h-screen overflow-x-clip">
      <SiteHeader />
      <div className="mx-auto flex w-full max-w-6xl gap-6 px-4 sm:gap-8 sm:px-6">
        <aside className="sticky top-14 hidden h-[calc(100svh-3.5rem)] w-56 shrink-0 border-r border-border/70 sm:top-16 sm:h-[calc(100svh-4rem)] lg:block">
          <DocsSidebar />
        </aside>
        <div className="min-w-0 flex-1 py-6 sm:py-8">
          <div className="mb-5 flex items-start justify-between gap-3 sm:mb-6 sm:items-center sm:gap-4">
            <div className="min-w-0 flex-1 overflow-hidden">
              <DocsBreadcrumb />
            </div>
            <DocsMobileNav />
          </div>
          <Separator className="mb-6 sm:mb-8" />
          <div className="xl:grid xl:grid-cols-[minmax(0,1fr)_12rem] xl:gap-10">
            <article className="prose-docs max-w-3xl min-w-0 pb-8">
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
