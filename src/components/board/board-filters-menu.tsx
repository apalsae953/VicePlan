"use client";

import { useMemo } from "react";
import { ArrowDownUp, CalendarDays, Hash, ListFilter } from "lucide-react";

import { PriorityIcon } from "@/components/tasks/task-icons";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { BOARD_SORTS, DUE_FILTERS, type BoardSort, type DueFilter } from "@/lib/board";
import { TASK_PRIORITIES } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { useWorkspaceStore } from "@/stores/workspace-store-provider";

/**
 * Filtros avanzados y orden del tablero (como los de HacknPlan): prioridad,
 * etiquetas, fecha límite y criterio de orden. Categoría y responsable tienen
 * sus propios accesos (barra lateral y avatares del header).
 */
export function BoardFiltersMenu({ className }: { className?: string }) {
  const tasks = useWorkspaceStore((s) => s.tasks);
  const priorities = useWorkspaceStore((s) => s.priorityFilter);
  const tags = useWorkspaceStore((s) => s.tagFilter);
  const due = useWorkspaceStore((s) => s.dueFilter);
  const sort = useWorkspaceStore((s) => s.boardSort);
  const togglePriority = useWorkspaceStore((s) => s.togglePriority);
  const toggleTag = useWorkspaceStore((s) => s.toggleTag);
  const setDueFilter = useWorkspaceStore((s) => s.setDueFilter);
  const setBoardSort = useWorkspaceStore((s) => s.setBoardSort);

  // Etiquetas en uso en el proyecto, de la más a la menos usada.
  const allTags = useMemo(() => {
    const counts = new Map<string, number>();
    for (const task of Object.values(tasks)) for (const tag of task.tags) counts.set(tag, (counts.get(tag) ?? 0) + 1);
    return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  }, [tasks]);

  const active = priorities.length + tags.length + (due ? 1 : 0);
  const sorted = sort !== "manual";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className={cn("gap-1.5 px-2 text-muted-foreground", (active > 0 || sorted) && "bg-accent/60 text-foreground", className)}
          aria-label={active > 0 ? `Filtros y orden (${active} filtros activos)` : "Filtros y orden"}
        >
          <ListFilter />
          <span className="hidden xl:inline">Filtrar</span>
          {active > 0 && <span className="font-mono text-[11px] tabular-nums">{active}</span>}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuSub>
          <DropdownMenuSubTrigger className="gap-2">
            <PriorityIcon priority="HIGH" /> Prioridad
            {priorities.length > 0 && (
              <span className="ml-auto font-mono text-[11px] text-muted-foreground">{priorities.length}</span>
            )}
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent>
            {TASK_PRIORITIES.map((priority) => (
              <DropdownMenuCheckboxItem
                key={priority.value}
                checked={priorities.includes(priority.value)}
                onCheckedChange={() => togglePriority(priority.value)}
                onSelect={(event) => event.preventDefault()}
              >
                <PriorityIcon priority={priority.value} /> {priority.label}
              </DropdownMenuCheckboxItem>
            ))}
          </DropdownMenuSubContent>
        </DropdownMenuSub>

        <DropdownMenuSub>
          <DropdownMenuSubTrigger className="gap-2">
            <Hash className="text-muted-foreground" /> Etiqueta
            {tags.length > 0 && <span className="ml-auto font-mono text-[11px] text-muted-foreground">{tags.length}</span>}
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent className="max-h-72 w-52">
            {allTags.length === 0 ? (
              <DropdownMenuItem disabled className="text-xs">
                Ninguna tarea tiene etiquetas
              </DropdownMenuItem>
            ) : (
              allTags.map(([tag, count]) => (
                <DropdownMenuCheckboxItem
                  key={tag}
                  checked={tags.includes(tag)}
                  onCheckedChange={() => toggleTag(tag)}
                  onSelect={(event) => event.preventDefault()}
                >
                  <span className="truncate">#{tag}</span>
                  <span className="ml-auto pr-4 font-mono text-[11px] text-muted-foreground tabular-nums">{count}</span>
                </DropdownMenuCheckboxItem>
              ))
            )}
          </DropdownMenuSubContent>
        </DropdownMenuSub>

        <DropdownMenuSub>
          <DropdownMenuSubTrigger className="gap-2">
            <CalendarDays className="text-muted-foreground" /> Fecha límite
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent>
            <DropdownMenuRadioGroup
              value={due ?? "all"}
              onValueChange={(value) => setDueFilter(value === "all" ? null : (value as DueFilter))}
            >
              <DropdownMenuRadioItem value="all">Cualquiera</DropdownMenuRadioItem>
              {DUE_FILTERS.map((option) => (
                <DropdownMenuRadioItem key={option.value} value={option.value}>
                  {option.label}
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
          </DropdownMenuSubContent>
        </DropdownMenuSub>

        <DropdownMenuSeparator />
        <DropdownMenuLabel className="flex items-center gap-2 text-xs font-normal text-muted-foreground">
          <ArrowDownUp className="size-3.5" aria-hidden /> Ordenar por
        </DropdownMenuLabel>
        <DropdownMenuRadioGroup value={sort} onValueChange={(value) => setBoardSort(value as BoardSort)}>
          {BOARD_SORTS.map((option) => (
            <DropdownMenuRadioItem key={option.value} value={option.value}>
              {option.label}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
