import type { ReactNode } from "react";

import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";

/** Barra superior común a todas las vistas del proyecto. */
export function PageHeader({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <header
      className={cn(
        "flex h-12 shrink-0 items-center gap-2 border-b bg-background px-3",
        className,
      )}
    >
      <SidebarTrigger className="text-muted-foreground" />
      <Separator orientation="vertical" className="mr-1 data-[orientation=vertical]:h-4" />
      {children}
    </header>
  );
}
