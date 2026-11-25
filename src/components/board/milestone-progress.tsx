"use client";

import { useMemo } from "react";

import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { computeProgress, formatHours, matchesAssignee } from "@/lib/board";
import { findCategory, STATUS_META } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { useWorkspaceStore } from "@/stores/workspace-store-provider";

/**
 * Progreso del milestone visible por horas: estimación de las tareas en Done
 * frente al total estimado. Respeta el filtro de categorías para poder ver el
 * avance de una disciplina concreta. El segmento claro son horas en Testing.
 */
export function MilestoneProgress({ className }: { className?: string }) {
  const tasks = useWorkspaceStore((s) => s.tasks);
  const milestoneId = useWorkspaceStore((s) => s.milestoneId);
  const categories = useWorkspaceStore((s) => s.categoryFilter);
  const assignee = useWorkspaceStore((s) => s.assigneeFilter);
  const projectCategories = useWorkspaceStore((s) => s.project.categories);

  const progress = useMemo(
    () =>
      computeProgress(
        Object.values(tasks).filter(
          (task) =>
            task.milestoneId === milestoneId &&
            (categories.length === 0 || categories.includes(task.category)) &&
            matchesAssignee(task, assignee),
        ),
      ),
    [tasks, milestoneId, categories, assignee],
  );

  const scope =
    categories.length === 0
      ? "Progreso"
      : categories.length === 1
        ? findCategory(projectCategories, categories[0]).name
        : `${categories.length} categorías`;

  const pct = (hours: number) => (progress.estimated > 0 ? (hours / progress.estimated) * 100 : 0);

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div
          tabIndex={0}
          aria-label={`${scope}: ${formatHours(progress.completed)} de ${formatHours(progress.estimated)} horas completadas`}
          className={cn(
            "flex h-7 items-center gap-2.5 rounded-md px-2 text-xs outline-none hover:bg-accent/50 focus-visible:ring-2 focus-visible:ring-ring",
            className,
          )}
        >
          <span className="max-w-28 truncate text-muted-foreground">{scope}</span>
          <div className="relative h-1.5 w-28 overflow-hidden rounded-full bg-muted" aria-hidden>
            <div
              className="absolute inset-y-0 left-0 rounded-full transition-[width] duration-300 ease-out"
              style={{
                width: `${pct(progress.completed + progress.testing)}%`,
                backgroundColor: STATUS_META.TESTING.color,
                opacity: 0.45,
              }}
            />
            <div
              className="absolute inset-y-0 left-0 rounded-full bg-primary transition-[width] duration-300 ease-out"
              style={{ width: `${pct(progress.completed)}%` }}
            />
          </div>
          <span className="font-mono tabular-nums">
            {formatHours(progress.completed)}
            <span className="text-muted-foreground">/{formatHours(progress.estimated)}h</span>
          </span>
          <span className="w-8 text-right font-mono text-muted-foreground tabular-nums">
            {Math.round(progress.percent)}%
          </span>
        </div>
      </TooltipTrigger>
      <TooltipContent side="bottom" align="end" className="block w-56 p-3">
        <p className="mb-2 font-medium">{scope} del hito</p>
        <dl className="grid grid-cols-[1fr_auto] gap-x-4 gap-y-1 text-muted-foreground">
          <dt className="flex items-center gap-1.5">
            <span className="size-2 rounded-full bg-primary" /> Completadas
          </dt>
          <dd className="font-mono text-foreground tabular-nums">{formatHours(progress.completed)} h</dd>
          <dt className="flex items-center gap-1.5">
            <span className="size-2 rounded-full" style={{ backgroundColor: STATUS_META.TESTING.color }} />
            En pruebas
          </dt>
          <dd className="font-mono text-foreground tabular-nums">{formatHours(progress.testing)} h</dd>
          <dt className="pl-3.5">Estimadas</dt>
          <dd className="font-mono text-foreground tabular-nums">{formatHours(progress.estimated)} h</dd>
          <dt className="pl-3.5">Registradas</dt>
          <dd className="font-mono text-foreground tabular-nums">{formatHours(progress.logged)} h</dd>
          <dt className="pl-3.5">Tareas cerradas</dt>
          <dd className="font-mono text-foreground tabular-nums">
            {progress.doneCount}/{progress.total}
          </dd>
        </dl>
      </TooltipContent>
    </Tooltip>
  );
}
