"use client";

import { useState } from "react";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { DocsSidebar } from "@/components/docs/docs-sidebar";

export function DocsMobileNav() {
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm" className="lg:hidden">
          <Menu className="mr-2 h-4 w-4" />
          Menu
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-[min(100vw-2rem,20rem)] p-0 sm:max-w-sm">
        <SheetHeader className="border-b px-4 py-4 text-left">
          <SheetTitle className="font-display">Docs</SheetTitle>
        </SheetHeader>
        <div className="max-h-[calc(100svh-4.5rem)] overflow-y-auto px-2 pb-6">
          <DocsSidebar onNavigate={() => setOpen(false)} />
        </div>
      </SheetContent>
    </Sheet>
  );
}
