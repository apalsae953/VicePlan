"use client";

import { useId, useMemo } from "react";
import { Plus } from "lucide-react";

import { CategoryIcon, StatusIcon } from "@/components/tasks/task-icons";
import { Button } from "@/components/ui/button";
import { Kbd } from "@/components/ui/kbd";
import { computeProgress, formatHours, formatTaskId, STATUS_ORDER, type GddOption } from "@/lib/board";
import { findCategory, STATUS_META } from "@/lib/constants";
import type { BoardTask } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useWorkspaceStore } from "@/stores/workspace-store-provider";

const byStatusThenNumber = (a: BoardTask, b: BoardTask) =>
  STATUS_ORDER.indexOf(a.status) - STATUS_ORDER.indexOf(b.status) || a.number - b.number;

/**
 * Lado GDD de la vinculación bidireccional: tareas que implementan esta
 * sección (y, agrupadas, las de sus subsecciones), con su avance y un acceso
 * para crear una tarea ya vinculada.
 */
export function GddLinkedTasks({
  node,
  outline,
  onNavigate,
}: {
  node: GddOption;
  outline: GddOption[];
  onNavigate: (nodeId: string) => void;
}) {
  const headingId = useId();
  const tasks = useWorkspaceStore((s) => s.tasks);
  const boardMilestoneId = useWorkspaceStore((s) => s.milestoneId);
  const openCreate = useWorkspaceStore((s) => s.openCreate);

  const { direct, nested, progress } = useMemo(() => {
    const all = Object.values(tasks);
    const direct = all.filter((task) => task.gddNodeId === node.id).sort(byStatusThenNumber);
    const nested = outline
      .filter((candidate) => candidate.ancestorIds.includes(node.id))
      .map((child) => ({
        node: child,
        tasks: all.filter((task) => task.gddNodeId === child.id).sort(byStatusThenNumber),
      }))
      .filter((group) => group.tasks.length > 0);
    const progress = computeProgress([...direct, ...nested.flatMap((group) => group.tasks)]);
    return { direct, nested, progress };
  }, [tasks, outline, node.id]);

  const doneRatio = progress.total > 0 ? (progress.doneCount / progress.total) * 100 : 0;

  return (
    <section aria-labelledby={headingId} className="space-y-4">
      <header className="flex items-baseline gap-2">
        <h2 id={headingId} className="text-[13px] font-medium">
          Tareas vinculadas
        </h2>
        <span className="text-xs text-muted-foreground tabular-nums">{progress.total}</span>
      </header>

      {progress.total > 0 && (
        <div className="space-y-1.5">
          <div className="h-1 overflow-hidden rounded-full bg-muted" aria-hidden>
            <div
              className="h-full rounded-full bg-primary transition-[width] duration-300"
              style={{ width: `${doneRatio}%` }}
            />
          </div>
          <p className="text-xs text-muted-foreground tabular-nums">
            {progress.doneCount}/{progress.total} cerradas · {formatHours(progress.completed)}/
            {formatHours(progress.estimated)} h estimadas
          </p>
        </div>
      )}

      {direct.length > 0 ? (
        <TaskList tasks={direct} />
      ) : (
        <p className="text-xs leading-relaxed text-muted-foreground">
          Ninguna tarea implementa esta sección todavía.
        </p>
      )}

      {nested.map((group) => (
        <div key={group.node.id} className="space-y-1">
          <button
            type="button"
            onClick={() => onNavigate(group.node.id)}
            className="flex max-w-full items-center gap-1.5 rounded px-2 text-xs text-muted-foreground hover:text-foreground"
          >
            <span className="font-mono tabular-nums">{group.node.number}</span>
            <span className="truncate">{group.node.title}</span>
          </button>
          <TaskList tasks={group.tasks} />
        </div>
      ))}

      <Button
        variant="outline"
        size="sm"
        className="w-full justify-start gap-2 text-[13px]"
        onClick={() => openCreate({ gddNodeId: node.id, milestoneId: boardMilestoneId })}
      >
        <Plus aria-hidden />
        Crear tarea desde este GDD
        <Kbd className="ml-auto">C</Kbd>
      </Button>
    </section>
  );
}

function TaskList({ tasks }: { tasks: BoardTask[] }) {
  const projectKey = useWorkspaceStore((s) => s.project.key);
  const milestones = useWorkspaceStore((s) => s.milestones);
  const categories = useWorkspaceStore((s) => s.project.categories);
  const openTask = useWorkspaceStore((s) => s.openTask);

  return (
    <ul className="-mx-2 space-y-0.5">
      {tasks.map((task) => {
        const milestone = milestones.find((m) => m.id === task.milestoneId);
        const overrun = task.estimatedHours !== null && task.loggedHours > task.estimatedHours;
        return (
          <li key={task.id}>
            <button
              type="button"
              onClick={() => openTask(task.id)}
              className="flex w-full items-start gap-2.5 rounded-md px-2 py-1.5 text-left transition-colors duration-150 hover:bg-accent/50 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
              aria-label={`${formatTaskId(projectKey, task.number)}: ${task.title} (${STATUS_META[task.status].label})`}
            >
              <StatusIcon status={task.status} className="mt-0.5" />
              <span className="min-w-0 flex-1">
                <span
                  className={cn(
                    "line-clamp-2 text-[13px] leading-snug",
                    task.status === "DONE" ? "text-muted-foreground" : "text-foreground/90",
                  )}
                >
                  {task.title}
                </span>
                <span className="mt-0.5 flex min-w-0 items-center gap-1.5 text-[11px] text-muted-foreground">
                  <span className="shrink-0 font-mono whitespace-nowrap">{formatTaskId(projectKey, task.number)}</span>
                  <CategoryIcon category={findCategory(categories, task.category)} className="size-3" />
                  <span className="truncate">
                    {findCategory(categories, task.category).name} · {milestone?.title ?? "Trabajo pendiente"}
                  </span>
                </span>
              </span>
              {(task.estimatedHours !== null || task.loggedHours > 0) && (
                <span
                  className={cn(
                    "mt-0.5 shrink-0 font-mono text-[11px] tabular-nums",
                    overrun ? "text-warning" : "text-muted-foreground",
                  )}
                >
                  {task.loggedHours > 0 && task.estimatedHours !== null
                    ? `${formatHours(task.loggedHours)}/${formatHours(task.estimatedHours)}h`
                    : `${formatHours(task.estimatedHours ?? task.loggedHours)}h`}
                </span>
              )}
            </button>
          </li>
        );
      })}
    </ul>
  );
}
