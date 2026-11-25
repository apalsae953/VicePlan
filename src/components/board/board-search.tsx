"use client";

import type { Ref } from "react";
import { Search, X } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Kbd } from "@/components/ui/kbd";
import { cn } from "@/lib/utils";
import { useWorkspaceStore } from "@/stores/workspace-store-provider";

/** Búsqueda instantánea por título, descripción o identificador (AET-12). */
export function BoardSearch({
  inputRef,
  className,
  autoFocus,
  onDismiss,
}: {
  inputRef?: Ref<HTMLInputElement>;
  className?: string;
  autoFocus?: boolean;
  /** Escape: además de limpiar, cerrar el contenedor (fila de búsqueda en móvil). */
  onDismiss?: () => void;
}) {
  const query = useWorkspaceStore((s) => s.query);
  const setQuery = useWorkspaceStore((s) => s.setQuery);

  return (
    <div className={cn("group/search relative", className)}>
      <Search
        className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground"
        aria-hidden
      />
      <Input
        ref={inputRef}
        autoFocus={autoFocus}
        type="search"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            setQuery("");
            event.currentTarget.blur();
            onDismiss?.();
          }
        }}
        placeholder="Buscar tareas…"
        aria-label="Buscar tareas"
        className="h-7 w-full pr-8 pl-8 text-[13px] [&::-webkit-search-cancel-button]:hidden"
      />
      {query ? (
        <button
          type="button"
          onClick={() => setQuery("")}
          className="absolute top-1/2 right-1.5 flex size-5 -translate-y-1/2 items-center justify-center rounded text-muted-foreground hover:bg-accent hover:text-foreground"
          aria-label="Limpiar búsqueda"
        >
          <X className="size-3.5" />
        </button>
      ) : (
        <Kbd className="absolute top-1/2 right-1.5 hidden -translate-y-1/2 group-focus-within/search:hidden sm:inline-flex">
          /
        </Kbd>
      )}
    </div>
  );
}
