"use client";

import { CircleCheck, TriangleAlert } from "lucide-react";

import { CategoryBadge, PriorityIcon, StatusIcon } from "@/components/tasks/task-icons";
import { formatHours, formatTaskId, STATUS_ORDER } from "@/lib/board";
import { findCategory, STATUS_META } from "@/lib/constants";
import type { BoardTask } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useWorkspaceStore } from "@/stores/workspace-store-provider";

/**
 * Tareas de prioridad crítica y alta sin cerrar. Al abrir una se puede
 * registrar tiempo desde el panel y ver cómo cambian los KPIs al instante.
 */
export function CriticalTasks({ tasks }: { tasks: BoardTask[] }) {
  const projectKey = useWorkspaceStore((s) => s.project.key);
  const categories = useWorkspaceStore((s) => s.project.categories);
  const openTask = useWorkspaceStore((s) => s.openTask);

  const pending = tasks
    .filter((task) => (task.priority === "CRITICAL" || task.priority === "HIGH") && task.status !== "DONE")
    .sort(
      (a, b) =>
        (a.priority === "CRITICAL" ? 0 : 1) - (b.priority === "CRITICAL" ? 0 : 1) ||
        STATUS_ORDER.indexOf(b.status) - STATUS_ORDER.indexOf(a.status) ||
        a.number - b.number,
    );

  return (
    <section aria-labelledby="critical-heading" className="rounded-xl border bg-card">
      <header className="flex items-center gap-2 px-5 pt-4 pb-3">
        <TriangleAlert className="size-4 text-warning" aria-hidden />
        <h2 id="critical-heading" className="text-[13px] font-medium">
          Prioridad crítica y alta sin cerrar
        </h2>
        <span className="text-xs text-muted-foreground tabular-nums">{pending.length}</span>
      </header>

      {pending.length === 0 ? (
        <p className="flex items-center gap-2 px-5 pb-5 text-[13px] text-muted-foreground">
          <CircleCheck className="size-4" aria-hidden /> Nada urgente pendiente en este ámbito.
        </p>
      ) : (
        <ul className="divide-y border-t">
          {pending.map((task) => {
            const overrun = task.estimatedHours !== null && task.loggedHours > task.estimatedHours;
            return (
              <li key={task.id}>
                <button
                  type="button"
                  onClick={() => openTask(task.id)}
                  className="flex w-full items-center gap-3 px-5 py-2.5 text-left transition-colors duration-150 hover:bg-accent/40 focus-visible:bg-accent/40 focus-visible:outline-none"
                >
                  <PriorityIcon priority={task.priority} />
                  <StatusIcon status={task.status} />
                  <span className="shrink-0 font-mono text-[11px] text-muted-foreground">
                    {formatTaskId(projectKey, task.number)}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-[13px]">{task.title}</span>
                  <span className="hidden text-xs text-muted-foreground md:inline">{STATUS_META[task.status].label}</span>
                  <CategoryBadge category={findCategory(categories, task.category)} className="hidden sm:inline-flex" />
                  <span
                    className={cn(
                      "w-16 shrink-0 text-right font-mono text-[11px] tabular-nums",
                      overrun ? "text-warning" : "text-muted-foreground",
                    )}
                  >
                    {formatHours(task.loggedHours)}/{task.estimatedHours === null ? "—" : formatHours(task.estimatedHours)}h
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
