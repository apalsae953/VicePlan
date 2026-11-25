"use client";

import { useMemo, useState } from "react";
import { ArrowRight, ChevronDown, Inbox, X } from "lucide-react";
import { toast } from "sonner";

import { CategoryBadge, MilestoneStatusIcon, PriorityIcon } from "@/components/tasks/task-icons";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useTaskActions } from "@/hooks/use-task-actions";
import { formatHours, formatTaskId } from "@/lib/board";
import { findCategory, TASK_PRIORITIES } from "@/lib/constants";
import type { BoardMilestone } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useWorkspaceStore } from "@/stores/workspace-store-provider";

const PRIORITY_RANK = Object.fromEntries(TASK_PRIORITIES.map((p, i) => [p.value, i]));

/**
 * Tareas sin milestone. Se planifican moviéndolas a un hito: una a una (botón
 * rápido al hito activo o menú) o en bloque con la selección múltiple.
 */
export function BacklogPanel() {
  const tasks = useWorkspaceStore((s) => s.tasks);
  const milestones = useWorkspaceStore((s) => s.milestones);
  const projectKey = useWorkspaceStore((s) => s.project.key);
  const categories = useWorkspaceStore((s) => s.project.categories);
  const openTask = useWorkspaceStore((s) => s.openTask);
  const { update } = useTaskActions();
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const backlog = useMemo(
    () =>
      Object.values(tasks)
        .filter((task) => task.milestoneId === null)
        .sort((a, b) => PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority] || a.number - b.number),
    [tasks],
  );
  const destinations = milestones.filter((m) => m.status !== "COMPLETED");
  const active = milestones.find((m) => m.status === "ACTIVE") ?? null;
  const hours = backlog.reduce((sum, task) => sum + (task.estimatedHours ?? 0), 0);

  // La selección solo cuenta tareas que siguen en el backlog.
  const selection = backlog.filter((task) => selected.has(task.id));
  const allSelected = backlog.length > 0 && selection.length === backlog.length;

  async function move(taskIds: string[], milestone: BoardMilestone) {
    // update() aplica cada cambio en el store de forma síncrona antes de
    // esperar al servidor, así las posiciones se calculan en orden.
    const results = await Promise.all(taskIds.map((id) => update(id, { milestoneId: milestone.id })));
    const moved = results.filter(Boolean).length;
    setSelected((current) => new Set([...current].filter((id) => !taskIds.includes(id))));
    if (moved > 0) {
      toast.success(
        `${moved} ${moved === 1 ? "tarea movida" : "tareas movidas"} a ${milestone.title}`,
      );
    }
  }

  function toggle(taskId: string, checked: boolean) {
    setSelected((current) => {
      const next = new Set(current);
      if (checked) next.add(taskId);
      else next.delete(taskId);
      return next;
    });
  }

  return (
    <section aria-labelledby="backlog-heading" className="space-y-3">
      <header className="flex min-h-7 flex-wrap items-center gap-x-3 gap-y-2">
        <h2 id="backlog-heading" className="flex items-center gap-2 text-[13px] font-medium">
          <Inbox className="size-4 text-muted-foreground" aria-hidden />
          Trabajo pendiente
          <span className="font-normal text-muted-foreground tabular-nums">{backlog.length}</span>
        </h2>
        <span className="text-xs text-muted-foreground">
          Tareas sin milestone · {formatHours(hours)} h estimadas
        </span>

        {selection.length > 0 && (
          <div className="ml-auto flex items-center gap-1.5">
            <span className="text-xs text-muted-foreground tabular-nums">
              {selection.length} {selection.length === 1 ? "seleccionada" : "seleccionadas"}
            </span>
            <MoveMenu
              destinations={destinations}
              label="Mover selección"
              onMove={(milestone) => void move(selection.map((t) => t.id), milestone)}
              variant="secondary"
            />
            <Button
              variant="ghost"
              size="icon-sm"
              className="text-muted-foreground"
              onClick={() => setSelected(new Set())}
              aria-label="Quitar selección"
            >
              <X />
            </Button>
          </div>
        )}
      </header>

      {backlog.length === 0 ? (
        <p className="rounded-xl border border-dashed px-4 py-8 text-center text-[13px] text-muted-foreground">
          No hay trabajo pendiente: todas las tareas tienen hito.
        </p>
      ) : (
        <div className="overflow-hidden rounded-xl border bg-card">
          <div className="flex h-9 items-center gap-3 border-b px-3 text-xs text-muted-foreground">
            <Checkbox
              checked={allSelected ? true : selection.length > 0 ? "indeterminate" : false}
              onCheckedChange={(checked) => setSelected(checked ? new Set(backlog.map((t) => t.id)) : new Set())}
              aria-label="Seleccionar todo el trabajo pendiente"
            />
            <span>Tarea</span>
          </div>
          <ul className="divide-y">
            {backlog.map((task) => {
              const isSelected = selected.has(task.id);
              return (
                <li
                  key={task.id}
                  className={cn(
                    "group/row flex min-h-11 items-center gap-3 px-3 py-1.5 transition-colors duration-150 hover:bg-accent/40",
                    isSelected && "bg-primary/[0.06]",
                  )}
                >
                  <Checkbox
                    checked={isSelected}
                    onCheckedChange={(checked) => toggle(task.id, checked === true)}
                    aria-label={`Seleccionar ${formatTaskId(projectKey, task.number)}`}
                  />
                  <PriorityIcon priority={task.priority} />
                  <button
                    type="button"
                    onClick={() => openTask(task.id)}
                    className="flex min-w-0 flex-1 items-center gap-2.5 rounded text-left outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <span className="shrink-0 font-mono text-[11px] text-muted-foreground">
                      {formatTaskId(projectKey, task.number)}
                    </span>
                    <span className="truncate text-[13px]">{task.title}</span>
                  </button>
                  <CategoryBadge category={findCategory(categories, task.category)} className="hidden sm:inline-flex" />
                  <span className="hidden w-10 text-right font-mono text-[11px] text-muted-foreground tabular-nums md:block">
                    {task.estimatedHours !== null ? `${formatHours(task.estimatedHours)}h` : "—"}
                  </span>
                  <div className="flex shrink-0 items-center gap-0.5">
                    {active && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            className="text-muted-foreground"
                            onClick={() => void move([task.id], active)}
                            aria-label={`Mover ${formatTaskId(projectKey, task.number)} a ${active.title}`}
                          >
                            <ArrowRight />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Mover a {active.title}</TooltipContent>
                      </Tooltip>
                    )}
                    <MoveMenu
                      destinations={destinations}
                      label="Mover a…"
                      iconOnly
                      onMove={(milestone) => void move([task.id], milestone)}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </section>
  );
}

function MoveMenu({
  destinations,
  label,
  onMove,
  iconOnly = false,
  variant = "ghost",
}: {
  destinations: BoardMilestone[];
  label: string;
  onMove: (milestone: BoardMilestone) => void;
  iconOnly?: boolean;
  variant?: "ghost" | "secondary";
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant={variant}
          size={iconOnly ? "icon-sm" : "sm"}
          className={cn(iconOnly && "text-muted-foreground")}
          aria-label={label}
          disabled={destinations.length === 0}
        >
          {!iconOnly && label}
          <ChevronDown />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60">
        <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">Mover a un hito</DropdownMenuLabel>
        {destinations.map((milestone) => (
          <DropdownMenuItem key={milestone.id} onSelect={() => onMove(milestone)}>
            <MilestoneStatusIcon status={milestone.status} />
            <span className="truncate">{milestone.title}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
