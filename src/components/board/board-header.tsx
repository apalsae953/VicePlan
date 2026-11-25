"use client";

import { useState, type Ref } from "react";
import { ChevronRight, Plus, Search } from "lucide-react";

import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Kbd } from "@/components/ui/kbd";
import { cn } from "@/lib/utils";
import { useWorkspaceStore } from "@/stores/workspace-store-provider";
import { AssigneeFilter } from "./assignee-filter";
import { BoardFiltersMenu } from "./board-filters-menu";
import { BoardSearch } from "./board-search";
import { MilestoneProgress } from "./milestone-progress";
import { MilestoneSwitcher } from "./milestone-switcher";

export function BoardHeader({
  searchRef,
  onNewTask,
}: {
  searchRef: Ref<HTMLInputElement>;
  onNewTask: () => void;
}) {
  const projectName = useWorkspaceStore((s) => s.project.name);
  const query = useWorkspaceStore((s) => s.query);
  // En móvil la búsqueda va en una segunda fila que se abre con la lupa.
  const [mobileSearch, setMobileSearch] = useState(false);
  const showMobileSearch = mobileSearch || query !== "";

  return (
    <>
      <PageHeader className="gap-2">
        <nav aria-label="Ruta" className="flex min-w-0 items-center gap-1 overflow-hidden">
          <span className="hidden max-w-48 truncate text-[13px] text-muted-foreground 2xl:block">{projectName}</span>
          <ChevronRight className="hidden size-3.5 shrink-0 text-muted-foreground/50 2xl:block" aria-hidden />
          <MilestoneSwitcher />
        </nav>

        <div className="ml-auto flex shrink-0 items-center gap-1 sm:gap-2">
          <MilestoneProgress className="hidden lg:flex" />
          <AssigneeFilter />
          <BoardFiltersMenu />
          <BoardSearch inputRef={searchRef} className="hidden w-48 sm:block xl:w-60" />
          <Button
            variant="ghost"
            size="icon-sm"
            className={cn("text-muted-foreground sm:hidden", showMobileSearch && "bg-accent/60 text-foreground")}
            onClick={() => setMobileSearch((open) => !open)}
            aria-label="Buscar tareas"
            aria-expanded={showMobileSearch}
          >
            <Search />
          </Button>
          <Button size="sm" onClick={onNewTask} className="gap-1.5" aria-label="Nueva tarea">
            <Plus aria-hidden />
            <span className="hidden sm:inline">Nueva tarea</span>
            <Kbd className="ml-0.5 hidden h-4 min-w-4 bg-primary-foreground/15 text-[10px] text-primary-foreground sm:inline-flex">
              C
            </Kbd>
          </Button>
        </div>
      </PageHeader>
      {showMobileSearch && (
        <div className="shrink-0 border-b px-3 py-2 sm:hidden">
          <BoardSearch autoFocus className="w-full" onDismiss={() => setMobileSearch(false)} />
        </div>
      )}
    </>
  );
}
