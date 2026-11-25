"use client";

import { useMemo } from "react";
import { CalendarRange, CircleCheck, Ellipsis, Pencil, RotateCcw, SquareKanban, TriangleAlert } from "lucide-react";

import { Meter } from "@/components/charts/meter";
import { StatusBar } from "@/components/charts/status-bar";
import { MilestoneStatusIcon } from "@/components/tasks/task-icons";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatHours, milestoneDateRange, milestoneTimeline } from "@/lib/board";
import { MILESTONE_STATUS_META } from "@/lib/constants";
import { elapsedRatio } from "@/lib/metrics";
import type { BoardMilestone, BoardTask } from "@/lib/types";
import { cn } from "@/lib/utils";

type MilestoneCardProps = {
  milestone: BoardMilestone;
  tasks: BoardTask[];
  onOpenBoard: () => void;
  onEdit: () => void;
  onComplete: () => void;
  onReopen: () => void;
};

/** Margen antes de avisar de que el avance va por detrás del calendario. */
const BEHIND_THRESHOLD = 0.15;

/**
 * Resumen de un hito: plazo, reparto de tareas por estado (con la marca del
 * tiempo transcurrido), horas registradas frente a estimadas y acciones.
 */
export function MilestoneCard({ milestone, tasks, onOpenBoard, onEdit, onComplete, onReopen }: MilestoneCardProps) {
  const stats = useMemo(() => {
    const done = tasks.filter((t) => t.status === "DONE").length;
    const estimated = tasks.reduce((sum, t) => sum + (t.estimatedHours ?? 0), 0);
    const logged = tasks.reduce((sum, t) => sum + t.loggedHours, 0);
    return { done, total: tasks.length, estimated, logged };
  }, [tasks]);

  const range = milestoneDateRange(milestone);
  const timeline = milestoneTimeline(milestone);
  const isActive = milestone.status === "ACTIVE";
  const isCompleted = milestone.status === "COMPLETED";
  const elapsed = isActive ? elapsedRatio(milestone) : null;
  const doneRatio = stats.total > 0 ? stats.done / stats.total : 0;
  const behind = elapsed !== null && stats.total > 0 && elapsed - doneRatio > BEHIND_THRESHOLD;
  const overrun = stats.estimated > 0 && stats.logged > stats.estimated;

  return (
    <article
      aria-labelledby={`milestone-${milestone.id}`}
      className={cn(
        "rounded-xl border bg-card p-4 transition-colors duration-150 sm:p-5",
        isActive && "border-primary/25",
      )}
    >
      <div className="flex items-start gap-3">
        <MilestoneStatusIcon status={milestone.status} className="mt-1" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <h3 id={`milestone-${milestone.id}`} className="text-sm font-medium">
              {milestone.title}
            </h3>
            <span className="rounded-full border px-2 py-px text-[11px] text-muted-foreground">
              {MILESTONE_STATUS_META[milestone.status].label}
            </span>
          </div>
          {milestone.description && (
            <p className="mt-1 line-clamp-2 text-[13px] text-pretty text-muted-foreground">{milestone.description}</p>
          )}
          {(range || timeline) && (
            <p className="mt-2 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground" suppressHydrationWarning>
              <CalendarRange className="size-3.5" aria-hidden />
              {range}
              {range && timeline && <span className="text-muted-foreground/50">·</span>}
              {timeline}
            </p>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-1">
          <Button variant="outline" size="sm" onClick={onOpenBoard} className="gap-1.5">
            <SquareKanban aria-hidden />
            <span className="hidden sm:inline">Abrir en tablero</span>
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon-sm" className="text-muted-foreground" aria-label={`Acciones de ${milestone.title}`}>
                <Ellipsis />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              <DropdownMenuItem onSelect={onEdit}>
                <Pencil /> Editar
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              {isCompleted ? (
                <DropdownMenuItem onSelect={onReopen}>
                  <RotateCcw /> Reabrir como activo
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem onSelect={onComplete}>
                  <CircleCheck /> Marcar como completado
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="mt-5 grid gap-5 sm:grid-cols-2 sm:gap-8">
        <div className="space-y-2">
          <div className="flex items-baseline justify-between gap-2 text-xs">
            <span className="text-muted-foreground">Tareas</span>
            <span>
              <span className="font-medium text-foreground">{stats.done}</span>
              <span className="text-muted-foreground">
                {" "}
                de {stats.total} cerradas · {Math.round(doneRatio * 100)} %
              </span>
            </span>
          </div>
          <StatusBar
            tasks={tasks}
            marker={
              elapsed !== null
                ? { at: elapsed, label: `Ha transcurrido el ${Math.round(elapsed * 100)} % del plazo` }
                : null
            }
          />
          {elapsed !== null && stats.total > 0 && (
            <p className={cn("flex items-center gap-1.5 text-xs", behind ? "text-warning" : "text-muted-foreground")}>
              {behind ? <TriangleAlert className="size-3.5" aria-hidden /> : <CircleCheck className="size-3.5" aria-hidden />}
              {behind
                ? `Por detrás del calendario: ${Math.round(elapsed * 100)} % del plazo, ${Math.round(doneRatio * 100)} % cerrado`
                : `En plazo: ${Math.round(elapsed * 100)} % del plazo, ${Math.round(doneRatio * 100)} % cerrado`}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <div className="flex items-baseline justify-between gap-2 text-xs">
            <span className="text-muted-foreground">Horas registradas</span>
            <span>
              <span className={cn("font-medium", overrun ? "text-warning" : "text-foreground")}>
                {formatHours(stats.logged)}
              </span>
              <span className="text-muted-foreground"> / {formatHours(stats.estimated)} h estimadas</span>
            </span>
          </div>
          <Meter
            value={stats.logged}
            max={stats.estimated}
            label={`${formatHours(stats.logged)} de ${formatHours(stats.estimated)} horas`}
          />
          {overrun && (
            <p className="flex items-center gap-1.5 text-xs text-warning">
              <TriangleAlert className="size-3.5" aria-hidden />
              {formatHours(stats.logged - stats.estimated)} h por encima de lo estimado
            </p>
          )}
        </div>
      </div>
    </article>
  );
}
