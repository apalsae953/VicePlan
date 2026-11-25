import { Skeleton } from "@/components/ui/skeleton";

/** Esqueleto del shell mientras llega el workspace (sidebar + tablero). */
export function AppShellSkeleton() {
  return (
    <div className="flex h-svh w-full overflow-hidden" aria-busy aria-label="Cargando proyecto">
      <aside className="hidden w-64 shrink-0 flex-col gap-6 border-r border-sidebar-border bg-sidebar p-3 md:flex">
        <div className="flex items-center gap-2 p-1">
          <Skeleton className="size-7 rounded-md" />
          <Skeleton className="h-3.5 w-32" />
        </div>
        <div className="space-y-2.5 px-2">
          {[28, 32, 20, 18].map((w) => (
            <Skeleton key={w} className="h-3.5" style={{ width: `${w * 4}px` }} />
          ))}
        </div>
        <div className="space-y-2.5 px-2">
          <Skeleton className="h-3 w-20" />
          {[24, 20, 26, 22, 14, 10].map((w, i) => (
            <Skeleton key={i} className="h-3.5" style={{ width: `${w * 4}px` }} />
          ))}
        </div>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex h-12 items-center gap-3 border-b px-4">
          <Skeleton className="h-4 w-48" />
          <Skeleton className="ml-auto h-7 w-56" />
          <Skeleton className="h-7 w-28" />
        </div>
        <div className="flex gap-3 overflow-hidden p-4">
          {[3, 3, 3, 3].map((cards, column) => (
            <div key={column} className="w-72 shrink-0 space-y-2">
              <Skeleton className="mb-3 h-4 w-28" />
              {Array.from({ length: cards }, (_, i) => (
                <Skeleton key={i} className="h-24 w-full rounded-lg" />
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
